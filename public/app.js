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
  [1, 3, 7].forEach((d) => {
    const b = el("button", null, d === 1 ? "1 hari" : d + " hari"); b.type = "button";
    b.setAttribute("aria-pressed", d === S.days);
    b.onclick = () => { S.days = d; [...$("days").children].forEach((x) => x.setAttribute("aria-pressed", x === b)); persist(); };
    $("days").append(b);
  });
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

  /* ---------- Render ---------- */
  const out = $("out");
  let lastPlan = null;

  function render(plan, note, noteKind) {
    lastPlan = plan;
    out.replaceChildren();
    if (note) out.append(status(note, noteKind));
    const total = plan.shopping.reduce((a, b) => a + (Number(b.price) || 0), 0);
    const cap = S.budget * S.days, over = total > cap;

    const sum = el("div", "sum"), top = el("div", "sum-top");
    const l = el("div"); l.append(el("div", "label", "Perkiraan total belanja"), el("div", "big", rp(total)));
    top.append(l, el("div", "of", "Budget " + S.days + " hari: " + rp(cap)));
    const m = el("div", "meter" + (over ? " over" : "")); const bar = el("i");
    bar.style.width = Math.min(100, cap ? (total / cap) * 100 : 100) + "%"; m.append(bar);
    sum.append(top, m, el("p", "verdict " + (over ? "over" : "ok"), over ? "Lebih " + rp(total - cap) + " dari budget" : "Hemat " + rp(cap - total) + " dari budget"));
    out.append(sum);

    out.append(el("h2", null, "Menu " + S.days + " hari · " + S.ppl + " orang"));
    const days = el("div", "days");
    plan.days.forEach((d) => {
      const c = el("article", "day"), h = el("div", "day-h");
      h.append(el("b", null, d.label || ""), el("span", null, d.cost != null ? "belanja ± " + rp(d.cost) : ""));
      const ds = el("div", "dishes");
      [["lauk", "Lauk"], ["sayur", "Sayur"]].forEach(([k, lab]) => {
        const x = d[k]; if (!x) return;
        const det = el("details", "dish"), s = el("summary");
        s.append(el("span", "kind " + k, lab), el("span", "dname", x.name), el("span", "why", x.why || ""), el("span", "more", "Lihat cara masak"));
        const ol = el("ol"); (x.steps || []).forEach((t) => ol.append(el("li", null, t)));
        det.append(s, ol); ds.append(det);
      });
      c.append(h, ds); days.append(c);
    });
    out.append(days);

    const shop = el("section", "shop"), sh = el("div", "shop-h");
    sh.append(el("h2", null, "Daftar belanja"));
    const cb = el("button", "copy", "Salin untuk WhatsApp"); cb.type = "button";
    cb.onclick = () => copyText(listText(plan, total), cb, shop, "Salin untuk WhatsApp");
    sh.append(cb); shop.append(sh);
    const groups = ["Lauk", "Sayur", "Bumbu & pelengkap"], byG = {};
    plan.shopping.forEach((s) => { const g = groups.includes(s.group) ? s.group : "Bumbu & pelengkap"; (byG[g] = byG[g] || []).push(s); });
    groups.forEach((g) => {
      if (!byG[g]) return;
      const gr = el("div", "group"); gr.append(el("h3", null, g));
      byG[g].forEach((s, i) => {
        const row = el("label", "item"), ck = el("input"); ck.type = "checkbox"; ck.id = "ck-" + g.replace(/\W/g, "") + i;
        ck.onchange = () => row.classList.toggle("done", ck.checked);
        const mid = el("div"); mid.append(el("div", "n", s.item), el("div", "q", s.qty || ""));
        row.append(ck, mid, el("span", "p", rp(s.price))); gr.append(row);
      });
      shop.append(gr);
    });
    if (!plan.shopping.length) shop.append(el("p", "owned", "Semua bahan sudah ada di rumah. Tidak perlu belanja."));
    const ol = ownedLabels(); if (ol.length) shop.append(el("p", "owned", "Sudah ada di rumah: " + ol.join(", ")));
    out.append(shop);
    if (plan.tips) out.append(el("p", "tips", plan.tips));
  }

  function listText(plan, total) {
    const lines = ["*Daftar Belanja Dapur Hemat*", `${S.days} hari · ${S.ppl} orang`, ""];
    plan.days.forEach((d) => lines.push(`${d.label}: ${d.lauk.name} + ${d.sayur.name}`));
    lines.push("", "*Belanja:*");
    plan.shopping.forEach((s) => lines.push(`- ${s.item} ${s.qty || ""} (~${rp(s.price)})`));
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
    default: "AI sedang tidak bisa dihubungi. Menu disusun dengan mode cepat."
  };

  async function askAI() {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 45000);
    try {
      const res = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    if (!navigator.onLine) { render(localPlan(engineInput()), ERR.offline); return; }
    const go = $("go");
    go.disabled = true; go.textContent = "Sedang menyusun menu…";
    out.replaceChildren(status("AI sedang memilih menu dan menghitung belanja. Biasanya 5–15 detik."));
    try {
      const plan = await askAI();
      plan.source = "ai";
      render(plan);
      $("mode").textContent = "AI aktif"; $("mode").classList.remove("off");
    } catch (err) {
      render(localPlan(engineInput()), ERR[err.code] || ERR.default);
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
