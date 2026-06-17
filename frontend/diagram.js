
// Front End team — solar system diagram
// Draw the Sun in the center, orbit rings, and planet dots on the canvas
// Receive planet position data from app.js and place dots accordingly
// Add planet name labels next to each dot
// Wraps everything in an IIFE (Immediately Invoked Function Expression)
// This keeps all variables private — nothing leaks into the global scope
// Only the functions inside "return {}" are accessible from outside

const DiagramController = (() => {

  const PLANET_DEFS = {
    mercury: { color: '#a0a0a0', size: 4,  baseRadius: 0.10, speed: 4.74, label: 'Me' },
    venus:   { color: '#d4b870', size: 6,  baseRadius: 0.16, speed: 3.50, label: 'Ve' },
    earth:   { color: '#4a9eca', size: 6,  baseRadius: 0.22, speed: 2.98, label: 'Ea' },
    mars:    { color: '#c86040', size: 5,  baseRadius: 0.30, speed: 2.41, label: 'Ma' },
    jupiter: { color: '#c4a870', size: 13, baseRadius: 0.40, speed: 1.31, label: 'Ju' },
    saturn:  { color: '#d4c090', size: 10, baseRadius: 0.50, speed: 0.97, label: 'Sa' },
  };

  const SUN_COLOR   = '#f0d060';
  const SUN_SIZE    = 18;
  const ORBIT_COLOR = 'rgba(255,255,255,0.05)';
  const STAR_COUNT  = 180;
  const ANIM_SPEED  = 0.006;

  let canvas, ctx, width, height, cx, cy, scale;
  let animFrameId = null;
  let stars = [];
  let angles = {};
  let apiAngles = null;
  let highlightedPlanets = new Set();
  let eventLabel = null;
  let lastTime = 0;

  function init() {
    canvas = document.getElementById('solarCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    Object.keys(PLANET_DEFS).forEach((name, i) => {
      angles[name] = (i / Object.keys(PLANET_DEFS).length) * Math.PI * 2;
    });
    generateStars();
    resize();
    window.addEventListener('resize', resize);
    startAnimation();
  }

  function generateStars() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.1 + 0.15,
        a: Math.random() * 0.6 + 0.1,
      });
    }
  }

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width  = rect.width  || 700;
    canvas.height = rect.height || 500;
    width  = canvas.width;
    height = canvas.height;
    cx = width  / 2;
    cy = height / 2;
    scale = Math.min(width, height) / 2.2;
  }

  function startAnimation() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    lastTime = performance.now();
    loop(lastTime);
  }

  function loop(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    if (!apiAngles) {
      Object.keys(PLANET_DEFS).forEach(name => {
        angles[name] += ANIM_SPEED * PLANET_DEFS[name].speed * dt;
      });
    }
    draw();
    animFrameId = requestAnimationFrame(loop);
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#080e18';
    ctx.fillRect(0, 0, width, height);
    drawStars();
    drawGrid();
    drawOrbits();
    drawSun();
    drawPlanets();
    drawEventLabel();
  }

  function drawStars() {
    stars.forEach(s => {
      ctx.beginPath();
      ctx.arc(s.x * width, s.y * height, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,220,255,${s.a})`;
      ctx.fill();
    });
  }

  function drawGrid() {
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    const step = Math.min(width, height) / 8;
    for (let x = 0; x < width; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
  }

  function drawOrbits() {
    Object.values(PLANET_DEFS).forEach(def => {
      ctx.beginPath();
      ctx.arc(cx, cy, def.baseRadius * scale, 0, Math.PI * 2);
      ctx.strokeStyle = ORBIT_COLOR;
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }

  function drawSun() {
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, SUN_SIZE * 4);
    grd.addColorStop(0,   'rgba(240,208,80,0.5)');
    grd.addColorStop(0.3, 'rgba(240,180,60,0.2)');
    grd.addColorStop(1,   'rgba(240,160,40,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, SUN_SIZE * 4, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, SUN_SIZE, 0, Math.PI * 2);
    ctx.fillStyle = SUN_COLOR;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#fff8e0';
    ctx.fill();
  }

  function drawPlanets() {
    const currentAngles = apiAngles || angles;
    Object.entries(PLANET_DEFS).forEach(([name, def]) => {
      const r     = def.baseRadius * scale;
      const angle = currentAngles[name] || 0;
      const px    = cx + Math.cos(angle) * r;
      const py    = cy + Math.sin(angle) * r;
      const isHighlighted = highlightedPlanets.has(name);

      if (isHighlighted) {
        const grd = ctx.createRadialGradient(px, py, 0, px, py, def.size * 5);
        grd.addColorStop(0, 'rgba(200,168,75,0.5)');
        grd.addColorStop(1, 'rgba(200,168,75,0)');
        ctx.beginPath();
        ctx.arc(px, py, def.size * 5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, def.size + 4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(200,168,75,0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(px, py);
        ctx.strokeStyle = 'rgba(200,168,75,0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      ctx.arc(px, py, def.size, 0, Math.PI * 2);
      ctx.fillStyle = isHighlighted ? '#c8a84b' : def.color;
      ctx.fill();

      if (name === 'saturn') {
        ctx.save();
        ctx.translate(px, py);
        ctx.scale(1, 0.3);
        ctx.beginPath();
        ctx.arc(0, 0, def.size * 2.0, 0, Math.PI * 2);
        ctx.strokeStyle = isHighlighted ? 'rgba(200,168,75,0.7)' : 'rgba(212,192,144,0.6)';
        ctx.lineWidth = 3 / 0.3;
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = isHighlighted ? 'rgba(200,168,75,0.9)' : 'rgba(160,190,220,0.5)';
      ctx.font = '9px Courier New, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(def.label, px, py - def.size - 5);
    });
  }

  function drawEventLabel() {
    if (!eventLabel) return;
    const currentAngles = apiAngles || angles;
    let labelX = cx, labelY = cy - 80;
    for (const [name, def] of Object.entries(PLANET_DEFS)) {
      if (highlightedPlanets.has(name)) {
        const angle = currentAngles[name] || 0;
        labelX = cx + Math.cos(angle) * def.baseRadius * scale;
        labelY = cy + Math.sin(angle) * def.baseRadius * scale - def.size - 18;
        break;
      }
    }
    ctx.font = 'bold 9px Courier New, monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = eventLabel.color || '#c85050';
    ctx.fillText(eventLabel.text.toUpperCase(), labelX, labelY);
  }

  function setPositions(data) {
    if (!data || !data.planets) return;
    apiAngles = {};
    Object.entries(data.planets).forEach(([name, vals]) => {
      apiAngles[name] = (vals.angle * Math.PI) / 180;
    });
    const el = document.getElementById('statDate');
    if (el && data.date) el.textContent = data.date;
    const tb = document.getElementById('topbarDate');
    if (tb && data.date) {
      const parts = data.date.split('-');
      const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
      tb.textContent = `${parts[0]} · ${months[parseInt(parts[1])-1]} · ${parts[2]}`;
    }
  }

  function clearPositions() {
    apiAngles = null;
    const el = document.getElementById('statDate');
    if (el) el.textContent = '—';
    const tb = document.getElementById('topbarDate');
    if (tb) tb.textContent = '—';
  }

  function highlightEvent(planetNames = [], type = '', label = '') {
    highlightedPlanets = new Set(planetNames.map(p => p.toLowerCase()));
    const colorMap = { eclipse: '#c85050', conjunction: '#4a9eca', alignment: '#50c878' };
    eventLabel = label ? { text: label, color: colorMap[type] || '#c85050' } : null;
  }

  function clearHighlight() {
    highlightedPlanets = new Set();
    eventLabel = null;
  }

  window.addEventListener('DOMContentLoaded', init);
  return { setPositions, clearPositions, highlightEvent, clearHighlight };

})();

