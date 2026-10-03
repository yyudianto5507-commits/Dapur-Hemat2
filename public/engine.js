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
    if (prefs.has("ayam") && r.tag.includes("ayam")) return false;
    if (prefs.has("ikan") && r.tag.includes("ikan")) return false;
    return true;
  }

  /* input: {budget, ppl, days, owned: [keys], extra: "", prefs: [keys]} */
  function localPlan(input) {
    const budget = Number(input.budget) || 0;
    const ppl = Math.max(1, Number(input.ppl) || 4);
    const nDays = Math.max(1, Math.min(7, Number(input.days) || 1));
    const prefs = new Set(input.prefs || []);
    const scale = ppl / 4;
    const ownedAll = resolveOwned(input.owned, input.extra);
    const have = new Set(ownedAll);
    const used = new Map(), days = [], buy = {};
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
        score -= (used.get(l.n) || 0) * 60000;
        score -= (used.get(v.n) || 0) * 35000;
        if (prevMain && l.i[0] === prevMain) score -= 12000;
        if (prefs.has("anak") && l.tag.includes("anak")) score += 1500;
        if (!best || score > best.score) best = { l, v, keys, cost, score };
      }
      const { l, v, keys, cost } = best;
      keys.forEach((k) => {
        if (have.has(k)) { have.delete(k); }
        else {
          buy[k] = buy[k] || { q: 0, p: 0 };
          buy[k].q += ING[k].q * scale;
          buy[k].p += r500(ING[k].p * scale);
        }
      });
      used.set(l.n, (used.get(l.n) || 0) + 1); used.set(v.n, (used.get(v.n) || 0) + 1); prevMain = l.i[0];
      const why = (x) => {
        const o = x.i.filter((k) => ownedAll.has(k));
        return o.length ? "Pakai " + o.map((k) => ING[k].n.toLowerCase()).join(", ") + " yang sudah ada" : "Murah dan cepat dimasak";
      };
      days.push({ label: "Hari " + (d + 1), cost, lauk: { name: l.n, why: why(l), steps: l.s }, sayur: { name: v.n, why: why(v), steps: v.s } });
    }

    const fmtQ = (q, u) => {
      const v = u === "kg" ? Math.round(q * 100) / 100 : Math.ceil(q * 2) / 2;
      return String(v).replace(".", ",") + " " + u;
    };
    const shopping = Object.entries(buy).map(([k, b]) => ({ item: ING[k].n, qty: fmtQ(b.q, ING[k].u), price: b.p, group: ING[k].g }));
    const total = shopping.reduce((a, b) => a + b.price, 0);
    const tips = total > budget * nDays
      ? "Budget agak mepet. Coba tambah tempe atau tahu sebagai lauk utama, atau kurangi ayam dan ikan menjadi 2 kali seminggu."
      : "Belanja sayur hijau (kangkung, bayam) untuk 1–2 hari pertama saja karena cepat layu. Wortel, kentang, dan labu siam tahan lebih lama.";
    return { days, shopping, tips, source: "local" };
  }

  const api = { ING, R, localPlan, resolveOwned };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.DapurEngine = api;
})(typeof window !== "undefined" ? window : globalThis);
