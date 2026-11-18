"""Loads sample-data/demo-classes into a running CodeTrace: creates a demo teacher,
one assignment per zip, uploads it and runs the analysis. Safe to run twice
(assignments that already exist are skipped). Normally started by seed-demo.bat."""
import json, os, pathlib, sys, time
import httpx

API = os.getenv("API_URL", "http://backend:4000") + "/api"
DATA = pathlib.Path(os.getenv("DEMO_DIR", "/tmp/sample-data/demo-classes"))
EMAIL, PASSWORD = "demo.teacher@codetrace.test", "demo-password-123"

with httpx.Client(timeout=60) as http:
    r = http.post(f"{API}/auth/register", json={"name": "Demo Teacher", "email": EMAIL, "password": PASSWORD})
    if r.status_code == 409:
        r = http.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    if r.status_code >= 400:
        sys.exit(f"Could not sign in the demo teacher: {r.text}")
    http.headers["Authorization"] = f"Bearer {r.json()['token']}"

    existing = {(a["course_code"], a["title"]) for a in http.get(f"{API}/assignments").json()["assignments"]}
    for item in json.loads((DATA / "manifest.json").read_text()):
        if (item["course_code"], item["title"]) in existing:
            print(f"skip   {item['course_code']} {item['title']} (already loaded)")
            continue
        aid = http.post(f"{API}/assignments", json={"title": item["title"], "course_code": item["course_code"]}).json()["assignment"]["id"]
        zip_bytes = (DATA / item["file"]).read_bytes()
        up = http.post(f"{API}/assignments/{aid}/submissions", files={"file": (item["file"], zip_bytes, "application/zip")})
        if up.status_code >= 400:
            sys.exit(f"Upload failed for {item['file']}: {up.text}")
        ref_zip = (DATA / item["references"]).read_bytes()
        http.post(f"{API}/assignments/{aid}/references", files={"file": ("references.zip", ref_zip, "application/zip")})
        http.post(f"{API}/assignments/{aid}/analyze", json={})
        for _ in range(120):
            a = http.get(f"{API}/assignments/{aid}").json()
            if a["assignment"]["status"] in ("done", "failed"):
                break
            time.sleep(0.5)
        students = [s for s in a["submissions"] if not s["is_reference"]]
        flagged = sum(1 for s in students if s["cluster_id"])
        print(f"{a['assignment']['status']:6} {item['course_code']} {item['title']}: "
              f"{flagged} of {len(students)} students flagged")
print(f"\nDemo data loaded. Sign in as {EMAIL} / {PASSWORD} to see it.")
