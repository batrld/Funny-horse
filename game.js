'use strict';

// ── State ──────────────────────────────────────────────────────────────────
const config = {
  breed: 'arabian',
  horseCoat: '#C8834A',
  marking: 'none',
  markingColor: '#FFFFFF',
  gearColor: '#E63946',
  gender: 'girl',
  hairColor: '#8B4513',
  outfitColor: '#FFFFFF',
};

// ── Setup screen wiring ────────────────────────────────────────────────────
function wireOptionGroup(containerId, configKey) {
  document.getElementById(containerId).addEventListener('click', e => {
    const btn = e.target.closest('.opt-btn');
    if (!btn) return;
    document.querySelectorAll(`#${containerId} .opt-btn`).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    config[configKey] = btn.dataset[configKey] || btn.dataset.gender || btn.dataset.breed || btn.dataset.marking;
  });
}

function wireColorGroup(containerId, configKey) {
  document.getElementById(containerId).addEventListener('click', e => {
    const btn = e.target.closest('.color-btn');
    if (!btn) return;
    document.querySelectorAll(`#${containerId} .color-btn`).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    config[configKey] = btn.dataset.color;
  });
}

wireOptionGroup('breed-options', 'breed');
wireOptionGroup('marking-options', 'marking');
wireOptionGroup('rider-gender', 'gender');
wireColorGroup('horse-coat-colors', 'horseCoat');
wireColorGroup('marking-colors', 'markingColor');
wireColorGroup('gear-colors', 'gearColor');
wireColorGroup('hair-colors', 'hairColor');
wireColorGroup('outfit-colors', 'outfitColor');

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);
document.getElementById('menu-btn').addEventListener('click', showSetup);

// ── Screen helpers ─────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function showSetup() { showScreen('setup-screen'); }

// ── Audio ──────────────────────────────────────────────────────────────────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
}

function playBell() {
  ensureAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1046, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(523, audioCtx.currentTime + 0.5);
  gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.7);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.7);
}

function playHit() {
  ensureAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = 'square';
  osc.frequency.setValueAtTime(180, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 0.2);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.25);
}

function playGallop() {
  ensureAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(220, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.08);
}

// ── Canvas / Game ──────────────────────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const GROUND_FRAC = 0.72;
const GRAVITY = 0.55;
const JUMP_VEL = -13;
const SPEED_BASE = 4;
const SPEED_INC = 0.0008;

let game = null;

function startGame() {
  ensureAudio();
  showScreen('game-screen');
  resizeCanvas();
  initGame();
  document.getElementById('tap-hint').style.display = 'block';
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - document.getElementById('hud').offsetHeight;
}

window.addEventListener('resize', () => {
  if (game) {
    resizeCanvas();
    game.groundY = canvas.height * GROUND_FRAC;
  }
});

// Touch / click jump
canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (game && !game.over) {
    game.jump();
    document.getElementById('tap-hint').style.display = 'none';
  }
});

// ── Game init ──────────────────────────────────────────────────────────────
function initGame() {
  if (game && game.rafId) cancelAnimationFrame(game.rafId);

  const groundY = canvas.height * GROUND_FRAC;
  const horseH = canvas.height * 0.22;
  const horseW = horseH * 1.5;

  game = {
    over: false,
    startTime: performance.now(),
    distance: 0,
    jumps: 0,
    groundY,
    horseH,
    horseW,
    horseX: canvas.width * 0.22,
    horseY: groundY - horseH,
    velY: 0,
    onGround: true,
    speed: SPEED_BASE,
    obstacles: [],
    nextObstDist: 500,
    distSpawned: 0,
    frameCount: 0,
    gallopTimer: 0,
    gallopPhase: 0,
    bgOffset: 0,
    clouds: initClouds(),
    rafId: null,
    passedObstacles: new Set(),
  };

  game.rafId = requestAnimationFrame(loop);
}

function initClouds() {
  return Array.from({ length: 5 }, (_, i) => ({
    x: (canvas.width / 5) * i + Math.random() * 100,
    y: canvas.height * (0.05 + Math.random() * 0.25),
    w: 80 + Math.random() * 80,
  }));
}

// ── Obstacle types (конный спорт) ──────────────────────────────────────────
function makeObstacle(x) {
  const type = ['vertical', 'oxer', 'wall'][Math.floor(Math.random() * 3)];
  const h = canvas.height * (0.12 + Math.random() * 0.1);
  const w = type === 'oxer' ? canvas.height * 0.12 : canvas.height * 0.06;
  return { x, w, h, type, color: randomObstacleColor() };
}

