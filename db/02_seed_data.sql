/*==============================================================================
  ECRAS DA2 — Combined Database Foundation Script (Oracle SQL)
  Part 2: Seed Data
==============================================================================*/

-- =============================================================================
-- Organizations (3)
-- =============================================================================
INSERT INTO Organizations (org_id, org_name, org_domain, org_address) VALUES
  (1, 'Nimbus Analytics', 'nimbusanalytics.com', '12 MG Road, Bengaluru');
INSERT INTO Organizations (org_id, org_name, org_domain, org_address) VALUES
  (2, 'Solstice Health Systems', 'solsticehealth.com', '400 Park Ave, New York');
INSERT INTO Organizations (org_id, org_name, org_domain, org_address) VALUES
  (3, 'Vertex Manufacturing Co', 'vertexmfg.com', '77 Industrial Rd, Chennai');

-- =============================================================================
-- Users (10)
-- =============================================================================
INSERT INTO Users (user_id, name, email, role, org_id) VALUES (1, 'Ananya Rao', 'ananya.rao@nimbusanalytics.com', 'ADMIN', 1);
INSERT INTO Users (user_id, name, email, role, org_id) VALUES (2, 'Karthik Iyer', 'karthik.iyer@nimbusanalytics.com', 'RECRUITER', 1);
INSERT INTO Users (user_id, name, email, role, org_id) VALUES (3, 'Divya Menon', 'divya.menon@nimbusanalytics.com', 'RECRUITER', 1);
INSERT INTO Users (user_id, name, email, role, org_id) VALUES (4, 'Ravi Prakash', 'ravi.prakash@nimbusanalytics.com', 'AUDITOR', 1);
INSERT INTO Users (user_id, name, email, role, org_id) VALUES (5, 'Sara Cohen', 'sara.cohen@solsticehealth.com', 'ADMIN', 2);
INSERT INTO Users (user_id, name, email, role, org_id) VALUES (6, 'James Walker', 'james.walker@solsticehealth.com', 'RECRUITER', 2);
INSERT INTO Users (user_id, name, email, role, org_id) VALUES (7, 'Priya Nair', 'priya.nair@solsticehealth.com', 'AUDITOR', 2);
INSERT INTO Users (user_id, name, email, role, org_id) VALUES (8, 'Mohammed Farouk', 'mohammed.farouk@vertexmfg.com', 'ADMIN', 3);
INSERT INTO Users (user_id, name, email, role, org_id) VALUES (9, 'Lena Fischer', 'lena.fischer@vertexmfg.com', 'RECRUITER', 3);
INSERT INTO Users (user_id, name, email, role, org_id) VALUES (10, 'Oscar Diaz', 'oscar.diaz@vertexmfg.com', 'AUDITOR', 3);

-- =============================================================================
-- Job_Postings (5)
-- =============================================================================
INSERT INTO Job_Postings (job_id, title, description, status, org_id, created_by) VALUES
  (1, 'Senior Data Engineer', 'Build and maintain data pipelines feeding the retrieval and scoring services.', 'OPEN', 1, 2);
INSERT INTO Job_Postings (job_id, title, description, status, org_id, created_by) VALUES
  (2, 'Machine Learning Scientist', 'Design and evaluate ML models for churn prediction and ranking.', 'OPEN', 1, 3);
INSERT INTO Job_Postings (job_id, title, description, status, org_id, created_by) VALUES
  (3, 'Clinical Data Analyst', 'Analyze patient-outcome datasets and build reporting dashboards.', 'OPEN', 2, 6);
INSERT INTO Job_Postings (job_id, title, description, status, org_id, created_by) VALUES
  (4, 'Nurse Recruiter Ops Lead', 'Coordinate the nurse hiring pipeline end to end.', 'CLOSED', 2, 6);
INSERT INTO Job_Postings (job_id, title, description, status, org_id, created_by) VALUES
  (5, 'Production Supervisor', 'Oversee manufacturing floor operations and shift scheduling.', 'DRAFT', 3, 9);

