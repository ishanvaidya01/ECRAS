/*==============================================================================
  ECRAS DA2 — Combined Database Foundation Script (Oracle SQL)
  Part 1: Schema (DDL)
==============================================================================*/

-- =============================================================================
-- 0. CLEANUP (rerunnable script) — drop in reverse dependency order
-- =============================================================================
BEGIN EXECUTE IMMEDIATE 'DROP TABLE Transcripts CASCADE CONSTRAINTS PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE Interview_Sessions CASCADE CONSTRAINTS PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE Applications CASCADE CONSTRAINTS PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE Propositions CASCADE CONSTRAINTS PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE Candidates CASCADE CONSTRAINTS PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE Bias_Audit_Logs CASCADE CONSTRAINTS PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE Rubric_Criteria CASCADE CONSTRAINTS PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE Job_Postings CASCADE CONSTRAINTS PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE Users CASCADE CONSTRAINTS PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE Organizations CASCADE CONSTRAINTS PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE Audit_Trail CASCADE CONSTRAINTS PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

BEGIN EXECUTE IMMEDIATE 'DROP SEQUENCE seq_org'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP SEQUENCE seq_user'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP SEQUENCE seq_job'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP SEQUENCE seq_criterion'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP SEQUENCE seq_log'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP SEQUENCE seq_candidate'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP SEQUENCE seq_proposition'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP SEQUENCE seq_application'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP SEQUENCE seq_session'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP SEQUENCE seq_transcript'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP SEQUENCE seq_audit'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- =============================================================================
-- 1. SEQUENCES  (START WITH 1000)
-- =============================================================================
CREATE SEQUENCE seq_org         START WITH 1000 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_user        START WITH 1000 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_job         START WITH 1000 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_criterion   START WITH 1000 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_log         START WITH 1000 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_candidate   START WITH 1000 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_proposition START WITH 1000 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_application START WITH 1000 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_session     START WITH 1000 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_transcript  START WITH 1000 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_audit       START WITH 1000 INCREMENT BY 1 NOCACHE;

-- =============================================================================
-- 2. TABLE: Organizations
-- =============================================================================
CREATE TABLE Organizations (
    org_id       NUMBER          NOT NULL,
    org_name     VARCHAR2(100)   NOT NULL,
    org_domain   VARCHAR2(100),
    org_address  VARCHAR2(200),
    CONSTRAINT pk_organizations PRIMARY KEY (org_id)
);

CREATE OR REPLACE TRIGGER trg_org_pk
BEFORE INSERT ON Organizations
FOR EACH ROW
WHEN (NEW.org_id IS NULL)
BEGIN
    :NEW.org_id := seq_org.NEXTVAL;
END;
/

-- =============================================================================
-- 3. TABLE: Users
-- =============================================================================
CREATE TABLE Users (
    user_id   NUMBER          NOT NULL,
    name      VARCHAR2(100)   NOT NULL,
    email     VARCHAR2(150)   NOT NULL,
    role      VARCHAR2(20)    NOT NULL,
    org_id    NUMBER          NOT NULL,
    CONSTRAINT pk_users PRIMARY KEY (user_id),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT ck_users_role CHECK (role IN ('ADMIN','RECRUITER','AUDITOR')),
    CONSTRAINT fk_users_org FOREIGN KEY (org_id)
        REFERENCES Organizations (org_id)
);

CREATE OR REPLACE TRIGGER trg_user_pk
BEFORE INSERT ON Users
FOR EACH ROW
WHEN (NEW.user_id IS NULL)
BEGIN
    :NEW.user_id := seq_user.NEXTVAL;
END;
/

-- =============================================================================
-- 4. TABLE: Job_Postings
-- =============================================================================
CREATE TABLE Job_Postings (
    job_id       NUMBER          NOT NULL,
    title        VARCHAR2(100)   NOT NULL,
    description  VARCHAR2(4000),
    status       VARCHAR2(20)    NOT NULL,
    org_id       NUMBER          NOT NULL,
    created_by   NUMBER          NOT NULL,
    CONSTRAINT pk_job_postings PRIMARY KEY (job_id),
    CONSTRAINT ck_job_status CHECK (status IN ('DRAFT','OPEN','CLOSED','WITHDRAWN')),
    CONSTRAINT fk_job_org FOREIGN KEY (org_id)
        REFERENCES Organizations (org_id),
    CONSTRAINT fk_job_creator FOREIGN KEY (created_by)
        REFERENCES Users (user_id)
);

CREATE OR REPLACE TRIGGER trg_job_pk
BEFORE INSERT ON Job_Postings
FOR EACH ROW
WHEN (NEW.job_id IS NULL)
BEGIN
    :NEW.job_id := seq_job.NEXTVAL;
