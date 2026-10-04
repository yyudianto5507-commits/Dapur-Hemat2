# Dapur Hemat

Web app untuk ibu rumah tangga: isi budget, jumlah orang, dan bahan yang ada di rumah, lalu dapatkan menu harian dan daftar belanja yang muat di budget. Bisa dipasang di layar utama HP seperti aplikasi, dan tetap bisa dipakai saat offline (mode cepat).

## Isi folder

| Bagian | Fungsi |
|---|---|
| `public/index.html` + `landing.css` | Landing page di alamat utama (`/`) |
| `public/app.html` | Aplikasi Dapur Hemat, dibuka di `/app` |
| `public/` lainnya | Mesin menu cadangan (`engine.js`), ikon, service worker untuk offline, kebijakan privasi (`/privasi`) |
| `api/menu.js` | Server yang memanggil AI Claude. API key hanya disimpan di server, tidak pernah sampai ke HP pengguna |
| `api/feedback.js` | Meneruskan umpan balik pengguna ke Google Sheets |
| `apps-script/Code.gs` | Kode penerima umpan balik di Google Sheets |
| `scripts/test.mjs` | Uji otomatis (`npm test`), berjalan tanpa internet |

Cara kerjanya: HP pengguna mengirim isian ke `/api/menu`, server meminta Claude menyusun menu, memeriksa dan merapikan jawabannya, lalu mengirim hasilnya kembali. Kalau AI gagal, sibuk, atau pengguna offline, aplikasi otomatis memakai mesin menu cadangan berisi 20 resep rumahan, jadi pengguna selalu mendapat hasil.

## Yang perlu disiapkan

