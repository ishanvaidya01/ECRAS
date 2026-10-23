# ECRAS DA3 Extension: Modern Vector Database Implementation
**Enhanced Candidate Recruitment and Automated System (ECRAS)**  
**DBMS Mini-Project (DA3 Modern Database Extension) — SCOPE, VIT Chennai**  
**Team Members:** Ishan Vaidya (25BCE1197), M Yuvaraj (25BCE5317), Hemchand Mouli (25BCE1258)  
**Faculty Guide:** Dr. Sharmila Devi S  
**Selected Modern Database:** Vector Database (ChromaDB + Local Transformers ONNX)

---

## 1. Executive Summary: What Has Been Built in DA3?

In DA1 and DA2, ECRAS established a 10-relation BCNF normalized Oracle schema, PL/SQL packages (`pkg_recruitment`, `pkg_interview`, `pkg_governance`), triggers with autonomous audit logging, an Express backend, and a React dashboard. However, as noted in DA2 Section 8.9:
- The `Propositions` table contained only a placeholder `embedding_ref VARCHAR2(300)`.
- When submitting an application, `semantic_score` was manually keyed in or simulated.

**DA3 Objective Fulfilled:**  
We extended the project with an authentic **Vector Database (ChromaDB)** and an embedded ONNX transformer embedding pipeline (`Xenova/all-MiniLM-L6-v2`). The system now performs **real dense semantic similarity search** between candidate resume propositions and job rubric criteria, generating genuine cosine similarity scores that feed directly into Oracle's Reciprocal Rank Fusion (`pkg_recruitment.sp_insert_application`).

---

## 2. Relational Database vs. Vector Database (Academic Justification)

| Evaluation Dimension | Traditional Relational DB (Oracle / Postgres / MySQL) | Modern Vector DB (ChromaDB / Qdrant / Milvus) |
| :--- | :--- | :--- |
| **Data Representation** | 1D scalar types (`NUMBER`, `VARCHAR2`, `DATE`, `JSON`) stored in rows/columns. | High-dimensional dense vectors ($\mathbb{R}^{384}$) capturing contextual semantics. |
| **Indexing Mechanism** | B-Tree, B+Tree, Hash Indexes optimized for exact equality (`=`) or 1D range (`<, >`). | HNSW (Hierarchical Navigable Small World) graphs and IVF-PQ. |
| **Query Paradigm** | Exact Boolean logic (`WHERE salary > 50000 AND title = 'Engineer'`) or substrings (`LIKE '%Java%'`). | K-Nearest Neighbors ($k$-NN) / Approximate Nearest Neighbors (ANN) by distance. |
| **Distance Metric** | None native for high dimensions; requires slow custom distance loops. | Native SIMD/AVX-512 hardware-accelerated Cosine Similarity, Dot Product, and Euclidean Distance. |
| **Query Complexity** | $O(N \cdot D)$ linear full table scan across all $N$ rows and $D$ dimensions. | $O(\log N)$ logarithmic time via multi-layer hierarchical graph traversal. |
| **Curse of Dimensionality** | Spatial indexes (like R-Trees) break down once dimensions exceed 10–15, falling back to full table scan. | Specially engineered to sustain sub-linear latency in spaces with hundreds/thousands of dimensions. |
| **Filtering** | Superb for ACID transactions, role constraints, and foreign keys. | Hybrid filtering: filters vector embeddings by relational metadata payloads (e.g., `job_id == 1`). |

### Key Academic Takeaway
> *"Relational databases excel at deterministic structured business rules, foreign key constraints, and immutable ACID audit logging (which Oracle handles in ECRAS for compliance and bias auditing). However, relational engines are fundamentally unsuited for computing semantic distances across high-dimensional vector spaces. A dedicated Vector Database provides the HNSW graph indexing required to perform semantic resume matching at $O(\log N)$ scale."*

---

## 3. Polyglot Architecture: Relational + Vector Synergy

