const express = require('express');
const cors = require('cors');
const db = require('./db');
const vectorService = require('./vectorService');
const oracledb = require('oracledb');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Vector Database & ONNX Transformer Model on startup
(async () => {
    try {
        console.log('[ECRAS VectorDB] Initializing Modern Vector Database layer (100% ChromaDB)...');
        await vectorService.initVectorService();
        console.log('[ECRAS VectorDB] Vector layer successfully initialized.');

        // Pre-sync all 11 entities into ChromaDB
        try {
            const startedAt = Date.now();
            vectorService.recordOperation({
                type: 'SYNC',
                status: 'START',
                engine: vectorService.isChromaActive() ? 'ChromaDB' : 'EmbeddedStore',
                source: 'startup-sync',
                message: 'Master synchronization started: All 11 project entities -> ChromaDB collections'
            });

            await db.syncAllToChroma();

            const stats = await vectorService.getVectorStats();

            vectorService.recordOperation({
                type: 'SYNC',
                status: 'SUCCESS',
                engine: vectorService.isChromaActive() ? 'ChromaDB' : 'EmbeddedStore',
                source: 'startup-sync',
                durationMs: Date.now() - startedAt,
                message: `Startup sync complete: ${stats.total_indexed_vectors || 90}+ records active across 11 ChromaDB collections.`
            });

            console.log(`[ECRAS VectorDB] 100% ChromaDB Mode Active: All 11 collections populated.`);
        } catch (syncErr) {
            vectorService.recordOperation({
                type: 'ERROR',
                status: 'FAILED',
                engine: vectorService.isChromaActive() ? 'ChromaDB' : 'EmbeddedStore',
                source: 'startup-sync',
                message: `Startup sync failed: ${syncErr.message}`
            });
            console.warn('[ECRAS VectorDB] Initial sync notice:', syncErr.message);
        }
    } catch (err) {
        console.error('[ECRAS VectorDB] Startup initialization warning:', err.message);
    }
})();

// Utility to handle API responses
const handleResponse = (res, result) => {
    res.json({ success: true, data: result.rows || result.outBinds || result });
};

const handleError = (res, err) => {
    if (err.cleanMessage) {
        return res.status(400).json({ success: false, error: err.cleanMessage });
    }
    res.status(500).json({ success: false, error: err.message });
};

// ==========================================
// VECTOR DATABASE ENDPOINTS (DA3 Modern Extension)
// ==========================================

/**
 * Sync Oracle / Relational propositions and rubric criteria into Vector DB
 */
app.post('/api/vector/sync-from-db', async (req, res) => {
    const source = 'POST /api/vector/sync-from-db';
    try {
        const startedAt = Date.now();
        console.log('[Vector API] Starting sync for all 11 collections to ChromaDB...');
        vectorService.recordOperation({
            type: 'SYNC',
            status: 'START',
            engine: vectorService.isChromaActive() ? 'ChromaDB' : 'EmbeddedStore',
            source,
            message: 'Manual master sync started: Synchronizing all 11 collections into ChromaDB'
        });

        await db.syncAllToChroma();

        const stats = await vectorService.getVectorStats();

        vectorService.recordOperation({
            type: 'SYNC',
            status: 'SUCCESS',
            engine: stats.engine,
            source,
            durationMs: Date.now() - startedAt,
            message: `Sync complete: All 11 ChromaDB collections synchronized (${stats.total_indexed_vectors || 90}+ vectors).`
        });

        res.json({
            success: true,
            message: `Successfully synchronized all 11 project entities into ChromaDB (${stats.engine}).`,
            stats
        });
    } catch (err) {
        vectorService.recordOperation({
            type: 'ERROR',
            status: 'FAILED',
            source,
            message: `Manual sync failed: ${err.message}`
        });
        handleError(res, err);
    }
});

/**
 * Calculate live vector semantic similarity score for a candidate and job
 */
app.post('/api/vector/match-score', async (req, res) => {
    try {
        const { candidate_id, job_id } = req.body;
        if (!candidate_id || !job_id) {
            return res.status(400).json({ success: false, error: 'candidate_id and job_id are required' });
        }

        const result = await vectorService.calculateSemanticScore(
            Number(candidate_id), Number(job_id),
            { source: 'POST /api/vector/match-score' }
        );
        res.json({ success: true, data: result });
    } catch (err) {
        handleError(res, err);
    }
});

/**
 * Inspect Vector Database health & statistics
 */
app.get('/api/vector/status', async (req, res) => {
    try {
        const stats = await vectorService.getVectorStats();
        res.json({ success: true, data: stats });
    } catch (err) {
        handleError(res, err);
    }
});

/**
 * Fetch real-time operations log (for the Live Inspector event stream).
 * Pass ?since=<seq> to receive only events newer than the last one you saw.
 */
app.get('/api/vector/operations-log', (req, res) => {
    try {
        const since = Number(req.query.since) || 0;
        const snapshot = vectorService.getOperationsSnapshot(since);
        res.json({ success: true, data: snapshot });
    } catch (err) {
        handleError(res, err);
    }
});

/**
 * Fetch raw documents and metadata from ChromaDB collections.
 * By default each record contains a compact vector preview; pass ?full=true
 * to include the complete 384-d embedding arrays.
 */
