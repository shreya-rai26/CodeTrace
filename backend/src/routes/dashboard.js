import { Router } from 'express';
import { query } from '../db.js';
import { wrap } from '../middleware/error.js';

const router = Router();
const visible = `(a.created_by = $1 OR $2 = 'admin' OR EXISTS
  (SELECT 1 FROM assignment_members am WHERE am.assignment_id = a.id AND am.user_id = $1))`;

router.get('/', wrap(async (req, res) => {
  const args = [req.user.id, req.user.role];
  const [assignments, queue, activity, bins, pending] = await Promise.all([
    query(`SELECT a.id, a.title, a.course_code, a.status, a.created_at, a.analyzed_at,
      (SELECT count(*)::int FROM submissions s WHERE s.assignment_id = a.id AND NOT s.is_reference) AS submission_count,
      (SELECT count(*)::int FROM matches m WHERE m.assignment_id = a.id AND m.flagged) AS flagged_pairs
      FROM assignments a WHERE ${visible} ORDER BY a.created_at DESC`, args),
    query(`SELECT a.id AS assignment_id, a.title, a.course_code, m.id AS match_id, m.score::float,
      sa.student_ref AS student_a, sb.student_ref AS student_b, ma.user_id AS assigned_to
      FROM matches m JOIN assignments a ON a.id = m.assignment_id
      JOIN submissions sa ON sa.id = m.submission_a JOIN submissions sb ON sb.id = m.submission_b
      LEFT JOIN match_reviews r ON r.match_id = m.id
      LEFT JOIN match_assignees ma ON ma.match_id = m.id
      WHERE ${visible} AND m.flagged AND r.id IS NULL ORDER BY m.score DESC`, args),
    query(`SELECT e.kind, e.detail, e.created_at, a.title, a.course_code, a.id AS assignment_id
      FROM activity_events e JOIN assignments a ON a.id = e.assignment_id
      WHERE ${visible} ORDER BY e.created_at DESC LIMIT 12`, args),
    query(`SELECT least(4, floor(m.score * 5))::int AS bin, count(*)::int AS count
      FROM matches m JOIN assignments a ON a.id = m.assignment_id WHERE ${visible}
      GROUP BY bin ORDER BY bin`, args),
    query(`SELECT count(*)::int AS count FROM matches m JOIN assignments a ON a.id = m.assignment_id
      LEFT JOIN match_reviews r ON r.match_id = m.id
      WHERE ${visible} AND m.flagged AND r.id IS NULL`, args),
  ]);
  const list = assignments.rows;
  res.json({ assignments: list, queue: queue.rows, activity: activity.rows, bins: bins.rows,
    totals: { assignments: list.length, submissions: list.reduce((n,a) => n + a.submission_count, 0),
      flagged: list.reduce((n,a) => n + a.flagged_pairs, 0), awaiting_review: pending.rows[0].count } });
}));

router.get('/students', wrap(async (req, res) => {
  const { rows } = await query(`SELECT s.student_ref, count(DISTINCT s.id)::int AS submissions,
    count(DISTINCT a.id)::int AS assignments,
    count(DISTINCT m.id) FILTER (WHERE m.flagged)::int AS flagged_matches
    FROM submissions s JOIN assignments a ON a.id = s.assignment_id
    LEFT JOIN matches m ON (m.submission_a = s.id OR m.submission_b = s.id)
    WHERE ${visible} AND NOT s.is_reference GROUP BY s.student_ref ORDER BY s.student_ref`, [req.user.id, req.user.role]);
  res.json({ students: rows });
}));
router.get('/students/:ref', wrap(async (req, res) => {
  const { rows } = await query(`SELECT a.id AS assignment_id, a.title, a.course_code, s.filename,
    m.id AS match_id, m.score::float, m.flagged, r.decision,
    CASE WHEN m.submission_a = s.id THEN sb.student_ref ELSE sa.student_ref END AS other_student
    FROM submissions s JOIN assignments a ON a.id = s.assignment_id
    LEFT JOIN matches m ON (m.submission_a = s.id OR m.submission_b = s.id)
    LEFT JOIN submissions sa ON sa.id = m.submission_a LEFT JOIN submissions sb ON sb.id = m.submission_b
    LEFT JOIN match_reviews r ON r.match_id = m.id
    WHERE ${visible} AND s.student_ref = $3 AND NOT s.is_reference
    ORDER BY a.created_at DESC, m.score DESC`, [req.user.id, req.user.role, req.params.ref]);
  res.json({ history: rows });
}));
export default router;
