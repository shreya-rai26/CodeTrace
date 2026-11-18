"""Measures how well the detector finds disguised copies.

For each problem: 4 independent solutions + 4 disguised copies of each one
(levels 1-4) = 20 files. A pair is a true positive if both files come from
the same original. Run:  python benchmark/evaluate.py
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent))
sys.path.insert(0, str(ROOT))

from app.analyzer import analyze  # noqa: E402
from obfuscate import obfuscate   # noqa: E402

LEVELS = {1: "rename", 2: "+reorder +comments", 3: "+dead code", 4: "+rewrite statements"}


def build(problem_dir):
    subs, meta = [], {}
    for f in sorted(problem_dir.glob("*.py")):
        src = f.read_text()
        for level in range(0, 5):
            code = src if level == 0 else obfuscate(src, level, seed=level * 7 + len(subs))
            compile(code, f.name, "exec")  # the copy must still be valid Python
            sid = len(subs) + 1
            subs.append({"id": sid, "filename": f"{f.stem}_L{level}.py", "code": code})
            meta[sid] = (f.stem, level)
    return subs, meta


def run(threshold):
    tp = fp = fn = tn = 0
    by_level = {l: [0, 0] for l in LEVELS}
    indep_scores, copy_scores = [], []
    for pdir in sorted((ROOT / "originals").iterdir()):
        subs, meta = build(pdir)
        result = analyze(subs, threshold=threshold, min_report=0.0)
        for p in result["pairs"]:
            (fam_a, la), (fam_b, lb) = meta[p["a"]], meta[p["b"]]
            same = fam_a == fam_b
            (copy_scores if same else indep_scores).append(p["score"])
            if same and p["flagged"]: tp += 1
            elif same: fn += 1
            elif p["flagged"]: fp += 1
            else: tn += 1
            if same and 0 in (la, lb):  # original vs its level-N copy
                lvl = max(la, lb)
                by_level[lvl][1] += 1
                by_level[lvl][0] += p["flagged"]
    prec = tp / (tp + fp) if tp + fp else 1.0
    rec = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
    return dict(threshold=threshold, tp=tp, fp=fp, fn=fn, tn=tn,
                precision=round(prec, 3), recall=round(rec, 3), f1=round(f1, 3),
                recall_by_level={LEVELS[l]: f"{c}/{t}" for l, (c, t) in by_level.items()},
                max_independent_score=max(indep_scores),
                min_copy_score=min(copy_scores))


if __name__ == "__main__":
    rows = [run(t / 100) for t in range(20, 85, 5)]
    print(f"{'thr':>5} {'TP':>4} {'FP':>4} {'FN':>4} {'TN':>4} {'prec':>6} {'rec':>6} {'F1':>6}")
    for r in rows:
        print(f"{r['threshold']:>5} {r['tp']:>4} {r['fp']:>4} {r['fn']:>4} {r['tn']:>4} "
              f"{r['precision']:>6} {r['recall']:>6} {r['f1']:>6}")
    default = run(0.5)
    print("\nAt the default threshold 0.5:")
    print(json.dumps(default, indent=2))
    (ROOT / "results.json").write_text(json.dumps({"sweep": rows, "default": default}, indent=2))
    # The same numbers as CSV, for the Power BI "Model performance" page.
    bi = ROOT.parents[1] / "powerbi"
    cols = ["threshold", "tp", "fp", "fn", "tn", "precision", "recall", "f1"]
    (bi / "benchmark_sweep.csv").write_text(
        ",".join(cols) + "\n" + "\n".join(",".join(str(r[c]) for c in cols) for r in rows) + "\n")
    (bi / "benchmark_by_disguise.csv").write_text(
        "disguise,caught,total\n" + "\n".join(
            f"{k},{v.split('/')[0]},{v.split('/')[1]}" for k, v in default["recall_by_level"].items()) + "\n")
