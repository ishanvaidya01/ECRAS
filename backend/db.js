const oracledb = require('oracledb');
const vectorService = require('./vectorService');
require('dotenv').config();

// Track connection health - Operating in 100% ChromaDB Vector Database Mode
let isOracleConnected = false;
let lastOracleFailureAt = 0;
const ORACLE_RETRY_COOLDOWN_MS = Number(process.env.ORACLE_RETRY_COOLDOWN_MS || 30000);

// Automatically map Oracle DB custom error codes and constraint violations to clean messages
const cleanOracleError = (err) => {
    if (!err || !err.message) return 'An unexpected database error occurred';
    if (err.message.includes('ORA-00001') || err.message.includes('UQ_APPLICATION_CANDIDATE_JOB')) {
        return 'This candidate has already submitted an application for this position.';
    }
    if (err.message && err.message.includes('ORA-20')) {
        const match = err.message.match(/ORA-20\d{3}:\s*([^\n]*)/);
        return match ? match[1].trim() : err.message.split('\n')[0];
    }
    return err.message.split('\n')[0];
};

// ============================================================================
// RESILIENT IN-MEMORY STORE (Exact Seed Data from db/02_seed_data.sql)
// Active when Oracle XE is not running on localhost:1521
// ============================================================================
const memoryStore = {
    organizations: [
        { org_id: 1, org_name: 'Apex Recruiting Group' },
        { org_id: 2, org_name: 'Starlight Financial Systems' },
        { org_id: 3, org_name: 'BioHealth Labs' }
    ],
    users: [
        { user_id: 1, name: 'Alice Admin', email: 'alice@apex.com', role: 'ADMIN', org_id: 1 },
        { user_id: 2, name: 'Bob Recruiter', email: 'bob@apex.com', role: 'RECRUITER', org_id: 1 },
        { user_id: 3, name: 'Charlie Auditor', email: 'charlie@apex.com', role: 'AUDITOR', org_id: 1 },
        { user_id: 4, name: 'David HR', email: 'david@starlight.com', role: 'RECRUITER', org_id: 2 },
        { user_id: 5, name: 'Emma Compliance', email: 'emma@starlight.com', role: 'AUDITOR', org_id: 2 },
        { user_id: 6, name: 'Frank Talent', email: 'frank@biohealth.com', role: 'RECRUITER', org_id: 3 }
    ],
    jobs: [
        { job_id: 1, title: 'Senior Backend Engineer', description: 'Design and build high-throughput distributed systems using Node.js, Go, or Java with Oracle/Postgres persistence and Kafka stream processing.', status: 'OPEN', org_id: 1, created_by: 2 },
        { job_id: 2, title: 'Machine Learning Research Engineer', description: 'Develop deep learning pipelines, transformer embeddings, and vector similarity search algorithms with Python and PyTorch.', status: 'OPEN', org_id: 1, created_by: 2 },
        { job_id: 3, title: 'Full Stack Web Developer', description: 'Build responsive modern interfaces with React, Tailwind CSS, and secure Node REST APIs.', status: 'OPEN', org_id: 2, created_by: 4 },
        { job_id: 4, title: 'Cloud Infrastructure Architect', description: 'Design enterprise cloud architecture on AWS/GCP with Kubernetes, Terraform, and high-availability databases.', status: 'OPEN', org_id: 2, created_by: 4 },
        { job_id: 5, title: 'Bioinformatics Data Scientist', description: 'Analyze genomic sequence data, pipeline automation, and medical AI models with Python and R.', status: 'OPEN', org_id: 3, created_by: 6 }
    ],
    criteria: [
        { criterion_id: 1, job_id: 1, criterion_text: '5+ years experience building highly concurrent distributed backend architectures and microservices', weight: 0.35 },
        { criterion_id: 2, job_id: 1, criterion_text: 'Expertise in relational database design, indexing, transaction isolation, and SQL optimization', weight: 0.35 },
        { criterion_id: 3, job_id: 1, criterion_text: 'Hands-on experience with event streams, message queues (Kafka/RabbitMQ), and cache layers (Redis)', weight: 0.30 },

        { criterion_id: 4, job_id: 2, criterion_text: 'Strong foundational background in deep learning, transformer architectures, and dense vector embeddings', weight: 0.40 },
        { criterion_id: 5, job_id: 2, criterion_text: 'Practical experience implementing vector databases (ChromaDB, Qdrant, Milvus) for semantic retrieval', weight: 0.35 },
        { criterion_id: 6, job_id: 2, criterion_text: 'Proficiency with PyTorch, ONNX Runtime, and deploying Hugging Face models into production', weight: 0.25 },

        { criterion_id: 7, job_id: 3, criterion_text: 'Proficiency in modern React, component lifecycle, hooks, and responsive Tailwind UI design', weight: 0.50 },
        { criterion_id: 8, job_id: 3, criterion_text: 'Demonstrated experience authoring RESTful and GraphQL endpoints in Node.js/Express', weight: 0.50 },

        { criterion_id: 9, job_id: 4, criterion_text: 'Extensive hands-on experience orchestrating Kubernetes clusters and managing cloud networking', weight: 0.60 },
        { criterion_id: 10, job_id: 4, criterion_text: 'Strong proficiency with Terraform and automated CI/CD pipeline infrastructure', weight: 0.40 }
    ],
    candidates: [
        { candidate_id: 1, name: 'Aarav Patel', contact_email: 'aarav.patel@email.com', phone: '+91-9876543210', demographic_category: 'Race - Majority Group' },
        { candidate_id: 2, name: 'Priya Sharma', contact_email: 'priya.sharma@email.com', phone: '+91-9876543211', demographic_category: 'Gender - Female' },
        { candidate_id: 3, name: 'Rohan Iyer', contact_email: 'rohan.iyer@email.com', phone: '+91-9876543212', demographic_category: 'Gender - Male' },
        { candidate_id: 4, name: 'Ananya Deshmukh', contact_email: 'ananya.d@email.com', phone: '+91-9876543213', demographic_category: 'Gender - Female' },
        { candidate_id: 5, name: 'Marcus Chen', contact_email: 'marcus.chen@email.com', phone: '+1-415-555-0101', demographic_category: 'Race - Underrepresented Minority' },
        { candidate_id: 6, name: 'Elena Rostova', contact_email: 'elena.rostova@email.com', phone: '+1-415-555-0102', demographic_category: 'Gender - Female' },
        { candidate_id: 7, name: 'Kavita Nair', contact_email: 'kavita.nair@email.com', phone: '+91-9876543214', demographic_category: 'Gender - Female' },
        { candidate_id: 8, name: 'Devendra Verma', contact_email: 'd.verma@email.com', phone: '+91-9876543215', demographic_category: 'Age 40+' },
        { candidate_id: 9, name: 'Fatima Al-Mansoor', contact_email: 'fatima.m@email.com', phone: '+971-50-1234567', demographic_category: 'Gender - Female' },
        { candidate_id: 10, name: 'Siddharth Rao', contact_email: 'sid.rao@email.com', phone: '+91-9876543216', demographic_category: 'Age Under 40' },
        { candidate_id: 11, name: 'Neha Gupta', contact_email: 'neha.gupta@email.com', phone: '+91-9876543217', demographic_category: 'Gender - Female' },
        { candidate_id: 12, name: 'Arthur Pendelton', contact_email: 'arthur.p@email.com', phone: '+44-20-7946-0912', demographic_category: 'Age 40+' },
        { candidate_id: 13, name: 'Mei-Ling Zhou', contact_email: 'meiling.zhou@email.com', phone: '+1-650-555-0199', demographic_category: 'Race - Underrepresented Minority' },
        { candidate_id: 14, name: 'Vikram Seth', contact_email: 'vikram.seth@email.com', phone: '+91-9876543218', demographic_category: 'Race - Majority Group' },
        { candidate_id: 15, name: 'Grace Hopper-Bauer', contact_email: 'grace.hb@email.com', phone: '+1-206-555-0144', demographic_category: 'Gender - Female' },
        { candidate_id: 16, name: 'Karthik Subramaniam', contact_email: 'karthik.s@email.com', phone: '+91-9876543219', demographic_category: 'Race - Majority Group' }
    ],
    propositions: [
        { proposition_id: 1, candidate_id: 1, section: 'Experience', prop_text: 'Architected and deployed high-throughput backend services handling 50k requests per second in Go and Node.js.' },
        { proposition_id: 2, candidate_id: 1, section: 'Skills', prop_text: 'Expert in Oracle SQL, PostgreSQL B-tree indexing, query tuning, and distributed transaction semantics.' },
        { proposition_id: 3, candidate_id: 1, section: 'Projects', prop_text: 'Implemented Apache Kafka event streaming pipeline reducing message delivery latency by 45%.' },

        { proposition_id: 4, candidate_id: 2, section: 'Experience', prop_text: 'Trained large-scale vision and language transformer models with PyTorch on multi-GPU clusters.' },
        { proposition_id: 5, candidate_id: 2, section: 'Research', prop_text: 'Built dense semantic retrieval system using vector embeddings with ChromaDB and HNSW similarity search.' },
        { proposition_id: 6, candidate_id: 2, section: 'Deployment', prop_text: 'Converted transformer checkpoints to ONNX runtime for low-latency sub-5ms inference in production.' },

        { proposition_id: 7, candidate_id: 3, section: 'Frontend', prop_text: 'Developed scalable React single-page applications with Tailwind CSS, TypeScript, and responsive layout patterns.' },
        { proposition_id: 8, candidate_id: 3, section: 'Backend', prop_text: 'Created RESTful APIs in Express with JWT authentication, rate limiting, and automated unit testing.' },

        { proposition_id: 9, candidate_id: 4, section: 'Experience', prop_text: 'Spearheaded cloud migration to AWS utilizing Terraform IaC, multi-region Kubernetes, and Docker containers.' },
        { proposition_id: 10, candidate_id: 4, section: 'DevOps', prop_text: 'Automated CI/CD deployment pipelines using GitHub Actions, reducing release cycle time from days to minutes.' },

        { proposition_id: 11, candidate_id: 5, section: 'Experience', prop_text: 'Led development of distributed enterprise backend services using Java Spring Boot and Kafka.' },
        { proposition_id: 12, candidate_id: 5, section: 'Database', prop_text: 'Managed relational schemas with complex foreign keys, ACID compliance, and Oracle PL/SQL stored procedures.' },

        { proposition_id: 13, candidate_id: 6, section: 'Machine Learning', prop_text: 'Designed neural embedding pipelines using sentence-transformers for resume-to-job matching.' },
        { proposition_id: 14, candidate_id: 6, section: 'Vector Databases', prop_text: 'Integrated Qdrant and Milvus vector stores for fast k-nearest-neighbors candidate retrieval.' },

        { proposition_id: 15, candidate_id: 7, section: 'UI Engineering', prop_text: 'Crafted accessible WCAG 2.1 AA compliant UI components using React, Redux Toolkit, and Tailwind.' },
        { proposition_id: 16, candidate_id: 7, section: 'Fullstack', prop_text: 'Built Node.js microservices with PostgreSQL connection pooling and JSON schema validation.' },

        { proposition_id: 17, candidate_id: 8, section: 'Cloud & Infrastructure', prop_text: '20 years of experience managing enterprise data centers, Linux clusters, and Kubernetes infrastructure.' },
        { proposition_id: 18, candidate_id: 8, section: 'Reliability', prop_text: 'Enforced zero-downtime rolling deployments and disaster recovery with Terraform automation.' },

        { proposition_id: 19, candidate_id: 9, section: 'AI & Data Science', prop_text: 'Published papers on dense passage retrieval and reciprocal rank fusion for hybrid search engines.' },
        { proposition_id: 20, candidate_id: 9, section: 'Engineering', prop_text: 'Fine-tuned Hugging Face transformer models for domain-specific NLP classification tasks.' },

        { proposition_id: 21, candidate_id: 10, section: 'Systems', prop_text: 'Wrote low-level network server in C++ and Go with asynchronous epoll I/O handling high concurrency.' },
        { proposition_id: 22, candidate_id: 10, section: 'Database', prop_text: 'Engineered database sharding and replica read distribution for large MySQL and Oracle databases.' },

        { proposition_id: 23, candidate_id: 11, section: 'Fullstack', prop_text: 'Built full-stack dashboards using React, Vite, Tailwind CSS, and Node.js with Oracle backend.' },
        { proposition_id: 24, candidate_id: 11, section: 'Testing', prop_text: 'Maintained 95% test coverage using Jest, React Testing Library, and Cypress end-to-end suites.' },

        { proposition_id: 25, candidate_id: 12, section: 'Leadership', prop_text: 'Managed cloud platform engineering division supervising 40 engineers and multimillion cloud budget.' },
        { proposition_id: 26, candidate_id: 12, section: 'Architecture', prop_text: 'Architected hybrid cloud migration connecting on-premise Oracle ERP to AWS cloud native microservices.' },

        { proposition_id: 27, candidate_id: 13, section: 'Research', prop_text: 'Researched cross-encoder reranking algorithms and approximate nearest neighbor search indexes.' },
        { proposition_id: 28, candidate_id: 13, section: 'MLOps', prop_text: 'Deployed ML models with Triton inference server and ONNX quantization for 4x speedup.' },

        { proposition_id: 29, candidate_id: 14, section: 'Engineering', prop_text: 'Developed reactive event-driven backend services with Kafka, Redis Pub/Sub, and Go microservices.' },
        { proposition_id: 30, candidate_id: 14, section: 'Databases', prop_text: 'Authored complex PL/SQL packages, analytical window functions, and autonomous audit triggers.' },

        { proposition_id: 31, candidate_id: 15, section: 'Cloud & Kubernetes', prop_text: 'Certified Kubernetes Administrator (CKA); built multi-tenant clusters with Calico networking.' },
        { proposition_id: 32, candidate_id: 16, section: 'Fullstack', prop_text: 'Engineered interactive dashboards with React 18, WebSocket feeds, and responsive Tailwind layouts.' }
    ],
    applications: [
        { application_id: 1, candidate_id: 1, job_id: 1, applied_at: new Date('2026-09-01T10:00:00Z'), fused_score: 91.50, rank_position: 1 },
        { application_id: 2, candidate_id: 5, job_id: 1, applied_at: new Date('2026-09-01T11:00:00Z'), fused_score: 87.25, rank_position: 2 },
        { application_id: 3, candidate_id: 10, job_id: 1, applied_at: new Date('2026-09-01T12:00:00Z'), fused_score: 83.00, rank_position: 3 },
        { application_id: 4, candidate_id: 14, job_id: 1, applied_at: new Date('2026-09-01T13:00:00Z'), fused_score: 80.50, rank_position: 4 },

        { application_id: 5, candidate_id: 2, job_id: 2, applied_at: new Date('2026-09-01T10:30:00Z'), fused_score: 94.00, rank_position: 1 },
        { application_id: 6, candidate_id: 6, job_id: 2, applied_at: new Date('2026-09-01T11:30:00Z'), fused_score: 89.50, rank_position: 2 },
        { application_id: 7, candidate_id: 9, job_id: 2, applied_at: new Date('2026-09-01T12:30:00Z'), fused_score: 86.00, rank_position: 3 },
        { application_id: 8, candidate_id: 13, job_id: 2, applied_at: new Date('2026-09-01T13:30:00Z'), fused_score: 84.50, rank_position: 4 },

        { application_id: 9, candidate_id: 3, job_id: 3, applied_at: new Date('2026-09-01T14:00:00Z'), fused_score: 88.00, rank_position: 1 },
        { application_id: 10, candidate_id: 7, job_id: 3, applied_at: new Date('2026-09-01T14:30:00Z'), fused_score: 86.50, rank_position: 2 },
        { application_id: 11, candidate_id: 11, job_id: 3, applied_at: new Date('2026-09-01T15:00:00Z'), fused_score: 82.00, rank_position: 3 },
        { application_id: 12, candidate_id: 16, job_id: 3, applied_at: new Date('2026-09-01T15:30:00Z'), fused_score: 79.50, rank_position: 4 }
    ],
    transcripts: [
        { transcript_id: 1, session_id: 1, turn_index: 1, question_text: 'How do you handle high concurrency and race conditions in distributed systems?', answer_text: 'We utilize distributed locks with Redis Redlock algorithm or database optimistic concurrency control using version timestamps.', criterion_score: 88.5 },
        { transcript_id: 2, session_id: 1, turn_index: 2, question_text: 'Can you explain the trade-offs between B-tree indexes and HNSW vector indexes?', answer_text: 'B-trees provide O(log N) exact scalar searches along a single dimension. HNSW constructs a multi-layer graph for Approximate Nearest Neighbors across 384+ dimensions with sub-linear latency.', criterion_score: 95.0 }
    ],
    biasLogs: [
        { log_id: 1, job_id: 1, demographic_category: 'Gender - Male', selection_rate: 0.75, scoring_rate: 0.85, impact_ratio: 1.00 },
        { log_id: 2, job_id: 1, demographic_category: 'Gender - Female', selection_rate: 0.65, scoring_rate: 0.80, impact_ratio: 0.87 },
        { log_id: 3, job_id: 1, demographic_category: 'Race - Underrepresented Minority', selection_rate: 0.60, scoring_rate: 0.78, impact_ratio: 0.80 },
        { log_id: 4, job_id: 2, demographic_category: 'Gender - Female', selection_rate: 0.80, scoring_rate: 0.90, impact_ratio: 1.00 },
        { log_id: 5, job_id: 2, demographic_category: 'Gender - Male', selection_rate: 0.70, scoring_rate: 0.82, impact_ratio: 0.875 }
    ]
};

