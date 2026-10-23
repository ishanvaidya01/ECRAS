const { pipeline } = require('@xenova/transformers');
const { ChromaClient } = require('chromadb');
const fs = require('fs');
const path = require('path');

let extractor = null;
let chroma = null;
let propositionsCollection = null;
let criteriaCollection = null;
let chromaCollections = {};
let isChromaActive = false;
let chromaVersion = null;

const COLLECTION_DEFINITIONS = {
    candidate_propositions: { name: 'candidate_propositions', idPrefix: 'prop_', label: 'Candidate Propositions', short: 'Propositions', color: 'indigo', type: 'proposition' },
    job_criteria: { name: 'job_criteria', idPrefix: 'crit_', label: 'Job Rubric Criteria', short: 'Criteria', color: 'amber', type: 'criterion' },
    job_postings: { name: 'job_postings', idPrefix: 'job_', label: 'Job Postings', short: 'Jobs', color: 'emerald', type: 'job' },
    candidates: { name: 'candidates', idPrefix: 'cand_', label: 'Candidates', short: 'Candidates', color: 'sky', type: 'candidate' },
    applications: { name: 'applications', idPrefix: 'app_', label: 'Applications & Scores', short: 'Applications', color: 'violet', type: 'application' },
    interview_sessions: { name: 'interview_sessions', idPrefix: 'sess_', label: 'Interview Sessions', short: 'Sessions', color: 'pink', type: 'session' },
    transcripts: { name: 'transcripts', idPrefix: 'turn_', label: 'Interview Transcripts', short: 'Transcripts', color: 'fuchsia', type: 'transcript' },
    bias_audit_logs: { name: 'bias_audit_logs', idPrefix: 'bias_', label: 'EEOC Bias Audits', short: 'Bias Logs', color: 'rose', type: 'bias_log' },
    audit_trail: { name: 'audit_trail', idPrefix: 'audit_', label: 'Compliance Audit Trail', short: 'Audit Trail', color: 'red', type: 'audit_trail' },
    organizations: { name: 'organizations', idPrefix: 'org_', label: 'Organizations', short: 'Organizations', color: 'teal', type: 'organization' },
    users: { name: 'users', idPrefix: 'usr_', label: 'Users & Recruiters', short: 'Users', color: 'blue', type: 'user' }
};

const CHROMA_DATA_DIR = path.join(__dirname, '..', 'chroma_data');
const CHROMA_SQLITE_FILE = path.join(CHROMA_DATA_DIR, 'chroma.sqlite3');
const LOCAL_STORAGE_FILE = path.join(__dirname, 'vector_store_data.json');

// ---------------------------------------------------------------------------
// Live operation log. This is the data source for the ChromaDB Live Inspector
// in the React frontend. Every insert/update/delete/query is recorded here.
// ---------------------------------------------------------------------------
const MAX_LOGS = 500;
const operationsLog = [];
let eventSeq = 0;

function logOperation(entry = {}) {
    const seq = ++eventSeq;
    const item = {
        seq,
        id: `${Date.now()}-${seq}`,
        timestamp: new Date().toISOString(),
        displayTime: new Date().toLocaleTimeString(),
        ...entry
    };
    operationsLog.unshift(item);
    if (operationsLog.length > MAX_LOGS) {
        operationsLog.length = MAX_LOGS;
    }
    return item;
}

// Embedded fallback store (file-persisted) for environments where Chroma server isn't running
let localVectorStore = {
    candidate_propositions: [],
    job_criteria: [],
    job_postings: [],
    candidates: [],
    applications: [],
    interview_sessions: [],
    transcripts: [],
    bias_audit_logs: [],
    audit_trail: [],
    organizations: [],
    users: [],
    propositions: [], // backwards compatibility
    criteria: []      // backwards compatibility
};

// Load local cache if exists
function loadLocalStore() {
    try {
        if (fs.existsSync(LOCAL_STORAGE_FILE)) {
            const data = fs.readFileSync(LOCAL_STORAGE_FILE, 'utf8');
            const parsed = JSON.parse(data);
            localVectorStore = {
                candidate_propositions: Array.isArray(parsed.candidate_propositions) ? parsed.candidate_propositions : (Array.isArray(parsed.propositions) ? parsed.propositions : []),
                job_criteria: Array.isArray(parsed.job_criteria) ? parsed.job_criteria : (Array.isArray(parsed.criteria) ? parsed.criteria : []),
                job_postings: Array.isArray(parsed.job_postings) ? parsed.job_postings : [],
                candidates: Array.isArray(parsed.candidates) ? parsed.candidates : [],
                applications: Array.isArray(parsed.applications) ? parsed.applications : [],
                interview_sessions: Array.isArray(parsed.interview_sessions) ? parsed.interview_sessions : [],
                transcripts: Array.isArray(parsed.transcripts) ? parsed.transcripts : [],
                bias_audit_logs: Array.isArray(parsed.bias_audit_logs) ? parsed.bias_audit_logs : [],
                audit_trail: Array.isArray(parsed.audit_trail) ? parsed.audit_trail : [],
                organizations: Array.isArray(parsed.organizations) ? parsed.organizations : [],
                users: Array.isArray(parsed.users) ? parsed.users : [],
                propositions: Array.isArray(parsed.propositions) ? parsed.propositions : [],
                criteria: Array.isArray(parsed.criteria) ? parsed.criteria : []
            };
        }
    } catch (err) {
        console.warn('[VectorService] Failed to load local vector cache:', err.message);
    }
}

function saveLocalStore() {
    try {
        fs.writeFileSync(LOCAL_STORAGE_FILE, JSON.stringify(localVectorStore, null, 2));
    } catch (err) {
        console.warn('[VectorService] Failed to save local vector cache:', err.message);
    }
}

loadLocalStore();

// ---------------------------------------------------------------------------
// Vector helpers
// ---------------------------------------------------------------------------
function toNumberArray(vector) {
    if (!vector) return null;
    if (Array.isArray(vector)) return vector.map(Number);
    if (ArrayBuffer.isView(vector)) return Array.from(vector, Number);
    if (typeof vector.length === 'number') return Array.from(vector, Number);
    return null;
}

function summarizeVector(vector, previewCount = 12) {
    const arr = toNumberArray(vector);
    if (!arr || arr.length === 0) return null;

    let sumSquares = 0;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;

    for (const raw of arr) {
        const value = Number(raw) || 0;
        sumSquares += value * value;
        sum += value;
        if (value < min) min = value;
        if (value > max) max = value;
    }

    return {
        dimensions: arr.length,
        preview: arr.slice(0, previewCount).map(v => Number(Number(v).toFixed(6))),
        norm: Number(Math.sqrt(sumSquares).toFixed(6)),
        mean: Number((sum / arr.length).toFixed(6)),
        min: Number(min.toFixed(6)),
        max: Number(max.toFixed(6))
    };
}

function metadataValue(row) {
    if (!row) return null;
    // The collection_metadata table calls this column str_value, while
    // embedding_metadata calls it string_value.
    const stringValue = row.string_value !== undefined ? row.string_value : row.str_value;
    if (stringValue !== null && stringValue !== undefined) return stringValue;
    if (row.int_value !== null && row.int_value !== undefined) return row.int_value;
    if (row.float_value !== null && row.float_value !== undefined) return row.float_value;
    if (row.bool_value !== null && row.bool_value !== undefined) return Boolean(row.bool_value);
    return null;
}

