r"""
Game Engine Microservice (FastAPI)
Manages Debate Quiz sessions, Team A vs Team B scoreboard, Buzzer lock, and Non-Repeating Question History.
Runs inside D:\UIT-HK7\.venv without installing any external packages.
Port: 4001
"""
import json
import os
import random
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="LawGame Debate Engine Service",
    description="Quản lý phòng chơi, trạng thái ván đấu, bộ đếm câu hỏi không trùng lặp và bảng điểm 2 đội",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
QUESTIONS_FILE = DATA_DIR / "questions_irac.json"
QUESTIONS_DIR = DATA_DIR / "questions"
HISTORY_FILE = DATA_DIR / "asked_history.json"
AI_GRADING_URL = os.environ.get("AI_GRADING_URL", "http://localhost:4002")

SESSIONS: Dict[str, Dict[str, Any]] = {}


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


def load_questions() -> List[Dict[str, Any]]:
    if QUESTIONS_FILE.exists():
        with open(QUESTIONS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data["questions"] if isinstance(data, dict) and "questions" in data else data
    return []


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


@app.get("/health")
def health():
    questions = load_questions()
    asked = load_asked_history()
    return {
        "service": "game-engine-service",
        "runtime": "python-fastapi",
        "status": "ok",
        "totalQuestionsInBank": len(questions),
        "askedHistoryCount": len(asked),
        "activeSessions": len(SESSIONS),
    }


@app.get("/api/history")
def get_history():
    questions = load_questions()
    asked = load_asked_history()
    return {
        "askedIds": asked,
        "askedCount": len(asked),
        "remainingCount": max(0, len(questions) - len(asked)),
        "totalQuestions": len(questions),
    }


@app.post("/api/history/reset")
def reset_history():
    save_asked_history([])
    return {
        "status": "reset",
        "askedIds": [],
        "message": "Đã xóa lịch sử câu hỏi đã xuất hiện. Toàn bộ 237 câu hỏi sẵn sàng cho ván mới!",
    }


@app.post("/api/game/start")
def start_game(req: StartGameRequest):
    index_items = load_question_index()
    server_asked = load_asked_history()
    combined_excluded = set(server_asked) | set(int(x) for x in req.clientAskedIds)

    pool = [q for q in index_items if int(q["id"]) not in combined_excluded]
    if req.difficultyFilter and req.difficultyFilter not in ("all", "ALL"):
        pool = [
            q for q in pool
            if q.get("difficulty") == req.difficultyFilter or q.get("difficultyLabel") == req.difficultyFilter
        ]

    count = req.questionCount if req.questionCount in (10, 20, 30) else max(1, min(30, req.questionCount))
    random.shuffle(pool)

    if len(pool) < count:
        pool_ids = set(int(q["id"]) for q in pool)
        recycled = [q for q in index_items if int(q["id"]) not in pool_ids]
        if req.difficultyFilter and req.difficultyFilter not in ("all", "ALL"):
            recycled = [
                q for q in recycled
                if q.get("difficulty") == req.difficultyFilter or q.get("difficultyLabel") == req.difficultyFilter
            ]
        random.shuffle(recycled)
        pool = pool + recycled

    selected_meta = pool[:count]
    selected = []
    for meta in selected_meta:
        full_q = load_single_question(int(meta["id"]))
        if full_q:
            selected.append(full_q)
        else:
            selected.append(meta)

    save_asked_history(list(combined_excluded) + [int(q["id"]) for q in selected])

    team_a_cfg = req.teamA or {}
    team_b_cfg = req.teamB or {}
    settings_cfg = req.settings or {}

    session_id = str(uuid.uuid4())
    session = {
        "sessionId": session_id,
        "createdAt": datetime.utcnow().isoformat(),
        "status": "in_progress",
        "currentQuestionIndex": 0,
        "questionCount": len(selected),
        "questions": selected,
        "buzzerWinner": None,
        "buzzerTimestamp": None,
        "teamA": {
            "id": "A",
            "name": team_a_cfg.get("name", "Đội A — Sao Khuê"),
            "avatar": team_a_cfg.get("avatar", "⚖️"),
            "score": 0.0,
            "correctCount": 0,
        },
        "teamB": {
            "id": "B",
            "name": team_b_cfg.get("name", "Đội B — Tinh Vân"),
            "avatar": team_b_cfg.get("avatar", "🏛️"),
            "score": 0.0,
            "correctCount": 0,
        },
        "settings": {
            "keyTeamA": settings_cfg.get("keyTeamA", "F"),
            "keyTeamB": settings_cfg.get("keyTeamB", "J"),
            "voiceTimeSeconds": int(settings_cfg.get("voiceTimeSeconds", 30)),
            "textTimeSeconds": int(settings_cfg.get("textTimeSeconds", 120)),
            "soundEnabled": bool(settings_cfg.get("soundEnabled", True)),
        },
        "roundsHistory": [],
    }
    SESSIONS[session_id] = session
    return session


@app.get("/api/game/{session_id}")
def get_game(session_id: str):
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng chơi")
    return SESSIONS[session_id]


@app.post("/api/game/{session_id}/buzz")
def buzz_in(session_id: str, req: BuzzRequest):
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng chơi")
    session = SESSIONS[session_id]
    if req.teamId not in ("A", "B"):
        raise HTTPException(status_code=400, detail="teamId phải là 'A' hoặc 'B'")
    if not session["buzzerWinner"]:
        session["buzzerWinner"] = req.teamId
        session["buzzerTimestamp"] = datetime.utcnow().isoformat()
    return {
        "buzzerWinner": session["buzzerWinner"],
        "buzzerTimestamp": session["buzzerTimestamp"],
    }


@app.post("/api/game/{session_id}/submit")
async def submit_answer(session_id: str, req: SubmitAnswerRequest):
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng chơi")
    session = SESSIONS[session_id]
    idx = session["currentQuestionIndex"]
    if idx >= len(session["questions"]):
        raise HTTPException(status_code=400, detail="Không còn câu hỏi hiện tại")

    current_q = session["questions"][idx]
    grade_result = None

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.post(
                f"{AI_GRADING_URL}/api/grade",
                json={
                    "questionId": current_q["id"],
                    "questionData": current_q,
                    "playerAnswer": req.playerAnswer,
                },
            )
            if resp.status_code == 200:
                grade_result = resp.json()
        except Exception:
            pass

    active_team = session["teamB"] if req.teamId == "B" else session["teamA"]
    earned = float(grade_result.get("earnedPoints", 0.0)) if grade_result else 0.0
    active_team["score"] = round(active_team["score"] + earned, 1)
    if grade_result and grade_result.get("accuracyPercent", 0) >= 50:
        active_team["correctCount"] += 1

    round_rec = {
        "roundNumber": idx + 1,
        "questionId": current_q["id"],
        "questionNumber": current_q["question_number"],
        "question": current_q["question"],
        "difficulty": current_q["difficulty"],
        "maxPoints": current_q["points"],
        "teamId": active_team["id"],
        "teamName": active_team["name"],
        "answerMode": req.answerMode,
        "playerAnswer": req.playerAnswer,
        "gradeResult": grade_result,
    }
    session["roundsHistory"].append(round_rec)
    return {
        "roundRecord": round_rec,
        "teamA": session["teamA"],
        "teamB": session["teamB"],
    }


@app.post("/api/game/{session_id}/next")
def next_question(session_id: str):
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng chơi")
    session = SESSIONS[session_id]
    session["buzzerWinner"] = None
    session["buzzerTimestamp"] = None
    if session["currentQuestionIndex"] + 1 < len(session["questions"]):
        session["currentQuestionIndex"] += 1
    else:
        session["status"] = "completed"
    return session


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 4001))
    uvicorn.run(app, host="0.0.0.0", port=port)
