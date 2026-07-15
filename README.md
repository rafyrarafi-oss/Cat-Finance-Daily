# Finance Daily QRIS

Aplikasi web pencatatan keuangan harian (income & expense) untuk **Owner**: multi-currency (IDR / KHR / USD), tampilan modern, **PWA** (bisa dipasang & jalan offline), dengan **Supabase** sebagai database.

> Frontend bisa di-host gratis via **GitHub Pages**. Data disimpan di **Supabase (PostgreSQL)** dan diakses langsung dari browser via REST API bawaan Supabase (PostgREST). Tanpa server sendiri.

---

## Daftar Isi
1. [Fitur](#fitur)
2. [Teknologi](#teknologi)
3. [Struktur Project](#struktur-project)
4. [Setup Supabase](#setup-supabase)
5. [Menghubungkan Frontend](#menghubungkan-frontend)
6. [Mode Demo (tanpa backend)](#mode-demo-tanpa-backend)
7. [Deploy ke GitHub Pages](#deploy-ke-github-pages)
8. [Akun Demo](#akun-demo)
9. [Catatan Keamanan](#catatan-keamanan)

---

## Fitur
- **Login** dengan validasi & loading animation.
- **Dashboard**: total saldo, income/expense hari ini & bulan ini, grafik Income vs Expense (Chart.js), aktivitas terbaru. Cache-first (tampil instan dari cache, lalu refresh).
- **Transaksi**: form lengkap (tanggal, jam otomatis, jenis, kategori, subkategori, deskripsi, metode, nominal, mata uang, status, no. referensi, catatan).
  - **Tambah & Edit** dalam satu halaman (`transaction.html` untuk baru, `transaction.html?id=…` untuk ubah).
  - **Lampiran foto struk**: unggah gambar; otomatis dikompres (maks sisi 1100px, JPEG) dan disimpan bersama transaksi.
- **Riwayat**: list modern + filter (rentang tanggal, jenis, status) + **search realtime** + **paginasi** ("Muat lebih banyak", 20/halaman) + aksi (Detail/Edit/Duplikat/Hapus/Cetak) + **export CSV**.
  - **Detail transaksi** dalam modal, termasuk pratinjau foto struk.
- **Analitik** (di halaman Riwayat): **pengeluaran per kategori** (bar, mengikuti rentang aktif) + **perbandingan bulan ini vs bulan lalu** (income & expense, dengan % perubahan).
- **Multi-currency** IDR / KHR / USD dengan simbol & konversi. Semua total dikonversi ke mata uang dasar (dari Settings) agar tidak tercampur.
- **Offline-first**:
  - App shell di-cache Service Worker → bisa dibuka tanpa internet.
  - Baca data dilayani dari cache saat offline.
  - Tulis (tambah/edit/hapus/kurs/settings) **dioptimasi** (langsung tampil) lalu **diantrikan** dan **disinkronkan otomatis** begitu kembali online. Indikator status sinkron tampil di atas layar.
- **Settings**: profil usaha, mata uang default, kurs, kelola kategori (**via modal**, bukan `prompt`), backup/restore JSON.
- **Notifikasi toast** + validasi input + guard anti double-submit.
- **Responsive** (desktop, tablet, Android, iPhone).

---

## Teknologi
- HTML5, CSS3, Vanilla JavaScript (ES6) — modular
- [Chart.js](https://www.chartjs.org/) untuk grafik
- [Material Symbols](https://fonts.google.com/icons) untuk ikon
- [Supabase](https://supabase.com/) (PostgreSQL + PostgREST) sebagai database & REST API
- PWA: Web App Manifest + Service Worker

---

## Struktur Project

```
Finance Daily QRIS/
├── index.html            # halaman login (entry point)
├── dashboard.html
├── transaction.html      # tambah & edit (pakai ?id= untuk edit)
├── report.html           # riwayat + analitik + detail modal
├── settings.html
├── manifest.json
├── sw.js                 # service worker (offline app shell)
├── css/
│   ├── style.css         # shared (termasuk modal & indikator sinkron)
│   ├── dashboard.css
│   ├── transaction.css   # + gaya lampiran foto
│   └── report.css        # + analitik + gaya cetak
├── js/
│   ├── api.js            # klien Supabase (PostgREST) via fetch
│   ├── store.js          # lapisan data: offline-first, cache, antrian sinkron
│   ├── auth.js           # login/logout, session
│   ├── currency.js       # format & konversi mata uang
│   ├── utils.js          # helper umum + indikator sinkron
│   ├── app.js            # bootstrap kecil (tema)
│   ├── dashboard.js
│   ├── transaction.js
│   ├── report.js
│   └── settings.js
├── assets/icon/          # ikon PWA
└── backend/
    └── supabase.sql      # skema + data awal (jalankan di Supabase SQL Editor)
```

---

## Setup Supabase
1. Buat project di [Supabase](https://supabase.com/).
2. Buka **SQL Editor → New query**, tempel seluruh isi `backend/supabase.sql`, lalu **Run**. Ini membuat tabel `users`, `transactions`, `categories`, `settings`, `exchange_rate` + data awal.
3. Buka **Project Settings → API**, salin **Project URL** dan **anon public key**.

## Menghubungkan Frontend
Buka `js/api.js`, isi:
```js
const SUPABASE_URL = 'https://xxxx.supabase.co';
const SUPABASE_KEY = 'anon-public-key-anda';
```
Selesai — frontend langsung memanggil Supabase via `fetch`.

## Mode Demo (tanpa backend)
Bila `SUPABASE_URL` masih mengandung `XXXX` (belum dikonfigurasi), aplikasi otomatis jalan dalam **mode demo** memakai `localStorage` + data contoh. Cocok untuk mencoba tampilan tanpa setup apa pun.

---

## Deploy ke GitHub Pages
1. Buat repo baru, upload seluruh file.
2. **Settings → Pages → Source:** `Deploy from a branch`, pilih `main` + folder `/ (root)`.
3. Tunggu beberapa menit; situs aktif di `https://<username>.github.io/<repo>/`.

> Supabase mendukung CORS untuk anon key, jadi frontend di GitHub Pages bisa memanggilnya langsung.

---

## Akun Demo
```
username : owner
password : 123456
```
Ganti/tambah user di tabel `users`.

---

## Catatan Keamanan
> **Belum diamankan — sengaja, untuk pemakaian pribadi.** Password tersimpan **plaintext** dan anon key mengizinkan baca/tulis penuh (RLS `allow all`).
> Untuk pemakaian bersama / produksi: pindah ke **Supabase Auth** (password ter-hash), ketatkan **Row Level Security**, dan jangan menaruh data sangat sensitif.

---

Dibuat untuk pencatatan arus kas harian yang rapi. 💙
