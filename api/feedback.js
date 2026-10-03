/* POST /api/feedback — meneruskan umpan balik ke Google Sheets (lewat Apps Script). */
import { allow, clientIp } from "./_lib/ratelimit.js";

const ALLOWED = {
  cocok: ["Cocok", "Lumayan", "Tidak cocok"],
  harga: ["Pas", "Terlalu murah", "Terlalu mahal"],
  lagi: ["Pasti", "Mungkin", "Tidak"],
  bayar: ["Mau", "Pikir dulu", "Tidak"]
};
const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max)
  .replace(/^[=+\-@]/, "'$&"); // cegah formula spreadsheet

export function parseFeedback(b) {
  b = b && typeof b === "object" ? b : {};
  const row = { waktu: new Date().toISOString() };
  for (const k in ALLOWED) row[k] = ALLOWED[k].includes(b[k]) ? b[k] : "";
  row.saran = clean(b.saran, 1000);
  row.budget = Math.max(0, Math.min(1000000, Math.round(Number(b.budget) || 0)));
  row.orang = Math.max(0, Math.min(12, Math.round(Number(b.orang) || 0)));
  row.hari = [1, 3, 7].includes(Number(b.hari)) ? Number(b.hari) : 0;
  row.daerah = clean(b.daerah, 60);
  row.mode = b.mode === "ai" ? "ai" : "local";
  row.menu = clean(b.menu, 600);
  row.pengguna = clean(b.pengguna, 40).replace(/[^\w-]/g, "");
  return row;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "method_not_allowed" }); }
  if (!(await allow("fb:" + clientIp(req), 10, 3600))) return res.status(429).json({ error: "rate_limited" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const row = parseFeedback(body);
  if (!row.cocok && !row.harga && !row.lagi && !row.bayar && !row.saran) return res.status(400).json({ error: "empty" });

  const url = process.env.FEEDBACK_WEBHOOK_URL;
  if (!url) { console.log("feedback (belum ada FEEDBACK_WEBHOOK_URL):", JSON.stringify(row)); return res.status(200).json({ ok: true, stored: false }); }

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: process.env.FEEDBACK_SECRET || "", row }),
      redirect: "follow",
      signal: AbortSignal.timeout(15000)
    });
    const text = await r.text();
    if (!r.ok || !/"ok"\s*:\s*true/.test(text)) throw new Error(r.status + " " + text.slice(0, 200));
    return res.status(200).json({ ok: true, stored: true });
  } catch (e) {
    console.error("feedback: gagal ke Sheets", e.message);
    return res.status(502).json({ error: "store_failed" });
  }
}
