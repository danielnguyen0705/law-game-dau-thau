/**
 * Self-Contained Semantic IRAC Grader (Client + API Gateway Hybrid - v9.2)
 * Zero external module dependencies so ES Module loading never fails on GitHub Pages.
 */

const VIETNAMESE_ABBREVIATIONS = [
  [/\bnsnn\b/gi, "ngân sách nhà nước"],
  [/\bđvsncl\b/gi, "đơn vị sự nghiệp công lập"],
  [/\bdnnn\b/gi, "doanh nghiệp nhà nước"],
  [/\bhsmt\b/gi, "hồ sơ mời thầu"],
  [/\bhsdt\b/gi, "hồ sơ dự thầu"],
  [/\bhsyc\b/gi, "hồ sơ yêu cầu"],
  [/\bhsđx\b/gi, "hồ sơ đề xuất"],
  [/\bhsđxtc\b/gi, "hồ sơ đề xuất về tài chính"],
  [/\bhsđxkt\b/gi, "hồ sơ đề xuất về kỹ thuật"],
  [/\bhsmqt\b/gi, "hồ sơ mời quan tâm"],
  [/\bhsmst\b/gi, "hồ sơ mời sơ tuyển"],
  [/\bkhlcnt\b/gi, "kế hoạch lựa chọn nhà thầu"],
  [/\bbđdt\b/gi, "bảo đảm dự thầu"],
  [/\bbđthhđ\b/gi, "bảo đảm thực hiện hợp đồng"],
  [/\bcđt\b/gi, "chủ đầu tư"],
  [/\bbmt\b/gi, "bên mời thầu"],
  [/\bnđ\b/gi, "nghị định"],
  [/\btt\b/gi, "thông tư"],
  [/\bđk\b/gi, "điều kiện"],
  [/\bk\.\s*(\d+)/gi, "khoản $1"],
  [/\bđ\.\s*(\d+)/gi, "điều $1"],
  [/\b0(\d)\b/g, "$1"]
];

const NUMBER_WORDS = {
  "một": "1",
  "hai": "2",
  "ba": "3",
  "bốn": "4",
  "năm": "5",
  "sáu": "6",
  "bảy": "7",
  "tám": "8",
  "chín": "9",
  "mười": "10"
};

const STOPWORDS = new Set([
  "là", "và", "của", "có", "được", "trong", "cho", "với", "theo", "tại", "về",
  "các", "những", "một", "này", "đó", "khi", "thì", "mà", "như", "thế", "nào",
  "hay", "hoặc", "không", "phải", "cần", "để", "từ", "đến", "trên", "dưới",
  "do", "bởi", "vào", "ra", "lên", "xuống", "sẽ", "đã", "đang", "rằng", "nếu"
]);

