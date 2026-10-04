/* Token Premium: bukti bertanda tangan bahwa kode sudah dicek, supaya server tidak perlu
   bertanya ke Google Sheets setiap kali menu disusun. Token berlaku paling lama 3 hari
   (atau sampai masa Premium habis); setelah itu aplikasi mengecek ulang kode secara otomatis,
   sehingga kode yang dinonaktifkan berhenti bekerja dalam waktu paling lama 3 hari. */
import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_DAYS = 3;
const secret = () => process.env.PREMIUM_SECRET || process.env.FEEDBACK_SECRET || "";
const b64 = (s) => Buffer.from(s).toString("base64url");
const sign = (data) => createHmac("sha256", secret()).update(data).digest("base64url");

export const premiumConfigured = () => secret().length >= 8;

export function normalizeCode(v) {
  const s = String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = s.startsWith("DH") ? s.slice(2) : s;
  return /^[A-Z0-9]{8}$/.test(body) ? "DH-" + body.slice(0, 4) + "-" + body.slice(4) : "";
}

/* sampai: "YYYY-MM-DD" (hari terakhir berlaku, waktu Jakarta). */
export function makeToken({ kode, sampai, paket }, now = Date.now()) {
  const until = Date.parse(sampai + "T23:59:59+07:00");
  const exp = Math.min(until, now + TOKEN_DAYS * 86400000);
  const payload = b64(JSON.stringify({ k: kode, p: paket || "Premium", s: sampai, exp }));
  return payload + "." + sign(payload);
}

/* Mengembalikan isi token jika sah dan belum kedaluwarsa, selain itu null. */
export function readToken(token, now = Date.now()) {
  if (!premiumConfigured() || typeof token !== "string" || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expect = sign(payload);
  const a = Buffer.from(sig || ""), b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.exp > now ? data : null;
  } catch (e) { return null; }
}

export function tokenFromRequest(req) {
  const h = req.headers || {};
  return readToken(h["x-premium-token"] || h["X-Premium-Token"] || "");
}
