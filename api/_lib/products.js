/* Paket Dapur Hemat Premium.
   Harga ditentukan di server (bukan di HP pembeli) supaya tidak bisa diubah dari browser.
   Manfaat di bawah sesuai fitur Premium yang ada di aplikasi (aktif dengan kode Premium). */
export const PACKAGES = [
  { id: "bulan", name: "Premium 1 bulan", price: 10000, months: 1, note: "" },
  { id: "tiga", name: "Premium 3 bulan", price: 25000, months: 3, note: "Hemat Rp5.000" },
  { id: "tahun", name: "Premium 12 bulan", price: 90000, months: 12, note: "Hemat Rp30.000" }
];

export const BENEFITS = [
  "Rencana menu 14 dan 30 hari, dengan daftar belanja per minggu",
  "Pilihan diet khusus: rendah garam, ramah diabetes, MPASI, dan vegetarian",
  "Kuota AI lebih longgar: sampai 60 kali susun menu per jam",
  "Bantuan langsung lewat WhatsApp"
];

export const PAYMENT_LABEL = { transfer: "Transfer bank", qris: "QRIS", ewallet: "E-wallet" };

export function findPackage(id) {
  return PACKAGES.find((p) => p.id === id) || null;
}
