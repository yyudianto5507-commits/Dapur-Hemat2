/* Komunikasi dengan Google Sheets lewat Apps Script (FEEDBACK_WEBHOOK_URL). */

/* Kirim permintaan dan kembalikan jawaban JSON dari Apps Script. Melempar error jika gagal. */
export async function callSheets(type, row) {
  const url = process.env.FEEDBACK_WEBHOOK_URL;
  if (!url) return null;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: process.env.FEEDBACK_SECRET || "", type, row }),
    redirect: "follow",
    signal: AbortSignal.timeout(15000)
  });
  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) { /* bukan JSON */ }
  if (!r.ok || !data || data.ok !== true) throw new Error("sheets " + r.status + " " + text.slice(0, 200));
  return data;
}

/* Simpan satu baris (umpan balik / pesanan). true jika tersimpan, false jika webhook belum diatur. */
export async function sendToSheets(type, row) {
  return (await callSheets(type, row)) !== null;
}

/* Cegah teks diartikan sebagai rumus spreadsheet. */
export const safeCell = (v, max) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max).replace(/^[=+\-@]/, "'$&");
