r"""
Data Pipeline: Build & Validate the 237 LawGame IRAC Question Bank
Supports BOTH:
  1. Per-Question Individual JSON Architecture: `data/questions/q001.json` .. `data/questions/q237.json` + `data/questions/index.json`
     (Allows ultra-fast random question picking and on-demand loading without parsing a huge file)
  2. Consolidated Bank: `data/questions_irac.json`
"""
import json
import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent


def load_raw_questions():
    raw_file = BASE_DIR / "raw_questions.txt"
    questions = {}
    with open(raw_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            m = re.match(r"^Câu\s+(\d+)\.\s*(.+)$", line)
            if m:
                qid = int(m.group(1))
                qtext = m.group(2).strip()
                questions[qid] = qtext
    return questions


def build_and_validate():
    raw_questions = load_raw_questions()
    assert len(raw_questions) == 237, f"Expected 237 raw questions, got {len(raw_questions)}"

    merged_by_id = {}
    q_source_dir = BASE_DIR / "questions"
    if q_source_dir.exists():
        for qid in range(1, 238):
            qf = q_source_dir / f"q{qid:03d}.json"
            if qf.exists():
                with open(qf, "r", encoding="utf-8") as f:
                    merged_by_id[qid] = json.load(f)

    if len(merged_by_id) < 237 and (BASE_DIR / "questions_irac.json").exists():
        with open(BASE_DIR / "questions_irac.json", "r", encoding="utf-8") as f:
            data = json.load(f)
            items = data["questions"] if isinstance(data, dict) and "questions" in data else data
            for item in items:
                merged_by_id[int(item["id"])] = item

    missing = [i for i in range(1, 238) if i not in merged_by_id]
    if missing:
        raise ValueError(f"Missing question IDs ({len(missing)}): {missing}")

    final_bank = []
    manifest_items = []
    stats = {"Dễ": 0, "Trung bình": 0, "Khó": 0}
    vi_to_code = {"Dễ": "EASY", "Trung bình": "MEDIUM", "Khó": "HARD"}
    code_to_vi = {"EASY": "Dễ", "MEDIUM": "Trung bình", "HARD": "Khó"}
    points_map = {"Dễ": 20, "Trung bình": 30, "Khó": 50}

    for qid in range(1, 238):
        item = merged_by_id[qid]
        raw_diff = str(item.get("difficulty", "Trung bình")).strip()
        if raw_diff in code_to_vi:
            diff_vi = code_to_vi[raw_diff]
            diff_code = raw_diff
        elif raw_diff in vi_to_code:
            diff_vi = raw_diff
            diff_code = vi_to_code[raw_diff]
        else:
            diff_vi = "Trung bình"
            diff_code = "MEDIUM"

        pts = points_map[diff_vi]
        stats[diff_vi] += 1

        irac = item.get("irac", {})
        for k in ["issue", "rule", "application", "conclusion"]:
            val = str(irac.get(k, "")).strip()
            assert len(val) > 10, f"Question {qid} has empty/short IRAC field '{k}'"
            irac[k] = val

        keywords = item.get("keywords")
        if not keywords or not isinstance(keywords, list):
            keywords = []

        file_name = f"q{qid:03d}.json"
        normalized_item = {
            "id": qid,
            "file": file_name,
            "questionNumber": qid,
            "question_number": f"Câu {qid}",
            "question": raw_questions[qid],
            "difficulty": diff_code,
            "difficultyLabel": diff_vi,
            "difficultyVi": diff_vi,
            "points": pts,
            "topic": item.get("topic", "Pháp luật Đấu thầu"),
            "irac": irac,
            "keywords": keywords,
        }
        final_bank.append(normalized_item)
        manifest_items.append({
            "id": qid,
            "file": file_name,
            "questionNumber": qid,
            "difficulty": diff_code,
            "difficultyLabel": diff_vi,
            "points": pts,
            "topic": normalized_item["topic"],
        })

    metadata = {
        "title": "Ngân hàng 237 câu hỏi & đáp án chuẩn IRAC môn Pháp luật Đấu thầu",
        "sourceFile": "Bo_cau_hoi_on_thi_Luat_Dau_thau.pdf",
        "legalSources": [
            "Luật Đấu thầu số 22/2023/QH15",
            "Luật sửa đổi, bổ sung số 57/2024/QH15 và Luật số 90/2025/QH15",
            "Luật Đầu tư số 143/2025/QH15",
            "Nghị định số 214/2025/NĐ-CP",
            "Nghị định số 60/2021/NĐ-CP",
            "Handout_Luat_Dau_thau.pdf",
        ],
        "totalQuestions": len(final_bank),
        "distribution": stats,
    }

    per_question_dirs = [
        BASE_DIR / "questions",
        PROJECT_ROOT / "frontend-service" / "public" / "data" / "questions",
        PROJECT_ROOT / "game-engine-service" / "data" / "questions",
        PROJECT_ROOT / "ai-grading-service" / "data" / "questions",
    ]
    for qdir in per_question_dirs:
        qdir.mkdir(parents=True, exist_ok=True)
        with open(qdir / "index.json", "w", encoding="utf-8") as f:
            json.dump({"metadata": metadata, "index": manifest_items}, f, ensure_ascii=False, indent=2)
        for q_obj in final_bank:
            with open(qdir / q_obj["file"], "w", encoding="utf-8") as f:
                json.dump(q_obj, f, ensure_ascii=False, indent=2)
        print(f"Wrote 237 individual JSON files (q001.json..q237.json) + index.json to {qdir}")

    payload = {"metadata": metadata, "questions": final_bank}
    output_targets = [
        BASE_DIR / "questions_irac.json",
        PROJECT_ROOT / "ai-grading-service" / "data" / "questions_irac.json",
        PROJECT_ROOT / "game-engine-service" / "data" / "questions_irac.json",
        PROJECT_ROOT / "frontend-service" / "public" / "data" / "questions_irac.json",
    ]
    for target in output_targets:
        target.parent.mkdir(parents=True, exist_ok=True)
        with open(target, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        print(f"Wrote consolidated {len(final_bank)} questions to {target}")

    print(f"Validation successful! Total: {len(final_bank)} questions. Distribution: {stats}")


if __name__ == "__main__":
    build_and_validate()
