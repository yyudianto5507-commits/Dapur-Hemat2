/**
 * Dapur Hemat — penerima umpan balik dan pesanan di Google Sheets.
 * Cara pasang ada di README.md bagian "Umpan balik ke Google Sheets".
 * Ganti RAHASIA di bawah dengan teks acak yang sama dengan FEEDBACK_SECRET di Vercel.
 * Setelah mengganti kode ini: Terapkan → Kelola deployment → ikon pensil → Versi: Versi baru → Terapkan.
 */
const RAHASIA = "GANTI_DENGAN_TEKS_ACAK";
const KIRIM_EMAIL_PESANAN = true; // kirim email ke pemilik spreadsheet setiap ada pesanan baru

const TAB = {
  feedback: {
    nama: "Umpan balik",
    judul: ["Waktu", "Menu cocok?", "Harga?", "Pakai lagi?", "Mau bayar Rp10rb?", "Saran", "Budget/hari", "Orang", "Hari", "Daerah", "Mode", "Menu", "ID pengguna"],
    kolom: ["waktu", "cocok", "harga", "lagi", "bayar", "saran", "budget", "orang", "hari", "daerah", "mode", "menu", "pengguna"]
  },
  order: {
    nama: "Pesanan",
    judul: ["No. pesanan", "Waktu", "Nama", "WhatsApp", "Email", "Paket", "Harga", "Kode unik", "Total transfer", "Cara bayar", "Daerah", "Catatan", "Status"],
    kolom: ["id", "waktu", "nama", "whatsapp", "email", "paket", "harga", "kode_unik", "total", "bayar", "daerah", "catatan", "status"]
  }
};

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.secret !== RAHASIA) return balas({ ok: false, error: "secret" });
    const jenis = TAB[data.type] ? data.type : "feedback";
    const t = TAB[jenis];
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(t.nama) || ss.insertSheet(t.nama);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(t.judul);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, t.judul.length).setFontWeight("bold");
    }
    const row = data.row || {};
    sheet.appendRow(t.kolom.map(function (k) { return row[k] === undefined ? "" : row[k]; }));
    if (jenis === "order" && KIRIM_EMAIL_PESANAN) kabariPesanan(row, ss.getUrl());
    return balas({ ok: true });
  } catch (err) {
    return balas({ ok: false, error: String(err) });
  }
}

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
      "\n\nCek mutasi rekening dengan nominal persis " + rp(o.total) + ", lalu ubah Status di spreadsheet:\n" + url
    );
  } catch (err) { /* email gagal tidak membatalkan pesanan */ }
}

function balas(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