```
               +--------------------------------------------------+
               |             React Frontend Dashboard             |
               |  - Post Jobs  - Candidate Pool  - Vector Match   |
               +--------------------------------------------------+
                                        |
                                   HTTP Requests
                                        v
               +--------------------------------------------------+
               |               Node.js / Express API              |
               |  - Feature Extractor (@xenova/transformers)      |
               |  - Dense Embeddings (384-d all-MiniLM-L6-v2)     |
               |  - Polyglot Hybrid Orchestrator                  |
               +--------------------------------------------------+
                        /                                \
           Vector Queries & Payloads           Relational SQL & PL/SQL
                      v                                    v
     +--------------------------------+   +---------------------------------+
     |       VECTOR DATABASE          |   |       ORACLE RELATIONAL DB      |
     |          (ChromaDB)            |   |      (Enterprise Foundation)    |
     |                                |   |                                 |
     | Collections:                   |   | Tables:                         |
     | 1. candidate_propositions      |   | - Organizations, Users          |
     |    - vector: 384-d dense       |   | - Job_Postings, Rubric_Criteria |
     |    - payload: candidate_id,    |   | - Candidates                    |
     |      section, text             |   | - Applications (fused_score)    |
     |                                |   | - Interview_Sessions            |
     | 2. job_criteria                |   | - Transcripts                   |
     |    - vector: 384-d dense       |   | - Bias_Audit_Logs (EEOC)        |
     |    - payload: job_id, weight,  |   | - Audit_Trail (Triggers)        |
     |      text                      |   |                                 |
     +--------------------------------+   +---------------------------------+
```

---

## 4. How the Vector Extension Works Step-by-Step

1. **Ingestion & Embedding Generation:**
   - Candidate resume propositions (e.g. *"Built dense semantic retrieval system using vector embeddings with ChromaDB"*) and job rubric criteria (e.g. *"Practical experience implementing vector databases for semantic retrieval"*) are passed to the local ONNX `all-MiniLM-L6-v2` transformer model.
   - Generates a 384-dimensional normalized dense vector $\vec{v} \in \mathbb{R}^{384}$.
2. **HNSW Vector Indexing:**
   - Vectors are upserted into ChromaDB collections `candidate_propositions` and `job_criteria` with `{ "hnsw:space": "cosine" }`.
3. **Turn-by-Turn Dense Retrieval:**
   - For every rubric criterion of a job, ChromaDB retrieves candidate propositions and calculates cosine similarity:
     $$\text{Cosine Similarity}(\vec{A}, \vec{B}) = \frac{\vec{A} \cdot \vec{B}}{\|\vec{A}\| \|\vec{B}\|}$$
   - Identifies the highest matching candidate proposition and weighted similarity score.
4. **Relational Fusion:**
   - The resulting semantic score is sent to Oracle PL/SQL package `pkg_recruitment.sp_insert_application`, combining with lexical score ($50\%$ each) to determine candidate ranking.
5. **Operational Observability:**
   - Every embedding, upsert, update, delete, rebalance and cosine query is recorded in the vector service event log and broadcast to the React **Vector DB Inspector** (`/vector-db`). The inspector also reads `chroma_data/chroma.sqlite3` and the HNSW segment files directly, so the same screen shows both the logical operation and its physical persistence.

---

## 5. Live ChromaDB Inspector and Physical Storage

### 5.1 Why this layer exists

The relational side of ECRAS has always been observable through SQL*Plus, Oracle SQL Developer, triggers and `Audit_Trail`. The vector side was initially a black box: the UI called an embedding endpoint and received a score. DA3 closes that gap with a **live inspector** that answers three questions:

1. **What operation did the web app just perform?** — a real `INSERT`, `UPDATE`, `DELETE`, `QUERY`, `SYNC`, `REBALANCE` or `FUSION` event, with its source REST endpoint.
2. **What did ChromaDB store?** — the ID, document, metadata, 384-d vector preview/norm, and the exact SQLite rows that back the record.
3. **Where is it stored on disk?** — `chroma.sqlite3` for metadata/queue data and a per-segment HNSW directory for the graph/vector payload.

### 5.2 Inspector tabs

| Tab | Evidence shown |
| :--- | :--- |
| **Live Operations** | A streaming terminal of operations. `UPDATE` events include a before/after document, proving that Chroma overwrote the existing ID rather than creating a duplicate. |
| **Collections** | `collection.get()` output: Chroma IDs (`prop_*`, `crit_*`), documents, metadata, vector previews and norms. |
| **Storage Internals** | Collection/segment UUIDs, row counts for every Chroma SQLite table, HNSW files (`data_level0.bin`, `header.bin`, `length.bin`, `link_lists.bin`) and a numbered write path. |
| **Semantic Map** | PCA projection of all embeddings. This is a human-readable visualization only; the actual comparison happens in 384 dimensions. |
| **Write Demo** | A real upsert form and cosine-query form so the evaluator can generate `INSERT` → `UPDATE` → `DELETE` and `QUERY` events live. |

