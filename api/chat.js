// Vercel Serverless Function — proxy aman Gemini (key di env, tidak di repo)
const MODELS = ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-flash-latest", "gemini-2.5-flash"];
const hits = new Map();

export default async function handler(req, res) {
  const allowed = (process.env.ALLOWED_ORIGIN || "*").split(",").map((s) => s.trim());
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", allowed.includes("*") ? "*" : (allowed.includes(origin) ? origin : allowed[0]));
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Gunakan POST." });

  // Rate limit sederhana: 20 req / menit / IP
  const ip = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "anon").toString().split(",")[0].trim();
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  arr.push(now);
  hits.set(ip, arr);
  if (arr.length > 20) return res.status(429).json({ error: "Terlalu banyak request, coba lagi semenit." });

  const API_KEY = process.env.GEMINI_API_KEY || "";
  if (!API_KEY) return res.status(501).json({ error: "Server belum dikonfigurasi (GEMINI_API_KEY kosong)." });

  const { parts, subject, model } = req.body || {};
  if (!Array.isArray(parts) || parts.length === 0 || parts.length > 4)
    return res.status(400).json({ error: "Payload tidak valid." });
  if (JSON.stringify(parts).length > 300_000)
    return res.status(413).json({ error: "Payload terlalu besar." });

  const tryModels = model ? [model, ...MODELS.filter((m) => m !== model)] : MODELS;
  let lastErr = "unknown", lastStatus = 502;
  for (const m of tryModels) {
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 20000);
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
        body: JSON.stringify({ contents: [{ parts }] }),
        signal: ac.signal,
      });
      clearTimeout(to);
      const j = await r.json().catch(() => ({}));
      if (r.ok && j?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return res.status(200).json({ text: j.candidates[0].content.parts[0].text, model: m, subject: subject || "" });
      }
      lastErr = j?.error?.message || `HTTP ${r.status}`;
      lastStatus = r.status;
      if ([400, 401, 403].includes(r.status)) break;
    } catch (e) {
      lastErr = String(e?.message || e);
      lastStatus = 0;
    }
  }
  return res.status(lastStatus).json({ error: lastErr });
}
