# ECRAS Demo Script

Follow this script to demonstrate the full functionality of the ECRAS DA3 ChromaDB integration to your professor.

## Prerequisites

1. Ensure your Oracle Database instance is running (e.g., Oracle XE).
2. Execute the master SQL script to build the schema and seed data:
   ```sql
   @db/00_master_run.sql
   ```
3. Start the standalone ChromaDB server:
   ```bash
   chroma run --path ./chroma_data --port 8000
   ```
4. Set up the backend:
   ```bash
   cd backend
   npm install
   # Update .env with your Oracle credentials
   npm start
   ```
5. Set up the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
6. Open your browser to `http://localhost:5173`.

---

## Step 1: Browse Job Postings

1. Navigate to the **Job Postings** tab.
2. Point out the seed data jobs populated by the SQL scripts.
3. Click **New Job** and create a dummy job. Notice how the dropdowns for Organization and User are populated by the `Organizations` and `Users` tables.

## Step 2: Add a Candidate & Apply

1. Navigate to the **Candidates** tab.
2. Click **Add Candidate** and fill in the details. *Crucially, assign them a Demographic Category (e.g., "Gender - Female").*
3. Once created, click the **Apply to Job** button on their card.
4. Select the newly created job (or an existing one). The semantic score is calculated automatically by ChromaDB using cosine similarity between the candidate's propositions and the job's rubric criteria.
5. Submit. This hits the Node backend, which calls `pkg_recruitment.sp_insert_application()` and fuses the lexical and vector semantic scores.

## Step 3: Application Ranking

1. Navigate to the **Application Ranking** tab.
2. Select the job from the dropdown.
3. Observe how the newly applied candidate is ranked based on the fused score.
4. Explain that clicking **Re-rank Candidates** runs `pkg_recruitment.sp_rerank_applications()`, recalculating positions for all candidates applying to that job.

## Step 4: Interview Transcripts

1. Navigate to the **Interviews** tab.
2. Enter Session ID `1` and click **Load Session**.
3. Point out the conversation turns between the AI and the candidate.
4. Show the **Session Summary** score on the right. Mention this is computed dynamically via `pkg_interview.fn_compute_interview_score()`.
5. Click **Add Turn**, enter a new question, answer, and score.
6. Notice how the average computed score immediately updates.

## Step 5: Compliance and Bias Audit

1. Navigate to the **Bias Audit** tab.
2. Select Job ID `1` from the dropdown.
3. Click **Compute Audit**.
4. The dashboard will display the EEOC 4/5ths Rule monitoring blocks.
5. Highlight how categories with an `impact_ratio < 0.8` are explicitly flagged in red. Mention that this calculation is driven entirely by `pkg_governance.sp_compute_bias_audit` inside the Oracle Database.
6. Explain that the `trg_bias_audit_log_guard` database trigger explicitly blocks `DELETE` operations on this data to ensure strict compliance traceability.