1. Akun **GitHub** (gratis) untuk menyimpan kode.
2. Akun **Vercel** (gratis untuk mulai) untuk menjalankan aplikasi. Daftar dengan akun GitHub.
3. **API key Claude** dari [platform.claude.com](https://platform.claude.com/settings/keys). Isi saldo, lalu buat key di menu API Keys.
4. Akun **Google** untuk spreadsheet umpan balik.

## Langkah deploy

### 1. Unggah kode ke GitHub
1. Buka github.com, buat repository baru bernama `dapur-hemat` (boleh Private).
2. Pilih "uploading an existing file", lalu seret semua isi folder ini (bukan folder zip-nya). Tekan **Commit changes**.

### 2. Hubungkan ke Vercel
1. Masuk ke vercel.com, tekan **Add New → Project**, pilih repository `dapur-hemat`, tekan **Import**.
2. Framework Preset: biarkan **Other**. Tidak perlu mengubah pengaturan build.
3. Buka **Environment Variables** dan isi minimal:
   - `ANTHROPIC_API_KEY` = API key Claude Anda
4. Tekan **Deploy**. Setelah selesai, Anda mendapat alamat seperti `dapur-hemat.vercel.app`.

### 3. Coba
Buka alamat tersebut di HP. Alamat utama menampilkan landing page; tombol **Susun menu sekarang** membuka aplikasi di `/app`. Isi form, tekan **Susun Menu**. Label di kanan atas berubah menjadi **AI aktif** jika AI berjalan. Jika muncul **Mode cepat**, periksa API key (lihat bagian Masalah umum).

### 4. Umpan balik ke Google Sheets
1. Buat Google Sheet baru, beri nama "Dapur Hemat – Umpan balik".
2. Menu **Ekstensi → Apps Script**. Hapus isi yang ada, tempel isi `apps-script/Code.gs`.
3. Ganti `GANTI_DENGAN_TEKS_ACAK` dengan teks acak panjang, misalnya `dh-7f3k9q2m8x`. Simpan.
4. Tekan **Terapkan → Deployment baru**. Jenis: **Aplikasi web**. Jalankan sebagai: **Saya**. Yang memiliki akses: **Siapa saja**. Tekan **Terapkan**, izinkan akses, lalu salin **URL aplikasi web**.
5. Di Vercel (Settings → Environment Variables), tambahkan:
   - `FEEDBACK_WEBHOOK_URL` = URL aplikasi web tadi
   - `FEEDBACK_SECRET` = teks acak yang sama dengan langkah 3
6. Buka tab **Deployments**, tekan titik tiga pada deployment terbaru, pilih **Redeploy** supaya pengaturan baru berlaku.

Setiap umpan balik akan masuk sebagai baris baru di tab "Umpan balik", lengkap dengan jawaban, saran, isian menu, dan ID acak pengguna (untuk menghitung jumlah orang tanpa mengenali identitas).

### 5. Lindungi tagihan AI (disarankan sebelum disebar luas)
- Di platform.claude.com, atur **batas pengeluaran bulanan** (Spend limit) sesuai anggaran Anda.
- Aplikasi sudah membatasi 20 permintaan per jam per pengguna dan 2.000 per hari secara total. Ubah lewat `LIMIT_PER_IP_HOUR` dan `LIMIT_GLOBAL_DAY`.
- Tanpa Redis, batas di atas berlaku per server dan bisa bocor saat pengguna banyak. Untuk produksi, buat database gratis di [upstash.com](https://upstash.com) (Redis), lalu isi `UPSTASH_REDIS_REST_URL` dan `UPSTASH_REDIS_REST_TOKEN` di Vercel.

### 6. Nama domain sendiri (opsional)
Beli domain (misalnya `dapurhemat.id`), lalu di Vercel buka **Settings → Domains**, tambahkan domain, dan ikuti petunjuk pengaturan DNS.

## Pengaturan lengkap

| Nama | Wajib | Keterangan |
|---|---|---|
| `ANTHROPIC_API_KEY` | Salah satu | API key Claude (perlu saldo) |
| `GEMINI_API_KEY` | Salah satu | API key Gemini dari aistudio.google.com/apikey (ada paket gratis). Jika keduanya diisi, Gemini menjadi cadangan saat Claude gagal |
| `AI_PROVIDER` | Tidak | Isi `gemini` supaya Gemini dipakai lebih dulu |
| `GEMINI_MODEL` | Tidak | Bawaan `gemini-flash-latest` |
| `GEMINI_FALLBACK_MODEL` | Tidak | Model cadangan saat model utama penuh/gagal. Bawaan `gemini-flash-lite-latest` |
| `CLAUDE_MODEL` | Tidak | Bawaan `claude-haiku-4-5-20251001` (cepat dan hemat). Bisa diganti model yang lebih pintar jika kualitas menu kurang |
| `LIMIT_PER_IP_HOUR` | Tidak | Bawaan 20 |
| `LIMIT_GLOBAL_DAY` | Tidak | Bawaan 2000 |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Disarankan | Batas pemakaian di semua server |
| `FEEDBACK_WEBHOOK_URL`, `FEEDBACK_SECRET` | Untuk umpan balik | Lihat langkah 4 |

## Mengubah aplikasi

- **Resep dan harga cadangan:** ubah daftar `ING` (bahan dan harga) dan `R` (resep) di `public/engine.js`.
- **Instruksi untuk AI:** ubah fungsi `buildPrompt` dan `SYSTEM` di `api/menu.js`.
- **Pertanyaan umpan balik:** ubah `FBQ` di `public/app.js` dan `ALLOWED` di `api/feedback.js` (keduanya harus sama).
- Setelah mengubah file di `public/`, naikkan `VERSION` di `public/sw.js` (misalnya `dh-v2`) supaya HP pengguna mengambil versi baru.
- Jalankan `npm test` sebelum mengunggah perubahan. Untuk mencoba di komputer: `npm i -g vercel`, buat file `.env.local` dari `.env.example`, lalu `vercel dev`.

## Masalah umum

| Gejala | Penyebab dan solusi |
|---|---|
| Selalu "Mode cepat" | `ANTHROPIC_API_KEY` belum diisi, salah, atau saldo habis. Periksa di Vercel lalu Redeploy. Lihat detail error di Vercel → Logs |
| Umpan balik gagal terkirim | URL Apps Script salah, akses bukan "Siapa saja", atau `FEEDBACK_SECRET` tidak sama dengan `RAHASIA` di Code.gs |
| Pengguna masih melihat versi lama | Naikkan `VERSION` di `public/sw.js`, unggah ulang |
| Tombol "Pasang" tidak muncul di iPhone | Normal. iPhone memakai tombol Bagikan → "Tambah ke Layar Utama"; aplikasi menampilkan petunjuk ini otomatis |

## Pesanan Premium

Halaman `/order` menerima pesanan Dapur Hemat Premium. Alurnya:

1. Ibu memilih paket, mengisi nama dan nomor WhatsApp, lalu memilih cara bayar.
2. Pesanan dicatat di tab **Pesanan** pada spreadsheet yang sama dengan umpan balik, dengan status "Menunggu pembayaran". Jika `KIRIM_EMAIL_PESANAN` di Apps Script bernilai `true`, Anda juga menerima email.
3. Ibu melihat nomor pesanan, nominal yang harus dibayar (harga + kode unik 3 digit), detail rekening/QRIS, dan tombol **Konfirmasi lewat WhatsApp** yang langsung membuka chat ke nomor admin berisi detail pesanan.
4. Anda mencocokkan mutasi rekening dengan nominal persis tersebut, mengubah kolom **Status** menjadi "Lunas", lalu mengaktifkan Premium untuk pelanggan.

### Yang perlu diatur
- **Apps Script:** tempel ulang `apps-script/Code.gs` versi baru, lalu **Terapkan → Kelola deployment → ikon pensil → Versi: Versi baru → Terapkan**. URL tidak berubah. Saat diminta izin baru (untuk mengirim email), izinkan.
- **Vercel → Environment Variables:** `ADMIN_WHATSAPP`, `PAYMENT_BANK`, dan bila perlu `PAYMENT_EWALLET` serta `PAYMENT_QRIS_IMAGE`. Lihat contoh di `.env.example`. Setelah itu **Redeploy**.
- **QRIS (opsional):** simpan gambar QRIS Anda sebagai `public/qris.png`, unggah ke GitHub, lalu isi `PAYMENT_QRIS_IMAGE` = `/qris.png`.

### Mengubah harga dan manfaat
Harga dan manfaat paket ada di `api/_lib/products.js`. Bagian **Harga** di landing page (`public/index.html`, cari `id="harga"`) menulis ulang harga dan manfaat yang sama, jadi ubah keduanya bersamaan. Pastikan manfaat yang dijanjikan memang Anda berikan kepada pelanggan.

## Kode Premium (aktivasi)

Fitur Premium di aplikasi: rencana **14 dan 30 hari** dengan belanja per minggu, **diet khusus** (rendah garam, ramah diabetes, MPASI, vegetarian), dan kuota AI lebih longgar. Fitur ini terbuka dengan kode berbentuk `DH-XXXX-XXXX`.

### Alur untuk Anda
1. Pesanan masuk ke tab **Pesanan**. Cocokkan transfer dengan kolom **Total transfer**.
2. Ubah **Status** pesanan itu menjadi **Lunas** (ada pilihan dropdown). Kode dibuat otomatis:
   - kolom **Kode Premium** terisi,
   - tab **Kode** mendapat baris baru (berlaku sampai = hari ini + jumlah bulan paket),
   - kolom **Kirim ke WA** berisi tautan **Kirim kode**. Klik, lalu tekan kirim di WhatsApp. Pesannya sudah berisi kode, masa berlaku, dan cara memakainya.
3. Cara lain: pilih baris pesanan, lalu menu **Dapur Hemat → Buat kode untuk baris terpilih**. Untuk hadiah atau uji coba tanpa pesanan: **Dapur Hemat → Buat kode tanpa pesanan…**

### Alur untuk pelanggan
Buka aplikasi (`/app`), tekan **Punya kode Premium?**, masukkan kode, lalu tekan **Aktifkan**. Kode tersimpan di HP itu sampai masa berlakunya habis.

### Menonaktifkan kode
Ubah kolom **Status** di tab **Kode** menjadi **Nonaktif**. Kode berhenti bekerja paling lama dalam 3 hari, karena aplikasi mengecek ulang kode setiap 3 hari. Kolom **Dipakai** dan **Terakhir dipakai** membantu melihat kode yang dipakai terlalu sering, misalnya kalau dibagikan ke banyak orang.

### Yang perlu diatur
- Tempel ulang `apps-script/Code.gs` versi terbaru (isi lagi `RAHASIA`), cek `ALAMAT_APLIKASI` di bagian atas, lalu **Terapkan → Kelola deployment → pensil → Versi baru → Terapkan**.
- **Muat ulang spreadsheet** supaya menu **Dapur Hemat** muncul.
- Di Vercel tidak ada variabel wajib baru. `FEEDBACK_WEBHOOK_URL` dan `FEEDBACK_SECRET` yang sudah ada juga dipakai untuk kode Premium.

## Urutan AI dan cadangan
1. Claude (jika `ANTHROPIC_API_KEY` diisi). Jika Claude menolak karena saldo habis atau kunci salah, Claude **dilewati selama 30 menit** supaya pengguna tidak menunggu.
2. Gemini model utama (`GEMINI_MODEL`).
3. Gemini model cadangan yang lebih ringan (`GEMINI_FALLBACK_MODEL`).
4. Jika semua gagal: aplikasi memakai mode cepat.

Isi `AI_PROVIDER=gemini` supaya Gemini dicoba lebih dulu. Pesan error setiap penyedia tercatat lengkap di Vercel → Logs.