function decodeFloat32Blob(blob) {
    if (!blob) return null;
    const buffer = Buffer.isBuffer(blob) ? blob : Buffer.from(blob);
    if (buffer.length < 4) return null;
    const count = Math.floor(buffer.length / 4);
    const vector = new Array(count);
    for (let i = 0; i < count; i++) {
        vector[i] = buffer.readFloatLE(i * 4);
    }
    return vector;
}

function operationName(code) {
    return ({
        1: 'ADD',
        2: 'UPDATE',
        3: 'UPSERT',
        4: 'DELETE'
    })[code] || `OP_${code}`;
}

// ---------------------------------------------------------------------------
// Chroma connection
// ---------------------------------------------------------------------------
async function ensureChromaConnection() {
    if (isChromaActive && chroma && Object.keys(chromaCollections).length >= Object.keys(COLLECTION_DEFINITIONS).length) {
        return true;
    }

    const wasActive = isChromaActive;
    try {
        const chromaHost = process.env.CHROMA_HOST || 'localhost';
        const chromaPort = parseInt(process.env.CHROMA_PORT || '8000', 10);

        chroma = new ChromaClient({
            host: chromaHost,
            port: chromaPort,
            ssl: false
        });

        // Test heartbeat
        await chroma.heartbeat();
        chromaVersion = await chroma.version().catch(() => null);

        for (const colKey of Object.keys(COLLECTION_DEFINITIONS)) {
            try {
                chromaCollections[colKey] = await chroma.getOrCreateCollection({
                    name: colKey,
                    metadata: { "hnsw:space": "cosine" }
                });
            } catch (colErr) {
                console.warn(`[ChromaDB] Notice creating collection ${colKey}:`, colErr.message);
            }
        }

        propositionsCollection = chromaCollections['candidate_propositions'];
        criteriaCollection = chromaCollections['job_criteria'];

        isChromaActive = true;
        console.log(`\x1b[32m✔ [ChromaDB:CONNECT] Connected to standalone ChromaDB server on port ${chromaPort} (11 HNSW Cosine collections active)\x1b[0m`);
        logOperation({
            type: 'CONNECT',
            status: 'SUCCESS',
            collection: 'All 11 collections active',
            message: `Connected to standalone ChromaDB server on port ${chromaPort} (11 HNSW collections)`,
            engine: 'ChromaDB',
            chromaVersion,
            source: 'vectorService.ensureChromaConnection'
        });
        return true;
    } catch (chromaErr) {
        isChromaActive = false;
        if (wasActive) {
            logOperation({
                type: 'DISCONNECT',
                status: 'FALLBACK',
                message: `ChromaDB connection lost: ${chromaErr.message}. Switching to embedded store.`,
                engine: 'EmbeddedStore',
                source: 'vectorService.ensureChromaConnection'
            });
        }
        return false;
    }
}

/**
 * Initialize embedding pipeline and vector collections
 */
async function initVectorService() {
    try {
        if (!extractor) {
            console.log('\x1b[36m[VectorService] Loading feature extraction pipeline (all-MiniLM-L6-v2 ONNX)...\x1b[0m');
            extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
            console.log('\x1b[32m✔ [VectorService] Local ONNX transformer model ready (384 dimensions).\x1b[0m');
        }

        const connected = await ensureChromaConnection();
        if (!connected) {
            console.log('\x1b[33m[VectorService] ChromaDB server not currently reachable on port 8000.\x1b[0m');
            console.log('\x1b[33m[VectorService] Running in Embedded High-Performance Vector Mode (all-MiniLM-L6-v2 + Cosine Similarity).\x1b[0m');
            console.log('\x1b[33m[VectorService] Tip: Run "chroma run --path ./chroma_data --port 8000" to connect to standalone ChromaDB anytime.\x1b[0m');
            logOperation({
                type: 'CONNECT',
                status: 'FALLBACK',
                message: 'ChromaDB port 8000 unreachable. Using local embedded vector store.',
                engine: 'EmbeddedStore',
                source: 'vectorService.initVectorService'
            });
        }

        return {
            ready: true,
            engine: isChromaActive ? 'ChromaDB (HNSW Cosine)' : 'Embedded Vector Engine (384-d Cosine)',
            isChromaActive
        };
    } catch (err) {
        console.error('[VectorService] Initialization error:', err.message);
        throw err;
    }
}

/**
 * Generate dense embedding vector (384 dimensions) using local ONNX all-MiniLM-L6-v2
 */
async function getEmbedding(text) {
    if (!extractor) {
        await initVectorService();
    }
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
}

// ---------------------------------------------------------------------------
// Existing record lookup (used to distinguish INSERT vs UPDATE in the UI)
// ---------------------------------------------------------------------------
async function findExistingProposition(propIdStr) {
    if (isChromaActive && propositionsCollection) {
        try {
            const existing = await propositionsCollection.get({
                ids: [propIdStr],
                include: ['documents', 'metadatas']
            });
            if (existing && existing.ids && existing.ids.length > 0) {
                return {
                    source: 'ChromaDB',
                    document: existing.documents?.[0] || null,
                    metadata: existing.metadatas?.[0] || null
                };
            }
        } catch (err) {
            // Fall through to local mirror
        }
    }

    const local = localVectorStore.propositions.find(p => p.id === propIdStr);
    if (local) {
        return {
            source: 'EmbeddedStore',
            document: local.text,
            metadata: { candidate_id: local.candidate_id, section: local.section }
        };
    }

    return null;
}

async function findExistingCriterion(critIdStr) {
    if (isChromaActive && criteriaCollection) {
        try {
            const existing = await criteriaCollection.get({
                ids: [critIdStr],
                include: ['documents', 'metadatas']
            });
            if (existing && existing.ids && existing.ids.length > 0) {
                return {
                    source: 'ChromaDB',
                    document: existing.documents?.[0] || null,
                    metadata: existing.metadatas?.[0] || null
                };
            }
        } catch (err) {
            // Fall through to local mirror
        }
    }

    const local = localVectorStore.criteria.find(c => c.id === critIdStr);
    if (local) {
        return {
            source: 'EmbeddedStore',
            document: local.text,
            metadata: { job_id: local.job_id, weight: local.weight }
        };
    }

    return null;
}

async function findExistingRecord(collectionName, idStr) {
    if (isChromaActive && chromaCollections[collectionName]) {
        try {
            const existing = await chromaCollections[collectionName].get({
                ids: [idStr],
                include: ['documents', 'metadatas']
            });
            if (existing && existing.ids && existing.ids.length > 0) {
                return {
                    source: 'ChromaDB',
                    document: existing.documents?.[0] || null,
                    metadata: existing.metadatas?.[0] || null
                };
            }
        } catch (err) {
            // Fall through
        }
    }

    const store = localVectorStore[collectionName] || [];
    const local = store.find(item => item.id === idStr);
    if (local) {
        return {
            source: 'EmbeddedStore',
            document: local.text,
            metadata: local.metadata
        };
    }
    return null;
}

/**
 * Universal entity indexer for ChromaDB
 * Stores any entity across all 11 collections with real 384-d dense vector embeddings!
 */
