"""
AI Grading Microservice — Entry Point (Port 4002)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import PORT
from controllers.grading_controller import (
    get_question_by_id,
    get_questions,
    health,
    post_grade,
    router,
)
from models import GradeRequest

app = FastAPI(
    title="LawGame AI Semantic Grading Service",
    description="API chấm điểm ngữ nghĩa theo cấu trúc IRAC (MVC Architecture)",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
