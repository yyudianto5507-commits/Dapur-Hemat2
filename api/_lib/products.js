/* Paket Dapur Hemat Premium.
   Harga ditentukan di server (bukan di HP pembeli) supaya tidak bisa diubah dari browser.
   UBAH daftar manfaat sesuai yang benar-benar Anda berikan kepada pelanggan. */
export const PACKAGES = [
  { id: "bulan", name: "Premium 1 bulan", price: 10000, months: 1, note: "" },
  { id: "tiga", name: "Premium 3 bulan", price: 25000, months: 3, note: "Hemat Rp5.000" },
  { id: "tahun", name: "Premium 12 bulan", price: 90000, months: 12, note: "Hemat Rp30.000" }
];

export const BENEFITS = [
  "Rencana menu 30 hari sekaligus, dikirim ke WhatsApp setiap awal bulan",
  "Penyesuaian menu untuk diet khusus (rendah garam, diabetes, MPASI)",
  "Daftar harga pasar disesuaikan dengan daerah Ibu",
  "Bantuan langsung lewat WhatsApp"
];

export const PAYMENT_LABEL = { transfer: "Transfer bank", qris: "QRIS", ewallet: "E-wallet" };

export function findPackage(id) {
  return PACKAGES.find((p) => p.id === id) || null;
}
