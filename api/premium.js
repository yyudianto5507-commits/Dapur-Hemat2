/* POST /api/premium  { kode }  → cek kode di Google Sheets, kembalikan token Premium. */
import { allow, clientIp } from "./_lib/ratelimit.js";
import { callSheets } from "./_lib/sheets.js";
import { normalizeCode, makeToken, premiumConfigured } from "./_lib/premium.js";

const REASON = {
  tidak_ada: "Kode tidak ditemukan. Periksa lagi huruf dan angkanya.",
  kedaluwarsa: "Masa berlaku kode ini sudah habis. Perpanjang Premium untuk mendapat kode baru.",
  nonaktif: "Kode ini sudah tidak aktif. Hubungi admin lewat WhatsApp."
};

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "method_not_allowed" }); }
  if (!premiumConfigured() || !process.env.FEEDBACK_WEBHOOK_URL) return res.status(503).json({ error: "not_configured", message: "Fitur Premium belum diatur oleh admin." });
  // batasi tebakan kode
  if (!(await allow("premium:" + clientIp(req), 10, 3600))) return res.status(429).json({ error: "rate_limited", message: "Terlalu banyak percobaan. Coba lagi satu jam lagi." });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const kode = normalizeCode(body && body.kode);
  if (!kode) return res.status(400).json({ error: "format", message: "Format kode: DH-XXXX-XXXX (8 huruf/angka setelah DH)." });

  let r;
  try { r = await callSheets("verify", { kode }); }
  catch (e) {
    console.error("premium: gagal cek kode", e.message);
    return res.status(502).json({ error: "upstream", message: "Kode belum bisa dicek. Coba lagi beberapa saat lagi." });
  }
  if (!r || !r.valid) {
    const reason = (r && r.reason) || "tidak_ada";
    return res.status(404).json({ error: reason, message: REASON[reason] || REASON.tidak_ada });
  }
  return res.status(200).json({
    ok: true, kode, paket: r.paket || "Premium", sampai: r.sampai, nama: r.nama || "",
    token: makeToken({ kode, sampai: r.sampai, paket: r.paket })
  });
}
