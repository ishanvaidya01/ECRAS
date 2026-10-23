/*==============================================================================
  ECRAS DA2 — Combined Database Foundation Script (Oracle SQL)
  Part 7: Queries, Views, and Demo Blocks
==============================================================================*/

-- =============================================================================
-- SECTION A: REPORTING / AGGREGATE QUERIES (From Person 1)
-- =============================================================================

-- A1. Top-3 ranked applicants per job (a recruiter's shortlist view).
SELECT job_title, candidate_name, fused_score, rank_position
FROM (
    SELECT
        jp.title        AS job_title,
        c.name          AS candidate_name,
        a.fused_score,
        a.rank_position,
        ROW_NUMBER() OVER (PARTITION BY a.job_id ORDER BY a.rank_position) AS rn
    FROM Applications a
    JOIN Candidates   c  ON c.candidate_id = a.candidate_id
    JOIN Job_Postings jp ON jp.job_id = a.job_id
)
WHERE rn <= 3
ORDER BY job_title, rank_position;

-- A2. Average interview (criterion) score per candidate, across all their
--     interview transcript turns, highest average first.
SELECT
    c.candidate_id,
    c.name,
    COUNT(t.transcript_id)               AS turns_scored,
    ROUND(AVG(t.criterion_score), 2)     AS avg_criterion_score
FROM Candidates c
JOIN Applications        a  ON a.candidate_id = c.candidate_id
JOIN Interview_Sessions  s  ON s.application_id = a.application_id
JOIN Transcripts         t  ON t.session_id = s.session_id
GROUP BY c.candidate_id, c.name
ORDER BY avg_criterion_score DESC;

-- A3. Count of applications per job, broken down by job status.
SELECT
    jp.status,
    jp.title,
    COUNT(a.application_id) AS application_count
FROM Job_Postings jp
LEFT JOIN Applications a ON a.job_id = jp.job_id
GROUP BY jp.status, jp.title
ORDER BY jp.status, application_count DESC;

-- =============================================================================
-- SECTION B: FLATTENED APPLICATION_REPORT VIEW (From Person 1)
-- =============================================================================
CREATE OR REPLACE VIEW Application_Report_VW AS
SELECT
    a.application_id      AS applicationid,
    a.applied_at           AS appliedat,
    a.fused_score           AS fusedscore,
    a.rank_position          AS rank,
    c.candidate_id          AS candidateid,
    c.name                  AS candidatename,
    c.contact_email         AS candidateemail,
    c.phone                 AS candidatephone,
    jp.job_id               AS jobid,
    jp.title                AS jobtitle,
    jp.status               AS jobstatus,
    o.org_id                AS orgid,
    o.org_name              AS orgname,
    o.org_domain            AS orgdomain,
    u.user_id               AS createdbyuserid,
    u.name                  AS recruitername,
    u.email                 AS recruiteremail,
    u.role                  AS recruiterrole,
    s.session_id            AS sessionid,
    s.started_at            AS startedat,
    s.ended_at              AS endedat,
    t.transcript_id         AS transcriptid,
    t.turn_index            AS turnindex,
    t.question_text         AS questiontext,
    t.answer_text           AS answertext,
    t.criterion_score       AS criterionscore
FROM Applications a
JOIN Candidates    c  ON c.candidate_id = a.candidate_id
JOIN Job_Postings  jp ON jp.job_id = a.job_id
JOIN Organizations o  ON o.org_id = jp.org_id
JOIN Users         u  ON u.user_id = jp.created_by
LEFT JOIN Interview_Sessions s ON s.application_id = a.application_id
LEFT JOIN Transcripts        t ON t.session_id = s.session_id;

-- =============================================================================
-- SECTION C: DEMO BLOCKS (From Person 2 adapted for Person 1 schema)
-- =============================================================================

PROMPT ==============================
PROMPT Demo 1: Valid job posting insert
PROMPT ==============================

-- Demo 1: Valid job posting insert test (Demonstrated without polluting seed database)
-- INSERT INTO Job_Postings (job_id, title, description, status, org_id, created_by)
-- VALUES (NULL, 'Demo Valid Job', 'This insert should succeed because user 1 belongs to org 1', 'OPEN', 1, 1);
-- ROLLBACK;

PROMPT ==============================
PROMPT Demo 2: Invalid org job insert
PROMPT ==============================

BEGIN
    INSERT INTO Job_Postings (
        job_id,
        title,
        description,
        status,
        org_id,
        created_by
    ) VALUES (
        NULL,
        'Demo Invalid Job',
        'This insert should fail because user 1 belongs to org 1, not org 2',
        'OPEN',
        2,
        1
    );
EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('Expected trigger error: ' || SQLERRM);
END;
/

PROMPT ==============================
PROMPT Demo 3: Insert application
PROMPT ==============================

BEGIN
    pkg_recruitment.sp_insert_application(
        p_candidate_id => 4,
        p_job_id => 1,
        p_lexical_score => 75,
        p_semantic_score => 88
    );

    COMMIT;
END;
/

PROMPT ==============================
PROMPT Demo 4: Ranked applications
PROMPT ==============================

SELECT
    application_id,
    candidate_id,
    fused_score,
    rank_position
FROM Applications
WHERE job_id = 1
ORDER BY rank_position NULLS LAST;

PROMPT ==============================
PROMPT Demo 5: Insert transcript turn
PROMPT ==============================

BEGIN
    pkg_interview.sp_insert_transcript_turn(
        p_session_id => 1,
        p_question_text => 'Explain exception handling',
        p_answer_text => 'Candidate explained NO_DATA_FOUND and custom errors clearly',
        p_criterion_score => 4.40
    );

    COMMIT;
END;
/

PROMPT ==============================
PROMPT Demo 6: Interview score
PROMPT ==============================

BEGIN
    DBMS_OUTPUT.PUT_LINE(
        'Session 1 computed interview score = ' ||
        pkg_interview.fn_compute_interview_score(1)
    );
END;
/

PROMPT ==============================
PROMPT Demo 7: Bias audit computation
PROMPT ==============================

BEGIN
    pkg_governance.sp_compute_bias_audit(
        p_job_id => 1,
        p_demographic_category => 'Gender - Male'
    );

    pkg_governance.sp_compute_bias_audit(
        p_job_id => 1,
        p_demographic_category => 'Gender - Female'
    );

    COMMIT;
END;
/

SELECT
    job_id,
    demographic_category,
    selection_rate,
    scoring_rate,
    impact_ratio
FROM Bias_Audit_Logs
WHERE job_id = 1
ORDER BY demographic_category;

PROMPT ==============================
PROMPT Demo 8: Bias log delete blocked
PROMPT ==============================

BEGIN
    DELETE FROM Bias_Audit_Logs
    WHERE log_id = 1;
EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('Expected bias log delete error: ' || SQLERRM);
END;
/

PROMPT ==============================
PROMPT Demo 9: Job delete blocked by FK (if child exists) or works if CASCADE
PROMPT Note: In the schema, Bias_Audit_Logs does NOT cascade delete Job_Postings.
PROMPT ==============================

BEGIN
    DELETE FROM Job_Postings
    WHERE job_id = 1;
EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('Expected FK error: ' || SQLERRM);
END;
/

PROMPT ==============================
PROMPT Demo 10: Audit trail evidence
PROMPT ==============================

SELECT
    audit_id,
    table_name,
    operation,
    row_key,
    changed_by,
    changed_at
FROM Audit_Trail
ORDER BY audit_id;

COMMIT;