-- =============================================================================
-- Rubric_Criteria (10)
-- =============================================================================
INSERT INTO Rubric_Criteria (criterion_id, job_id, criterion_text, weight) VALUES (1, 1, 'Demonstrates strong SQL and data modeling skills', 0.400);
INSERT INTO Rubric_Criteria (criterion_id, job_id, criterion_text, weight) VALUES (2, 1, 'Experience with distributed data pipelines (Spark/Airflow)', 0.600);
INSERT INTO Rubric_Criteria (criterion_id, job_id, criterion_text, weight) VALUES (3, 2, 'Understanding of ML model evaluation metrics', 0.500);
INSERT INTO Rubric_Criteria (criterion_id, job_id, criterion_text, weight) VALUES (4, 2, 'Practical experience deploying models to production', 0.500);
INSERT INTO Rubric_Criteria (criterion_id, job_id, criterion_text, weight) VALUES (5, 3, 'Ability to interpret clinical/healthcare datasets', 0.500);
INSERT INTO Rubric_Criteria (criterion_id, job_id, criterion_text, weight) VALUES (6, 3, 'Familiarity with HIPAA-compliant data handling', 0.500);
INSERT INTO Rubric_Criteria (criterion_id, job_id, criterion_text, weight) VALUES (7, 4, 'Experience managing nurse staffing pipelines', 0.500);
INSERT INTO Rubric_Criteria (criterion_id, job_id, criterion_text, weight) VALUES (8, 4, 'Stakeholder communication skills', 0.500);
INSERT INTO Rubric_Criteria (criterion_id, job_id, criterion_text, weight) VALUES (9, 5, 'Lean manufacturing process knowledge', 0.500);
INSERT INTO Rubric_Criteria (criterion_id, job_id, criterion_text, weight) VALUES (10, 5, 'Team leadership on the shop floor', 0.500);

-- =============================================================================
-- Candidates (16) - Modified to include demographic_category
-- =============================================================================
INSERT INTO Candidates (candidate_id, name, contact_email, phone, resume_doc_ref, demographic_category) VALUES (1, 'Nikhil Sharma', 'nikhil.sharma@mail.com', '+91-9820011122', 'resumes/nikhil_sharma.pdf', 'Gender - Male');
INSERT INTO Candidates (candidate_id, name, contact_email, phone, resume_doc_ref, demographic_category) VALUES (2, 'Emma Thompson', 'emma.thompson@mail.com', '+1-206-555-0142', 'resumes/emma_thompson.pdf', 'Gender - Female');
INSERT INTO Candidates (candidate_id, name, contact_email, phone, resume_doc_ref, demographic_category) VALUES (3, 'Wei Zhang', 'wei.zhang@mail.com', '+1-408-555-0199', 'resumes/wei_zhang.pdf', 'Age 40+');
INSERT INTO Candidates (candidate_id, name, contact_email, phone, resume_doc_ref, demographic_category) VALUES (4, 'Fatima Al-Sayed', 'fatima.alsayed@mail.com', '+971-50-1234567', 'resumes/fatima_alsayed.pdf', 'Gender - Female');
INSERT INTO Candidates (candidate_id, name, contact_email, phone, resume_doc_ref, demographic_category) VALUES (5, 'Carlos Mendes', 'carlos.mendes@mail.com', '+55-11-98888-1234', 'resumes/carlos_mendes.pdf', 'Age 40+');
INSERT INTO Candidates (candidate_id, name, contact_email, phone, resume_doc_ref, demographic_category) VALUES (6, 'Grace Kim', 'grace.kim@mail.com', '+82-10-2222-3333', 'resumes/grace_kim.pdf', 'Gender - Female');
INSERT INTO Candidates (candidate_id, name, contact_email, phone, resume_doc_ref, demographic_category) VALUES (7, 'Arjun Patel', 'arjun.patel@mail.com', '+91-9876543210', 'resumes/arjun_patel.pdf', 'Race - Underrepresented Minority');
INSERT INTO Candidates (candidate_id, name, contact_email, phone, resume_doc_ref, demographic_category) VALUES (8, 'Olivia Brown', 'olivia.brown@mail.com', '+44-20-7946-0018', 'resumes/olivia_brown.pdf', 'Race - Majority Group');
INSERT INTO Candidates (candidate_id, name, contact_email, phone, resume_doc_ref, demographic_category) VALUES (9, 'Yusuf Demir', 'yusuf.demir@mail.com', '+90-532-111-2233', 'resumes/yusuf_demir.pdf', 'Gender - Male');
INSERT INTO Candidates (candidate_id, name, contact_email, phone, resume_doc_ref, demographic_category) VALUES (10, 'Meera Krishnan', 'meera.krishnan@mail.com', '+91-9445566778', 'resumes/meera_krishnan.pdf', 'Gender - Female');
INSERT INTO Candidates (candidate_id, name, contact_email, phone, resume_doc_ref, demographic_category) VALUES (11, 'Liam O''Connor', 'liam.oconnor@mail.com', '+353-87-1234567', 'resumes/liam_oconnor.pdf', 'Race - Majority Group');
INSERT INTO Candidates (candidate_id, name, contact_email, phone, resume_doc_ref, demographic_category) VALUES (12, 'Aisha Bello', 'aisha.bello@mail.com', '+234-803-1112233', 'resumes/aisha_bello.pdf', 'Race - Underrepresented Minority');
INSERT INTO Candidates (candidate_id, name, contact_email, phone, resume_doc_ref, demographic_category) VALUES (13, 'Daniel Kim', 'daniel.kim@mail.com', '+1-312-555-0110', 'resumes/daniel_kim.pdf', 'Gender - Male');
INSERT INTO Candidates (candidate_id, name, contact_email, phone, resume_doc_ref, demographic_category) VALUES (14, 'Sofia Rossi', 'sofia.rossi@mail.com', '+39-333-1234567', 'resumes/sofia_rossi.pdf', 'Gender - Female');
INSERT INTO Candidates (candidate_id, name, contact_email, phone, resume_doc_ref, demographic_category) VALUES (15, 'Tariq Hassan', 'tariq.hassan@mail.com', '+20-100-1234567', 'resumes/tariq_hassan.pdf', 'Gender - Male');
INSERT INTO Candidates (candidate_id, name, contact_email, phone, resume_doc_ref, demographic_category) VALUES (16, 'Hannah Mueller', 'hannah.mueller@mail.com', '+49-151-12345678', 'resumes/hannah_mueller.pdf', 'Gender - Female');

