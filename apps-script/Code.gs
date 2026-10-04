/**
 * Dapur Hemat — umpan balik, pesanan, dan kode Premium di Google Sheets.
 * Ganti RAHASIA dengan teks acak yang sama dengan FEEDBACK_SECRET di Vercel.
 * Setelah mengganti kode ini: Terapkan → Kelola deployment → ikon pensil → Versi: Versi baru → Terapkan.
 *
 * Cara kerja kode Premium:
 * - Di tab "Pesanan", ubah kolom Status menjadi "Lunas" → kode Premium dibuat otomatis,
 *   ditulis di kolom "Kode Premium", dan kolom "Kirim ke WA" berisi tautan pesan siap kirim.
 * - Atau pilih baris pesanan lalu menu Dapur Hemat → "Buat kode untuk baris terpilih".
 * - Untuk menonaktifkan kode, ubah Status di tab "Kode" menjadi "Nonaktif".
 */
const RAHASIA = "GANTI_DENGAN_TEKS_ACAK";
const KIRIM_EMAIL_PESANAN = true; // kirim email ke pemilik spreadsheet setiap ada pesanan baru
const ALAMAT_APLIKASI = "https://dapur-hemat2projectv2.vercel.app"; // ganti jika alamat situs berubah
const ZONA = "Asia/Jakarta";

const TAB = {
  feedback: {
    nama: "Umpan balik",
    judul: ["Waktu", "Menu cocok?", "Harga?", "Pakai lagi?", "Mau bayar Rp10rb?", "Saran", "Budget/hari", "Orang", "Hari", "Daerah", "Mode", "Menu", "ID pengguna"],
    kolom: ["waktu", "cocok", "harga", "lagi", "bayar", "saran", "budget", "orang", "hari", "daerah", "mode", "menu", "pengguna"]
  },
  order: {
    nama: "Pesanan",
    judul: ["No. pesanan", "Waktu", "Nama", "WhatsApp", "Email", "Paket", "Harga", "Kode unik", "Total transfer", "Cara bayar", "Daerah", "Catatan", "Status", "Kode Premium", "Kirim ke WA"],
    kolom: ["id", "waktu", "nama", "whatsapp", "email", "paket", "harga", "kode_unik", "total", "bayar", "daerah", "catatan", "status"]
  }
};
// Kolom di tab Pesanan (1 = A)
const P = { id: 1, nama: 3, wa: 4, paket: 6, status: 13, kode: 14, kirim: 15 };

const KODE_TAB = "Kode";
const KODE_JUDUL = ["Kode", "No. pesanan", "Nama", "WhatsApp", "Paket", "Dibuat", "Berlaku sampai", "Status", "Dipakai", "Terakhir dipakai"];
// Kolom di tab Kode (1 = A)
const K = { kode: 1, id: 2, nama: 3, wa: 4, paket: 5, dibuat: 6, sampai: 7, status: 8, dipakai: 9, terakhir: 10 };

/* ---------------- Penerima dari server Vercel ---------------- */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.secret !== RAHASIA) return balas({ ok: false, error: "secret" });
    if (data.type === "verify") return balas(cekKode(String((data.row || {}).kode || "")));

    const jenis = TAB[data.type] ? data.type : "feedback";
    const t = TAB[jenis];
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = siapkanTab(ss, t.nama, t.judul);
    if (jenis === "order") pasangPilihanStatus(sheet);
    const row = data.row || {};
    sheet.appendRow(t.kolom.map(function (k) { return row[k] === undefined ? "" : row[k]; }));
    if (jenis === "order" && KIRIM_EMAIL_PESANAN) kabariPesanan(row, ss.getUrl());
    return balas({ ok: true });
  } catch (err) {
    return balas({ ok: false, error: String(err) });
  }
}

function siapkanTab(ss, nama, judul) {
  const sheet = ss.getSheetByName(nama) || ss.insertSheet(nama);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(judul);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, judul.length).setFontWeight("bold");
  } else if (sheet.getLastColumn() < judul.length) {
    // tab lama: tambahkan judul kolom yang belum ada
    sheet.getRange(1, 1, 1, judul.length).setValues([judul]).setFontWeight("bold");
  }
  return sheet;
}

function pasangPilihanStatus(sheet) {
  const aturan = SpreadsheetApp.newDataValidation().requireValueInList(["Menunggu pembayaran", "Lunas", "Batal"], true).setAllowInvalid(true).build();
  sheet.getRange(2, P.status, Math.max(sheet.getMaxRows() - 1, 1), 1).setDataValidation(aturan);
}

