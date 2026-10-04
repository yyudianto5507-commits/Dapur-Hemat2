/* Uji cepat tanpa koneksi internet: node scripts/test.mjs */
import { readFileSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

let passed = 0;
const ok = (name, fn) => Promise.resolve().then(fn).then(() => { passed++; console.log("✓", name); });

/* Mesin menu lokal */
const ctx = { window: {} };
vm.runInNewContext(readFileSync(new URL("../public/engine.js", import.meta.url), "utf8"), ctx);
const { localPlan } = ctx.window.DapurEngine;

await ok("mesin lokal: 7 hari tanpa menu kembar, sesuai pantangan", () => {
  const p = localPlan({ budget: 35000, ppl: 4, days: 7, owned: ["tempe", "telur"], prefs: ["anak", "ayam"] });
  assert.equal(p.days.length, 7);
  const lauk = p.days.map((d) => d.lauk.name);
  assert.equal(new Set(lauk).size, 7);
  // Budget longgar: sayur juga tidak berulang (budget ketat boleh mengulang sayur murah)
  const p2 = localPlan({ budget: 60000, ppl: 4, days: 7, owned: [], prefs: [] });
  const sayur = p2.days.map((d) => d.sayur.name);
  assert.equal(new Set(sayur).size, 7, "sayur berulang: " + sayur.join(", "));
  assert.ok(!p.days.some((d) => /\bayam\b|balado/i.test(d.lauk.name + d.sayur.name)));
  assert.ok(p.shopping.every((s) => s.price > 0));
});
await ok("mesin lokal: bahan yang ada tidak dibeli di hari pertama", () => {
  const p = localPlan({ budget: 35000, ppl: 4, days: 1, owned: ["tempe", "kangkung", "tomat"], prefs: [] });
  const items = p.shopping.map((s) => s.item);
  const usedOwned = [p.days[0].lauk.name, p.days[0].sayur.name].join(" ");
  if (/tempe/i.test(usedOwned)) assert.ok(!items.includes("Tempe"));
});
await ok("mesin lokal: porsi 8 orang lebih mahal dari 4 orang", () => {
  const t = (n) => localPlan({ budget: 100000, ppl: n, days: 3, owned: [], prefs: [] }).shopping.reduce((a, b) => a + b.price, 0);
  assert.ok(t(8) > t(4));
});

/* Backend */
const menu = await import("../api/menu.js");
const fb = await import("../api/feedback.js");

function mockRes() {
  const r = { code: 0, body: null, headers: {} };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
}
const req = (body, ip = "1.1.1.1") => ({ method: "POST", body, headers: { "x-forwarded-for": ip }, socket: {} });

await ok("input: angka dijepit, teks dibersihkan, pantangan asing dibuang", () => {
  const i = menu.parseInput({ budget: 99, ppl: 50, days: 5, owned: ["tempe<script>", "x".repeat(99)], prefs: ["pedas", "hack"], region: "Surabaya{}" });
  assert.equal(i.budget, 5000); assert.equal(i.ppl, 12); assert.equal(i.days, 3);
  assert.ok(!i.owned[0].includes("<")); assert.equal(i.owned[1].length, 30);
  assert.deepEqual(i.prefs, ["pedas"]); assert.ok(!/[{}]/.test(i.region));
});
await ok("JSON AI: terbaca dari blok kode dan teks campuran", () => {
  assert.deepEqual(menu.extractJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(menu.extractJson('Berikut menunya: {"a":2} semoga membantu'), { a: 2 });
  assert.equal(menu.extractJson("maaf"), null);
});
await ok("normalisasi: hari dipotong sesuai permintaan, grup tak dikenal diperbaiki", () => {
  const p = menu.normalizePlan({ days: [1, 2, 3, 4].map((n) => ({ label: "Hari " + n, cost: "20000", lauk: { name: "Tahu", steps: ["a"] }, sayur: { name: "Bayam", steps: ["b"] } })), shopping: [{ item: "Tahu", price: "5000", group: "Protein" }] }, 3);
  assert.equal(p.days.length, 3); assert.equal(p.days[0].cost, 20000); assert.equal(p.shopping[0].group, "Bumbu & pelengkap");
  assert.equal(menu.normalizePlan({ days: [], shopping: [] }, 3), null);
});

const realFetch = globalThis.fetch;
const aiPlan = { days: [1, 2, 3].map((n) => ({ label: "Hari " + n, cost: 25000, lauk: { name: "Lauk " + n, why: "x", steps: ["a", "b"] }, sayur: { name: "Sayur " + n, why: "y", steps: ["c"] } })), shopping: [{ item: "Tahu", qty: "10 potong", price: 5000, group: "Lauk" }], tips: "hemat" };

await ok("API menu: tanpa API key menjawab 503 (aplikasi pindah ke mode cepat)", async () => {
  delete process.env.ANTHROPIC_API_KEY;
  const r = mockRes(); await menu.default(req({ budget: 35000 }), r);
  assert.equal(r.code, 503);
});
await ok("API menu: jawaban Claude diteruskan dalam bentuk rapi", async () => {
  process.env.ANTHROPIC_API_KEY = "test";
  let sent;
  globalThis.fetch = async (url, opt) => { sent = { url, opt }; return new Response(JSON.stringify({ content: [{ type: "text", text: "```json\n" + JSON.stringify(aiPlan) + "\n```" }] }), { status: 200 }); };
  const r = mockRes(); await menu.default(req({ budget: 35000, ppl: 4, days: 3, owned: ["Tempe"], prefs: ["anak"] }, "2.2.2.2"), r);
  assert.equal(r.code, 200); assert.equal(r.body.days.length, 3);
  assert.equal(sent.url, "https://api.anthropic.com/v1/messages");
  assert.equal(sent.opt.headers["x-api-key"], "test");
  assert.ok(JSON.parse(sent.opt.body).messages[0].content.includes("Tempe"));
});
await ok("API menu: Claude sibuk → 429, jawaban rusak → 502", async () => {
  globalThis.fetch = async () => new Response("{}", { status: 529 });
  let r = mockRes(); await menu.default(req({}, "3.3.3.3"), r); assert.equal(r.code, 429);
  globalThis.fetch = async () => new Response(JSON.stringify({ content: [{ type: "text", text: "maaf" }] }), { status: 200 });
  r = mockRes(); await menu.default(req({}, "3.3.3.4"), r); assert.equal(r.code, 502);
});
await ok("API menu: lebih dari 20 permintaan per jam dari satu pengguna ditolak", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ content: [{ type: "text", text: JSON.stringify(aiPlan) }] }), { status: 200 });
  let last;
  for (let n = 0; n < 21; n++) { last = mockRes(); await menu.default(req({}, "9.9.9.9"), last); }
  assert.equal(last.code, 429);
});
await ok("API umpan balik: jawaban asing dibuang, formula spreadsheet dinetralkan", () => {
  const row = fb.parseFeedback({ cocok: "Cocok", harga: "hack", saran: "=HYPERLINK(1)", budget: 35000, pengguna: "abc-123<x>" });
  assert.equal(row.cocok, "Cocok"); assert.equal(row.harga, ""); assert.ok(row.saran.startsWith("'="));
  assert.equal(row.pengguna, "abc-123x");
});
await ok("API umpan balik: diteruskan ke Google Sheets dengan rahasia", async () => {
  process.env.FEEDBACK_WEBHOOK_URL = "https://script.google.com/macros/s/x/exec"; process.env.FEEDBACK_SECRET = "s3";
  let sent; globalThis.fetch = async (url, opt) => { sent = JSON.parse(opt.body); return new Response('{"ok":true}', { status: 200 }); };
  const r = mockRes(); await fb.default(req({ cocok: "Lumayan", saran: "tambah sarapan" }, "4.4.4.4"), r);
  assert.equal(r.code, 200); assert.equal(sent.secret, "s3"); assert.equal(sent.row.cocok, "Lumayan");
  const e = mockRes(); await fb.default(req({}, "4.4.4.5"), e); assert.equal(e.code, 400);
});


