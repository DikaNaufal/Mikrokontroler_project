# 🎯 ESP32 Radar System

Sistem pemantauan radar berbasis ESP32 dengan tampilan web real-time. Mendeteksi objek menggunakan sensor ultrasonik HC-SR04 yang dipasang pada servo SG90, lalu menampilkan hasilnya secara visual pada antarmuka radar di browser.

pembuat web : Dika Naufal Al-Fiansyah 
NIM         : 23552011021

---

## 📸 Fitur Utama

- **Tampilan radar real-time** — canvas animasi dengan sweep berputar 0–180°
- **Deteksi & klasifikasi objek** — tiga level status: Aman, Waspada, Bahaya
- **Dashboard statistik** — jumlah objek, jarak terdekat, sudut servo, status koneksi
- **Log deteksi** — riwayat 80 entri terakhir dengan timestamp
- **Riwayat lengkap** — 500 entri tersimpan dalam sesi, dapat diekspor ke CSV
- **Mode Demo** — simulasi data tanpa perangkat keras ESP32
- **Peringatan suara** — beep otomatis saat objek masuk zona bahaya
- **Screenshot radar** — ekspor tampilan canvas sebagai file PNG
- **Layar penuh** — tombol fullscreen untuk monitoring optimal
- **Konfigurasi fleksibel** — IP, port, interval polling, dan threshold jarak dapat diubah
- **Pengaturan tersimpan** — semua konfigurasi disimpan di `localStorage`
- **Responsif** — mendukung layar desktop dan mobile

---

## 🗂️ Struktur Proyek

```
esp32-radar/
├── index.php              # Halaman utama aplikasi
├── api/
│   └── proxy.php          # Proxy server-side ke ESP32 (menghindari CORS)
├── assets/
│   ├── css/
│   │   └── style.css      # Stylesheet utama (dark theme)
│   ├── js/
│   │   ├── radar.js       # RadarRenderer — engine canvas
│   │   └── app.js         # Logika utama aplikasi
│   └── beep.mp3           # Audio notifikasi (opsional)
└── README.md
```

---

## 🚀 Instalasi & Menjalankan

### 1. Clone / Download Proyek

```bash
git clone https://github.com/username/esp32-radar.git
cd esp32-radar
```

### 2. Jalankan Web Server

**Menggunakan PHP built-in server (pengembangan):**
```bash
php -S localhost:8080
```

**Menggunakan Apache:** Salin folder ke direktori `htdocs` atau `www`, lalu akses via `http://localhost/esp32-radar/`.

### 3. Akses Aplikasi

Buka browser dan kunjungi:
```
http://localhost:8080
```

### 4. Konfigurasi Koneksi ESP32

Di halaman **Pengaturan → Koneksi ESP32**:
- Masukkan **Alamat IP** ESP32 (contoh: `192.168.1.100`)
- Sesuaikan **Port** (default: `80`)
- Atur **Interval Polling** sesuai kebutuhan (default: `200 ms`)
- Klik **Simpan & Hubungkan**

> **Tidak punya ESP32?** Aktifkan **Mode Demo** di halaman Pengaturan untuk mencoba tampilan dengan data simulasi.

---

## 📡 API Endpoint ESP32

Firmware ESP32 harus mengekspos endpoint HTTP berikut:

| Endpoint | Metode | Deskripsi |
|---|---|---|
| `GET /data` | GET | Mengambil data radar (angle + distance) |
| `GET /status` | GET | Status perangkat |
| `GET /scan` | GET | Memulai proses scanning |
| `GET /stop` | GET | Menghentikan scanning |

### Format Respons `/data`

```json
{
  "angle": 90,
  "distance": 45.3
}
```

| Field | Tipe | Keterangan |
|---|---|---|
| `angle` | number | Sudut servo saat ini (0–180 derajat) |
| `distance` | number | Jarak objek terdeteksi dalam cm (0 = tidak ada objek) |

---

## 🔄 Cara Kerja

```
ESP32 (WiFi)
    │  HTTP GET /data
    ▼
proxy.php  ◄── Browser fetch (menghindari CORS)
    │  Forward respons JSON
    ▼
app.js → handleData(angle, distance)
    ├── radar.js → render canvas (blip + sweep)
    ├── Update stat cards (objek, jarak, sudut, status)
    ├── Log entry
    ├── Rekam riwayat
    └── Trigger beep (jika zona bahaya)
```