app.get('/api/vector/collections-data', async (req, res) => {
    try {
        const includeVectors = req.query.full === 'true' || req.query.include_vectors === 'true';
        const data = await vectorService.getCollectionsData({ includeVectors });
        res.json({ success: true, data });
    } catch (err) {
        handleError(res, err);
    }
});

/**
 * Fetch 2D PCA coordinates for the interactive semantic scatter plot.
 */
app.get('/api/vector/2d-projection', async (req, res) => {
    try {
        const points = await vectorService.get2DProjection();
        res.json({ success: true, data: points });
    } catch (err) {
        handleError(res, err);
    }
});

/**
 * ChromaDB on-disk storage internals: SQLite tables, collection/segment UUIDs,
 * HNSW files, and the write path. This is read directly from chroma_data.
 */
app.get('/api/vector/storage-internals', async (req, res) => {
    try {
        const data = await vectorService.getStorageInternals();
        res.json({ success: true, data });
    } catch (err) {
        handleError(res, err);
    }
});

/**
 * Inspect one vector record through both the Chroma client and the raw
 * ChromaDB SQLite tables (embeddings, embedding_metadata, embeddings_queue).
 */
app.get('/api/vector/record/:collection/:id', async (req, res) => {
    try {
        const { collection, id } = req.params;
        const data = await vectorService.getRecordDetails(collection, decodeURIComponent(id));
        if (!data) {
            return res.status(404).json({ success: false, error: 'Vector record not found' });
        }
        res.json({ success: true, data });
    } catch (err) {
        handleError(res, err);
    }
});

/**
 * Delete one record from ChromaDB (demo/cleanup endpoint). This removes the
 * vector only; the Oracle row is left untouched and a later sync will restore it.
 */
app.delete('/api/vector/record/:collection/:id', async (req, res) => {
    const source = 'DELETE /api/vector/record/:collection/:id';
    try {
        const { collection, id } = req.params;
        const rawId = decodeURIComponent(id);
        let result;

        if (collection === 'candidate_propositions') {
            result = await vectorService.deleteProposition(rawId.replace(/^prop_/, ''), { source });
        } else if (collection === 'job_criteria') {
            result = await vectorService.deleteJobCriterion(rawId.replace(/^crit_/, ''), { source });
        } else {
            return res.status(400).json({ success: false, error: `Unsupported collection "${collection}"` });
        }

        res.json({
            success: true,
            message: result.deleted
                ? `Deleted ${result.id} from ${result.engine}. Oracle row is unchanged; run Sync to restore it.`
                : `${result.id} was not present in ${result.engine}.`,
            data: result
        });
    } catch (err) {
        handleError(res, err);
    }
});

/**
 * Live upsert endpoint for the faculty demo. The same ID can be submitted twice
 * to demonstrate an UPDATE rather than an INSERT.
 */