export function normalizeText(text) {
  if (!text) return "";
  let s = String(text).toLowerCase().normalize("NFC");
  for (const [regex, replacement] of VIETNAMESE_ABBREVIATIONS) {
    s = s.replace(regex, replacement);
  }
  s = s.replace(/[^\p{L}\p{N}%/\s]/gu, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function tokenize(text, removeStopwords = true) {
  const norm = normalizeText(text);
  if (!norm) return [];
  const rawTokens = norm.split(" ").filter(Boolean);
  const tokens = rawTokens.map((t) => NUMBER_WORDS[t] || t);
  if (!removeStopwords) return tokens;
  return tokens.filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function getNgrams(tokens, n = 2) {
  const ngrams = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join(" "));
  }
  return ngrams;
}

function computeOverlapScore(playerTokens, refTokens) {
  if (!refTokens.length || !playerTokens.length) return 0;
  const playerSet = new Set(playerTokens);
  const refUnique = [...new Set(refTokens)];
  let matched = 0;
  for (const t of refUnique) {
    if (playerSet.has(t)) matched++;
  }
  const unigramRecall = matched / refUnique.length;

  const playerBigrams = new Set(getNgrams(playerTokens, 2));
  const refBigrams = [...new Set(getNgrams(refTokens, 2))];
  let bigramMatched = 0;
  if (refBigrams.length > 0) {
    for (const bg of refBigrams) {
      if (playerBigrams.has(bg)) bigramMatched++;
    }
  }
  const bigramRecall = refBigrams.length > 0 ? bigramMatched / refBigrams.length : unigramRecall;

  return Math.min(1, unigramRecall * 0.68 + bigramRecall * 0.32);
}

function extractLegalCitations(text) {
  const norm = normalizeText(text);
  const citations = [];
  const regexes = [
    /điều\s+\d+[a-z]?/g,
    /khoản\s+\d+[a-z]?/g,
    /điểm\s+[a-zđ]\b/g,
    /luật\s+đấu\s+thầu/g,
    /22\/2023/g,
    /90\/2025/g,
    /57\/2024/g,
    /143\/2025/g,
    /214\/2025/g,
    /60\/2021/g,
    /\d+\s*%/g,
    /\d+\s*(ngày|năm|tháng|tỷ|triệu|giờ)/g
  ];
  for (const rgx of regexes) {
    const matches = norm.match(rgx);
    if (matches) citations.push(...matches);
  }
  return [...new Set(citations)];
}

export function gradeAnswerLocal(questionObj, playerAnswerRaw) {
  const playerAnswer = String(playerAnswerRaw || "").trim();
  const maxPoints = Number(questionObj.points || 20);
  const irac = questionObj.irac || {
    issue: "",
    rule: "",
    application: "",
    conclusion: ""
  };
  const keywords = Array.isArray(questionObj.keywords) ? questionObj.keywords : [];

  if (!playerAnswer || playerAnswer.length < 2) {
    return {
      questionId: questionObj.id,
      questionNumber: questionObj.question_number,
      difficulty: questionObj.difficulty,
      maxPoints,
      accuracyPercent: 0,
      earnedPoints: 0,
      iracBreakdown: {
        issueScore: 0,
        ruleScore: 0,
        applicationScore: 0,
        conclusionScore: 0
      },
      matchedKeywords: [],
      missingKeywords: keywords,
      feedback: "Đội chơi chưa đưa ra câu trả lời hoặc câu trả lời trống (0% độ chính xác).",
      canonicalIrac: irac
    };
  }

  const normPlayer = normalizeText(playerAnswer);
  const playerTokens = tokenize(playerAnswer, true);
  const playerTokensAll = tokenize(playerAnswer, false);

  const matchedKeywords = [];
  const missingKeywords = [];

  for (const kw of keywords) {
    const normKw = normalizeText(kw);
    if (!normKw) continue;
    const kwTokens = tokenize(kw, true);
    if (normPlayer.includes(normKw)) {
      matchedKeywords.push(kw);
    } else if (kwTokens.length > 0) {
      const hitCount = kwTokens.filter((t) => playerTokens.includes(t) || playerTokensAll.includes(t)).length;
      if (hitCount / kwTokens.length >= 0.65) {
        matchedKeywords.push(kw);
      } else {
        missingKeywords.push(kw);
      }
    } else {
      missingKeywords.push(kw);
    }
  }

  const keywordRatio = keywords.length > 0 ? matchedKeywords.length / keywords.length : 0.5;

  const issueTokens = tokenize(irac.issue, true);
  const ruleTokens = tokenize(irac.rule, true);
  const appTokens = tokenize(irac.application, true);
  const concTokens = tokenize(irac.conclusion, true);

  const rawIssueOverlap = computeOverlapScore(playerTokens, issueTokens);
  const rawRuleOverlap = computeOverlapScore(playerTokens, ruleTokens);
  const rawAppOverlap = computeOverlapScore(playerTokens, appTokens);
  const rawConcOverlap = computeOverlapScore(playerTokens, concTokens);

  const refCitations = extractLegalCitations(`${irac.rule} ${irac.conclusion}`);
  let citationMatchRatio = rawRuleOverlap;
  if (refCitations.length > 0) {
    let matchedCit = 0;
    for (const cit of refCitations) {
      if (normPlayer.includes(cit)) {
        matchedCit++;
      } else {
        const citParts = cit.split(/\s+/);
        if (citParts.every((p) => playerTokensAll.includes(p))) matchedCit++;
      }
    }
    citationMatchRatio = Math.max(rawRuleOverlap, matchedCit / refCitations.length);
  }

  const issueScore = Math.min(100, Math.round(Math.min(1, rawIssueOverlap * 1.65 + keywordRatio * 0.35) * 100));
  const ruleScore = Math.min(100, Math.round(Math.min(1, citationMatchRatio * 1.35 + rawRuleOverlap * 0.5 + keywordRatio * 0.25) * 100));
  const applicationScore = Math.min(100, Math.round(Math.min(1, rawAppOverlap * 1.55 + keywordRatio * 0.45) * 100));
  const conclusionScore = Math.min(100, Math.round(Math.min(1, rawConcOverlap * 1.55 + keywordRatio * 0.4) * 100));

  let accuracyPercent = Math.round(
    issueScore * 0.15 +
    ruleScore * 0.25 +
    applicationScore * 0.30 +
    conclusionScore * 0.30
  );

  if (keywordRatio >= 0.85 && conclusionScore >= 80) {
    accuracyPercent = Math.max(accuracyPercent, 90);
  } else if (keywordRatio >= 0.7 && conclusionScore >= 70) {
    accuracyPercent = Math.max(accuracyPercent, 80);
  }

  if (playerTokensAll.length < 5 && accuracyPercent > 60) {
    accuracyPercent = Math.round(accuracyPercent * 0.75);
  }

  accuracyPercent = Math.max(0, Math.min(100, accuracyPercent));

  const earnedPoints = Math.round((maxPoints * (accuracyPercent / 100)) * 10) / 10;

  let feedback = "";
  if (accuracyPercent >= 85) {
    feedback = `Xuất sắc! Câu trả lời nắm vững trọng tâm pháp lý, lập luận chặt chẽ và nêu đúng kết luận cũng như căn cứ tại ${irac.rule}.`;
  } else if (accuracyPercent >= 65) {
    feedback = `Khá tốt! Đội chơi đã xác định đúng hướng giải quyết và kết luận chính, nhưng cần bổ sung đầy đủ hơn căn cứ pháp lý (${irac.rule}) hoặc chi tiết phân tích.`;
  } else if (accuracyPercent >= 40) {
    feedback = `Đạt mức cơ bản. Câu trả lời có chạm tới một số ý trong đáp án nhưng còn thiếu căn cứ pháp lý cốt lõi (${irac.rule}) và lập luận áp dụng chưa đầy đủ.`;
  } else {
    feedback = `Chưa chính xác hoặc còn sơ sài. Hãy đối chiếu kỹ cấu trúc IRAC bên dưới, đặc biệt là căn cứ tại ${irac.rule} và phần Kết luận.`;
  }

  return {
    questionId: questionObj.id,
    questionNumber: questionObj.question_number,
    difficulty: questionObj.difficulty,
    maxPoints,
    accuracyPercent,
    earnedPoints,
    iracBreakdown: {
      issueScore,
      ruleScore,
      applicationScore,
      conclusionScore
    },
    matchedKeywords,
    missingKeywords,
    feedback,
    canonicalIrac: irac
  };
}

export async function gradeAnswerWithService(questionObj, playerAnswerRaw) {
  try {
    const res = await fetch("/api/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: questionObj.id,
        question: questionObj,
        questionData: questionObj,
        playerAnswer: playerAnswerRaw
      })
    });
    if (res.ok) {
      const data = await res.json();
      return {
        ...data,
        breakdown: data.breakdown || data.iracBreakdown || {
          issueScore: 0,
          ruleScore: 0,
          applicationScore: 0,
          conclusionScore: 0
        },
        canonicalIRAC: data.canonicalIRAC || data.canonicalIrac || questionObj.irac
      };
    }
  } catch {
    // Fallback to deterministic local semantic IRAC engine
  }
  const local = gradeAnswerLocal(questionObj, playerAnswerRaw);
  return {
    ...local,
    breakdown: local.iracBreakdown,
    canonicalIRAC: local.canonicalIrac
  };
}

export async function gradeAnswerSmart({ question, playerAnswer }) {
  return gradeAnswerWithService(question, playerAnswer);
}