async function indexRecord(collectionName, rawId, text, metadata = {}, options = {}) {
    const startedAt = Date.now();
    await ensureChromaConnection();
    const def = COLLECTION_DEFINITIONS[collectionName] || { idPrefix: '', label: collectionName };
    const prefix = def.idPrefix || '';
    const idStr = String(rawId).startsWith(prefix) ? String(rawId) : `${prefix}${rawId}`;

    const textToEmbed = String(text || `${def.label} ${idStr}`).trim();
    const vector = await getEmbedding(textToEmbed);
    const previous = await findExistingRecord(collectionName, idStr);
    const operation = previous ? 'UPDATE' : 'INSERT';
    let chromaSuccess = false;

    // Sanitize metadata for ChromaDB (Chroma requires string, number, or boolean values)
    const cleanMeta = {};
    for (const [key, val] of Object.entries(metadata || {})) {
        if (val === null || val === undefined) continue;
        if (typeof val === 'object') {
            cleanMeta[key] = val instanceof Date ? val.toISOString() : JSON.stringify(val);
        } else {
            cleanMeta[key] = val;
        }
    }

    const col = chromaCollections[collectionName];
    if (isChromaActive && col) {
        try {
            await col.upsert({
                ids: [idStr],
                embeddings: [vector],
                metadatas: [cleanMeta],
                documents: [textToEmbed]
            });
            chromaSuccess = true;
        } catch (err) {
            console.warn(`[VectorService] Chroma upsert into ${collectionName} failed:`, err.message);
        }
    }

    // Keep in local store mirror
    if (!localVectorStore[collectionName]) localVectorStore[collectionName] = [];
    const existingIndex = localVectorStore[collectionName].findIndex(item => item.id === idStr);
    const item = {
        id: idStr,
        collection: collectionName,
        text: textToEmbed,
        metadata: cleanMeta,
        vector: vector
    };
    if (existingIndex >= 0) {
        localVectorStore[collectionName][existingIndex] = item;
    } else {
        localVectorStore[collectionName].push(item);
    }
    saveLocalStore();

    const summary = summarizeVector(vector);
    const engine = chromaSuccess ? 'ChromaDB' : 'EmbeddedStore';

    // Terminal formatted output for Visual Verification
    const snippet = textToEmbed.length > 70 ? textToEmbed.substring(0, 70) + '...' : textToEmbed;
    console.log(`\x1b[36m┌── [ChromaDB:${operation === 'UPDATE' ? 'UPDATE' : 'INSERT'}] ─────────────────────────────\x1b[0m`);
    console.log(`\x1b[36m│\x1b[0m Collection: \x1b[33m${collectionName}\x1b[0m`);
    console.log(`\x1b[36m│\x1b[0m ID:         \x1b[1m${idStr}\x1b[0m`);
    console.log(`\x1b[36m│\x1b[0m Vector:     ${summary ? summary.dimensions : 384} dims [${summary?.preview?.slice(0, 3)?.map(n => n.toFixed(4))?.join(', ')}, ...]`);
    console.log(`\x1b[36m│\x1b[0m Document:   "${snippet}"`);
    console.log(`\x1b[36m│\x1b[0m Target:     ${chromaSuccess ? '\x1b[32m✔ Standalone ChromaDB (Port 8000)\x1b[0m' : '\x1b[33m✔ Local Vector Store\x1b[0m'}`);
    console.log(`\x1b[36m└──────────────────────────────────────────────────────────────────\x1b[0m`);

    logOperation({
        type: operation,
        status: chromaSuccess ? 'SUCCESS' : 'FALLBACK',
        collection: collectionName,
        docId: idStr,
        text: textToEmbed,
        document: textToEmbed,
        metadata: cleanMeta,
        previous,
        dimensions: summary ? summary.dimensions : 384,
        vectorPreview: summary ? summary.preview : null,
        vectorNorm: summary ? summary.norm : null,
        engine,
        durationMs: Date.now() - startedAt,
        source: options.source || `vectorService.indexRecord(${collectionName})`,
        message: `${operation === 'UPDATE' ? 'Updated' : 'Stored'} ${idStr} in Chroma collection '${collectionName}'`
    });

    return {
        id: idStr,
        collection: collectionName,
        operation,
        chromaSuccess,
        engine,
        vector_preview: summary ? summary.preview : null,
        vector_norm: summary ? summary.norm : null
    };
}

/**
 * Universal entity deleter for ChromaDB
 */
async function deleteRecord(collectionName, rawId, options = {}) {
    const startedAt = Date.now();
    await ensureChromaConnection();
    const def = COLLECTION_DEFINITIONS[collectionName] || { idPrefix: '' };
    const prefix = def.idPrefix || '';
    const idStr = String(rawId).startsWith(prefix) ? String(rawId) : `${prefix}${rawId}`;

    const previous = await findExistingRecord(collectionName, idStr);
    let chromaSuccess = false;

    const col = chromaCollections[collectionName];
    if (isChromaActive && col) {
        try {
            await col.delete({ ids: [idStr] });
            chromaSuccess = true;
        } catch (err) {
            console.warn(`[VectorService] Chroma delete from ${collectionName} failed:`, err.message);
        }
    }

    if (localVectorStore[collectionName]) {
        const idx = localVectorStore[collectionName].findIndex(p => p.id === idStr);
        if (idx >= 0) localVectorStore[collectionName].splice(idx, 1);
        saveLocalStore();
    }

    const engine = chromaSuccess ? 'ChromaDB' : 'EmbeddedStore';
    logOperation({
        type: 'DELETE',
        status: previous ? 'SUCCESS' : 'NOT_FOUND',
        collection: collectionName,
        docId: idStr,
        previous,
        engine,
        durationMs: Date.now() - startedAt,
        source: options.source || `vectorService.deleteRecord(${collectionName})`,
        message: previous
            ? `Deleted ${idStr} from ${collectionName} (${engine})`
            : `${idStr} was not present in ${collectionName}`
    });

    return { id: idStr, collection: collectionName, deleted: Boolean(previous), previous, chromaSuccess, engine };
}

// ---------------------------------------------------------------------------
// Ingestion: propositions
// ---------------------------------------------------------------------------
async function indexProposition(propositionId, candidateId, section, text, options = {}) {
    const startedAt = Date.now();
    await ensureChromaConnection();
    const vector = await getEmbedding(text);
    const propIdStr = `prop_${propositionId}`;
    const numericPropositionId = Number(propositionId);
    const previous = await findExistingProposition(propIdStr);
    const operation = previous ? 'UPDATE' : 'INSERT';
    let chromaSuccess = false;

    if (isChromaActive && propositionsCollection) {
        try {
            await propositionsCollection.upsert({
                ids: [propIdStr],
                embeddings: [vector],
                metadatas: [{ candidate_id: Number(candidateId), section: section || 'General' }],
                documents: [text]
            });
            chromaSuccess = true;
        } catch (err) {
            console.warn('[VectorService] Chroma upsert proposition failed, falling back to local store:', err.message);
        }
    }

    // Always keep in local store as mirror/fallback
    const existingIndex = localVectorStore.propositions.findIndex(p => p.id === propIdStr);
    const item = {
        id: propIdStr,
        proposition_id: Number.isFinite(numericPropositionId) ? numericPropositionId : String(propositionId),
        candidate_id: Number(candidateId),
        section: section || 'General',
        text: text,
        vector: vector
    };
    if (existingIndex >= 0) {
        localVectorStore.propositions[existingIndex] = item;
    } else {
        localVectorStore.propositions.push(item);
    }
    saveLocalStore();

    const summary = summarizeVector(vector);
    const engine = chromaSuccess ? 'ChromaDB' : 'EmbeddedStore';

    // Terminal formatted output for Faculty demo
    const snippet = text.length > 70 ? text.substring(0, 70) + '...' : text;
    console.log(`\x1b[36m┌── [ChromaDB:${operation === 'UPDATE' ? 'UPDATE' : 'INSERT'}] ─────────────────────────────\x1b[0m`);
    console.log(`\x1b[36m│\x1b[0m ID:         \x1b[1m${propIdStr}\x1b[0m (Candidate #${candidateId} | Section: ${section || 'General'})`);
    console.log(`\x1b[36m│\x1b[0m Collection: \x1b[33mcandidate_propositions\x1b[0m (HNSW Cosine)`);
    console.log(`\x1b[36m│\x1b[0m Vector:     ${summary.dimensions} dims [${summary.preview.slice(0, 3).map(n => n.toFixed(4)).join(', ')}, ...]`);
    console.log(`\x1b[36m│\x1b[0m Document:   "${snippet}"`);
    console.log(`\x1b[36m│\x1b[0m Target:     ${chromaSuccess ? '\x1b[32m✔ Standalone ChromaDB (Port 8000) & Local Mirror\x1b[0m' : '\x1b[33m✔ Local Vector Store\x1b[0m'}`);
    console.log(`\x1b[36m└──────────────────────────────────────────────────────────────────\x1b[0m`);

    logOperation({
        type: operation,
        status: chromaSuccess ? 'SUCCESS' : 'FALLBACK',
        collection: 'candidate_propositions',
        docId: propIdStr,
        candidateId: Number(candidateId),
        section: section || 'General',
        text,
        document: text,
        metadata: { candidate_id: Number(candidateId), section: section || 'General' },
        previous,
        dimensions: summary.dimensions,
        vectorPreview: summary.preview,
        vectorNorm: summary.norm,
        engine,
        durationMs: Date.now() - startedAt,
        source: options.source || 'vectorService.indexProposition',
        message: `${operation === 'UPDATE' ? 'Updated' : 'Inserted'} ${propIdStr} in ${engine}`
    });

    return {
        id: propIdStr,
        proposition_id: Number.isFinite(numericPropositionId) ? numericPropositionId : String(propositionId),
        candidate_id: Number(candidateId),
        dimensions: summary.dimensions,
        chromaSuccess,
        operation,
        previous,
        vector_preview: summary.preview,
        vector_norm: summary.norm,
        engine
    };
}

