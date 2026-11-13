import { gradeAnswerLocal } from "../src/utils/semanticGrader.js";
import fs from "fs";
import path from "path";

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { questionId, playerAnswer, questionData } = req.body || {};
  let targetQuestion = questionData;

  if (!targetQuestion && questionId) {
    try {
      const dataPath = path.join(process.cwd(), "public", "data", "questions_irac.json");
      const bank = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
      targetQuestion = bank.find((q) => Number(q.id) === Number(questionId));
    } catch (e) {
      return res.status(500).json({ error: "Failed to load question bank: " + e.message });
    }
  }

  if (!targetQuestion) {
    return res.status(400).json({ error: "Missing questionData or valid questionId" });
  }

  const result = gradeAnswerLocal(targetQuestion, playerAnswer);
  return res.status(200).json(result);
}

