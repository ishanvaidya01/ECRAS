/*==============================================================================
  ECRAS DA2 — Combined Database Foundation Script (Oracle SQL)
  Part 6: Package Governance
==============================================================================*/

CREATE OR REPLACE PACKAGE pkg_governance AS

    PROCEDURE sp_compute_bias_audit(
        p_job_id NUMBER,
        p_demographic_category VARCHAR2
    );

END pkg_governance;
/

CREATE OR REPLACE PACKAGE BODY pkg_governance AS

    ------------------------------------------------------------------------
    -- Computes selection_rate, scoring_rate and impact_ratio.
    --
    -- selection_rate:
    --   selected applications in group / total applications in group
    --
    -- selected application:
    --   application has an Interview_Sessions row
    --
    -- scoring_rate:
    --   average fused_score normalized to [0,1]
    --
    -- impact_ratio:
    --   group selection_rate / maximum selection_rate across groups
    ------------------------------------------------------------------------
    PROCEDURE sp_compute_bias_audit(
        p_job_id NUMBER,
        p_demographic_category VARCHAR2
    ) IS
        v_job_count NUMBER;
        v_total_apps NUMBER;
        v_selected_apps NUMBER;
        v_avg_fused NUMBER;

        v_selection_rate NUMBER;
        v_scoring_rate NUMBER;
        v_max_selection_rate NUMBER;
        v_impact_ratio NUMBER;
    BEGIN
        IF p_job_id IS NULL THEN
            RAISE_APPLICATION_ERROR(
                -20040,
                'job_id is required.'
            );
        END IF;

        IF p_demographic_category IS NULL THEN
            RAISE_APPLICATION_ERROR(
                -20041,
                'demographic_category is required.'
            );
        END IF;

        SELECT COUNT(*)
        INTO v_job_count
        FROM Job_Postings
        WHERE job_id = p_job_id;

        IF v_job_count = 0 THEN
            RAISE_APPLICATION_ERROR(
                -20042,
                'Job posting does not exist.'
            );
        END IF;

        SELECT
            COUNT(a.application_id),
            COUNT(DISTINCT CASE
                WHEN s.session_id IS NOT NULL THEN a.application_id
            END),
            AVG(a.fused_score)
        INTO
            v_total_apps,
            v_selected_apps,
            v_avg_fused
        FROM Applications a
        JOIN Candidates c
            ON c.candidate_id = a.candidate_id
        LEFT JOIN Interview_Sessions s
            ON s.application_id = a.application_id
        WHERE a.job_id = p_job_id
          AND c.demographic_category = p_demographic_category;

        IF v_total_apps = 0 THEN
            v_selection_rate := 0;
        ELSE
            v_selection_rate := ROUND(
                GREATEST(0, LEAST(1, v_selected_apps / v_total_apps)),
                3
            );
        END IF;

        IF v_avg_fused IS NULL THEN
            v_scoring_rate := 0;
        ELSIF v_avg_fused <= 1 THEN
            v_scoring_rate := ROUND(
                GREATEST(0, LEAST(1, v_avg_fused)),
                3
            );
        ELSE
            v_scoring_rate := ROUND(
                GREATEST(0, LEAST(1, v_avg_fused / 100)),
                3
            );
        END IF;

        SELECT NVL(MAX(sel_rate), 0)
        INTO v_max_selection_rate
        FROM (
            SELECT
                CASE
                    WHEN COUNT(a.application_id) > 0 THEN
                        COUNT(DISTINCT CASE
                            WHEN s.session_id IS NOT NULL THEN a.application_id
                        END) / COUNT(a.application_id)
                    ELSE 0
                END AS sel_rate
            FROM Applications a
            JOIN Candidates c
                ON c.candidate_id = a.candidate_id
            LEFT JOIN Interview_Sessions s
                ON s.application_id = a.application_id
            WHERE a.job_id = p_job_id
            GROUP BY c.demographic_category
        );

        IF v_max_selection_rate = 0 THEN
            v_impact_ratio := 1;
        ELSE
            v_impact_ratio := ROUND(
                GREATEST(0, LEAST(1, v_selection_rate / v_max_selection_rate)),
                3
            );
        END IF;

        MERGE INTO Bias_Audit_Logs b
        USING (
            SELECT
                p_job_id AS job_id,
                p_demographic_category AS demographic_category
            FROM dual
        ) src
        ON (
            b.job_id = src.job_id
            AND b.demographic_category = src.demographic_category
        )
        WHEN MATCHED THEN
            UPDATE SET
                b.selection_rate = v_selection_rate,
                b.scoring_rate = v_scoring_rate,
                b.impact_ratio = v_impact_ratio
        WHEN NOT MATCHED THEN
            INSERT (
                log_id, -- PK is auto-assigned via trigger when NULL
                job_id,
                demographic_category,
                selection_rate,
                scoring_rate,
                impact_ratio
            )
            VALUES (
                NULL, 
                src.job_id,
                src.demographic_category,
                v_selection_rate,
                v_scoring_rate,
                v_impact_ratio
            );

        DBMS_OUTPUT.PUT_LINE(
            'Bias audit saved for job_id = ' || p_job_id ||
            ', category = ' || p_demographic_category ||
            ', selection_rate = ' || v_selection_rate ||
            ', scoring_rate = ' || v_scoring_rate ||
            ', impact_ratio = ' || v_impact_ratio
        );

    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE BETWEEN -20999 AND -20000 THEN
                RAISE;
            END IF;

            RAISE_APPLICATION_ERROR(
                -20043,
                'sp_compute_bias_audit failed: ' || SQLERRM
            );
    END sp_compute_bias_audit;

END pkg_governance;
/
