"""Builds demo zips in ../sample-data that look like a class's submissions.

Each class is different: some students do honest work, some hand in a disguised
copy of a classmate, some hand in a lightly edited AI answer. The AI answers
themselves go into sample-data/ai-references so they can be added as references.
"""
import pathlib, zipfile
from obfuscate import obfuscate

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT.parents[1] / "sample-data"
(OUT / "ai-references").mkdir(parents=True, exist_ok=True)
# (source, disguise level). s1-s4 = honest independent work at level 0,
# a copy of a classmate at level 1-4. ai_1/ai_2 = an AI answer handed in.
PLANS = {
    "grades": [("s1", 0), ("s2", 0), ("s3", 0), ("s4", 0), ("s1", 1), ("s1", 3), ("ai_1", 1)],
    "matrix": [("s1", 0), ("s2", 0), ("s3", 0), ("s4", 0), ("s3", 2), ("s3", 4), ("s2", 1), ("ai_2", 2), ("ai_1", 0)],
    "words":  [("s1", 0), ("s2", 0), ("s3", 0), ("s4", 0), ("s4", 3)],
}

for problem, plan in PLANS.items():
    with zipfile.ZipFile(OUT / "ai-references" / f"{problem}_ai_references.zip", "w") as z:
        for f in sorted((ROOT / "ai_references" / problem).glob("*.py")):
            z.writestr(f.name, f.read_text())
    key = []
    with zipfile.ZipFile(OUT / f"{problem}_class_submissions.zip", "w") as z:
        for n, (orig, level) in enumerate(plan, start=1):
            folder = "ai_references" if orig.startswith("ai") else "originals"
            src = (ROOT / folder / problem / f"{orig}.py").read_text()
            code = src if level == 0 else obfuscate(src, level, seed=n)
            roll = f"BT24CSD{n:03d}"
            z.writestr(f"{roll}.py", code)
            if orig.startswith("ai"):
                key.append(f"{roll}: AI answer {orig}" + (f" (disguise level {level})" if level else " (unchanged)"))
            elif level == 0:
                key.append(f"{roll}: original work")
            else:
                key.append(f"{roll}: copy of BT24CSD00{orig[1]} (disguise level {level})")
    (OUT / f"{problem}_answer_key.txt").write_text("\n".join(key) + "\n")
print("done")
