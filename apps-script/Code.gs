/**
 * Dapur Hemat — penerima umpan balik di Google Sheets.
 * Cara pasang ada di README.md bagian "Umpan balik ke Google Sheets".
 * Ganti RAHASIA di bawah dengan teks acak yang sama dengan FEEDBACK_SECRET di Vercel.
 */
const RAHASIA = "GANTI_DENGAN_TEKS_ACAK";
const KOLOM = ["waktu", "cocok", "harga", "lagi", "bayar", "saran", "budget", "orang", "hari", "daerah", "mode", "menu", "pengguna"];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.secret !== RAHASIA) return balas({ ok: false, error: "secret" });
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Umpan balik") ||
      SpreadsheetApp.getActiveSpreadsheet().insertSheet("Umpan balik");
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Waktu", "Menu cocok?", "Harga?", "Pakai lagi?", "Mau bayar Rp10rb?", "Saran", "Budget/hari", "Orang", "Hari", "Daerah", "Mode", "Menu", "ID pengguna"]);
      sheet.setFrozenRows(1);
    }
    const row = data.row || {};
    sheet.appendRow(KOLOM.map(function (k) { return row[k] === undefined ? "" : row[k]; }));
    return balas({ ok: true });
  } catch (err) {
    return balas({ ok: false, error: String(err) });
  }
}

function balas(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
