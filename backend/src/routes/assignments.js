import { Router } from 'express';
import multer from 'multer';
import { query, transaction } from '../db.js';
import { HttpError, wrap } from '../middleware/error.js';
import { runAnalysis } from '../services/analysis.js';
import { readSubmissions } from '../services/zip.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

/** Loads the assignment and checks the signed-in user may see it. */
export async function loadAssignment(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new HttpError(400, 'The assignment id must be a number.');
  const { rows } = await query('SELECT * FROM assignments WHERE id = $1', [id]);
  const assignment = rows[0];
  if (!assignment) throw new HttpError(404, 'Assignment not found.');
  const { rowCount: memberCount } = await query('SELECT 1 FROM assignment_members WHERE assignment_id = $1 AND user_id = $2', [id, req.user.id]);
  if (assignment.created_by !== req.user.id && req.user.role !== 'admin' && !memberCount) {
    throw new HttpError(404, 'Assignment not found.');
  }
  return assignment;
}

router.get('/', wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT a.*,
            (SELECT count(*)::int FROM submissions s WHERE s.assignment_id = a.id AND NOT s.is_reference) AS submission_count,
            (SELECT count(*)::int FROM matches m WHERE m.assignment_id = a.id AND m.flagged) AS flagged_pairs
     FROM assignments a
     WHERE a.created_by = $1 OR $2 = 'admin' OR EXISTS
       (SELECT 1 FROM assignment_members am WHERE am.assignment_id = a.id AND am.user_id = $1)
     ORDER BY a.created_at DESC`, [req.user.id, req.user.role]);
  res.json({ assignments: rows });
}));

router.post('/', wrap(async (req, res) => {
  const title = String(req.body.title || '').trim();
  const course = String(req.body.course_code || '').trim().toUpperCase();
  if (!title || title.length > 120) throw new HttpError(400, 'Give the assignment a title (up to 120 characters).');
  if (!course || course.length > 20) throw new HttpError(400, 'Enter a course code, for example CSP301.');
  const { rows } = await query(
    'INSERT INTO assignments (title, course_code, created_by) VALUES ($1, $2, $3) RETURNING *',
    [title, course, req.user.id]);
  await query(`INSERT INTO activity_events (assignment_id, actor_id, kind) VALUES ($1, $2, 'created')`, [rows[0].id, req.user.id]);
  res.status(201).json({ assignment: rows[0] });
}));

router.delete('/:id', wrap(async (req, res) => {
  const a = await loadAssignment(req);
  if (a.created_by !== req.user.id && req.user.role !== 'admin') throw new HttpError(403, 'Only the owner can delete this assignment.');
  if (a.status === 'analyzing') throw new HttpError(409, 'Wait for the analysis to finish before deleting.');
  await query('DELETE FROM assignments WHERE id = $1', [a.id]);
  res.status(204).end();
}));

/**
 * Stores the files of an uploaded zip, replacing earlier ones of the same kind.
 * kind 'students' = the class's submissions, 'references' = AI-generated solutions to compare against.
 */
async function storeUpload(req, isReference) {
  const a = await loadAssignment(req);
  if (a.status === 'analyzing') throw new HttpError(409, 'An analysis is running. Upload again when it finishes.');
  if (!req.file) throw new HttpError(400, 'Attach a zip file in the "file" field.');
  const { submissions, skipped } = readSubmissions(req.file.buffer);
  const needed = isReference ? 1 : 2;
  if (submissions.length < needed) {
    throw new HttpError(400, isReference
      ? 'No usable source files were found in the zip.'
      : `Found ${submissions.length} usable submission(s) in the zip; at least 2 are needed to compare.`);
  }
  await transaction(async (db) => {
    await db.query('DELETE FROM submissions WHERE assignment_id = $1 AND is_reference = $2', [a.id, isReference]);
    // Old results no longer describe what is stored.
    await db.query('DELETE FROM matches WHERE assignment_id = $1', [a.id]);
    await db.query('DELETE FROM clusters WHERE assignment_id = $1', [a.id]);
    for (const s of submissions) {
      await db.query(
        `INSERT INTO submissions (assignment_id, student_ref, filename, language, code, loc, is_reference)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [a.id, isReference ? `AI: ${s.student_ref}`.slice(0, 100) : s.student_ref, s.filename, s.language, s.code, s.loc, isReference]);
    }
    await db.query(
      `UPDATE assignments SET error = NULL, analyzed_at = NULL,
              status = CASE WHEN (SELECT count(*) FROM submissions WHERE assignment_id = $1 AND NOT is_reference) >= 2
                            THEN 'ready' ELSE 'empty' END
       WHERE id = $1`, [a.id]);
    await db.query(`INSERT INTO activity_events (assignment_id, actor_id, kind, detail) VALUES ($1, $2, 'upload', $3)`,
      [a.id, req.user.id, `${submissions.length} ${isReference ? 'references' : 'submissions'}`]);
  });
  return { uploaded: submissions.length, skipped };
}

