"""
Service Layer: Match Session, Buzzer Lock & Non-Repeating Question Pool Logic
"""
import random
import uuid
from datetime import datetime
from typing import Any, Dict

import httpx
from fastapi import HTTPException

from config import AI_GRADING_URL
from models import (
    BuzzRequest,
    StartGameRequest,
    SubmitAnswerRequest,
    load_asked_history,
    load_question_index,
    load_single_question,
    save_asked_history,
)

SESSIONS: Dict[str, Dict[str, Any]] = {}


def create_match_session(req: StartGameRequest) -> Dict[str, Any]:
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
        selected.append(full_q if full_q else meta)

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
            "name": team_a_cfg.get("name", "Đội Công Lý (A)"),
            "avatar": team_a_cfg.get("avatar", "⚖️"),
            "score": 0.0,
            "correctCount": 0,
        },
        "teamB": {
            "id": "B",
            "name": team_b_cfg.get("name", "Đội Thượng Tôn (B)"),
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


def get_session_or_404(session_id: str) -> Dict[str, Any]:
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng chơi")
    return SESSIONS[session_id]


def lock_buzzer(session_id: str, req: BuzzRequest) -> Dict[str, Any]:
    session = get_session_or_404(session_id)
    if req.teamId not in ("A", "B"):
        raise HTTPException(status_code=400, detail="teamId phải là 'A' hoặc 'B'")
    if not session["buzzerWinner"]:
        session["buzzerWinner"] = req.teamId
        session["buzzerTimestamp"] = datetime.utcnow().isoformat()
    return {
        "buzzerWinner": session["buzzerWinner"],
        "buzzerTimestamp": session["buzzerTimestamp"],
    }


async def evaluate_and_record_answer(session_id: str, req: SubmitAnswerRequest) -> Dict[str, Any]:
    session = get_session_or_404(session_id)
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
        "questionNumber": current_q.get("question_number", current_q.get("questionNumber")),
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


def advance_to_next_question(session_id: str) -> Dict[str, Any]:
    session = get_session_or_404(session_id)
    session["buzzerWinner"] = None
    session["buzzerTimestamp"] = None
    if session["currentQuestionIndex"] + 1 < len(session["questions"]):
        session["currentQuestionIndex"] += 1
    else:
        session["status"] = "completed"
    return session

