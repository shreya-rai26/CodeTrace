"""Runs the whole pipeline over one assignment's submissions."""
from collections import Counter
from itertools import combinations

from .clustering import find_clusters
from .semantic import similarity_matrix
from .tokenizer import tokenize
from .winnowing import fingerprint, structural_similarity

W_STRUCTURAL = 0.7
W_SEMANTIC = 0.3


def analyze(submissions, template=None, threshold=0.5, min_report=0.2,
            k=5, window=4):
    """submissions: list of dicts with id, filename, code and optionally reference."""
    tokens = [tokenize(s["code"], s["filename"]) for s in submissions]
    prints = [fingerprint(t, k, window) for t in tokens]

    # Fingerprints that come from starter code given by the teacher are not
    # evidence of copying, so they are ignored.
    ignore = set()
    if template and template.get("code"):
        ignore |= fingerprint(tokenize(template["code"], template.get("filename", "t.py")),
                              k, window).keys
    # Same for fingerprints nearly everybody has (boilerplate like main()).
    n = len(submissions)
    if n >= 8:
        df = Counter(h for p in prints for h in p.keys)
        ignore |= {h for h, c in df.items() if c / n > 0.7}
    ignore = frozenset(ignore)

    sem, backend = similarity_matrix([s["code"] for s in submissions], tokens)

    pairs, flagged = [], []
    for i, j in combinations(range(n), 2):
        # Two AI reference solutions resembling each other is not evidence of anything.
        if submissions[i].get("reference") and submissions[j].get("reference"):
            continue
        struct, la, lb = structural_similarity(prints[i], prints[j], ignore)
        semantic = float(sem[i][j])
        score = W_STRUCTURAL * struct + W_SEMANTIC * semantic
        if score < min_report:
            continue
        is_flagged = score >= threshold
        a, b = submissions[i]["id"], submissions[j]["id"]
        if is_flagged:
            flagged.append((a, b))
        pairs.append({
            "a": a, "b": b,
            "score": round(score, 4),
            "structural": round(struct, 4),
            "semantic": round(semantic, 4),
            "flagged": is_flagged,
            "lines_a": la, "lines_b": lb,
        })
    pairs.sort(key=lambda p: p["score"], reverse=True)

    return {
        "pairs": pairs,
        "clusters": find_clusters([s["id"] for s in submissions], flagged),
        "stats": {
            "submissions": n,
            "pairs_compared": n * (n - 1) // 2,
            "pairs_flagged": len(flagged),
            "threshold": threshold,
            "embedding_backend": backend,
        },
    }