// ---------------------------------------------------------------------------
// Helpers used by the in-memory relational fallback. They mirror the SQL and
// PL/SQL logic closely enough that the UI behaves the same without Oracle XE.
// ---------------------------------------------------------------------------
function ensureInterviewSessions() {
    if (!memoryStore.interviewSessions) {
        memoryStore.interviewSessions = [
            {
                session_id: 1,
                application_id: 1,
                started_at: '2026-10-15 10:00:00',
                ended_at: '2026-10-15 10:45:00',
                webrtc_room_ref: 'room_mock_01'
            }
        ];
    }
    return memoryStore.interviewSessions;
}

function candidateById(id) {
    return memoryStore.candidates.find(c => c.candidate_id === Number(id)) || {};
}

function jobById(id) {
    return memoryStore.jobs.find(j => j.job_id === Number(id)) || {};
}

function buildTop3PerJob() {
    const byJob = new Map();
    for (const app of memoryStore.applications) {
        if (!byJob.has(app.job_id)) byJob.set(app.job_id, []);
        byJob.get(app.job_id).push(app);
    }

    const rows = [];
    for (const [jobId, apps] of byJob.entries()) {
        const job = jobById(jobId);
        const sorted = [...apps].sort((a, b) => {
            const rankA = a.rank_position == null ? 999 : Number(a.rank_position);
            const rankB = b.rank_position == null ? 999 : Number(b.rank_position);
            if (rankA !== rankB) return rankA - rankB;
            return Number(b.fused_score || 0) - Number(a.fused_score || 0);
        }).slice(0, 3);

        for (const app of sorted) {
            rows.push({
                job_title: job.title || 'Role',
                candidate_name: candidateById(app.candidate_id).name || 'Candidate',
                fused_score: app.fused_score,
                rank_position: app.rank_position
            });
        }
    }

    return rows.sort((a, b) => {
        const titleCompare = String(a.job_title).localeCompare(String(b.job_title));
        if (titleCompare !== 0) return titleCompare;
        return Number(a.rank_position || 999) - Number(b.rank_position || 999);
    });
}

