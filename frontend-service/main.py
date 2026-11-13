r"""
Frontend Service Server (FastAPI Static & API Gateway)
Serves the Starry Night Debate Arena UI on Port 3000 and proxies /api/grade & /api/game/*
to ai-grading-service (Port 4002) and game-engine-service (Port 4001).
Runs directly inside D:\UIT-HK7\.venv without installing any external packages.
"""
import os
from pathlib import Path
from typing import Any, Dict

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="LawGame Frontend Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = BASE_DIR / "public"
AI_GRADING_URL = os.environ.get("AI_GRADING_URL", "http://localhost:4002")
GAME_ENGINE_URL = os.environ.get("GAME_ENGINE_URL", "http://localhost:4001")


@app.get("/health")
def health():
    return {
        "service": "frontend-service",
        "status": "ok",
        "aiGradingUrl": AI_GRADING_URL,
        "gameEngineUrl": GAME_ENGINE_URL,
    }


@app.post("/api/grade")
async def proxy_grade(request: Request):
    body = await request.json()
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.post(f"{AI_GRADING_URL}/api/grade", json=body)
            return JSONResponse(status_code=resp.status_code, content=resp.json())
        except Exception as exc:
            return JSONResponse(status_code=503, content={"error": str(exc)})


@app.get("/api/questions")
async def proxy_questions(request: Request):
    params = dict(request.query_params)
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(f"{AI_GRADING_URL}/api/questions", params=params)
            return JSONResponse(status_code=resp.status_code, content=resp.json())
        except Exception as exc:
            return JSONResponse(status_code=503, content={"error": str(exc)})


@app.api_route("/api/game/{path:path}", methods=["GET", "POST"])
async def proxy_game(path: str, request: Request):
    async with httpx.AsyncClient(timeout=10.0) as client:
        url = f"{GAME_ENGINE_URL}/api/game/{path}"
        if request.method == "GET":
            resp = await client.get(url, params=dict(request.query_params))
        else:
            body = await request.json()
            resp = await client.post(url, json=body)
        return JSONResponse(status_code=resp.status_code, content=resp.json())


@app.api_route("/api/history{path:path}", methods=["GET", "POST"])
async def proxy_history(path: str, request: Request):
    async with httpx.AsyncClient(timeout=10.0) as client:
        url = f"{GAME_ENGINE_URL}/api/history{path}"
        if request.method == "GET":
            resp = await client.get(url)
        else:
            resp = await client.post(url)
        return JSONResponse(status_code=resp.status_code, content=resp.json())


app.mount("/", StaticFiles(directory=str(PUBLIC_DIR), html=True), name="public")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 3000))
    uvicorn.run(app, host="0.0.0.0", port=port)

