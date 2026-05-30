# Sistem Antrian SPMB - SMAN 2 Wates

Sistem Antrian Daftar Ulang SPMB (Seleksi Penerimaan Murid Baru) untuk **SMAN 2 Wates** adalah aplikasi berbasis web (*client-side*) yang dirancang khusus untuk memfasilitasi manajemen antrean secara efisien, responsif, dan tanpa memerlukan server backend terpisah.

Aplikasi ini menggunakan teknologi HTML5 modern untuk menghubungkan beberapa layar/tab secara *real-time* dan melakukan pembagian beban kerja secara otomatis.

---

## 👥 Informasi Pengembang & Lisensi
* **Pengembang:** Tirtandro Meda
* **Lisensi:** [MIT License](LICENSE)

---

## ✨ Fitur Utama

1. **Sinkronisasi Multi-Tab Tanpa Server (Real-Time)**
   Menggunakan HTML5 **`BroadcastChannel` API** untuk menghubungkan tab printer tiket, layar operator petugas, dan layar display ruang tunggu secara instan. Semua aksi di satu tab akan langsung memperbarui tab lainnya.

2. **Pembagian Beban Otomatis (Automatic Load Balancing)**
   Setiap kali calon pendaftar menekan tombol ambil antrean, algoritma penentu loket otomatis mendistribusikan nomor antrean ke loket aktif yang memiliki jumlah antrean paling sedikit (*least queue load balancing*). Jika beban seimbang, antrean akan diarahkan ke loket aktif terkecil.

3. **Tiga Modul Halaman Utama**
   * 🎟️ **Ambil Antrean**: Halaman khusus untuk pendaftar melakukan pencetakan tiket antrean yang dilengkapi statistik beban antrean tiap loket secara langsung.
   * 💻 **Dasbor Petugas (Loket)**: Halaman khusus untuk petugas memanggil (*Call*), memanggil ulang (*Recall*), menyelesaikan antrean (*Complete*), serta mengatur status loket (Aktif/Istirahat).
   * 📺 **Display Publik**: Halaman display utama ruang tunggu yang menampilkan nomor antrean yang sedang dilayani di masing-masing loket, jam digital, serta teks berjalan (*running text*).

4. **Panggilan Suara Otomatis (Text-to-Speech)**
   Dilengkapi suara panggilan otomatis berbahasa Indonesia menggunakan **Web Speech API** (`SpeechSynthesis`). Panggilan diucapkan 2 kali secara otomatis saat petugas memanggil nomor antrean.

5. **Penyimpanan Lokal & Reset Harian Otomatis**
   State aplikasi disimpan secara aman di browser menggunakan **`localStorage`**. Sistem akan secara otomatis mendeteksi perubahan tanggal dan melakukan pembersihan data antrean lama saat hari berganti.

6. **Desain Responsif & Premium**
   Tampilan modern berkelas premium menggunakan CSS variabel, animasi halus (*smooth transitions*), tata letak *glassmorphism*, dan *Dark Mode-friendly* yang nyaman dilihat oleh petugas maupun pengunjung.

---

## 🚀 Cara Menjalankan

Aplikasi ini bersifat *standalone* (hanya berupa satu file HTML mandiri):
1. Unduh atau salin seluruh isi repositori ini.
2. Klik ganda file `index.html` untuk membukanya di browser modern pilihan Anda (Google Chrome, Microsoft Edge, Mozilla Firefox, dll.).
3. Anda dapat membuka file ini di 3 tab/jendela terpisah untuk simulasi lingkungan nyata:
   * **Tab 1:** Halaman **Ambil Antrian** (diarahkan ke printer termal/layar kios).
   * **Tab 2:** Halaman **Display Publik** (ditampilkan ke TV/proyektor ruang tunggu).
   * **Tab 3:** Halaman **Loket Petugas** (dibuka di PC masing-masing operator loket).

---

## ⚙️ Panel Administrasi & Pengaturan

Tersedia panel konfigurasi terproteksi sandi di dalam aplikasi:
* **Tombol Akses:** Klik ikon gerigi (⚙️) di bagian navigasi global atau tombol **Panel Admin** pada halaman ambil antrean.
* **Kata Sandi default:** `admin2026`
* **Fitur Admin:**
  * Mengatur jumlah loket aktif (mendukung 1 sampai 6 loket).
  * Mengubah penamaan label loket (contoh: "Loket 1" diubah menjadi "Loket Verifikasi Berkas").
  * Melakukan *reset* paksa seluruh antrean hari berjalan.

---

## 🛠️ Stack Teknologi

* **Struktur:** HTML5 & Semantic HTML
* **Gaya & Layout:** CSS3 Vanilla (Responsive Grid & Flexbox, Custom Glassmorphism, CSS Variable Tokens)
* **Logika:** Vanilla Javascript (ES6+)
* **Penyimpanan:** HTML5 `localStorage`
* **Komunikasi:** HTML5 `BroadcastChannel`
* **Audio:** Web Speech API (`SpeechSynthesis`)
