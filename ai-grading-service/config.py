"""
Configuration & Constants for AI Grading Microservice
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
DATA_DIR = ROOT_DIR / "data" if (ROOT_DIR / "data").exists() else BASE_DIR / "data"
DATA_FILE = DATA_DIR / "questions_irac.json"
QUESTIONS_DIR = DATA_DIR / "questions"
PORT = int(os.environ.get("PORT", 4002))

VIETNAMESE_ABBREVIATIONS = [
    (r"\bnsnn\b", "ngân sách nhà nước"),
    (r"\bđvsncl\b", "đơn vị sự nghiệp công lập"),
    (r"\bdnnn\b", "doanh nghiệp nhà nước"),
    (r"\bhsmt\b", "hồ sơ mời thầu"),
    (r"\bhsdt\b", "hồ sơ dự thầu"),
    (r"\bhsyc\b", "hồ sơ yêu cầu"),
    (r"\bhsđx\b", "hồ sơ đề xuất"),
    (r"\bhsđxtc\b", "hồ sơ đề xuất về tài chính"),
    (r"\bhsđxkt\b", "hồ sơ đề xuất về kỹ thuật"),
    (r"\bhsmqt\b", "hồ sơ mời quan tâm"),
    (r"\bhsmst\b", "hồ sơ mời sơ tuyển"),
    (r"\bkhlcnt\b", "kế hoạch lựa chọn nhà thầu"),
    (r"\bbđdt\b", "bảo đảm dự thầu"),
    (r"\bbđthhđ\b", "bảo đảm thực hiện hợp đồng"),
    (r"\bcđt\b", "chủ đầu tư"),
    (r"\bbmt\b", "bên mời thầu"),
    (r"\bnđ\b", "nghị định"),
    (r"\btt\b", "thông tư"),
    (r"\bk\.\s*(\d+)", r"khoản \1"),
    (r"\bđ\.\s*(\d+)", r"điều \1"),
    (r"\b0(\d)\b", r"\1"),
]

NUMBER_WORDS = {
    "một": "1",
    "hai": "2",
    "ba": "3",
    "bốn": "4",
    "năm": "5",
    "sáu": "6",
    "bảy": "7",
    "tám": "8",
    "chín": "9",
    "mười": "10",
}

STOPWORDS = {
    "là", "và", "của", "có", "được", "trong", "cho", "với", "theo", "tại", "về",
    "các", "những", "một", "này", "đó", "khi", "thì", "mà", "như", "thế", "nào",
    "hay", "hoặc", "không", "phải", "cần", "để", "từ", "đến", "trên", "dưới",
    "do", "bởi", "vào", "ra", "lên", "xuống", "sẽ", "đã", "đang", "rằng", "nếu",
}

