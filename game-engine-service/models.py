"""
Model Layer (Schemas & Data Access) for Game Engine Microservice
"""
import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel

from config import DATA_DIR, HISTORY_FILE, QUESTIONS_DIR, QUESTIONS_FILE


class StartGameRequest(BaseModel):
    teamA: Optional[Dict[str, Any]] = None
    teamB: Optional[Dict[str, Any]] = None
    questionCount: int = 10
    difficultyFilter: str = "all"
    clientAskedIds: List[int] = []
    settings: Optional[Dict[str, Any]] = None


class BuzzRequest(BaseModel):
    teamId: str


class SubmitAnswerRequest(BaseModel):
    teamId: str
    playerAnswer: str = ""
    answerMode: str = "text"


def load_questions() -> List[Dict[str, Any]]:
    if QUESTIONS_FILE.exists():
        with open(QUESTIONS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data["questions"] if isinstance(data, dict) and "questions" in data else data
    return []


def load_question_index() -> List[Dict[str, Any]]:
    index_file = QUESTIONS_DIR / "index.json"
    if index_file.exists():
        with open(index_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("index", [])
    return load_questions()


def load_single_question(qid: int) -> Optional[Dict[str, Any]]:
    qfile = QUESTIONS_DIR / f"q{int(qid):03d}.json"
    if qfile.exists():
        with open(qfile, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def load_asked_history() -> List[int]:
    if HISTORY_FILE.exists():
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return [int(x) for x in data.get("askedIds", [])]
        except Exception:
            return []
    return []


def save_asked_history(asked_ids: List[int]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    unique_ids = sorted(list(set(int(x) for x in asked_ids)))
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(
            {"askedIds": unique_ids, "updatedAt": datetime.utcnow().isoformat()},
            f,
            ensure_ascii=False,
            indent=2,
        )
