/**
 * app.js — Main application logic
 * Connects to ESP32 via polling, updates radar, manages UI state
 */

// ── State ──────────────────────────────────────────────────
const State = {
  espIP:       '192.168.1.100',
  espPort:     80,
  pollInterval: 200,     // ms
  dangerDist:  20,
  warnDist:    50,
  maxRange:    200,

  demoMode:    false,
  soundAlert:  true,
  connected:   false,
  scanning:    true,

  history:     [],       // [{time, angle, distance, status}]
  pollTimer:   null,
  demoAngle:   0,
  demoDir:     1,
};

// ── Init ───────────────────────────────────────────────────
let radar;

document.addEventListener('DOMContentLoaded', () => {
  radar = new RadarRenderer('radarCanvas');

  loadSettings();
  bindNav();
  bindControls();
  bindSettings();
  startPolling();
  loadDemoToggle();
});

// ── Navigation ─────────────────────────────────────────────
function bindNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const page = item.dataset.page;
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      item.classList.add('active');
      document.getElementById('page-' + page).classList.add('active');
      if (page === 'history') renderHistory();
    });
  });
}

// ── Radar Controls ─────────────────────────────────────────
function bindControls() {
  document.getElementById('btnScan').addEventListener('click', () => {
    State.scanning = true;
    radar.resume();
    setBtn('btnScan', true);
    setBtn('btnPause', false);
    if (!State.demoMode) espCommand('scan');
  });

  document.getElementById('btnPause').addEventListener('click', () => {
    State.scanning = false;
    radar.pause();
    setBtn('btnPause', true);
    setBtn('btnScan', false);
    if (!State.demoMode) espCommand('stop');
  });

  document.getElementById('btnClear').addEventListener('click', () => {
    radar.clearObjects();
    State.history = [];
    renderTableRows([]);
    showToast('Radar dibersihkan');
  });

  document.getElementById('clearLogBtn').addEventListener('click', () => {
    document.getElementById('logContainer').innerHTML =
      '<div class="log-empty">Log dibersihkan</div>';
  });

  document.getElementById('fullscreenBtn').addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  });

  document.getElementById('screenshotBtn').addEventListener('click', () => {
    const canvas = document.getElementById('radarCanvas');
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'radar_' + Date.now() + '.png';
    a.click();
    showToast('Screenshot disimpan');
  });

  document.getElementById('exportBtn').addEventListener('click', exportCSV);
}

function setBtn(id, active) {
  const btn = document.getElementById(id);
  if (active) btn.classList.add('active');
  else        btn.classList.remove('active');
}

// ── Settings ───────────────────────────────────────────────
function bindSettings() {
  document.getElementById('saveConnBtn').addEventListener('click', () => {
    State.espIP       = document.getElementById('espIP').value.trim();
    State.espPort     = parseInt(document.getElementById('espPort').value) || 80;
    State.pollInterval= parseInt(document.getElementById('pollInterval').value) || 200;
    saveSettings();
    restartPolling();
    showToast('Koneksi disimpan, menghubungkan ulang…');
  });

  document.getElementById('saveThreshBtn').addEventListener('click', () => {
    State.dangerDist = parseInt(document.getElementById('dangerDist').value) || 20;
    State.warnDist   = parseInt(document.getElementById('warnDist').value) || 50;
    State.maxRange   = parseInt(document.getElementById('maxRange').value) || 200;
    radar.updateSettings(State.maxRange, State.dangerDist, State.warnDist);
    saveSettings();
    showToast('Threshold disimpan');
  });

  document.getElementById('demoMode').addEventListener('change', function() {
    State.demoMode = this.checked;
    saveSettings();
    restartPolling();
    showToast(State.demoMode ? 'Mode demo aktif' : 'Mode demo nonaktif');
  });

  document.getElementById('soundAlert').addEventListener('change', function() {
    State.soundAlert = this.checked;
    saveSettings();
  });
}

// ── LocalStorage ───────────────────────────────────────────
function saveSettings() {
  localStorage.setItem('radarSettings', JSON.stringify({
    espIP:        State.espIP,
    espPort:      State.espPort,
    pollInterval: State.pollInterval,
    dangerDist:   State.dangerDist,
    warnDist:     State.warnDist,
    maxRange:     State.maxRange,
    demoMode:     State.demoMode,
    soundAlert:   State.soundAlert,
  }));
}

