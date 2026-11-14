import { gradeAnswerLocal } from "./graderCore.js";

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