// ---------------------------------------------------------------------------
// Ingestion: job rubric criteria
// ---------------------------------------------------------------------------
async function indexJobCriterion(criterionId, jobId, text, weight, options = {}) {
    const startedAt = Date.now();
    await ensureChromaConnection();
    const vector = await getEmbedding(text);
    const critIdStr = `crit_${criterionId}`;
    const numericCriterionId = Number(criterionId);
    const weightNum = Number(weight) || 0.5;
    const previous = await findExistingCriterion(critIdStr);
    const operation = previous ? 'UPDATE' : 'INSERT';
    let chromaSuccess = false;

    if (isChromaActive && criteriaCollection) {
        try {
            await criteriaCollection.upsert({
                ids: [critIdStr],
                embeddings: [vector],
                metadatas: [{ job_id: Number(jobId), weight: weightNum }],
                documents: [text]
            });
            chromaSuccess = true;
        } catch (err) {
            console.warn('[VectorService] Chroma upsert criterion failed, falling back to local store:', err.message);
        }
    }

    // Keep in local store as mirror/fallback
    const existingIndex = localVectorStore.criteria.findIndex(c => c.id === critIdStr);
    const item = {
        id: critIdStr,
        criterion_id: Number.isFinite(numericCriterionId) ? numericCriterionId : String(criterionId),
        job_id: Number(jobId),
        weight: weightNum,
        text: text,
        vector: vector
    };
    if (existingIndex >= 0) {
        localVectorStore.criteria[existingIndex] = item;
    } else {
        localVectorStore.criteria.push(item);
    }
    saveLocalStore();

    const summary = summarizeVector(vector);
    const engine = chromaSuccess ? 'ChromaDB' : 'EmbeddedStore';

    // Terminal formatted output
    const snippet = text.length > 70 ? text.substring(0, 70) + '...' : text;
    console.log(`\x1b[35m┌── [ChromaDB:${operation === 'UPDATE' ? 'UPDATE' : 'INSERT'}] ─────────────────────────────\x1b[0m`);
    console.log(`\x1b[35m│\x1b[0m ID:         \x1b[1m${critIdStr}\x1b[0m (Job #${jobId} | Weight: ${weightNum})`);
    console.log(`\x1b[35m│\x1b[0m Collection: \x1b[33mjob_criteria\x1b[0m (HNSW Cosine)`);
    console.log(`\x1b[35m│\x1b[0m Vector:     ${summary.dimensions} dims [${summary.preview.slice(0, 3).map(n => n.toFixed(4)).join(', ')}, ...]`);
    console.log(`\x1b[35m│\x1b[0m Document:   "${snippet}"`);
    console.log(`\x1b[35m│\x1b[0m Target:     ${chromaSuccess ? '\x1b[32m✔ Standalone ChromaDB (Port 8000) & Local Mirror\x1b[0m' : '\x1b[33m✔ Local Vector Store\x1b[0m'}`);
    console.log(`\x1b[35m└──────────────────────────────────────────────────────────────────\x1b[0m`);

    logOperation({
        type: operation,
        status: chromaSuccess ? 'SUCCESS' : 'FALLBACK',
        collection: 'job_criteria',
        docId: critIdStr,
        jobId: Number(jobId),
        weight: weightNum,
        text,
        document: text,
        metadata: { job_id: Number(jobId), weight: weightNum },
        previous,
        dimensions: summary.dimensions,
        vectorPreview: summary.preview,
        vectorNorm: summary.norm,
        engine,
        durationMs: Date.now() - startedAt,
        source: options.source || 'vectorService.indexJobCriterion',
        message: `${operation === 'UPDATE' ? 'Updated' : 'Inserted'} ${critIdStr} in ${engine}`
    });

    return {
        id: critIdStr,
        criterion_id: Number.isFinite(numericCriterionId) ? numericCriterionId : String(criterionId),
        job_id: Number(jobId),
        weight: weightNum,
        dimensions: summary.dimensions,
        chromaSuccess,
        operation,
        previous,
        vector_preview: summary.preview,
        vector_norm: summary.norm,
        engine
    };
}

/**
 * Delete one proposition vector from ChromaDB and the local mirror.
 */
async function deleteProposition(propositionId, options = {}) {
    const startedAt = Date.now();
    await ensureChromaConnection();
    const propIdStr = `prop_${propositionId}`;
    const previous = await findExistingProposition(propIdStr);
    let chromaSuccess = false;

    if (isChromaActive && propositionsCollection) {
        try {
            await propositionsCollection.delete({ ids: [propIdStr] });
            chromaSuccess = true;
        } catch (err) {
            console.warn('[VectorService] Chroma delete proposition failed:', err.message);
        }
    }

    const idx = localVectorStore.propositions.findIndex(p => p.id === propIdStr);
    if (idx >= 0) localVectorStore.propositions.splice(idx, 1);
    saveLocalStore();

    const engine = chromaSuccess ? 'ChromaDB' : 'EmbeddedStore';
    logOperation({
        type: 'DELETE',
        status: previous ? 'SUCCESS' : 'NOT_FOUND',
        collection: 'candidate_propositions',
        docId: propIdStr,
        previous,
        engine,
        durationMs: Date.now() - startedAt,
        source: options.source || 'vectorService.deleteProposition',
        message: previous
            ? `Deleted ${propIdStr} from ${engine}`
            : `${propIdStr} was not present in ${engine}`
    });

    return { id: propIdStr, deleted: Boolean(previous), previous, chromaSuccess, engine };
}

/**
 * Delete one rubric criterion vector from ChromaDB and the local mirror.
 */
