/*==============================================================================
  ECRAS DA2 — Combined Database Foundation Script (Oracle SQL)
  Part 3: Business Rule Triggers
==============================================================================*/

-- =============================================================================
-- TRIGGER 1: trg_job_org_match
-- Business rule (Section 6.4): Job_Postings.org_id and the org_id of the 
-- recruiter in Job_Postings.created_by are expected to match.
-- Combines Person 1's trigger with Person 2's explicit null-check and exception handling.
-- =============================================================================
CREATE OR REPLACE TRIGGER trg_job_org_match
BEFORE INSERT OR UPDATE OF org_id, created_by ON Job_Postings
FOR EACH ROW
DECLARE
    v_user_org_id NUMBER;
BEGIN
    IF :NEW.created_by IS NULL THEN
        RAISE_APPLICATION_ERROR(
            -20003,
            'Business rule violated: created_by cannot be null.'
        );
    END IF;

    SELECT org_id
    INTO v_user_org_id
    FROM Users
    WHERE user_id = :NEW.created_by;

    IF v_user_org_id != :NEW.org_id THEN
        RAISE_APPLICATION_ERROR(
            -20001,
            'Business rule violated: Job_Postings.org_id must match the org_id of the creating user (created_by).'
        );
    END IF;

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(
            -20002,
            'Business rule violated: created_by references an invalid user.'
        );
END;
/

-- =============================================================================
-- TRIGGER 2: trg_bias_audit_log_guard
-- DA1 Section 6.4 and FR-10: Bias audit history must be protected and traceable.
-- This trigger logs UPDATE/DELETE attempts on Bias_Audit_Logs to Audit_Trail.
-- DELETE is blocked.
-- =============================================================================
CREATE OR REPLACE TRIGGER trg_bias_audit_log_guard
BEFORE UPDATE OR DELETE ON Bias_Audit_Logs
FOR EACH ROW
DECLARE
    PRAGMA AUTONOMOUS_TRANSACTION;
    v_operation VARCHAR2(10);
    v_old_values VARCHAR2(4000);
BEGIN
    v_operation := CASE
        WHEN DELETING THEN 'DELETE'
        WHEN UPDATING THEN 'UPDATE'
    END;

    v_old_values :=
        'job_id=' || :OLD.job_id ||
        ', category=' || :OLD.demographic_category ||
        ', selection_rate=' || :OLD.selection_rate ||
        ', scoring_rate=' || :OLD.scoring_rate ||
        ', impact_ratio=' || :OLD.impact_ratio;

    INSERT INTO Audit_Trail (
        audit_id, -- Relies on BEFORE INSERT trigger to auto-assign via seq_audit if NULL
        table_name,
        operation,
        row_key,
        old_values,
        changed_by,
        changed_at
    ) VALUES (
        NULL, 
        'Bias_Audit_Logs',
        v_operation,
        TO_CHAR(:OLD.log_id),
        v_old_values,
        USER,
        SYSTIMESTAMP
    );

    COMMIT;

    IF DELETING THEN
        RAISE_APPLICATION_ERROR(
            -20010,
            'Bias_Audit_Logs rows cannot be deleted for audit traceability.'
        );
    END IF;
END;
/
