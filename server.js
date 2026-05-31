const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Port default 3000 atau dari port environment Railway
const PORT = process.env.PORT || 3000;

// Path volume data Railway atau default ./data
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

// Pastikan direktori penyimpanan ada
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper untuk mendapatkan waktu dan tanggal dalam zona waktu Asia/Jakarta (WIB, GMT+7)
const dapatkanWIB = () => {
  const d = new Date();
  // Tambahkan offset 7 jam (WIB) ke waktu UTC
  const wibTime = new Date(d.getTime() + (7 * 60 * 60 * 1000));
  return {
    date: wibTime.toISOString().slice(0, 10), // YYYY-MM-DD
    time: wibTime.toISOString().slice(11, 19)  // HH:MM:SS
  };
};

const HARI_INI = () => dapatkanWIB().date;

// State default jika file data kosong atau hari berganti
function defaultState() {
  return {
    date        : HARI_INI(),
    counter     : 0,
    loketCount  : 6,
    loketNames  : ['Loket 1', 'Loket 2', 'Loket 3', 'Loket 4', 'Loket 5', 'Loket 6'],
    loketStatus : { 1: 'SIAP', 2: 'SIAP', 3: 'SIAP', 4: 'SIAP', 5: 'SIAP', 6: 'SIAP' },
    activeQueue : { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
    queues      : []
  };
}

let globalState = defaultState();

// Memuat state dari disk pada saat startup
function loadStateOnStartup() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf8');
      const st = JSON.parse(raw);
      // Auto-reset jika tanggal berbeda
      if (st.date !== HARI_INI()) {
        console.log('[Antrian Server] Tanggal baru terdeteksi di startup — reset otomatis.');
        globalState = defaultState();
        saveStateToDisk();
      } else {
        globalState = st;
        console.log('[Antrian Server] State berhasil dimuat dari disk.');
      }
    } else {
      globalState = defaultState();
      saveStateToDisk();
    }
  } catch (e) {
    console.error('[Antrian Server] Gagal membaca state dari disk, menggunakan default:', e);
    globalState = defaultState();
  }
}

// Menyimpan state ke disk secara aman
function saveStateToDisk() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(globalState, null, 2), 'utf8');
  } catch (e) {
    console.error('[Antrian Server] Gagal menulis state ke disk:', e);
  }
}

// Cek dan reset otomatis jika hari berganti sebelum setiap aksi
function checkAndResetNewDay() {
  if (globalState.date !== HARI_INI()) {
    console.log('[Antrian Server] Tanggal baru terdeteksi — mereset antrean harian.');
    const oldConfig = {
      loketCount: globalState.loketCount,
      loketNames: [...globalState.loketNames],
      loketStatus: { ...globalState.loketStatus }
    };
    
    // Kembalikan ke default tapi pertahankan konfigurasi nama loket
    globalState = defaultState();
    globalState.loketCount = oldConfig.loketCount;
    globalState.loketNames = oldConfig.loketNames;
    
    // Kembalikan semua status loket aktif ke 'SIAP' (bukan TUTUP/ISTIRAHAT kecuali memang sebelumnya demikian)
    for (let n = 1; n <= 6; n++) {
      globalState.loketStatus[n] = oldConfig.loketStatus[n] || 'SIAP';
    }
    
    saveStateToDisk();
    io.emit('state-updated', globalState);
  }
}

// Menyajikan file statis dari direktori public
app.use(express.static(path.join(__dirname, 'public')));