/* ---------------- Kode Premium ---------------- */
function buatKodeAcak() {
  const huruf = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += huruf.charAt(Math.floor(Math.random() * huruf.length));
  return "DH-" + s.slice(0, 4) + "-" + s.slice(4);
}

function bulanDariPaket(paket) {
  const m = String(paket || "").match(/(\d+)\s*bulan/i);
  return m ? Number(m[1]) : 1;
}

function tanggal(d) { return Utilities.formatDate(d, ZONA, "yyyy-MM-dd"); }
function tanggalIndo(d) {
  const b = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return d.getDate() + " " + b[d.getMonth()] + " " + d.getFullYear();
}
function keTanggal(v) {
  if (v && typeof v.getTime === "function") return new Date(v.getFullYear(), v.getMonth(), v.getDate());
  const m = String(v).match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/* Membuat kode untuk satu baris di tab Pesanan. Mengembalikan kode, atau "" jika baris tidak valid. */
function buatKodeUntukBaris(sheet, baris) {
  const nilai = sheet.getRange(baris, 1, 1, P.kirim).getValues()[0];
  const id = nilai[P.id - 1], nama = nilai[P.nama - 1], wa = String(nilai[P.wa - 1]), paket = nilai[P.paket - 1];
  if (!id) return "";
  if (nilai[P.kode - 1]) return String(nilai[P.kode - 1]); // sudah ada kode

  const ss = sheet.getParent();
  const tabKode = siapkanTab(ss, KODE_TAB, KODE_JUDUL);
  const ada = tabKode.getLastRow() > 1 ? tabKode.getRange(2, 1, tabKode.getLastRow() - 1, 1).getValues().map(function (r) { return r[0]; }) : [];
  let kode;
  do { kode = buatKodeAcak(); } while (ada.indexOf(kode) >= 0);

  const sekarang = new Date();
  const sampai = new Date(sekarang.getTime());
  sampai.setMonth(sampai.getMonth() + bulanDariPaket(paket));
  tabKode.appendRow([kode, id, nama, wa, paket, tanggal(sekarang), tanggal(sampai), "Aktif", 0, ""]);

  const pesan = "Halo Ibu " + nama + ", pembayaran Dapur Hemat Premium sudah kami terima. Terima kasih!\n\n" +
    "Kode Premium Ibu: " + kode + "\nBerlaku sampai: " + tanggalIndo(sampai) + "\n\n" +
    "Cara memakai:\n1. Buka " + ALAMAT_APLIKASI + "/app\n2. Tekan \"Punya kode Premium?\"\n3. Masukkan kode di atas, lalu tekan Aktifkan.";
  sheet.getRange(baris, P.kode).setValue(kode);
  if (wa) sheet.getRange(baris, P.kirim).setFormula('=HYPERLINK("https://wa.me/' + wa.replace(/\D/g, "") + "?text=" + encodeURIComponent(pesan).replace(/"/g, "%22") + '","Kirim kode")');
  return kode;
}

/* Otomatis: Status diubah menjadi "Lunas" di tab Pesanan. */
function onEdit(e) {
  try {
    const sheet = e.range.getSheet();
    if (sheet.getName() !== TAB.order.nama || e.range.getColumn() !== P.status || e.range.getRow() < 2) return;
    if (String(e.value || "").trim().toLowerCase() !== "lunas") return;
    siapkanTab(sheet.getParent(), TAB.order.nama, TAB.order.judul);
    buatKodeUntukBaris(sheet, e.range.getRow());
  } catch (err) { /* jangan ganggu pengeditan */ }
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu("Dapur Hemat")
    .addItem("Buat kode untuk baris terpilih", "menuBuatKode")
    .addItem("Buat kode tanpa pesanan…", "menuKodeManual")
    .addToUi();
}

function menuBuatKode() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const ui = SpreadsheetApp.getUi();
  if (sheet.getName() !== TAB.order.nama) { ui.alert("Buka tab \"Pesanan\", pilih baris pesanannya, lalu jalankan menu ini lagi."); return; }
  const baris = sheet.getActiveRange().getRow();
  if (baris < 2) { ui.alert("Pilih baris pesanan (bukan baris judul)."); return; }
  siapkanTab(ss, TAB.order.nama, TAB.order.judul);
  sheet.getRange(baris, P.status).setValue("Lunas");
  const kode = buatKodeUntukBaris(sheet, baris);
  ui.alert(kode ? "Kode Premium: " + kode + "\nKlik \"Kirim kode\" di kolom Kirim ke WA untuk mengirimnya." : "Baris ini belum berisi pesanan.");
}

/* Untuk hadiah, uji coba, atau pembayaran di luar form. */
function menuKodeManual() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt("Kode tanpa pesanan", "Tulis: nama, jumlah bulan. Contoh: Bu Rina, 1", ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const bagian = r.getResponseText().split(",");
  const nama = (bagian[0] || "").trim() || "Tanpa nama";
  const bulan = Math.max(1, Math.min(24, Number((bagian[1] || "1").trim()) || 1));
  const tabKode = siapkanTab(SpreadsheetApp.getActiveSpreadsheet(), KODE_TAB, KODE_JUDUL);
  const kode = buatKodeAcak();
  const sekarang = new Date(), sampai = new Date(sekarang.getTime());
  sampai.setMonth(sampai.getMonth() + bulan);
  tabKode.appendRow([kode, "MANUAL", nama, "", "Premium " + bulan + " bulan", tanggal(sekarang), tanggal(sampai), "Aktif", 0, ""]);
  ui.alert("Kode Premium untuk " + nama + ": " + kode + "\nBerlaku sampai " + tanggalIndo(sampai) + ".");
}

/* Dipanggil server saat pelanggan memasukkan kode di aplikasi. */
function cekKode(kode) {
  kode = kode.toUpperCase().replace(/\s/g, "");
  const tabKode = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(KODE_TAB);
  if (!tabKode || tabKode.getLastRow() < 2 || !kode) return { ok: true, valid: false, reason: "tidak_ada" };
  const data = tabKode.getRange(2, 1, tabKode.getLastRow() - 1, KODE_JUDUL.length).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][K.kode - 1]).toUpperCase() !== kode) continue;
    const status = String(data[i][K.status - 1]).trim().toLowerCase();
    const sampai = keTanggal(data[i][K.sampai - 1]);
    const hariIni = keTanggal(tanggal(new Date()));
    if (status !== "aktif") return { ok: true, valid: false, reason: "nonaktif" };
    if (!sampai || sampai < hariIni) return { ok: true, valid: false, reason: "kedaluwarsa", sampai: sampai ? tanggal(sampai) : "" };
    const baris = i + 2;
    tabKode.getRange(baris, K.dipakai).setValue(Number(data[i][K.dipakai - 1] || 0) + 1);
    tabKode.getRange(baris, K.terakhir).setValue(Utilities.formatDate(new Date(), ZONA, "yyyy-MM-dd HH:mm"));
    return { ok: true, valid: true, sampai: tanggal(sampai), paket: String(data[i][K.paket - 1]), nama: String(data[i][K.nama - 1]) };
  }
  return { ok: true, valid: false, reason: "tidak_ada" };
}

