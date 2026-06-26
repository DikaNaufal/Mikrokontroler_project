/**
 * radar.js — Canvas radar renderer
 * Draws the rotating sweep, grid rings, and object blips
 */

class RadarRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx    = this.canvas.getContext('2d');
    this.W      = this.canvas.width;
    this.H      = this.canvas.height;
    this.cx     = this.W / 2;
    this.cy     = this.H / 2;
    this.R      = this.W / 2 - 10;

    this.currentAngle = 0;   // degrees, 0-180
    this.direction    = 1;   // 1 = CW, -1 = CCW
    this.sweepWidth   = 40;  // degrees of sweep trail

    this.objects = [];       // [{angle, distance, ts}]
    this.trails  = [];       // [{angle}] fading trail

    this.maxRange   = 200;   // cm
    this.dangerDist = 20;
    this.warnDist   = 50;

    this.running = true;
    this.animId  = null;
    this._loop();
  }

  updateSettings(maxRange, dangerDist, warnDist) {
    this.maxRange   = maxRange;
    this.dangerDist = dangerDist;
    this.warnDist   = warnDist;
  }

  setAngle(deg) { this.currentAngle = deg; }

  addObject(angle, distance) {
    const now = Date.now();
    // Remove old reading at same angle (±2°)
    this.objects = this.objects.filter(o => Math.abs(o.angle - angle) > 2);
    this.objects.push({ angle, distance, ts: now });
    // Keep only last 200
    if (this.objects.length > 200) this.objects.shift();
  }

  clearObjects() { this.objects = []; }

  pause()  { this.running = false; cancelAnimationFrame(this.animId); }
  resume() { this.running = true;  this._loop(); }

  _loop() {
    if (!this.running) return;
    this._draw();
    this.animId = requestAnimationFrame(() => this._loop());
  }

  _draw() {
    const { ctx, cx, cy, R, W, H } = this;
    ctx.clearRect(0, 0, W, H);

    this._drawBackground();
    this._drawGrid();
    this._drawSweep();
    this._drawObjects();
    this._drawSweepLine();
    this._drawAngleLabels();
  }

  _drawBackground() {
    const { ctx, cx, cy, R } = this;
    // Dark circular background
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    bg.addColorStop(0, '#0d1f1a');
    bg.addColorStop(1, '#050e0c');
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = '#1a3a30';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  _drawGrid() {
    const { ctx, cx, cy, R } = this;

    // Concentric rings (25%, 50%, 75%, 100%)
    [0.25, 0.5, 0.75, 1].forEach(ratio => {
      ctx.beginPath();
      ctx.arc(cx, cy, R * ratio, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,180,100,0.18)';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.stroke();

      // Range label
      const label = Math.round(this.maxRange * ratio) + ' cm';
      ctx.fillStyle = 'rgba(0,180,100,0.5)';
      ctx.font = '10px monospace';
      ctx.fillText(label, cx + R * ratio + 3, cy - 3);
    });

    // Angle lines every 30°
    for (let a = 0; a <= 180; a += 30) {
      const rad = (a - 90) * (Math.PI / 180);
      const x2  = cx + R * Math.cos(rad);
      const y2  = cy + R * Math.sin(rad);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = 'rgba(0,180,100,0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Bottom horizontal line
    ctx.beginPath();
    ctx.moveTo(cx - R, cy);
    ctx.lineTo(cx + R, cy);
    ctx.strokeStyle = 'rgba(0,180,100,0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  _drawSweep() {
    const { ctx, cx, cy, R } = this;
    const a0 = (this.currentAngle - 90) * (Math.PI / 180);

    // Sweep gradient
    const gradient = ctx.createConicalGradient
      ? ctx.createConicalGradient(cx, cy, a0 - (this.sweepWidth * Math.PI / 180), a0)
      : null;

    if (gradient) {
      gradient.addColorStop(0, 'rgba(0,229,100,0)');
      gradient.addColorStop(1, 'rgba(0,229,100,0.25)');
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R,
        a0 - (this.sweepWidth * Math.PI / 180),
        a0);
      ctx.fillStyle = gradient;
      ctx.fill();
    } else {
      // Fallback: draw a simple wedge
      const steps = 24;
      for (let i = steps; i >= 0; i--) {
        const angle  = a0 - (i / steps) * (this.sweepWidth * Math.PI / 180);
        const alpha  = (1 - i / steps) * 0.3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, angle - (0.04), angle + (0.04));
        ctx.closePath();
        ctx.fillStyle = `rgba(0,229,100,${alpha})`;
        ctx.fill();
      }
    }
  }

  _drawSweepLine() {
    const { ctx, cx, cy, R } = this;
    const rad = (this.currentAngle - 90) * (Math.PI / 180);
    const x2  = cx + R * Math.cos(rad);
    const y2  = cy + R * Math.sin(rad);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = '#00ff80';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00ff80';
    ctx.shadowBlur  = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  _drawObjects() {
    const { ctx, cx, cy, R } = this;
    const now = Date.now();

    this.objects.forEach(obj => {
      const age     = (now - obj.ts) / 1000; // seconds
      const fadeAge = 8;  // fade out after 8 seconds
      if (age > fadeAge) return;

      const alpha   = Math.max(0, 1 - age / fadeAge);
      const distRatio = Math.min(obj.distance / this.maxRange, 1);
      const r       = R * distRatio;
      const rad     = (obj.angle - 90) * (Math.PI / 180);
      const x       = cx + r * Math.cos(rad);
      const y       = cy + r * Math.sin(rad);

      // Color by distance
      let color;
      if (obj.distance <= this.dangerDist)        color = `rgba(239,68,68,${alpha})`;
      else if (obj.distance <= this.warnDist)     color = `rgba(245,158,11,${alpha})`;
      else                                        color = `rgba(34,197,94,${alpha})`;

      // Outer glow
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = color.replace(/[\d.]+\)$/, `${alpha * 0.25})`);
      ctx.fill();

      // Core blip
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur  = obj.distance <= this.dangerDist ? 12 : 6;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Distance text
      if (age < 2) {
        ctx.fillStyle = color;
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`${Math.round(obj.distance)}cm`, x + 7, y - 5);
      }
    });
  }

  _drawAngleLabels() {
    const { ctx, cx, cy, R } = this;
    [0, 30, 60, 90, 120, 150, 180].forEach(a => {
      const rad = (a - 90) * (Math.PI / 180);
      const x   = cx + (R + 14) * Math.cos(rad);
      const y   = cy + (R + 14) * Math.sin(rad);
      ctx.fillStyle = 'rgba(0,180,100,0.7)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(a + '°', x, y);
    });
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
}

// Export
window.RadarRenderer = RadarRenderer;