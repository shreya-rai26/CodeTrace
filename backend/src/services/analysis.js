import { query, transaction } from '../db.js';

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/** Sends one assignment to the ML service and stores what comes back. */
export async function runAnalysis(assignmentId, threshold, runId) {
  const started = Date.now();
  try {
    const { rows: subs } = await query(
      'SELECT id, filename, code, is_reference FROM submissions WHERE assignment_id = $1 ORDER BY id', [assignmentId]);
    const { rows: templates } = await query('SELECT filename, code FROM starter_templates WHERE assignment_id = $1', [assignmentId]);

    const response = await fetch(`${ML_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // "x files.py" is a display name; the ML service only needs the extension.
      body: JSON.stringify({
        submissions: subs.map((s) => ({ id: s.id, code: s.code, reference: s.is_reference,
                                        filename: s.filename.replace(/^.* /, 'f') })),
        threshold,
        template: templates[0] || null,
      }),
      signal: AbortSignal.timeout(10 * 60 * 1000),
    });
    if (!response.ok) throw new Error(`ML service answered ${response.status}: ${await response.text()}`);
    const result = await response.json();

    await transaction(async (db) => {
      await db.query('DELETE FROM matches WHERE assignment_id = $1', [assignmentId]);
      await db.query('DELETE FROM clusters WHERE assignment_id = $1', [assignmentId]);
      for (const p of result.pairs) {
        await db.query(
          `INSERT INTO matches (assignment_id, submission_a, submission_b, score, structural, semantic,
                                flagged, lines_a, lines_b)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [assignmentId, p.a, p.b, p.score, p.structural, p.semantic, p.flagged, p.lines_a, p.lines_b]);
      }
      for (const members of result.clusters) {
        const { rows } = await db.query(
          'INSERT INTO clusters (assignment_id, size) VALUES ($1, $2) RETURNING id', [assignmentId, members.length]);
        for (const sid of members) {
          await db.query('INSERT INTO cluster_members (cluster_id, submission_id) VALUES ($1, $2)', [rows[0].id, sid]);
        }
      }
      await db.query(
        `UPDATE assignments SET status = 'done', error = NULL, threshold = $2, embedding_backend = $3,
                analyzed_at = now(), analysis_ms = $4 WHERE id = $1`,
        [assignmentId, threshold, result.stats.embedding_backend, Date.now() - started]);
      await db.query(`UPDATE analysis_runs SET status = 'done', finished_at = now(), pair_count = $2, flagged_count = $3 WHERE id = $1`,
        [runId, result.pairs.length, result.pairs.filter(p => p.flagged).length]);
      await db.query(`INSERT INTO activity_events (assignment_id, kind, detail) VALUES ($1, 'analysis_done', $2)`,
        [assignmentId, `${result.pairs.filter(p => p.flagged).length} flagged pairs`]);
    });
  } catch (err) {
    console.error(`Analysis of assignment ${assignmentId} failed:`, err.message);
    const reason = err.cause?.code === 'ECONNREFUSED' || err.name === 'TimeoutError'
      ? 'The analysis service is not reachable. Check that it is running, then run the analysis again.'
      : 'The analysis could not be completed. Run it again.';
    await query(`UPDATE assignments SET status = 'failed', error = $2 WHERE id = $1`, [assignmentId, reason]);
    await query(`UPDATE analysis_runs SET status = 'failed', finished_at = now(), error = $2 WHERE id = $1`, [runId, reason]);
    await query(`INSERT INTO activity_events (assignment_id, kind, detail) VALUES ($1, 'analysis_failed', $2)`, [assignmentId, reason]);
  }
}
