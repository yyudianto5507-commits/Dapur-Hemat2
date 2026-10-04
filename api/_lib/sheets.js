/* Kirim satu baris ke Google Sheets lewat Apps Script (FEEDBACK_WEBHOOK_URL).
   type: "feedback" atau "order". Mengembalikan true jika tersimpan, false jika webhook belum diatur. */
export async function sendToSheets(type, row) {
  const url = process.env.FEEDBACK_WEBHOOK_URL;
  if (!url) return false;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: process.env.FEEDBACK_SECRET || "", type, row }),
    redirect: "follow",
    signal: AbortSignal.timeout(15000)
  });
  const text = await r.text();
  if (!r.ok || !/"ok"\s*:\s*true/.test(text)) throw new Error("sheets " + r.status + " " + text.slice(0, 200));
  return true;
}

/* Cegah teks diartikan sebagai rumus spreadsheet. */
export const safeCell = (v, max) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max).replace(/^[=+\-@]/, "'$&");
