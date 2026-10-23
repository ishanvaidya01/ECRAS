# ECRAS Integration Notes

This document highlights the specific architectural and schema reconciliations made to combine Person 1 and Person 2's work into a cohesive, functional system for the DA2 submission.

## 1. Schema Reconciliation

### The `"RANK"` Keyword Issue
**Problem:** Person 1's DA1 report specified a column named `rank` in the `Applications` table. However, `RANK` is a reserved analytical function in Oracle SQL. Person 2's PL/SQL code attempted to update `"RANK"`, which required exact casing and quotes.
**Resolution:** The column was explicitly renamed to `rank_position` across the DDL, PL/SQL packages, and the frontend views. This completely eliminates Oracle parsing ambiguities.

### Primary Key Sequence Generation
**Problem:** Person 2's original PL/SQL relied on directly calling `sequence_name.NEXTVAL` in `INSERT` statements. However, if a user manually inserted a row without using the package, the sequence could drift or constraints could fail.
**Resolution:** Implemented `BEFORE INSERT` triggers on all tables. If the primary key is `NULL` during an `INSERT`, the trigger automatically fetches the next sequence value. The PL/SQL packages now insert `NULL` for primary keys, effectively decoupling the business logic from sequence management while guaranteeing uniqueness.

### Demographic Data for Bias Audits
**Problem:** The DA1 report isolated demographic data strictly to the `Bias_Audit_Logs` table, meaning there was no way to trace a candidate back to a demographic category to compute the bias metrics dynamically.
**Resolution:** As a necessary compromise for functional demonstration, a `demographic_category` column was added directly to the `Candidates` table. This allows the governance package (`pkg_governance.sp_compute_bias_audit`) to dynamically join `Applications`, `Candidates`, and `Interview_Sessions` to compute selection rates accurately.

### Normalization of Enums
**Problem:** Person 2 used lowercase strings (e.g., `'open'`, `'draft'`) while Person 1's DDL constraints enforced strict uppercase values (`'OPEN'`, `'DRAFT'`).
**Resolution:** Hardcoded constraints to the uppercase format from Person 1's schema. The Express backend defaults to `'OPEN'` in uppercase during insertions to ensure compliance.

## 2. Business Rule Enforcement via Triggers

Two specific database triggers were implemented to enforce compliance:
1. `trg_job_org_match`: Ensures that the user creating a job posting actually belongs to the organization the job posting is for.
2. `trg_bias_audit_log_guard`: Enforces the FR-10 compliance requirement by explicitly blocking `DELETE` operations on `Bias_Audit_Logs`. Any `UPDATE` attempts are transparently logged to the `Audit_Trail` using an Autonomous Transaction.

## 3. Web Application Architecture

### Backend (Node.js/Express)
- Utilizes `oracledb` library for Oracle connectivity.
- Provides a clean REST API translating Oracle's `ORA-20xxx` custom application errors into human-readable `400 Bad Request` HTTP responses.
- Implements `OUT` binds in `oracledb` to immediately return the generated Primary Keys from the DB triggers back to the frontend.

### Frontend (React/Vite/Tailwind)
- Modern glassmorphism UI implementing all required views.
- **Application Ranking View:** Connects to the `Application_Report_VW` and `Applications` table to list candidates, supporting dynamic re-ranking.
- **Interview View:** Loads session turns and displays the AI's dynamically computed average criterion score.
- **Bias Audit View:** Visualizes the `impact_ratio` metrics, clearly flagging categories that fall below the 80% (four-fifths rule) threshold.
