/* POST /api/feedback — meneruskan umpan balik ke Google Sheets (lewat Apps Script). */
import { allow, clientIp } from "./_lib/ratelimit.js";
import { sendToSheets, safeCell } from "./_lib/sheets.js";

const ALLOWED = {
  cocok: ["Cocok", "Lumayan", "Tidak cocok"],
  harga: ["Pas", "Terlalu murah", "Terlalu mahal"],
  lagi: ["Pasti", "Mungkin", "Tidak"],
  bayar: ["Mau", "Pikir dulu", "Tidak"]
};

export function parseFeedback(b) {
  b = b && typeof b === "object" ? b : {};
  const row = { waktu: new Date().toISOString() };
  for (const k in ALLOWED) row[k] = ALLOWED[k].includes(b[k]) ? b[k] : "";
  row.saran = safeCell(b.saran, 1000);
  row.budget = Math.max(0, Math.min(1000000, Math.round(Number(b.budget) || 0)));
  row.orang = Math.max(0, Math.min(12, Math.round(Number(b.orang) || 0)));
  row.hari = [1, 3, 7].includes(Number(b.hari)) ? Number(b.hari) : 0;
  row.daerah = safeCell(b.daerah, 60);
  row.mode = b.mode === "ai" ? "ai" : "local";
  row.menu = safeCell(b.menu, 600);
  row.pengguna = safeCell(b.pengguna, 40).replace(/[^\w-]/g, "");
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

  try {
    const stored = await sendToSheets("feedback", row);
    if (!stored) console.log("feedback (belum ada FEEDBACK_WEBHOOK_URL):", JSON.stringify(row));
    return res.status(200).json({ ok: true, stored });
  } catch (e) {
    console.error("feedback: gagal ke Sheets", e.message);
    return res.status(502).json({ error: "store_failed" });
  }
}
