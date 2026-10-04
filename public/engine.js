/* Dapur Hemat — mesin menu tanpa AI (cadangan saat AI tidak tersedia atau offline).
   Porsi dan harga dasar untuk 4 orang; harga perkiraan pasar tradisional. */
(function (root) {
  const ING = {
    tempe: { n: "Tempe", q: 1, u: "papan", p: 6000, g: "Lauk" },
    tahu: { n: "Tahu", q: 10, u: "potong", p: 5000, g: "Lauk" },
    telur: { n: "Telur", q: 8, u: "butir", p: 16000, g: "Lauk" },
    ayam: { n: "Ayam", q: 0.5, u: "kg", p: 22000, g: "Lauk" },
    tongkol: { n: "Ikan tongkol", q: 0.5, u: "kg", p: 20000, g: "Lauk" },
    kangkung: { n: "Kangkung", q: 2, u: "ikat", p: 5000, g: "Sayur" },
    bayam: { n: "Bayam", q: 2, u: "ikat", p: 5000, g: "Sayur" },
    kacangpanjang: { n: "Kacang panjang", q: 1, u: "ikat", p: 4000, g: "Sayur" },
    wortel: { n: "Wortel", q: 0.25, u: "kg", p: 4000, g: "Sayur" },
    kentang: { n: "Kentang", q: 0.5, u: "kg", p: 9000, g: "Sayur" },
    labusiam: { n: "Labu siam", q: 2, u: "buah", p: 4000, g: "Sayur" },
    jagung: { n: "Jagung manis", q: 1, u: "tongkol", p: 3500, g: "Sayur" },
    terong: { n: "Terong", q: 3, u: "buah", p: 5000, g: "Sayur" },
    kol: { n: "Kol", q: 0.5, u: "buah", p: 4000, g: "Sayur" },
    sawi: { n: "Sawi hijau", q: 1, u: "ikat", p: 4000, g: "Sayur" },
    toge: { n: "Tauge", q: 0.25, u: "kg", p: 3000, g: "Sayur" },
    tomat: { n: "Tomat", q: 3, u: "buah", p: 3000, g: "Bumbu & pelengkap" },
    cabai: { n: "Cabai merah", q: 1, u: "ons", p: 5000, g: "Bumbu & pelengkap" },
    santan: { n: "Santan", q: 1, u: "bungkus", p: 3500, g: "Bumbu & pelengkap" },
    gulamerah: { n: "Gula merah", q: 1, u: "keping", p: 3000, g: "Bumbu & pelengkap" },
    asem: { n: "Bumbu sayur asem", q: 1, u: "paket", p: 3000, g: "Bumbu & pelengkap" }
  };

  const R = [
    { n: "Tempe goreng ketumbar", t: "lauk", i: ["tempe"], tag: [], s: ["Iris tempe, rendam di air garam, ketumbar, dan bawang putih halus 10 menit.", "Goreng sampai kuning keemasan."] },
    { n: "Tahu bacem", t: "lauk", i: ["tahu", "gulamerah"], tag: ["anak"], s: ["Rebus tahu dengan gula merah, bawang, ketumbar, dan sedikit kecap sampai airnya habis.", "Goreng sebentar agar kulitnya kering."] },
    { n: "Telur balado", t: "lauk", i: ["telur", "cabai", "tomat"], tag: ["pedas"], s: ["Rebus telur, kupas, lalu goreng sebentar.", "Tumis cabai, tomat, dan bawang yang dihaluskan, masukkan telur dan aduk rata."] },
    { n: "Ayam goreng kuning", t: "lauk", i: ["ayam"], tag: ["ayam", "anak"], s: ["Ungkep ayam dengan kunyit, bawang, ketumbar, dan garam sampai bumbu meresap.", "Goreng sampai kecokelatan."] },
    { n: "Semur ayam kentang", t: "lauk", i: ["ayam", "kentang"], tag: ["ayam", "anak"], s: ["Tumis bawang, masukkan ayam sampai berubah warna.", "Tambahkan air, kecap, dan kentang. Masak sampai kuah mengental."] },
    { n: "Tongkol suwir balado", t: "lauk", i: ["tongkol", "cabai", "tomat"], tag: ["pedas", "ikan"], s: ["Kukus atau goreng tongkol, lalu suwir.", "Tumis cabai dan tomat halus, masukkan suwiran tongkol."] },
    { n: "Tongkol bumbu kuning", t: "lauk", i: ["tongkol", "tomat"], tag: ["ikan", "anak"], s: ["Tumis bumbu kuning (kunyit, bawang, kemiri).", "Masukkan tongkol, tomat, dan sedikit air. Masak sampai bumbu meresap."] },
    { n: "Orak-arik telur wortel", t: "lauk", i: ["telur", "wortel"], tag: ["anak"], s: ["Tumis bawang dan wortel serut sampai layu.", "Masukkan telur kocok, aduk sampai matang dan berbutir."] },
    { n: "Perkedel kentang", t: "lauk", i: ["kentang", "telur"], tag: ["anak"], s: ["Goreng atau kukus kentang, haluskan dengan bawang goreng dan garam.", "Bentuk bulat pipih, celup ke telur, lalu goreng."] },
    { n: "Tempe orek kecap", t: "lauk", i: ["tempe"], tag: ["anak"], s: ["Potong tempe korek api, goreng setengah kering.", "Tumis bawang, masukkan tempe dan kecap, aduk sampai rata."] },
    { n: "Tahu telur kecap", t: "lauk", i: ["tahu", "telur"], tag: ["anak"], s: ["Potong tahu dadu, campur dengan telur kocok, goreng seperti dadar tebal.", "Siram dengan kecap dan bawang goreng."] },
    { n: "Tumis kangkung", t: "sayur", i: ["kangkung", "tomat"], tag: [], s: ["Tumis bawang, masukkan kangkung dan tomat.", "Masak cepat dengan api besar agar tetap hijau."] },
    { n: "Sayur bening bayam jagung", t: "sayur", i: ["bayam", "jagung"], tag: ["anak"], s: ["Didihkan air dengan bawang merah iris dan temu kunci.", "Masukkan jagung, lalu bayam di akhir. Matikan api begitu bayam layu."] },
    { n: "Sayur asem", t: "sayur", i: ["kacangpanjang", "labusiam", "jagung", "asem"], tag: ["anak"], s: ["Rebus jagung dan bumbu sayur asem sampai mendidih.", "Masukkan labu siam dan kacang panjang, masak sampai empuk."] },
    { n: "Sayur lodeh", t: "sayur", i: ["labusiam", "kacangpanjang", "terong", "santan"], tag: ["anak"], s: ["Tumis bumbu halus, tuang air, masukkan labu siam dan kacang panjang.", "Tambahkan terong dan santan, aduk terus supaya santan tidak pecah."] },
    { n: "Sop sayur", t: "sayur", i: ["wortel", "kentang", "kol"], tag: ["anak"], s: ["Rebus wortel dan kentang dengan bawang putih geprek.", "Masukkan kol, bumbui garam dan merica."] },
    { n: "Tumis tauge", t: "sayur", i: ["toge"], tag: ["anak"], s: ["Tumis bawang sampai harum.", "Masukkan tauge, masak 2 menit saja supaya tetap renyah."] },
    { n: "Capcay kuah sederhana", t: "sayur", i: ["sawi", "wortel", "kol"], tag: ["anak"], s: ["Tumis bawang putih, masukkan wortel dan sedikit air.", "Tambahkan kol dan sawi, kentalkan dengan larutan tepung maizena."] },
    { n: "Oseng terong balado", t: "sayur", i: ["terong", "cabai"], tag: ["pedas"], s: ["Goreng sebentar terong yang sudah dipotong.", "Tumis cabai halus, masukkan terong, aduk rata."] },
    { n: "Tumis kacang panjang", t: "sayur", i: ["kacangpanjang", "cabai"], tag: ["pedas"], s: ["Potong kacang panjang 3 cm.", "Tumis dengan bawang dan irisan cabai sampai layu."] }
  ];

  const r500 = (n) => Math.ceil(n / 500) * 500;

  function resolveOwned(owned, extra) {
    const set = new Set((owned || []).filter((k) => ING[k]));
    String(extra || "").toLowerCase().split(",").map((x) => x.trim()).filter(Boolean).forEach((w) => {
      for (const k in ING) {
        const n = ING[k].n.toLowerCase();
        if (n.includes(w) || w.includes(n.split(" ")[0])) set.add(k);
      }
    });
    return set;
  }

  function allowed(r, prefs) {
    if ((prefs.has("pedas") || prefs.has("anak")) && r.tag.includes("pedas")) return false;
    if ((prefs.has("ayam") || prefs.has("vegetarian")) && r.tag.includes("ayam")) return false;
    if ((prefs.has("ikan") || prefs.has("vegetarian")) && r.tag.includes("ikan")) return false;
    if (prefs.has("rendahgula") && (r.i.includes("gulamerah") || r.i.includes("santan"))) return false;
    return true;
  }

  /* ---------- Diet khusus di mode cepat ---------- */
  const usesKecap = (r) => /kecap|bacem|semur/i.test(r.n + " " + r.s.join(" "));

  /* Penalti skor: masakan yang kurang cocok untuk diet tertentu dihindari bila ada pilihan lain. */
  function dietPenalty(r, prefs) {
    let p = 0;
    if (prefs.has("rendahgaram") && usesKecap(r)) p += 40000;
    if (prefs.has("rendahgula") && usesKecap(r)) p += 25000; // kecap manis
    return p;
  }

  /* Langkah masak disesuaikan untuk diet rendah garam. */
  function lowSaltSteps(r) {
    const steps = r.s.map((t) => t
      .replace(/air garam/gi, "air perasan jeruk nipis")
      .replace(/dan garam/gi, "dan sedikit sekali garam"));
    steps.push(usesKecap(r)
      ? "Rendah garam: pakai kecap sedikit saja (½ sdm untuk sekeluarga) atau ganti air asam jawa + bawang goreng; jangan tambah garam lagi."
      : r.t === "lauk"
        ? "Rendah garam: garam cukup seujung sendok teh untuk sekeluarga, tanpa penyedap; perkuat rasa dengan bawang putih, ketumbar, kunyit, dan perasan jeruk nipis."
        : "Rendah garam: masak tanpa penyedap; beri rasa dengan tomat, daun salam, serai, atau perasan jeruk nipis.");
    return steps;
  }

  /* Bahan yang aman dan mudah diolah untuk MPASI (6–12 bulan), urut dari yang paling diutamakan. */
  const MPASI_PROTEIN = {
    ayam: "daging ayam tanpa kulit", tongkol: "ikan tongkol (buang semua durinya)", telur: "telur (pastikan matang sempurna)",
    tahu: "tahu", tempe: "tempe"
  };
  const MPASI_VEG = {
    wortel: "wortel", labusiam: "labu siam", kentang: "kentang", bayam: "bayam (daunnya saja)", jagung: "jagung manis (pipil, saring kulitnya)",
    kol: "kol", sawi: "sawi hijau (daunnya saja)", kacangpanjang: "kacang panjang", kangkung: "kangkung (daunnya saja)", terong: "terong (tanpa kulit)"
  };
  function mpasiDish(l, v) {
    const keys = [...l.i, ...v.i];
    const prot = Object.keys(MPASI_PROTEIN).find((k) => keys.includes(k));
    const veg = Object.keys(MPASI_VEG).find((k) => keys.includes(k));
    if (!prot && !veg) return null;
    const parts = [prot && MPASI_PROTEIN[prot], veg && MPASI_VEG[veg]].filter(Boolean);
    const short = [prot && ING[prot].n.toLowerCase(), veg && ING[veg].n.toLowerCase()].filter(Boolean).join(" & ");
    const steps = [
      "Sisihkan sedikit " + parts.join(" dan ") + " sebelum dibumbui. Jangan pakai cabai, garam, gula, atau kecap.",
      "Kukus atau rebus sampai sangat lunak" + (prot === "telur" ? " (telur direbus 10 menit sampai matang)" : "") + ", lalu haluskan dengan sedikit air rebusan.",
      "Usia 6–8 bulan: saring sampai halus seperti bubur. Usia 9–12 bulan: cincang halus atau lumatkan kasar. Campur dengan nasi tim."
    ];
    if (prot === "telur") steps.push("Kenalkan telur sedikit dulu dan perhatikan tanda alergi (ruam, muntah) selama 3 hari.");
    return { name: "Nasi tim " + short, why: "Dari bahan menu hari ini, tanpa belanja tambahan", steps };
  }

  /* input: {budget, ppl, days, owned: [keys], extra: "", prefs: [keys]} */
  function localPlan(input) {
    const budget = Number(input.budget) || 0;
    const ppl = Math.max(1, Number(input.ppl) || 4);
    const nDays = Math.max(1, Math.min(30, Number(input.days) || 1));
    const prefs = new Set(input.prefs || []);
    const scale = ppl / 4;
    const ownedAll = resolveOwned(input.owned, input.extra);
    const have = new Set(ownedAll);
    const recent = [], days = [], buyWeeks = [];
    const usedRecently = (name) => recent.slice(-12).filter((x) => x === name).length; // 6 hari terakhir (lauk + sayur)
    const L = R.filter((r) => r.t === "lauk" && allowed(r, prefs));
    const V = R.filter((r) => r.t === "sayur" && allowed(r, prefs));
    let prevMain = null;

    for (let d = 0; d < nDays; d++) {
      let best = null;
      for (const l of L) for (const v of V) {
        const keys = [...new Set([...l.i, ...v.i])];
        let cost = 0, own = 0;
        keys.forEach((k) => { if (have.has(k)) own++; else cost += r500(ING[k].p * scale); });
        let score = own * 6000 - cost;
        if (cost > budget) score -= 50000 + (cost - budget) * 2;
        score -= usedRecently(l.n) * 60000;
        score -= usedRecently(v.n) * 35000;
        if (prevMain && l.i[0] === prevMain) score -= 12000;
        if (prefs.has("anak") && l.tag.includes("anak")) score += 1500;
        score -= dietPenalty(l, prefs) + dietPenalty(v, prefs);
        if (!best || score > best.score) best = { l, v, keys, cost, score };
      }
      const { l, v, keys, cost } = best;
      const buy = (buyWeeks[Math.floor(d / 7)] = buyWeeks[Math.floor(d / 7)] || {});
      keys.forEach((k) => {
        if (have.has(k)) { have.delete(k); }
        else {
          buy[k] = buy[k] || { q: 0, p: 0 };
          buy[k].q += ING[k].q * scale;
          buy[k].p += r500(ING[k].p * scale);
        }
      });
      recent.push(l.n, v.n); prevMain = l.i[0];
      const why = (x) => {
        const o = x.i.filter((k) => ownedAll.has(k));
        return o.length ? "Pakai " + o.map((k) => ING[k].n.toLowerCase()).join(", ") + " yang sudah ada" : "Murah dan cepat dimasak";
      };
      const steps = (r) => (prefs.has("rendahgaram") ? lowSaltSteps(r) : r.s);
      const day = { label: "Hari " + (d + 1), cost, lauk: { name: l.n, why: why(l), steps: steps(l) }, sayur: { name: v.n, why: why(v), steps: steps(v) } };
      if (prefs.has("mpasi")) { const b = mpasiDish(l, v); if (b) day.bayi = b; }
      days.push(day);
    }

    const fmtQ = (q, u) => {
      const v = u === "kg" ? Math.round(q * 100) / 100 : Math.ceil(q * 2) / 2;
      return String(v).replace(".", ",") + " " + u;
    };
    const toList = (buy) => Object.entries(buy || {}).map(([k, b]) => ({ item: ING[k].n, qty: fmtQ(b.q, ING[k].u), price: b.p, group: ING[k].g }));
    const weeks = nDays > 7 ? buyWeeks.map((b, i) => ({ label: "Minggu " + (i + 1), shopping: toList(b) })) : null;
    const shopping = weeks ? [] : toList(buyWeeks[0]);
    const total = weeks ? weeks.reduce((a, w) => a + w.shopping.reduce((x, y) => x + y.price, 0), 0) : shopping.reduce((a, b) => a + b.price, 0);
    const tips = total > budget * nDays
      ? "Budget agak mepet. Coba tambah tempe atau tahu sebagai lauk utama, atau kurangi ayam dan ikan menjadi 2 kali seminggu."
      : "Belanja sayur hijau (kangkung, bayam) untuk 1–2 hari pertama saja karena cepat layu. Wortel, kentang, dan labu siam tahan lebih lama.";
    const dietTips = [];
    if (prefs.has("rendahgaram")) dietTips.push("Untuk diet rendah garam, hindari ikan asin, mi instan, dan makanan kemasan.");
    if (prefs.has("rendahgula")) dietTips.push("Untuk ramah diabetes, perbanyak sayur, batasi nasi putih, dan pilih kecap asin daripada kecap manis.");
    if (prefs.has("mpasi")) dietTips.push("Untuk MPASI, ikuti saran bidan atau dokter anak, terutama soal alergi dan tekstur.");
    const allTips = [tips, ...dietTips].join(" ");
    return weeks ? { days, weeks, shopping, tips: allTips, source: "local" } : { days, shopping, tips: allTips, source: "local" };
  }

  const api = { ING, R, localPlan, resolveOwned };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.DapurEngine = api;
})(typeof window !== "undefined" ? window : globalThis);
