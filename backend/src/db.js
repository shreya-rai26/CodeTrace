import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const query = (text, params) => pool.query(text, params);

export async function initDb() {
  const schema = fs.readFileSync(path.join(here, '../db/schema.sql'), 'utf8');
  await pool.query(schema);
  // A crash mid-analysis would otherwise leave an assignment stuck forever.
  await pool.query(
    `UPDATE assignments SET status = 'failed', error = 'Server restarted during analysis. Run it again.'
     WHERE status = 'analyzing'`);
}

/** Runs fn inside a transaction and rolls back if it throws. */
export async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