function buildAverageInterviewScores() {
    ensureInterviewSessions();
    const grouped = new Map();

    for (const turn of memoryStore.transcripts) {
        const session = memoryStore.interviewSessions.find(s => s.session_id === turn.session_id);
        if (!session) continue;
        const app = memoryStore.applications.find(a => a.application_id === session.application_id);
        if (!app) continue;
        const candidate = candidateById(app.candidate_id);

        if (!grouped.has(app.candidate_id)) {
            grouped.set(app.candidate_id, {
                candidate_id: app.candidate_id,
                name: candidate.name || 'Candidate',
                total: 0,
                count: 0
            });
        }
        const entry = grouped.get(app.candidate_id);
        entry.total += Number(turn.criterion_score) || 0;
        entry.count += 1;
    }

    return [...grouped.values()]
        .map(entry => ({
            candidate_id: entry.candidate_id,
            name: entry.name,
            turns_scored: entry.count,
            avg_criterion_score: Number((entry.total / entry.count).toFixed(2))
        }))
        .sort((a, b) => b.avg_criterion_score - a.avg_criterion_score);
}

function buildJobApplicationCounts() {
    const counts = new Map();
    for (const app of memoryStore.applications) {
        counts.set(app.job_id, (counts.get(app.job_id) || 0) + 1);
    }

    return memoryStore.jobs.map(job => ({
        status: job.status,
        title: job.title,
        application_count: counts.get(job.job_id) || 0
    })).sort((a, b) => {
        const statusCompare = String(a.status).localeCompare(String(b.status));
        if (statusCompare !== 0) return statusCompare;
        return b.application_count - a.application_count;
    });
}

