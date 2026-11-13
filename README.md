# ⚖️ Đấu Trường Pháp Luật Đấu Thầu — The Starry Night Debate Arena

Hệ thống trò chơi đối kháng (Debate Quiz) phục vụ sinh viên ôn tập học phần **Pháp luật Đấu thầu** theo cấu trúc lập luận pháp lý chuẩn **IRAC (Issue – Rule – Application – Conclusion)** và chấm điểm ngữ nghĩa tự động bằng AI.

---

## 👥 Nhóm Thực Hiện Dự Án
- **Nguyễn Quốc Đạt**
- **Đỗ Hoàng Gia Bảo**
- **Trần Võ Đăng Khoa**

---

## ✨ Điểm Nổi Bật
1. **Ngân hàng 237 câu hỏi chuẩn hóa IRAC (`questions_irac.json`)**:
   - Trích xuất nguyên bản 100% (237 câu hỏi từ Câu 1 đến Câu 237) từ `doc/Bo_cau_hoi_on_thi_Luat_Dau_thau.pdf`.
   - Đối chiếu chính xác với Luật Đấu thầu số 22/2023/QH15 (sửa đổi bởi Luật số 57/2024/QH15 và Luật số 90/2025/QH15), Luật Đầu tư số 143/2025/QH15, Nghị định số 214/2025/NĐ-CP, Nghị định số 60/2021/NĐ-CP và `Handout_Luat_Dau_thau.pdf` (kết hợp truy xuất ngữ cảnh qua NotebookLM **"Bộ Câu Hỏi Ôn Thi Luật Đấu Thầu"**).
   - Phân loại theo 3 mức độ: **Dễ (20đ) – Trung bình (30đ) – Khó (50đ)**.
2. **Sàn đấu tranh biện 2 đội (Team A vs Team B)**:
   - Bấm chuông giành quyền trả lời bằng phím tắt (`F` cho Đội A, `J` cho Đội B, tùy chỉnh được trong Cài đặt) kèm hiệu ứng âm thanh Web Audio riêng biệt và đèn Spotlight.
   - Hỗ trợ song song **Nhận diện giọng nói tiếng Việt (Voice-to-Text `vi-VN`)** và **Nhập văn bản từ bàn phím** (có chế độ không giới hạn thời gian dự phòng).
3. **Chấm điểm thông minh bằng AI (Semantic IRAC Grading)**:
   - Đánh giá mức độ tương đồng ngữ nghĩa và căn cứ pháp lý trên 4 trụ cột `Issue`, `Rule`, `Application`, `Conclusion`.
   - Công thức: `Điểm nhận được = Điểm tối đa của câu hỏi × (% độ chính xác)`.
   - Hiển thị bảng đối chiếu trực quan giữa câu trả lời của đội chơi và đáp án chuẩn IRAC.
4. **Chống trùng lặp câu hỏi giữa các ván đấu**:
   - Lưu lịch sử các câu hỏi đã hỏi qua `localStorage` & `game-engine-service` để các ván sau không lặp lại câu hỏi cũ (hỗ trợ nút Reset lịch sử).
5. **Giao diện nghệ thuật *The Starry Night* (Vincent van Gogh)**:
   - Phối màu xanh đêm sâu thẳm (`#0B132B`, `#1C2541`), xanh cobalt (`#3A506B`) và vàng rực rỡ (`#F4D35E`, `#EE964B`).

---

## 🏗️ Kiến Trúc Microservices

Dự án được tổ chức tại `D:\UIT-HK7\LawGame` gồm 3 microservices độc lập và có thể khởi chạy bằng môi trường ảo `D:\UIT-HK7\.venv` hoặc `docker-compose.yml`:

| Microservice | Port | Mô tả |
|---|---|---|
| `frontend-service` | `3000` | Giao diện người dùng (Debate Arena UI), âm thanh Web Audio, nhận diện giọng nói và API Gateway |
| `game-engine-service` | `4001` | Quản lý phòng chơi, trạng thái ván đấu, bấm chuông (buzzer), tính điểm 2 đội và lịch sử câu hỏi không lặp |
| `ai-grading-service` | `4002` | Chấm điểm ngữ nghĩa tự động theo cấu trúc IRAC (Scikit-Learn TF-IDF + Legal Citation Matcher) |

---

## 🚀 Hướng Dẫn Chạy Bằng Môi Trường Ảo `D:\UIT-HK7\.venv`

```powershell
# 1. Chạy kiểm thử tự động toàn bộ 3 Microservices & 237 câu hỏi IRAC
D:\UIT-HK7\.venv\Scripts\python.exe D:\UIT-HK7\LawGame\test_services.py

# 2. Khởi động đồng thời cả 3 Microservices (Ports 3000, 4001, 4002)
powershell -ExecutionPolicy Bypass -File D:\UIT-HK7\LawGame\start_all_venv.ps1
```

Hoặc sử dụng Docker Compose:
```bash
docker-compose up --build
```

