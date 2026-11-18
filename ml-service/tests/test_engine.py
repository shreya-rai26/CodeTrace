import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "benchmark"))

from fastapi.testclient import TestClient
from app.analyzer import analyze
from app.main import app
from app.tokenizer import tokenize
from obfuscate import obfuscate

ORIG = pathlib.Path(__file__).resolve().parents[1] / "benchmark" / "originals"
A = (ORIG / "grades" / "s1.py").read_text()
B = (ORIG / "grades" / "s2.py").read_text()
C = (ORIG / "grades" / "s3.py").read_text()


def subs(*codes):
    return [{"id": i + 1, "filename": f"s{i}.py", "code": c} for i, c in enumerate(codes)]


def test_renaming_does_not_change_tokens():
    assert [t for t, _ in tokenize("total = a + 1  # hi")] == \
           [t for t, _ in tokenize("x = yy + 42")]


def test_identical_files_score_one():
    r = analyze(subs(A, A, B))
    assert r["pairs"][0]["score"] > 0.99 and r["pairs"][0]["flagged"]


def test_disguised_copy_is_flagged_and_independent_is_not():
    r = analyze(subs(A, obfuscate(A, 4, seed=3), B, C))
    flagged = {(p["a"], p["b"]) for p in r["pairs"] if p["flagged"]}
    assert flagged == {(1, 2)}
    assert r["clusters"] == [[1, 2]]


def test_template_code_is_ignored():
    with_t = analyze(subs(A, A + "\nprint(1)\n", B), template={"filename": "t.py", "code": A})
    assert not any(p["flagged"] for p in with_t["pairs"])


def test_ai_references_are_compared_with_students_only():
    ai = (ORIG.parent / "ai_references" / "grades" / "ai_1.py").read_text()
    items = subs(A, B, obfuscate(ai, 2, seed=5), ai, ai)
    items[3]["reference"] = items[4]["reference"] = True
    r = analyze(items)
    pairs = {(p["a"], p["b"]): p["flagged"] for p in r["pairs"]}
    assert (4, 5) not in pairs                      # reference vs reference is skipped
    assert pairs[(3, 4)] and pairs[(3, 5)]          # the student who used the AI answer is flagged
    assert not pairs.get((1, 4), False) and not pairs.get((2, 4), False)   # honest students are not


def test_boundary_inputs():
    r = analyze(subs("", "x=1", A))          # empty and tiny files must not crash
    assert r["stats"]["pairs_flagged"] == 0
    r = analyze(subs("def f(:\n  !!", A, B))  # syntax errors must not crash
    assert r["stats"]["submissions"] == 3


def test_api_validation():
    c = TestClient(app)
    assert c.get("/health").json() == {"status": "ok"}
    assert c.post("/analyze", json={"submissions": []}).status_code == 422
    assert c.post("/analyze", json={"submissions": subs(A, A), "threshold": 5}).status_code == 422
    assert c.post("/analyze", json={"submissions": subs(A, A)}).json()["stats"]["pairs_flagged"] == 1
