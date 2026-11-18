# CodeTrace

Finds copied code in a class's programming submissions, even when the copy has been
disguised by renaming variables, reordering functions, adding comments or inserting
dead code. Built for CSP 301 (Tools and Practices for Data Science III).

A teacher uploads one zip of submissions. CodeTrace compares every pair, groups
students whose code matches into "copy rings", and shows the two files side by side
with the matching lines highlighted.

## How it works

```
React + Bootstrap  ->  Node/Express API  ->  PostgreSQL
   (frontend)             (backend)      \
                                          ->  Python FastAPI ML service
```

The ML service scores each pair in two ways and combines them (70% / 30%):

1. Fingerprint overlap. Code is tokenised, identifiers become `ID`, literals become
   `STR`/`NUM`, comments are dropped. Winnowing (the algorithm family behind Stanford
   MOSS) then picks a set of k-gram hashes per file. Shared hashes = shared structure.
2. Vector similarity. TF-IDF over token n-grams by default. Set
   `EMBEDDING_BACKEND=codebert` to use UniXcoder/CodeBERT embeddings instead
   (install `ml-service/requirements-codebert.txt` first).

Pairs above the threshold are flagged; connected flagged pairs form a group.

AI reference comparison: a teacher can add a zip of AI-generated answers to an assignment.
Every student is compared against them too, and students who match one are reported
separately. This only catches answers close to the references that were uploaded; it is
not a general AI-writing detector.

## Run it

On Windows: install Docker Desktop, start it, then double-click `start.bat`.
Then double-click `seed-demo.bat` to load 9 demo classes and the Power BI views.
The full handover guide is in `docs/CodeTrace-Handover.pdf`.

With Docker (any OS):

```bash
cp .env.example .env        # then edit JWT_SECRET
docker compose up --build   # open http://localhost:8080
```

Without Docker (three terminals, PostgreSQL 16 running locally):

```bash
# 1. ML service
cd ml-service && pip install -r requirements.txt && uvicorn app.main:app --port 8000
# 2. Backend
cd backend && cp .env.example .env && npm install && npm start
# 3. Frontend
cd frontend && npm install && npm run dev      # open http://localhost:5173
```

Create the database once: `createuser -P codetrace && createdb -O codetrace codetrace`.
Tables are created automatically when the backend starts.

## Try the demo

1. Create an account and a new assignment.
2. Upload `sample-data/matrix_class_submissions.zip` (9 students).
3. Add `sample-data/ai-references/matrix_ai_references.zip` as AI reference solutions.
4. Run the analysis. `sample-data/matrix_answer_key.txt` says who really copied what.

## Tests and measured results

```bash
cd ml-service
python -m pytest -q tests          # 7 tests: normal, wrong and boundary inputs
python benchmark/evaluate.py       # precision / recall on disguised copies
```

Benchmark: 3 problems x 4 independently written solutions, plus 4 disguised copies of
each (60 files, 570 pairs). At the default threshold of 0.5 it finds 120 of 120 copied
pairs with 0 false flags; the highest score between two independent solutions is 0.35.

This benchmark is small and synthetic, so treat the number as an upper bound. The
independent solutions were written in deliberately different styles and the disguises
are mechanical. Real classes, where many students write near-identical short answers,
will produce false flags. Re-run the evaluation on real (anonymised) submissions before
quoting an accuracy figure.

## Known limits

- A flag is a reason to read the two files, never proof of copying.
- Rewriting the algorithm itself (loop to recursion, different data structure) is not
  caught by fingerprints. The CodeBERT backend is meant for this but is not yet measured.
- Very short programs (under ~15 lines) do not have enough fingerprints to judge.
- Analysis runs inside the backend process; a job queue is planned.

## Roadmap

- [x] AI reference comparison
- [ ] AI-likelihood classifier from code style (features + classifier)
- [ ] Power BI dashboards (views and steps are ready: `powerbi/`, handover guide section 6)
- [ ] Redis + BullMQ job queue
- [ ] Cloud deployment (steps in the handover guide, section 8)
- [ ] Starter-code upload in the UI (the ML service already supports it)

## Acknowledgements

Winnowing: Schleimer, Wilkerson, Aiken, "Winnowing: Local Algorithms for Document
Fingerprinting", SIGMOD 2003. Libraries: Pygments, scikit-learn, FastAPI, Express,
React, Bootstrap, d3-force. AI assistance: (describe here what was AI-assisted, as the
project guidelines require).