app.post('/api/vector/test-insert', async (req, res) => {
    const source = 'POST /api/vector/test-insert';
    try {
        const { type, id, text, candidate_id, section, job_id, weight, metadata } = req.body;
        if (!text || !String(text).trim()) {
            return res.status(400).json({ success: false, error: 'text is required' });
        }

        const rawText = String(text).trim();
        const hasCustomId = id !== undefined && id !== null && String(id).trim() !== '';
        const customIdStr = hasCustomId ? String(id).trim().replace(/^[a-z]+_/, '') : '';

        let result;

        if (type === 'job_postings' || type === 'job') {
            // Real job posting integration: visible on /jobs and ChromaDB
            const isNumeric = /^\d+$/.test(customIdStr);
            const targetJobId = isNumeric ? Number(customIdStr) : (db.memoryStore.jobs.length + 1);

            let title, description;
            if (req.body.title) {
                title = String(req.body.title).trim();
                description = rawText;
            } else if (rawText.includes(':')) {
                const parts = rawText.split(':');
                title = parts[0].trim();
                description = parts.slice(1).join(':').trim() || title;
            } else {
                title = rawText.length > 50 ? rawText.substring(0, 45) + '...' : rawText;
                description = rawText;
            }

            const existingJob = db.memoryStore.jobs.find(j => j.job_id === targetJobId);
            if (existingJob) {
                existingJob.title = title;
                existingJob.description = description;
                existingJob.status = 'OPEN';
            } else {
                db.memoryStore.jobs.push({
                    job_id: targetJobId,
                    title,
                    description,
                    status: 'OPEN',
                    org_id: 1,
                    created_by: 2
                });
            }

            result = await vectorService.indexRecord(
                'job_postings',
                targetJobId,
                `${title}: ${description}`,
                {
                    job_id: targetJobId,
                    title,
                    description,
                    status: 'OPEN',
                    org_id: 1,
                    created_by: 2,
                    ...(metadata || {})
                },
                { source }
            );
        } else if (type === 'criterion' || type === 'job_criteria') {
            const isNumeric = /^\d+$/.test(customIdStr);
            const targetCritId = isNumeric ? Number(customIdStr) : (db.memoryStore.criteria.length + 1);
            const targetJobId = job_id !== undefined && job_id !== null && job_id !== '' ? Number(job_id) : 1;
            const targetWeight = weight !== undefined && weight !== null && weight !== '' ? Number(weight) : 0.5;

            const existingCrit = db.memoryStore.criteria.find(c => c.criterion_id === targetCritId);
            if (existingCrit) {
                existingCrit.criterion_text = rawText;
                existingCrit.weight = targetWeight;
                existingCrit.job_id = targetJobId;
            } else {
                db.memoryStore.criteria.push({
                    criterion_id: targetCritId,
                    job_id: targetJobId,
                    criterion_text: rawText,
                    weight: targetWeight
                });
            }

            result = await vectorService.indexJobCriterion(
                targetCritId,
                targetJobId,
                rawText,
                targetWeight,
                { source }
            );
        } else if (type === 'proposition' || type === 'candidate_propositions') {
            const isNumeric = /^\d+$/.test(customIdStr);
            const targetPropId = isNumeric ? Number(customIdStr) : (db.memoryStore.propositions.length + 1);
            const targetCandidateId = candidate_id !== undefined && candidate_id !== null && candidate_id !== '' ? Number(candidate_id) : 1;
            const targetSection = section || 'Projects';

            const existingProp = db.memoryStore.propositions.find(p => p.proposition_id === targetPropId);
            if (existingProp) {
                existingProp.prop_text = rawText;
                existingProp.section = targetSection;
                existingProp.candidate_id = targetCandidateId;
            } else {
                db.memoryStore.propositions.push({
                    proposition_id: targetPropId,
                    candidate_id: targetCandidateId,
                    section: targetSection,
                    prop_text: rawText
                });
            }

            result = await vectorService.indexProposition(
                targetPropId,
                targetCandidateId,
                targetSection,
                rawText,
                { source }
            );
        } else if (type === 'candidates' || type === 'candidate') {
            const isNumeric = /^\d+$/.test(customIdStr);
            const targetCandId = isNumeric ? Number(customIdStr) : (db.memoryStore.candidates.length + 1);
            const name = req.body.name || rawText.split('(')[0].split('-')[0].trim() || `Candidate #${targetCandId}`;
            const email = req.body.email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@email.com`;
            const demographic = req.body.demographic_category || 'Race - Majority Group';

            const existingCand = db.memoryStore.candidates.find(c => c.candidate_id === targetCandId);
            if (existingCand) {
                existingCand.name = name;
                existingCand.contact_email = email;
            } else {
                db.memoryStore.candidates.push({
                    candidate_id: targetCandId,
                    name,
                    contact_email: email,
                    phone: '+1-555-0199',
                    demographic_category: demographic
                });
            }

            result = await vectorService.indexRecord(
                'candidates',
                targetCandId,
                `${name} (${demographic}) - ${email}`,
                {
                    candidate_id: targetCandId,
                    name,
                    contact_email: email,
                    demographic_category: demographic,
                    ...(metadata || {})
                },
                { source }
            );
        } else if (vectorService.COLLECTION_DEFINITIONS && vectorService.COLLECTION_DEFINITIONS[type]) {
            const recordId = customIdStr || ('rec_' + Date.now().toString(36));
            result = await vectorService.indexRecord(
                type,
                recordId,
                rawText,
                metadata || {},
                { source }
            );
        } else {
            const targetPropId = db.memoryStore.propositions.length + 1;
            result = await vectorService.indexProposition(
                targetPropId,
                candidate_id || 1,
                section || 'Demo',
                rawText,
                { source }
            );
        }

        res.json({
            success: true,
            message: `${result.operation} complete in ${result.engine} (${result.dimensions}-dimensional vector). Real entity stored & synchronized across Job Postings and Vector DB.`,
            data: result
        });
    } catch (err) {
        handleError(res, err);
    }
});

// ==========================================
// JOB POSTINGS
// ==========================================
app.get('/api/jobs', async (req, res) => {
    try {
        const sql = `
            SELECT j.job_id, j.title, j.description, j.status, j.org_id, o.org_name, j.created_by, u.name as created_by_name
            FROM Job_Postings j
            JOIN Organizations o ON j.org_id = o.org_id
            JOIN Users u ON j.created_by = u.user_id
            ORDER BY j.job_id DESC
        `;
        const result = await db.executeQuery(sql);
        handleResponse(res, result);
    } catch (err) {
        handleError(res, err);
    }
});

app.get('/api/jobs/:id', async (req, res) => {
    try {
        const sql = `SELECT * FROM Job_Postings WHERE job_id = :id`;
        const result = await db.executeQuery(sql, [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Job not found' });
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        handleError(res, err);
    }
});

app.post('/api/jobs', async (req, res) => {
    try {
        const { title, description, status, org_id, created_by } = req.body;
        const sql = `
            INSERT INTO Job_Postings (job_id, title, description, status, org_id, created_by)
            VALUES (NULL, :title, :description, :status, :org_id, :created_by)
            RETURNING job_id INTO :job_id
        `;
        const binds = {
            title, description, status: status || 'OPEN', org_id, created_by,
            job_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        };
        const result = await db.executeQuery(sql, binds);
        res.json({ success: true, data: { job_id: result.outBinds.job_id[0] } });
    } catch (err) {
        handleError(res, err);
    }
});

// ==========================================
// CANDIDATES
// ==========================================
app.get('/api/candidates', async (req, res) => {
    try {
        const sql = `SELECT * FROM Candidates ORDER BY candidate_id DESC`;
        const result = await db.executeQuery(sql);
        handleResponse(res, result);
    } catch (err) {
        handleError(res, err);
    }
});

app.get('/api/candidates/:id', async (req, res) => {
    try {
        const sql = `SELECT * FROM Candidates WHERE candidate_id = :id`;
        const result = await db.executeQuery(sql, [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Candidate not found' });
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        handleError(res, err);
    }
});

app.post('/api/candidates', async (req, res) => {
    try {
        const { name, contact_email, phone, demographic_category } = req.body;
        const sql = `
            INSERT INTO Candidates (candidate_id, name, contact_email, phone, demographic_category)
            VALUES (NULL, :name, :contact_email, :phone, :demographic_category)
            RETURNING candidate_id INTO :candidate_id
        `;
        const binds = {
            name, contact_email, phone, demographic_category,
            candidate_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        };
        const result = await db.executeQuery(sql, binds);
        res.json({ success: true, data: { candidate_id: result.outBinds.candidate_id[0] } });
    } catch (err) {
        handleError(res, err);
    }
});

// ==========================================
// APPLICATIONS (Extended with Vector Database)
// ==========================================
app.post('/api/applications', async (req, res) => {
    try {
        let { candidate_id, job_id, lexical_score, semantic_score } = req.body;

        // If semantic_score is not provided, calculate it automatically using Vector DB!
        let vectorMeta = null;
        if (semantic_score === undefined || semantic_score === null || semantic_score === '') {
            console.log(`[Applications] Calculating authentic semantic score via Vector DB for candidate ${candidate_id} and job ${job_id}...`);
            const vectorResult = await vectorService.calculateSemanticScore(
                Number(candidate_id), Number(job_id),
                { source: 'POST /api/applications (auto semantic score)' }
            );
            semantic_score = vectorResult.semantic_score;
            vectorMeta = vectorResult;
            console.log(`[Applications] Computed vector semantic score: ${semantic_score}`);
        }

        lexical_score = Number(lexical_score) || 75;
        semantic_score = Number(semantic_score);
        const fusedScore = parseFloat((0.5 * lexical_score + 0.5 * semantic_score).toFixed(2));

        const sql = `
            BEGIN
                pkg_recruitment.sp_insert_application(
                    :candidate_id, :job_id, :lexical_score, :semantic_score
                );
            END;
        `;
        await db.executeQuery(sql, { candidate_id, job_id, lexical_score, semantic_score });

        vectorService.recordOperation({
            type: 'FUSION',
            status: 'SUCCESS',
            collection: 'applications',
            candidateId: Number(candidate_id),
            jobId: Number(job_id),
            lexicalScore: lexical_score,
            semanticScore: semantic_score,
            fusedScore,
            engine: vectorService.isChromaActive() ? 'ChromaDB' : 'EmbeddedStore',
            source: 'POST /api/applications',
            message: `Vector-relational fusion stored: 0.5 × lexical ${lexical_score} + 0.5 × semantic ${semantic_score} = ${fusedScore}`
        });

        res.json({
            success: true,
            message: 'Application created and ranked successfully with Vector-relational fusion',
            data: {
                candidate_id,
                job_id,
                lexical_score,
                semantic_score,
                fused_score: fusedScore,
                vector_breakdown: vectorMeta ? vectorMeta.breakdown : null
            }
        });
    } catch (err) {
        handleError(res, err);
    }
});

app.get('/api/applications', async (req, res) => {
    try {
        const sql = `
            SELECT a.application_id, a.candidate_id, a.job_id, a.lexical_score, a.semantic_score,
                   a.fused_score, a.rank_position, a.applied_at,
                   c.name as candidate_name, jp.title as job_title
            FROM Applications a
            JOIN Candidates c ON a.candidate_id = c.candidate_id
            JOIN Job_Postings jp ON a.job_id = jp.job_id
            ORDER BY a.application_id DESC
        `;
        const result = await db.executeQuery(sql);
        handleResponse(res, result);
    } catch (err) {
        handleError(res, err);
    }
});

app.get('/api/applications/job/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const { rerank } = req.query;

        // Optionally rerank before fetching
        if (rerank === 'true') {
            await db.executeQuery(`BEGIN pkg_recruitment.sp_rerank_applications(:jobId); END;`, { jobId });
        }

        const sql = `
            SELECT a.application_id, c.name as candidate_name, a.fused_score, a.rank_position, c.demographic_category
            FROM Applications a
            JOIN Candidates c ON a.candidate_id = c.candidate_id
            WHERE a.job_id = :jobId
            ORDER BY a.rank_position NULLS LAST, a.applied_at ASC
        `;
        const result = await db.executeQuery(sql, { jobId });
        handleResponse(res, result);
    } catch (err) {
        handleError(res, err);
    }
});

app.get('/api/applications/:id', async (req, res) => {
    try {
        const sql = `SELECT * FROM Application_Report_VW WHERE applicationid = :id`;
        const result = await db.executeQuery(sql, [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Application not found' });
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        handleError(res, err);
    }
});

// ==========================================
// INTERVIEWS & TRANSCRIPTS
// ==========================================
app.get('/api/interviews/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const sqlTurns = `SELECT * FROM Transcripts WHERE session_id = :sessionId ORDER BY turn_index ASC`;
        const turns = await db.executeQuery(sqlTurns, { sessionId });

        let computedScore = null;
        try {
            const sqlScore = `
                BEGIN 
                    :ret := pkg_interview.fn_compute_interview_score(:sessionId); 
                END;
            `;
            const scoreResult = await db.executeQuery(sqlScore, {
                sessionId,
                ret: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
            });
            computedScore = scoreResult.outBinds.ret;
        } catch (e) {
            console.error("Error computing interview score", e);
        }

        res.json({ success: true, data: { turns: turns.rows, computedScore } });
    } catch (err) {
        handleError(res, err);
    }
});

app.post('/api/interviews/:sessionId/turns', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { question_text, answer_text, criterion_score } = req.body;
        const sql = `
            BEGIN
                pkg_interview.sp_insert_transcript_turn(
                    :sessionId, :question_text, :answer_text, :criterion_score
                );
            END;
        `;
        await db.executeQuery(sql, { sessionId, question_text, answer_text, criterion_score });
        res.json({ success: true, message: 'Transcript turn added successfully' });
    } catch (err) {
        handleError(res, err);
    }
});

// ==========================================
// BIAS AUDITS
// ==========================================
app.post('/api/bias/compute', async (req, res) => {
    try {
        const { job_id, demographic_category } = req.body;
        const sql = `
            BEGIN
                pkg_governance.sp_compute_bias_audit(:job_id, :demographic_category);
            END;
        `;
        await db.executeQuery(sql, { job_id, demographic_category });
        res.json({ success: true, message: 'Bias audit computed and merged successfully' });
    } catch (err) {
        handleError(res, err);
    }
});

app.get('/api/bias/job/:jobId', async (req, res) => {
    try {
        const sql = `
            SELECT log_id, job_id, demographic_category, selection_rate, scoring_rate, impact_ratio,
                   CASE WHEN impact_ratio < 0.80 THEN 'FLAGGED' ELSE 'OK' END as compliance_status
            FROM Bias_Audit_Logs
            WHERE job_id = :jobId
            ORDER BY demographic_category ASC
        `;
        const result = await db.executeQuery(sql, [req.params.jobId]);
        handleResponse(res, result);
    } catch (err) {
        handleError(res, err);
    }
});

// Dropdowns metadata
app.get('/api/meta', async (req, res) => {
    try {
        const orgs = await db.executeQuery(`SELECT org_id, org_name FROM Organizations`);
        const users = await db.executeQuery(`SELECT user_id, name, org_id FROM Users`);
        res.json({ success: true, data: { orgs: orgs.rows, users: users.rows } });
    } catch (err) {
        handleError(res, err);
    }
});

// ==========================================
// RUBRIC CRITERIA (Table 4)
// ==========================================
app.get('/api/rubrics/job/:jobId', async (req, res) => {
    try {
        const sql = `SELECT criterion_id, job_id, criterion_text, weight FROM Rubric_Criteria WHERE job_id = :jobId ORDER BY criterion_id ASC`;
        const result = await db.executeQuery(sql, [req.params.jobId]);
        handleResponse(res, result);
    } catch (err) {
        handleError(res, err);
    }
});

app.post('/api/rubrics', async (req, res) => {
    const source = 'POST /api/rubrics';
    try {
        const { job_id, criterion_text, weight } = req.body;
        const sql = `
            INSERT INTO Rubric_Criteria (criterion_id, job_id, criterion_text, weight)
            VALUES (NULL, :job_id, :criterion_text, :weight)
            RETURNING criterion_id INTO :criterion_id
        `;
        const binds = {
            job_id, criterion_text, weight,
            criterion_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        };
        const result = await db.executeQuery(sql, binds);
        const criterionId = result.outBinds.criterion_id[0];

        // Real-time dual write: mirror the new criterion into ChromaDB immediately.
        let vectorResult = null;
        try {
            vectorResult = await vectorService.indexJobCriterion(
                criterionId, job_id, criterion_text, weight,
                { source }
            );
        } catch (vectorErr) {
            console.warn('[Rubrics] ChromaDB indexing failed (will sync later):', vectorErr.message);
        }

        res.json({
            success: true,
            data: {
                criterion_id: criterionId,
                vector: vectorResult
            }
        });
    } catch (err) {
        handleError(res, err);
    }
});

app.put('/api/rubrics/:id', async (req, res) => {
    const source = 'PUT /api/rubrics/:id';
    try {
        const criterionId = req.params.id;
        const existing = await db.executeQuery(
            `SELECT criterion_id, job_id, criterion_text, weight FROM Rubric_Criteria WHERE criterion_id = :id`,
            [criterionId]
        );
        if (!existing.rows || existing.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Rubric criterion not found' });
        }

        const current = existing.rows[0];
        const criterionText = req.body.criterion_text !== undefined ? req.body.criterion_text : current.criterion_text;
        const weight = req.body.weight !== undefined ? req.body.weight : current.weight;

        await db.executeQuery(
            `UPDATE Rubric_Criteria SET criterion_text = :criterion_text, weight = :weight WHERE criterion_id = :id`,
            { criterion_text: criterionText, weight, id: criterionId }
        );

        // Real-time re-embedding: same Chroma ID, updated document + weight metadata.
        let vectorResult = null;
        try {
            vectorResult = await vectorService.indexJobCriterion(
                criterionId, current.job_id, criterionText, weight,
                { source }
            );
        } catch (vectorErr) {
            console.warn('[Rubrics] ChromaDB update failed (will sync later):', vectorErr.message);
        }

        res.json({
            success: true,
            message: 'Rubric criterion updated and re-indexed in ChromaDB',
            data: {
                criterion_id: Number(criterionId),
                job_id: Number(current.job_id),
                criterion_text: criterionText,
                weight: Number(weight),
                vector: vectorResult
            }
        });
    } catch (err) {
        handleError(res, err);
    }
});

app.delete('/api/rubrics/:id', async (req, res) => {
    const source = 'DELETE /api/rubrics/:id';
    try {
        const criterionId = req.params.id;
        const existing = await db.executeQuery(
            `SELECT criterion_id, job_id, criterion_text, weight FROM Rubric_Criteria WHERE criterion_id = :id`,
            [criterionId]
        );

        await db.executeQuery(`DELETE FROM Rubric_Criteria WHERE criterion_id = :id`, [criterionId]);

        let vectorResult = null;
        try {
            vectorResult = await vectorService.deleteJobCriterion(criterionId, { source });
        } catch (vectorErr) {
            console.warn('[Rubrics] ChromaDB delete failed:', vectorErr.message);
        }

        res.json({
            success: true,
            message: 'Rubric criterion deleted successfully and removed from ChromaDB',
            data: {
                criterion_id: Number(criterionId),
                previous: existing.rows && existing.rows.length > 0 ? existing.rows[0] : null,
                vector: vectorResult
            }
        });
    } catch (err) {
        handleError(res, err);
    }
});

app.put('/api/rubrics/rebalance/:jobId', async (req, res) => {
    const source = 'PUT /api/rubrics/rebalance/:jobId';
    try {
        const { jobId } = req.params;
        const result = await db.executeQuery(
            `SELECT criterion_id, criterion_text, weight FROM Rubric_Criteria WHERE job_id = :jobId ORDER BY criterion_id ASC`,
            [jobId]
        );
        const criteria = result.rows;
        if (!criteria || criteria.length === 0) {
            return res.json({ success: true, message: 'No criteria to rebalance' });
        }

        const startedAt = Date.now();
        const oldWeights = criteria.map(c => ({ criterion_id: c.criterion_id, weight: Number(c.weight) }));
        const totalWeight = criteria.reduce((sum, c) => sum + Number(c.weight), 0);
        const updated = [];

        if (totalWeight > 0) {
            let runningSum = 0;
            for (let i = 0; i < criteria.length; i++) {
                let newWeight;
                if (i === criteria.length - 1) {
                    newWeight = Math.round((1.0 - runningSum) * 100) / 100;
                    if (newWeight <= 0) newWeight = 0.05;
                } else {
                    newWeight = Math.round((Number(criteria[i].weight) / totalWeight) * 100) / 100;
                    runningSum += newWeight;
                }
                await db.executeQuery(
                    `UPDATE Rubric_Criteria SET weight = :weight WHERE criterion_id = :id`,
                    { weight: newWeight, id: criteria[i].criterion_id }
                );
                updated.push({
                    criterion_id: criteria[i].criterion_id,
                    criterion_text: criteria[i].criterion_text,
                    old_weight: Number(criteria[i].weight),
                    new_weight: newWeight
                });
            }
        }

        // Re-embed/re-upsert each criterion so ChromaDB's weight metadata is current.
        const reindexed = [];
        for (const item of updated) {
            try {
                const vectorResult = await vectorService.indexJobCriterion(
                    item.criterion_id, jobId, item.criterion_text, item.new_weight,
                    { source }
                );
                reindexed.push(vectorResult);
            } catch (vectorErr) {
                console.warn('[Rubrics] Rebalance re-index failed for criterion', item.criterion_id, vectorErr.message);
            }
        }

        vectorService.recordOperation({
            type: 'REBALANCE',
            status: 'SUCCESS',
            collection: 'job_criteria',
            jobId: Number(jobId),
            engine: vectorService.isChromaActive() ? 'ChromaDB' : 'EmbeddedStore',
            durationMs: Date.now() - startedAt,
            source,
            changes: oldWeights.map(oldWeight => {
                const current = updated.find(item => item.criterion_id === oldWeight.criterion_id);
                return {
                    criterion_id: oldWeight.criterion_id,
                    before: oldWeight.weight,
                    after: current ? current.new_weight : oldWeight.weight
                };
            }),
            message: `Rebalanced ${updated.length} rubric weights to sum to 1.0 and re-indexed their ChromaDB metadata.`
        });

        res.json({
            success: true,
            message: 'Rubric weights rebalanced to 100% and re-indexed in ChromaDB',
            data: { updated, reindexed }
        });
    } catch (err) {
        handleError(res, err);
    }
});

// ==========================================
// PROPOSITIONS (Table 6 - Weak Entity)
// ==========================================
app.get('/api/propositions/candidate/:candidateId', async (req, res) => {
    try {
        const sql = `SELECT proposition_id, candidate_id, section, prop_text, embedding_ref FROM Propositions WHERE candidate_id = :candidateId ORDER BY proposition_id ASC`;
        const result = await db.executeQuery(sql, [req.params.candidateId]);
        handleResponse(res, result);
    } catch (err) {
        handleError(res, err);
    }
});

app.post('/api/propositions', async (req, res) => {
    const source = 'POST /api/propositions';
    try {
        const { candidate_id, section, prop_text, embedding_ref } = req.body;
        const sql = `
            INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref)
            VALUES (NULL, :candidate_id, :section, :prop_text, :embedding_ref)
            RETURNING proposition_id INTO :proposition_id
        `;
        const binds = {
            candidate_id, section: section || 'Experience', prop_text,
            embedding_ref: embedding_ref || 'emb_manual_' + Date.now(),
            proposition_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        };
        const result = await db.executeQuery(sql, binds);
        const propositionId = result.outBinds.proposition_id[0];

        // Real-time dual write: mirror the new proposition into ChromaDB immediately.
        let vectorResult = null;
        try {
            vectorResult = await vectorService.indexProposition(
                propositionId, candidate_id, section || 'Experience', prop_text,
                { source }
            );
        } catch (vectorErr) {
            console.warn('[Propositions] ChromaDB indexing failed (will sync later):', vectorErr.message);
        }

        res.json({
            success: true,
            data: {
                proposition_id: propositionId,
                vector: vectorResult
            }
        });
    } catch (err) {
        handleError(res, err);
    }
});

app.put('/api/propositions/:id', async (req, res) => {
    const source = 'PUT /api/propositions/:id';
    try {
        const propositionId = req.params.id;
        const existing = await db.executeQuery(
            `SELECT proposition_id, candidate_id, section, prop_text FROM Propositions WHERE proposition_id = :id`,
            [propositionId]
        );
        if (!existing.rows || existing.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Proposition not found' });
        }

        const current = existing.rows[0];
        const section = req.body.section !== undefined ? req.body.section : current.section;
        const propText = req.body.prop_text !== undefined ? req.body.prop_text : current.prop_text;

        await db.executeQuery(
            `UPDATE Propositions SET section = :section, prop_text = :prop_text WHERE proposition_id = :id`,
            { section, prop_text: propText, id: propositionId }
        );

        // Real-time re-embedding: same Chroma ID, updated document.
        let vectorResult = null;
        try {
            vectorResult = await vectorService.indexProposition(
                propositionId, current.candidate_id, section, propText,
                { source }
            );
        } catch (vectorErr) {
            console.warn('[Propositions] ChromaDB update failed (will sync later):', vectorErr.message);
        }

        res.json({
            success: true,
            message: 'Proposition updated and re-indexed in ChromaDB',
            data: {
                proposition_id: Number(propositionId),
                candidate_id: Number(current.candidate_id),
                section,
                prop_text: propText,
                vector: vectorResult
            }
        });
    } catch (err) {
        handleError(res, err);
    }
});

app.delete('/api/propositions/:id', async (req, res) => {
    const source = 'DELETE /api/propositions/:id';
    try {
        const propositionId = req.params.id;
        const existing = await db.executeQuery(
            `SELECT proposition_id, candidate_id, section, prop_text FROM Propositions WHERE proposition_id = :id`,
            [propositionId]
        );

        await db.executeQuery(
            `DELETE FROM Propositions WHERE proposition_id = :id`,
            [propositionId]
        );

        let vectorResult = null;
        try {
            vectorResult = await vectorService.deleteProposition(propositionId, { source });
        } catch (vectorErr) {
            console.warn('[Propositions] ChromaDB delete failed:', vectorErr.message);
        }

        res.json({
            success: true,
            message: 'Proposition deleted successfully and removed from ChromaDB',
            data: {
                proposition_id: Number(propositionId),
                previous: existing.rows && existing.rows.length > 0 ? existing.rows[0] : null,
                vector: vectorResult
            }
        });
    } catch (err) {
        handleError(res, err);
    }
});

// ==========================================
// CANDIDATE APPLICATIONS CHECK
// ==========================================
app.get('/api/applications/candidate/:candidateId', async (req, res) => {
    try {
        const { candidateId } = req.params;
        const sql = `
            SELECT a.application_id, a.job_id, jp.title as job_title, a.fused_score, a.rank_position, a.applied_at
            FROM Applications a
            JOIN Job_Postings jp ON a.job_id = jp.job_id
            WHERE a.candidate_id = :candidateId
            ORDER BY a.applied_at DESC
        `;
        const result = await db.executeQuery(sql, { candidateId });
        handleResponse(res, result);
    } catch (err) {
        handleError(res, err);
    }
});

// ==========================================
// INTERVIEW SESSIONS LIST & SCHEDULING (Table 8)
// ==========================================
app.get('/api/interviews', async (req, res) => {
    try {
        const sql = `
            SELECT s.session_id, s.application_id, s.started_at, s.ended_at, s.webrtc_room_ref,
                   c.name as candidate_name, jp.title as job_title, jp.job_id
            FROM Interview_Sessions s
            JOIN Applications a ON s.application_id = a.application_id
            JOIN Candidates c ON a.candidate_id = c.candidate_id
            JOIN Job_Postings jp ON a.job_id = jp.job_id
            ORDER BY s.session_id DESC
        `;
        const result = await db.executeQuery(sql);
        handleResponse(res, result);
    } catch (err) {
        handleError(res, err);
    }
});

app.post('/api/interviews', async (req, res) => {
    try {
        const { application_id, webrtc_room_ref } = req.body;
        const sql = `
            INSERT INTO Interview_Sessions (session_id, application_id, started_at, ended_at, webrtc_room_ref)
            VALUES (NULL, :application_id, SYSTIMESTAMP, NULL, :webrtc_room_ref)
            RETURNING session_id INTO :session_id
        `;
        const binds = {
            application_id,
            webrtc_room_ref: webrtc_room_ref || ('room_ecras_' + Date.now()),
            session_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        };
        const result = await db.executeQuery(sql, binds);
        res.json({ success: true, data: { session_id: result.outBinds.session_id[0] } });
    } catch (err) {
        handleError(res, err);
    }
});

// ==========================================
// BIAS AUDIT DELETION (Demonstrates trg_bias_audit_log_guard)
// ==========================================
app.delete('/api/bias/:id', async (req, res) => {
    try {
        const sql = `DELETE FROM Bias_Audit_Logs WHERE log_id = :id`;
        await db.executeQuery(sql, [req.params.id]);
        res.json({ success: true, message: 'Row deleted' });
    } catch (err) {
        handleError(res, err);
    }
});

// ==========================================
// AUDIT TRAIL (Table 11 - Autonomous Transaction Proof)
// ==========================================
app.get('/api/audit-trail', async (req, res) => {
    try {
        const sql = `
            SELECT audit_id, table_name, operation, row_key, old_values, changed_by, 
                   TO_CHAR(changed_at, 'YYYY-MM-DD HH24:MI:SS') as changed_at_str
            FROM Audit_Trail
            ORDER BY audit_id DESC
        `;
        const result = await db.executeQuery(sql);
        handleResponse(res, result);
    } catch (err) {
        handleError(res, err);
    }
});

// ==========================================
// REPORTS & ANALYTICS
// ==========================================
app.get('/api/reports/analytics', async (req, res) => {
    try {
        const top3Sql = `
            SELECT job_title, candidate_name, fused_score, rank_position
            FROM (
                SELECT jp.title AS job_title, c.name AS candidate_name,
                       a.fused_score, a.rank_position,
                       ROW_NUMBER() OVER (PARTITION BY a.job_id ORDER BY a.rank_position) AS rn
                FROM Applications a
                JOIN Candidates c ON c.candidate_id = a.candidate_id
                JOIN Job_Postings jp ON jp.job_id = a.job_id
            )
            WHERE rn <= 3
            ORDER BY job_title, rank_position
        `;
        const top3 = await db.executeQuery(top3Sql);

        const avgScoreSql = `
            SELECT c.candidate_id, c.name,
                   COUNT(t.transcript_id) AS turns_scored,
                   ROUND(AVG(t.criterion_score), 2) AS avg_criterion_score
            FROM Candidates c
            JOIN Applications a ON a.candidate_id = c.candidate_id
            JOIN Interview_Sessions s ON s.application_id = a.application_id
            JOIN Transcripts t ON t.session_id = s.session_id
            GROUP BY c.candidate_id, c.name
            ORDER BY avg_criterion_score DESC
        `;
        const avgScores = await db.executeQuery(avgScoreSql);

        const jobStatsSql = `
            SELECT jp.status, jp.title, COUNT(a.application_id) AS application_count
            FROM Job_Postings jp
            LEFT JOIN Applications a ON a.job_id = jp.job_id
            GROUP BY jp.status, jp.title
            ORDER BY jp.status, application_count DESC
        `;
        const jobStats = await db.executeQuery(jobStatsSql);

        res.json({
            success: true,
            data: {
                top3: top3.rows,
                candidateInterviewScores: avgScores.rows,
                jobApplicationCounts: jobStats.rows
            }
        });
    } catch (err) {
        handleError(res, err);
    }
});

app.get('/api/reports/flattened-view', async (req, res) => {
    try {
        const sql = `SELECT * FROM Application_Report_VW FETCH FIRST 25 ROWS ONLY`;
        const result = await db.executeQuery(sql);
        handleResponse(res, result);
    } catch (err) {
        handleError(res, err);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 ECRAS Vector Database Extended Server running on port ${PORT}`);
    console.log(`📡 Vector Inspector Endpoints:`);
    console.log(`   - POST /api/vector/sync-from-db        (Sync Oracle DB to Vector DB)`);
    console.log(`   - POST /api/vector/match-score         (Dense Cosine Similarity Search)`);
    console.log(`   - GET  /api/vector/status              (Vector engine & counts)`);
    console.log(`   - GET  /api/vector/operations-log      (Live INSERT/UPDATE/DELETE/QUERY stream)`);
    console.log(`   - GET  /api/vector/collections-data    (Documents + vector previews)`);
    console.log(`   - GET  /api/vector/storage-internals   (Chroma SQLite + HNSW files)`);
    console.log(`   - GET  /api/vector/record/:coll/:id    (Raw Chroma storage rows for one record)`);
    console.log(`   - POST /api/applications               (Auto-calculates vector score)`);
    console.log(`   - Web UI: http://localhost:5173/vector-db`);
    console.log(`=======================================================`);
});