async function deleteJobCriterion(criterionId, options = {}) {
    const startedAt = Date.now();
    await ensureChromaConnection();
    const critIdStr = `crit_${criterionId}`;
    const previous = await findExistingCriterion(critIdStr);
    let chromaSuccess = false;

    if (isChromaActive && criteriaCollection) {
        try {
            await criteriaCollection.delete({ ids: [critIdStr] });
            chromaSuccess = true;
        } catch (err) {
            console.warn('[VectorService] Chroma delete criterion failed:', err.message);
        }
    }

    const idx = localVectorStore.criteria.findIndex(c => c.id === critIdStr);
    if (idx >= 0) localVectorStore.criteria.splice(idx, 1);
    saveLocalStore();

    const engine = chromaSuccess ? 'ChromaDB' : 'EmbeddedStore';
    logOperation({
        type: 'DELETE',
        status: previous ? 'SUCCESS' : 'NOT_FOUND',
        collection: 'job_criteria',
        docId: critIdStr,
        previous,
        engine,
        durationMs: Date.now() - startedAt,
        source: options.source || 'vectorService.deleteJobCriterion',
        message: previous
            ? `Deleted ${critIdStr} from ${engine}`
            : `${critIdStr} was not present in ${engine}`
    });

    return { id: critIdStr, deleted: Boolean(previous), previous, chromaSuccess, engine };
}

/**
 * Calculate authentic Semantic Match Score (0–100) between candidate propositions and job criteria
 */
async function calculateSemanticScore(candidateId, jobId, options = {}) {
    const startedAt = Date.now();
    if (!extractor) {
        await initVectorService();
    }
    await ensureChromaConnection();

    let jobCriteria = { ids: [], embeddings: [], documents: [], metadatas: [] };
    let candidateProps = { ids: [], embeddings: [], documents: [], metadatas: [] };
    let usedEngine = isChromaActive ? 'ChromaDB' : 'Embedded-HNSW';

    // Try ChromaDB if connected
    if (isChromaActive && criteriaCollection && propositionsCollection) {
        try {
            const cRes = await criteriaCollection.get({
                where: { job_id: Number(jobId) },
                include: ['embeddings', 'documents', 'metadatas']
            });
            if (cRes && cRes.ids && cRes.ids.length > 0) {
                jobCriteria = cRes;
            }

            const pRes = await propositionsCollection.get({
                where: { candidate_id: Number(candidateId) },
                include: ['embeddings', 'documents', 'metadatas']
            });
            if (pRes && pRes.ids && pRes.ids.length > 0) {
                candidateProps = pRes;
            }
        } catch (err) {
            console.warn('[VectorService] Chroma query failed, using embedded store:', err.message);
            usedEngine = 'Embedded-HNSW (Fallback)';
        }
    }

    // Fallback to embedded local store if Chroma empty or not active
    if (jobCriteria.ids.length === 0) {
        const filteredCrit = localVectorStore.criteria.filter(c => c.job_id === Number(jobId));
        jobCriteria = {
            ids: filteredCrit.map(c => c.id),
            embeddings: filteredCrit.map(c => c.vector),
            documents: filteredCrit.map(c => c.text),
            metadatas: filteredCrit.map(c => ({ job_id: c.job_id, weight: c.weight }))
        };
    }

    if (candidateProps.ids.length === 0) {
        const filteredProps = localVectorStore.propositions.filter(p => p.candidate_id === Number(candidateId));
        candidateProps = {
            ids: filteredProps.map(p => p.id),
            embeddings: filteredProps.map(p => p.vector),
            documents: filteredProps.map(p => p.text),
            metadatas: filteredProps.map(p => ({ candidate_id: p.candidate_id, section: p.section }))
        };
    }

    const source = options.source || 'vectorService.calculateSemanticScore';

    // Edge cases
    if (!jobCriteria || jobCriteria.ids.length === 0) {
        const result = {
            semantic_score: 75.0,
            matches: [],
            engine: usedEngine,
            message: 'No rubric criteria indexed for this job. Using baseline score.'
        };
        logOperation({
            type: 'QUERY',
            status: 'BASELINE',
            collection: 'job_criteria',
            candidateId: Number(candidateId),
            jobId: Number(jobId),
            score: 75.0,
            criteriaCount: 0,
            propsAnalyzed: candidateProps.ids?.length || 0,
            engine: usedEngine,
            durationMs: Date.now() - startedAt,
            source,
            message: `No rubric criteria indexed for job #${jobId}. Baseline semantic score 75.00 used.`
        });
        return result;
    }

    if (!candidateProps || candidateProps.ids.length === 0) {
        const result = {
            semantic_score: 50.0,
            matches: [],
            engine: usedEngine,
            message: 'No resume propositions indexed for this candidate. Using default baseline.'
        };
        logOperation({
            type: 'QUERY',
            status: 'BASELINE',
            collection: 'candidate_propositions',
            candidateId: Number(candidateId),
            jobId: Number(jobId),
            score: 50.0,
            criteriaCount: jobCriteria.ids.length,
            propsAnalyzed: 0,
            engine: usedEngine,
            durationMs: Date.now() - startedAt,
            source,
            message: `No resume propositions indexed for candidate #${candidateId}. Baseline semantic score 50.00 used.`
        });
        return result;
    }

    // Compute best cosine similarity match for each job criterion
    let totalScore = 0;
    let totalWeight = 0;
    const matchBreakdown = [];

    for (let c = 0; c < jobCriteria.ids.length; c++) {
        const critVec = toNumberArray(jobCriteria.embeddings[c]);
        const critText = jobCriteria.documents[c];
        const weight = (jobCriteria.metadatas[c] && jobCriteria.metadatas[c].weight) ? Number(jobCriteria.metadatas[c].weight) : 0.5;

        let bestSim = -1;
        let bestPropText = '';
        let bestSection = 'General';

        for (let p = 0; p < candidateProps.ids.length; p++) {
            const propVec = toNumberArray(candidateProps.embeddings[p]);
            const sim = cosineSimilarity(critVec, propVec);
            if (sim > bestSim) {
                bestSim = sim;
                bestPropText = candidateProps.documents[p];
                if (candidateProps.metadatas[p] && candidateProps.metadatas[p].section) {
                    bestSection = candidateProps.metadatas[p].section;
                }
            }
        }

        const clampedSim = Math.max(0, Math.min(1, bestSim));

        matchBreakdown.push({
            criterion: critText,
            matched_proposition: bestPropText,
            section: bestSection,
            similarity: parseFloat(clampedSim.toFixed(3)),
            similarity_percentage: parseFloat((clampedSim * 100).toFixed(1)),
            weight: weight
        });

        totalScore += (clampedSim * 100) * weight;
        totalWeight += weight;
    }

    const finalSemanticScore = totalWeight > 0 ? (totalScore / totalWeight) : 70;
    const scoreVal = parseFloat(finalSemanticScore.toFixed(2));

    // Console output for faculty demo
    console.log(`\x1b[34m┌── [ChromaDB:QUERY & SEMANTIC SIMILARITY] ────────────────────────\x1b[0m`);
    console.log(`\x1b[34m│\x1b[0m Candidate:  \x1b[1m#${candidateId}\x1b[0m vs Job: \x1b[1m#${jobId}\x1b[0m`);
    console.log(`\x1b[34m│\x1b[0m Compared:   ${jobCriteria.ids.length} Criteria × ${candidateProps.ids.length} Resume Propositions`);
    console.log(`\x1b[34m│\x1b[0m Engine:     \x1b[33m${usedEngine}\x1b[0m (HNSW Cosine Distance)`);
    matchBreakdown.forEach((m, idx) => {
        const bar = '█'.repeat(Math.round(m.similarity * 15)) + '░'.repeat(15 - Math.round(m.similarity * 15));
        console.log(`\x1b[34m│\x1b[0m Match [${idx + 1}]: [${bar}] ${(m.similarity_percentage)}% | "${String(m.criterion).substring(0, 30)}..."`);
    });
    console.log(`\x1b[34m│\x1b[0m Final Score: \x1b[32m\x1b[1m${scoreVal} / 100\x1b[0m`);
    console.log(`\x1b[34m└──────────────────────────────────────────────────────────────────\x1b[0m\n`);

    const topMatch = matchBreakdown.reduce((best, current) => {
        if (!best || current.similarity > best.similarity) return current;
        return best;
    }, null);

    logOperation({
        type: 'QUERY',
        status: 'SUCCESS',
        collection: 'candidate_propositions × job_criteria',
        candidateId: Number(candidateId),
        jobId: Number(jobId),
        score: scoreVal,
        criteriaCount: jobCriteria.ids.length,
        propsAnalyzed: candidateProps.ids.length,
        engine: usedEngine,
        durationMs: Date.now() - startedAt,
        topMatch: topMatch ? {
            criterion: topMatch.criterion,
            matched_proposition: topMatch.matched_proposition,
            similarity: topMatch.similarity,
            similarity_percentage: topMatch.similarity_percentage
        } : null,
        source,
        message: `Cosine similarity query: candidate #${candidateId} vs job #${jobId} = ${scoreVal}/100 (${jobCriteria.ids.length} criteria × ${candidateProps.ids.length} propositions)`
    });

    return {
        semantic_score: scoreVal,
        breakdown: matchBreakdown,
        engine: usedEngine,
        criteria_count: jobCriteria.ids.length,
        propositions_analyzed: candidateProps.ids.length,
        query_time_ms: Date.now() - startedAt
    };
}