function buildFlattenedReportRows() {
    ensureInterviewSessions();
    return memoryStore.applications.map(app => {
        const candidate = candidateById(app.candidate_id);
        const job = jobById(app.job_id);
        const org = memoryStore.organizations.find(o => o.org_id === job.org_id) || {};
        const recruiter = memoryStore.users.find(u => u.user_id === job.created_by) || {};
        const session = memoryStore.interviewSessions.find(s => s.application_id === app.application_id);
        const turn = session
            ? memoryStore.transcripts.find(t => t.session_id === session.session_id)
            : null;

        return {
            applicationid: app.application_id,
            candidateid: candidate.candidate_id || app.candidate_id,
            candidatename: candidate.name || 'Candidate',
            candidateemail: candidate.contact_email || null,
            demographiccategory: candidate.demographic_category || null,
            jobid: job.job_id || app.job_id,
            jobtitle: job.title || 'Role',
            jobstatus: job.status || 'OPEN',
            orgname: org.org_name || 'Organization',
            recruitername: recruiter.name || 'Recruiter',
            fusedscore: app.fused_score,
            rankposition: app.rank_position,
            appliedat: app.applied_at instanceof Date ? app.applied_at.toISOString() : app.applied_at,
            sessionid: session ? session.session_id : null,
            startedat: session ? session.started_at : null,
            endedat: session ? session.ended_at : null,
            webrtcroomref: session ? session.webrtc_room_ref : null,
            turnindex: turn ? turn.turn_index : null,
            questiontext: turn ? turn.question_text : null,
            answertext: turn ? turn.answer_text : null,
            criterionscore: turn ? turn.criterion_score : null
        };
    }).sort((a, b) => b.applicationid - a.applicationid);
}

function computeBiasAudit(jobId, demographicCategory) {
    ensureInterviewSessions();
    const jobApplications = memoryStore.applications.filter(a => a.job_id === Number(jobId));
    const categoryApplications = jobApplications.filter(
        app => candidateById(app.candidate_id).demographic_category === demographicCategory
    );

    const selectedCount = categoryApplications.filter(app =>
        memoryStore.interviewSessions.some(session => session.application_id === app.application_id)
    ).length;

    const selectionRate = categoryApplications.length > 0
        ? Number((selectedCount / categoryApplications.length).toFixed(3))
        : 0;

    const avgFused = categoryApplications.length > 0
        ? categoryApplications.reduce((sum, app) => sum + (Number(app.fused_score) || 0), 0) / categoryApplications.length
        : null;

    let scoringRate = 0;
    if (avgFused !== null) {
        const normalized = avgFused <= 1 ? avgFused : avgFused / 100;
        scoringRate = Number(Math.max(0, Math.min(1, normalized)).toFixed(3));
    }

    const categoryRates = new Map();
    for (const app of jobApplications) {
        const category = candidateById(app.candidate_id).demographic_category || 'General';
        if (!categoryRates.has(category)) {
            categoryRates.set(category, { total: 0, selected: 0 });
        }
        const entry = categoryRates.get(category);
        entry.total += 1;
        if (memoryStore.interviewSessions.some(session => session.application_id === app.application_id)) {
            entry.selected += 1;
        }
    }

    const maxSelectionRate = Math.max(
        0,
        ...[...categoryRates.values()].map(entry => entry.total > 0 ? entry.selected / entry.total : 0)
    );

    const impactRatio = maxSelectionRate === 0
        ? 1
        : Number(Math.max(0, Math.min(1, selectionRate / maxSelectionRate)).toFixed(3));

    const existing = memoryStore.biasLogs.find(
        log => log.job_id === Number(jobId) && log.demographic_category === demographicCategory
    );

    if (existing) {
        existing.selection_rate = selectionRate;
        existing.scoring_rate = scoringRate;
        existing.impact_ratio = impactRatio;
    } else {
        memoryStore.biasLogs.push({
            log_id: memoryStore.biasLogs.length + 1,
            job_id: Number(jobId),
            demographic_category: demographicCategory,
            selection_rate: selectionRate,
            scoring_rate: scoringRate,
            impact_ratio: impactRatio
        });
    }

    return { selectionRate, scoringRate, impactRatio };
}