-- =============================================================================
-- Bias_Audit_Logs (6)
-- =============================================================================
INSERT INTO Bias_Audit_Logs (log_id, job_id, demographic_category, selection_rate, scoring_rate, impact_ratio) VALUES (1, 1, 'Gender - Female', 0.320, 0.410, 0.780);
INSERT INTO Bias_Audit_Logs (log_id, job_id, demographic_category, selection_rate, scoring_rate, impact_ratio) VALUES (2, 1, 'Gender - Male', 0.410, 0.430, 1.000);
INSERT INTO Bias_Audit_Logs (log_id, job_id, demographic_category, selection_rate, scoring_rate, impact_ratio) VALUES (3, 2, 'Age 40+', 0.180, 0.250, 0.620);
INSERT INTO Bias_Audit_Logs (log_id, job_id, demographic_category, selection_rate, scoring_rate, impact_ratio) VALUES (4, 2, 'Age Under 40', 0.290, 0.300, 1.000);
INSERT INTO Bias_Audit_Logs (log_id, job_id, demographic_category, selection_rate, scoring_rate, impact_ratio) VALUES (5, 3, 'Race - Underrepresented Minority', 0.220, 0.280, 0.710);
INSERT INTO Bias_Audit_Logs (log_id, job_id, demographic_category, selection_rate, scoring_rate, impact_ratio) VALUES (6, 3, 'Race - Majority Group', 0.310, 0.320, 1.000);

