/*==============================================================================
  ECRAS DA2 — Combined Database Foundation Script (Oracle SQL)
  Part 5: Package Interview
==============================================================================*/

CREATE OR REPLACE PACKAGE pkg_interview AS

    FUNCTION fn_compute_interview_score(
        p_session_id NUMBER
    ) RETURN NUMBER;

    PROCEDURE sp_insert_transcript_turn(
        p_session_id NUMBER,
        p_question_text VARCHAR2,
        p_answer_text VARCHAR2,
        p_criterion_score NUMBER
    );

END pkg_interview;
/

CREATE OR REPLACE PACKAGE BODY pkg_interview AS

    ------------------------------------------------------------------------
    -- Computes average criterion_score for a session using a cursor loop.
    ------------------------------------------------------------------------
    FUNCTION fn_compute_interview_score(
        p_session_id NUMBER
    ) RETURN NUMBER IS
        v_total NUMBER := 0;
        v_count NUMBER := 0;

        CURSOR c_turns IS
            SELECT criterion_score
            FROM Transcripts
            WHERE session_id = p_session_id;
    BEGIN
        FOR r_turn IN c_turns LOOP
            IF r_turn.criterion_score IS NOT NULL THEN
                v_total := v_total + r_turn.criterion_score;
                v_count := v_count + 1;
            END IF;
        END LOOP;

        IF v_count = 0 THEN
            RETURN 0;
        END IF;

        RETURN ROUND(v_total / v_count, 2);
    END fn_compute_interview_score;

    ------------------------------------------------------------------------
    -- Inserts one transcript turn and prints the updated derived score.
    --
    -- The interview average is computed on read because DA1 does not define
    -- an average score column in Interview_Sessions. This avoids redundancy
    -- and update anomalies.
    ------------------------------------------------------------------------
    PROCEDURE sp_insert_transcript_turn(
        p_session_id NUMBER,
        p_question_text VARCHAR2,
        p_answer_text VARCHAR2,
        p_criterion_score NUMBER
    ) IS
        v_session_count NUMBER;
        v_turn_index NUMBER;
        v_current_score NUMBER;
    BEGIN
        SELECT COUNT(*)
        INTO v_session_count
        FROM Interview_Sessions
        WHERE session_id = p_session_id;

        IF v_session_count = 0 THEN
            RAISE_APPLICATION_ERROR(
                -20030,
                'Interview session does not exist.'
            );
        END IF;

        SELECT NVL(MAX(turn_index), 0) + 1
        INTO v_turn_index
        FROM Transcripts
        WHERE session_id = p_session_id;

        INSERT INTO Transcripts (
            transcript_id, -- PK is auto-assigned via trigger when NULL
            session_id,
            turn_index,
            question_text,
            answer_text,
            criterion_score
        ) VALUES (
            NULL, 
            p_session_id,
            v_turn_index,
            p_question_text,
            p_answer_text,
            p_criterion_score
        );

        v_current_score := fn_compute_interview_score(p_session_id);

        DBMS_OUTPUT.PUT_LINE(
            'Transcript turn ' || v_turn_index ||
            ' inserted for session_id = ' || p_session_id
        );

        DBMS_OUTPUT.PUT_LINE(
            'Current computed interview score = ' || v_current_score
        );

    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE BETWEEN -20999 AND -20000 THEN
                RAISE;
            END IF;

            RAISE_APPLICATION_ERROR(
                -20031,
                'sp_insert_transcript_turn failed: ' || SQLERRM
            );
    END sp_insert_transcript_turn;

END pkg_interview;
/