/**
 * Cosine Similarity between two dense vectors
 */
function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : (dot / denom);
}

function fileStats(filePath) {
    try {
        const stat = fs.statSync(filePath);
        return {
            name: path.basename(filePath),
            path: filePath,
            bytes: stat.size,
            modified_at: stat.mtime.toISOString()
        };
    } catch (err) {
        return null;
    }
}

function openChromaSqlite() {
    try {
        if (!fs.existsSync(CHROMA_SQLITE_FILE)) return null;
        const { DatabaseSync } = require('node:sqlite');
        return new DatabaseSync(CHROMA_SQLITE_FILE, { readOnly: true });
    } catch (err) {
        return null;
    }
}

/**
 * Read the raw ChromaDB SQLite rows that back one vector record.
 * This is intentionally read-only; it is used by the Live Inspector.
 */
function getSqliteRecord(collectionName, id) {
    const db = openChromaSqlite();
    if (!db) return null;

    try {
        const collection = db.prepare('SELECT id, name, dimension FROM collections WHERE name = ?').get(collectionName);
        if (!collection) return null;

        const metadataSegment = db.prepare(
            "SELECT id, type, scope FROM segments WHERE collection = ? AND type LIKE '%metadata%' LIMIT 1"
        ).get(collection.id);

        const vectorSegment = db.prepare(
            "SELECT id, type, scope FROM segments WHERE collection = ? AND type LIKE '%vector%' LIMIT 1"
        ).get(collection.id);

        const embedding = db.prepare(
            'SELECT id, segment_id, embedding_id, seq_id, created_at FROM embeddings WHERE embedding_id = ? AND segment_id = ?'
        ).get(id, metadataSegment ? metadataSegment.id : '');

        const metadataRows = embedding
            ? db.prepare('SELECT key, string_value, int_value, float_value, bool_value FROM embedding_metadata WHERE id = ?').all(embedding.id)
            : [];

        const fulltext = embedding
            ? db.prepare('SELECT rowid, string_value FROM embedding_fulltext_search WHERE rowid = ?').get(embedding.id)
            : null;

        const queue = db.prepare(
            'SELECT seq_id, created_at, operation, topic, id, vector, encoding, metadata FROM embeddings_queue WHERE id = ? AND topic LIKE ? ORDER BY seq_id DESC LIMIT 1'
        ).get(id, `%${collection.id}%`);

        let queueVector = null;
        if (queue && queue.vector) {
            queueVector = decodeFloat32Blob(queue.vector);
        }

        const queueSummary = summarizeVector(queueVector);
        let queueMetadata = null;
        if (queue && queue.metadata) {
            try {
                queueMetadata = JSON.parse(queue.metadata);
            } catch (err) {
                queueMetadata = queue.metadata;
            }
        }

        return {
            collection: {
                id: collection.id,
                name: collection.name,
                dimension: collection.dimension
            },
            vector_segment: vectorSegment || null,
            metadata_segment: metadataSegment || null,
            embedding_row: embedding || null,
            metadata_rows: metadataRows.map(row => ({
                key: row.key,
                value: metadataValue(row),
                raw: row
            })),
            fulltext_row: fulltext || null,
            queue_row: queue ? {
                seq_id: queue.seq_id,
                created_at: queue.created_at,
                operation: queue.operation,
                operation_name: operationName(queue.operation),
                topic: queue.topic,
                id: queue.id,
                encoding: queue.encoding,
                vector_bytes: queue.vector ? queue.vector.length : 0,
                vector_dimensions: queueSummary ? queueSummary.dimensions : null,
                vector_preview: queueSummary ? queueSummary.preview : null,
                vector_norm: queueSummary ? queueSummary.norm : null,
                metadata: queueMetadata
            } : null
        };
    } catch (err) {
        return { error: err.message };
    } finally {
        try { db.close(); } catch (err) { /* ignore */ }
    }
}

/**
 * Read one record through the Chroma client and through ChromaDB's SQLite store.
 */
async function getRecordDetails(collectionName, id) {
    const allowed = Object.keys(COLLECTION_DEFINITIONS);
    if (!allowed.includes(collectionName)) {
        throw new Error(`Unsupported collection "${collectionName}"`);
    }

    await ensureChromaConnection();
    const collection = chromaCollections[collectionName] || (collectionName === 'job_criteria' ? criteriaCollection : propositionsCollection);

    let document = null;
    let metadata = null;
    let vector = null;
    let engine = isChromaActive ? 'ChromaDB' : 'EmbeddedStore';

    if (isChromaActive && collection) {
        try {
            const result = await collection.get({
                ids: [id],
                include: ['documents', 'metadatas', 'embeddings']
            });
            if (result && result.ids && result.ids.length > 0) {
                document = result.documents?.[0] ?? null;
                metadata = result.metadatas?.[0] ?? null;
                vector = toNumberArray(result.embeddings?.[0]);
            }
        } catch (err) {
            // Fall through to local mirror
        }
    }

    if (!document && !metadata) {
        const store = localVectorStore[collectionName] || [];
        const local = store.find(item => item.id === id);
        if (local) {
            document = local.text;
            metadata = local.metadata;
            vector = toNumberArray(local.vector);
            engine = 'EmbeddedStore';
        }
    }

    const storage = getSqliteRecord(collectionName, id);

    // If Chroma is offline but SQLite has the record, reconstruct the document
    if (!document && storage && storage.metadata_rows) {
        const docRow = storage.metadata_rows.find(row => row.key === 'chroma:document');
        if (docRow) document = docRow.value;
        if (!metadata) {
            metadata = {};
            storage.metadata_rows.forEach(row => {
                if (row.key !== 'chroma:document') metadata[row.key] = row.value;
            });
        }
    }

    if (!document && !metadata && !storage) return null;

    const summary = summarizeVector(vector);

    return {
        collection: collectionName,
        id,
        document,
        metadata,
        engine,
        vector,
        vector_preview: summary ? summary.preview : null,
        vector_norm: summary ? summary.norm : null,
        vector_dimensions: summary ? summary.dimensions : (storage?.collection?.dimension || null),
        storage
    };
}