-- =============================================================================
-- Propositions (32)
-- =============================================================================
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (1, 1, 'Experience', 'Led a cross-functional team building a Spark-based ETL pipeline processing 5TB/day.', 'emb_vec_0001');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (2, 1, 'Skills', 'Proficient in SQL, Airflow, Spark, and dimensional data modeling.', 'emb_vec_0002');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (3, 2, 'Experience', 'Managed a multidisciplinary group delivering a customer analytics platform.', 'emb_vec_0003');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (4, 2, 'Education', 'M.S. in Computer Science, focus on distributed systems.', 'emb_vec_0004');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (5, 3, 'Skills', 'Deep experience with PyTorch, model evaluation metrics, and MLOps pipelines.', 'emb_vec_0005');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (6, 3, 'Experience', 'Deployed churn-prediction models to production serving 2M requests/day.', 'emb_vec_0006');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (7, 4, 'Experience', 'Built HIPAA-compliant data pipelines for a hospital analytics team.', 'emb_vec_0007');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (8, 4, 'Skills', 'SQL, clinical terminology (ICD-10), Python, Tableau.', 'emb_vec_0008');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (9, 5, 'Experience', 'Tuned gradient-boosted models for fraud detection at a fintech startup.', 'emb_vec_0009');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (10, 5, 'Skills', 'Python, scikit-learn, feature engineering, A/B testing.', 'emb_vec_0010');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (11, 6, 'Experience', 'Built a real-time recommendation engine using collaborative filtering.', 'emb_vec_0011');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (12, 6, 'Skills', 'TensorFlow, model deployment, Docker, Kubernetes.', 'emb_vec_0012');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (13, 7, 'Experience', 'Researched evaluation metrics for ranking models at a search startup.', 'emb_vec_0013');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (14, 7, 'Education', 'Ph.D. candidate in Machine Learning, focus on ranking and retrieval.', 'emb_vec_0014');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (15, 8, 'Experience', 'Analyzed patient-outcome datasets for a regional hospital network.', 'emb_vec_0015');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (16, 8, 'Skills', 'R, SQL, biostatistics, dashboarding with Power BI.', 'emb_vec_0016');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (17, 9, 'Experience', 'Led HIPAA compliance audits for clinical data warehouses.', 'emb_vec_0017');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (18, 9, 'Skills', 'HIPAA, SQL, data governance, Python.', 'emb_vec_0018');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (19, 10, 'Experience', 'Coordinated nurse staffing across 6 hospital sites.', 'emb_vec_0019');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (20, 10, 'Skills', 'Workforce planning, stakeholder communication, Excel modeling.', 'emb_vec_0020');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (21, 11, 'Experience', 'Managed recruitment pipelines for critical-care nursing roles.', 'emb_vec_0021');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (22, 11, 'Skills', 'ATS administration, interviewing, healthcare compliance basics.', 'emb_vec_0022');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (23, 12, 'Experience', 'Supervised a 40-person production line in an automotive plant.', 'emb_vec_0023');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (24, 12, 'Skills', 'Lean manufacturing, Six Sigma, shift scheduling.', 'emb_vec_0024');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (25, 13, 'Experience', 'Led kaizen events reducing line downtime by 18%.', 'emb_vec_0025');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (26, 13, 'Skills', 'Team leadership, root-cause analysis, SAP MM.', 'emb_vec_0026');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (27, 14, 'Experience', 'Managed quality control for a packaging line of 25 operators.', 'emb_vec_0027');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (28, 14, 'Skills', '5S, statistical process control, team leadership.', 'emb_vec_0028');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (29, 15, 'Experience', 'Supervised night-shift operations at a textile manufacturing unit.', 'emb_vec_0029');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (30, 15, 'Skills', 'Lean manufacturing, safety compliance, scheduling.', 'emb_vec_0030');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (31, 16, 'Experience', 'Coordinated cross-shift handovers for an electronics assembly line.', 'emb_vec_0031');
INSERT INTO Propositions (proposition_id, candidate_id, section, prop_text, embedding_ref) VALUES (32, 16, 'Skills', 'Team leadership, process documentation, German/English bilingual.', 'emb_vec_0032');