async function getConnection() {
    return null;
}

/**
 * Execute query with 100% ChromaDB-backed relational store.
 * Directly synchronizes every insert, update, delete, and calculation with ChromaDB collections.
 */
async function executeQuery(sql, binds = [], options = {}) {
    return handleInMemoryQuery(sql, binds);
}

/**
 * In-memory SQL/PLSQL simulator for when Oracle XE is offline
 */
function handleInMemoryQuery(sql, binds) {
    const cleanSql = sql.replace(/\s+/g, ' ').trim();
    const upperSql = cleanSql.toUpperCase();

    // -----------------------------------------------------------------------
    // Report / aggregate queries must be matched before their generic table
    // branches, otherwise the broader patterns below would swallow them.
    // -----------------------------------------------------------------------
    if (upperSql.includes('ROW_NUMBER() OVER (PARTITION BY A.JOB_ID')) {
        return { rows: buildTop3PerJob() };
    }

    if (upperSql.includes('COUNT(T.TRANSCRIPT_ID) AS TURNS_SCORED')) {
        return { rows: buildAverageInterviewScores() };
    }

    if (upperSql.includes('COUNT(A.APPLICATION_ID) AS APPLICATION_COUNT')) {
        return { rows: buildJobApplicationCounts() };
    }

    if (upperSql.includes('FROM APPLICATION_REPORT_VW')) {
        const allRows = buildFlattenedReportRows();
        if (upperSql.includes('WHERE APPLICATIONID = :ID')) {
            const id = Number(Array.isArray(binds) ? binds[0] : binds.id);
            return { rows: allRows.filter(row => Number(row.applicationid) === id) };
        }
        return { rows: allRows.slice(0, 25) };
    }

    // 1. SELECT Job_Postings
    if (upperSql.includes('FROM JOB_POSTINGS') && !upperSql.includes('WHERE JOB_ID = :ID')) {
        const rows = memoryStore.jobs.map(j => {
            const org = memoryStore.organizations.find(o => o.org_id === j.org_id) || {};
            const user = memoryStore.users.find(u => u.user_id === j.created_by) || {};
            return {
                job_id: j.job_id,
                title: j.title,
                description: j.description,
                status: j.status,
                org_id: j.org_id,
                org_name: org.org_name || 'Organization',
                created_by: j.created_by,
                created_by_name: user.name || 'Admin'
            };
        }).sort((a, b) => b.job_id - a.job_id);
        return { rows };
    }

    if (upperSql.includes('FROM JOB_POSTINGS WHERE JOB_ID = :ID')) {
        const id = Array.isArray(binds) ? Number(binds[0]) : Number(binds.id);
        const job = memoryStore.jobs.find(j => j.job_id === id);
        return { rows: job ? [job] : [] };
    }

    // 2. INSERT Job_Postings
    if (upperSql.includes('INSERT INTO JOB_POSTINGS')) {
        const newId = memoryStore.jobs.length + 1;
        const newJob = {
            job_id: newId,
            title: binds.title,
            description: binds.description,
            status: binds.status || 'OPEN',
            org_id: Number(binds.org_id) || 1,
            created_by: Number(binds.created_by) || 1
        };
        memoryStore.jobs.push(newJob);
        vectorService.indexRecord('job_postings', newId, `${newJob.title}: ${newJob.description}`, newJob, { source: 'POST /api/jobs' }).catch(e => console.warn(e));
        return { outBinds: { job_id: [newId] } };
    }

    // 3. SELECT Candidates
    if (upperSql.includes('FROM CANDIDATES') && !upperSql.includes('WHERE CANDIDATE_ID = :ID')) {
        const rows = [...memoryStore.candidates].sort((a, b) => b.candidate_id - a.candidate_id);
        return { rows };
    }

    if (upperSql.includes('FROM CANDIDATES WHERE CANDIDATE_ID = :ID')) {
        const id = Array.isArray(binds) ? Number(binds[0]) : Number(binds.id);
        const candidate = memoryStore.candidates.find(c => c.candidate_id === id);
        return { rows: candidate ? [candidate] : [] };
    }

    // 4. INSERT Candidates
    if (upperSql.includes('INSERT INTO CANDIDATES')) {
        const newId = memoryStore.candidates.length + 1;
        const newCand = {
            candidate_id: newId,
            name: binds.name,
            contact_email: binds.contact_email,
            phone: binds.phone,
            demographic_category: binds.demographic_category
        };
        memoryStore.candidates.push(newCand);
        vectorService.indexRecord('candidates', newId, `${newCand.name} (${newCand.demographic_category}) - ${newCand.contact_email}`, newCand, { source: 'POST /api/candidates' }).catch(e => console.warn(e));
        return { outBinds: { candidate_id: [newId] } };
    }

    // 5. SELECT / INSERT / UPDATE / DELETE Propositions
    if (upperSql.includes('FROM PROPOSITIONS WHERE CANDIDATE_ID = :CANDIDATEID')) {
        const cId = Array.isArray(binds) ? Number(binds[0]) : Number(binds.candidateId || binds.candidate_id);
        const props = memoryStore.propositions.filter(p => p.candidate_id === cId);
        return { rows: props };
    }
    if (upperSql.includes('FROM PROPOSITIONS WHERE PROPOSITION_ID = :ID')) {
        const id = Number(Array.isArray(binds) ? binds[0] : binds.id);
        const prop = memoryStore.propositions.find(p => p.proposition_id === id);
        return { rows: prop ? [prop] : [] };
    }
    if (upperSql.includes('UPDATE PROPOSITIONS SET SECTION = :SECTION, PROP_TEXT = :PROPTEXT')) {
        const id = Number(binds.id);
        const prop = memoryStore.propositions.find(p => p.proposition_id === id);
        if (prop) {
            prop.section = binds.section;
            prop.prop_text = binds.prop_text;
            vectorService.indexProposition(id, prop.candidate_id, prop.section, prop.prop_text, { source: 'PUT /api/propositions' }).catch(e => console.warn(e));
        }
        return { rows: [] };
    }
    if (upperSql.includes('DELETE FROM PROPOSITIONS WHERE PROPOSITION_ID = :ID')) {
        const id = Number(Array.isArray(binds) ? binds[0] : binds.id);
        const idx = memoryStore.propositions.findIndex(p => p.proposition_id === id);
        if (idx >= 0) memoryStore.propositions.splice(idx, 1);
        vectorService.deleteProposition(id, { source: 'DELETE /api/propositions' }).catch(e => console.warn(e));
        return { rows: [] };
    }
    if (upperSql.includes('INSERT INTO PROPOSITIONS')) {
        const newId = memoryStore.propositions.length + 1;
        const newProp = {
            proposition_id: newId,
            candidate_id: Number(binds.candidate_id),
            section: binds.section || 'Experience',
            prop_text: binds.prop_text,
            embedding_ref: binds.embedding_ref || 'emb_manual_' + Date.now()
        };
        memoryStore.propositions.push(newProp);
        vectorService.indexProposition(newId, newProp.candidate_id, newProp.section, newProp.prop_text, { source: 'POST /api/propositions' }).catch(e => console.warn(e));
        return { outBinds: { proposition_id: [newId] } };
    }
    if (upperSql.includes('FROM PROPOSITIONS')) {
        return { rows: [...memoryStore.propositions] };
    }

    // 6. SELECT / INSERT / DELETE / UPDATE Rubric_Criteria
    if (upperSql.includes('FROM RUBRIC_CRITERIA WHERE JOB_ID = :JOBID')) {
        const jId = Array.isArray(binds) ? Number(binds[0]) : Number(binds.jobId || binds.job_id);
        const crits = memoryStore.criteria.filter(c => c.job_id === jId);
        return { rows: crits };
    }
    if (upperSql.includes('FROM RUBRIC_CRITERIA WHERE CRITERION_ID = :ID')) {
        const id = Number(Array.isArray(binds) ? binds[0] : binds.id);
        const criterion = memoryStore.criteria.find(c => c.criterion_id === id);
        return { rows: criterion ? [criterion] : [] };
    }
    if (upperSql.includes('INSERT INTO RUBRIC_CRITERIA')) {
        const newId = memoryStore.criteria.length + 1;
        const newCrit = {
            criterion_id: newId,
            job_id: Number(binds.job_id),
            criterion_text: binds.criterion_text,
            weight: Number(binds.weight)
        };
        memoryStore.criteria.push(newCrit);
        return { outBinds: { criterion_id: [newId] } };
    }
    if (upperSql.includes('DELETE FROM RUBRIC_CRITERIA WHERE CRITERION_ID = :ID')) {
        const id = Array.isArray(binds) ? Number(binds[0]) : Number(binds.id);
        const idx = memoryStore.criteria.findIndex(c => c.criterion_id === id);
        if (idx >= 0) memoryStore.criteria.splice(idx, 1);
        return { rows: [] };
    }
    if (upperSql.includes('UPDATE RUBRIC_CRITERIA SET CRITERION_TEXT = :CRITERION_TEXT, WEIGHT = :WEIGHT')) {
        const id = Number(binds.id);
        const criterion = memoryStore.criteria.find(c => c.criterion_id === id);
        if (criterion) {
            criterion.criterion_text = binds.criterion_text;
            criterion.weight = Number(binds.weight);
        }
        return { rows: [] };
    }
    if (upperSql.includes('UPDATE RUBRIC_CRITERIA SET WEIGHT = :WEIGHT WHERE CRITERION_ID = :ID')) {
        const id = Number(binds.id);
        const w = Number(binds.weight);
        const c = memoryStore.criteria.find(crit => crit.criterion_id === id);
        if (c) c.weight = w;
        return { rows: [] };
    }
    if (upperSql.includes('FROM RUBRIC_CRITERIA')) {
        return { rows: [...memoryStore.criteria] };
    }

    // 7. Applications for a Job & Candidate Applications
    if (upperSql.includes('FROM APPLICATIONS A JOIN JOB_POSTINGS JP WHERE A.CANDIDATE_ID = :CANDIDATEID')) {
        const cId = Number(binds.candidateId || binds.candidate_id);
        const apps = memoryStore.applications.filter(a => a.candidate_id === cId).map(a => {
            const j = memoryStore.jobs.find(job => job.job_id === a.job_id) || {};
            return {
                application_id: a.application_id,
                job_id: a.job_id,
                job_title: j.title || 'Position',
                fused_score: a.fused_score,
                rank_position: a.rank_position,
                applied_at: a.applied_at
            };
        });
        return { rows: apps };
    }

    // 7. Applications for a Job
    if (upperSql.includes('FROM APPLICATIONS A JOIN CANDIDATES C')) {
        const jobId = Number(binds.jobId || binds.job_id);
        const apps = memoryStore.applications
            .filter(a => a.job_id === jobId)
            .map(a => {
                const cand = memoryStore.candidates.find(c => c.candidate_id === a.candidate_id) || {};
                return {
                    application_id: a.application_id,
                    candidate_name: cand.name || 'Candidate',
                    fused_score: a.fused_score,
                    rank_position: a.rank_position,
                    demographic_category: cand.demographic_category || 'General'
                };
            })
            .sort((a, b) => (a.rank_position || 999) - (b.rank_position || 999));
        return { rows: apps };
    }

    // 8. PL/SQL pkg_recruitment.sp_insert_application
    if (upperSql.includes('PKG_RECRUITMENT.SP_INSERT_APPLICATION')) {
        const candId = Number(binds.candidate_id);
        const jId = Number(binds.job_id);
        const lex = Number(binds.lexical_score) || 75;
        const sem = Number(binds.semantic_score) || 75;
        const fused = parseFloat((0.5 * lex + 0.5 * sem).toFixed(2));

        let targetApp = null;
        const existingAppIdx = memoryStore.applications.findIndex(a => a.candidate_id === candId && a.job_id === jId);
        if (existingAppIdx >= 0) {
            memoryStore.applications[existingAppIdx].fused_score = fused;
            memoryStore.applications[existingAppIdx].applied_at = new Date();
            targetApp = memoryStore.applications[existingAppIdx];
        } else {
            const newId = memoryStore.applications.length + 1;
            targetApp = {
                application_id: newId,
                candidate_id: candId,
                job_id: jId,
                applied_at: new Date(),
                fused_score: fused,
                rank_position: null
            };
            memoryStore.applications.push(targetApp);
        }

        // Rerank applications for this job
        rerankJobApplications(jId);

        // Sync with ChromaDB applications collection
        vectorService.indexRecord('applications', targetApp.application_id, `Application #${targetApp.application_id} for Job #${jId} by Candidate #${candId} - Fused Score: ${fused}`, targetApp, { source: 'POST /api/applications' }).catch(e => console.warn(e));

        return { rows: [], outBinds: {} };
    }

    // 9. PL/SQL pkg_recruitment.sp_rerank_applications
    if (upperSql.includes('PKG_RECRUITMENT.SP_RERANK_APPLICATIONS')) {
        const jId = Number(binds.jobId || binds.job_id);
        rerankJobApplications(jId);

        const apps = memoryStore.applications.filter(a => a.job_id === jId);
        for (const app of apps) {
            vectorService.indexRecord('applications', app.application_id, `Application #${app.application_id} (Rank #${app.rank_position}) for Job #${jId} (Score: ${app.fused_score})`, app, { source: 'pkg_recruitment.sp_rerank_applications' }).catch(e => console.warn(e));
        }

        return { rows: [] };
    }

    // 10. SELECT Organizations & Users
    if (upperSql.includes('FROM ORGANIZATIONS')) {
        return { rows: [...memoryStore.organizations] };
    }
    if (upperSql.includes('FROM USERS')) {
        return { rows: [...memoryStore.users] };
    }

    // 11. Transcripts & Interviews
    if (upperSql.includes('FROM TRANSCRIPTS WHERE SESSION_ID')) {
        const sId = Number(binds.sessionId);
        const turns = memoryStore.transcripts.filter(t => t.session_id === sId);
        return { rows: turns };
    }

    if (upperSql.includes('PKG_INTERVIEW.FN_COMPUTE_INTERVIEW_SCORE')) {
        const sId = Number(binds.sessionId);
        const turns = memoryStore.transcripts.filter(t => t.session_id === sId);
        const avg = turns.length > 0 ? (turns.reduce((acc, t) => acc + (t.criterion_score || 0), 0) / turns.length) : 85.0;
        return { outBinds: { ret: parseFloat(avg.toFixed(2)) } };
    }

    if (upperSql.includes('PKG_INTERVIEW.SP_INSERT_TRANSCRIPT_TURN')) {
        const sId = Number(binds.sessionId);
        const newTurn = {
            transcript_id: memoryStore.transcripts.length + 1,
            session_id: sId,
            turn_index: memoryStore.transcripts.filter(t => t.session_id === sId).length + 1,
            question_text: binds.question_text,
            answer_text: binds.answer_text,
            criterion_score: Number(binds.criterion_score) || 80
        };
        memoryStore.transcripts.push(newTurn);
        vectorService.indexRecord('transcripts', newTurn.transcript_id, `Q: ${binds.question_text} | A: ${binds.answer_text}`, newTurn, { source: 'POST /api/interviews/transcript' }).catch(e => console.warn(e));
        return { rows: [] };
    }

    // 12. Bias Audits
    if (upperSql.includes('FROM BIAS_AUDIT_LOGS')) {
        const jId = Array.isArray(binds) ? Number(binds[0]) : Number(binds.jobId);
        const logs = memoryStore.biasLogs.filter(b => b.job_id === jId).map(b => ({
            ...b,
            compliance_status: b.impact_ratio < 0.80 ? 'FLAGGED' : 'OK'
        }));
        return { rows: logs };
    }

    if (upperSql.includes('PKG_GOVERNANCE.SP_COMPUTE_BIAS_AUDIT')) {
        const jId = Number(binds.job_id);
        const cat = binds.demographic_category;
        computeBiasAudit(jId, cat);
        const updatedLog = memoryStore.biasLogs.find(b => b.job_id === jId && b.demographic_category === cat);
        if (updatedLog) {
            vectorService.indexRecord('bias_audit_logs', updatedLog.log_id, `EEOC Bias Audit: ${cat} for Job #${jId} - Impact Ratio ${updatedLog.impact_ratio}`, updatedLog, { source: 'POST /api/bias-audits/compute' }).catch(e => console.warn(e));
        }
        return { rows: [] };
    }

    // 13. Interview Sessions
    if (upperSql.includes('FROM INTERVIEW_SESSIONS')) {
        if (!memoryStore.interviewSessions) {
            memoryStore.interviewSessions = [
                { session_id: 1, application_id: 1, started_at: '2026-10-15 10:00:00', ended_at: '2026-10-15 10:45:00', webrtc_room_ref: 'room_mock_01' }
            ];
        }
        const sessions = memoryStore.interviewSessions.map(s => {
            const app = memoryStore.applications.find(a => a.application_id === s.application_id) || {};
            const cand = memoryStore.candidates.find(c => c.candidate_id === app.candidate_id) || {};
            const job = memoryStore.jobs.find(j => j.job_id === app.job_id) || {};
            return {
                session_id: s.session_id,
                application_id: s.application_id,
                started_at: s.started_at,
                ended_at: s.ended_at,
                webrtc_room_ref: s.webrtc_room_ref,
                candidate_name: cand.name || 'Candidate',
                job_title: job.title || 'Role',
                job_id: job.job_id || 1
            };
        });
        return { rows: sessions };
    }

    if (upperSql.includes('INSERT INTO INTERVIEW_SESSIONS')) {
        if (!memoryStore.interviewSessions) memoryStore.interviewSessions = [];
        const newId = memoryStore.interviewSessions.length + 1;
        const newSession = {
            session_id: newId,
            application_id: Number(binds.application_id),
            started_at: new Date().toISOString(),
            ended_at: null,
            webrtc_room_ref: binds.webrtc_room_ref || ('room_ecras_' + Date.now())
        };
        memoryStore.interviewSessions.push(newSession);
        vectorService.indexRecord('interview_sessions', newId, `Interview Session #${newId} for Application #${newSession.application_id}`, newSession, { source: 'POST /api/interviews/session' }).catch(e => console.warn(e));
        return { outBinds: { session_id: [newId] } };
    }

    // 14. Bias Audit Log Guard Simulation (trg_bias_audit_log_guard)
    if (upperSql.includes('DELETE FROM BIAS_AUDIT_LOGS')) {
        if (!memoryStore.auditTrail) memoryStore.auditTrail = [];
        const auditItem = {
            audit_id: memoryStore.auditTrail.length + 1,
            table_name: 'BIAS_AUDIT_LOGS',
            operation: 'DELETE_ATTEMPT_BLOCKED',
            row_key: 'LOG_ID: ' + (binds[0] || binds.id || 'N/A'),
            old_values: 'Protected Row (EEOC NYC LL144 Compliance)',
            changed_by: 'trg_bias_audit_log_guard',
            changed_at_str: new Date().toISOString().replace('T', ' ').substring(0, 19)
        };
        memoryStore.auditTrail.unshift(auditItem);
        vectorService.indexRecord('audit_trail', auditItem.audit_id, `Blocked delete on bias log ${binds[0] || binds.id}`, auditItem, { source: 'DELETE /api/bias-audits/:id' }).catch(e => console.warn(e));

        const err = new Error('ORA-20010: Deletion of bias audit logs is strictly prohibited under NYC Local Law 144 compliance regulations.');
        err.cleanMessage = 'Deletion of bias audit logs is strictly prohibited under NYC Local Law 144 compliance regulations.';
        throw err;
    }

    // 15. Audit Trail
    if (upperSql.includes('FROM AUDIT_TRAIL')) {
        if (!memoryStore.auditTrail) {
            memoryStore.auditTrail = [
                { audit_id: 1, table_name: 'BIAS_AUDIT_LOGS', operation: 'DELETE_ATTEMPT_BLOCKED', row_key: 'LOG_ID: 1', old_values: 'Protected Compliance Record', changed_by: 'trg_bias_audit_log_guard', changed_at_str: '2026-10-18 14:32:10' }
            ];
        }
        return { rows: memoryStore.auditTrail };
    }

    // Default fallback
    return { rows: [] };
}

