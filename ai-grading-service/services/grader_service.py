"""
Service Layer: Vietnamese Legal NLP & IRAC Semantic Grading Engine
"""
import math
import re
import unicodedata
from collections import Counter
from typing import Any, Dict, List

from config import NUMBER_WORDS, STOPWORDS, VIETNAMESE_ABBREVIATIONS


def normalize_text(text: str) -> str:
    if not text:
        return ""
    s = unicodedata.normalize("NFC", str(text).lower())
    for pattern, repl in VIETNAMESE_ABBREVIATIONS:
        s = re.sub(pattern, repl, s, flags=re.IGNORECASE)
    s = re.sub(r"[^\w\s%/]", " ", s, flags=re.UNICODE)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def tokenize(text: str, remove_stopwords: bool = True) -> List[str]:
    norm = normalize_text(text)
    if not norm:
        return []
    raw_tokens = [NUMBER_WORDS.get(t, t) for t in norm.split() if t]
    if not remove_stopwords:
        return raw_tokens
    return [t for t in raw_tokens if len(t) > 1 and t not in STOPWORDS]


def char_ngram_cosine(s1: str, s2: str, n_min: int = 3, n_max: int = 5) -> float:
    padded1 = f" {s1} "
    padded2 = f" {s2} "
    c1: Counter = Counter()
    c2: Counter = Counter()
    for n in range(n_min, n_max + 1):
        for i in range(max(0, len(padded1) - n + 1)):
            c1[padded1[i : i + n]] += 1
        for i in range(max(0, len(padded2) - n + 1)):
            c2[padded2[i : i + n]] += 1
    if not c1 or not c2:
        return 0.0
    common = set(c1.keys()) & set(c2.keys())
    dot = sum(c1[k] * c2[k] for k in common)
    norm1 = math.sqrt(sum(v * v for v in c1.values()))
    norm2 = math.sqrt(sum(v * v for v in c2.values()))
    if norm1 == 0.0 or norm2 == 0.0:
        return 0.0
    return dot / (norm1 * norm2)


def compute_tfidf_and_overlap(player_text: str, ref_text: str) -> float:
    p_norm = normalize_text(player_text)
    r_norm = normalize_text(ref_text)
    if not p_norm or not r_norm:
        return 0.0

    p_tokens = tokenize(player_text, True)
    r_tokens = tokenize(ref_text, True)
    if not p_tokens or not r_tokens:
        return 0.0

    p_set = set(p_tokens)
    r_unique = list(set(r_tokens))
    recall = sum(1 for t in r_unique if t in p_set) / max(1, len(r_unique))
    char_sim = char_ngram_cosine(p_norm, r_norm)

    return min(1.0, recall * 0.58 + char_sim * 0.42)


def extract_legal_citations(text: str) -> List[str]:
    norm = normalize_text(text)
    patterns = [
        r"điều\s+\d+[a-z]?",
        r"khoản\s+\d+[a-z]?",
        r"điểm\s+[a-zđ]\b",
        r"luật\s+đấu\s+thầu",
        r"22/2023",
        r"90/2025",
        r"57/2024",
        r"143/2025",
        r"214/2025",
        r"60/2021",
        r"\d+\s*%",
        r"\d+\s*(?:ngày|năm|tháng|tỷ|triệu|giờ)",
    ]
    found = []
    for pat in patterns:
        found.extend(re.findall(pat, norm))
    return list(dict.fromkeys(found))


