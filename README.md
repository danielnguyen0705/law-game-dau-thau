# ⚖️ Sàn Đấu Tranh Biện — Pháp Luật Đấu Thầu (The Starry Night Edition)

Hệ thống trò chơi đối kháng (1v1 Debate & Gameshow Quiz) phục vụ ôn tập học phần **Pháp luật Đấu thầu** theo cấu trúc lập luận pháp lý chuẩn **IRAC (Issue – Rule – Application – Conclusion)** và chấm điểm ngữ nghĩa tự động bằng AI.

---

## 👥 Đội Ngũ Thực Hiện Dự Án
- **Nguyễn Quốc Đạt**
- **Đỗ Hoàng Gia Bảo**
- **Trần Võ Đăng Khoa**

---

## 📂 Cấu Trúc Thư Mục Chuẩn Hóa (MVC Microservices + Single `data/` & Single `Dockerfile`)

```text
LawGame/
├── data/                               # DUY NHẤT 1 thư mục dữ liệu dùng chung toàn hệ thống
│   ├── questions_irac.json             # Ngân hàng 237 câu hỏi & đáp án chuẩn IRAC tổng hợp
│   ├── asked_history.json              # Lịch sử các câu đã hỏi (chống lặp giữa các ván)
│   └── questions/                      # 237 file JSON từng câu (q001.json..q237.json) + index.json
├── ai-grading-service/                 # Microservice Chấm điểm Ngữ nghĩa AI (Port 4002) - Chuẩn MVC
│   ├── config.py                       # Cấu hình đường dẫn dữ liệu & tham số
│   ├── models.py                       # Pydantic Models & Data Access
│   ├── services/grader_service.py      # Business Logic: Chấm điểm ngữ nghĩa IRAC (TF-IDF + Legal Citations)
│   ├── controllers/grading_controller.py # API Routes (/health, /questions, /grade)
│   ├── main.py                         # FastAPI Entry Point
│   └── requirements.txt
├── game-engine-service/                # Microservice Quản lý Phòng đấu & Buzzer (Port 4001) - Chuẩn MVC
│   ├── config.py                       # Cấu hình đường dẫn & cổng
│   ├── models.py                       # Pydantic Schemas & Question/History Repository
│   ├── services/session_service.py     # Business Logic: Tạo ván đấu, khóa chuông (Buzzer Lock), tính điểm
│   ├── controllers/game_controller.py  # API Routes (/game/start, /buzz, /submit-answer, /next-question)
│   ├── main.py                         # FastAPI Entry Point
│   └── requirements.txt
├── frontend-service/                   # Microservice Giao diện & API Gateway (Port 3000) - Chuẩn MVC
│   ├── config.py                       # Cấu hình Gateway & Static Mounts
│   ├── controllers/gateway_controller.py # Reverse Proxy sang Game Engine & AI Grader + Offline Fallback
│   ├── main.py                         # FastAPI Entry Point (mount /data và /)
│   ├── requirements.txt
│   └── public/                         # Frontend Web Game Assets
│       ├── index.html
│       ├── favicon.svg                 # Icon Cán cân Công lý
│       ├── css/styles.css              # Giao diện Starry Night + Olympia Gameshow + Zero-Scroll 100dvh
│       └── js/
│           ├── app.js                  # Game State, Olympia Transitions, Side LED Strips, Voice-to-Text
│           ├── soundEffects.js         # Web Audio API Synthesizer (BGM + SFX tách biệt, chống chồng âm)
│           └── semanticGrader.js       # Bộ chấm điểm IRAC Client-side (dùng cho GitHub Pages)
├── data-pipeline/                      # Công cụ chuẩn hóa & kiểm định 237 câu hỏi từ tài liệu gốc
│   ├── build_question_bank.py
│   └── raw_questions.txt
├── Dockerfile                          # DUY NHẤT 1 Dockerfile chung ở thư mục gốc cho cả 3 Microservices
├── docker-compose.yml                  # Điều phối 3 containers dùng chung `./Dockerfile` và `./data`
└── test_services.py                    # Bộ kiểm thử tích hợp tự động (Pytest E2E Suite)
```

---

## 🚀 Hướng Dẫn Chạy & Kiểm Thử

```powershell
# 1. Chạy kiểm thử tự động toàn bộ kiến trúc MVC, dữ liệu 237 câu hỏi IRAC & 3 Microservices
D:\UIT-HK7\.venv\Scripts\python.exe -m pytest D:\UIT-HK7\LawGame\test_services.py -v

# 2. Khởi chạy bằng Docker Compose (sử dụng 1 Dockerfile duy nhất)
docker-compose up --build
```