### 5.3 ChromaDB write path

For a proposition edit, the physical sequence is:

1. React sends `PUT /api/propositions/:id`.
2. Express updates the Oracle `Propositions` row.
3. `all-MiniLM-L6-v2` re-encodes the new text into a normalized 384-float vector.
4. `collection.upsert()` writes the same Chroma ID (`prop_<id>`) with the new document, metadata and embedding.
5. Chroma records the write in `embeddings_queue` (operation code, `FLOAT32` BLOB of `384 × 4 = 1,536` bytes, metadata JSON), updates `embeddings` / `embedding_metadata` / `embedding_fulltext_search` in `chroma.sqlite3`, and updates the HNSW segment files.
6. The inspector's **Inspect** modal reads steps 5 directly with Node's read-only `node:sqlite`; the **Storage Internals** tab lists the HNSW files on disk.

## 6. Viva / Evaluation Defense Cheat Sheet

### Q1: Why didn't you use MongoDB?
**Answer:** MongoDB is a Document store designed for semi-structured JSON storage, which is already standard laboratory curriculum. Our core engineering requirement is solving the semantic disconnect in recruitment through dense high-dimensional semantic search. That requires dedicated vector graph indexing (HNSW), which Vector Databases natively provide.

### Q2: What is the computational difference between Oracle and a Vector DB for vector search?
**Answer:** To find nearest neighbors without an HNSW index, Oracle must execute a full table scan computing vector distance across all rows ($O(N \cdot D)$). Vector databases construct multi-layer hierarchical graphs allowing search in $O(\log N)$ logarithmic time.

### Q3: What is the role of Oracle vs. the Vector DB in the final architecture?
**Answer:** Oracle remains the enterprise source of truth for ACID transactions, role constraints, recruitment workflows, and immutable bias audit logs. The Vector DB acts as the specialized cognitive retrieval engine for high-dimensional proposition and rubric embeddings.

### Q4: Does the embedding model require internet or an OpenAI API key?
**Answer:** No. We run `@xenova/transformers` with the ONNX-quantized `all-MiniLM-L6-v2` model locally inside the Node.js runtime. It computes 384-dimensional dense vectors with zero API fees, zero token quotas, and complete data privacy.

### Q5: How do you know the UI operations are real and not a mock?
**Answer:** Every event is emitted inside the same backend function that calls ChromaDB. The event carries the exact endpoint (`POST /api/rubrics`, `PUT /api/propositions/:id`, etc.), the Chroma ID, the embedding duration and a vector preview. The Collections tab then reads the record back through the Chroma client, and the Inspect modal reads the corresponding `embeddings`, `embedding_metadata` and `embeddings_queue` rows from `chroma.sqlite3`. A mock could not produce those persisted rows or the HNSW segment file updates.

### Q6: What is the difference between the SQLite rows and the HNSW files?
**Answer:** SQLite is Chroma's metadata/document/queue store: it answers "what is this record, what metadata does it have, and what write was queued?" The HNSW segment directory is the vector index: it stores the graph structure and the float payload used for approximate nearest-neighbor search. The inspector shows both, which is why it can explain both the business record and the search structure.

### Q7: Why does the inspector show a 12-dimension vector preview instead of all 384 values?
**Answer:** A 384-number array is unreadable in a UI. The preview preserves the shape and sign of the embedding, while the record modal and API expose the full vector (`?full=true` / `data.vector`). The norm and dimensions confirm that the full 384-d normalized embedding is present.

### Q8: What does an UPDATE look like inside ChromaDB?
**Answer:** The Chroma ID stays the same (`prop_<id>` or `crit_<id>`). Chroma overwrites the document and metadata for that ID, and writes a new queue row with the re-embedded `FLOAT32` vector. The inspector shows the operation as `UPDATE` with a before/after document and the new vector preview; the Collections tab still contains exactly one record with that ID, not a duplicate.

