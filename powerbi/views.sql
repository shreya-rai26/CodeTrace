-- Reporting layer for Power BI. Safe to run repeatedly.
-- Power BI reads only the "bi" schema, through a read-only login.
CREATE SCHEMA IF NOT EXISTS bi;

CREATE OR REPLACE VIEW bi.dim_assignment AS
SELECT a.id                       AS assignment_id,
       a.title,
       a.course_code,
       a.threshold::float         AS threshold,
       a.status,
       a.embedding_backend,
       a.created_at,
       a.analyzed_at,
       a.analysis_ms,
       u.name                     AS teacher_name,
       (SELECT count(*) FROM submissions s WHERE s.assignment_id = a.id AND NOT s.is_reference) AS submission_count
FROM assignments a JOIN users u ON u.id = a.created_by;

CREATE OR REPLACE VIEW bi.dim_student AS
SELECT DISTINCT student_ref FROM submissions WHERE NOT is_reference;

CREATE OR REPLACE VIEW bi.dim_cluster AS
SELECT id AS cluster_id, assignment_id, size FROM clusters;

-- One row per student per assignment.
CREATE OR REPLACE VIEW bi.fact_submission AS
SELECT s.id                        AS submission_id,
       s.assignment_id,
       s.student_ref,
       s.language,
       s.loc,
       s.uploaded_at,
       cm.cluster_id,
       (cm.cluster_id IS NOT NULL) AS in_group,
       COALESCE(best.score, 0)::float AS max_score,
       best.other_student          AS closest_student,
       EXISTS (SELECT 1 FROM matches m JOIN submissions o
                 ON o.id = CASE WHEN m.submission_a = s.id THEN m.submission_b ELSE m.submission_a END
               WHERE m.flagged AND o.is_reference AND s.id IN (m.submission_a, m.submission_b)) AS matches_ai_reference,
       EXISTS (SELECT 1 FROM matches m JOIN submissions o
                 ON o.id = CASE WHEN m.submission_a = s.id THEN m.submission_b ELSE m.submission_a END
               WHERE m.flagged AND NOT o.is_reference AND s.id IN (m.submission_a, m.submission_b)) AS matches_student
FROM submissions s
LEFT JOIN cluster_members cm ON cm.submission_id = s.id
LEFT JOIN LATERAL (
  SELECT m.score, o.student_ref AS other_student
  FROM matches m
  JOIN submissions o ON o.id = CASE WHEN m.submission_a = s.id THEN m.submission_b ELSE m.submission_a END
  WHERE m.submission_a = s.id OR m.submission_b = s.id
  ORDER BY m.score DESC LIMIT 1
) best ON true
WHERE NOT s.is_reference;

-- One row per compared pair.
CREATE OR REPLACE VIEW bi.fact_match AS
SELECT m.id                 AS match_id,
       m.assignment_id,
       sa.student_ref       AS student_a,
       sb.student_ref       AS student_b,
       m.score::float       AS score,
       m.structural::float  AS structural,
       m.semantic::float    AS semantic,
       m.flagged,
       CASE WHEN m.score >= 0.8 THEN '4. 80-100%'
            WHEN m.score >= 0.6 THEN '3. 60-79%'
            WHEN m.score >= 0.4 THEN '2. 40-59%'
            ELSE '1. under 40%' END AS score_band,
       (sa.is_reference OR sb.is_reference) AS involves_ai_reference,
       sa.is_reference      AS a_is_reference,
       sb.is_reference      AS b_is_reference
FROM matches m
JOIN submissions sa ON sa.id = m.submission_a
JOIN submissions sb ON sb.id = m.submission_b;

-- Each pair twice, once from each student's side. Used for per-student pages.
CREATE OR REPLACE VIEW bi.fact_student_match AS
SELECT match_id, assignment_id, student_a AS student_ref, student_b AS other_student, score, flagged,
       b_is_reference AS other_is_ai_reference
FROM bi.fact_match WHERE NOT a_is_reference
UNION ALL
SELECT match_id, assignment_id, student_b, student_a, score, flagged, a_is_reference
FROM bi.fact_match WHERE NOT b_is_reference;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'powerbi') THEN
    CREATE ROLE powerbi LOGIN PASSWORD 'powerbi_readonly';
  END IF;
END $$;
GRANT USAGE ON SCHEMA bi TO powerbi;
GRANT SELECT ON ALL TABLES IN SCHEMA bi TO powerbi;
