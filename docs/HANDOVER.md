# CodeTrace Handover

17 November 2026. Is document mein sab kuch hai: project kya hai, kaise chalana hai, kya ban chuka hai, aur baaki kaam step by step.

## 1. Project kya hai

CodeTrace ek website hai jo class ke programming assignments mein copied code pakadti hai, chahe copy ko variable names badal ke, functions reorder karke, comments ya dead code daal ke chhupaya gaya ho. Ye CSP 301 (Tools and Practices for Data Science III) ke main evaluation ka project hai.

Teacher ek zip upload karta hai. System har do students ka code compare karta hai, copy karne wale groups dikhata hai, aur do files ko side by side kholta hai jismein matching lines yellow highlight hoti hain.

1. **Frontend** (React + Bootstrap) se zip upload hoti hai.
2. **Backend** (Node + Express) zip kholta hai aur submissions PostgreSQL mein save karta hai.
3. **ML service** (Python FastAPI) har pair ka similarity score nikalti hai.
4. Results PostgreSQL mein save hote hain; frontend unhe graph aur table mein dikhata hai.
5. Teacher AI tools se nikale hue solutions "AI reference" ke roop mein add kar sakta hai. Jis student ka code unse match kare woh alag se dikhta hai.
6. **Power BI** usi database se dashboards banata hai.

Score do cheezon se banta hai: 70% fingerprint overlap (Winnowing algorithm, jis family ka algorithm Stanford MOSS mein hai) aur 30% vector similarity (TF-IDF). Default 50% se upar wale pairs flag hote hain.

## 2. Package mein kya hai

| File / folder | Kya hai |
| --- | --- |
| `start.bat`, `stop.bat` | Double-click se project chalu / band |
| `seed-demo.bat` | Demo classes load karta hai aur Power BI views banata hai |
| `docker-compose.yml` | Chaar services: db, ml, backend, frontend |
| `frontend/` | React website |
| `backend/` | Express API; tables `db/schema.sql` mein |
| `ml-service/app/` | Tokenizer, winnowing, vectors, clustering |
| `ml-service/tests/` | 7 automated tests |
| `ml-service/benchmark/` | Accuracy benchmark aur demo data generators |
| `sample-data/` | 3 demo zips (alag-alag results wali) + answer keys |
| `sample-data/ai-references/` | Har problem ke 2 AI-written solutions, reference ke liye |
| `sample-data/demo-classes/` | 9 class zips (3 courses x 3 labs) + answer keys |
| `powerbi/views.sql` | Power BI ke liye reporting tables aur read-only login |
| `powerbi/*.csv` | Benchmark ke numbers, Model performance dashboard ke liye |
| `docs/screenshots/` | PPT ke liye 4 screenshots |
| `.github/workflows/ci.yml` | GitHub Actions: tests + benchmark + frontend build |

## 3. Kaise chalana hai

Sirf Docker Desktop chahiye. Python, Node ya PostgreSQL alag se install nahi karna.

1. Docker Desktop khol aur "Engine running" dikhne tak wait kar.
2. Zip ko `C:\projects\codetrace` jaisi simple jagah par extract kar.
3. `start.bat` par double-click kar. Pehli baar 5-10 minute lagte hain. Browser mein `http://localhost:8080` khulega.
4. `seed-demo.bat` par double-click kar. Ye 9 demo classes load karke analyse karta hai aur Power BI views bana deta hai.
5. Website par `demo.teacher@codetrace.test` / `demo-password-123` se login kar. 9 assignments dikhenge.

Khud test karna ho toh naya account bana, naya assignment bana, `sample-data\matrix_class_submissions.zip` upload kar, phir "Add AI reference solutions" se `sample-data\ai-references\matrix_ai_references.zip` add kar aur "Run analysis" daba. Result: 9 mein se 5 students ka code kisi doosre student se match karta hai aur 2 ka AI reference se. `matrix_answer_key.txt` se match kar lena.

Teeno sample zips ke results alag hain: grades mein 7 students (3 copy group mein, 1 AI), matrix mein 9 (5 aur 2), words mein 5 (2 aur 0).

Band karne ke liye `stop.bat`. Data delete nahi hota.

## 4. Quick reference

