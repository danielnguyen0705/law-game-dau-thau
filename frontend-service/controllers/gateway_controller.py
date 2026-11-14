"""
Controller Layer (API Gateway Proxy Routes) for Frontend Service
"""
import httpx
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, RedirectResponse

from config import AI_GRADING_URL, GAME_ENGINE_URL

router = APIRouter()


@router.get("/app.js")
def legacy_app_js():
    return RedirectResponse(url="/js/app.js?v=9.1")


@router.get("/styles.css")
def legacy_styles_css():
    return RedirectResponse(url="/css/styles.css?v=9.1")


@router.get("/health")
def health():
    return {
        "service": "frontend-service",
        "status": "ok",
        "aiGradingUrl": AI_GRADING_URL,
        "gameEngineUrl": GAME_ENGINE_URL,
    }


@router.post("/api/grade")
async def proxy_grade(request: Request):
    body = await request.json()
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.post(f"{AI_GRADING_URL}/api/grade", json=body)
            return JSONResponse(status_code=resp.status_code, content=resp.json())
        except Exception as exc:
            return JSONResponse(status_code=503, content={"error": str(exc)})


@router.get("/api/questions")
async def proxy_questions(request: Request):
    params = dict(request.query_params)
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(f"{AI_GRADING_URL}/api/questions", params=params)
            return JSONResponse(status_code=resp.status_code, content=resp.json())
        except Exception as exc:
            return JSONResponse(status_code=503, content={"error": str(exc)})


@router.api_route("/api/game/{path:path}", methods=["GET", "POST"])
async def proxy_game(path: str, request: Request):
    async with httpx.AsyncClient(timeout=10.0) as client:
        url = f"{GAME_ENGINE_URL}/api/game/{path}"
        if request.method == "GET":
            resp = await client.get(url, params=dict(request.query_params))
        else:
            body = await request.json()
            resp = await client.post(url, json=body)
        return JSONResponse(status_code=resp.status_code, content=resp.json())


@router.api_route("/api/history{path:path}", methods=["GET", "POST"])
async def proxy_history(path: str, request: Request):
    async with httpx.AsyncClient(timeout=10.0) as client:
        url = f"{GAME_ENGINE_URL}/api/history{path}"
        if request.method == "GET":
            resp = await client.get(url)
        else:
            resp = await client.post(url)
        return JSONResponse(status_code=resp.status_code, content=resp.json())

