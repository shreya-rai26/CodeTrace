"""Builds a larger demo data set: 3 courses x 3 labs, 10 students per course.

Every lab has 4 honest students (independent solutions) and 0-4 students who
hand in a disguised copy, and 0-2 who hand in a lightly edited AI answer. Two students per course copy repeatedly, so the
per-student dashboard has something to show. Output: ../../sample-data/demo-classes
This is synthetic data for demonstrating dashboards, not real student work.
"""
import json, pathlib, random, zipfile
from obfuscate import obfuscate

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT.parents[1] / "sample-data" / "demo-classes"
OUT.mkdir(parents=True, exist_ok=True)
COURSES = [("CSP301", "BT24CSD", 1), ("CSL302", "BT24CSE", 41), ("CSL210", "BT25CSD", 81)]
LABS = [("grades", "Grade statistics"), ("matrix", "Matrix operations"), ("words", "Word frequency")]
COPIERS = [[3, 1, 2], [0, 2, 4], [1, 3, 0]]   # how many students copy, per course and lab
AI_USERS = [[1, 0, 1], [0, 1, 0], [2, 0, 1]]  # how many hand in an AI answer

rng = random.Random(2026)
manifest = []
for c, (course, prefix, first) in enumerate(COURSES):
    rolls = [f"{prefix}{first + i:03d}" for i in range(10)]
    for l, (problem, title) in enumerate(LABS):
        src = {f"s{i}": (ROOT / "originals" / problem / f"s{i}.py").read_text() for i in range(1, 5)}
        honest = [rolls[(l * 2 + i) % 8] for i in range(4)]           # rolls 0-7 take turns
        pool = [rolls[8], rolls[9]] + [r for r in rolls[:8] if r not in honest]
        files, key = {}, []
        for i, roll in enumerate(honest, start=1):
            files[roll] = src[f"s{i}"]
            key.append(f"{roll}: original work")
        for n, roll in enumerate(pool[:COPIERS[c][l]]):
            victim = rng.randint(1, 4)
            level = rng.randint(1, 4)
            files[roll] = obfuscate(src[f"s{victim}"], level, seed=rng.randint(0, 999))
            key.append(f"{roll}: copy of {honest[victim - 1]} (disguise level {level})")
        for roll in pool[COPIERS[c][l]:COPIERS[c][l] + AI_USERS[c][l]]:
            which, level = rng.randint(1, 2), rng.randint(0, 2)
            ai = (ROOT / "ai_references" / problem / f"ai_{which}.py").read_text()
            files[roll] = ai if level == 0 else obfuscate(ai, level, seed=rng.randint(0, 999))
            key.append(f"{roll}: AI answer ai_{which}" + (f" (disguise level {level})" if level else " (unchanged)"))
        name = f"{course}_lab{l + 1}_{problem}"
        with zipfile.ZipFile(OUT / f"{name}.zip", "w") as z:
            for roll, code in sorted(files.items()):
                z.writestr(f"{roll}.py", code)
        (OUT / f"{name}_answer_key.txt").write_text("\n".join(sorted(key)) + "\n")
        manifest.append({"file": f"{name}.zip", "course_code": course, "title": f"Lab {l + 1}: {title}",
                         "references": f"../ai-references/{problem}_ai_references.zip"})
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))
print(f"wrote {len(manifest)} class zips to {OUT}")
