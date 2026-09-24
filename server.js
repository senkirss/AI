import express from "express";
import cors from "cors";
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY || "";
const MODELS = ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-flash-latest", "gemini-2.5-flash"];

app.disable("x-powered-by");
app.use(cors({ origin: process.env.ALLOWED_ORIGIN?.split(",") || true }));
app.use(express.json({ limit: "6mb" }));
app.use(express.static(__dirname));

// Rate limit sederhana: 20 req / menit / IP
const hits = new Map();
app.use("/api/", (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  arr.push(now);
  hits.set(ip, arr);
  if (arr.length > 20) return res.status(429).json({ error: "Terlalu banyak request, coba lagi semenit." });
  next();
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!API_KEY) return res.status(501).json({ error: "Server belum dikonfigurasi (GEMINI_API_KEY kosong)." });
    const { parts, subject, model } = req.body || {};
    if (!Array.isArray(parts) || parts.length === 0 || parts.length > 4)
      return res.status(400).json({ error: "Payload tidak valid." });
    const textLen = JSON.stringify(parts).length;
    if (textLen > 300_000) return res.status(413).json({ error: "Payload terlalu besar." });

    const tryModels = model ? [model, ...MODELS.filter((m) => m !== model)] : MODELS;
    let lastErr = "unknown", lastStatus = 502;
    for (const m of tryModels) {
      const ac = new AbortController();
      const to = setTimeout(() => ac.abort(), 20000);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
        body: JSON.stringify({ contents: [{ parts }] }),
        signal: ac.signal,
      });
      clearTimeout(to);
      const j = await r.json().catch(() => ({}));
      if (r.ok && j?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return res.json({ text: j.candidates[0].content.parts[0].text, model: m, subject: subject || "" });
      }
      lastErr = j?.error?.message || `HTTP ${r.status}`;
      lastStatus = r.status;
      if ([400, 401, 403].includes(r.status)) break; // key salah -> stop
    }
    return res.status(lastStatus).json({ error: lastErr });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Proxy error." });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Akutansi aman jalan di http://localhost:${PORT} (key di env, tidak di frontend)`));