| Cheez | Value |
| --- | --- |
| Website | `http://localhost:8080` |
| Demo teacher login | `demo.teacher@codetrace.test` / `demo-password-123` |
| Database (Power BI ke liye) | Server `localhost:5433`, database `codetrace` |
| Power BI login (read-only) | `powerbi` / `powerbi_readonly` |
| Database admin login | `codetrace` / `.env` file ka `DB_PASSWORD` |

`.env` file kisi ko mat bhejna aur GitHub par push mat karna. Usmein secret hai; `.gitignore` mein already hai. Demo passwords sirf local laptop ke liye hain; cloud par naye rakhna.

## 5. Kya ban gaya aur kya test hua

| Hissa | Status | Test |
| --- | --- | --- |
| ML service (fingerprints, vectors, clustering) | Ban gaya | 7 automated tests pass; benchmark chala |
| Backend API + PostgreSQL | Ban gaya | Real database par end-to-end; galat inputs par clean errors |
| Frontend (4 screens) | Ban gaya | Real browser mein, desktop aur mobile size |
| Docker Compose + `start.bat` | Ban gaya | Windows laptop par chala, charon containers Up |
| AI reference comparison | Ban gaya | Automated test + browser mein end-to-end; purane database par migration bhi test hua |
| 3 sample zips (naye) | Ban gaya | Linux par answer key se match; Windows par purane version hi chale the |
| 9 demo classes + seed script | Ban gaya | Script Linux par chali (9 assignments, 58 submissions, 6 AI wale students sab pakde gaye). `seed-demo.bat` Windows par abhi nahi chali |
| Power BI views | Ban gaya | PostgreSQL par test; read-only login passwords wali table nahi padh sakta |
| Cloud ke liye code changes | Ban gaya | Frontend build test hua; asli deployment abhi nahi hua |
| CodeBERT vectors | Code likha hai | Kahin test nahi hua |
| AI-likelihood classifier (style se pehchaan) | Nahi bana | Optional, section 9 dekh |

Benchmark: 3 problems x 4 independent solutions, har ek ki 4 disguised copies (60 files, 570 pairs). Default threshold 0.5 par 120 mein se 120 copied pairs pakde gaye, 0 false flags. Do independent solutions ka sabse zyada score 0.35 tha. Ye number synthetic data ka hai; section 11 zaroor padhna.

## 6. Power BI dashboards (Module 1)

Power BI Desktop free hai (Microsoft Store se) aur sirf Windows par chalta hai. Pehle `start.bat` aur `seed-demo.bat` chala lena.

### 6.1 Data connect kar

1. **Home > Get data > More > PostgreSQL database**.
2. Server `localhost:5433`, database `codetrace`, mode **Import**, OK.
3. "Database" tab mein username `powerbi`, password `powerbi_readonly`. Encryption wala popup aaye toh OK.
4. `bi.` se shuru hone wali chhe tables tick karke **Load**.
5. Data pane mein har table ko rename karke naam se `bi ` hata de (jaise `fact_match`).
6. **Get data > Text/CSV** se `powerbi\benchmark_sweep.csv` aur `powerbi\benchmark_by_disguise.csv` bhi load kar.

| Table | Ek row matlab |
| --- | --- |
| `dim_assignment` | Ek assignment (title, course, threshold, analysis time) |
| `dim_student` | Ek student (roll number) |
| `dim_cluster` | Ek copy group |
| `fact_submission` | Ek student ka ek submission (max score, `matches_student`, `matches_ai_reference`) |
| `fact_match` | Ek compared pair (score, flagged, score band) |
| `fact_student_match` | Wahi pair, har student ki taraf se ek row |

### 6.2 Relationships (Model view)

Ek table ke column ko doosri table ke same column par drag kar. Ye chhe lines honi chahiye:

| Kahan se | Kahan tak | Column |
| --- | --- | --- |
| `dim_assignment` | `fact_submission` | `assignment_id` |
| `dim_assignment` | `fact_match` | `assignment_id` |
| `dim_assignment` | `fact_student_match` | `assignment_id` |
| `dim_student` | `fact_submission` | `student_ref` |
| `dim_student` | `fact_student_match` | `student_ref` |
| `dim_cluster` | `fact_submission` | `cluster_id` |