await ok("Gemini: dipakai saat Claude gagal (mis. saldo habis)", async () => {
  process.env.ANTHROPIC_API_KEY = "test"; process.env.GEMINI_API_KEY = "g-test"; delete process.env.AI_PROVIDER;
  const calls = [];
  globalThis.fetch = async (url, opt) => {
    calls.push(String(url));
    if (String(url).includes("anthropic")) return new Response(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "Your credit balance is too low" } }), { status: 400 });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(aiPlan) }] } }] }), { status: 200 });
  };
  const r = mockRes(); await menu.default(req({ days: 3 }, "5.5.5.1"), r);
  assert.equal(r.code, 200); assert.equal(r.body.provider, "gemini");
  assert.ok(calls[0].includes("anthropic") && calls[1].includes("generativelanguage"));
});
await ok("Gemini: AI_PROVIDER=gemini dipanggil lebih dulu; hanya Gemini juga jalan", async () => {
  process.env.AI_PROVIDER = "gemini";
  const calls = [];
  globalThis.fetch = async (url) => { calls.push(String(url)); return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(aiPlan) }] } }] }), { status: 200 }); };
  let r = mockRes(); await menu.default(req({ days: 3 }, "5.5.5.2"), r);
  assert.equal(r.code, 200); assert.ok(calls[0].includes("generativelanguage"));
  delete process.env.ANTHROPIC_API_KEY; delete process.env.AI_PROVIDER;
  r = mockRes(); await menu.default(req({ days: 3 }, "5.5.5.3"), r);
  assert.equal(r.code, 200); assert.equal(r.body.provider, "gemini");
  delete process.env.GEMINI_API_KEY;
});