router.post('/:id/submissions', upload.single('file'), wrap(async (req, res) => {
  res.status(201).json(await storeUpload(req, false));
}));

router.post('/:id/references', upload.single('file'), wrap(async (req, res) => {
  res.status(201).json(await storeUpload(req, true));
}));

router.delete('/:id/references', wrap(async (req, res) => {
  const a = await loadAssignment(req);
  if (a.status === 'analyzing') throw new HttpError(409, 'Wait for the analysis to finish.');
  await query('DELETE FROM submissions WHERE assignment_id = $1 AND is_reference', [a.id]);
  await query('DELETE FROM matches WHERE assignment_id = $1', [a.id]);
  await query('DELETE FROM clusters WHERE assignment_id = $1', [a.id]);
  await query(`UPDATE assignments SET status = 'ready', analyzed_at = NULL WHERE id = $1 AND status IN ('done', 'failed')`, [a.id]);
  res.status(204).end();
}));

router.post('/:id/analyze', wrap(async (req, res) => {
  const a = await loadAssignment(req);
  if (a.status === 'empty') throw new HttpError(409, 'Upload submissions before running the analysis.');
  const threshold = req.body.threshold === undefined ? Number(a.threshold) : Number(req.body.threshold);
  if (!(threshold >= 0.05 && threshold <= 1)) throw new HttpError(400, 'The threshold must be between 0.05 and 1.');
  // The status check and the update happen in one statement so two clicks cannot start two runs.
  const { rowCount } = await query(
    `UPDATE assignments SET status = 'analyzing', error = NULL WHERE id = $1 AND status <> 'analyzing'`, [a.id]);
  if (!rowCount) throw new HttpError(409, 'An analysis is already running for this assignment.');
  const { rows: runs } = await query('INSERT INTO analysis_runs (assignment_id, threshold) VALUES ($1, $2) RETURNING id', [a.id, threshold]);
  runAnalysis(a.id, threshold, runs[0].id); // not awaited: the client polls for the result
  res.status(202).json({ status: 'analyzing' });
}));

router.get('/:id', wrap(async (req, res) => {
  const a = await loadAssignment(req);
  const [subs, matches, clusters] = await Promise.all([
    query(
      `SELECT s.id, s.student_ref, s.filename, s.language, s.loc, s.is_reference, cm.cluster_id,
              COALESCE((SELECT max(m.score) FROM matches m
                        WHERE m.submission_a = s.id OR m.submission_b = s.id), 0)::float AS max_score
       FROM submissions s LEFT JOIN cluster_members cm ON cm.submission_id = s.id
       WHERE s.assignment_id = $1 ORDER BY s.is_reference, s.student_ref`, [a.id]),
    query(
      `SELECT m.id, m.submission_a, m.submission_b, m.score::float, m.structural::float, m.semantic::float, m.flagged,
              r.decision, r.note, r.reviewed_at, ma.user_id AS assigned_to
       FROM matches m LEFT JOIN match_reviews r ON r.match_id = m.id LEFT JOIN match_assignees ma ON ma.match_id = m.id
       WHERE m.assignment_id = $1 ORDER BY m.score DESC`, [a.id]),
    query('SELECT id, size FROM clusters WHERE assignment_id = $1 ORDER BY size DESC, id', [a.id]),
  ]);
  res.json({ assignment: { ...a, threshold: Number(a.threshold) },
             submissions: subs.rows, matches: matches.rows, clusters: clusters.rows });
}));