### 6.3 Measures

`fact_submission` par right-click, **New measure**, ek-ek karke:

```
Total Submissions = COUNTROWS(fact_submission)
Students In Groups = CALCULATE(COUNTROWS(fact_submission), fact_submission[in_group] = TRUE())
Flagged Rate = DIVIDE([Students In Groups], [Total Submissions])
Groups = DISTINCTCOUNTNOBLANK(fact_submission[cluster_id])
Flagged Pairs = CALCULATE(COUNTROWS(fact_match), fact_match[flagged] = TRUE())
Avg Similarity = AVERAGE(fact_match[score])
Avg Analysis ms = AVERAGE(dim_assignment[analysis_ms])
Copied From Student = CALCULATE(COUNTROWS(fact_submission), fact_submission[matches_student] = TRUE())
AI Matches = CALCULATE(COUNTROWS(fact_submission), fact_submission[matches_ai_reference] = TRUE())
```

`Flagged Rate` aur `Avg Similarity` ka format **Percentage** kar de.

### 6.4 Paanch dashboards (har ek alag page)

| Page | Kiske liye | Visuals |
| --- | --- | --- |
| Instructor | Teacher, ek assignment | Slicer `dim_assignment[title]`; cards: Total Submissions, Copied From Student, AI Matches, Flagged Rate; column chart `fact_match[score_band]` vs count of `match_id`; table `student_a`, `student_b`, `score`, `structural`, `semantic` (filter `flagged` = True); bar chart `student_ref` vs max of `max_score` |
| Student profile | Ek student | Slicer `dim_student[student_ref]`; table `other_student`, `score`, `flagged` from `fact_student_match`; column chart `dim_assignment[title]` vs `max_score`; card Students In Groups (kitni baar flag hua) |
| Department overview | HOD | Bar chart `course_code` vs Flagged Rate; stacked column `course_code` vs Copied From Student aur AI Matches; column chart `title` vs Flagged Pairs; matrix: rows `course_code`, columns `title`, values Flagged Rate |
| Model performance | Evaluator | Line chart from `benchmark_sweep`: X `threshold`, Y `precision` aur `recall`; bar chart from `benchmark_by_disguise`: `disguise` vs `caught` aur `total`; card: F1 at 0.5 |
| System | Admin | Cards: Total Submissions, Avg Analysis ms; donut `fact_submission[language]`; bar `title` vs `submission_count` |

Power BI ke features jo dikhane hain: star schema model, DAX measures, slicers, aur Instructor se Student profile par drill-through (Student profile page ke Drill through box mein `student_ref` daal).

### 6.5 Publish

Power BI Service par publish karne ke liye work ya school email chahiye, toh college ID se sign in try kar. "Publish to web" free license par chale ya na chale, ye college ke admin settings par depend karta hai. Na chale toh dashboards Power BI Desktop mein live dikhana aur PDF export (File > Export > PDF) report mein lagana.

## 7. GitHub (Module 4)

Git install karke codetrace folder mein:

```
git init
git add .
git commit -m "CodeTrace: plagiarism detection platform"
git branch -M main
git remote add origin https://github.com/<username>/codetrace.git
git push -u origin main
```

Uske baad har naya kaam alag branch mein kar (`git checkout -b powerbi-dashboards`), push kar, aur GitHub par pull request se merge kar. Push ke baad Actions tab mein CI green hona chahiye. Commit history hi individual contribution ka proof hai, isliye chhote-chhote commits karna.

## 8. Free cloud deployment (Module 4)

Sab free hai, credit card nahi lagta. Ye steps abhi kisi ne chala ke test nahi kiye; code unke liye ready hai.

1. **Database:** neon.com par account bana, ek project bana, aur connection string copy kar. Render ka free database mat lena, woh 30 din baad delete ho jaata hai.
2. **ML service:** render.com par New > Web Service, GitHub repo chun, Root Directory `ml-service`, Runtime Docker, Instance Free.
3. **Backend:** phir se New > Web Service, Root Directory `backend`, Runtime Docker, Instance Free. Environment variables:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon ki connection string |
| `JWT_SECRET` | Koi lamba random string (16+ characters) |
| `ML_SERVICE_URL` | ML service ka Render URL |
| `CORS_ORIGIN` | Frontend ka URL (step 4 ke baad daalna) |