-- =============================================================================
-- Applications (19)
-- =============================================================================
INSERT INTO Applications (application_id, candidate_id, job_id, applied_at, fused_score, rank_position) VALUES (1, 1, 1, TIMESTAMP '2026-08-01 09:00:00', 88.50, 1);
INSERT INTO Applications (application_id, candidate_id, job_id, applied_at, fused_score, rank_position) VALUES (2, 2, 1, TIMESTAMP '2026-08-01 10:15:00', 82.30, 2);
INSERT INTO Applications (application_id, candidate_id, job_id, applied_at, fused_score, rank_position) VALUES (3, 3, 1, TIMESTAMP '2026-08-02 11:00:00', 79.10, 3);
INSERT INTO Applications (application_id, candidate_id, job_id, applied_at, fused_score, rank_position) VALUES (4, 4, 1, TIMESTAMP '2026-08-02 14:30:00', 74.60, 4);
INSERT INTO Applications (application_id, candidate_id, job_id, applied_at, fused_score, rank_position) VALUES (5, 5, 1, TIMESTAMP '2026-08-03 09:45:00', 68.20, 5);
INSERT INTO Applications (application_id, candidate_id, job_id, applied_at, fused_score, rank_position) VALUES (6, 6, 1, TIMESTAMP '2026-08-03 16:00:00', 60.00, 6);
INSERT INTO Applications (application_id, candidate_id, job_id, applied_at, fused_score, rank_position) VALUES (7, 3, 2, TIMESTAMP '2026-08-04 09:00:00', 91.20, 1);
INSERT INTO Applications (application_id, candidate_id, job_id, applied_at, fused_score, rank_position) VALUES (8, 7, 2, TIMESTAMP '2026-08-04 10:00:00', 85.75, 2);
INSERT INTO Applications (application_id, candidate_id, job_id, applied_at, fused_score, rank_position) VALUES (9, 5, 2, TIMESTAMP '2026-08-05 09:30:00', 80.40, 3);
INSERT INTO Applications (application_id, candidate_id, job_id, applied_at, fused_score, rank_position) VALUES (10, 6, 2, TIMESTAMP '2026-08-05 13:00:00', 77.90, 4);
INSERT INTO Applications (application_id, candidate_id, job_id, applied_at, fused_score, rank_position) VALUES (11, 8, 2, TIMESTAMP '2026-08-06 09:00:00', 70.10, 5);
INSERT INTO Applications (application_id, candidate_id, job_id, applied_at, fused_score, rank_position) VALUES (12, 9, 2, TIMESTAMP '2026-08-06 15:00:00', 65.30, 6);
INSERT INTO Applications (application_id, candidate_id, job_id, applied_at, fused_score, rank_position) VALUES (13, 9, 3, TIMESTAMP '2026-08-07 09:00:00', 89.00, 1);
INSERT INTO Applications (application_id, candidate_id, job_id, applied_at, fused_score, rank_position) VALUES (14, 10, 3, TIMESTAMP '2026-08-07 11:00:00', 83.40, 2);
INSERT INTO Applications (application_id, candidate_id, job_id, applied_at, fused_score, rank_position) VALUES (15, 8, 3, TIMESTAMP '2026-08-08 09:00:00', 76.50, 3);
INSERT INTO Applications (application_id, candidate_id, job_id, applied_at, fused_score, rank_position) VALUES (16, 4, 3, TIMESTAMP '2026-08-08 13:30:00', 71.20, 4);
INSERT INTO Applications (application_id, candidate_id, job_id, applied_at, fused_score, rank_position) VALUES (17, 11, 3, TIMESTAMP '2026-08-09 10:00:00', 66.80, 5);
INSERT INTO Applications (application_id, candidate_id, job_id, applied_at, fused_score, rank_position) VALUES (18, 10, 4, TIMESTAMP '2026-07-20 09:00:00', 90.00, 1);
INSERT INTO Applications (application_id, candidate_id, job_id, applied_at, fused_score, rank_position) VALUES (19, 11, 4, TIMESTAMP '2026-07-20 10:30:00', 84.20, 2);

