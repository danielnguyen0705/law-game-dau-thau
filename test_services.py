r"""
Automated Pytest E2E & Integration Test Suite for LawGame Microservices
Runs strictly inside D:\UIT-HK7\.venv\Scripts\python.exe -m pytest
"""
import importlib.util
import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent


def load_module_from_path(name: str, filepath: Path):
    spec = importlib.util.spec_from_file_location(name, str(filepath))
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


def test_per_question_json_files_and_manifest():
    """Verify all 237 individual per-question JSON files (q001.json..q237.json) + index.json exist and are valid."""
    q_dir = ROOT_DIR / "frontend-service" / "public" / "data" / "questions"
    index_path = q_dir / "index.json"
    assert index_path.exists(), f"Missing {index_path}"

    with open(index_path, "r", encoding="utf-8") as f:
        idx_data = json.load(f)

    assert len(idx_data["index"]) == 237
    for qid in range(1, 238):
        q_file = q_dir / f"q{qid:03d}.json"
        assert q_file.exists(), f"Missing individual question file {q_file}"
        with open(q_file, "r", encoding="utf-8") as qf:
            item = json.load(qf)
        assert item["id"] == qid
        assert item["file"] == f"q{qid:03d}.json"
        assert item["points"] in (20, 30, 50)
        for field in ("issue", "rule", "application", "conclusion"):
            assert len(item["irac"][field].strip()) > 10


