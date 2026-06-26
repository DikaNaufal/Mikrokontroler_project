<?php
session_start();
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ESP32 Radar System</title>
  <link rel="stylesheet" href="assets/css/style.css" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
</head>
<body>
  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sidebar-logo">
      <i class="fa-solid fa-radar"></i>
      <span>ESP32 Radar</span>
    </div>

    <nav class="sidebar-nav">
      <a href="#" class="nav-item active" data-page="dashboard">
        <i class="fa-solid fa-gauge-high"></i>
        <span>Dashboard</span>
      </a>
      <a href="#" class="nav-item" data-page="history">
        <i class="fa-solid fa-clock-rotate-left"></i>
        <span>Riwayat</span>
      </a>
      <a href="#" class="nav-item" data-page="settings">
        <i class="fa-solid fa-gear"></i>
        <span>Pengaturan</span>
      </a>
      <a href="#" class="nav-item" data-page="about">
        <i class="fa-solid fa-circle-info"></i>
        <span>Tentang</span>
      </a>
    </nav>

    <div class="sidebar-status">
      <div class="conn-indicator" id="connIndicator">
        <span class="dot" id="connDot"></span>
        <span id="connLabel">Menghubungkan…</span>
      </div>
    </div>
  </aside>

  <!-- Main -->
  <main class="main-content">

    <!-- PAGE: DASHBOARD -->
    <section class="page active" id="page-dashboard">
      <header class="page-header">
        <div>
          <h1>Radar Monitor</h1>
          <p class="sub">Deteksi objek real-time via ESP32</p>
        </div>
        <div class="header-actions">
          <span class="badge" id="alertBadge" style="display:none">
            <i class="fa-solid fa-triangle-exclamation"></i> Objek Terdeteksi
          </span>
          <button class="btn-icon" id="screenshotBtn" title="Simpan Screenshot">
            <i class="fa-solid fa-camera"></i>
          </button>
          <button class="btn-icon" id="fullscreenBtn" title="Layar Penuh">
            <i class="fa-solid fa-expand"></i>
          </button>
        </div>
      </header>

      <!-- Stat Cards -->
      <div class="stat-grid">
        <div class="stat-card">
          <i class="fa-solid fa-crosshairs card-icon"></i>
          <div>
            <p class="stat-label">Objek Terdeteksi</p>
            <p class="stat-value" id="statObjects">0</p>
          </div>
        </div>
        <div class="stat-card">
          <i class="fa-solid fa-ruler card-icon"></i>
          <div>
            <p class="stat-label">Jarak Terdekat</p>
            <p class="stat-value" id="statDistance">-- cm</p>
          </div>
        </div>
        <div class="stat-card">
          <i class="fa-solid fa-rotate card-icon"></i>
          <div>
            <p class="stat-label">Sudut Servo</p>
            <p class="stat-value" id="statAngle">0°</p>
          </div>
        </div>
        <div class="stat-card">
          <i class="fa-solid fa-wifi card-icon"></i>
          <div>
            <p class="stat-label">Status Koneksi</p>
            <p class="stat-value" id="statStatus">--</p>
          </div>
        </div>
      </div>

      <!-- Radar + Log -->
      <div class="radar-layout">
        <div class="radar-panel">
          <div class="panel-header">
            <span>Tampilan Radar</span>
            <div class="radar-controls">
              <button class="ctrl-btn active" id="btnScan">
                <i class="fa-solid fa-play"></i> Scan
              </button>
              <button class="ctrl-btn" id="btnPause">
                <i class="fa-solid fa-pause"></i> Pause
              </button>
              <button class="ctrl-btn" id="btnClear">
                <i class="fa-solid fa-broom"></i> Bersihkan
              </button>
            </div>
          </div>
          <div class="radar-wrap">
            <canvas id="radarCanvas" width="500" height="500"></canvas>
          </div>
          <div class="radar-legend">
            <span><span class="dot-legend green"></span>Aman (&gt;50 cm)</span>
            <span><span class="dot-legend yellow"></span>Dekat (20-50 cm)</span>
            <span><span class="dot-legend red"></span>Bahaya (&lt;20 cm)</span>
          </div>
        </div>

        <div class="log-panel">
          <div class="panel-header">
            <span>Log Deteksi</span>
            <button class="ctrl-btn small" id="clearLogBtn">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
          <div class="log-container" id="logContainer">
            <div class="log-empty">Menunggu data dari ESP32…</div>
          </div>

          <div class="panel-header" style="margin-top:1rem">
            <span>Data Terakhir</span>
          </div>
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Sudut</th>
                  <th>Jarak</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody id="dataTableBody">
                <tr><td colspan="4" style="text-align:center;color:var(--muted)">Belum ada data</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <!-- PAGE: HISTORY -->
    <section class="page" id="page-history">
      <header class="page-header">
        <div>
          <h1>Riwayat Deteksi</h1>
          <p class="sub">Semua rekaman sesi scan sebelumnya</p>
        </div>
        <button class="btn-primary" id="exportBtn">
          <i class="fa-solid fa-file-export"></i> Export CSV
        </button>
      </header>
      <div class="panel-card">
        <div class="data-table-wrap">
          <table class="data-table full">
            <thead>
              <tr>
                <th>#</th>
                <th>Waktu</th>
                <th>Sudut (°)</th>
                <th>Jarak (cm)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="historyTableBody">
              <tr><td colspan="5" style="text-align:center;color:var(--muted)">Belum ada riwayat</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- PAGE: SETTINGS -->
    <section class="page" id="page-settings">
      <header class="page-header">
        <div>
          <h1>Pengaturan</h1>
          <p class="sub">Konfigurasi koneksi dan tampilan</p>
        </div>
      </header>
      <div class="settings-grid">
        <div class="panel-card">
          <h2 class="panel-title"><i class="fa-solid fa-network-wired"></i> Koneksi ESP32</h2>
          <div class="form-group">
            <label>Alamat IP ESP32</label>
            <input type="text" id="espIP" placeholder="192.168.1.100" value="192.168.1.100" />
          </div>
          <div class="form-group">
            <label>Port</label>
            <input type="number" id="espPort" placeholder="80" value="80" />
          </div>
          <div class="form-group">
            <label>Interval Polling (ms)</label>
            <input type="number" id="pollInterval" placeholder="200" value="200" min="100" max="2000" />
          </div>
          <button class="btn-primary" id="saveConnBtn">
            <i class="fa-solid fa-floppy-disk"></i> Simpan & Hubungkan
          </button>
        </div>

        <div class="panel-card">
          <h2 class="panel-title"><i class="fa-solid fa-sliders"></i> Batas Deteksi</h2>
          <div class="form-group">
            <label>Jarak Bahaya (cm) — Merah</label>
            <input type="number" id="dangerDist" value="20" min="5" max="100" />
          </div>
          <div class="form-group">
            <label>Jarak Waspada (cm) — Kuning</label>
            <input type="number" id="warnDist" value="50" min="10" max="200" />
          </div>
          <div class="form-group">
            <label>Jangkauan Maks Radar (cm)</label>
            <input type="number" id="maxRange" value="200" min="50" max="500" />
          </div>
          <button class="btn-primary" id="saveThreshBtn">
            <i class="fa-solid fa-floppy-disk"></i> Simpan Threshold
          </button>
        </div>

        <div class="panel-card">
          <h2 class="panel-title"><i class="fa-solid fa-bell"></i> Notifikasi</h2>
          <div class="form-group toggle-row">
            <label>Suara Peringatan</label>
            <input type="checkbox" id="soundAlert" class="toggle" checked />
          </div>
          <div class="form-group toggle-row">
            <label>Notifikasi Browser</label>
            <input type="checkbox" id="browserNotif" class="toggle" />
          </div>
          <div class="form-group toggle-row">
            <label>Mode Demo (tanpa ESP32)</label>
            <input type="checkbox" id="demoMode" class="toggle" />
          </div>
        </div>
      </div>
    </section>

    <!-- PAGE: ABOUT -->
    <section class="page" id="page-about">
      <header class="page-header">
        <div>
          <h1>Tentang Sistem</h1>
          <p class="sub">Informasi proyek radar ESP32</p>
        </div>
      </header>
      <div class="about-grid">
        <div class="panel-card">
          <h2 class="panel-title">Spesifikasi Hardware</h2>
          <ul class="spec-list">
            <li><i class="fa-solid fa-microchip"></i> <strong>Mikrokontroler:</strong> ESP32 DevKit</li>
            <li><i class="fa-solid fa-wave-square"></i> <strong>Sensor:</strong> HC-SR04 Ultrasonik</li>
            <li><i class="fa-solid fa-rotate"></i> <strong>Aktuator:</strong> Servo SG90 (0-180°)</li>
            <li><i class="fa-brands fa-wifi"></i> <strong>Koneksi:</strong> WiFi 802.11 b/g/n</li>
            <li><i class="fa-solid fa-bolt"></i> <strong>Power:</strong> 5V USB / 3.7V LiPo</li>
          </ul>
        </div>
        <div class="panel-card">
          <h2 class="panel-title">Pin Connection ESP32</h2>
          <table class="data-table">
            <thead><tr><th>Komponen</th><th>Pin ESP32</th></tr></thead>
            <tbody>
              <tr><td>Servo (Signal)</td><td>GPIO 13</td></tr>
              <tr><td>HC-SR04 TRIG</td><td>GPIO 12</td></tr>
              <tr><td>HC-SR04 ECHO</td><td>GPIO 14</td></tr>
              <tr><td>HC-SR04 VCC</td><td>5V</td></tr>
              <tr><td>HC-SR04 GND</td><td>GND</td></tr>
            </tbody>
          </table>
        </div>
        <div class="panel-card">
          <h2 class="panel-title">API Endpoint ESP32</h2>
          <ul class="spec-list">
            <li><code>GET /data</code> — Ambil data radar JSON</li>
            <li><code>GET /status</code> — Status perangkat</li>
            <li><code>GET /scan</code> — Mulai scan</li>
            <li><code>GET /stop</code> — Hentikan scan</li>
          </ul>
          <p style="margin-top:1rem;font-size:13px;color:var(--muted)">
            Respons JSON: <code>{"angle": 90, "distance": 45.3}</code>
          </p>
        </div>
      </div>
    </section>

  </main>

  <!-- Sound effect (base64 beep) -->
  <audio id="beepAudio" preload="auto">
    <source src="assets/beep.mp3" type="audio/mpeg" />
  </audio>

  <script src="assets/js/radar.js"></script>
  <script src="assets/js/app.js"></script>
</body>
</html>