-- =============================================================================
-- Interview_Sessions (8)
-- =============================================================================
INSERT INTO Interview_Sessions (session_id, application_id, started_at, ended_at, webrtc_room_ref) VALUES (1, 1, TIMESTAMP '2026-08-05 10:00:00', TIMESTAMP '2026-08-05 10:35:00', 'room-ne-101');
INSERT INTO Interview_Sessions (session_id, application_id, started_at, ended_at, webrtc_room_ref) VALUES (2, 2, TIMESTAMP '2026-08-05 11:00:00', TIMESTAMP '2026-08-05 11:30:00', 'room-ne-102');
INSERT INTO Interview_Sessions (session_id, application_id, started_at, ended_at, webrtc_room_ref) VALUES (3, 3, TIMESTAMP '2026-08-06 09:00:00', TIMESTAMP '2026-08-06 09:28:00', 'room-ne-103');
INSERT INTO Interview_Sessions (session_id, application_id, started_at, ended_at, webrtc_room_ref) VALUES (4, 7, TIMESTAMP '2026-08-07 10:00:00', TIMESTAMP '2026-08-07 10:40:00', 'room-ml-201');
INSERT INTO Interview_Sessions (session_id, application_id, started_at, ended_at, webrtc_room_ref) VALUES (5, 8, TIMESTAMP '2026-08-07 11:00:00', TIMESTAMP '2026-08-07 11:32:00', 'room-ml-202');
INSERT INTO Interview_Sessions (session_id, application_id, started_at, ended_at, webrtc_room_ref) VALUES (6, 13, TIMESTAMP '2026-08-09 09:00:00', TIMESTAMP '2026-08-09 09:30:00', 'room-cl-301');
INSERT INTO Interview_Sessions (session_id, application_id, started_at, ended_at, webrtc_room_ref) VALUES (7, 14, TIMESTAMP '2026-08-09 10:00:00', TIMESTAMP '2026-08-09 10:33:00', 'room-cl-302');
INSERT INTO Interview_Sessions (session_id, application_id, started_at, ended_at, webrtc_room_ref) VALUES (8, 18, TIMESTAMP '2026-07-22 09:00:00', TIMESTAMP '2026-07-22 09:25:00', 'room-nr-401');

