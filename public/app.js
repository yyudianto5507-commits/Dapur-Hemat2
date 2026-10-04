/* Dapur Hemat — aplikasi utama */
(function () {
  const { ING, localPlan } = window.DapurEngine;
  const $ = (id) => document.getElementById(id);
  const rp = (n) => "Rp" + Math.round(Number(n) || 0).toLocaleString("id-ID");
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* abaikan */ } }
  };

  const PREFS = [["anak", "Ada anak kecil"], ["pedas", "Tidak pedas"], ["ayam", "Tanpa ayam"], ["ikan", "Tanpa ikan"]];
  const OWN_CHIPS = ["tempe", "tahu", "telur", "ayam", "tongkol", "kangkung", "bayam", "kacangpanjang", "wortel", "kentang", "labusiam", "jagung", "terong", "kol", "sawi", "toge", "tomat", "cabai", "santan"];

  const saved = store.get("dh:input", null);
  const S = {
    budget: saved?.budget ?? 35000,
    ppl: saved?.ppl ?? 4,
    days: saved?.days ?? 3,
    owned: new Set(saved?.owned ?? ["tempe", "telur", "wortel", "cabai"]),
    prefs: new Set(saved?.prefs ?? ["anak"]),
    extra: saved?.extra ?? "",
    region: saved?.region ?? ""
  };
  const persist = () => store.set("dh:input", { ...S, owned: [...S.owned], prefs: [...S.prefs] });

  function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function status(msg, kind) { const s = el("div", "status", msg); if (kind) s.dataset.kind = kind; return s; }
  function toggleChip(label, on, fn) {
    const b = el("button", "chip", label); b.type = "button"; b.setAttribute("aria-pressed", on);
    b.onclick = () => { fn(); b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true"); persist(); };
    return b;
  }

  /* ---------- Premium ---------- */
  const DIETS = [["rendahgaram", "Rendah garam"], ["rendahgula", "Ramah diabetes"], ["mpasi", "Ada bayi (MPASI)"], ["vegetarian", "Vegetarian"]];
  const DIET_KEYS = DIETS.map((d) => d[0]);
  const PREMIUM_DAYS = [14, 30];
  let premium = store.get("dh:premium", null); // {kode, token, sampai, paket}
  const tokenExp = (t) => { try { return JSON.parse(atob(t.split(".")[0].replace(/-/g, "+").replace(/_/g, "/"))).exp || 0; } catch (e) { return 0; } };
  const premiumActive = () => !!(premium && premium.token && premium.sampai && new Date(premium.sampai + "T23:59:59+07:00").getTime() > Date.now());
  const fmtDate = (ymd) => { const d = new Date(ymd + "T12:00:00+07:00"); return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }); };

  /* ---------- Form ---------- */
  $("budget").value = S.budget;
  $("ownedExtra").value = S.extra;
  $("region").value = S.region;
  [25000, 35000, 50000, 75000].forEach((v) => {
    const b = el("button", "chip", v / 1000 + " rb"); b.type = "button";
    b.onclick = () => { S.budget = v; $("budget").value = v; persist(); };
    $("budgetQuick").append(b);
  });
  $("budget").oninput = (e) => { S.budget = Math.max(0, Number(e.target.value) || 0); persist(); };
  const setPpl = () => { $("ppl").textContent = S.ppl + " orang"; persist(); };
  setPpl();
  $("minus").onclick = () => { S.ppl = Math.max(1, S.ppl - 1); setPpl(); };
  $("plus").onclick = () => { S.ppl = Math.min(12, S.ppl + 1); setPpl(); };
  [1, 3, 7, ...PREMIUM_DAYS].forEach((d) => {
    const b = el("button", null, d === 1 ? "1 hari" : d + " hari"); b.type = "button"; b.dataset.days = d;
    b.onclick = () => {
      if (PREMIUM_DAYS.includes(d) && !premiumActive()) { askForPremium("Rencana " + d + " hari adalah fitur Premium."); return; }
      S.days = d; syncDays(); persist();
    };
    $("days").append(b);
  });
  function syncDays() {
    if (PREMIUM_DAYS.includes(S.days) && !premiumActive()) S.days = 7;
    [...$("days").children].forEach((x) => {
      x.setAttribute("aria-pressed", Number(x.dataset.days) === S.days);
      x.classList.toggle("locked", PREMIUM_DAYS.includes(Number(x.dataset.days)) && !premiumActive());
    });
  }
  DIETS.forEach(([k, l]) => {
    const b = el("button", "chip", l); b.type = "button"; b.dataset.diet = k;
    b.onclick = () => {
      if (!premiumActive()) { askForPremium("Diet khusus adalah fitur Premium."); return; }
      S.prefs.has(k) ? S.prefs.delete(k) : S.prefs.add(k); syncDiets(); persist();
    };
    $("diets").append(b);
  });
  function syncDiets() {
    if (!premiumActive()) DIET_KEYS.forEach((k) => S.prefs.delete(k));
    [...$("diets").children].forEach((b) => {
      b.setAttribute("aria-pressed", S.prefs.has(b.dataset.diet));
      b.classList.toggle("locked", !premiumActive());
    });
  }
  OWN_CHIPS.forEach((k) => $("owned").append(toggleChip(ING[k].n, S.owned.has(k), () => { S.owned.has(k) ? S.owned.delete(k) : S.owned.add(k); })));
  PREFS.forEach(([k, l]) => $("prefs").append(toggleChip(l, S.prefs.has(k), () => { S.prefs.has(k) ? S.prefs.delete(k) : S.prefs.add(k); })));
  $("ownedExtra").oninput = (e) => { S.extra = e.target.value; persist(); };
  $("region").oninput = (e) => { S.region = e.target.value.trim(); persist(); };

  const ownedLabels = () => {
    const names = [...S.owned].map((k) => ING[k].n);
    S.extra.split(",").map((x) => x.trim()).filter(Boolean).forEach((x) => names.push(x));
    return names;
  };
  const engineInput = () => ({ budget: S.budget, ppl: S.ppl, days: S.days, owned: [...S.owned], extra: S.extra, prefs: [...S.prefs] });

  function syncPremium() {
    const on = premiumActive();
    $("premOff").hidden = on; $("premOn").hidden = !on;
    if (on) { $("premForm").hidden = true; $("premUntil").textContent = (premium.paket || "Premium") + ", berlaku sampai " + fmtDate(premium.sampai) + "."; }
    syncDays(); syncDiets();
  }
  function askForPremium(why) {
    $("premForm").hidden = false; $("premOpen").setAttribute("aria-expanded", "true");
    const m = $("premMsg"); m.dataset.kind = ""; m.textContent = why + " Masukkan kode Premium, atau pesan lewat tombol Pesan Premium.";
    $("prem").scrollIntoView({ behavior: "smooth", block: "center" });
    $("premCode").focus({ preventScroll: true });
  }
  $("premOpen").onclick = () => {
    const open = $("premForm").hidden; $("premForm").hidden = !open; $("premOpen").setAttribute("aria-expanded", String(open));
    if (open) $("premCode").focus();
  };
  $("premOut").onclick = () => { premium = null; store.set("dh:premium", null); syncPremium(); };

  /* Cek kode ke server. quiet: dipakai saat memperbarui token otomatis. */
  async function activate(kode, quiet) {
    const m = $("premMsg");
    if (!quiet) { m.dataset.kind = ""; m.textContent = "Mengecek kode…"; $("premGo").disabled = true; }
    try {
      const r = await fetch("/api/premium", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kode }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.token) {
        premium = { kode: d.kode, token: d.token, sampai: d.sampai, paket: d.paket };
        store.set("dh:premium", premium); syncPremium();
        if (!quiet) { m.dataset.kind = "ok"; m.textContent = "Premium aktif. Selamat mencoba rencana 14 dan 30 hari!"; $("premCode").value = ""; }
        return true;
      }
      // kode sudah tidak berlaku: hapus dari HP
      if (r.status === 404 && premium) { premium = null; store.set("dh:premium", null); syncPremium(); }
      if (!quiet) { m.dataset.kind = "err"; m.textContent = d.message || "Kode belum bisa dicek. Coba lagi beberapa saat lagi."; }
      else if (r.status === 404) { out.prepend(status(d.message || "Kode Premium sudah tidak berlaku.", "err")); }
      return false;
    } catch (e) {
      if (!quiet) { m.dataset.kind = "err"; m.textContent = "Tidak ada koneksi internet. Coba lagi saat sudah online."; }
      return false;
    } finally { $("premGo").disabled = false; }
  }
  $("premForm").addEventListener("submit", (e) => { e.preventDefault(); const k = $("premCode").value.trim(); if (k) activate(k, false); });
  $("premCode").addEventListener("input", (e) => { e.target.value = e.target.value.toUpperCase(); });

  /* Token berumur pendek; perbarui diam-diam dengan kode yang tersimpan. */
  async function freshToken() {
    if (!premium || !premium.kode) return null;
    if (tokenExp(premium.token) - Date.now() < 5 * 60000) await activate(premium.kode, true);
    return premiumActive() ? premium.token : null;
  }
  syncPremium();

  /* ---------- Render ---------- */
  const out = $("out");
  let lastPlan = null;

  function render(plan, note, noteKind) {
    lastPlan = plan;
    out.replaceChildren();
    if (note) out.append(status(note, noteKind));
    const sumList = (list) => (list || []).reduce((a, b) => a + (Number(b.price) || 0), 0);
    const total = plan.weeks ? plan.weeks.reduce((a, w) => a + sumList(w.shopping), 0) : sumList(plan.shopping);
    const cap = S.budget * plan.days.length, over = total > cap;

    const sum = el("div", "sum"), top = el("div", "sum-top");
    const l = el("div"); l.append(el("div", "label", "Perkiraan total belanja"), el("div", "big", rp(total)));
    top.append(l, el("div", "of", "Budget " + plan.days.length + " hari: " + rp(cap)));
    const m = el("div", "meter" + (over ? " over" : "")); const bar = el("i");
    bar.style.width = Math.min(100, cap ? (total / cap) * 100 : 100) + "%"; m.append(bar);
    sum.append(top, m, el("p", "verdict " + (over ? "over" : "ok"), over ? "Lebih " + rp(total - cap) + " dari budget" : "Hemat " + rp(cap - total) + " dari budget"));
    out.append(sum);

    const nDays = plan.days.length;
    out.append(el("h2", null, "Menu " + nDays + " hari · " + S.ppl + " orang"));
    const dayCard = (d) => {
      const c = el("article", "day"), h = el("div", "day-h");
      h.append(el("b", null, d.label || ""), el("span", null, d.cost != null ? "belanja ± " + rp(d.cost) : ""));
      const ds = el("div", "dishes");
      [["lauk", "Lauk"], ["sayur", "Sayur"], ["bayi", "Untuk bayi (MPASI)"]].forEach(([k, lab]) => {
        const x = d[k]; if (!x) return;
        const det = el("details", k === "bayi" ? "dish bayi-card" : "dish"), s = el("summary");
        const hasSteps = (x.steps || []).length > 0;
        s.append(el("span", "kind " + k, lab), el("span", "dname", x.name), el("span", "why", x.why || ""));
        if (hasSteps) s.append(el("span", "more", "Lihat cara masak"));
        const ol = el("ol"); (x.steps || []).forEach((t) => ol.append(el("li", null, t)));
        det.append(s); if (hasSteps) det.append(ol); ds.append(det);
      });
      c.append(h, ds); return c;
    };
    if (!plan.weeks) {
      const days = el("div", "days"); plan.days.forEach((d) => days.append(dayCard(d))); out.append(days);
    }

    const shop = el("section", "shop"), sh = el("div", "shop-h");
    sh.append(el("h2", null, "Daftar belanja"));
    const cb = el("button", "copy", "Salin untuk WhatsApp"); cb.type = "button";
    cb.onclick = () => copyText(listText(plan, total), cb, shop, "Salin untuk WhatsApp");
    sh.append(cb); shop.append(sh);
    const groups = ["Lauk", "Sayur", "Bumbu & pelengkap"];
    const shopGroups = (list, prefix, into) => {
      const byG = {};
      list.forEach((s) => { const g = groups.includes(s.group) ? s.group : "Bumbu & pelengkap"; (byG[g] = byG[g] || []).push(s); });
      groups.forEach((g) => {
      if (!byG[g]) return;
      const gr = el("div", "group"); gr.append(el("h3", null, g));
      byG[g].forEach((s, i) => {
        const row = el("label", "item"), ck = el("input"); ck.type = "checkbox"; ck.id = "ck-" + prefix + g.replace(/\W/g, "") + i;
        ck.onchange = () => row.classList.toggle("done", ck.checked);
        const mid = el("div"); mid.append(el("div", "n", s.item), el("div", "q", s.qty || ""));
        row.append(ck, mid, el("span", "p", rp(s.price))); gr.append(row);
      });
      into.append(gr);
      });
    };
    if (plan.weeks) {
      // menu per minggu (minggu pertama terbuka)
      plan.weeks.forEach((w, wi) => {
        const det = el("details", "week"); if (wi === 0) det.open = true;
        const sum = el("summary"); sum.append(el("b", null, w.label), el("span", null, "belanja ± " + rp(sumList(w.shopping))));
        const days = el("div", "days"); plan.days.slice(wi * 7, wi * 7 + 7).forEach((d) => days.append(dayCard(d)));
        det.append(sum, days); out.append(det);
      });
      plan.weeks.forEach((w, wi) => {
        const box = el("div", "week-shop"); box.append(el("h4", null, w.label + " · " + rp(sumList(w.shopping))));
        if (w.shopping.length) shopGroups(w.shopping, "w" + wi, box); else box.append(el("p", "owned", "Tidak perlu belanja minggu ini."));
        shop.append(box);
      });
    } else {
      shopGroups(plan.shopping, "", shop);
      if (!plan.shopping.length) shop.append(el("p", "owned", "Semua bahan sudah ada di rumah. Tidak perlu belanja."));
    }
    const ol = ownedLabels(); if (ol.length) shop.append(el("p", "owned", "Sudah ada di rumah: " + ol.join(", ")));
    out.append(shop);
    if (plan.tips) out.append(el("p", "tips", plan.tips));
  }

  function listText(plan, total) {
    const lines = ["*Daftar Belanja Dapur Hemat*", `${plan.days.length} hari · ${S.ppl} orang`, ""];
    plan.days.forEach((d) => lines.push(`${d.label}: ${d.lauk.name} + ${d.sayur.name}`));
    const item = (s) => lines.push(`- ${s.item} ${s.qty || ""} (~${rp(s.price)})`);
    if (plan.weeks) plan.weeks.forEach((w) => { lines.push("", `*Belanja ${w.label}:*`); w.shopping.forEach(item); });
    else { lines.push("", "*Belanja:*"); plan.shopping.forEach(item); }
    lines.push("", `Total perkiraan: ${rp(total)}`, "", "Dibuat dengan Dapur Hemat: " + location.origin);
    return lines.join("\n");
  }

  function copyText(text, btn, box, label) {
    const fallback = () => {
      let ta = box.querySelector("textarea.copybox");
      if (!ta) { ta = el("textarea", "copybox"); ta.readOnly = true; box.append(ta); }
      ta.value = text; ta.focus(); ta.select(); btn.textContent = "Teks dipilih, tekan salin";
    };
    try {
      navigator.clipboard.writeText(text).then(() => { btn.textContent = "Tersalin ✓"; setTimeout(() => (btn.textContent = label), 2000); }, fallback);
    } catch (e) { fallback(); }
  }

  /* ---------- Susun menu ---------- */
  const ERR = {
    rate_limited: "Banyak yang sedang memakai Dapur Hemat. Menu disusun dengan mode cepat; coba lagi beberapa menit lagi.",
    timeout: "AI terlalu lama menjawab. Menu disusun dengan mode cepat.",
    offline: "Sedang offline. Menu disusun dengan mode cepat.",
    default: "AI sedang tidak bisa dihubungi. Menu disusun dengan mode cepat.",
    premium_required: "Masa Premium di HP ini perlu dicek ulang. Menu disusun dengan mode cepat; masukkan kode Premium lagi untuk memakai AI."
  };
  const dietNote = () => "";

  async function askAI() {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), S.days > 7 ? 75000 : 45000);
    try {
      const token = await freshToken();
      const headers = { "Content-Type": "application/json" };
      if (token) headers["X-Premium-Token"] = token;
      const res = await fetch("/api/menu", {
        method: "POST",
        headers,
        body: JSON.stringify({ budget: S.budget, ppl: S.ppl, days: S.days, owned: ownedLabels(), prefs: [...S.prefs], region: S.region }),
        signal: ctl.signal
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw { code: data.error || "default" };
      return data;
    } catch (e) {
      if (e && e.name === "AbortError") throw { code: "timeout" };
      throw e && e.code ? e : { code: "default" };
    } finally { clearTimeout(timer); }
  }

  $("f").onsubmit = async (e) => {
    e.preventDefault();
    if (S.budget < 5000) { out.replaceChildren(status("Budget minimal Rp5.000 per hari. Isi angka budget lalu tekan Susun Menu lagi.", "err")); return; }
    if (!navigator.onLine) { render(localPlan(engineInput()), ERR.offline + dietNote()); return; }
    const go = $("go");
    go.disabled = true; go.textContent = "Sedang menyusun menu…";
    out.replaceChildren(status(S.days > 7
      ? "AI sedang menyusun rencana " + S.days + " hari dan belanja per minggu. Bisa sampai satu menit, mohon ditunggu."
      : "AI sedang memilih menu dan menghitung belanja. Biasanya 5–15 detik."));
    try {
      const plan = await askAI();
      plan.source = "ai";
      render(plan);
      $("mode").textContent = "AI aktif"; $("mode").classList.remove("off");
    } catch (err) {
      if (err.code === "premium_required") { premium = null; store.set("dh:premium", null); syncPremium(); }
      render(localPlan(engineInput()), (ERR[err.code] || ERR.default) + dietNote());
      $("mode").textContent = "Mode cepat"; $("mode").classList.add("off");
    } finally {
      go.disabled = false; go.textContent = "Susun Menu";
      out.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }
  };

  /* ---------- Umpan balik ---------- */
  const FBQ = [
    { k: "cocok", t: "Apakah menunya cocok dengan masakan di rumah Ibu?", o: ["Cocok", "Lumayan", "Tidak cocok"] },
    { k: "harga", t: "Bagaimana perkiraan harganya?", o: ["Pas", "Terlalu murah", "Terlalu mahal"] },
    { k: "lagi", t: "Mau memakai ini lagi minggu depan?", o: ["Pasti", "Mungkin", "Tidak"] },
    { k: "bayar", t: "Kalau biayanya Rp10.000 per bulan, mau berlangganan?", o: ["Mau", "Pikir dulu", "Tidak"] }
  ];
  const FB = {};
  FBQ.forEach((q) => {
    const w = el("div"), t = el("p", "q-t", q.t); t.id = "q-" + q.k;
    const r = el("div", "row"); r.setAttribute("role", "radiogroup"); r.setAttribute("aria-labelledby", t.id);
    q.o.forEach((o) => {
      const b = el("button", "chip", o); b.type = "button"; b.setAttribute("aria-pressed", "false");
      b.onclick = () => { FB[q.k] = o; [...r.children].forEach((x) => x.setAttribute("aria-pressed", x === b)); };
      r.append(b);
    });
    w.append(t, r); $("fbQs").append(w);
  });

  let anonId = store.get("dh:anon", null);
  if (!anonId) { anonId = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()).slice(0, 36); store.set("dh:anon", anonId); }

  $("fbSend").onclick = async () => {
    const btn = $("fbSend"), box = $("fbResult"), note = $("fbNote").value.trim();
    if (!FBQ.some((q) => FB[q.k]) && !note) { box.hidden = false; box.replaceChildren(status("Pilih minimal satu jawaban dulu, lalu tekan Kirim umpan balik.", "err")); return; }
    btn.disabled = true; btn.textContent = "Mengirim…";
    const entry = {
      ...FB, saran: note, budget: S.budget, orang: S.ppl, hari: S.days, daerah: S.region,
      mode: lastPlan?.source || "local",
      menu: (lastPlan?.days || []).map((d) => d.lauk.name + " + " + d.sayur.name).slice(0, 7).join("; "),
      pengguna: anonId
    };
    let ok = false;
    try {
      const res = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(entry) });
      ok = res.ok;
    } catch (e) { ok = false; }
    box.hidden = false; box.replaceChildren();
    if (ok) {
      box.append(el("p", "thanks", "Terima kasih! Jawaban Ibu sudah terkirim."));
    } else {
      box.append(el("p", "thanks", "Jawaban belum bisa terkirim karena koneksi. Salin teks di bawah lalu kirim lewat WhatsApp ke orang yang membagikan link ini."));
      const lines = ["*Umpan balik Dapur Hemat*"];
      FBQ.forEach((q) => lines.push(`- ${q.t} ${FB[q.k] || "(tidak dijawab)"}`));
      if (note) lines.push(`- Saran: ${note}`);
      const cb = el("button", "copy", "Salin jawaban"); cb.type = "button";
      box.append(cb);
      cb.onclick = () => copyText(lines.join("\n"), cb, box, "Salin jawaban");
    }
    btn.disabled = false; btn.textContent = "Kirim lagi";
  };

  /* ---------- Pasang di HP & offline ---------- */
  let deferred = null;
  const dismissed = store.get("dh:installDismissed", false);
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); deferred = e;
    if (!dismissed && !standalone) $("install").hidden = false;
  });
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIOS && !standalone && !dismissed) {
    $("installText").textContent = "Pasang di layar utama: tekan tombol Bagikan di Safari, lalu pilih “Tambah ke Layar Utama”.";
    $("installBtn").hidden = true; $("install").hidden = false;
  }
  $("installBtn").onclick = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => null);
    deferred = null; $("install").hidden = true;
  };
  $("installClose").onclick = () => { $("install").hidden = true; store.set("dh:installDismissed", true); };
  window.addEventListener("appinstalled", () => { $("install").hidden = true; });

  const net = () => { $("offline").hidden = navigator.onLine; };
  window.addEventListener("online", net); window.addEventListener("offline", net); net();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }

  /* Contoh awal */
  render(localPlan(engineInput()), saved
    ? "Ini menu dari isian terakhir Ibu (mode cepat). Tekan Susun Menu untuk menu dari AI."
    : "Contoh untuk keluarga 4 orang dengan budget Rp35.000/hari. Ubah isian lalu tekan Susun Menu.");
})();