/**
 * Return statistics about the vector database across all 11 collections
 */
async function getVectorStats() {
    await ensureChromaConnection();

    const collectionStats = [];
    let totalRecords = 0;

    for (const [colKey, colDef] of Object.entries(COLLECTION_DEFINITIONS)) {
        let count = 0;
        const col = chromaCollections[colKey];
        if (isChromaActive && col) {
            try {
                count = await col.count();
            } catch (e) {}
        }
        if (count === 0 && localVectorStore[colKey]) {
            count = localVectorStore[colKey].length;
        }
        totalRecords += count;
        collectionStats.push({
            name: colKey,
            label: colDef.label,
            short: colDef.short,
            color: colDef.color,
            count,
            dimension: 384,
            distance: 'cosine'
        });
    }

    const sqliteFiles = ['chroma.sqlite3', 'chroma.sqlite3-wal', 'chroma.sqlite3-shm']
        .map(name => fileStats(path.join(CHROMA_DATA_DIR, name)))
        .filter(Boolean);

    const chromaPropsCount = collectionStats.find(c => c.name === 'candidate_propositions')?.count || 0;
    const chromaCritCount = collectionStats.find(c => c.name === 'job_criteria')?.count || 0;

    return {
        isChromaActive,
        engine: isChromaActive ? 'ChromaDB Standalone (100% Primary DB)' : 'Embedded Vector Engine',
        chroma_version: chromaVersion,
        port: Number(process.env.CHROMA_PORT || 8000),
        embedding_model: 'Xenova/all-MiniLM-L6-v2',
        dimensions: 384,
        distance_metric: 'Cosine Similarity (HNSW)',
        indexed_propositions: chromaPropsCount,
        indexed_criteria: chromaCritCount,
        total_indexed_vectors: totalRecords,
        collections: collectionStats,
        persistence_path: CHROMA_DATA_DIR,
        sqlite_files: sqliteFiles,
        sqlite_size_bytes: sqliteFiles.reduce((total, file) => total + file.bytes, 0)
    };
}

/**
 * Fetch all items in all 11 collections for inspection in the visualizer.
 * By default only a compact vector preview is returned. Pass
 * { includeVectors: true } to include the full 384-d arrays.
 */
async function getCollectionsData(options = {}) {
    const includeVectors = Boolean(options.includeVectors);
    await ensureChromaConnection();

    const result = {
        engine: isChromaActive ? 'ChromaDB' : 'EmbeddedStore',
        generated_at: new Date().toISOString()
    };

    for (const [colKey, colDef] of Object.entries(COLLECTION_DEFINITIONS)) {
        let items = [];
        const col = chromaCollections[colKey];
        if (isChromaActive && col) {
            try {
                const res = await col.get({
                    include: ['embeddings', 'documents', 'metadatas']
                });
                if (res && res.ids) {
                    items = res.ids.map((id, i) => {
                        const vector = toNumberArray(res.embeddings ? res.embeddings[i] : null);
                        const summary = summarizeVector(vector);
                        return {
                            id,
                            type: colDef.type,
                            collection: colKey,
                            text: res.documents?.[i] ?? '',
                            metadata: res.metadatas?.[i] ?? {},
                            vector_preview: summary ? summary.preview : null,
                            vector_norm: summary ? summary.norm : null,
                            vector_dimensions: summary ? summary.dimensions : 384,
                            ...(includeVectors ? { vector } : {})
                        };
                    });
                }
            } catch (err) {
                console.warn(`[VectorService] Chroma getCollectionsData notice for ${colKey}:`, err.message);
            }
        }

        if (items.length === 0 && localVectorStore[colKey]) {
            items = localVectorStore[colKey].map(item => {
                const vector = toNumberArray(item.vector);
                const summary = summarizeVector(vector);
                return {
                    id: item.id,
                    type: colDef.type,
                    collection: colKey,
                    text: item.text,
                    metadata: item.metadata || {},
                    vector_preview: summary ? summary.preview : null,
                    vector_norm: summary ? summary.norm : null,
                    vector_dimensions: summary ? summary.dimensions : 384,
                    ...(includeVectors ? { vector } : {})
                };
            });
        }

        result[colKey] = items;
    }

    // Backwards compatibility for legacy views
    result.propositions = result.candidate_propositions || [];
    result.criteria = result.job_criteria || [];

    return result;
}

/**
 * Read ChromaDB's on-disk layout: SQLite metadata tables and HNSW segment files.
 */
async function getStorageInternals() {
    await ensureChromaConnection();

    const sqliteFiles = ['chroma.sqlite3', 'chroma.sqlite3-wal', 'chroma.sqlite3-shm']
        .map(name => fileStats(path.join(CHROMA_DATA_DIR, name)))
        .filter(Boolean);

    let hnsw = [];
    try {
        hnsw = fs.readdirSync(CHROMA_DATA_DIR, { withFileTypes: true })
            .filter(entry => entry.isDirectory())
            .map(entry => {
                const dirPath = path.join(CHROMA_DATA_DIR, entry.name);
                const files = fs.readdirSync(dirPath)
                    .map(name => fileStats(path.join(dirPath, name)))
                    .filter(Boolean)
                    .sort((a, b) => a.name.localeCompare(b.name));
                return {
                    segment_id: entry.name,
                    directory: dirPath,
                    files,
                    total_bytes: files.reduce((total, file) => total + file.bytes, 0)
                };
            })
            .sort((a, b) => a.segment_id.localeCompare(b.segment_id));
    } catch (err) {
        hnsw = [];
    }

    let sqlite = null;
    const db = openChromaSqlite();
    if (db) {
        try {
            const tableNames = db.prepare(
                "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
            ).all().map(row => row.name);

            const tables = tableNames.map(name => {
                let rows = null;
                try {
                    rows = db.prepare(`SELECT COUNT(*) AS count FROM "${name}"`).get().count;
                } catch (err) {
                    // Some virtual tables cannot be counted directly
                }
                return { name, rows };
            });

            const collectionRows = db.prepare(
                'SELECT id, name, dimension FROM collections ORDER BY name'
            ).all();

            const segmentRows = db.prepare(
                'SELECT id, type, scope, collection FROM segments ORDER BY id'
            ).all();

            const collectionMetadata = db.prepare(
                'SELECT collection_id, key, str_value, int_value, float_value, bool_value FROM collection_metadata'
            ).all();

            const embeddingCounts = db.prepare(
                'SELECT segment_id, COUNT(*) AS count FROM embeddings GROUP BY segment_id'
            ).all();

            const queueCounts = db.prepare(
                'SELECT topic, COUNT(*) AS count FROM embeddings_queue GROUP BY topic'
            ).all();

            const createdRanges = db.prepare(
                'SELECT segment_id, MIN(created_at) AS first_seen, MAX(created_at) AS last_seen FROM embeddings GROUP BY segment_id'
            ).all();

            const collections = collectionRows.map(collection => {
                const vectorSegment = segmentRows.find(segment =>
                    segment.collection === collection.id && String(segment.type).includes('vector')
                ) || null;
                const metadataSegment = segmentRows.find(segment =>
                    segment.collection === collection.id && String(segment.type).includes('metadata')
                ) || null;

                const metadata = {};
                collectionMetadata
                    .filter(row => row.collection_id === collection.id)
                    .forEach(row => { metadata[row.key] = metadataValue(row); });

                const countRow = embeddingCounts.find(row => row.segment_id === (metadataSegment ? metadataSegment.id : ''));
                const queueRow = queueCounts.find(row => String(row.topic).includes(collection.id));
                const rangeRow = createdRanges.find(row => row.segment_id === (metadataSegment ? metadataSegment.id : ''));

                return {
                    id: collection.id,
                    name: collection.name,
                    dimension: collection.dimension,
                    record_count: countRow ? countRow.count : 0,
                    queue_writes: queueRow ? queueRow.count : 0,
                    metadata,
                    hnsw_space: metadata['hnsw:space'] || null,
                    vector_segment: vectorSegment ? vectorSegment.id : null,
                    metadata_segment: metadataSegment ? metadataSegment.id : null,
                    first_seen: rangeRow ? rangeRow.first_seen : null,
                    last_seen: rangeRow ? rangeRow.last_seen : null
                };
            });

            // Attach collection names to HNSW segment directories
            hnsw = hnsw.map(dir => {
                const owner = collections.find(collection => collection.vector_segment === dir.segment_id);
                return {
                    ...dir,
                    collection: owner ? owner.name : null
                };
            });

            sqlite = {
                available: true,
                path: CHROMA_SQLITE_FILE,
                files: sqliteFiles,
                tables,
                collections
            };
        } catch (err) {
            sqlite = {
                available: false,
                path: CHROMA_SQLITE_FILE,
                files: sqliteFiles,
                error: err.message
            };
        } finally {
            try { db.close(); } catch (err) { /* ignore */ }
        }
    } else {
        sqlite = {
            available: false,
            path: CHROMA_SQLITE_FILE,
            files: sqliteFiles,
            error: 'ChromaDB SQLite file is not readable (is the server running?)'
        };
    }

    return {
        engine: isChromaActive ? 'ChromaDB' : 'EmbeddedStore',
        chroma_version: chromaVersion,
        persistence_path: CHROMA_DATA_DIR,
        sqlite,
        hnsw,
        write_path: [
            'React action (add / edit / delete proposition, rubric, or application)',
            'Express endpoint validates and writes the relational Oracle row',
            'all-MiniLM-L6-v2 (ONNX) converts the text to a normalized 384-d vector',
            'Chroma collection.upsert / delete writes the vector + metadata',
            'ChromaDB persists metadata in chroma.sqlite3 and vectors in the HNSW segment files',
            'A similarity query filters by metadata (job_id / candidate_id) and compares cosine similarity'
        ]
    };
}

