import path from 'node:path';
import AdmZip from 'adm-zip';
import { HttpError } from '../middleware/error.js';

const LANGUAGES = { '.py': 'Python', '.c': 'C', '.h': 'C', '.cpp': 'C++', '.cc': 'C++',
  '.hpp': 'C++', '.java': 'Java', '.js': 'JavaScript', '.ts': 'TypeScript' };
const MAX_FILE_BYTES = 200 * 1024;
const MAX_STUDENTS = 400;

/**
 * Reads a zip of class submissions. Two layouts are accepted:
 *   one file per student:   BT24CSD001.py, BT24CSD002.py ...
 *   one folder per student: BT24CSD001/main.py, BT24CSD001/util.py ...
 * A single wrapper folder around everything is ignored.
 * Returns { submissions: [{ student_ref, filename, language, code, loc }], skipped: [...] }.
 */
export function readSubmissions(buffer) {
  let zip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    throw new HttpError(400, 'This file is not a valid zip archive.');
  }

  const skipped = [];
  let files = [];
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const parts = entry.entryName.split('/').filter(Boolean);
    if (parts.some((p) => p.startsWith('.') || p === '__MACOSX')) continue;
    const ext = path.extname(entry.entryName).toLowerCase();
    if (!LANGUAGES[ext]) { skipped.push(`${entry.entryName} (not a source file)`); continue; }
    if (entry.header.size > MAX_FILE_BYTES) { skipped.push(`${entry.entryName} (over 200 KB)`); continue; }
    const code = entry.getData().toString('utf8');
    if (code.includes('\u0000')) { skipped.push(`${entry.entryName} (binary file)`); continue; }
    files.push({ parts, ext, code });
  }

  // Drop a wrapper folder shared by every file ("assignment1/...").
  while (files.length > 1 && files.every((f) => f.parts.length > 1 && f.parts[0] === files[0].parts[0])) {
    const inner = files.map((f) => ({ ...f, parts: f.parts.slice(1) }));
    // ...unless that folder is actually the only student.
    if (inner.every((f) => f.parts.length === 1) && files[0].parts.length === 2 &&
        new Set(inner.map((f) => path.parse(f.parts[0]).name)).size === 1) break;
    files = inner;
  }

  const students = new Map();
  for (const f of files) {
    const ref = f.parts.length === 1 ? path.parse(f.parts[0]).name : f.parts[0];
    if (!students.has(ref)) students.set(ref, []);
    students.get(ref).push(f);
  }
  if (students.size > MAX_STUDENTS) {
    throw new HttpError(413, `The zip has ${students.size} students; the limit is ${MAX_STUDENTS}.`);
  }

  const submissions = [];
  for (const [student_ref, list] of students) {
    list.sort((a, b) => a.parts.join('/').localeCompare(b.parts.join('/')));
    const code = list.map((f) => f.code.replace(/\r\n/g, '\n')).join('\n');
    if (!code.trim()) { skipped.push(`${student_ref} (empty submission)`); continue; }
    submissions.push({
      student_ref: student_ref.slice(0, 100),
      filename: list.length === 1 ? list[0].parts.at(-1) : `${list.length} files${list[0].ext}`,
      language: LANGUAGES[list[0].ext],
      code,
      loc: code.split('\n').filter((l) => l.trim()).length,
    });
  }
  return { submissions, skipped };
}