function loadSettings() {
  const s = localStorage.getItem('radarSettings');
  if (!s) return;
  try {
    const d = JSON.parse(s);
    Object.assign(State, d);
    document.getElementById('espIP').value        = State.espIP;
    document.getElementById('espPort').value      = State.espPort;
    document.getElementById('pollInterval').value = State.pollInterval;
    document.getElementById('dangerDist').value   = State.dangerDist;
    document.getElementById('warnDist').value     = State.warnDist;
    document.getElementById('maxRange').value     = State.maxRange;
    document.getElementById('soundAlert').checked = State.soundAlert;
    document.getElementById('demoMode').checked   = State.demoMode;
    radar.updateSettings(State.maxRange, State.dangerDist, State.warnDist);
  } catch(e) {}
}

function loadDemoToggle() {
  // If IP is default / unreachable, suggest demo mode
  if (State.espIP === '192.168.1.100' && !State.demoMode) {
    setTimeout(() => showToast('Aktifkan Mode Demo di Pengaturan jika tidak ada ESP32'), 1500);
  }
}

// ── Polling ────────────────────────────────────────────────
function startPolling() {
  if (State.pollTimer) clearInterval(State.pollTimer);
  State.pollTimer = setInterval(fetchData, State.pollInterval);
}

function restartPolling() {
  clearInterval(State.pollTimer);
  setTimeout(() => startPolling(), 300);
}

async function fetchData() {
  if (!State.scanning) return;

  if (State.demoMode) {
    simulateDemoData();
    return;
  }

  try {
    const url = `http://${State.espIP}:${State.espPort}/data`;
    // Use PHP proxy to avoid CORS issues
    const res = await fetch(`api/proxy.php?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    handleData(data.angle, data.distance);
    setConnected(true);
  } catch (err) {
    setConnected(false);
  }
}

function handleData(angle, distance) {
  if (isNaN(angle) || isNaN(distance)) return;
  angle    = parseFloat(angle);
  distance = parseFloat(distance);

  // Update radar
  radar.setAngle(angle);
  if (distance > 0 && distance <= State.maxRange) {
    radar.addObject(angle, distance);
  }

  // Update stat cards
  document.getElementById('statAngle').textContent    = angle + '°';
  document.getElementById('statDistance').textContent = distance > 0
    ? distance.toFixed(1) + ' cm' : '-- cm';

  // Count visible objects
  const now     = Date.now();
  const visible = radar.objects.filter(o => now - o.ts < 5000 && o.distance > 0).length;
  document.getElementById('statObjects').textContent = visible;

  // Status
  let status, cls;
  if (distance <= State.dangerDist && distance > 0) {
    status = 'BAHAYA'; cls = 'danger';
  } else if (distance <= State.warnDist && distance > 0) {
    status = 'WASPADA'; cls = 'warn';
  } else {
    status = 'AMAN'; cls = 'ok';
  }

  document.getElementById('statStatus').textContent = status;

  // Alert badge
  const danger = radar.objects.some(o => now - o.ts < 3000 && o.distance <= State.dangerDist);
  const badge  = document.getElementById('alertBadge');
  badge.style.display = danger ? 'inline-flex' : 'none';

  // Sound
  if (danger && State.soundAlert) playBeep();

  // Log
  if (distance > 0) {
    addLog(angle, distance, status, cls);
    recordHistory(angle, distance, status);
    updateTable(angle, distance, cls);
  }
}

// ── Demo Simulation ────────────────────────────────────────
const demoObjects = [
  { at: 40,  dist: 80  },
  { at: 75,  dist: 35  },  // danger zone
  { at: 120, dist: 15  },  // danger
  { at: 155, dist: 120 },
];

function simulateDemoData() {
  // Move angle
  State.demoAngle += State.demoDir * 3;
  if (State.demoAngle >= 180) { State.demoAngle = 180; State.demoDir = -1; }
  if (State.demoAngle <= 0)   { State.demoAngle = 0;   State.demoDir =  1; }

  const angle = State.demoAngle;
  let   dist  = State.maxRange + 1;  // default = no object

  // Check if any demo object is near current angle
  demoObjects.forEach(obj => {
    if (Math.abs(angle - obj.at) < 6) {
      dist = obj.dist + Math.random() * 5 - 2.5;
    }
  });

  if (dist > State.maxRange) dist = 0;
  setConnected(true);
  handleData(angle, dist);
}

// ── Log ────────────────────────────────────────────────────
const MAX_LOG = 80;

function addLog(angle, distance, status, cls) {
  const container = document.getElementById('logContainer');
  const empty = container.querySelector('.log-empty');
  if (empty) empty.remove();

  const entry = document.createElement('div');
  entry.className = `log-entry ${cls}`;
  const t = new Date().toLocaleTimeString('id-ID');
  entry.innerHTML = `
    <span class="log-time">${t}</span>
    <span>${angle}° → ${distance.toFixed(1)} cm</span>
    <span style="margin-left:auto;font-size:11px">${status}</span>`;
  container.prepend(entry);

  // Trim
  const entries = container.querySelectorAll('.log-entry');
  if (entries.length > MAX_LOG) entries[entries.length - 1].remove();
}

// ── Table ──────────────────────────────────────────────────
const tableRows = [];
const MAX_TABLE = 20;

function updateTable(angle, distance, cls) {
  const now = new Date().toLocaleTimeString('id-ID');
  tableRows.unshift({ time: now, angle, distance, cls });
  if (tableRows.length > MAX_TABLE) tableRows.pop();
  renderTableRows(tableRows);
}

function renderTableRows(rows) {
  const tbody = document.getElementById('dataTableBody');
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted)">Belum ada data</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.time}</td>
      <td>${r.angle}°</td>
      <td>${parseFloat(r.distance).toFixed(1)} cm</td>
      <td><span class="badge-status ${r.cls}">
        ${r.cls === 'danger' ? 'BAHAYA' : r.cls === 'warn' ? 'WASPADA' : 'AMAN'}
      </span></td>
    </tr>`).join('');
}

// ── History ────────────────────────────────────────────────
function recordHistory(angle, distance, status) {
  State.history.push({
    time: new Date().toLocaleString('id-ID'),
    angle, distance, status,
  });
  if (State.history.length > 500) State.history.shift();
}

function renderHistory() {
  const tbody = document.getElementById('historyTableBody');
  const rows  = [...State.history].reverse().slice(0, 200);
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted)">Belum ada riwayat</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map((r, i) => {
    let cls = r.status === 'BAHAYA' ? 'danger' : r.status === 'WASPADA' ? 'warn' : 'ok';
    return `
    <tr>
      <td>${i + 1}</td>
      <td>${r.time}</td>
      <td>${r.angle}°</td>
      <td>${parseFloat(r.distance).toFixed(1)}</td>
      <td><span class="badge-status ${cls}">${r.status}</span></td>
    </tr>`;
  }).join('');
}

