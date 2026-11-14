r"""
Automated Pytest E2E & Integration Test Suite for LawGame Microservices (v9.0 MVC + Single Data/Dockerfile)
Runs strictly inside D:\UIT-HK7\.venv\Scripts\python.exe -m pytest
"""
import importlib.util
import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent


def load_module_from_path(name: str, filepath: Path):
    for mod_key in list(sys.modules.keys()):
        if mod_key in ("config", "models", "services", "controllers") or mod_key.startswith(("services.", "controllers.")):
            sys.modules.pop(mod_key, None)
    service_dir = str(filepath.parent)
    if service_dir in sys.path:
        sys.path.remove(service_dir)
    sys.path.insert(0, service_dir)
    spec = importlib.util.spec_from_file_location(name, str(filepath))
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


def test_single_data_folder_and_single_dockerfile_architecture():
    """Verify ONLY 1 data folder and ONLY 1 Dockerfile exist at the root of LawGame, and MVC folders exist."""
    data_dirs = [p for p in ROOT_DIR.rglob("data") if p.is_dir() and ".git" not in p.parts]
    assert data_dirs == [ROOT_DIR / "data"], f"Expected only 1 root data folder, found: {data_dirs}"

    dockerfiles = [p for p in ROOT_DIR.rglob("Dockerfile") if ".git" not in p.parts]
    assert dockerfiles == [ROOT_DIR / "Dockerfile"], f"Expected only 1 root Dockerfile, found: {dockerfiles}"

    for svc in ("ai-grading-service", "game-engine-service", "frontend-service"):
        svc_dir = ROOT_DIR / svc
        assert (svc_dir / "config.py").exists(), f"Missing config.py in {svc}"
        assert (svc_dir / "controllers").is_dir(), f"Missing controllers/ in {svc}"
        assert (svc_dir / "main.py").exists(), f"Missing main.py in {svc}"


def test_per_question_json_files_and_manifest():
    """Verify all 237 individual per-question JSON files (q001.json..q237.json) + index.json exist in LawGame/data/questions."""
    q_dir = ROOT_DIR / "data" / "questions"
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
    """Verify consolidated 237-question IRAC bank and difficulty distribution in LawGame/data/questions_irac.json."""
    bank_path = ROOT_DIR / "data" / "questions_irac.json"
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
    """Verify AI Semantic Grading Service MVC endpoints and scoring formula."""
    ai_mod = load_module_from_path("ai_grading_main", ROOT_DIR / "ai-grading-service" / "main.py")

    h_data = ai_mod.health()
    assert h_data["status"] == "ok"
    assert h_data["totalQuestions"] == 237

    q6 = ai_mod.get_question_by_id(6)
    assert q6["id"] == 6

    good_answer = f"{q6['irac']['rule']} {q6['irac']['conclusion']} {q6['irac']['application']}"
    g_good = ai_mod.post_grade(ai_mod.GradeRequest(questionId=6, playerAnswer=good_answer))
    assert g_good["accuracyPercent"] >= 80, f"Expected >=80% for canonical answer, got {g_good['accuracyPercent']}%"
    expected_pts = round(q6["points"] * (g_good["accuracyPercent"] / 100.0), 1)
    assert abs(g_good["earnedPoints"] - expected_pts) < 0.01

    partial_answer = q6["irac"]["conclusion"]
    g_part = ai_mod.post_grade(ai_mod.GradeRequest(questionId=6, playerAnswer=partial_answer))
    assert 20 <= g_part["accuracyPercent"] <= 100

    g_empty = ai_mod.post_grade(ai_mod.GradeRequest(questionId=6, playerAnswer=""))
    assert g_empty["accuracyPercent"] == 0
    assert g_empty["earnedPoints"] == 0.0