END;
/

-- =============================================================================
-- 5. TABLE: Rubric_Criteria
-- =============================================================================
CREATE TABLE Rubric_Criteria (
    criterion_id    NUMBER          NOT NULL,
    job_id          NUMBER          NOT NULL,
    criterion_text  VARCHAR2(4000)  NOT NULL,
    weight          NUMBER(4,3),
    CONSTRAINT pk_rubric_criteria PRIMARY KEY (criterion_id),
    CONSTRAINT ck_criteria_weight CHECK (weight BETWEEN 0 AND 1),
    CONSTRAINT fk_criteria_job FOREIGN KEY (job_id)
        REFERENCES Job_Postings (job_id) ON DELETE CASCADE
);

CREATE OR REPLACE TRIGGER trg_criterion_pk
BEFORE INSERT ON Rubric_Criteria
FOR EACH ROW
WHEN (NEW.criterion_id IS NULL)
BEGIN
    :NEW.criterion_id := seq_criterion.NEXTVAL;
END;
/

-- =============================================================================
-- 6. TABLE: Bias_Audit_Logs
-- =============================================================================
CREATE TABLE Bias_Audit_Logs (
    log_id                NUMBER          NOT NULL,
    job_id                NUMBER          NOT NULL,
    demographic_category  VARCHAR2(100)   NOT NULL,
    selection_rate        NUMBER(4,3)     NOT NULL,
    scoring_rate          NUMBER(4,3)     NOT NULL,
    impact_ratio          NUMBER(4,3)     NOT NULL,
    CONSTRAINT pk_bias_audit_logs PRIMARY KEY (log_id),
    CONSTRAINT ck_impact_ratio CHECK (impact_ratio BETWEEN 0 AND 1),
    CONSTRAINT ck_selection_rate CHECK (selection_rate BETWEEN 0 AND 1),
    CONSTRAINT ck_scoring_rate CHECK (scoring_rate BETWEEN 0 AND 1),
    CONSTRAINT fk_bias_job FOREIGN KEY (job_id)
        REFERENCES Job_Postings (job_id),
    CONSTRAINT uq_bias_job_category UNIQUE (job_id, demographic_category)
);

CREATE OR REPLACE TRIGGER trg_log_pk
BEFORE INSERT ON Bias_Audit_Logs
FOR EACH ROW
WHEN (NEW.log_id IS NULL)
BEGIN
    :NEW.log_id := seq_log.NEXTVAL;
END;
/

