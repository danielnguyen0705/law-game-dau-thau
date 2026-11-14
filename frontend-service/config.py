"""
Configuration & Constants for Frontend Gateway Microservice
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
PUBLIC_DIR = BASE_DIR / "public"
DATA_DIR = ROOT_DIR / "data" if (ROOT_DIR / "data").exists() else PUBLIC_DIR / "data"
AI_GRADING_URL = os.environ.get("AI_GRADING_URL", "http://localhost:4002")
GAME_ENGINE_URL = os.environ.get("GAME_ENGINE_URL", "http://localhost:4001")
PORT = int(os.environ.get("PORT", 3000))