function randomObstacleColor() {
  const colors = ['#E63946', '#2A9D8F', '#F4A261', '#8338EC', '#264653', '#FFD700'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// ── Main loop ──────────────────────────────────────────────────────────────
function loop(ts) {
  if (!game || game.over) return;
  update(ts);
  render();
  game.rafId = requestAnimationFrame(loop);
}

function update(ts) {
  const g = game;
  g.frameCount++;
  g.speed = SPEED_BASE + g.distance * SPEED_INC;

  // Physics
  if (!g.onGround) {
    g.velY += GRAVITY;
    g.horseY += g.velY;
    if (g.horseY >= g.groundY - g.horseH) {
      g.horseY = g.groundY - g.horseH;
      g.velY = 0;
      g.onGround = true;
    }
  }

  // Gallop sound
  g.gallopTimer += g.speed;
  if (g.gallopTimer > 35) {
    g.gallopTimer = 0;
    g.gallopPhase = (g.gallopPhase + 1) % 4;
    if (g.onGround) playGallop();
  }

  // Distance
  g.distance += g.speed / 60;
  g.bgOffset = (g.bgOffset + g.speed) % canvas.width;

  // Clouds
  g.clouds.forEach(c => {
    c.x -= g.speed * 0.3;
    if (c.x + c.w < 0) c.x = canvas.width + c.w;
  });

  // Spawn obstacles
  g.distSpawned += g.speed;
  if (g.distSpawned >= g.nextObstDist) {
    g.distSpawned = 0;
    g.nextObstDist = 400 + Math.random() * 400;
    g.obstacles.push(makeObstacle(canvas.width + 40));
  }

  // Move & check obstacles
  g.obstacles.forEach(ob => {
    ob.x -= g.speed;
  });

  // Collision
  const hx = g.horseX + g.horseW * 0.25;
  const hy = g.horseY + g.horseH * 0.1;
  const hw = g.horseW * 0.55;
  const hh = g.horseH * 0.85;

  for (const ob of g.obstacles) {
    const obY = g.groundY - ob.h;
    if (
      hx < ob.x + ob.w &&
      hx + hw > ob.x &&
      hy < g.groundY &&
      hy + hh > obY
    ) {
      playHit();
      endGame();
      return;
    }
    // Count passed
    if (!g.passedObstacles.has(ob) && ob.x + ob.w < g.horseX) {
      g.passedObstacles.add(ob);
      g.jumps++;
      playBell();
      document.getElementById('hud-jumps').textContent = g.jumps;
    }
  }

  // Remove off-screen obstacles
  g.obstacles = g.obstacles.filter(ob => ob.x + ob.w > -50);

  // HUD
  document.getElementById('hud-distance').textContent = Math.floor(g.distance) + 'm';
  const secs = Math.floor((performance.now() - g.startTime) / 1000);
  document.getElementById('hud-time').textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

// ── Jump ───────────────────────────────────────────────────────────────────
game = null;
Object.defineProperty(window, '_gameJump', { get: () => game && game.jump.bind(game) });

function attachJump(g) {
  g.jump = function () {
    if (this.onGround) {
      this.velY = JUMP_VEL;
      this.onGround = false;
    }
  };
}

// ── End game ───────────────────────────────────────────────────────────────
function endGame() {
  game.over = true;
  const secs = Math.floor((performance.now() - game.startTime) / 1000);
  document.getElementById('final-distance').textContent = Math.floor(game.distance) + 'm';
  document.getElementById('final-jumps').textContent = game.jumps;
  document.getElementById('final-time').textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  showScreen('gameover-screen');
}

// ── Rendering ──────────────────────────────────────────────────────────────
function render() {
  const g = game;
  const W = canvas.width;
  const H = canvas.height;

  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, g.groundY);
  sky.addColorStop(0, '#5BAADB');
  sky.addColorStop(1, '#C8EAF5');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Clouds
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  g.clouds.forEach(c => drawCloud(c.x, c.y, c.w));

  // Ground
  const ground = ctx.createLinearGradient(0, g.groundY, 0, H);
  ground.addColorStop(0, '#5DA832');
  ground.addColorStop(0.15, '#4A9025');
  ground.addColorStop(1, '#3A7018');
  ctx.fillStyle = ground;
  ctx.fillRect(0, g.groundY, W, H - g.groundY);

  // Ground line dashes (speed lines)
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const lx = ((g.bgOffset + (W / 5) * i) % W);
    ctx.beginPath();
    ctx.moveTo(lx, g.groundY + 6);
    ctx.lineTo(lx + 40, g.groundY + 6);
    ctx.stroke();
  }

  // Obstacles
  g.obstacles.forEach(ob => drawObstacle(ob, g.groundY));

  // Horse + rider
  drawHorse(g.horseX, g.horseY, g.horseW, g.horseH, g.gallopPhase, g.onGround);
}

function drawCloud(x, y, w) {
  const r = w / 4;
  ctx.beginPath();
  ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
  ctx.arc(x + r * 1.8, y + r * 0.6, r * 1.2, 0, Math.PI * 2);
  ctx.arc(x + r * 3, y + r, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawObstacle(ob, groundY) {
  const obY = groundY - ob.h;
  const c = ob.color;
  const c2 = '#FFFFFF';

  if (ob.type === 'wall') {
    // Stone wall
    ctx.fillStyle = '#888';
    ctx.fillRect(ob.x, obY, ob.w, ob.h);
    // Brick pattern
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    const brickH = 12;
    for (let row = 0; row * brickH < ob.h; row++) {
      const offset = row % 2 === 0 ? 0 : 10;
      for (let col = -offset; col < ob.w + offset; col += 20) {
        ctx.strokeRect(ob.x + col, obY + row * brickH, 20, brickH);
      }
    }
    // Top pole
    ctx.fillStyle = c;
    ctx.fillRect(ob.x - 4, obY - 8, ob.w + 8, 8);
  } else if (ob.type === 'oxer') {
    // Double poles (oxer)
    const spread = ob.w * 0.8;
    drawVerticalPole(ob.x, obY, ob.w, ob.h, c, c2);
    drawVerticalPole(ob.x + spread, obY + ob.h * 0.12, ob.w, ob.h * 0.88, c, c2);
    // connecting top rail
    ctx.fillStyle = c;
    ctx.fillRect(ob.x, obY - 4, ob.w + spread, 6);
  } else {
    // Single vertical poles
    drawVerticalPole(ob.x, obY, ob.w, ob.h, c, c2);
  }
}

function drawVerticalPole(x, y, w, h, c1, c2) {
  // Left post
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(x - 4, y, 8, h);
  // Right post
  ctx.fillRect(x + w - 4, y, 8, h);

  // Rails (striped)
  const rails = 3;
  for (let i = 0; i < rails; i++) {
    const ry = y + (h / (rails + 1)) * (i + 1) - 4;
    ctx.fillStyle = i % 2 === 0 ? c1 : c2;
    ctx.fillRect(x - 2, ry, w + 4, 8);
    // stripes
    ctx.fillStyle = i % 2 === 0 ? c2 : c1;
    for (let s = 0; s < w; s += 20) {
      ctx.fillRect(x + s, ry, 10, 8);
    }
  }
}

// ── Horse drawing ──────────────────────────────────────────────────────────
function drawHorse(x, y, w, h, phase, onGround) {
  ctx.save();
  ctx.translate(x, y);

  const coat = config.horseCoat;
  const gear = config.gearColor;

  // Leg animation offsets
  const legAnim = onGround ? [
    [0, Math.sin(phase * Math.PI / 2) * 6],
    [0, Math.sin((phase + 2) * Math.PI / 2) * 6],
    [0, Math.sin((phase + 1) * Math.PI / 2) * 6],
    [0, Math.sin((phase + 3) * Math.PI / 2) * 6],
  ] : [
    [-8, -10], [8, 6], [-6, 8], [6, -8]
  ];

  const bw = w * 0.48; // body width
  const bh = h * 0.38; // body height
  const bx = w * 0.22; // body start x
  const by = h * 0.38; // body start y

  // Tail
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.moveTo(bx + bw, by + bh * 0.4);
  ctx.quadraticCurveTo(bx + bw + w * 0.18, by + bh * 0.8, bx + bw + w * 0.08, by + bh * 1.3);
  ctx.quadraticCurveTo(bx + bw - w * 0.04, by + bh * 1.0, bx + bw, by + bh * 0.4);
  ctx.fill();

  // Body
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.ellipse(bx + bw / 2, by + bh / 2, bw / 2, bh / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Markings on body
  drawMarkings(ctx, bx, by, bw, bh, config.marking, config.markingColor, coat);

  // Neck
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.moveTo(bx + w * 0.05, by + bh * 0.2);
  ctx.quadraticCurveTo(bx - w * 0.04, by - bh * 0.3, bx, by - bh * 0.55);
  ctx.quadraticCurveTo(bx + w * 0.1, by - bh * 0.6, bx + w * 0.12, by + bh * 0.1);
  ctx.fill();

  // Head
  const hx2 = bx - w * 0.04;
  const hy2 = by - bh * 0.7;
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.ellipse(hx2, hy2, w * 0.1, h * 0.1, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Nose
  ctx.fillStyle = lerpColor(coat, '#FFFFFF', 0.3);
  ctx.beginPath();
  ctx.ellipse(hx2 - w * 0.08, hy2 + h * 0.02, w * 0.055, h * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eye
  ctx.fillStyle = '#1A1A1A';
  ctx.beginPath();
  ctx.arc(hx2 - w * 0.04, hy2 - h * 0.015, w * 0.018, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(hx2 - w * 0.038, hy2 - h * 0.018, w * 0.006, 0, Math.PI * 2);
  ctx.fill();

  // Nostril
  ctx.fillStyle = '#8B4513';
  ctx.beginPath();
  ctx.arc(hx2 - w * 0.115, hy2 + h * 0.03, w * 0.012, 0, Math.PI * 2);
  ctx.fill();

  // Star / face marking
  if (config.marking === 'star') {
    ctx.fillStyle = config.markingColor;
    ctx.beginPath();
    ctx.arc(hx2 - w * 0.01, hy2 - h * 0.01, w * 0.03, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ear
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.moveTo(hx2 + w * 0.04, hy2 - h * 0.08);
  ctx.lineTo(hx2 + w * 0.06, hy2 - h * 0.16);
  ctx.lineTo(hx2 + w * 0.02, hy2 - h * 0.09);
  ctx.fill();

  // Mane (in buns/bunches as per spec)
  const maneX = bx + w * 0.02;
  const maneY = by - bh * 0.2;
  ctx.fillStyle = darkenColor(coat, 0.4);
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(maneX + i * w * 0.04, maneY - i * h * 0.05, w * 0.032, 0, Math.PI * 2);
    ctx.fill();
  }

  // Legs
  const legW = w * 0.07;
  const legH = h * 0.38;
  const legPositions = [
    [bx + bw * 0.18, by + bh * 0.85],
    [bx + bw * 0.32, by + bh * 0.85],
    [bx + bw * 0.62, by + bh * 0.85],
    [bx + bw * 0.78, by + bh * 0.85],
  ];
  legPositions.forEach(([lx, ly], i) => {
    const [dx, dy] = legAnim[i];
    ctx.fillStyle = coat;
    ctx.fillRect(lx + dx - legW / 2, ly + dy, legW, legH);
    // Hoof
    ctx.fillStyle = '#3D2B1F';
    ctx.fillRect(lx + dx - legW / 2, ly + dy + legH - legH * 0.15, legW, legH * 0.15);
    // Socks marking
    if (config.marking === 'socks') {
      ctx.fillStyle = config.markingColor;
      ctx.fillRect(lx + dx - legW / 2, ly + dy + legH * 0.65, legW, legH * 0.2);
    }
  });

  // Gear: chest band & head halter
  ctx.strokeStyle = gear;
  ctx.lineWidth = Math.max(3, w * 0.025);
  ctx.lineCap = 'round';
  // Chest girth
  ctx.beginPath();
  ctx.arc(bx + bw * 0.28, by + bh * 0.7, bh * 0.35, 0, Math.PI, false);
  ctx.stroke();
  // Halter
  ctx.beginPath();
  ctx.arc(hx2, hy2, w * 0.07, 0.2, Math.PI * 1.4);
  ctx.stroke();

  // Rider
  drawRider(bx + bw * 0.3, by - h * 0.05, w, h);

  ctx.restore();
}

function drawRider(rx, ry, w, h) {
  const outfit = config.outfitColor;
  const hair = config.hairColor;
  const isGirl = config.gender === 'girl';

  // Body / jacket
  ctx.fillStyle = outfit;
  ctx.beginPath();
  ctx.ellipse(rx, ry - h * 0.22, w * 0.09, h * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs (breeches = white/light)
  ctx.fillStyle = lerpColor(outfit, '#FFFFFF', 0.5);
  ctx.fillRect(rx - w * 0.055, ry - h * 0.1, w * 0.05, h * 0.15);
  ctx.fillRect(rx + w * 0.005, ry - h * 0.1, w * 0.05, h * 0.15);

  // Boots
  ctx.fillStyle = '#2D1B00';
  ctx.fillRect(rx - w * 0.055, ry + h * 0.04, w * 0.05, h * 0.06);
  ctx.fillRect(rx + w * 0.005, ry + h * 0.04, w * 0.05, h * 0.06);

  // Head
  ctx.fillStyle = '#FDBCB4';
  ctx.beginPath();
  ctx.arc(rx, ry - h * 0.38, w * 0.065, 0, Math.PI * 2);
  ctx.fill();

  // Helmet
  ctx.fillStyle = darkenColor(outfit, 0.3);
  ctx.beginPath();
  ctx.arc(rx, ry - h * 0.41, w * 0.07, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(rx - w * 0.07, ry - h * 0.41, w * 0.14, h * 0.03);

  // Hair
  ctx.fillStyle = hair;
  if (isGirl) {
    // Ponytail
    ctx.beginPath();
    ctx.arc(rx, ry - h * 0.37, w * 0.055, 0, Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(rx + w * 0.05, ry - h * 0.38);
    ctx.quadraticCurveTo(rx + w * 0.1, ry - h * 0.25, rx + w * 0.06, ry - h * 0.18);
    ctx.lineWidth = 3;
    ctx.strokeStyle = hair;
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(rx, ry - h * 0.37, w * 0.05, 0, Math.PI);
    ctx.fill();
  }

  // Arms
  ctx.strokeStyle = outfit;
  ctx.lineWidth = Math.max(4, w * 0.04);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(rx - w * 0.06, ry - h * 0.25);
  ctx.lineTo(rx - w * 0.12, ry - h * 0.12);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(rx + w * 0.06, ry - h * 0.25);
  ctx.lineTo(rx + w * 0.12, ry - h * 0.12);
  ctx.stroke();
}

function drawMarkings(ctx, bx, by, bw, bh, type, color, coat) {
  if (type === 'none' || type === 'star' || type === 'stripe' || type === 'socks') return;
  ctx.fillStyle = color;
  if (type === 'pinto') {
    ctx.beginPath();
    ctx.ellipse(bx + bw * 0.35, by + bh * 0.4, bw * 0.2, bh * 0.25, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(bx + bw * 0.65, by + bh * 0.55, bw * 0.15, bh * 0.2, -0.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'appaloosa') {
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.arc(
        bx + bw * (0.5 + Math.cos(i * 0.9) * 0.3),
        by + bh * (0.5 + Math.sin(i * 1.2) * 0.3),
        bw * 0.04, 0, Math.PI * 2
      );
      ctx.fill();
    }
  }
}

// ── Color utils ────────────────────────────────────────────────────────────
function lerpColor(a, b, t) {
  const r1 = parseInt(a.slice(1, 3), 16), g1 = parseInt(a.slice(3, 5), 16), b1 = parseInt(a.slice(5, 7), 16);
  const r2 = parseInt(b.slice(1, 3), 16), g2 = parseInt(b.slice(3, 5), 16), b2 = parseInt(b.slice(5, 7), 16);
  return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
}

function darkenColor(hex, amount) {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) * (1 - amount));
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) * (1 - amount));
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) * (1 - amount));
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

// ── Patch jump onto game object after initGame ─────────────────────────────
const _origInitGame = initGame;
(function () {
  const orig = initGame;
  window.initGame = function () {
    orig();
    attachJump(game);
  };
})();

// Re-patch startGame to call patched initGame
document.getElementById('start-btn').removeEventListener('click', startGame);
document.getElementById('restart-btn').removeEventListener('click', startGame);

function startGamePatched() {
  ensureAudio();
  showScreen('game-screen');
  resizeCanvas();
  window.initGame();
  document.getElementById('tap-hint').style.display = 'block';
}

document.getElementById('start-btn').addEventListener('click', startGamePatched);
document.getElementById('restart-btn').addEventListener('click', startGamePatched);
