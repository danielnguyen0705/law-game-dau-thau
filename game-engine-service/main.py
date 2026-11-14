"""
Game Engine Microservice — Entry Point (Port 4001)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import PORT
from controllers.game_controller import (
    buzz_in,
    get_game,
    get_history,
    health,
    next_question,
    reset_history,
    router,
    start_game,
    submit_answer,
)
from models import BuzzRequest, StartGameRequest, SubmitAnswerRequest

app = FastAPI(
    title="LawGame Debate Engine Service",
    description="Quản lý phòng chơi, trạng thái ván đấu và bảng điểm (MVC Architecture)",
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
