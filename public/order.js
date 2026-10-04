/* Dapur Hemat — halaman pesan Premium */
(function () {
  const $ = (id) => document.getElementById(id);
  const rp = (n) => "Rp" + Math.round(Number(n) || 0).toLocaleString("id-ID");
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

  const state = { packages: [], methods: [], adminWhatsapp: "", paket: null, bayar: null };
  const wanted = new URLSearchParams(location.search).get("paket");
  try { const saved = JSON.parse(localStorage.getItem("dh:input") || "null"); if (saved && saved.region) $("daerah").value = saved.region; } catch (e) { /* abaikan */ }

  function showMsg(text, kind) { const m = $("formMsg"); m.textContent = text; m.dataset.kind = kind || ""; m.hidden = !text; }
  function setErr(field, text) {
    const e = $("err-" + field); if (!e) return;
    e.textContent = text || ""; e.hidden = !text;
    const input = $(field); if (input) input.setAttribute("aria-invalid", text ? "true" : "false");
  }
  function clearErrs() { ["paket", "nama", "whatsapp", "email", "bayar", "setuju"].forEach((f) => setErr(f, "")); }

  function radioCard(group, item, checked, onPick, body) {
    const lab = el("label", "opt-card"); lab.htmlFor = group + "-" + item.id;
    const input = el("input"); input.type = "radio"; input.name = group; input.id = group + "-" + item.id; input.value = item.id; input.checked = checked;
    input.onchange = () => onPick(item.id);
    lab.append(input, body);
    return lab;
  }

  function renderPackages() {
    const box = $("packages"); box.replaceChildren();
    state.packages.forEach((p) => {
      const body = el("span", "opt-body");
      const top = el("span", "opt-top"); top.append(el("b", null, p.name), el("span", "opt-price", rp(p.price)));
      body.append(top);
      const per = p.months > 1 ? rp(Math.round(p.price / p.months)) + " per bulan" : "Bayar per bulan";
      const sub = el("span", "opt-sub", per); body.append(sub);
      if (p.note) body.append(el("span", "badge", p.note));
      box.append(radioCard("paket", p, state.paket === p.id, (id) => { state.paket = id; updateTotal(); setErr("paket", ""); }, body));
    });
  }

  function renderMethods() {
    const box = $("methods"); box.replaceChildren();
    if (!state.methods.length) {
      box.append(el("p", "hint-sm", "Setelah pesanan tercatat, admin akan menghubungi Ibu lewat WhatsApp untuk cara pembayaran."));
      return;
    }
    state.methods.forEach((m) => {
      const body = el("span", "opt-body"); body.append(el("b", null, m.label));
      body.append(el("span", "opt-sub", m.id === "qris" ? "Semua bank dan e-wallet" : m.lines[0] ? m.lines.length + " pilihan rekening/akun" : ""));
      box.append(radioCard("bayar", m, state.bayar === m.id, (id) => { state.bayar = id; setErr("bayar", ""); }, body));
    });
  }

  function updateTotal() {
    const p = state.packages.find((x) => x.id === state.paket);
    $("totalText").textContent = p ? rp(p.price) + " + kode unik" : "Pilih paket";
  }

  async function load() {
    try {
      const r = await fetch("/api/order", { headers: { Accept: "application/json" } });
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      state.packages = d.packages || []; state.methods = d.methods || []; state.adminWhatsapp = d.adminWhatsapp || "";
      state.paket = (state.packages.find((p) => p.id === wanted) || state.packages[1] || state.packages[0] || {}).id || null;
      state.bayar = state.methods.length === 1 ? state.methods[0].id : null;
      const ul = $("benefits"); ul.replaceChildren(); (d.benefits || []).forEach((b) => ul.append(el("li", null, b)));
      renderPackages(); renderMethods(); updateTotal();
    } catch (e) {
      $("submitBtn").disabled = true;
      showMsg("Daftar paket belum bisa dimuat. Periksa koneksi internet, lalu muat ulang halaman ini.", "err");
    }
  }

  $("orderForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrs(); showMsg("");
    const payload = {
      paket: state.paket, bayar: state.bayar,
      nama: $("nama").value.trim(), whatsapp: $("whatsapp").value.trim(), email: $("email").value.trim(),
      daerah: $("daerah").value.trim(), catatan: $("catatan").value.trim(),
      setuju: $("setuju").checked, website: $("website").value
    };
    // pemeriksaan cepat di HP; pemeriksaan sebenarnya di server
    let bad = false;
    if (!payload.paket) { setErr("paket", "Pilih salah satu paket."); bad = true; }
    if (payload.nama.length < 2) { setErr("nama", "Isi nama Ibu."); bad = true; }
    if (payload.whatsapp.replace(/\D/g, "").length < 9) { setErr("whatsapp", "Isi nomor WhatsApp yang aktif, misalnya 0812 3456 7890."); bad = true; }
    if (state.methods.length && !payload.bayar) { setErr("bayar", "Pilih cara pembayaran."); bad = true; }
    if (!payload.setuju) { setErr("setuju", "Centang persetujuan untuk melanjutkan."); bad = true; }
    if (bad) { const first = document.querySelector(".field-err:not([hidden])"); first?.scrollIntoView({ block: "center" }); return; }

    const btn = $("submitBtn"); btn.disabled = true; btn.textContent = "Mencatat pesanan…";
    try {
      const r = await fetch("/api/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json().catch(() => ({}));
      if (r.status === 400 && d.fields) { Object.entries(d.fields).forEach(([k, v]) => setErr(k, v)); showMsg("Ada isian yang perlu diperbaiki.", "err"); return; }
      if (r.status === 429) { showMsg("Terlalu banyak percobaan. Tunggu beberapa menit, lalu coba lagi.", "err"); return; }
      if (!r.ok || !d.order) { showMsg("Pesanan belum tercatat karena gangguan server. Coba lagi beberapa saat lagi.", "err"); return; }
      showDone(d);
    } catch (err) {
      showMsg("Pesanan belum terkirim. Periksa koneksi internet, lalu tekan Pesan sekarang lagi.", "err");
    } finally { btn.disabled = false; btn.textContent = "Pesan sekarang"; }
  });

  function showDone(d) {
    const o = d.order;
    $("dNama").textContent = o.nama.split(" ")[0];
    $("dId").textContent = o.id;
    $("dTotal").textContent = rp(o.total);
    $("dBreak").textContent = o.paket + " " + rp(o.harga) + " + kode unik " + o.kode_unik;
    $("copyAmount").onclick = () => copy(String(o.total), $("copyAmount"), "Salin nominal");

    const box = $("dMethod"); box.replaceChildren();
    const m = d.method;
    if (m) {
      box.append(el("h3", null, m.label));
      if (m.image) { const img = el("img", "qris"); img.src = m.image; img.alt = "Kode QRIS pembayaran Dapur Hemat"; img.width = 240; box.append(img); }
      m.lines.forEach((line) => {
        const row = el("div", "acct"); row.append(el("span", null, line));
        const num = (line.match(/\d[\d\s-]{5,}\d/) || [])[0];
        if (num) { const b = el("button", "copy-sm", "Salin"); b.type = "button"; b.onclick = () => copy(num.replace(/\D/g, ""), b, "Salin"); row.append(b); }
        box.append(row);
      });
    } else {
      box.append(el("p", null, "Admin akan mengirimkan cara pembayaran lewat WhatsApp."));
    }

    const msg = [
      "Halo admin Dapur Hemat, saya sudah memesan Premium.",
      "No. pesanan: " + o.id,
      "Nama: " + o.nama,
      "Paket: " + o.paket,
      "Total: " + rp(o.total) + " (" + o.bayar + ")",
      "",
      "Berikut bukti pembayarannya:"
    ].join("\n");
    const wa = $("waBtn");
    if (d.adminWhatsapp) {
      wa.href = "https://wa.me/" + d.adminWhatsapp + "?text=" + encodeURIComponent(msg);
      $("waNote").textContent = "Nomor admin: +" + d.adminWhatsapp; $("waNote").hidden = false;
    } else {
      wa.hidden = true;
      $("waNote").textContent = "Admin akan menghubungi Ibu lewat WhatsApp di nomor yang Ibu isi."; $("waNote").hidden = false;
    }

    document.querySelector(".order-grid").hidden = true;
    document.querySelector(".order-head").hidden = true;
    $("done").hidden = false;
    window.scrollTo({ top: 0 });
    try { localStorage.setItem("dh:lastOrder", JSON.stringify({ id: o.id, total: o.total, at: Date.now() })); } catch (e) { /* abaikan */ }
  }

  function copy(text, btn, label) {
    const done = () => { btn.textContent = "Tersalin ✓"; setTimeout(() => (btn.textContent = label), 2000); };
    try { navigator.clipboard.writeText(text).then(done, () => { btn.textContent = text; }); } catch (e) { btn.textContent = text; }
  }

  load();
})();
