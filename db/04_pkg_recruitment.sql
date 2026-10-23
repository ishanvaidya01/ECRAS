/*==============================================================================
  ECRAS DA2 — Combined Database Foundation Script (Oracle SQL)
  Part 4: Package Recruitment
==============================================================================*/

CREATE OR REPLACE PACKAGE pkg_recruitment AS

    FUNCTION fn_compute_fused_score(
        p_lexical_score NUMBER,
        p_semantic_score NUMBER
    ) RETURN NUMBER;

    PROCEDURE sp_insert_application(
        p_candidate_id NUMBER,
        p_job_id NUMBER,
        p_lexical_score NUMBER,
        p_semantic_score NUMBER
    );

    PROCEDURE sp_rerank_applications(
        p_job_id NUMBER
    );

END pkg_recruitment;
/

CREATE OR REPLACE PACKAGE BODY pkg_recruitment AS

    ------------------------------------------------------------------------
    -- Placeholder for the real BM25 + dense + RRF pipeline from DA1 3.1.
    ------------------------------------------------------------------------
    FUNCTION fn_compute_fused_score(
        p_lexical_score NUMBER,
        p_semantic_score NUMBER
    ) RETURN NUMBER IS
    BEGIN
        RETURN ROUND(
            0.5 * NVL(p_lexical_score, 0) +
            0.5 * NVL(p_semantic_score, 0),
            2
        );
    END fn_compute_fused_score;

    ------------------------------------------------------------------------
    -- Inserts an application and assigns an initial fused score.
    ------------------------------------------------------------------------
    PROCEDURE sp_insert_application(
        p_candidate_id NUMBER,
        p_job_id NUMBER,
        p_lexical_score NUMBER,
        p_semantic_score NUMBER
    ) IS
        v_candidate_count NUMBER;
        v_job_count NUMBER;
        v_fused_score NUMBER;
    BEGIN
        IF p_candidate_id IS NULL OR p_job_id IS NULL THEN
            RAISE_APPLICATION_ERROR(
                -20020,
                'candidate_id and job_id are required.'
            );
        END IF;

        SELECT COUNT(*)
        INTO v_candidate_count
        FROM Candidates
        WHERE candidate_id = p_candidate_id;

        IF v_candidate_count = 0 THEN
            RAISE_APPLICATION_ERROR(
                -20021,
                'Candidate does not exist.'
            );
        END IF;

        SELECT COUNT(*)
        INTO v_job_count
        FROM Job_Postings
        WHERE job_id = p_job_id;

        IF v_job_count = 0 THEN
            RAISE_APPLICATION_ERROR(
                -20022,
                'Job posting does not exist.'
            );
        END IF;

        v_fused_score := fn_compute_fused_score(
            p_lexical_score,
            p_semantic_score
        );

        -- Check if application already exists (UPSERT support for score updates)
        DECLARE
            v_existing_app NUMBER;
        BEGIN
            SELECT COUNT(*) INTO v_existing_app
            FROM Applications
            WHERE candidate_id = p_candidate_id AND job_id = p_job_id;

            IF v_existing_app > 0 THEN
                UPDATE Applications
                SET fused_score = v_fused_score,
                    applied_at = SYSTIMESTAMP
                WHERE candidate_id = p_candidate_id AND job_id = p_job_id;

                DBMS_OUTPUT.PUT_LINE(
                    'Application updated with new fused_score = ' || v_fused_score
                );
                sp_rerank_applications(p_job_id);
                RETURN;
            END IF;
        END;

        INSERT INTO Applications (
            application_id, -- PK is auto-assigned via trigger when NULL
            candidate_id,
            job_id,
            applied_at,
            fused_score,
            rank_position
        ) VALUES (
            NULL, 
            p_candidate_id,
            p_job_id,
            SYSTIMESTAMP,
            v_fused_score,
            NULL
        );

        DBMS_OUTPUT.PUT_LINE(
            'Application inserted with fused_score = ' || v_fused_score
        );

        sp_rerank_applications(p_job_id);

    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE BETWEEN -20999 AND -20000 THEN
                RAISE;
            END IF;

            RAISE_APPLICATION_ERROR(
                -20023,
                'sp_insert_application failed: ' || SQLERRM
            );
    END sp_insert_application;

    ------------------------------------------------------------------------
    -- Recomputes rank for all applications of one job using a cursor loop.
    ------------------------------------------------------------------------
    PROCEDURE sp_rerank_applications(
        p_job_id NUMBER
    ) IS
        v_job_count NUMBER;
        v_rank NUMBER := 1;
        v_updated NUMBER := 0;

        CURSOR c_applications IS
            SELECT application_id
            FROM Applications
            WHERE job_id = p_job_id
            ORDER BY fused_score DESC NULLS LAST, applied_at ASC
            FOR UPDATE;
    BEGIN
        SELECT COUNT(*)
        INTO v_job_count
        FROM Job_Postings
        WHERE job_id = p_job_id;

        IF v_job_count = 0 THEN
            RAISE_APPLICATION_ERROR(
                -20024,
                'Job posting does not exist.'
            );
        END IF;

        FOR r_app IN c_applications LOOP
            UPDATE Applications
            SET rank_position = v_rank
            WHERE CURRENT OF c_applications;

            v_rank := v_rank + 1;
            v_updated := v_updated + 1;
        END LOOP;

        IF v_updated = 0 THEN
            DBMS_OUTPUT.PUT_LINE(
                'No applications found for job_id = ' || p_job_id
            );
        ELSE
            DBMS_OUTPUT.PUT_LINE(
                'Reranked ' || v_updated || ' applications for job_id = ' || p_job_id
            );
        END IF;

    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE BETWEEN -20999 AND -20000 THEN
                RAISE;
            END IF;

            RAISE_APPLICATION_ERROR(
                -20025,
                'sp_rerank_applications failed: ' || SQLERRM
            );
    END sp_rerank_applications;

END pkg_recruitment;
/