def test_question_bank_irac_completeness():
    """Verify consolidated 237-question IRAC bank and difficulty distribution."""
    bank_path = ROOT_DIR / "frontend-service" / "public" / "data" / "questions_irac.json"
    assert bank_path.exists(), f"Missing {bank_path}"

    with open(bank_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    questions = data["questions"] if isinstance(data, dict) and "questions" in data else data
    assert len(questions) == 237, f"Expected 237 questions, got {len(questions)}"

    ids = [q["id"] for q in questions]
    assert ids == list(range(1, 238)), "Question IDs must be strictly 1..237"

    for q in questions:
        assert q.get("question") and len(q["question"]) > 10, f"Invalid question text at ID {q['id']}"
        assert q.get("difficulty") in ("EASY", "MEDIUM", "HARD"), f"Invalid difficulty code at ID {q['id']}"
        assert q.get("difficultyLabel") in ("Dễ", "Trung bình", "Khó"), f"Invalid difficultyLabel at ID {q['id']}"
        assert q.get("points") in (20, 30, 50), f"Invalid points at ID {q['id']}"
        irac = q.get("irac", {})
        for field in ("issue", "rule", "application", "conclusion"):
            assert irac.get(field) and len(irac[field].strip()) > 10, f"Empty IRAC {field} at ID {q['id']}"


def test_ai_grading_service():
    """Verify AI Semantic Grading Service endpoints and scoring formula."""
    ai_mod = load_module_from_path("ai_grading_main", ROOT_DIR / "ai-grading-service" / "main.py")

    h_data = ai_mod.health()
    assert h_data["status"] == "ok"
    assert h_data["totalQuestions"] == 237

    q6 = ai_mod.get_question_by_id(6)
    assert q6["id"] == 6

    # Test high-accuracy answer
    good_answer = f"{q6['irac']['rule']} {q6['irac']['conclusion']} {q6['irac']['application']}"
    g_good = ai_mod.post_grade(ai_mod.GradeRequest(questionId=6, playerAnswer=good_answer))
    assert g_good["accuracyPercent"] >= 80, f"Expected >=80% for canonical answer, got {g_good['accuracyPercent']}%"
    expected_pts = round(q6["points"] * (g_good["accuracyPercent"] / 100.0), 1)
    assert abs(g_good["earnedPoints"] - expected_pts) < 0.01

    # Test partial answer
    partial_answer = q6["irac"]["conclusion"]
    g_part = ai_mod.post_grade(ai_mod.GradeRequest(questionId=6, playerAnswer=partial_answer))
    assert 20 <= g_part["accuracyPercent"] <= 100

    # Test empty answer
    g_empty = ai_mod.post_grade(ai_mod.GradeRequest(questionId=6, playerAnswer=""))
    assert g_empty["accuracyPercent"] == 0
    assert g_empty["earnedPoints"] == 0.0


def test_game_engine_service():
    """Verify Game Engine Service session management, buzzer lock, and non-repeating question history across matches."""
    ge_mod = load_module_from_path("game_engine_main", ROOT_DIR / "game-engine-service" / "main.py")

    # Reset history first
    r_reset = ge_mod.reset_history()
    assert r_reset["askedIds"] == []

    # Start Game 1 (10 questions)
    s1 = ge_mod.start_game(
        ge_mod.StartGameRequest(
            teamA={"name": "Đội A", "avatar": "⚖️"},
            teamB={"name": "Đội B", "avatar": "🏛️"},
            questionCount=10,
        )
    )
    assert len(s1["questions"]) == 10
    q_ids_1 = {q["id"] for q in s1["questions"]}

    # Start Game 2 (20 questions) and verify zero overlap with Game 1
    s2 = ge_mod.start_game(
        ge_mod.StartGameRequest(
            teamA={"name": "Đội A", "avatar": "⚖️"},
            teamB={"name": "Đội B", "avatar": "🏛️"},
            questionCount=20,
        )
    )
    assert len(s2["questions"]) == 20
    q_ids_2 = {q["id"] for q in s2["questions"]}
    assert q_ids_1.isdisjoint(q_ids_2), "Questions between match 1 and match 2 must not repeat!"

    # Start Game 3 (30 questions) and verify zero overlap with Games 1 & 2
    s3 = ge_mod.start_game(
        ge_mod.StartGameRequest(
            teamA={"name": "Đội A", "avatar": "⚖️"},
            teamB={"name": "Đội B", "avatar": "🏛️"},
            questionCount=30,
        )
    )
    assert len(s3["questions"]) == 30
    q_ids_3 = {q["id"] for q in s3["questions"]}
    assert (q_ids_1 | q_ids_2).isdisjoint(q_ids_3), "Questions in match 3 must not repeat match 1 or 2!"

    # Test buzzer lock
    sid = s1["sessionId"]
    r_buzz_a = ge_mod.buzz_in(sid, ge_mod.BuzzRequest(teamId="A"))
    assert r_buzz_a["buzzerWinner"] == "A"
    # Second buzz from B should remain locked to A
    r_buzz_b = ge_mod.buzz_in(sid, ge_mod.BuzzRequest(teamId="B"))
    assert r_buzz_b["buzzerWinner"] == "A"

    # Reset history clean after test
    ge_mod.reset_history()


def test_frontend_service():
    """Verify Frontend Service static delivery, per-question JSON files, Starry Night palette, and Author Credits."""
    fe_mod = load_module_from_path("frontend_main", ROOT_DIR / "frontend-service" / "main.py")
    h_fe = fe_mod.health()
    assert h_fe["status"] == "ok"

    public_dir = ROOT_DIR / "frontend-service" / "public"
    index_text = (public_dir / "index.html").read_text(encoding="utf-8")
    assert "Đấu Trường Pháp Luật Đấu Thầu" in index_text

    app_text = (public_dir / "app.js").read_text(encoding="utf-8")
    assert "Một sản phẩm của Nguyễn Quốc Đạt, Đỗ Hoàng Gia Bảo, Trần Võ Đăng Khoa" in app_text
    assert "#0B132B" in app_text and "#F4D35E" in app_text

    css_text = (public_dir / "styles.css").read_text(encoding="utf-8")
    assert "--bg-deep: #0B132B" in css_text
    assert "--bg-twilight: #1C2541" in css_text
    assert "--cobalt-swirl: #3A506B" in css_text
    assert "--star-yellow: #F4D35E" in css_text
    assert "--star-amber: #EE964B" in css_text


if __name__ == "__main__":
    import pytest
    raise SystemExit(pytest.main([__file__, "-p", "no:langsmith", "-v"]))