def grade_irac_answer(question_obj: Dict[str, Any], player_answer_raw: str) -> Dict[str, Any]:
    player_answer = (player_answer_raw or "").strip()
    max_points = int(question_obj.get("points", 20))
    irac = question_obj.get("irac", {})
    keywords = question_obj.get("keywords", [])

    if len(player_answer) < 2:
        return {
            "questionId": question_obj.get("id"),
            "questionNumber": question_obj.get("question_number"),
            "difficulty": question_obj.get("difficulty"),
            "maxPoints": max_points,
            "accuracyPercent": 0,
            "earnedPoints": 0.0,
            "iracBreakdown": {
                "issueScore": 0,
                "ruleScore": 0,
                "applicationScore": 0,
                "conclusionScore": 0,
            },
            "matchedKeywords": [],
            "missingKeywords": keywords,
            "feedback": "Đội chơi chưa đưa ra câu trả lời hoặc câu trả lời trống (0% độ chính xác).",
            "canonicalIrac": irac,
        }

    norm_player = normalize_text(player_answer)
    player_tokens = tokenize(player_answer, True)
    player_tokens_all = tokenize(player_answer, False)

    matched_keywords = []
    missing_keywords = []

    for kw in keywords:
        norm_kw = normalize_text(kw)
        if not norm_kw:
            continue
        kw_tokens = tokenize(kw, True)
        if norm_kw in norm_player:
            matched_keywords.append(kw)
        elif kw_tokens:
            hits = sum(1 for t in kw_tokens if t in player_tokens or t in player_tokens_all)
            if hits / len(kw_tokens) >= 0.65:
                matched_keywords.append(kw)
            else:
                missing_keywords.append(kw)
        else:
            missing_keywords.append(kw)

    kw_ratio = len(matched_keywords) / len(keywords) if keywords else 0.5

    raw_issue = compute_tfidf_and_overlap(player_answer, irac.get("issue", ""))
    raw_rule = compute_tfidf_and_overlap(player_answer, irac.get("rule", ""))
    raw_app = compute_tfidf_and_overlap(player_answer, irac.get("application", ""))
    raw_conc = compute_tfidf_and_overlap(player_answer, irac.get("conclusion", ""))

    ref_citations = extract_legal_citations(f"{irac.get('rule', '')} {irac.get('conclusion', '')}")
    citation_ratio = raw_rule
    if ref_citations:
        c_hits = 0
        for cit in ref_citations:
            if cit in norm_player or all(p in player_tokens_all for p in cit.split()):
                c_hits += 1
        citation_ratio = max(raw_rule, c_hits / len(ref_citations))

    issue_score = min(100, round(min(1.0, raw_issue * 1.55 + kw_ratio * 0.35) * 100))
    rule_score = min(100, round(min(1.0, citation_ratio * 1.30 + raw_rule * 0.45 + kw_ratio * 0.25) * 100))
    app_score = min(100, round(min(1.0, raw_app * 1.50 + kw_ratio * 0.45) * 100))
    conc_score = min(100, round(min(1.0, raw_conc * 1.50 + kw_ratio * 0.40) * 100))

    accuracy_percent = round(
        issue_score * 0.15 +
        rule_score * 0.25 +
        app_score * 0.30 +
        conc_score * 0.30
    )

    if kw_ratio >= 0.85 and conc_score >= 80:
        accuracy_percent = max(accuracy_percent, 90)
    elif kw_ratio >= 0.70 and conc_score >= 70:
        accuracy_percent = max(accuracy_percent, 80)

    if len(player_tokens_all) < 5 and accuracy_percent > 60:
        accuracy_percent = round(accuracy_percent * 0.75)

    accuracy_percent = max(0, min(100, accuracy_percent))
    earned_points = round(max_points * (accuracy_percent / 100.0), 1)

    rule_str = irac.get("rule", "quy định pháp luật")
    if accuracy_percent >= 85:
        feedback = f"Xuất sắc! Câu trả lời nắm vững trọng tâm pháp lý, lập luận chặt chẽ và nêu đúng kết luận cũng như căn cứ tại {rule_str}."
    elif accuracy_percent >= 65:
        feedback = f"Khá tốt! Đội chơi đã xác định đúng hướng giải quyết và kết luận chính, nhưng cần bổ sung đầy đủ hơn căn cứ pháp lý ({rule_str}) hoặc chi tiết phân tích."
    elif accuracy_percent >= 40:
        feedback = f"Đạt mức cơ bản. Câu trả lời có chạm tới một số ý trong đáp án nhưng còn thiếu căn cứ pháp lý cốt lõi ({rule_str}) và lập luận áp dụng chưa đầy đủ."
    else:
        feedback = f"Chưa chính xác hoặc còn sơ sài. Hãy đối chiếu kỹ cấu trúc IRAC bên dưới, đặc biệt là căn cứ tại {rule_str} và phần Kết luận."

    return {
        "questionId": question_obj.get("id"),
        "questionNumber": question_obj.get("questionNumber", question_obj.get("question_number")),
        "difficulty": question_obj.get("difficulty"),
        "maxPoints": max_points,
        "accuracyPercent": accuracy_percent,
        "earnedPoints": earned_points,
        "breakdown": {
            "issueScore": issue_score,
            "ruleScore": rule_score,
            "applicationScore": app_score,
            "conclusionScore": conc_score,
        },
        "iracBreakdown": {
            "issueScore": issue_score,
            "ruleScore": rule_score,
            "applicationScore": app_score,
            "conclusionScore": conc_score,
        },
        "matchedKeywords": matched_keywords,
        "missingKeywords": missing_keywords,
        "feedback": feedback,
        "canonicalIRAC": irac,
        "canonicalIrac": irac,
    }