router.get('/:id/matches/:matchId', wrap(async (req, res) => {
  const a = await loadAssignment(req);
  const { rows } = await query(
    `SELECT m.id, m.score::float, m.structural::float, m.semantic::float, m.flagged, m.lines_a, m.lines_b,
            r.decision, r.note, r.reviewed_at, ma.user_id AS assigned_to,
            sa.student_ref AS student_a, sa.filename AS filename_a, sa.code AS code_a,
            sb.student_ref AS student_b, sb.filename AS filename_b, sb.code AS code_b
     FROM matches m JOIN submissions sa ON sa.id = m.submission_a JOIN submissions sb ON sb.id = m.submission_b
     LEFT JOIN match_reviews r ON r.match_id = m.id
     LEFT JOIN match_assignees ma ON ma.match_id = m.id
     WHERE m.id = $1 AND m.assignment_id = $2`, [Number(req.params.matchId) || 0, a.id]);
  if (!rows[0]) throw new HttpError(404, 'Comparison not found.');
  res.json({ match: rows[0], assignment: { id: a.id, title: a.title, threshold: Number(a.threshold) } });
}));

router.post('/:id/preview', upload.single('file'), wrap(async (req, res) => {
  await loadAssignment(req);
  if (!req.file) throw new HttpError(400, 'Attach a ZIP file.');
  const { submissions, skipped } = readSubmissions(req.file.buffer);
  res.json({ submissions: submissions.map(({ student_ref, filename, language, loc }) => ({ student_ref, filename, language, loc })), skipped });
}));

router.put('/:id/template', upload.single('file'), wrap(async (req, res) => {
  const a = await loadAssignment(req);
  if (a.status === 'analyzing') throw new HttpError(409, 'Wait for analysis to finish.');
  if (!req.file || req.file.size > 200 * 1024) throw new HttpError(400, 'Choose a source file under 200 KB.');
  const name = req.file.originalname;
  if (!/\.(py|c|h|cpp|cc|hpp|java|js|ts)$/i.test(name)) throw new HttpError(400, 'Choose a supported source file.');
  const code = req.file.buffer.toString('utf8');
  if (!code.trim() || code.includes('\0')) throw new HttpError(400, 'The starter file is empty or binary.');
  await query(`INSERT INTO starter_templates (assignment_id, filename, code) VALUES ($1,$2,$3)
    ON CONFLICT (assignment_id) DO UPDATE SET filename = EXCLUDED.filename, code = EXCLUDED.code`, [a.id, name, code]);
  res.json({ filename: name });
}));
router.get('/:id/template', wrap(async (req, res) => {
  const a = await loadAssignment(req);
  const { rows } = await query('SELECT filename FROM starter_templates WHERE assignment_id = $1', [a.id]);
  res.json({ template: rows[0] || null });
}));
router.delete('/:id/template', wrap(async (req, res) => {
  const a = await loadAssignment(req);
  await query('DELETE FROM starter_templates WHERE assignment_id = $1', [a.id]);
  res.status(204).end();
}));

