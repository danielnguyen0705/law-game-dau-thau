"""
Controller Layer (API Routes) for AI Grading Microservice
"""
import random
from typing import Optional
from fastapi import APIRouter, HTTPException, Query

from models import GradeRequest, load_question_by_id, load_questions
from services.grader_service import grade_irac_answer

router = APIRouter()


@router.get("/health")
def health():
    questions = load_questions()
    return {
        "service": "ai-grading-service",
        "runtime": "python-fastapi",
        "status": "ok",
        "totalQuestions": len(questions),
    }


@router.get("/api/questions")
def get_questions(
    difficulty: Optional[str] = Query(None),
    excludeIds: Optional[str] = Query(None),
    count: Optional[int] = Query(None),
):
    questions = load_questions()
    excluded = set()
    if excludeIds:
        for part in excludeIds.split(","):
            part = part.strip()
            if part.isdigit():
                excluded.add(int(part))

    filtered = [q for q in questions if int(q.get("id", 0)) not in excluded]
    if difficulty and difficulty != "all":
        filtered = [q for q in filtered if q.get("difficulty") == difficulty]

    if count and count > 0:
        shuffled = list(filtered)
        random.shuffle(shuffled)
        filtered = shuffled[: min(237, count)]

    return {"totalAvailable": len(filtered), "questions": filtered}


@router.get("/api/questions/{question_id}")
def get_question_by_id(question_id: int):
    q = load_question_by_id(question_id)
    if q:
        return q
    raise HTTPException(status_code=404, detail=f"Không tìm thấy câu hỏi số {question_id}")


@router.post("/api/grade")
def post_grade(req: GradeRequest):
    target = req.questionData or req.question
    if not target and req.questionId is not None:
        target = load_question_by_id(int(req.questionId))
    if not target:
        raise HTTPException(status_code=400, detail="Missing valid questionId or questionData")
    return grade_irac_answer(target, req.playerAnswer)