/* ---------------- Email pesanan ---------------- */
function kabariPesanan(o, url) {
  try {
    const rp = function (n) { return "Rp" + Number(n || 0).toLocaleString("id-ID"); };
    MailApp.sendEmail(
      Session.getEffectiveUser().getEmail(),
      "Pesanan baru Dapur Hemat: " + o.id + " (" + rp(o.total) + ")",
      "Pesanan baru masuk.\n\n" +
      "No. pesanan: " + o.id + "\nNama: " + o.nama + "\nWhatsApp: " + o.whatsapp + "\nEmail: " + (o.email || "-") +
      "\nPaket: " + o.paket + "\nTotal transfer: " + rp(o.total) + " (kode unik " + o.kode_unik + ")" +
      "\nCara bayar: " + o.bayar + "\nCatatan: " + (o.catatan || "-") +
      "\n\nCek mutasi rekening dengan nominal persis " + rp(o.total) + ", lalu ubah Status menjadi Lunas di spreadsheet. Kode Premium akan dibuat otomatis:\n" + url
    );
  } catch (err) { /* email gagal tidak membatalkan pesanan */ }
}

/* Jalankan sekali dari editor (pilih ujiEmail → Jalankan) untuk memberi izin kirim email. */
function ujiEmail() {
  kabariPesanan({ id: "DH-UJI-0000", nama: "Uji Coba", whatsapp: "6281200000000", paket: "Premium 1 bulan", total: 10001, kode_unik: 1, bayar: "Transfer bank" },
    SpreadsheetApp.getActiveSpreadsheet().getUrl());
}

function balas(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