/* Pesanan Premium */
const order = await import("../api/order.js");
await ok("order: nomor WA dinormalkan ke 62…, nomor aneh ditolak", () => {
  assert.equal(order.normalizePhone("0812-3456-7890"), "6281234567890");
  assert.equal(order.normalizePhone("+62 812 3456 7890"), "6281234567890");
  assert.equal(order.normalizePhone("812345678"), "62812345678");
  assert.equal(order.normalizePhone("021555"), "");
});
await ok("order: GET menampilkan paket dan cara bayar dari env", async () => {
  process.env.PAYMENT_BANK = "BCA 1234567890 a.n. Yudi | BRI 0987654321 a.n. Yudi";
  process.env.PAYMENT_QRIS_IMAGE = "/qris.png"; process.env.ADMIN_WHATSAPP = "0812 1111 2222";
  const r = mockRes(); await order.default({ method: "GET", headers: {}, socket: {} }, r);
  assert.equal(r.code, 200); assert.equal(r.body.packages.length, 3);
  assert.deepEqual(r.body.methods.map((m) => m.id), ["transfer", "qris"]);
  assert.equal(r.body.methods[0].lines.length, 2); assert.equal(r.body.adminWhatsapp, "6281211112222");
});
await ok("order: isian salah dijawab per kolom", async () => {
  const r = mockRes(); await order.default(req({ nama: "A", whatsapp: "123", email: "x@", paket: "palsu", bayar: "cash" }, "7.7.7.1"), r);
  assert.equal(r.code, 400);
  assert.deepEqual(Object.keys(r.body.fields).sort(), ["bayar", "email", "nama", "paket", "setuju", "whatsapp"]);
});
await ok("order: pesanan sah tercatat ke Sheets, harga dari server + kode unik", async () => {
  let sent; globalThis.fetch = async (url, opt) => { sent = JSON.parse(opt.body); return new Response('{"ok":true}', { status: 200 }); };
  const r = mockRes();
  await order.default(req({ nama: "Siti Aminah", whatsapp: "081234567890", paket: "tiga", bayar: "transfer", setuju: true, harga: 1, catatan: "=cmd" }, "7.7.7.2"), r);
  assert.equal(r.code, 200); assert.ok(/^DH-\d{6}-[A-Z0-9]{4}$/.test(r.body.order.id));
  assert.equal(sent.type, "order"); assert.equal(sent.row.harga, 25000);
  assert.ok(sent.row.kode_unik >= 1 && sent.row.kode_unik <= 299); assert.equal(sent.row.total, 25000 + sent.row.kode_unik);
  assert.equal(sent.row.whatsapp, "6281234567890"); assert.ok(sent.row.catatan.startsWith("'="));
  assert.equal(r.body.method.id, "transfer"); assert.equal(r.body.adminWhatsapp, "6281211112222");
});
await ok("order: jebakan spam diabaikan tanpa mencatat", async () => {
  let called = false; globalThis.fetch = async () => { called = true; return new Response('{"ok":true}'); };
  const r = mockRes(); await order.default(req({ website: "http://spam", nama: "Bot" }, "7.7.7.3"), r);
  assert.equal(r.code, 200); assert.equal(called, false);
});
await ok("order: tanpa cara bayar di env, pesanan tetap bisa (admin menghubungi)", async () => {
  delete process.env.PAYMENT_BANK; delete process.env.PAYMENT_QRIS_IMAGE;
  globalThis.fetch = async () => new Response('{"ok":true}', { status: 200 });
  const r = mockRes(); await order.default(req({ nama: "Rina", whatsapp: "085711112222", paket: "bulan", setuju: true }, "7.7.7.4"), r);
  assert.equal(r.code, 200); assert.equal(r.body.method, null);
});

