# Instructor features added

The overview now shows assignment totals, submissions, flagged pairs, an awaiting-review queue, activity, and a similarity distribution. The queue links to the existing code comparison page.

On a flagged pair, a teacher can save a review decision and note. Decisions from older runs remain in review history when re-analysis replaces current matches. Run history stores the threshold, status, pair count, and flagged count; it does not preserve old code comparisons. The dashboard refreshes every 15 seconds while open, so completion and failure appear in its activity panel. It does not send email or operating-system notifications.

The assignment page previews a student ZIP before replacing submissions, accepts one starter-code source file, shows run and review history, exports current results as CSV, and lets an assignment owner add teachers or TAs who already have accounts. The comparison page can be printed or saved as PDF from the browser. The Students page provides history by student reference across assignments visible to the signed-in user.

Database tables are added automatically by `backend/db/schema.sql` at backend startup. Current match rows are replaced on re-analysis; saved review records remain linked to the assignment. The `.env` file was intentionally excluded from this package. Create one from `.env.example` for local use.
