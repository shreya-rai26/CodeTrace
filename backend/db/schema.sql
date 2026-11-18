-- CodeTrace schema. Safe to run repeatedly.
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'teacher' CHECK (role IN ('teacher', 'ta', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assignments (
  id                SERIAL PRIMARY KEY,
  title             TEXT NOT NULL,
  course_code       TEXT NOT NULL,
  threshold         NUMERIC(4,3) NOT NULL DEFAULT 0.5 CHECK (threshold BETWEEN 0.05 AND 1),
  status            TEXT NOT NULL DEFAULT 'empty'
                    CHECK (status IN ('empty', 'ready', 'analyzing', 'done', 'failed')),
  error             TEXT,
  embedding_backend TEXT,
  created_by        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  analyzed_at       TIMESTAMPTZ,
  analysis_ms       INTEGER
);

CREATE TABLE IF NOT EXISTS submissions (
  id            SERIAL PRIMARY KEY,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_ref   TEXT NOT NULL,
  filename      TEXT NOT NULL,
  language      TEXT NOT NULL,
  code          TEXT NOT NULL,
  loc           INTEGER NOT NULL,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, student_ref)
);

-- AI-generated reference solutions are stored beside student submissions.
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS is_reference BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS matches (
  id            SERIAL PRIMARY KEY,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  submission_a  INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  submission_b  INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  score         NUMERIC(5,4) NOT NULL,
  structural    NUMERIC(5,4) NOT NULL,
  semantic      NUMERIC(5,4) NOT NULL,
  flagged       BOOLEAN NOT NULL,
  lines_a       INTEGER[] NOT NULL DEFAULT '{}',
  lines_b       INTEGER[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS clusters (
  id            SERIAL PRIMARY KEY,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  size          INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cluster_members (
  cluster_id    INTEGER NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
  submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  PRIMARY KEY (cluster_id, submission_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_matches_assignment ON matches(assignment_id, score DESC);

-- Review and run history survive replacement of current match rows.
CREATE TABLE IF NOT EXISTS analysis_runs (
  id BIGSERIAL PRIMARY KEY, assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  threshold NUMERIC(4,3) NOT NULL, status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(), finished_at TIMESTAMPTZ,
  pair_count INTEGER, flagged_count INTEGER, error TEXT
);
CREATE TABLE IF NOT EXISTS match_reviews (
  id BIGSERIAL PRIMARY KEY, assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  match_id INTEGER REFERENCES matches(id) ON DELETE SET NULL,
  student_a TEXT NOT NULL, student_b TEXT NOT NULL, score NUMERIC(5,4) NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('reviewed','dismissed')),
  note TEXT NOT NULL DEFAULT '', reviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_match_reviews_current ON match_reviews(match_id) WHERE match_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS match_assignees (
  match_id INTEGER PRIMARY KEY REFERENCES matches(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS assignment_members (
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (assignment_id,user_id)
);
CREATE TABLE IF NOT EXISTS activity_events (
  id BIGSERIAL PRIMARY KEY, assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS starter_templates (
  assignment_id INTEGER PRIMARY KEY REFERENCES assignments(id) ON DELETE CASCADE,
  filename TEXT NOT NULL, code TEXT NOT NULL
);
