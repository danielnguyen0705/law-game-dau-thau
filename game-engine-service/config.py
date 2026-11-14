"""
Configuration & Constants for Game Engine Microservice
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
DATA_DIR = ROOT_DIR / "data" if (ROOT_DIR / "data").exists() else BASE_DIR / "data"
QUESTIONS_FILE = DATA_DIR / "questions_irac.json"
QUESTIONS_DIR = DATA_DIR / "questions"
HISTORY_FILE = DATA_DIR / "asked_history.json"
AI_GRADING_URL = os.environ.get("AI_GRADING_URL", "http://localhost:4002")
PORT = int(os.environ.get("PORT", 4001))