// Algoritma Load Balancing Loket
function assignLoket() {
  // Filter loket yang aktif (tidak istirahat)
  const activeLokets = [];
  for (let n = 1; n <= globalState.loketCount; n++) {
    const status = globalState.loketStatus[n] || 'SIAP';
    if (status !== 'ISTIRAHAT') {
      activeLokets.push(n);
    }
  }

  if (activeLokets.length === 0) {
    return null; // Semua loket sedang istirahat
  }

  // Hitung beban per loket (status MENUNGGU atau DIPANGGIL)
  const loads = {};
  activeLokets.forEach(n => {
    loads[n] = 0;
  });

  globalState.queues.forEach(q => {
    if (
      (q.status === 'MENUNGGU' || q.status === 'DIPANGGIL') &&
      loads[q.loket] !== undefined
    ) {
      loads[q.loket]++;
    }
  });

  // Cari beban terkecil
  let minLoad = Infinity;
  activeLokets.forEach(n => {
    if (loads[n] < minLoad) {
      minLoad = loads[n];
    }
  });

  // Kumpulkan loket dengan beban terkecil
  const minLoadLokets = activeLokets.filter(n => loads[n] === minLoad);

  // Pilih loket dengan nomor terkecil dari yang beban kerjanya seimbang
  const loketNum = minLoadLokets[0];

  return {
    loketNum,
    minLoad,
    minLoadLokets
  };
}