/* Premium */
const prem = await import("../api/_lib/premium.js");
const premApi = await import("../api/premium.js");
await ok("premium: format kode dinormalkan, token sah & kedaluwarsa terdeteksi", () => {
  process.env.FEEDBACK_SECRET = "rahasia-uji-123";
  assert.equal(prem.normalizeCode(" dh-ab12 cd34 "), "DH-AB12-CD34");
  assert.equal(prem.normalizeCode("ab12cd34"), "DH-AB12-CD34");
  assert.equal(prem.normalizeCode("DH-123"), "");
  const now = Date.parse("2026-10-04T10:00:00+07:00");
  const tok = prem.makeToken({ kode: "DH-AB12-CD34", sampai: "2026-11-04", paket: "Premium 1 bulan" }, now);
  assert.equal(prem.readToken(tok, now).k, "DH-AB12-CD34");
  assert.equal(prem.readToken(tok, now + 4 * 86400000), null, "token maksimal 3 hari");
  const short = prem.makeToken({ kode: "DH-AB12-CD34", sampai: "2026-10-04" }, now);
  assert.equal(prem.readToken(short, Date.parse("2026-10-05T00:00:01+07:00")), null, "berhenti di akhir masa Premium");
  const [pl, sig] = tok.split(".");
  const forged = Buffer.from(JSON.stringify({ k: "DH-AB12-CD34", exp: now * 2 })).toString("base64url") + "." + sig;
  assert.equal(prem.readToken(forged, now), null, "token palsu ditolak");
});
await ok("premium API: kode sah → token; salah → pesan jelas; format salah → 400", async () => {
  process.env.FEEDBACK_WEBHOOK_URL = "https://script.google.com/macros/s/x/exec";
  let sent;
  globalThis.fetch = async (url, opt) => { sent = JSON.parse(opt.body);
    return new Response(JSON.stringify(sent.row.kode === "DH-AB12-CD34" ? { ok: true, valid: true, sampai: "2099-01-01", paket: "Premium 3 bulan", nama: "Siti" } : { ok: true, valid: false, reason: "kedaluwarsa" }), { status: 200 }); };
  let r = mockRes(); await premApi.default(req({ kode: "dh-ab12-cd34" }, "8.8.8.1"), r);
  assert.equal(r.code, 200); assert.equal(sent.type, "verify"); assert.ok(prem.readToken(r.body.token));
  r = mockRes(); await premApi.default(req({ kode: "DH-ZZZZ-ZZZZ" }, "8.8.8.1"), r);
  assert.equal(r.code, 404); assert.match(r.body.message, /habis/);
  r = mockRes(); await premApi.default(req({ kode: "halo" }, "8.8.8.1"), r);
  assert.equal(r.code, 400);
});
await ok("menu: 30 hari / diet khusus tanpa token → 402; dengan token → rencana per minggu", async () => {
  process.env.GEMINI_API_KEY = "g"; delete process.env.ANTHROPIC_API_KEY;
  let r = mockRes(); await menu.default(req({ days: 30 }, "8.8.8.2"), r); assert.equal(r.code, 402);
  r = mockRes(); await menu.default(req({ days: 3, prefs: ["mpasi"] }, "8.8.8.2"), r); assert.equal(r.code, 402);
  const tok = prem.makeToken({ kode: "DH-AB12-CD34", sampai: "2099-01-01" });
  const long = { days: Array.from({ length: 30 }, (_, i) => ({ label: "Hari " + (i + 1), cost: 20000, lauk: { name: "L" + i, why: "x", steps: ["a"] }, sayur: { name: "S" + i, why: "y", steps: [] } })),
    weeks: Array.from({ length: 5 }, (_, i) => ({ label: "Minggu " + (i + 1), shopping: [{ item: "Tahu", qty: "20 potong", price: 10000, group: "Lauk" }] })), tips: "t" };
  let prompt;
  globalThis.fetch = async (url, opt) => { prompt = JSON.parse(opt.body).contents[0].parts[0].text; return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(long) }] } }] }), { status: 200 }); };
  const rq = req({ days: 30, prefs: ["mpasi", "rendahgaram", "anak"] }, "8.8.8.3"); rq.headers["x-premium-token"] = tok;
  r = mockRes(); await menu.default(rq, r);
  assert.equal(r.code, 200); assert.equal(r.body.days.length, 30); assert.equal(r.body.weeks.length, 5);
  assert.ok(prompt.includes("MPASI") && prompt.includes("rendah garam") && prompt.includes("per minggu"));
  delete process.env.GEMINI_API_KEY;
});
await ok("mesin lokal: 30 hari vegetarian, belanja dibagi 5 minggu, tanpa ayam/ikan", () => {
  const p = localPlan({ budget: 35000, ppl: 4, days: 30, owned: [], prefs: ["vegetarian"] });
  assert.equal(p.days.length, 30); assert.equal(p.weeks.length, 5);
  assert.ok(!p.days.some((d) => /\bayam\b|tongkol/i.test(d.lauk.name + " " + d.sayur.name)));
  const first7 = p.days.slice(0, 7).map((d) => d.lauk.name); assert.equal(new Set(first7).size, 7);
});

