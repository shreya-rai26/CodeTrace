"""Winnowing fingerprints (Schleimer, Wilkerson, Aiken, 2003).

The same algorithm family used by Stanford MOSS. Written from scratch here.
"""
import zlib
from dataclasses import dataclass


@dataclass
class Fingerprint:
    hashes: dict  # hash -> line numbers covered by that k-gram

    @property
    def keys(self):
        return set(self.hashes)


def fingerprint(tokens, k: int = 5, window: int = 4) -> Fingerprint:
    """tokens: list of (text, line). Returns the selected k-gram hashes."""
    if len(tokens) < k:
        return Fingerprint({})
    grams = []
    for i in range(len(tokens) - k + 1):
        text = "\x1f".join(t for t, _ in tokens[i:i + k])
        lines = (tokens[i][1], tokens[i + k - 1][1])
        grams.append((zlib.crc32(text.encode()), lines))

    selected = {}
    last_pick = -1
    for start in range(max(1, len(grams) - window + 1)):
        win = grams[start:start + window]
        # rightmost minimum, as in the paper
        m = min(range(len(win)), key=lambda j: (win[j][0], -j))
        idx = start + m
        if idx != last_pick:
            last_pick = idx
            h, (l1, l2) = grams[idx]
            selected.setdefault(h, []).extend(range(l1, l2 + 1))
    return Fingerprint(selected)


def structural_similarity(a: Fingerprint, b: Fingerprint, ignore=frozenset()):
    """Returns (score 0..1, matched lines in a, matched lines in b).

    Score is the mean of Jaccard and containment. Containment alone is
    fooled by tiny files, Jaccard alone is fooled by padding a copy with
    extra code, so we use both.
    """
    ka, kb = a.keys - ignore, b.keys - ignore
    if not ka or not kb:
        return 0.0, [], []
    shared = ka & kb
    jaccard = len(shared) / len(ka | kb)
    containment = len(shared) / min(len(ka), len(kb))
    lines_a = sorted({l for h in shared for l in a.hashes[h]})
    lines_b = sorted({l for h in shared for l in b.hashes[h]})
    return (jaccard + containment) / 2, lines_a, lines_b
