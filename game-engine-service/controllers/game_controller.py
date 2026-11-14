"""
Controller Layer (API Routes) for Game Engine Microservice
"""
from fastapi import APIRouter

from models import (
    BuzzRequest,
    StartGameRequest,
    SubmitAnswerRequest,
    load_asked_history,
    load_questions,
    save_asked_history,
)
from services.session_service import (
    SESSIONS,
    advance_to_next_question,
    create_match_session,
    evaluate_and_record_answer,
    get_session_or_404,
    lock_buzzer,
)

router = APIRouter()


@router.get("/health")
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


@router.get("/api/history")
def get_history():
    questions = load_questions()
    asked = load_asked_history()
    return {
        "askedIds": asked,
        "askedCount": len(asked),
        "remainingCount": max(0, len(questions) - len(asked)),
        "totalQuestions": len(questions),
    }


@router.post("/api/history/reset")
def reset_history():
    save_asked_history([])
    return {
        "status": "reset",
        "askedIds": [],
        "message": "Đã xóa lịch sử câu hỏi đã xuất hiện. Toàn bộ 237 câu hỏi sẵn sàng cho ván mới!",
    }


@router.post("/api/game/start")
def start_game(req: StartGameRequest):
    return create_match_session(req)


@router.get("/api/game/{session_id}")
def get_game(session_id: str):
    return get_session_or_404(session_id)


@router.post("/api/game/{session_id}/buzz")
def buzz_in(session_id: str, req: BuzzRequest):
    return lock_buzzer(session_id, req)


@router.post("/api/game/{session_id}/submit")
async def submit_answer(session_id: str, req: SubmitAnswerRequest):
    return await evaluate_and_record_answer(session_id, req)


@router.post("/api/game/{session_id}/next")
def next_question(session_id: str):
    return advance_to_next_question(session_id)
