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

globalThis.fetch = realFetch;
console.log(`\n${passed} uji lulus`);