await ok("mode cepat: rendah garam menghindari menu kecap dan memberi langkah rendah garam", () => {
  const p = localPlan({ budget: 35000, ppl: 4, days: 7, owned: ["tempe", "tahu"], prefs: ["rendahgaram"] });
  assert.ok(!p.days.some((d) => /kecap|bacem|semur/i.test(d.lauk.name)), p.days.map((d) => d.lauk.name).join(", "));
  assert.ok(p.days.every((d) => d.lauk.steps.some((s) => s.startsWith("Rendah garam")) && d.sayur.steps.some((s) => s.startsWith("Rendah garam"))));
  assert.ok(!p.days.some((d) => d.lauk.steps.some((s) => /air garam/.test(s))));
});
await ok("mode cepat: MPASI menambah kartu bayi tanpa cabai/garam dan tanpa belanja tambahan", () => {
  const base = localPlan({ budget: 35000, ppl: 4, days: 7, owned: [], prefs: ["anak"] });
  const p = localPlan({ budget: 35000, ppl: 4, days: 7, owned: [], prefs: ["anak", "mpasi"] });
  assert.ok(p.days.every((d) => d.bayi && d.bayi.steps.length >= 3));
  assert.ok(p.days.every((d) => !/cabai|tauge/i.test(d.bayi.name)));
  assert.equal(JSON.stringify(p.shopping), JSON.stringify(base.shopping));
  assert.match(p.tips, /bidan/);
});
await ok("AI: field bayi diminta saat MPASI dan dipertahankan saat dirapikan", () => {
  const i = menu.parseInput({ days: 3, prefs: ["mpasi"] }, true);
  assert.match(menu.buildPrompt(i), /"bayi"/);
  assert.doesNotMatch(menu.buildPrompt(menu.parseInput({ days: 3 }, true)), /"bayi"/);
  const p = menu.normalizePlan({ days: [{ label: "Hari 1", lauk: { name: "A" }, sayur: { name: "B" }, bayi: { name: "Nasi tim tahu", steps: ["x"] } }], shopping: [] }, 1);
  assert.equal(p.days[0].bayi.name, "Nasi tim tahu");
});

await ok("AI: Claude saldo habis → dijeda 30 menit, langsung ke Gemini; Gemini penuh → model lite", async () => {
  process.env.ANTHROPIC_API_KEY = "c"; process.env.GEMINI_API_KEY = "g"; delete process.env.AI_PROVIDER; menu.resetClaudePause();
  const okPlan = JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(aiPlan) }] } }] });
  let calls = [];
  globalThis.fetch = async (url) => { url = String(url); calls.push(url);
    if (url.includes("anthropic")) return new Response(JSON.stringify({ type: "error", error: { message: "Your credit balance is too low to access the Anthropic API." } }), { status: 400 });
    if (url.includes("gemini-flash-latest")) return new Response('{"error":{"message":"quota"}}', { status: 429 });
    return new Response(okPlan, { status: 200 }); };
  let r = mockRes(); await menu.default(req({ days: 3 }, "6.6.6.1"), r);
  assert.equal(r.code, 200); assert.equal(r.body.provider, "gemini-lite");
  assert.equal(calls.length, 3);
  calls = []; r = mockRes(); await menu.default(req({ days: 3 }, "6.6.6.2"), r);
  assert.equal(r.code, 200); assert.ok(!calls.some((u) => u.includes("anthropic")), "Claude dilewati selama jeda");
  menu.resetClaudePause(); delete process.env.ANTHROPIC_API_KEY; delete process.env.GEMINI_API_KEY;
});
await ok("AI: jawaban Gemini terpotong/kosong dicatat jelas lalu pindah ke cadangan", async () => {
  process.env.GEMINI_API_KEY = "g";
  globalThis.fetch = async (url) => String(url).includes("lite")
    ? new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(aiPlan) }] } }] }))
    : new Response(JSON.stringify({ candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: '{"days":[{"label"' }] } }] }));
  const r = mockRes(); await menu.default(req({ days: 3 }, "6.6.6.3"), r);
  assert.equal(r.code, 200); assert.equal(r.body.provider, "gemini-lite");
  delete process.env.GEMINI_API_KEY;
});

globalThis.fetch = realFetch;
console.log(`\n${passed} uji lulus`);