-- =============================================================================
-- Transcripts (24)
-- =============================================================================
INSERT INTO Transcripts (transcript_id, session_id, turn_index, question_text, answer_text, criterion_score) VALUES (1, 1, 1, 'Describe a data pipeline you built end to end.', 'Built a Spark/Airflow pipeline processing 5TB/day with schema validation.', 92.00);
INSERT INTO Transcripts (transcript_id, session_id, turn_index, question_text, answer_text, criterion_score) VALUES (2, 1, 2, 'How do you handle schema drift in incoming data?', 'Used a schema registry with backward-compatible versioning.', 87.50);
INSERT INTO Transcripts (transcript_id, session_id, turn_index, question_text, answer_text, criterion_score) VALUES (3, 1, 3, 'Write a query to find duplicate rows.', 'Used ROW_NUMBER() partitioned over the natural key, filtered rn > 1.', 90.00);
INSERT INTO Transcripts (transcript_id, session_id, turn_index, question_text, answer_text, criterion_score) VALUES (4, 2, 1, 'Describe a data pipeline you built end to end.', 'Built an analytics platform ingesting CRM and product events.', 80.00);
INSERT INTO Transcripts (transcript_id, session_id, turn_index, question_text, answer_text, criterion_score) VALUES (5, 2, 2, 'How do you handle schema drift in incoming data?', 'Mostly caught it in code review; no formal registry in place.', 68.00);
INSERT INTO Transcripts (transcript_id, session_id, turn_index, question_text, answer_text, criterion_score) VALUES (6, 2, 3, 'Write a query to find duplicate rows.', 'Grouped by key columns and filtered HAVING COUNT(*) > 1.', 85.00);
INSERT INTO Transcripts (transcript_id, session_id, turn_index, question_text, answer_text, criterion_score) VALUES (7, 3, 1, 'Describe a data pipeline you built end to end.', 'Deployed churn-prediction models with a feature pipeline in PyTorch.', 78.00);
INSERT INTO Transcripts (transcript_id, session_id, turn_index, question_text, answer_text, criterion_score) VALUES (8, 3, 2, 'How do you handle schema drift in incoming data?', 'Relied on downstream validation tests rather than upstream contracts.', 62.00);
INSERT INTO Transcripts (transcript_id, session_id, turn_index, question_text, answer_text, criterion_score) VALUES (9, 3, 3, 'Write a query to find duplicate rows.', 'Suggested a self-join, which is less efficient than window functions.', 70.00);
INSERT INTO Transcripts (transcript_id, session_id, turn_index, question_text, answer_text, criterion_score) VALUES (10, 4, 1, 'How do you choose evaluation metrics for a ranking model?', 'Used NDCG and MRR, cross-validated against business conversion.', 94.00);
INSERT INTO Transcripts (transcript_id, session_id, turn_index, question_text, answer_text, criterion_score) VALUES (11, 4, 2, 'Describe deploying a model to production.', 'Shipped via a canary rollout with shadow traffic comparison.', 91.00);
INSERT INTO Transcripts (transcript_id, session_id, turn_index, question_text, answer_text, criterion_score) VALUES (12, 4, 3, 'How do you detect model drift post-deployment?', 'Monitored feature distribution shift and prediction calibration.', 89.00);
INSERT INTO Transcripts (transcript_id, session_id, turn_index, question_text, answer_text, criterion_score) VALUES (13, 5, 1, 'How do you choose evaluation metrics for a ranking model?', 'Focused on NDCG primarily, less experience with online metrics.', 82.00);
INSERT INTO Transcripts (transcript_id, session_id, turn_index, question_text, answer_text, criterion_score) VALUES (14, 5, 2, 'Describe deploying a model to production.', 'Mostly research-stage work, limited production deployment experience.', 74.00);
INSERT INTO Transcripts (transcript_id, session_id, turn_index, question_text, answer_text, criterion_score) VALUES (15, 5, 3, 'How do you detect model drift post-deployment?', 'Checked prediction distributions periodically.', 70.00);
INSERT INTO Transcripts (transcript_id, session_id, turn_index, question_text, answer_text, criterion_score) VALUES (16, 6, 1, 'How do you ensure data quality in clinical datasets?', 'Used strict schema validation and null-checks on required fields.', 88.00);
INSERT INTO Transcripts (transcript_id, session_id, turn_index, question_text, answer_text, criterion_score) VALUES (17, 6, 2, 'Describe your experience with HIPAA compliance.', 'Worked with de-identified datasets and role-based access controls.', 90.00);
INSERT INTO Transcripts (transcript_id, session_id, turn_index, question_text, answer_text, criterion_score) VALUES (18, 6, 3, 'What dashboarding tools are you most proficient in?', 'Extensive experience in Power BI for clinical outcome dashboards.', 85.00);
INSERT INTO Transcripts (transcript_id, session_id, turn_index, question_text, answer_text, criterion_score) VALUES (19, 7, 1, 'How do you ensure data quality in clinical datasets?', 'Checked for outliers in patient age/weight metrics manually.', 75.00);
INSERT INTO Transcripts (transcript_id, session_id, turn_index, question_text, answer_text, criterion_score) VALUES (20, 7, 2, 'Describe your experience with HIPAA compliance.', 'General awareness, but mostly worked on internal-only non-PHI data.', 65.00);
INSERT INTO Transcripts (transcript_id, session_id, turn_index, question_text, answer_text, criterion_score) VALUES (21, 7, 3, 'What dashboarding tools are you most proficient in?', 'Used Tableau and Excel primarily.', 78.00);
INSERT INTO Transcripts (transcript_id, session_id, turn_index, question_text, answer_text, criterion_score) VALUES (22, 8, 1, 'Describe a complex recruiting pipeline you managed.', 'Managed nursing intake across 6 locations, reducing time-to-hire by 10%.', 91.00);
INSERT INTO Transcripts (transcript_id, session_id, turn_index, question_text, answer_text, criterion_score) VALUES (23, 8, 2, 'How do you communicate hiring blockers to stakeholders?', 'Weekly reports and immediate flags on credentialing delays.', 89.00);
INSERT INTO Transcripts (transcript_id, session_id, turn_index, question_text, answer_text, criterion_score) VALUES (24, 8, 3, 'How do you handle difficult negotiations?', 'Focus on total compensation value rather than just base salary.', 85.00);
