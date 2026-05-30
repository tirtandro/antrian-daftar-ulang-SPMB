# Sistem Antrian SPMB - SMAN 2 Wates

Sistem Antrian Daftar Ulang SPMB (Seleksi Penerimaan Murid Baru) untuk **SMAN 2 Wates** adalah aplikasi berbasis web real-time yang dirancang khusus untuk memfasilitasi manajemen antrean secara efisien di berbagai perangkat secara serempak.

Aplikasi ini menggunakan **Node.js, Express, dan Socket.io (WebSockets)** untuk menyinkronkan data antrean secara instan melintasi berbagai komputer/device (PC operator, TV display, printer tiket).

---

## 👥 Informasi Pengembang & Lisensi
* **Pengembang:** Tirtandro Meda
* **Lisensi:** [MIT License](LICENSE)

---

## ✨ Fitur Utama

1. **Sinkronisasi Multi-Device Real-Time**
   Menggunakan protokol **WebSockets (Socket.io)** untuk menyalurkan data antrean dari server pusat ke semua client (operator, display, loket pendaftaran) secara instan. Perubahan status di satu perangkat akan langsung terlihat di perangkat lainnya.

2. **Pembagian Beban Otomatis (Automatic Load Balancing)**
   Setiap kali calon pendaftar menekan tombol ambil antrean, algoritma penentu loket di server otomatis mendistribusikan nomor antrean ke loket aktif yang memiliki jumlah antrean paling sedikit (*least queue load balancing*). Jika beban seimbang, antrean diarahkan ke loket aktif terkecil.

3. **Penyimpanan Terpusat & Persisten (Railway Volume)**
   Data antrean disimpan terpusat di server dalam file `state.json`. Mendukung konfigurasi direktori penyimpanan menggunakan variabel lingkungan `DATA_DIR`, membuatnya aman digunakan bersama **Volume** Railway agar data tidak hilang ketika server di-restart/re-deploy.

4. **Tiga Modul Layar Utama**
   * 🎟️ **Ambil Antrean**: Halaman khusus untuk pendaftar melakukan pencetakan tiket antrean yang dilengkapi statistik beban antrean tiap loket secara langsung.
   * 💻 **Dasbor Petugas (Loket)**: Halaman khusus untuk petugas memanggil (*Call*), memanggil ulang (*Recall*), menyelesaikan antrean (*Complete*), serta mengatur status loket (Aktif/Istirahat).
   * 📺 **Display Publik**: Halaman display utama ruang tunggu yang menampilkan nomor antrean yang sedang dilayani di masing-masing loket, jam digital, serta teks berjalan (*running text*).

5. **Panggilan Suara Otomatis (Text-to-Speech)**
   Dilengkapi suara panggilan otomatis berbahasa Indonesia menggunakan **Web Speech API** (`SpeechSynthesis`) yang dijalankan langsung oleh browser di halaman Display Publik secara sinkron saat petugas memanggil nomor antrean.

6. **Reset Harian Otomatis**
   Sistem di server secara otomatis mendeteksi perubahan tanggal dan melakukan pembersihan (*reset*) data antrean lama saat hari berganti.

---

## 🚀 Cara Menjalankan Secara Lokal

1. Pastikan Anda sudah menginstal **Node.js** di komputer Anda.
2. Buka terminal di direktori proyek ini dan jalankan instalasi dependensi:
   ```bash
   npm install
   ```
3. Jalankan server:
   ```bash
   npm start
   ```
4. Buka browser Anda:
   * Halaman Ambil Antrian: `http://localhost:3000/#ambil`
   * Halaman Display Publik: `http://localhost:3000/#display`
   * Halaman Operator Loket: `http://localhost:3000/#petugas`
5. Untuk menghubungkan komputer/smartphone lain, pastikan mereka berada dalam satu jaringan Wi-Fi lokal, lalu akses menggunakan alamat IP server (contoh: `http://192.168.1.5:3000`).

---

## ☁️ Cara Deploy ke Railway (Multi-Perangkat di Internet)

Aplikasi ini siap dideploy ke **Railway** untuk penggunaan melintasi jaringan internet.

### Langkah-langkah Deployment:
1. Buat project baru di dashboard Railway.
2. Hubungkan repositori GitHub Anda `antrian-daftar-ulang-SPMB`.
3. Tambahkan **Volume** di Railway untuk penyimpanan persisten:
   * Klik **"Add Service"** > **"Volume"**.
   * Mount Volume tersebut ke direktori `/data`.
4. Tambahkan variabel lingkungan (*Variables*) di service Railway Anda:
   * `DATA_DIR` = `/data`
5. Deploy aplikasi. Railway akan mendeteksi Node.js secara otomatis dan menjalankan `npm start`.
6. Kini, Anda dapat mengakses URL Railway Anda di berbagai perangkat (operator loket di komputer masing-masing, TV ruang tunggu, dll.) dan semuanya akan tersinkronisasi secara real-time!

---

## ⚙️ Panel Administrasi & Pengaturan

* **Sandi default Admin:** `admin2026`
* **Fitur Admin:**
  * Mengatur jumlah loket aktif (1 sampai 6 loket).
  * Mengubah penamaan label loket (contoh: "Loket 1" diubah menjadi "Loket Verifikasi").
  * Melakukan *reset* paksa seluruh antrean hari berjalan.
