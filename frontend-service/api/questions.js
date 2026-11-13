import fs from "fs";
import path from "path";

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const dataPath = path.join(process.cwd(), "public", "data", "questions_irac.json");
    const bank = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    return res.status(200).json({
      total: bank.length,
      questions: bank
    });
  } catch (e) {
    return res.status(500).json({ error: "Failed to read questions_irac.json: " + e.message });
  }
}

