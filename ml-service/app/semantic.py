"""Second-opinion similarity based on vector representations of the code.

Two backends:
  tfidf    (default) TF-IDF over normalised token n-grams. No downloads.
  codebert Mean-pooled CodeBERT/UniXcoder embeddings. Needs torch +
           transformers and a one-time model download (~500 MB).

Select with the EMBEDDING_BACKEND environment variable.
"""
import os
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

BACKEND = os.getenv("EMBEDDING_BACKEND", "tfidf").lower()
MODEL_NAME = os.getenv("EMBEDDING_MODEL", "microsoft/unixcoder-base")
_model = None


def _tfidf_matrix(token_streams):
    docs = [" ".join(t for t, _ in toks) for toks in token_streams]
    vec = TfidfVectorizer(analyzer="word", token_pattern=r"\S+", ngram_range=(1, 3),
                          lowercase=False, sublinear_tf=True)
    return cosine_similarity(vec.fit_transform(docs))


def _codebert_matrix(codes):
    global _model
    import torch
    from transformers import AutoModel, AutoTokenizer
    if _model is None:
        _model = (AutoTokenizer.from_pretrained(MODEL_NAME),
                  AutoModel.from_pretrained(MODEL_NAME).eval())
    tok, model = _model
    vecs = []
    with torch.no_grad():
        for code in codes:
            enc = tok(code, return_tensors="pt", truncation=True, max_length=512)
            hidden = model(**enc).last_hidden_state[0]
            vecs.append(hidden.mean(dim=0).numpy())
    m = np.vstack(vecs)
    # Raw transformer embeddings of code all sit close together, so every pair
    # looks ~0.9 similar. Centring on the batch mean spreads them out.
    if len(m) > 2:
        m = m - m.mean(axis=0, keepdims=True)
    sim = cosine_similarity(m)
    return np.clip(sim, 0.0, 1.0)


def similarity_matrix(codes, token_streams):
    """Returns (n x n matrix of 0..1 scores, backend actually used)."""
    if len(codes) < 2:
        return np.ones((len(codes), len(codes))), BACKEND
    if BACKEND == "codebert":
        try:
            return _codebert_matrix(codes), "codebert"
        except Exception as exc:  # missing packages, no internet for the model...
            print(f"[semantic] CodeBERT unavailable ({exc}); using TF-IDF")
    return _tfidf_matrix(token_streams), "tfidf"