4. **Frontend:** New > Static Site, Root Directory `frontend`, Build Command `npm install && npm run build`, Publish Directory `dist`, environment variable `VITE_API_URL` = backend ka Render URL. Redirects/Rewrites mein `/*` ko `/index.html` par Rewrite kar.

Free services 15 minute idle rehne par so jaati hain aur jaagne mein lagbhag 1 minute lagta hai. Demo se 5 minute pehle site khol ke ek analysis chala lena. Cloud wali ML service par koi login nahi hai; demo ke baad services delete ya suspend kar dena.

## 9. Optional extras

- **AI-likelihood classifier:** AI reference comparison ban chuka hai. Isse aage ka step ek model hai jo sirf code ke style se (comments, naming, formatting) bataye ki code AI jaisa lagta hai. Iske liye human aur AI solutions ka dataset banana padega. Ye shuru nahi hua; ise future scope mein likho.
- **CodeBERT:** `pip install -r ml-service/requirements-codebert.txt`, phir `EMBEDDING_BACKEND=codebert` set karke benchmark dobara chala. Sirf laptop par chalega; free cloud server ki 512 MB RAM kam hai.
- **Job queue (Redis + BullMQ):** abhi analysis backend ke andar hi chalti hai. Chhoti classes ke liye theek hai.

## 10. Submissions

- [ ] PPT, 9 slides, guidelines ke structure mein (screenshots `docs/screenshots/` mein hain)
- [ ] Four-module mapping table (neeche ready hai)
- [ ] Final report
- [ ] Working demo ki practice

| Module | Syllabus concept | CodeTrace mein kahan |
| --- | --- | --- |
| 1. Dashboards | BI tool, data connection, charts, deployment | Power BI ke 5 dashboards, live PostgreSQL connection, star schema views (`powerbi/views.sql`) |
| 2. Front end | Responsive UI, design patterns, UI controls aur dialogs, Bootstrap | React + Bootstrap, 4 screens, dialog, slider, drag-drop upload, mobile layout (`frontend/`) |
| 3. Back end | Web servers, HTTP requests, SQL databases, Node + Express | Express REST API, JWT auth, PostgreSQL schema with 6 tables (`backend/`) |
| 4. Git + deployment | Git, push/pull, Docker, cloud platforms | GitHub repo + CI, Docker Compose with 4 services, Neon + Render deployment |
| Syllabus se aage | Machine learning | Winnowing fingerprints, TF-IDF vectors, cosine similarity, clustering, AI reference comparison; measured benchmark (`ml-service/`) |

Demo ka order: login, naya assignment, zip upload, AI references add, analysis, graph, ek student-student pair aur ek student-AI pair khol ke highlighted lines, answer key se match, aakhir mein Power BI dashboards.

## 11. Limits aur jo claim nahi karna

Guidelines ka point 10 kehta hai "present honestly", aur ye project khud plagiarism pakadta hai, isliye in cheezon par sawaal zaroor aayenge.

- **"100% accuracy" mat bolna.** Benchmark chhota aur synthetic hai: solutions jaan-boojh kar alag styles mein likhe gaye aur disguises script se bane. Sahi line: "synthetic benchmark par 120 mein se 120 copies pakdi gayi; real class data par false flags aayenge".
- **Flag saboot nahi hai.** Flag sirf kehta hai ki do files khol ke padho. Faisla teacher ka hai.
- **Jisse copy hua woh bhi group mein aata hai.** System ye nahi bata sakta ki kisne kisse copy kiya.
- **AI wala hissa "AI detector" nahi hai.** Ye sirf un answers ko pakadta hai jo upload kiye gaye AI references se milte hain. Student ne alag prompt ya alag tool use kiya toh miss ho sakta hai. Sahi naam: "AI reference comparison".
- **Honest aur AI code ka gap chhota hai.** Test mein honest student aur AI reference ka sabse zyada score 0.44 tha, threshold 0.50 hai. Chhote, simple assignments mein honest student bhi flag ho sakta hai.
- **Algorithm badal ke likhi copy nahi pakdi jaati,** jaise loop ko recursion bana dena.
- **Bahut chhote programs** (lagbhag 15 lines se kam) par score bharosemand nahi hai.
- **CodeBERT ko "use kiya" mat likhna** jab tak woh chala ke measure na ho jaye. Default TF-IDF hai.
- **Dashboards ka data synthetic hai,** real students ka nahi. Report mein ye likhna.