// Koneksi WebSocket
io.on('connection', (socket) => {
  console.log('[Antrian Server] Client terhubung:', socket.id);
  
  // Kirim state saat ini ke client yang baru terhubung
  socket.emit('state-updated', globalState);

  // Aksi: Ambil nomor antrian baru
  socket.on('ambil-antrian', (data) => {
    checkAndResetNewDay();
    const { name, regNumber } = data;
    
    if (!name) return;

    const assignment = assignLoket();
    if (!assignment) {
      socket.emit('ambil-antrian-error', { message: 'Semua loket sedang istirahat. Silakan tunggu.' });
      return;
    }

    const { loketNum, minLoad, minLoadLokets } = assignment;
    const loketNama = globalState.loketNames[loketNum - 1] || ('Loket ' + loketNum);

    // Hitung penjelasan load balancing
    let penjelasTeks = '';
    if (minLoadLokets.length > 1) {
      if (minLoad === 0) {
        penjelasTeks = `Sistem load balancing mendeteksi ada beberapa loket kosong (${minLoadLokets.map(n => globalState.loketNames[n - 1] || 'Loket ' + n).join(', ')}). Anda diarahkan ke loket kosong bernomor terkecil, yaitu <strong>${loketNama}</strong>.`;
      } else {
        penjelasTeks = `Sistem load balancing mendeteksi beban loket aktif saat ini seimbang (masing-masing memiliki ${minLoad} antrean). Anda diarahkan ke loket aktif bernomor terkecil, yaitu <strong>${loketNama}</strong>.`;
      }
    } else {
      penjelasTeks = `Sistem load balancing mendeteksi <strong>${loketNama}</strong> memiliki jumlah beban antrean paling sedikit saat ini (${minLoad} antrean). Anda otomatis dialokasikan ke loket tersebut.`;
    }

    // Generate ID nomor antrian
    globalState.counter++;
    const nomorStr = String(globalState.counter).padStart(3, '0');
    const nomorId = `A-${nomorStr}`;

    // Waktu masuk (WIB)
    const timeIn = dapatkanWIB().time;

    // Buat objek antrian
    const queueObj = {
      id: nomorId,
      name: name,
      regNumber: regNumber || '-',
      loket: loketNum,
      status: 'MENUNGGU',
      timeIn: timeIn,
      timeCalled: null,
      timeDone: null
    };

    // Tambah ke queue list
    globalState.queues.push(queueObj);
    
    // Hitung estimasi orang di depan
    const estimasi = globalState.queues.filter(q => 
      q.loket === loketNum && q.status === 'MENUNGGU' && q.id !== nomorId
    ).length;

    saveStateToDisk();

    // Kirim response khusus ke client yang mencetak tiket
    socket.emit('ambil-antrian-success', { queueObj, estimasi, penjelasTeks });
    
    // Broadcast state terbaru ke seluruh perangkat
    io.emit('state-updated', globalState);
  });

  // Aksi: Petugas memanggil antrian berikutnya
  socket.on('panggil-antrian', (data) => {
    checkAndResetNewDay();
    const { loketNum } = data;
    const n = parseInt(loketNum);

    // Cari antrian MENUNGGU terdepan di loket ini
    const berikut = globalState.queues.find(q => q.loket === n && q.status === 'MENUNGGU');
    if (!berikut) {
      socket.emit('panggil-antrian-error', { message: 'Tidak ada antrian yang menunggu di loket ini.' });
      return;
    }

    // Update status antrian
    berikut.status = 'DIPANGGIL';
    berikut.timeCalled = dapatkanWIB().time;
    globalState.activeQueue[n] = berikut.id;

    saveStateToDisk();

    // Broadcast state ter-update ke semua client
    io.emit('state-updated', globalState);
    
    // Broadcast instruksi bunyi panggilan ke semua client (terutama Display Publik)
    io.emit('putar-suara-panggilan', berikut);
  });

  // Aksi: Petugas memanggil ulang antrian aktif (recall)
  socket.on('panggil-ulang-antrian', (data) => {
    checkAndResetNewDay();
    const { loketNum } = data;
    const n = parseInt(loketNum);

    const aktif = globalState.queues.find(q => q.loket === n && q.status === 'DIPANGGIL');
    if (aktif) {
      // Broadcast instruksi bunyi panggilan kembali
      io.emit('putar-suara-panggilan', aktif);
    }
  });

  // Aksi: Petugas menandai antrian selesai dilayani
  socket.on('selesai-antrian', (data) => {
    checkAndResetNewDay();
    const { loketNum } = data;
    const n = parseInt(loketNum);

    const aktif = globalState.queues.find(q => q.loket === n && q.status === 'DIPANGGIL');
    if (!aktif) return;

    aktif.status = 'SELESAI';
    aktif.timeDone = dapatkanWIB().time;
    globalState.activeQueue[n] = null;

    saveStateToDisk();
    io.emit('state-updated', globalState);
  });

  // Aksi: Petugas melewati / skip antrian aktif
  socket.on('lewati-antrian', (data) => {
    checkAndResetNewDay();
    const { loketNum } = data;
    const n = parseInt(loketNum);

    const aktif = globalState.queues.find(q => q.loket === n && q.status === 'DIPANGGIL');
    if (!aktif) return;

    aktif.status = 'SKIP';
    aktif.timeDone = dapatkanWIB().time;
    globalState.activeQueue[n] = null;

    saveStateToDisk();
    io.emit('state-updated', globalState);
  });

  // Aksi: Petugas mengubah status loket (Aktif / Istirahat)
  socket.on('ubah-status-loket', (data) => {
    checkAndResetNewDay();
    const { loketNum, status } = data;
    const n = parseInt(loketNum);

    globalState.loketStatus[n] = status;
    
    saveStateToDisk();
    io.emit('state-updated', globalState);
  });

  // Aksi: Admin menyimpan konfigurasi nama dan jumlah loket
  socket.on('simpan-konfig-admin', (data) => {
    checkAndResetNewDay();
    const { loketCount, loketNames } = data;
    const count = parseInt(loketCount);

    if (count < 1 || count > 6) return;

    globalState.loketCount = count;
    for (let n = 1; n <= 6; n++) {
      if (loketNames[n - 1]) {
        globalState.loketNames[n - 1] = loketNames[n - 1].trim();
      }
    }

    saveStateToDisk();
    io.emit('state-updated', globalState);
  });

  // Aksi: Admin mereset seluruh antrian hari ini
  socket.on('reset-antrian', () => {
    const oldConfig = {
      loketCount: globalState.loketCount,
      loketNames: [...globalState.loketNames],
      loketStatus: { ...globalState.loketStatus }
    };

    globalState = defaultState();
    globalState.loketCount = oldConfig.loketCount;
    globalState.loketNames = oldConfig.loketNames;
    for (let n = 1; n <= 6; n++) {
      globalState.loketStatus[n] = oldConfig.loketStatus[n] || 'SIAP';
    }

    saveStateToDisk();
    io.emit('state-updated', globalState);
  });

  socket.on('disconnect', () => {
    console.log('[Antrian Server] Client terputus:', socket.id);
  });
});

// Jalankan startup loading
loadStateOnStartup();

// Jalankan server
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Server Antrian SPMB berjalan di port: ${PORT}`);
  console.log(`📂 Penyimpanan Data: ${STATE_FILE}`);
  console.log(`====================================================`);
});
