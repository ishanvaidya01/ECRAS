<div align="center">

# ⚖️ ECRAS: Ethical Candidate Ranking & Recruitment Audit System
### *An Enterprise Dual-Store Architecture Combining Oracle Relational DBMS & ChromaDB Vector Search*

[![Oracle XE](https://img.shields.io/badge/Oracle_Database-21c_%2F_XE-F80000?style=for-the-badge&logo=oracle&logoColor=white)](https://www.oracle.com/database/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-HNSW_Vector_Store-FF6F00?style=for-the-badge)](https://www.trychroma.com/)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-Backend_API-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![React 18](https://img.shields.io/badge/React-18.x_%2B_Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Transformers](https://img.shields.io/badge/%F0%9F%A4%97_Transformers-all--MiniLM--L6--v2-yellow?style=for-the-badge)](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
[![License](https://img.shields.io/badge/License-Academic_Research-blue?style=for-the-badge)](#-license--academic-integrity)

<p align="center">
  <b>A production-grade recruitment intelligence and compliance platform engineered to eliminate hiring bias, automate weighted rubric scoring, and enforce transparent algorithmic governance using BCNF relational modeling and high-dimensional semantic search.</b>
</p>

[Key Features](#-key-features) • [System Architecture](#-system-architecture) • [Database Architecture](#-database-architecture-oracle-xe) • [Vector AI Engine](#-vector-ai-engine-chromadb) • [Installation & Setup](#-installation--quick-start) • [REST API Reference](#-rest-api-reference) • [Documentation Index](#-documentation-index)

---

</div>

## 📖 Executive Summary

Modern recruitment systems suffer from two distinct problems:
1. **Keyword Overfitting & Bias:** Traditional ATS (Applicant Tracking Systems) rely on simple lexical matching that penalizes qualified candidates who don't reuse specific buzzwords, while masking demographic disparities.
2. **Black-box AI:** Modern generative hiring tools lack auditability, violating equal employment opportunity standards such as the **EEOC 4/5ths Rule** (Uniform Guidelines on Employee Selection Procedures).

**ECRAS** solves both challenges by marrying the **ACID transactional integrity of Oracle Relational DBMS** with the **semantic contextual power of ChromaDB Vector Search**:
- **Semantic + Lexical Fusion:** Candidate resume propositions are semantically matched against recruiter rubric criteria in real time.
- **Autonomous Audit Safeguards:** All bias metrics and rubric revisions are committed using isolated Oracle autonomous transactions that cannot be tampered with or rolled back by user errors.
- **Explainable Decisions:** Transparent ranking breakdowns showing exactly how each score was computed.

---

## 🏗️ System Architecture

ECRAS implements a **Three-Tier Dual-Store Architecture**:

```
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                         PRESENTATION TIER (CLIENT)                          │
 │  React 18 SPA • Vite • TailwindCSS • Lucide Icons • Responsive Glassmorphism │
 └──────────────────────────────────────┬──────────────────────────────────────┘
                                        │ HTTP / JSON REST
                                        ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                         APPLICATION & AI TIER                               │
 │  Node.js + Express REST API                                                 │
 │  ├── Oracle Database Connector (`oracledb`)                                 │
 │  ├── Vector AI Pipeline (`@xenova/transformers` - all-MiniLM-L6-v2)         │
 │  └── ChromaDB Client (`chromadb` HNSW Client with Embedded Cache Fallback)  │
 └──────────────────────┬───────────────────────────────┬──────────────────────┘
                        │                               │
        Relational Operations (ACID)            Vector Operations (ANN Search)
                        ▼                               ▼
 ┌──────────────────────────────────────┐   ┌──────────────────────────────────┐
 │         DATA TIER: ORACLE XE         │   │      DATA TIER: CHROMADB         │
 │  • 11 BCNF Normalized Tables         │   │  • Dense 384-d Cosine Vectors    │
 │  • 3 PL/SQL Packages                 │   │  • HNSW Graph Indexing           │
 │  • 13 Database Triggers              │   │  • Propositions & Criteria Space │
 │  • Autonomous Audit Log Guard        │   │  • Metadata Filtering by Job ID  │
 └──────────────────────────────────────┘   └──────────────────────────────────┘
```

### Project Structure

```text
ECRAS/
├── backend/
│   ├── db.js                   # Oracle connector + resilient fallback
│   ├── vectorService.js        # ChromaDB + ONNX embedding pipeline
│   ├── vector_store_data.json  # Embedded vector cache
│   ├── server.js               # Express REST API
│   └── package.json
├── chroma_data/                # ChromaDB persistence (HNSW collections)
├── db/                         # Oracle DDL, seed data, PL/SQL packages
├── docs/                       # Report, vector extension notes, demo notes
├── frontend/                   # React + Vite + Tailwind dashboard (includes /vector-db inspector)
├── start_all.bat               # ChromaDB + backend + frontend launcher
├── start_chroma.bat
├── start_backend.bat
└── start_frontend.bat
```

---

## 🌟 Key Features

| Capability | Technical Implementation | Benefit |
| :--- | :--- | :--- |
| **Dynamic Rubric Builder** | Strict constraint validation ensuring rubric criteria sum to 100%, with automated proportional rebalancing (`PUT /api/rubrics/rebalance/:jobId`). | Prevents mathematical drift in evaluation criteria. |
| **AI Vector Match Preview** | Sub-millisecond Cosine Similarity calculation between resume propositions and rubric criteria before application submission. | Gives instant transparency into candidate alignment. |
| **Bi-Engine Score Fusion** | Fuses normalized Lexical Score (keyword overlap) and Semantic Vector Score (conceptual match): $F = 0.50 \cdot L + 0.50 \cdot S$. | Fair, multi-dimensional assessment resisting keyword stuffing. |
| **Automated Tie-Breaking Reranker** | PL/SQL package procedure using explicit `CURSOR FOR UPDATE` and `NOWAIT` locking for deterministic ranking. | Eliminates manual sorting errors under high concurrency. |
| **Structured AI Interview Engine** | Multi-turn structured interview scoring aggregated across interview question rubrics via cursor loops. | Standardized evaluation without human interviewer drift. |
| **EEOC 4/5ths Rule Bias Engine** | PL/SQL governance package computing selection rates across demographic groups ($\text{Disparity Ratio} = \frac{SR_{\text{group}}}{SR_{\text{max}}}$). | Automatically flags hiring discrimination ($\text{Ratio} < 0.80$). |
| **Immutable Audit Trails** | Oracle `PRAGMA AUTONOMOUS_TRANSACTION` trigger logging every bias calculation and high-risk action in a separate commit scope. | Legally defensible, tamper-proof compliance logging. |
| **Live ChromaDB Inspector** | React page at `/vector-db` streaming real `INSERT` / `UPDATE` / `DELETE` / `QUERY` / `SYNC` / `REBALANCE` / `FUSION` events, with per-record SQLite rows, queue BLOBs, HNSW files and a PCA semantic map. | Makes vector storage observable and defensible instead of a black box. |

---

## 🗄️ Database Architecture (Oracle XE)

### 1. Relational Schema Structure (11 Tables in BCNF)
The database enforces referential integrity through foreign key constraints with `ON DELETE CASCADE`:
1. `Organizations`: Tenant organizations and corporate entities.
2. `Users`: System users, recruiters, and governance officers.
3. `Candidates`: Candidate master profiles, contact records, and demographic categories.
4. `Job_Postings`: Published job requisitions linked to organizations.
5. `Rubric_Criteria`: Evaluation rubrics per job with strictly balanced percentage weights.
6. `Propositions`: Candidate resume assertions categorized by domain sections (Skills, Experience, Education).
7. `Applications`: Candidate submissions storing lexical, semantic, and fused scores with rank positions.
8. `Interview_Sessions`: Scheduled and completed AI-assisted interview evaluations.
9. `Interview_Transcripts`: Individual Q&A turns with per-turn criterion scores.
10. `Bias_Audit_Logs`: Historical adverse impact records storing selection rates and EEOC violation flags.
11. `Audit_Trail`: Autonomous system audit logs capturing DML events, actors, and state snapshots.

### 2. PL/SQL Stored Packages & Routines

| Package / Routine | Type | Location | Purpose |
| :--- | :---: | :--- | :--- |
| **`pkg_recruitment.fn_compute_fused_score`** | Function | `db/04_pkg_recruitment.sql` | Computes weighted fusion score ($0.5 \times \text{Lexical} + 0.5 \times \text{Semantic}$). |
| **`pkg_recruitment.sp_insert_application`** | Procedure | `db/04_pkg_recruitment.sql` | Atomic UPSERT for candidate applications; triggers automatic reranking. |
| **`pkg_recruitment.sp_rerank_applications`** | Procedure | `db/04_pkg_recruitment.sql` | Uses `CURSOR c_applications FOR UPDATE` to rank candidates by fused score with tie-breakers. |
| **`pkg_interview.fn_compute_interview_score`** | Function | `db/05_pkg_interview.sql` | Uses `CURSOR c_turns` to iterate across transcript turns and calculate average interview performance. |
| **`pkg_interview.sp_insert_transcript_turn`** | Procedure | `db/05_pkg_interview.sql` | Inserts Q&A turns and automatically updates parent interview session status. |
| **`pkg_governance.sp_compute_bias_audit`** | Procedure | `db/06_pkg_governance.sql` | Evaluates EEOC 4/5ths Rule across demographic groups using `MERGE INTO Bias_Audit_Logs`. |

### 3. Database Triggers

| Trigger Name | Timing / Event | Target Table | Purpose |
| :--- | :--- | :--- | :--- |
| **`trg_bi_*` (11 Triggers)** | `BEFORE INSERT` | All 11 Tables | Enforces automated synthetic Primary Key generation using dedicated Oracle Sequences. |
| **`trg_job_org_match`** | `BEFORE INSERT OR UPDATE` | `Job_Postings` | Enforces relational integrity ensuring the creating user belongs to the job's organization. |
| **`trg_bias_audit_log_guard`** | `AFTER INSERT OR UPDATE` | `Bias_Audit_Logs` | Uses **`PRAGMA AUTONOMOUS_TRANSACTION`** to record immutable audit trail entries in a separate transaction scope. |

---

## ⚡ Vector AI Engine (ChromaDB)

ECRAS pairs Oracle XE with an enterprise vector store:

```
Candidate Resume ──► Chunking ──► 384-d Embedding (all-MiniLM-L6-v2) ──► ChromaDB [candidate_propositions]
                                                                                │ Cosine Similarity
Job Posting Rubric ─► Criteria ─► 384-d Embedding (all-MiniLM-L6-v2) ──► ChromaDB [job_criteria]
                                                                                │
                                                                   Semantic Score (0–100)
```

1. **Local Model Execution:** Embeddings are produced using ONNX runtime locally (`Xenova/all-MiniLM-L6-v2`), guaranteeing zero external API dependency and 100% data privacy.
2. **HNSW Cosine Space:** Collections are configured with `metadata: { "hnsw:space": "cosine" }` for sub-linear query times.
3. **Relational Metadata Linkage:** Relational keys (`candidate_id`, `job_id`) are embedded directly in vector metadata, allowing instant joined queries.
4. **Resilient Local Fallback:** If the standalone ChromaDB daemon is not running, `vectorService.js` seamlessly transitions to an embedded vector cache (`vector_store_data.json`) without throwing runtime errors.
5. **Live Observability:** The **Vector DB Inspector** (`http://localhost:5173/vector-db`) streams every real vector operation, lets you inspect a record's SQLite metadata/queue rows, shows the HNSW segment files on disk, and projects all 384-d embeddings into an interactive 2D semantic map. Adding, editing or deleting propositions and rubric criteria in the normal UI automatically updates ChromaDB and appears in the stream.

---

## 🚀 Installation & Quick Start

### Prerequisites
- **Oracle Database XE** (21c or 19c) listening on `localhost:1521`
- **Node.js** (v18 or later) & `npm`
- **Python 3.9+** (for standalone ChromaDB server: `pip install chromadb`)

---

### Step 1: Database Setup
Open SQL*Plus or Oracle SQL Developer and execute the master run script:
```sql
CONNECT system/your_password@localhost:1521/XEPDB1;
@db/00_master_run.sql;
```
*This executes tables DDL, seed data, triggers, and all 3 PL/SQL packages in the proper dependency order.*

---

### Step 2: One-Click Startup (Recommended)
From the project root, run the master batch script:
```cmd
start_all.bat
```
This automatically launches all three services in separate, dedicated terminal windows:
- 🟢 **ChromaDB Server:** `http://localhost:8000`
- 🟢 **Express Backend API:** `http://localhost:3000`
- 🟢 **React Frontend UI:** `http://localhost:5173`
- 🔍 **Vector DB Inspector:** `http://localhost:5173/vector-db`

---

### Step 3: Manual Startup (Alternative)

#### 1. ChromaDB Server
```cmd
chroma run --path ./chroma_data --port 8000
```

#### 2. Backend API
```cmd
cd backend
npm install
npm start
```

#### 3. Frontend Web Interface
```cmd
cd frontend
npm install
npm run dev
```

Visit **`http://localhost:5173`** in your browser. Open **Vector DB Inspector** in the sidebar (or go directly to `http://localhost:5173/vector-db`) to watch real ChromaDB operations and storage.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :---: | :--- | :--- |
| `GET` | `/api/jobs` | Retrieve all job requisitions with organization and recruiter metadata. |
| `GET` | `/api/rubrics/job/:jobId` | Retrieve weighted evaluation criteria for a specified job. |
| `POST` | `/api/rubrics` | Create a new rubric criterion for a job posting and index it in ChromaDB. |
| `PUT` | `/api/rubrics/:id` | Update a criterion, re-embed it and overwrite the same Chroma ID. |
| `PUT` | `/api/rubrics/rebalance/:jobId` | Automatically rebalance criteria weights proportionally to equal 100% and re-index them. |
| `DELETE` | `/api/rubrics/:id` | Remove a criterion, update the rubric and delete its Chroma vector. |
| `GET` | `/api/candidates` | List all registered candidate profiles and demographic markers. |
| `GET` | `/api/propositions/candidate/:id` | Fetch structured resume assertions (Skills, Experience, Education). |
| `POST` | `/api/propositions` | Add a proposition and immediately embed/index it in ChromaDB. |
| `PUT` | `/api/propositions/:id` | Update a proposition and re-embed the same Chroma ID. |
| `DELETE` | `/api/propositions/:id` | Delete a proposition and remove its Chroma vector. |
| `POST` | `/api/vector/match-score` | Compute real-time ChromaDB Cosine Similarity between a candidate and job. |
| `POST` | `/api/vector/sync-from-db` | Bulk-index Oracle relational text into ChromaDB vector collections. |
| `GET` | `/api/vector/status` | Vector DB health check, active engine, and total indexed proposition count. |
| `GET` | `/api/vector/operations-log` | Live `INSERT`/`UPDATE`/`DELETE`/`QUERY` event stream (`?since=<seq>` for deltas). |
| `GET` | `/api/vector/collections-data` | Documents, metadata and vector previews (`?full=true` for full embeddings). |
| `GET` | `/api/vector/2d-projection` | PCA 2D coordinates for the semantic map. |
| `GET` | `/api/vector/storage-internals` | Chroma SQLite tables, segment UUIDs and HNSW files on disk. |
| `GET` | `/api/vector/record/:collection/:id` | One record plus raw SQLite embedding, metadata, FTS and queue rows. |
| `DELETE` | `/api/vector/record/:collection/:id` | Remove only a vector record (demo/cleanup; relational row unchanged). |
| `POST` | `/api/vector/test-insert` | Real upsert for the Write Demo; reuse an ID to generate an `UPDATE`. |
| `POST` | `/api/applications` | Submit application via `pkg_recruitment.sp_insert_application` with score fusion. |
| `GET` | `/api/applications/job/:jobId` | Fetch ranked candidate leaderboard (`?rerank=true` triggers reranking). |
| `POST` | `/api/interviews/turns` | Record an interview Q&A turn via `pkg_interview.sp_insert_transcript_turn`. |
| `POST` | `/api/governance/bias-audit/:jobId` | Trigger EEOC 4/5ths Rule audit via `pkg_governance.sp_compute_bias_audit`. |
| `GET` | `/api/governance/bias-audit/logs/:jobId` | Retrieve audit history showing selection rates and adverse impact flags. |
| `GET` | `/api/governance/audit-trail` | View immutable system logs written by `trg_bias_audit_log_guard`. |

---

## 📚 Documentation Index

All technical guides and viva materials are organized in this repository:

| Document | Purpose |
| :--- | :--- |
| 📄 [`ECRAS_DBMS_Report_Final_with_Implementation.pdf`](docs/ECRAS_DBMS_Report_Final_with_Implementation.pdf) | Complete academic project report with ER diagram, normalization proofs, and system benchmarks. |
| 📘 [`FACULTY_PRESENTATION_GUIDE.md`](FACULTY_PRESENTATION_GUIDE.md) | Comprehensive faculty defense preparation: architecture, technical Q&A, and PL/SQL explanations. |
| 🎬 [`FACULTY_DEMO_SCRIPT_BLUEPRINT.md`](FACULTY_DEMO_SCRIPT_BLUEPRINT.md) | Step-by-step viva script covering every screen, button click, and expected output. |
| 💡 [`EASY_PROJECT_EXPLANATION_GUIDE.md`](EASY_PROJECT_EXPLANATION_GUIDE.md) | Beginner-friendly explanation of all concepts, features, and database triggers. |
| 🔬 [`README_VECTOR_EXTENSION.md`](README_VECTOR_EXTENSION.md) | Deep-dive documentation on the ChromaDB Vector Extension and HNSW similarity. |

---

## 🛡️ License & Academic Integrity

This project is developed as part of the **Database Management Systems (DBMS) Course** (Academic Year 2026–2027).  
Licensed under the **MIT Academic License**.

Designed and maintained by **Ishan Vaidya** ([@ishanvaidya01](https://github.com/ishanvaidya01)).