def test_game_engine_service():
    """Verify Game Engine Service MVC session management, buzzer lock, and non-repeating question history across matches."""
    ge_mod = load_module_from_path("game_engine_main", ROOT_DIR / "game-engine-service" / "main.py")

    r_reset = ge_mod.reset_history()
    assert r_reset["askedIds"] == []

    s1 = ge_mod.start_game(
        ge_mod.StartGameRequest(
            teamA={"name": "Đội A", "avatar": "⚖️"},
            teamB={"name": "Đội B", "avatar": "🏛️"},
            questionCount=10,
        )
    )
    assert len(s1["questions"]) == 10
    q_ids_1 = {q["id"] for q in s1["questions"]}

    s2 = ge_mod.start_game(
        ge_mod.StartGameRequest(
            teamA={"name": "Đội A", "avatar": "⚖️"},
            teamB={"name": "Đội B", "avatar": "🏛️"},
            questionCount=20,
        )
    )
    assert len(s2["questions"]) == 20
    q_ids_2 = {q["id"] for q in s2["questions"]}
    assert q_ids_1.isjoin(q_ids_2) if hasattr(q_ids_1, "isjoin") else q_ids_1.isdisjoint(q_ids_2)

    s3 = ge_mod.start_game(
        ge_mod.StartGameRequest(
            teamA={"name": "Đội A", "avatar": "⚖️"},
            teamB={"name": "Đội B", "avatar": "🏛️"},
            questionCount=30,
        )
    )
    assert len(s3["questions"]) == 30
    q_ids_3 = {q["id"] for q in s3["questions"]}
    assert (q_ids_1 | q_ids_2).isdisjoint(q_ids_3)

    sid = s1["sessionId"]
    r_buzz_a = ge_mod.buzz_in(sid, ge_mod.BuzzRequest(teamId="A"))
    assert r_buzz_a["buzzerWinner"] == "A"
    r_buzz_b = ge_mod.buzz_in(sid, ge_mod.BuzzRequest(teamId="B"))
    assert r_buzz_b["buzzerWinner"] == "A"

    ge_mod.reset_history()


def test_frontend_service_and_olympia_v9_features():
    """Verify Frontend Service MVC static delivery, Olympia UI, LED strips, Grand Victory podium, and zero duplicate buttons."""
    fe_mod = load_module_from_path("frontend_main", ROOT_DIR / "frontend-service" / "main.py")
    h_fe = fe_mod.health()
    assert h_fe["status"] == "ok"

    public_dir = ROOT_DIR / "frontend-service" / "public"
    assert (public_dir / "favicon.svg").exists()
    index_text = (public_dir / "index.html").read_text(encoding="utf-8")
    assert "Sàn Đấu Tranh Biện" in index_text
    assert "./css/styles.css" in index_text
    assert "./js/app.js" in index_text

    # Verify every relative ES module import inside public/js/*.js resolves to an existing file!
    import re
    js_dir = public_dir / "js"
    for js_file in js_dir.glob("*.js"):
        src = js_file.read_text(encoding="utf-8")
        for m in re.finditer(r"""from\s+['"](\./[^'"]+)['"]""", src):
            rel_target = m.group(1).split("?")[0]
            resolved = (js_file.parent / rel_target).resolve()
            assert resolved.exists(), f"Broken ES module import {rel_target} in {js_file.name}"

    app_text = (public_dir / "js" / "app.js").read_text(encoding="utf-8")
    assert "Một sản phẩm của Nguyễn Quốc Đạt, Đỗ Hoàng Gia Bảo, Trần Võ Đăng Khoa" in app_text
    assert "Môn học: Pháp luật Đấu thầu • Đại học Công nghệ Thông tin (UIT - ĐHQG TP.HCM)" not in app_text
    assert "btn-next-round-top" not in app_text
    assert "mode-switch-Voice" not in app_text and "mode-switch-Text" not in app_text
    assert "gameshow-led-strip" in app_text
    assert "olympia-transition-stage" in app_text
    assert "olympia-victory-stage" in app_text
    assert "laurel-wreath-crest" in app_text
    assert "feud-mushroom-buzzer" in app_text
    assert "feud-lockout-banner" in app_text
    assert "feud-strike-x-banner" in app_text
    assert "weakest-link-critical-stage" in app_text
    assert "gameshow-mic-orb" in app_text
    assert "centered-submit-row" in app_text
    assert "combat-power-bar-wrap" not in app_text
    assert "voice-live-transcript-card" not in app_text

    sfx_text = (public_dir / "js" / "soundEffects.js").read_text(encoding="utf-8")
    assert "stopAllSFX" in sfx_text and "startBGM" in sfx_text and "setScene" in sfx_text and "playStrikeX" in sfx_text

    css_text = (public_dir / "css" / "styles.css").read_text(encoding="utf-8")
    assert "--bg-deep: #0B132B" in css_text
    assert "--star-yellow: #F4D35E" in css_text
    assert ".gameshow-led-strip" in css_text
    assert ".olympia-victory-stage" in css_text
    assert "100dvh" in css_text


if __name__ == "__main__":
    import pytest
    raise SystemExit(pytest.main([__file__, "-p", "no:langsmith", "-v"]))