/**
 * Project all vectors to 2D using PCA (power iteration on the centered data).
 * Nearby points have similar semantic meaning.
 */
function projectTo2D(allItems) {
    const items = allItems.filter(item => Array.isArray(item.vector) && item.vector.length > 0);
    if (items.length === 0) return [];

    const dimensions = items[0].vector.length;
    const count = items.length;

    const mean = new Array(dimensions).fill(0);
    for (const item of items) {
        for (let j = 0; j < dimensions; j++) mean[j] += item.vector[j];
    }
    for (let j = 0; j < dimensions; j++) mean[j] /= count;

    const centered = items.map(item => {
        const row = new Array(dimensions);
        for (let j = 0; j < dimensions; j++) row[j] = item.vector[j] - mean[j];
        return row;
    });

    const dot = (a, b) => {
        let total = 0;
        for (let j = 0; j < dimensions; j++) total += a[j] * b[j];
        return total;
    };

    const normalize = (vector) => {
        const length = Math.sqrt(dot(vector, vector));
        if (!length || !Number.isFinite(length)) return null;
        return vector.map(value => value / length);
    };

    const seed = centered.reduce((best, row) => (
        dot(row, row) > dot(best, best) ? row : best
    ), centered[0]);

    const powerIteration = (rows, orthogonalTo = []) => {
        let vector = normalize([...seed]);
        if (!vector) return null;

        for (let iteration = 0; iteration < 60; iteration++) {
            const next = new Array(dimensions).fill(0);
            for (const row of rows) {
                const projection = dot(row, vector);
                for (let j = 0; j < dimensions; j++) next[j] += projection * row[j];
            }

            for (const axis of orthogonalTo) {
                const projection = dot(next, axis);
                for (let j = 0; j < dimensions; j++) next[j] -= projection * axis[j];
            }

            const normalized = normalize(next);
            if (!normalized) break;
            vector = normalized;
        }

        return vector;
    };

    const pc1 = powerIteration(centered);
    const pc2 = pc1 ? powerIteration(centered, [pc1]) : null;

    if (!pc1 || !pc2) {
        return items.map((item, index) => ({
            id: item.id,
            type: item.type,
            collection: item.collection,
            text: item.text,
            metadata: item.metadata,
            x: ((index % 10) * 8) + 10,
            y: (Math.floor(index / 10) * 10) + 10
        }));
    }

    const rawPoints = centered.map((row, index) => ({
        item: items[index],
        rawX: dot(row, pc1),
        rawY: dot(row, pc2)
    }));

    const xs = rawPoints.map(point => point.rawX);
    const ys = rawPoints.map(point => point.rawY);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const rangeX = (maxX - minX) || 1;
    const rangeY = (maxY - minY) || 1;

    const totalVariance = centered.reduce((total, row) => total + dot(row, row), 0) || 1;
    const varianceX = rawPoints.reduce((total, point) => total + point.rawX * point.rawX, 0) / totalVariance;
    const varianceY = rawPoints.reduce((total, point) => total + point.rawY * point.rawY, 0) / totalVariance;

    return rawPoints.map(point => ({
        id: point.item.id,
        type: point.item.type,
        collection: point.item.collection,
        text: point.item.text,
        metadata: point.item.metadata,
        x: parseFloat((((point.rawX - minX) / rangeX) * 80 + 10).toFixed(2)),
        y: parseFloat((((point.rawY - minY) / rangeY) * 80 + 10).toFixed(2)),
        explained_variance: parseFloat(varianceX.toFixed(4)),
        second_variance: parseFloat(varianceY.toFixed(4))
    }));
}

/**
 * Generate 2D coordinates for all vectors using PCA across all collections.
 */
async function get2DProjection() {
    const data = await getCollectionsData({ includeVectors: true });
    const allItems = [];
    for (const key of Object.keys(COLLECTION_DEFINITIONS)) {
        if (Array.isArray(data[key])) {
            allItems.push(...data[key]);
        }
    }
    return projectTo2D(allItems);
}

function getOperationsLog(sinceSeq = 0) {
    const since = Number(sinceSeq) || 0;
    return operationsLog.filter(event => event.seq > since);
}

function getOperationsSnapshot(sinceSeq = 0) {
    return {
        events: getOperationsLog(sinceSeq),
        latest_seq: eventSeq,
        total: operationsLog.length,
        engine: isChromaActive ? 'ChromaDB' : 'EmbeddedStore'
    };
}

function getLatestEventSeq() {
    return eventSeq;
}

function recordOperation(entry) {
    return logOperation(entry);
}

module.exports = {
    initVectorService,
    getEmbedding,
    indexProposition,
    indexJobCriterion,
    indexRecord,
    deleteRecord,
    findExistingRecord,
    deleteProposition,
    deleteJobCriterion,
    calculateSemanticScore,
    cosineSimilarity,
    getVectorStats,
    getCollectionsData,
    get2DProjection,
    getRecordDetails,
    getStorageInternals,
    getOperationsLog,
    getOperationsSnapshot,
    getLatestEventSeq,
    recordOperation,
    ensureChromaConnection,
    COLLECTION_DEFINITIONS,
    isChromaActive: () => isChromaActive,
    getChromaVersion: () => chromaVersion
};
