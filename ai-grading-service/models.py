"""
Model Layer (Schemas & Question Bank Data Access) for AI Grading Microservice
"""
import json
from typing import Any, Dict, List, Optional
from pydantic import BaseModel

from config import DATA_FILE, QUESTIONS_DIR


class GradeRequest(BaseModel):
    questionId: Optional[int] = None
    playerAnswer: str = ""
    questionData: Optional[Dict[str, Any]] = None
    question: Optional[Dict[str, Any]] = None


def load_questions() -> List[Dict[str, Any]]:
    if DATA_FILE.exists():
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data["questions"] if isinstance(data, dict) and "questions" in data else data
    return []


def load_question_by_id(qid: int) -> Optional[Dict[str, Any]]:
    single_file = QUESTIONS_DIR / f"q{int(qid):03d}.json"
    if single_file.exists():
        with open(single_file, "r", encoding="utf-8") as f:
            return json.load(f)
    for q in load_questions():
        if int(q.get("id", 0)) == int(qid):
            return q
    return None
