/* /api/order
   GET  → paket, manfaat, dan cara bayar yang ditampilkan di halaman order.
   POST → mencatat pesanan ke Google Sheets dan mengembalikan instruksi pembayaran. */
import { allow, clientIp } from "./_lib/ratelimit.js";
import { sendToSheets, safeCell } from "./_lib/sheets.js";
import { PACKAGES, BENEFITS, PAYMENT_LABEL, findPackage } from "./_lib/products.js";

const env = (k) => String(process.env[k] || "").trim();

/* Cara bayar yang aktif, diambil dari Environment Variables Vercel. */
export function paymentConfig() {
  const methods = [];
  const bank = env("PAYMENT_BANK").split("|").map((s) => s.trim()).filter(Boolean);
  if (bank.length) methods.push({ id: "transfer", label: PAYMENT_LABEL.transfer, lines: bank });
  if (env("PAYMENT_QRIS_IMAGE")) methods.push({ id: "qris", label: PAYMENT_LABEL.qris, image: env("PAYMENT_QRIS_IMAGE"), lines: ["Pindai kode QRIS dengan aplikasi bank atau e-wallet apa pun."] });
  const ew = env("PAYMENT_EWALLET").split("|").map((s) => s.trim()).filter(Boolean);
  if (ew.length) methods.push({ id: "ewallet", label: PAYMENT_LABEL.ewallet, lines: ew });
  return { methods, adminWhatsapp: normalizePhone(env("ADMIN_WHATSAPP")) || "" };
}

/* 08xx / +628xx / 628xx → 628xx. Mengembalikan "" jika tidak valid. */
export function normalizePhone(v) {
  let d = String(v || "").replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (d.startsWith("0")) d = "62" + d.slice(1);
  if (d.startsWith("8")) d = "62" + d;
  return /^628\d{7,12}$/.test(d) ? d : "";
}

export function makeOrderId(now = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  const ymd = String(now.getUTCFullYear()).slice(2) + p(now.getUTCMonth() + 1) + p(now.getUTCDate());
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, "X").padEnd(4, "X");
  return "DH-" + ymd + "-" + rand;
}

/* Memeriksa isian form. Mengembalikan {order} atau {errors:{field: pesan}}. */
export function parseOrder(b, cfg) {
  b = b && typeof b === "object" ? b : {};
  const errors = {};
  const nama = safeCell(b.nama, 80);
  if (nama.replace(/[^A-Za-zÀ-ɏ]/g, "").length < 2) errors.nama = "Isi nama Ibu.";
  const wa = normalizePhone(b.whatsapp);
  if (!wa) errors.whatsapp = "Isi nomor WhatsApp yang aktif, misalnya 0812 3456 7890.";
  const email = safeCell(b.email, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Format email belum benar, atau kosongkan saja.";
  const pkg = findPackage(b.paket);
  if (!pkg) errors.paket = "Pilih salah satu paket.";
  const ids = cfg.methods.map((m) => m.id);
  const bayar = ids.length ? (ids.includes(b.bayar) ? b.bayar : "") : "admin";
  if (!bayar) errors.bayar = "Pilih cara pembayaran.";
  if (b.setuju !== true) errors.setuju = "Centang persetujuan untuk melanjutkan.";
  if (Object.keys(errors).length) return { errors };

  const kodeUnik = 1 + Math.floor(Math.random() * 299);
  return {
    order: {
      id: makeOrderId(),
      waktu: new Date().toISOString(),
      nama, whatsapp: wa, email,
      paket: pkg.name, harga: pkg.price, kode_unik: kodeUnik, total: pkg.price + kodeUnik,
      bayar: PAYMENT_LABEL[bayar] || "Dihubungi admin",
      daerah: safeCell(b.daerah, 60),
      catatan: safeCell(b.catatan, 500),
      status: "Menunggu pembayaran"
    }
  };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const cfg = paymentConfig();

  if (req.method === "GET") {
    return res.status(200).json({ packages: PACKAGES, benefits: BENEFITS, methods: cfg.methods, adminWhatsapp: cfg.adminWhatsapp });
  }
  if (req.method !== "POST") { res.setHeader("Allow", "GET, POST"); return res.status(405).json({ error: "method_not_allowed" }); }
  if (!(await allow("order:" + clientIp(req), 5, 3600))) return res.status(429).json({ error: "rate_limited" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  if (body && body.website) return res.status(200).json({ ok: true }); // jebakan spam: kolom tersembunyi terisi

  const { order, errors } = parseOrder(body, cfg);
  if (errors) return res.status(400).json({ error: "invalid", fields: errors });

  try {
    const stored = await sendToSheets("order", order);
    if (!stored) console.log("order (belum ada FEEDBACK_WEBHOOK_URL):", JSON.stringify(order));
  } catch (e) {
    console.error("order: gagal ke Sheets", e.message);
    return res.status(502).json({ error: "store_failed" });
  }
  return res.status(200).json({
    ok: true,
    order: { id: order.id, paket: order.paket, harga: order.harga, kode_unik: order.kode_unik, total: order.total, bayar: order.bayar, nama: order.nama },
    method: cfg.methods.find((m) => m.label === order.bayar) || null,
    adminWhatsapp: cfg.adminWhatsapp
  });
}
