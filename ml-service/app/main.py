from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .analyzer import analyze

app = FastAPI(title="CodeTrace ML service", version="0.1.0")


class Submission(BaseModel):
    id: int
    filename: str
    code: str
    reference: bool = False  # an AI-generated reference solution, not a student


class Template(BaseModel):
    filename: str = "template.py"
    code: str = ""


class AnalyzeRequest(BaseModel):
    submissions: list[Submission]
    template: Optional[Template] = None
    threshold: float = Field(0.5, ge=0.05, le=1.0)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze")
def run_analysis(req: AnalyzeRequest):
    if len(req.submissions) < 2:
        raise HTTPException(422, "At least two submissions are needed to compare.")
    if len(req.submissions) > 400:
        raise HTTPException(413, "Too many submissions in one run (limit 400).")
    return analyze([s.model_dump() for s in req.submissions],
                   req.template.model_dump() if req.template else None,
                   req.threshold)