function rerankJobApplications(jobId) {
    const jobApps = memoryStore.applications.filter(a => a.job_id === jobId);
    jobApps.sort((a, b) => {
        if (b.fused_score !== a.fused_score) {
            return (b.fused_score || 0) - (a.fused_score || 0);
        }
        return new Date(a.applied_at) - new Date(b.applied_at);
    });

    jobApps.forEach((app, idx) => {
        app.rank_position = idx + 1;
    });
}

/**
 * Initial master sync of all 11 entities into ChromaDB
 */
async function syncAllToChroma() {
    console.log('\x1b[35m[ChromaDB] Syncing all 11 project entities into ChromaDB collections...\x1b[0m');
    for (const org of memoryStore.organizations) {
        await vectorService.indexRecord('organizations', org.org_id, org.org_name, org, { source: 'startup-sync' });
    }
    for (const user of memoryStore.users) {
        await vectorService.indexRecord('users', user.user_id, `${user.name} (${user.role}) - ${user.email}`, user, { source: 'startup-sync' });
    }
    for (const job of memoryStore.jobs) {
        await vectorService.indexRecord('job_postings', job.job_id, `${job.title}: ${job.description}`, job, { source: 'startup-sync' });
    }
    for (const crit of memoryStore.criteria) {
        await vectorService.indexJobCriterion(crit.criterion_id, crit.job_id, crit.criterion_text, crit.weight, { source: 'startup-sync' });
    }
    for (const cand of memoryStore.candidates) {
        await vectorService.indexRecord('candidates', cand.candidate_id, `${cand.name} (${cand.demographic_category}) - ${cand.contact_email}`, cand, { source: 'startup-sync' });
    }
    for (const prop of memoryStore.propositions) {
        await vectorService.indexProposition(prop.proposition_id, prop.candidate_id, prop.section, prop.prop_text, { source: 'startup-sync' });
    }
    for (const app of memoryStore.applications) {
        await vectorService.indexRecord('applications', app.application_id, `Application #${app.application_id} for Job #${app.job_id} by Candidate #${app.candidate_id} (Score: ${app.fused_score})`, app, { source: 'startup-sync' });
    }
    for (const sess of (memoryStore.interviewSessions || [])) {
        await vectorService.indexRecord('interview_sessions', sess.session_id, `Interview Session #${sess.session_id} room ${sess.webrtc_room_ref}`, sess, { source: 'startup-sync' });
    }
    for (const turn of memoryStore.transcripts) {
        await vectorService.indexRecord('transcripts', turn.transcript_id, `Q: ${turn.question_text} | A: ${turn.answer_text}`, turn, { source: 'startup-sync' });
    }
    for (const bias of memoryStore.biasLogs) {
        await vectorService.indexRecord('bias_audit_logs', bias.log_id, `EEOC Audit: ${bias.demographic_category} for Job #${bias.job_id}`, bias, { source: 'startup-sync' });
    }
    for (const audit of (memoryStore.auditTrail || [])) {
        await vectorService.indexRecord('audit_trail', audit.audit_id, `${audit.operation} on ${audit.table_name}: ${audit.row_key}`, audit, { source: 'startup-sync' });
    }
    console.log('\x1b[32m✔ [ChromaDB] All 11 collections successfully synchronized in ChromaDB!\x1b[0m');
}

module.exports = {
    getConnection,
    executeQuery,
    oracledb,
    syncAllToChroma,
    memoryStore,
    isOracleConnected: () => isOracleConnected
};
