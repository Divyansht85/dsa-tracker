const express = require("express");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const app = express();
const PORT = 3456;
const DB_FILE = path.join(__dirname, "db.json");

// ── Middleware ──
app.use(express.json());
app.use(express.static(__dirname)); // serve index.html, style.css, app.js

// ── DB Helpers ──
function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, "[]", "utf-8");
    }
    return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// ══════════════════════════════════════
//  REST API
// ══════════════════════════════════════

// GET all questions
app.get("/api/questions", (req, res) => {
  res.json(readDB());
});

// POST – add a new question
app.post("/api/questions", (req, res) => {
  const data = readDB();
  const question = req.body;
  if (!question.id || !question.topic || !question.name) {
    return res.status(400).json({ error: "id, topic, and name are required" });
  }
  data.push(question);
  writeDB(data);
  res.status(201).json(question);
});

// PUT – update an existing question
app.put("/api/questions/:id", (req, res) => {
  const data = readDB();
  const idx = data.findIndex((q) => q.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  data[idx] = { ...data[idx], ...req.body, id: req.params.id };
  writeDB(data);
  res.json(data[idx]);
});

// DELETE – remove a question
app.delete("/api/questions/:id", (req, res) => {
  let data = readDB();
  const len = data.length;
  data = data.filter((q) => q.id !== req.params.id);
  if (data.length === len) return res.status(404).json({ error: "Not found" });
  writeDB(data);
  res.json({ success: true });
});

// POST – bulk import (merges, skips duplicates)
app.post("/api/questions/import", (req, res) => {
  const incoming = req.body;
  if (!Array.isArray(incoming)) {
    return res.status(400).json({ error: "Expected an array" });
  }
  const data = readDB();
  const existingIds = new Set(data.map((q) => q.id));
  let added = 0;
  incoming.forEach((q) => {
    if (!existingIds.has(q.id)) {
      data.push(q);
      added++;
    }
  });
  writeDB(data);
  res.json({ added });
});

// ── Start ──
app.listen(PORT, () => {
  console.log(`\n  ⚡ DSA Tracker server running at http://localhost:${PORT}`);
  console.log(`  📦 Auto-save to GitHub on shutdown (Ctrl+C)\n`);
});

// ── Auto Git Save on Shutdown ──
function gitAutoSave() {
  console.log("\n  💾 Auto-saving to GitHub...");
  try {
    const status = execSync("git status --porcelain", { cwd: __dirname }).toString().trim();
    if (!status) {
      console.log("  ✓ No changes to save.\n");
      process.exit(0);
      return;
    }
    execSync("git add -A", { cwd: __dirname });
    const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    execSync(`git commit -m "auto-save: ${timestamp}"`, { cwd: __dirname });
    execSync("git push", { cwd: __dirname, timeout: 15000 });
    console.log("  ✓ Saved & pushed to GitHub!\n");
  } catch (err) {
    console.error("  ✗ Auto-save failed:", err.message, "\n");
  }
  process.exit(0);
}

process.on("SIGINT", gitAutoSave);   // Ctrl+C
process.on("SIGTERM", gitAutoSave);  // kill command