router.put('/:id/matches/:matchId/review', wrap(async (req, res) => {
  const a = await loadAssignment(req);
  const decision = String(req.body.decision || '');
  const note = String(req.body.note || '').trim();
  if (!['reviewed', 'dismissed'].includes(decision) || note.length > 2000) throw new HttpError(400, 'Invalid review decision or note.');
  const { rows: matches } = await query(`SELECT m.id, m.score, sa.student_ref AS student_a, sb.student_ref AS student_b
    FROM matches m JOIN submissions sa ON sa.id = m.submission_a JOIN submissions sb ON sb.id = m.submission_b
    WHERE m.id = $1 AND m.assignment_id = $2 AND m.flagged`, [Number(req.params.matchId) || 0, a.id]);
  if (!matches[0]) throw new HttpError(404, 'Flagged match not found.');
  const m = matches[0];
  const { rows } = await query(`INSERT INTO match_reviews (assignment_id, match_id, student_a, student_b, score, decision, note, reviewer_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT (match_id) WHERE match_id IS NOT NULL DO UPDATE
    SET decision = EXCLUDED.decision, note = EXCLUDED.note, reviewer_id = EXCLUDED.reviewer_id, reviewed_at = now() RETURNING *`,
    [a.id, m.id, m.student_a, m.student_b, m.score, decision, note, req.user.id]);
  await query(`INSERT INTO activity_events (assignment_id, actor_id, kind, detail) VALUES ($1,$2,'review',$3)`, [a.id, req.user.id, decision]);
  res.json({ review: rows[0] });
}));
router.put('/:id/matches/:matchId/assignee', wrap(async (req, res) => {
  const a = await loadAssignment(req);
  if (a.created_by !== req.user.id && req.user.role !== 'admin') throw new HttpError(403, 'Only the owner can assign reviews.');
  const matchId = Number(req.params.matchId);
  const userId = Number(req.body.user_id);
  const { rowCount: matchCount } = await query('SELECT 1 FROM matches WHERE id = $1 AND assignment_id = $2 AND flagged', [matchId, a.id]);
  const { rowCount: memberCount } = await query('SELECT 1 FROM assignment_members WHERE assignment_id = $1 AND user_id = $2', [a.id, userId]);
  if (!matchCount || (!memberCount && userId !== a.created_by)) throw new HttpError(400, 'Choose a flagged match and a team member.');
  await query(`INSERT INTO match_assignees (match_id, user_id) VALUES ($1,$2)
    ON CONFLICT (match_id) DO UPDATE SET user_id = EXCLUDED.user_id`, [matchId,userId]);
  res.json({ assigned_to:userId });
}));
router.get('/:id/runs', wrap(async (req, res) => {
  const a = await loadAssignment(req);
  const { rows } = await query('SELECT * FROM analysis_runs WHERE assignment_id = $1 ORDER BY started_at DESC', [a.id]);
  res.json({ runs: rows });
}));
router.get('/:id/reviews', wrap(async (req, res) => {
  const a = await loadAssignment(req);
  const { rows } = await query('SELECT student_a, student_b, score::float, decision, note, reviewed_at FROM match_reviews WHERE assignment_id = $1 ORDER BY reviewed_at DESC', [a.id]);
  res.json({ reviews: rows });
}));
router.get('/:id/export.csv', wrap(async (req, res) => {
  const a = await loadAssignment(req);
  const { rows } = await query(`SELECT sa.student_ref AS student_a, sb.student_ref AS student_b, m.score::float,
    m.structural::float, m.semantic::float, m.flagged, r.decision, r.note
    FROM matches m JOIN submissions sa ON sa.id = m.submission_a JOIN submissions sb ON sb.id = m.submission_b
    LEFT JOIN match_reviews r ON r.match_id = m.id WHERE m.assignment_id = $1 ORDER BY m.score DESC`, [a.id]);
  const cell = v => { const s = String(v ?? ''); return '"' + (/^[\s]*[=+@-]/.test(s) ? `'${s}` : s).replace(/"/g, '""') + '"'; };
  const columns = ['student_a','student_b','score','structural','semantic','flagged','decision','note'];
  res.type('text/csv').set('Content-Disposition', `attachment; filename="codetrace-assignment-${a.id}.csv"`)
    .send([columns.join(','), ...rows.map(r => columns.map(c => cell(r[c])).join(','))].join('\r\n'));
}));
router.get('/:id/members', wrap(async (req, res) => {
  const a = await loadAssignment(req);
  const { rows } = await query(`SELECT u.id, u.name, u.email FROM assignment_members am JOIN users u ON u.id = am.user_id WHERE am.assignment_id = $1`, [a.id]);
  res.json({ members: rows });
}));
router.post('/:id/members', wrap(async (req, res) => {
  const a = await loadAssignment(req);
  if (a.created_by !== req.user.id && req.user.role !== 'admin') throw new HttpError(403, 'Only the owner can add reviewers.');
  const email = String(req.body.email || '').trim().toLowerCase();
  const { rows } = await query(`SELECT id, name, email FROM users WHERE lower(email) = $1 AND role IN ('teacher','ta')`, [email]);
  if (!rows[0]) throw new HttpError(404, 'No teacher or teaching assistant has that email.');
  await query('INSERT INTO assignment_members (assignment_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [a.id, rows[0].id]);
  res.status(201).json({ member: rows[0] });
}));
router.delete('/:id/members/:userId', wrap(async (req, res) => {
  const a = await loadAssignment(req);
  if (a.created_by !== req.user.id && req.user.role !== 'admin') throw new HttpError(403, 'Only the owner can remove reviewers.');
  await query('DELETE FROM assignment_members WHERE assignment_id = $1 AND user_id = $2', [a.id, Number(req.params.userId) || 0]);
  res.status(204).end();
}));

export default router;