Guidelines ke point 6 ke hisaab se report mein ye bhi likhna hai: Winnowing ka paper (Schleimer, Wilkerson, Aiken, SIGMOD 2003), use ki gayi libraries, aur kaunsa hissa AI ki madad se bana. README ke Acknowledgements section mein iski jagah hai.

## 12. Viva ki tayyari

Point 9 ke hisaab se har student ko poora project samajhna hai. Har jawab ke saath file ka naam hai; code khol ke khud dekh lena.

| Sawaal | Chhota jawab | File |
| --- | --- | --- |
| Naam badalne par bhi copy kaise pakdi jaati hai? | Tokenizer har identifier ko `ID` bana deta hai aur comments hata deta hai | `ml-service/app/tokenizer.py` |
| Winnowing kya karta hai? | Tokens ke 5-5 ke groups ka hash banata hai, phir har 4 ki window se sabse chhota hash chunta hai. Yehi fingerprints hain | `ml-service/app/winnowing.py` |
| Functions ka order badalne se farq kyun nahi padta? | Fingerprints ek set hain; set mein order nahi hota | `winnowing.py` |
| Score kaise banta hai? | 70% fingerprint overlap + 30% vector similarity; 50% se upar flag | `ml-service/app/analyzer.py` |
| Groups kaise bante hain? | Flagged pairs ko jod ke connected components (union-find) | `ml-service/app/clustering.py` |
| Starter code copy na gine, ye kaise? | Template ke fingerprints ignore hote hain; jo fingerprint 70% se zyada class mein ho woh bhi | `analyzer.py` |
| AI se liya code kaise pakadte ho? | Teacher AI ke answers reference ke roop mein upload karta hai; har student unse bhi compare hota hai. Reference-reference pairs skip hote hain | `ml-service/app/analyzer.py`, `backend/src/routes/assignments.js` |
| React kahan use hua? | Poori website: 4 pages aur graph component. `index.html` mein sirf ek khaali `div` hai; React usi mein poora UI banata hai | `frontend/src/` |
| Node aur Express kahan? | Backend API: login, upload, analysis shuru karna, results dena | `backend/src/` |
| ML kahan hai? | TF-IDF vectors + cosine similarity (scikit-learn), aur clustering | `ml-service/app/semantic.py` |
| Accuracy kaise naapi? | 12 original solutions ki 48 disguised copies bana ke precision aur recall nikala | `ml-service/benchmark/evaluate.py` |
| Password kaise store hota hai? | bcrypt hash, plain text kabhi nahi | `backend/src/routes/auth.js` |
| User kaise pehchana jaata hai? | JWT token, 8 ghante valid, har request ke header mein | `backend/src/middleware/auth.js` |
| Do baar "Run analysis" dabane par? | Doosri request ko 409 error; status check aur update ek hi SQL statement mein | `backend/src/routes/assignments.js` |
| Power BI ko alag login kyun? | Read-only role sirf `bi` schema padh sakta hai, users table nahi | `powerbi/views.sql` |

## 13. Agar atak jaye

| Problem | Fix |
| --- | --- |
| "Docker is not running" | Docker Desktop khol ke dobara `start.bat` |
| `port is already allocated` | `docker-compose.yml` mein `"5433:5432"` ko `"5434:5432"` kar; Power BI mein bhi wahi port daal |
| Browser mein 502 Bad Gateway | Backend band hai: `docker compose logs backend --tail 40` |
| `getaddrinfo ENOTFOUND db` | `docker compose down` phir `docker compose up -d` |
| `seed-demo.bat` fail | Pehle `docker compose ps` mein charon containers "Up" hone chahiye |
| Power BI connect nahi ho raha | Port 5433, mode Import, "Database" tab wala login; `seed-demo.bat` chala ho |
| Kuch bhi ajeeb | `stop.bat`, phir `start.bat` |