Browser tidak bisa fetch langsung ke ESP32 karena batasan CORS. `proxy.php` berjalan di sisi server dan meneruskan request, sekaligus membatasi akses hanya ke IP jaringan lokal (192.168.x.x, 10.x.x.x, 172.16–31.x.x).

---

## 🎨 Klasifikasi Jarak

| Warna | Status | Kondisi (Default) |
|---|---|---|
| 🟢 Hijau | AMAN | Jarak > 50 cm |
| 🟡 Kuning | WASPADA | 20 cm < Jarak ≤ 50 cm |
| 🔴 Merah | BAHAYA | Jarak ≤ 20 cm |

Semua nilai threshold dapat diubah di halaman **Pengaturan → Batas Deteksi**.

---

## 🖥️ Halaman Aplikasi

| Halaman | Deskripsi |
|---|---|
| **Dashboard** | Tampilan radar utama, stat cards, log, tabel data terakhir |
| **Riwayat** | Semua rekaman deteksi sesi ini, dapat diekspor ke CSV |
| **Pengaturan** | Konfigurasi koneksi, threshold deteksi, dan notifikasi |
| **Tentang** | Informasi hardware, pin connection, dan format API |

---

## ⚙️ Konfigurasi Lanjutan

### Mengubah Default State (`app.js`)

```js
const State = {
  espIP:        '-',              // IP default ESP32
  espPort:      80,               // Port HTTP
  pollInterval: 200,              // Interval fetch data (ms)
  dangerDist:   20,               // Batas bahaya (cm)
  warnDist:     50,               // Batas waspada (cm)
  maxRange:     200,              // Jangkauan maks radar (cm)
};
```

### Demo Objects (`app.js`)

Objek simulasi di Mode Demo dapat diubah:

```js
const demoObjects = [
  { at: 40,  dist: 80  },   // angle 40°, jarak 80 cm
  { at: 75,  dist: 35  },   // angle 75°, jarak 35 cm (waspada)
  { at: 120, dist: 15  },   // angle 120°, jarak 15 cm (bahaya)
  { at: 155, dist: 120 },   // angle 155°, jarak 120 cm
];
```

---

## 🔒 Keamanan

`proxy.php` hanya mengizinkan request ke IP jaringan **lokal/private**:
- `192.168.x.x`
- `10.x.x.x`
- `172.16.x.x` – `172.31.x.x`
- `localhost` / `127.0.0.1`

Request ke IP publik akan ditolak dengan HTTP `403 Forbidden`.

---

## 📦 Teknologi yang Digunakan

- **Frontend:** HTML5, CSS3, Vanilla JavaScript, Canvas API
- **Backend:** PHP (proxy sederhana, tidak ada database)
- **Icons:** Font Awesome 6.5
- **Hardware:** ESP32, HC-SR04, Servo SG90

---

## 🐛 Troubleshooting

**Radar tidak menampilkan data:**
1. Pastikan IP dan port ESP32 sudah benar di Pengaturan
2. Pastikan ESP32 dan server berada dalam satu jaringan WiFi
3. Coba akses `http://<IP-ESP32>/data` langsung dari browser untuk cek koneksi
4. Aktifkan Mode Demo untuk memastikan tampilan radar berfungsi

**CORS Error di konsol browser:**
- Pastikan fetch dilakukan melalui `proxy.php`, bukan langsung ke ESP32
- Periksa apakah ekstensi `curl` aktif di PHP: `php -m | grep curl`

**Suara peringatan tidak terdengar:**
- Browser memerlukan interaksi pengguna sebelum memutar audio
- Klik tombol manapun di halaman, lalu tunggu deteksi bahaya

**`proxy.php` mengembalikan error 403:**
- Pastikan IP ESP32 termasuk rentang IP lokal yang diizinkan

---

## 📄 Lisensi
video demo : https://drive.google.com/drive/folders/1G9hSaI-M3DC-5Mimpup9WM799n4JKRmN?usp=sharing

MIT License — bebas digunakan, dimodifikasi, dan didistribusikan.