-- =============================================================================
-- 7. TABLE: Audit_Trail (Added from Person 2's implementation)
-- =============================================================================
CREATE TABLE Audit_Trail (
    audit_id    NUMBER          NOT NULL,
    table_name  VARCHAR2(100)   NOT NULL,
    operation   VARCHAR2(10)    NOT NULL,
    row_key     VARCHAR2(100),
    old_values  VARCHAR2(4000),
    changed_by  VARCHAR2(100)   DEFAULT USER NOT NULL,
    changed_at  TIMESTAMP       DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT pk_audit_trail PRIMARY KEY (audit_id)
);

CREATE OR REPLACE TRIGGER trg_audit_pk
BEFORE INSERT ON Audit_Trail
FOR EACH ROW
WHEN (NEW.audit_id IS NULL)
BEGIN
    :NEW.audit_id := seq_audit.NEXTVAL;
END;
/

-- =============================================================================
-- 8. TABLE: Candidates
--    Added demographic_category to support sp_compute_bias_audit.
-- =============================================================================
CREATE TABLE Candidates (
    candidate_id         NUMBER          NOT NULL,
    name                 VARCHAR2(100)   NOT NULL,
    contact_email        VARCHAR2(150)   NOT NULL,
    phone                VARCHAR2(20),
    resume_doc_ref       VARCHAR2(300),
    demographic_category VARCHAR2(100),  -- Added to support bias auditing computation
    CONSTRAINT pk_candidates PRIMARY KEY (candidate_id)
);

CREATE OR REPLACE TRIGGER trg_candidate_pk
BEFORE INSERT ON Candidates
FOR EACH ROW
WHEN (NEW.candidate_id IS NULL)
BEGIN
    :NEW.candidate_id := seq_candidate.NEXTVAL;
END;
/

-- =============================================================================
-- 9. TABLE: Propositions
-- =============================================================================
CREATE TABLE Propositions (
    proposition_id  NUMBER          NOT NULL,
    candidate_id    NUMBER          NOT NULL,
    section         VARCHAR2(100),
    prop_text       VARCHAR2(4000)  NOT NULL,
    embedding_ref   VARCHAR2(300),
    CONSTRAINT pk_propositions PRIMARY KEY (proposition_id),
    CONSTRAINT fk_proposition_candidate FOREIGN KEY (candidate_id)
        REFERENCES Candidates (candidate_id) ON DELETE CASCADE
);

CREATE OR REPLACE TRIGGER trg_proposition_pk
BEFORE INSERT ON Propositions
FOR EACH ROW
WHEN (NEW.proposition_id IS NULL)
BEGIN
    :NEW.proposition_id := seq_proposition.NEXTVAL;
END;
/

-- =============================================================================
-- 10. TABLE: Applications
-- =============================================================================
CREATE TABLE Applications (
    application_id  NUMBER          NOT NULL,
    candidate_id    NUMBER          NOT NULL,
    job_id          NUMBER          NOT NULL,
    applied_at      TIMESTAMP       NOT NULL,
    fused_score     NUMBER(5,2),
    rank_position   NUMBER(5),
    CONSTRAINT pk_applications PRIMARY KEY (application_id),
    CONSTRAINT uq_application_candidate_job UNIQUE (candidate_id, job_id),
    CONSTRAINT fk_application_candidate FOREIGN KEY (candidate_id)
        REFERENCES Candidates (candidate_id) ON DELETE CASCADE,
    CONSTRAINT fk_application_job FOREIGN KEY (job_id)
        REFERENCES Job_Postings (job_id) ON DELETE CASCADE
);

CREATE OR REPLACE TRIGGER trg_application_pk
BEFORE INSERT ON Applications
FOR EACH ROW
WHEN (NEW.application_id IS NULL)
BEGIN
    :NEW.application_id := seq_application.NEXTVAL;
END;
/

-- =============================================================================
-- 11. TABLE: Interview_Sessions
-- =============================================================================
CREATE TABLE Interview_Sessions (
    session_id        NUMBER      NOT NULL,
    application_id    NUMBER      NOT NULL,
    started_at        TIMESTAMP,
    ended_at          TIMESTAMP,
    webrtc_room_ref   VARCHAR2(300),
    CONSTRAINT pk_interview_sessions PRIMARY KEY (session_id),
    CONSTRAINT uq_session_application UNIQUE (application_id),
    CONSTRAINT fk_session_application FOREIGN KEY (application_id)
        REFERENCES Applications (application_id) ON DELETE CASCADE
);

CREATE OR REPLACE TRIGGER trg_session_pk
BEFORE INSERT ON Interview_Sessions
FOR EACH ROW
WHEN (NEW.session_id IS NULL)
BEGIN
    :NEW.session_id := seq_session.NEXTVAL;
END;
/

-- =============================================================================
-- 12. TABLE: Transcripts
-- =============================================================================
CREATE TABLE Transcripts (
    transcript_id     NUMBER          NOT NULL,
    session_id        NUMBER          NOT NULL,
    turn_index        NUMBER(5)       NOT NULL,
    question_text     VARCHAR2(4000)  NOT NULL,
    answer_text       VARCHAR2(4000),
    criterion_score   NUMBER(5,2),
    CONSTRAINT pk_transcripts PRIMARY KEY (transcript_id),
    CONSTRAINT uq_transcript_session_turn UNIQUE (session_id, turn_index),
    CONSTRAINT fk_transcript_session FOREIGN KEY (session_id)
        REFERENCES Interview_Sessions (session_id) ON DELETE CASCADE
);

CREATE OR REPLACE TRIGGER trg_transcript_pk
BEFORE INSERT ON Transcripts
FOR EACH ROW
WHEN (NEW.transcript_id IS NULL)
BEGIN
    :NEW.transcript_id := seq_transcript.NEXTVAL;
END;
/

-- =============================================================================
-- 13. Helpful indexes on FK columns
-- =============================================================================
CREATE INDEX ix_users_org             ON Users (org_id);
CREATE INDEX ix_job_org               ON Job_Postings (org_id);
CREATE INDEX ix_job_creator           ON Job_Postings (created_by);
CREATE INDEX ix_criteria_job          ON Rubric_Criteria (job_id);
CREATE INDEX ix_bias_job              ON Bias_Audit_Logs (job_id);
CREATE INDEX ix_proposition_candidate ON Propositions (candidate_id);
CREATE INDEX ix_application_candidate ON Applications (candidate_id);
CREATE INDEX ix_application_job       ON Applications (job_id);
CREATE INDEX ix_session_application   ON Interview_Sessions (application_id);
CREATE INDEX ix_transcript_session    ON Transcripts (session_id);