// ── CSV Export ─────────────────────────────────────────────
function exportCSV() {
  if (!State.history.length) { showToast('Tidak ada data untuk diekspor'); return; }
  const header = 'No,Waktu,Sudut(°),Jarak(cm),Status\n';
  const rows   = State.history.map((r, i) =>
    `${i+1},"${r.time}",${r.angle},${parseFloat(r.distance).toFixed(1)},${r.status}`
  ).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'radar_history_' + Date.now() + '.csv';
  a.click();
  showToast('CSV diekspor');
}

// ── Connection Status ──────────────────────────────────────
function setConnected(ok) {
  State.connected = ok;
  const dot   = document.getElementById('connDot');
  const label = document.getElementById('connLabel');
  const stat  = document.getElementById('statStatus');

  dot.className = 'dot ' + (ok ? 'connected' : 'error');
  label.textContent = ok ? 'Terhubung' : 'Terputus';

  if (!ok && !State.demoMode) {
    document.getElementById('statStatus').textContent = 'Offline';
    document.getElementById('statObjects').textContent = '--';
  }
}

// ── ESP32 Command ──────────────────────────────────────────
async function espCommand(cmd) {
  try {
    const url = `http://${State.espIP}:${State.espPort}/${cmd}`;
    await fetch(`api/proxy.php?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(2000),
    });
  } catch (_) {}
}

// ── Toast ──────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  clearTimeout(toastTimer);
  const t = document.createElement('div');
  t.className   = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  toastTimer = setTimeout(() => t.remove(), 3000);
}

// ── Beep ───────────────────────────────────────────────────
let lastBeep = 0;
function playBeep() {
  const now = Date.now();
  if (now - lastBeep < 1500) return;
  lastBeep = now;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain= ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (_) {}
}