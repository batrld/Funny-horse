'use strict';

// ── Config ──────────────────────────────────────────────────────────────────
const config = {
  player: '',
  theme: 'elasto',
  breed: 'arabian',
  horseCoat: '#FFD700',
  marking: 'none',
  markingColor: '#FFFFFF',
  gearColor: '#00FFFF',
  gender: 'girl',
  hairColor: '#FF6347',
  outfitColor: '#00BFFF',
};

// ── Player records ─────────────────────────────────────────────────────────
function getBest(player) {
  return parseInt(localStorage.getItem(`konkor_best_${player}`) || '0', 10);
}
function saveBest(player, meters) {
  if (meters > getBest(player)) {
    localStorage.setItem(`konkor_best_${player}`, meters);
    return true;
  }
  return false;
}
function fmtBest(player) {
  const b = getBest(player);
  return b > 0 ? `Рекорд: ${b}м` : 'Рекорд: —';
}

// ── Player selection screen ────────────────────────────────────────────────
function refreshPlayerBests() {
  document.getElementById('best-vera').textContent = fmtBest('vera');
  document.getElementById('best-andrei').textContent = fmtBest('andrei');
}

document.querySelectorAll('.player-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    config.player = btn.dataset.player;
    document.getElementById('setup-player-label').textContent =
      `Игрок: ${config.player.toUpperCase()}`;
    showScreen('setup-screen');
  });
});

// ── Setup wiring ───────────────────────────────────────────────────────────
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
document.getElementById('change-player-btn').addEventListener('click', showPlayerScreen);
document.getElementById('change-player-btn2').addEventListener('click', showPlayerScreen);

// ── Screens ────────────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function showSetup() { showScreen('setup-screen'); }
function showPlayerScreen() {
  refreshPlayerBests();
  updateThemeBtn();
  showScreen('player-screen');
}

function updateThemeBtn() {
  const btn = document.getElementById('theme-btn');
  if (!btn) return;
  if (config.theme === 'elasto') {
    btn.textContent = '⚡ Неон';
    btn.dataset.current = 'elasto';
  } else {
    btn.textContent = '🌿 Природа';
    btn.dataset.current = 'classic';
  }
}

document.getElementById('theme-btn').addEventListener('click', () => {
  config.theme = config.theme === 'elasto' ? 'classic' : 'elasto';
  updateThemeBtn();
});

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
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1046, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(523, audioCtx.currentTime + 0.5);
  gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.7);
  osc.start(); osc.stop(audioCtx.currentTime + 0.7);
}

function playHit() {
  ensureAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.type = 'square';
  osc.frequency.setValueAtTime(180, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 0.25);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  osc.start(); osc.stop(audioCtx.currentTime + 0.3);
}

function playGallop() {
  ensureAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(220, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
  osc.start(); osc.stop(audioCtx.currentTime + 0.08);
}

// ── Canvas ─────────────────────────────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const GRAVITY = 0.52;
const JUMP_VEL = -14;
const SPEED_BASE = 4;
const SPEED_INC = 0.0008;
const SPEED_MIN = 1.5;
const SPEED_MAX = 14;
const GROUND_BASE_FRAC = 0.68;
const HORSE_SCREEN_X_FRAC = 0.22;

// ── Terrain ────────────────────────────────────────────────────────────────
function terrainHeightAt(wx) {
  return Math.sin(wx * 0.006) * 28 +
         Math.sin(wx * 0.018) * 10 +
         Math.sin(wx * 0.003) * 18;
}

function groundYAt(wx) {
  return canvas.height * GROUND_BASE_FRAC + terrainHeightAt(wx);
}

// ── Stars ──────────────────────────────────────────────────────────────────
function initStars() {
  return Array.from({ length: 90 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height * 0.58,
    size: Math.random() < 0.7 ? 1 : 2,
    alpha: 0.3 + Math.random() * 0.7,
  }));
}

// ── Game ───────────────────────────────────────────────────────────────────
let game = null;

function startGame() {
  ensureAudio();
  showScreen('game-screen');
  resizeCanvas();
  initGame();
  const name = config.player ? config.player.toUpperCase() : '—';
  document.getElementById('hud-player').textContent = name;
  document.getElementById('hud-best').textContent = getBest(config.player) + 'м';
  document.getElementById('tap-hint').style.display = 'block';
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - document.getElementById('hud').offsetHeight;
}

window.addEventListener('resize', () => { if (game) resizeCanvas(); });

canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  doJump();
});

// Keyboard controls
window.addEventListener('keydown', e => {
  if (e.code === 'ArrowUp' || e.code === 'Space') { e.preventDefault(); doJump(); }
  if (e.code === 'ArrowRight') { e.preventDefault(); if (game && !game.over) game.speed = Math.min(SPEED_MAX, game.speed + 1.5); }
  if (e.code === 'ArrowLeft')  { e.preventDefault(); if (game && !game.over) game.speed = Math.max(SPEED_MIN, game.speed - 1.5); }
});

// Mobile on-screen speed buttons (hold to accelerate/decelerate)
let _holdFast = false, _holdSlow = false;

function wireHoldBtn(id, onHold) {
  const btn = document.getElementById(id);
  btn.addEventListener('pointerdown', e => { e.preventDefault(); onHold(true); });
  btn.addEventListener('pointerup',   e => { e.preventDefault(); onHold(false); });
  btn.addEventListener('pointerleave',e => { onHold(false); });
}
wireHoldBtn('btn-fast', v => { _holdFast = v; });
wireHoldBtn('btn-slow', v => { _holdSlow = v; });

function doJump() {
  if (!game || game.over) return;
  if (game.onGround) {
    game.velY = JUMP_VEL;
    game.onGround = false;
  }
  document.getElementById('tap-hint').style.display = 'none';
}

function initGame() {
  if (game && game.rafId) cancelAnimationFrame(game.rafId);

  const horseH = canvas.height * 0.22;
  const horseW = horseH * 1.5;
  const horseScreenX = canvas.width * HORSE_SCREEN_X_FRAC;

  game = {
    over: false,
    startTime: performance.now(),
    distance: 0,
    distPixels: 0,
    jumps: 0,
    speed: SPEED_BASE,
    horseH, horseW, horseScreenX,
    horseY: groundYAt(0) - horseH,
    velY: 0,
    onGround: true,
    obstacles: [],
    nextObstWorldX: canvas.width + 350,
    frameCount: 0,
    gallopTimer: 0,
    gallopPhase: 0,
    stars: initStars(),
    passedObstacles: new Set(),
    rafId: null,
    lives: 3,
    legs: 5,
    invincible: 0,
  };
  updateLivesHUD(game);

  game.rafId = requestAnimationFrame(loop);
}

// ── Obstacle factory ───────────────────────────────────────────────────────
const NEON_COLORS = ['#FF3366', '#00FFFF', '#FF6600', '#9D00FF', '#FFD700', '#00FF88'];

function makeObstacle(worldX) {
  const type = ['vertical', 'oxer', 'wall'][Math.floor(Math.random() * 3)];
  const h = canvas.height * (0.07 + Math.random() * 0.05);
  const w = type === 'oxer' ? canvas.height * 0.12 : canvas.height * 0.06;
  return { worldX, w, h, type, color: NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)] };
}

// ── Loop ───────────────────────────────────────────────────────────────────
function loop() {
  if (!game || game.over) return;
  update();
  render();
  game.rafId = requestAnimationFrame(loop);
}

function update() {
  const g = game;
  g.frameCount++;
  if (_holdFast) g.speed = Math.min(SPEED_MAX, g.speed + 0.12);
  if (_holdSlow) g.speed = Math.max(SPEED_MIN, g.speed - 0.12);
  g.distPixels += g.speed;
  g.distance = g.distPixels / 60;

  const groundY = groundYAt(g.distPixels);

  if (!g.onGround) {
    g.velY += GRAVITY;
    g.horseY += g.velY;
    if (g.horseY >= groundY - g.horseH) {
      g.horseY = groundY - g.horseH;
      g.velY = 0;
      g.onGround = true;
    }
  } else {
    g.horseY = groundY - g.horseH;
  }

  if (g.invincible > 0) g.invincible--;
  g.gallopTimer += g.speed;
  if (g.gallopTimer > 35) {
    g.gallopTimer = 0;
    g.gallopPhase = (g.gallopPhase + 1) % 4;
    if (g.onGround) playGallop();
  }

  while (g.nextObstWorldX < g.distPixels + canvas.width * 1.5) {
    g.obstacles.push(makeObstacle(g.nextObstWorldX));
    g.nextObstWorldX += 420 + Math.random() * 420;
  }

  const hl = g.horseScreenX + g.horseW * 0.25;
  const ht = g.horseY + g.horseH * 0.1;
  const hr = hl + g.horseW * 0.55;
  const hb = ht + g.horseH * 0.85;

  for (const ob of g.obstacles) {
    const sx = ob.worldX - g.distPixels + g.horseScreenX;
    const obGY = groundYAt(ob.worldX);
    const obTop = obGY - ob.h;

    if (hl < sx + ob.w && hr > sx && ht < obGY && hb > obTop) {
      if (g.invincible > 0) continue;
      playHit();
      g.legs--;
      if (g.legs <= 0) {
        g.lives--;
        if (g.lives <= 0) { endGame(); return; }
        g.legs = 5;
      }
      g.invincible = 90;
      updateLivesHUD(g);
      continue;
    }
    if (!g.passedObstacles.has(ob) && sx + ob.w < g.horseScreenX) {
      g.passedObstacles.add(ob);
      g.jumps++;
      playBell();
      // hud-jumps removed from HUD
    }
  }

  g.obstacles = g.obstacles.filter(ob => ob.worldX > g.distPixels - canvas.width * 0.5);

  document.getElementById('hud-distance').textContent = Math.floor(g.distance) + 'м';
  document.getElementById('hud-best').textContent = getBest(config.player) + 'м';
}

function updateLivesHUD(g) {
  const LEG = '🦵';
  const HEART = '♥';
  document.getElementById('hud-legs').textContent = LEG.repeat(g.legs);
  document.getElementById('hud-lives').textContent = HEART.repeat(g.lives);
}

function endGame() {
  game.over = true;
  const meters = Math.floor(game.distance);
  const isNew = saveBest(config.player, meters);
  const name = config.player ? config.player.toUpperCase() : '';

  document.getElementById('gameover-title').textContent =
    name ? `Игра окончена, ${name}!` : 'Игра окончена!';
  document.getElementById('final-distance').textContent = meters + 'м';
  document.getElementById('final-jumps').textContent = game.jumps;
  document.getElementById('final-best').textContent = getBest(config.player) + 'м';
  const msg = document.getElementById('new-record-msg');
  msg.style.display = isNew ? 'block' : 'none';
  showScreen('gameover-screen');
}

// ── Render dispatcher ──────────────────────────────────────────────────────
function render() {
  if (config.theme === 'classic') renderClassic(game);
  else renderElasto(game);
}

// ── Elasto render ──────────────────────────────────────────────────────────
function renderElasto(g) {
  const W = canvas.width, H = canvas.height;

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#010308');
  sky.addColorStop(0.55, '#0D1F3C');
  sky.addColorStop(1, '#071007');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  g.stars.forEach(s => {
    ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
    ctx.fillRect(s.x, s.y, s.size, s.size);
  });

  drawBackgroundHills(g);
  drawTerrain(g);

  g.obstacles.forEach(ob => {
    const sx = ob.worldX - g.distPixels + g.horseScreenX;
    if (sx > -200 && sx < W + 200) drawObstacleElasto(ob, sx, groundYAt(ob.worldX));
  });

  if (g.invincible === 0 || Math.floor(g.invincible / 6) % 2 === 0)
    drawHorseElasto(g.horseScreenX, g.horseY, g.horseW, g.horseH, g.gallopPhase, g.onGround);
}

// ── Classic theme ──────────────────────────────────────────────────────────
const BIOME_LEN = 500;
const BIOMES = [
  { name: 'meadow',   skyT: '#5BAADB', skyB: '#D4EDFA', h1: '#A8D870', h2: '#7EB84A', gFill: '#5DA832', gLine: '#3A7018' },
  { name: 'forest',   skyT: '#3A7AB5', skyB: '#8FC8E8', h1: '#2A6828', h2: '#1E5020', gFill: '#2A6018', gLine: '#1A4010' },
  { name: 'mountain', skyT: '#8898C0', skyB: '#C8D8E8', h1: '#9098A8', h2: '#6A7888', gFill: '#7A8A6A', gLine: '#506048' },
  { name: 'sunset',   skyT: '#E8521A', skyB: '#FFB060', h1: '#2A1838', h2: '#18101E', gFill: '#1E2A10', gLine: '#304018' },
];

function getBiome(dist) {
  const i = Math.floor(dist / BIOME_LEN) % BIOMES.length;
  const next = (i + 1) % BIOMES.length;
  const pos = (dist % BIOME_LEN) / BIOME_LEN;
  const t = pos > 0.82 ? (pos - 0.82) / 0.18 : 0;
  return { cur: BIOMES[i], nxt: BIOMES[next], t };
}

function blendHex(a, b, t) { return lerpColor(a, b, t); }

function renderClassic(g) {
  const W = canvas.width, H = canvas.height;
  const { cur, nxt, t } = getBiome(g.distance);

  // Sky
  const skyTop = blendHex(cur.skyT, nxt.skyT, t);
  const skyBot = blendHex(cur.skyB, nxt.skyB, t);
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.75);
  sky.addColorStop(0, skyTop);
  sky.addColorStop(1, skyBot);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Biome-specific background elements
  drawBiomeBg(g, cur, nxt, t);

  // Clouds
  drawClouds(g);

  // Terrain
  drawTerrainClassic(g, cur, nxt, t);

  // Obstacles
  g.obstacles.forEach(ob => {
    const sx = ob.worldX - g.distPixels + g.horseScreenX;
    if (sx > -200 && sx < W + 200) drawObstacleClassic(ob, sx, groundYAt(ob.worldX));
  });

  // Horse (no neon glow in classic mode)
  if (g.invincible === 0 || Math.floor(g.invincible / 6) % 2 === 0)
    drawHorseClassic(g.horseScreenX, g.horseY, g.horseW, g.horseH, g.gallopPhase, g.onGround);
}

function drawBiomeBg(g, cur, nxt, t) {
  const W = canvas.width, H = canvas.height;
  const base = H * GROUND_BASE_FRAC;
  const biome = t < 0.5 ? cur.name : nxt.name;

  // Far hill layer
  const h1 = blendHex(cur.h1, nxt.h1, t);
  ctx.fillStyle = h1;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let sx = 0; sx <= W; sx += 14) {
    const wx = (sx - g.horseScreenX + g.distPixels) * 0.25;
    const ty = base - 70 + Math.sin(wx * 0.004) * 55 + Math.sin(wx * 0.009) * 25;
    sx === 0 ? ctx.moveTo(0, ty) : ctx.lineTo(sx, ty);
  }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();

  // Mid hill layer
  const h2 = blendHex(cur.h2, nxt.h2, t);
  ctx.fillStyle = h2;
  ctx.beginPath();
  for (let sx = 0; sx <= W; sx += 10) {
    const wx = (sx - g.horseScreenX + g.distPixels) * 0.5;
    const ty = base - 35 + Math.sin(wx * 0.006) * 32 + Math.sin(wx * 0.014) * 14;
    sx === 0 ? ctx.moveTo(0, ty) : ctx.lineTo(sx, ty);
  }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();

  // Biome decorations
  if (biome === 'meadow') drawMeadowDeco(g, base);
  else if (biome === 'forest') drawForestDeco(g, base, h1);
  else if (biome === 'mountain') drawMountainDeco(g, base);
  else if (biome === 'sunset') drawSunsetDeco(g, base);
}

function drawMeadowDeco(g, base) {
  // Sun
  const W = canvas.width;
  ctx.fillStyle = '#FFE566';
  ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 30;
  ctx.beginPath();
  ctx.arc(W * 0.85, canvas.height * 0.12, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Flowers as small coloured dots on far hill
  const FLOWER_COLORS = ['#FF6B9D','#FFD700','#FF8C42','#A8FF5A'];
  for (let i = 0; i < 18; i++) {
    const wx = g.distPixels * 0.25 + i * 180 + 40;
    const sx = ((wx % (W + 200)) + W + 200) % (W + 200) - 100;
    const ty = base - 62 + Math.sin(wx * 0.004) * 55 + Math.sin(wx * 0.009) * 25 - 6;
    ctx.fillStyle = FLOWER_COLORS[i % 4];
    ctx.beginPath(); ctx.arc(sx, ty, 4, 0, Math.PI * 2); ctx.fill();
  }
}

function drawForestDeco(g, base, hillColor) {
  const W = canvas.width;
  ctx.fillStyle = darkenColor(hillColor.startsWith('rgb') ? '#2A6828' : hillColor, 0.15);
  for (let i = 0; i < 14; i++) {
    const wx = g.distPixels * 0.25 + i * 130 + 20;
    const sx = ((wx % (W + 300)) + W + 300) % (W + 300) - 150;
    const treeH = 55 + (i % 3) * 18;
    const ty = base - 68 + Math.sin(wx * 0.004) * 55;
    drawPine(sx, ty, treeH, '#1A4818');
    drawPine(sx + 22, ty + 8, treeH * 0.8, '#234020');
  }
}

function drawPine(x, y, h, color) {
  ctx.fillStyle = color;
  // Three layers of triangle
  [[0.38, 0], [0.46, 0.28], [0.55, 0.52]].forEach(([w, topFrac]) => {
    ctx.beginPath();
    ctx.moveTo(x, y - h * (1 - topFrac));
    ctx.lineTo(x - h * w, y - h * topFrac * 0.05);
    ctx.lineTo(x + h * w, y - h * topFrac * 0.05);
    ctx.closePath(); ctx.fill();
  });
  // Trunk
  ctx.fillStyle = '#5D3A1A';
  ctx.fillRect(x - 4, y, 8, h * 0.2);
}

function drawMountainDeco(g, base) {
  const W = canvas.width;
  // Snow-capped peaks in background
  const peaks = [
    [W * 0.1, base - 160, 110],
    [W * 0.3, base - 200, 140],
    [W * 0.55, base - 175, 120],
    [W * 0.75, base - 220, 160],
    [W * 0.95, base - 150, 100],
  ];
  peaks.forEach(([px, py, pw]) => {
    ctx.fillStyle = '#9098A8';
    ctx.beginPath();
    ctx.moveTo(px, py); ctx.lineTo(px - pw / 2, base - 30); ctx.lineTo(px + pw / 2, base - 30);
    ctx.closePath(); ctx.fill();
    // Snow cap
    ctx.fillStyle = '#EEF2F5';
    ctx.beginPath();
    ctx.moveTo(px, py); ctx.lineTo(px - pw * 0.18, py + pw * 0.22); ctx.lineTo(px + pw * 0.18, py + pw * 0.22);
    ctx.closePath(); ctx.fill();
  });
}

function drawSunsetDeco(g, base) {
  const W = canvas.width, H = canvas.height;
  // Sun on horizon
  const sunGrad = ctx.createRadialGradient(W * 0.7, base - 40, 5, W * 0.7, base - 40, 80);
  sunGrad.addColorStop(0, 'rgba(255,220,50,0.9)');
  sunGrad.addColorStop(0.4, 'rgba(255,120,20,0.5)');
  sunGrad.addColorStop(1, 'rgba(255,80,0,0)');
  ctx.fillStyle = sunGrad;
  ctx.fillRect(0, 0, W, H);
  // Silhouette trees
  for (let i = 0; i < 10; i++) {
    const wx = g.distPixels * 0.25 + i * 160 + 60;
    const sx = ((wx % (W + 300)) + W + 300) % (W + 300) - 150;
    drawPine(sx, base - 68 + Math.sin(wx * 0.004) * 55, 60, '#110A18');
  }
}

function drawClouds(g) {
  const W = canvas.width;
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  for (let i = 0; i < 5; i++) {
    const wx = g.distPixels * 0.15 + i * (W / 4) + 80;
    const sx = ((wx % (W + 200)) + W + 200) % (W + 200) - 100;
    const cy = canvas.height * (0.08 + (i % 3) * 0.07);
    const cw = 70 + (i % 3) * 40;
    const r = cw / 4;
    ctx.beginPath();
    ctx.arc(sx + r,      cy + r,      r,      0, Math.PI * 2);
    ctx.arc(sx + r * 1.9, cy + r * 0.6, r * 1.2, 0, Math.PI * 2);
    ctx.arc(sx + r * 3.1, cy + r,      r,      0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTerrainClassic(g, cur, nxt, t) {
  const W = canvas.width, H = canvas.height;
  const step = 6;
  const gFill = blendHex(cur.gFill, nxt.gFill, t);
  const gLine = blendHex(cur.gLine, nxt.gLine, t);

  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let sx = 0; sx <= W; sx += step) {
    const ty = groundYAt(sx - g.horseScreenX + g.distPixels);
    sx === 0 ? ctx.moveTo(0, ty) : ctx.lineTo(sx, ty);
  }
  ctx.lineTo(W, H); ctx.closePath();

  // Gradient fill terrain
  const grad = ctx.createLinearGradient(0, H * GROUND_BASE_FRAC - 40, 0, H);
  grad.addColorStop(0, gFill);
  grad.addColorStop(0.3, darkenColor(gFill.startsWith('rgb') ? cur.gFill : gFill, 0.15));
  grad.addColorStop(1, darkenColor(cur.gFill, 0.35));
  ctx.fillStyle = grad;
  ctx.fill();

  // Terrain surface line
  ctx.beginPath();
  for (let sx = 0; sx <= W; sx += step) {
    const ty = groundYAt(sx - g.horseScreenX + g.distPixels);
    sx === 0 ? ctx.moveTo(0, ty) : ctx.lineTo(sx, ty);
  }
  ctx.strokeStyle = gLine;
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

function drawObstacleClassic(ob, sx, groundY) {
  const top = groundY - ob.h;
  const c = ob.color;

  if (ob.type === 'wall') {
    // Stone wall - warm grey
    const grad = ctx.createLinearGradient(sx, top, sx + ob.w, top);
    grad.addColorStop(0, '#A09080'); grad.addColorStop(1, '#8A7868');
    ctx.fillStyle = grad;
    ctx.fillRect(sx, top, ob.w, ob.h);
    ctx.strokeStyle = '#6A5848'; ctx.lineWidth = 1.5;
    ctx.strokeRect(sx, top, ob.w, ob.h);
    for (let row = 10; row < ob.h; row += 10) {
      ctx.beginPath(); ctx.moveTo(sx, top + row); ctx.lineTo(sx + ob.w, top + row); ctx.stroke();
    }
    ctx.fillStyle = c; ctx.fillRect(sx - 3, top - 6, ob.w + 6, 6);
    ctx.strokeStyle = darkenColor(c, 0.3); ctx.lineWidth = 1; ctx.strokeRect(sx - 3, top - 6, ob.w + 6, 6);
  } else if (ob.type === 'oxer') {
    const spread = ob.w * 0.9;
    drawPoleClassic(sx, top, ob.w, ob.h, c);
    drawPoleClassic(sx + spread, top + ob.h * 0.15, ob.w, ob.h * 0.85, c);
    ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, top - 2); ctx.lineTo(sx + spread + ob.w, top + ob.h * 0.13); ctx.stroke();
  } else {
    drawPoleClassic(sx, top, ob.w, ob.h, c);
  }
}

function drawPoleClassic(x, y, w, h, c) {
  // Wooden posts
  const postGrad = ctx.createLinearGradient(x, 0, x + 8, 0);
  postGrad.addColorStop(0, '#8B5E3C'); postGrad.addColorStop(1, '#6B4628');
  ctx.fillStyle = postGrad;
  ctx.strokeStyle = '#4A3020'; ctx.lineWidth = 1;
  ctx.fillRect(x - 4, y, 8, h); ctx.strokeRect(x - 4, y, 8, h);
  ctx.fillRect(x + w - 4, y, 8, h); ctx.strokeRect(x + w - 4, y, 8, h);

  // Rails with stripes
  const rails = 3;
  for (let i = 0; i < rails; i++) {
    const ry = y + (h / (rails + 1)) * (i + 1);
    ctx.fillStyle = i % 2 === 0 ? c : '#FFFFFF';
    ctx.fillRect(x - 2, ry - 4, w + 4, 8);
    const alt = i % 2 === 0 ? '#FFFFFF' : c;
    for (let s = 0; s < Math.ceil(w / 16); s++) {
      ctx.fillStyle = s % 2 === 0 ? alt : c;
      ctx.fillRect(x + s * 16, ry - 4, 8, 8);
    }
    ctx.strokeStyle = darkenColor(c, 0.25); ctx.lineWidth = 1.5;
    ctx.strokeRect(x - 2, ry - 4, w + 4, 8);
  }
}

// ── Horse (classic – no neon glow) ────────────────────────────────────────
function drawHorseClassic(x, y, w, h, phase, onGround) {
  // Same as drawHorseElasto but with shadowBlur = 0 throughout
  ctx.save();
  ctx.translate(x + w, y);
  ctx.scale(-1, 1);

  const coat = config.horseCoat;
  const gear = config.gearColor;
  const outline = darkenColor(coat, 0.35);
  const lw = Math.max(1.5, w * 0.016);

  const bw = w * 0.48, bh = h * 0.38;
  const bx = w * 0.22, by = h * 0.38;
  const hx2 = bx - w * 0.04, hy2 = by - bh * 0.7;

  const legAngles = onGround ? [
    Math.sin(phase * Math.PI / 2) * 0.28,
    Math.sin((phase + 2) * Math.PI / 2) * 0.28,
    Math.sin((phase + 1) * Math.PI / 2) * 0.28,
    Math.sin((phase + 3) * Math.PI / 2) * 0.28,
  ] : [-0.42, 0.45, -0.3, 0.35];

  const legW = w * 0.065, legH = h * 0.38;
  const legPos = [
    [bx + bw * 0.18, by + bh * 0.85], [bx + bw * 0.32, by + bh * 0.85],
    [bx + bw * 0.62, by + bh * 0.85], [bx + bw * 0.78, by + bh * 0.85],
  ];

  [2, 3].forEach(i => drawLeg(legPos[i], legAngles[i], legW, legH, coat, outline, lw));

  // Tail
  ctx.strokeStyle = gear; ctx.lineWidth = lw * 2; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bx + bw, by + bh * 0.4);
  ctx.quadraticCurveTo(bx + bw + w * 0.2, by + bh * 0.95, bx + bw + w * 0.08, by + bh * 1.4);
  ctx.stroke();

  // Body
  ctx.fillStyle = coat; ctx.strokeStyle = outline; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.ellipse(bx + bw / 2, by + bh / 2, bw / 2, bh / 2, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  drawMarkingsElasto(bx, by, bw, bh);

  // Neck
  ctx.fillStyle = coat; ctx.strokeStyle = outline; ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(bx + w * 0.05, by + bh * 0.2);
  ctx.quadraticCurveTo(bx - w * 0.04, by - bh * 0.3, bx, by - bh * 0.55);
  ctx.quadraticCurveTo(bx + w * 0.12, by - bh * 0.6, bx + w * 0.12, by + bh * 0.1);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Head
  ctx.fillStyle = coat; ctx.strokeStyle = outline; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.ellipse(hx2, hy2, w * 0.1, h * 0.1, -0.4, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  // Nose
  ctx.fillStyle = lerpColor(coat, '#000000', 0.2);
  ctx.beginPath(); ctx.ellipse(hx2 - w * 0.08, hy2 + h * 0.02, w * 0.055, h * 0.055, 0, 0, Math.PI * 2); ctx.fill();

  // Nostril
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(hx2 - w * 0.112, hy2 + h * 0.03, w * 0.01, 0, Math.PI * 2); ctx.fill();

  // Eye (normal, no glow)
  ctx.fillStyle = '#2A1A0A';
  ctx.beginPath(); ctx.arc(hx2 - w * 0.04, hy2 - h * 0.015, w * 0.02, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(hx2 - w * 0.038, hy2 - h * 0.019, w * 0.007, 0, Math.PI * 2); ctx.fill();

  // Ear
  ctx.fillStyle = coat; ctx.strokeStyle = outline; ctx.lineWidth = lw * 0.8;
  ctx.beginPath();
  ctx.moveTo(hx2 + w * 0.04, hy2 - h * 0.08); ctx.lineTo(hx2 + w * 0.07, hy2 - h * 0.17);
  ctx.lineTo(hx2 + w * 0.02, hy2 - h * 0.09); ctx.closePath(); ctx.fill(); ctx.stroke();

  // Mane (natural color, no glow)
  const maneX = bx + w * 0.02, maneY = by - bh * 0.2;
  ctx.fillStyle = darkenColor(coat, 0.28); ctx.strokeStyle = darkenColor(coat, 0.45); ctx.lineWidth = lw * 0.5;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath(); ctx.arc(maneX + i * w * 0.038, maneY - i * h * 0.04, w * 0.03, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }

  if (config.marking === 'star') {
    ctx.fillStyle = config.markingColor;
    ctx.beginPath(); ctx.arc(hx2 - w * 0.01, hy2 - h * 0.01, w * 0.03, 0, Math.PI * 2); ctx.fill();
  }

  [0, 1].forEach(i => drawLeg(legPos[i], legAngles[i], legW, legH, coat, outline, lw));

  // Gear straps (no glow)
  ctx.strokeStyle = gear; ctx.lineWidth = Math.max(2, w * 0.022); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(bx + bw * 0.28, by + bh * 0.7, bh * 0.35, 0, Math.PI, false); ctx.stroke();
  ctx.beginPath(); ctx.arc(hx2, hy2, w * 0.07, 0.2, Math.PI * 1.4); ctx.stroke();

  drawRiderClassic(bx + bw * 0.3, by - h * 0.05, w, h);
  ctx.restore();
}

function drawRiderClassic(rx, ry, w, h) {
  const outfit = config.outfitColor;
  const hair = config.hairColor;
  const isGirl = config.gender === 'girl';
  const lw = Math.max(1.5, w * 0.014);

  ctx.fillStyle = outfit; ctx.strokeStyle = darkenColor(outfit, 0.35); ctx.lineWidth = lw;
  ctx.beginPath(); ctx.ellipse(rx, ry - h * 0.22, w * 0.09, h * 0.14, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  ctx.fillStyle = lerpColor(outfit, '#FFFFFF', 0.5);
  ctx.fillRect(rx - w * 0.055, ry - h * 0.1, w * 0.05, h * 0.15);
  ctx.fillRect(rx + w * 0.005, ry - h * 0.1, w * 0.05, h * 0.15);

  ctx.fillStyle = '#3A2010';
  ctx.fillRect(rx - w * 0.055, ry + h * 0.04, w * 0.05, h * 0.06);
  ctx.fillRect(rx + w * 0.005, ry + h * 0.04, w * 0.05, h * 0.06);

  ctx.fillStyle = '#FDBCB4'; ctx.strokeStyle = '#C49086'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(rx, ry - h * 0.38, w * 0.065, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  ctx.fillStyle = darkenColor(outfit, 0.25); ctx.strokeStyle = outfit; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(rx, ry - h * 0.41, w * 0.07, Math.PI, 0); ctx.fill(); ctx.stroke();
  ctx.fillRect(rx - w * 0.07, ry - h * 0.41, w * 0.14, h * 0.03);

  ctx.fillStyle = hair;
  if (isGirl) {
    ctx.beginPath(); ctx.arc(rx, ry - h * 0.37, w * 0.055, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = hair; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(rx + w * 0.05, ry - h * 0.38);
    ctx.quadraticCurveTo(rx + w * 0.1, ry - h * 0.25, rx + w * 0.06, ry - h * 0.18); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(rx, ry - h * 0.37, w * 0.05, 0, Math.PI); ctx.fill();
  }

  ctx.strokeStyle = outfit; ctx.lineWidth = Math.max(4, w * 0.04); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(rx - w * 0.06, ry - h * 0.25); ctx.lineTo(rx - w * 0.12, ry - h * 0.12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(rx + w * 0.06, ry - h * 0.25); ctx.lineTo(rx + w * 0.12, ry - h * 0.12); ctx.stroke();
}

function drawBackgroundHills(g) {
  const W = canvas.width;
  const H = canvas.height;
  const base = canvas.height * GROUND_BASE_FRAC;

  // Far hills - dark violet
  ctx.fillStyle = '#0D0A1F';
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let sx = 0; sx <= W; sx += 14) {
    const wx = sx - g.horseScreenX + g.distPixels * 0.3;
    const ty = base - 55 + Math.sin(wx * 0.003) * 48 + Math.sin(wx * 0.007) * 22;
    sx === 0 ? ctx.moveTo(0, ty) : ctx.lineTo(sx, ty);
  }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();

  // Mid hills - dark green
  ctx.fillStyle = '#060F06';
  ctx.beginPath();
  for (let sx = 0; sx <= W; sx += 10) {
    const wx = sx - g.horseScreenX + g.distPixels * 0.6;
    const ty = base - 22 + Math.sin(wx * 0.005) * 28 + Math.sin(wx * 0.013) * 12;
    sx === 0 ? ctx.moveTo(0, ty) : ctx.lineTo(sx, ty);
  }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
}

function drawTerrain(g) {
  const W = canvas.width;
  const H = canvas.height;
  const step = 6;

  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let sx = 0; sx <= W; sx += step) {
    const ty = groundYAt(sx - g.horseScreenX + g.distPixels);
    sx === 0 ? ctx.moveTo(0, ty) : ctx.lineTo(sx, ty);
  }
  ctx.lineTo(W, H); ctx.closePath();
  ctx.fillStyle = '#071207';
  ctx.fill();

  // Neon green surface line
  ctx.beginPath();
  for (let sx = 0; sx <= W; sx += step) {
    const ty = groundYAt(sx - g.horseScreenX + g.distPixels);
    sx === 0 ? ctx.moveTo(0, ty) : ctx.lineTo(sx, ty);
  }
  ctx.strokeStyle = '#39FF14';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#39FF14';
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Speed dashes below surface
  ctx.strokeStyle = 'rgba(57,255,20,0.18)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    const offset = (g.distPixels * 0.7 + (W / 7) * i) % W;
    const ty = groundYAt(offset - g.horseScreenX + g.distPixels) + 12;
    ctx.beginPath();
    ctx.moveTo(offset, ty);
    ctx.lineTo(offset + 28, ty);
    ctx.stroke();
  }
}

// ── Obstacle rendering ─────────────────────────────────────────────────────
function drawObstacleElasto(ob, sx, groundY) {
  const c = ob.color;
  const top = groundY - ob.h;

  if (ob.type === 'wall') {
    ctx.fillStyle = '#0E0E0E';
    ctx.fillRect(sx, top, ob.w, ob.h);
    ctx.strokeStyle = c;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx, top, ob.w, ob.h);
    ctx.strokeStyle = `${c}44`;
    ctx.lineWidth = 1;
    for (let row = 10; row < ob.h; row += 10) {
      ctx.beginPath(); ctx.moveTo(sx, top + row); ctx.lineTo(sx + ob.w, top + row); ctx.stroke();
    }
    ctx.fillStyle = c;
    ctx.shadowColor = c; ctx.shadowBlur = 10;
    ctx.fillRect(sx - 3, top - 6, ob.w + 6, 6);
    ctx.shadowBlur = 0;
  } else if (ob.type === 'oxer') {
    const spread = ob.w * 0.9;
    drawPoleElasto(sx, top, ob.w, ob.h, c);
    drawPoleElasto(sx + spread, top + ob.h * 0.15, ob.w, ob.h * 0.85, c);
    ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.shadowColor = c; ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(sx, top - 2);
    ctx.lineTo(sx + spread + ob.w, top + ob.h * 0.13);
    ctx.stroke();
    ctx.shadowBlur = 0;
  } else {
    drawPoleElasto(sx, top, ob.w, ob.h, c);
  }
}

function drawPoleElasto(x, y, w, h, c) {
  // Posts
  ctx.fillStyle = '#1A1A1A';
  ctx.strokeStyle = c;
  ctx.lineWidth = 1.5;
  [[x - 4, y], [x + w - 4, y]].forEach(([px, py]) => {
    ctx.fillRect(px, py, 8, h);
    ctx.strokeRect(px, py, 8, h);
  });

  // Rails
  const rails = 3;
  for (let i = 0; i < rails; i++) {
    const ry = y + (h / (rails + 1)) * (i + 1);
    ctx.fillStyle = '#111';
    ctx.fillRect(x - 2, ry - 4, w + 4, 8);
    const n = Math.ceil(w / 16);
    for (let s = 0; s < n; s++) {
      ctx.fillStyle = s % 2 === 0 ? c : `${c}44`;
      ctx.fillRect(x + s * 16, ry - 4, 8, 8);
    }
    ctx.strokeStyle = c; ctx.lineWidth = 1.5;
    ctx.strokeRect(x - 2, ry - 4, w + 4, 8);
  }

  ctx.shadowColor = c; ctx.shadowBlur = 10;
  ctx.strokeStyle = c; ctx.lineWidth = 0.8;
  ctx.strokeRect(x - 2, y, w + 4, h);
  ctx.shadowBlur = 0;
}

// ── Horse rendering (Elastomania vector style) ─────────────────────────────
function drawHorseElasto(x, y, w, h, phase, onGround) {
  ctx.save();
  // Flip horizontally so horse faces right (direction of travel)
  ctx.translate(x + w, y);
  ctx.scale(-1, 1);

  const coat = config.horseCoat;
  const gear = config.gearColor;
  const outline = darkenColor(coat, 0.35);
  const lw = Math.max(1.5, w * 0.016);

  const bw = w * 0.48, bh = h * 0.38;
  const bx = w * 0.22, by = h * 0.38;
  const hx2 = bx - w * 0.04, hy2 = by - bh * 0.7;

  const legAngles = onGround ? [
    Math.sin(phase * Math.PI / 2) * 0.28,
    Math.sin((phase + 2) * Math.PI / 2) * 0.28,
    Math.sin((phase + 1) * Math.PI / 2) * 0.28,
    Math.sin((phase + 3) * Math.PI / 2) * 0.28,
  ] : [-0.42, 0.45, -0.3, 0.35];

  const legW = w * 0.065, legH = h * 0.38;
  const legPos = [
    [bx + bw * 0.18, by + bh * 0.85],
    [bx + bw * 0.32, by + bh * 0.85],
    [bx + bw * 0.62, by + bh * 0.85],
    [bx + bw * 0.78, by + bh * 0.85],
  ];

  // Back legs
  [2, 3].forEach(i => drawLeg(legPos[i], legAngles[i], legW, legH, coat, outline, lw));

  // Tail (neon)
  ctx.strokeStyle = gear;
  ctx.lineWidth = lw * 2;
  ctx.lineCap = 'round';
  ctx.shadowColor = gear; ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.moveTo(bx + bw, by + bh * 0.4);
  ctx.quadraticCurveTo(bx + bw + w * 0.2, by + bh * 0.95, bx + bw + w * 0.08, by + bh * 1.4);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Body
  ctx.fillStyle = coat;
  ctx.strokeStyle = outline;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.ellipse(bx + bw / 2, by + bh / 2, bw / 2, bh / 2, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  drawMarkingsElasto(bx, by, bw, bh);

  // Neck
  ctx.fillStyle = coat;
  ctx.strokeStyle = outline;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(bx + w * 0.05, by + bh * 0.2);
  ctx.quadraticCurveTo(bx - w * 0.04, by - bh * 0.3, bx, by - bh * 0.55);
  ctx.quadraticCurveTo(bx + w * 0.12, by - bh * 0.6, bx + w * 0.12, by + bh * 0.1);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Head
  ctx.fillStyle = coat;
  ctx.strokeStyle = outline;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.ellipse(hx2, hy2, w * 0.1, h * 0.1, -0.4, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  // Nose
  ctx.fillStyle = lerpColor(coat, '#000000', 0.2);
  ctx.beginPath();
  ctx.ellipse(hx2 - w * 0.08, hy2 + h * 0.02, w * 0.055, h * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nostril
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(hx2 - w * 0.112, hy2 + h * 0.03, w * 0.01, 0, Math.PI * 2);
  ctx.fill();

  // Eye (neon glow)
  ctx.fillStyle = '#00FFFF';
  ctx.shadowColor = '#00FFFF'; ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(hx2 - w * 0.04, hy2 - h * 0.015, w * 0.02, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(hx2 - w * 0.04, hy2 - h * 0.015, w * 0.01, 0, Math.PI * 2);
  ctx.fill();

  // Ear
  ctx.fillStyle = coat; ctx.strokeStyle = outline; ctx.lineWidth = lw * 0.8;
  ctx.beginPath();
  ctx.moveTo(hx2 + w * 0.04, hy2 - h * 0.08);
  ctx.lineTo(hx2 + w * 0.07, hy2 - h * 0.17);
  ctx.lineTo(hx2 + w * 0.02, hy2 - h * 0.09);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Mane (buns, neon)
  const maneX = bx + w * 0.02, maneY = by - bh * 0.2;
  ctx.fillStyle = gear;
  ctx.strokeStyle = darkenColor(gear, 0.3);
  ctx.shadowColor = gear; ctx.shadowBlur = 5;
  ctx.lineWidth = lw * 0.5;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(maneX + i * w * 0.038, maneY - i * h * 0.04, w * 0.03, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }
  ctx.shadowBlur = 0;

  // Face marking
  if (config.marking === 'star') {
    ctx.fillStyle = config.markingColor;
    ctx.beginPath();
    ctx.arc(hx2 - w * 0.01, hy2 - h * 0.01, w * 0.03, 0, Math.PI * 2);
    ctx.fill();
  }

  // Front legs
  [0, 1].forEach(i => drawLeg(legPos[i], legAngles[i], legW, legH, coat, outline, lw));

  // Gear straps (neon glow)
  ctx.strokeStyle = gear;
  ctx.lineWidth = Math.max(2, w * 0.022);
  ctx.lineCap = 'round';
  ctx.shadowColor = gear; ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(bx + bw * 0.28, by + bh * 0.7, bh * 0.35, 0, Math.PI, false);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(hx2, hy2, w * 0.07, 0.2, Math.PI * 1.4);
  ctx.stroke();
  ctx.shadowBlur = 0;

  drawRiderElasto(bx + bw * 0.3, by - h * 0.05, w, h);

  ctx.restore();
}

function drawLeg(pos, angle, legW, legH, coat, outline, lw) {
  const [lx, ly] = pos;
  const half = legH * 0.5;
  const dx = Math.sin(angle) * half;
  const endX = lx + dx + Math.sin(angle * 0.7) * half;
  const endY = ly + legH;
  const midX = lx + dx, midY = ly + half;

  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = outline; ctx.lineWidth = legW + lw;
  ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(midX, midY); ctx.lineTo(endX, endY); ctx.stroke();
  ctx.strokeStyle = coat; ctx.lineWidth = legW;
  ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(midX, midY); ctx.lineTo(endX, endY); ctx.stroke();

  ctx.fillStyle = '#222'; ctx.strokeStyle = '#444'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(endX, endY, legW * 0.7, legW * 0.35, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  if (config.marking === 'socks') {
    ctx.strokeStyle = config.markingColor;
    ctx.lineWidth = legW * 0.65; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lx + dx * 0.5, ly + legH * 0.65);
    ctx.lineTo(endX, endY - legW);
    ctx.stroke();
  }
}

function drawMarkingsElasto(bx, by, bw, bh) {
  const type = config.marking;
  if (!type || type === 'none' || type === 'star' || type === 'stripe' || type === 'socks') return;
  ctx.fillStyle = config.markingColor;
  if (type === 'pinto') {
    ctx.beginPath();
    ctx.ellipse(bx + bw * 0.35, by + bh * 0.4, bw * 0.2, bh * 0.25, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.ellipse(bx + bw * 0.65, by + bh * 0.55, bw * 0.15, bh * 0.2, -0.2, 0, Math.PI * 2); ctx.fill();
  } else if (type === 'appaloosa') {
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.arc(bx + bw * (0.5 + Math.cos(i * 0.9) * 0.3), by + bh * (0.5 + Math.sin(i * 1.2) * 0.3), bw * 0.04, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawRiderElasto(rx, ry, w, h) {
  const outfit = config.outfitColor;
  const hair = config.hairColor;
  const isGirl = config.gender === 'girl';
  const lw = Math.max(1.5, w * 0.014);

  // Body
  ctx.fillStyle = outfit;
  ctx.strokeStyle = darkenColor(outfit, 0.35);
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.ellipse(rx, ry - h * 0.22, w * 0.09, h * 0.14, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  // Breeches
  ctx.fillStyle = lerpColor(outfit, '#FFFFFF', 0.5);
  ctx.fillRect(rx - w * 0.055, ry - h * 0.1, w * 0.05, h * 0.15);
  ctx.fillRect(rx + w * 0.005, ry - h * 0.1, w * 0.05, h * 0.15);

  // Boots
  ctx.fillStyle = '#111';
  ctx.fillRect(rx - w * 0.055, ry + h * 0.04, w * 0.05, h * 0.06);
  ctx.fillRect(rx + w * 0.005, ry + h * 0.04, w * 0.05, h * 0.06);

  // Head
  ctx.fillStyle = '#FDBCB4'; ctx.strokeStyle = '#C49086'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(rx, ry - h * 0.38, w * 0.065, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  // Helmet (neon outline)
  ctx.fillStyle = darkenColor(outfit, 0.25);
  ctx.strokeStyle = outfit; ctx.lineWidth = 2;
  ctx.shadowColor = outfit; ctx.shadowBlur = 5;
  ctx.beginPath(); ctx.arc(rx, ry - h * 0.41, w * 0.07, Math.PI, 0);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = darkenColor(outfit, 0.25);
  ctx.fillRect(rx - w * 0.07, ry - h * 0.41, w * 0.14, h * 0.03);
  ctx.shadowBlur = 0;

  // Hair
  ctx.fillStyle = hair; ctx.strokeStyle = hair; ctx.lineWidth = 1;
  if (isGirl) {
    ctx.beginPath(); ctx.arc(rx, ry - h * 0.37, w * 0.055, 0, Math.PI); ctx.fill();
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rx + w * 0.05, ry - h * 0.38);
    ctx.quadraticCurveTo(rx + w * 0.1, ry - h * 0.25, rx + w * 0.06, ry - h * 0.18);
    ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(rx, ry - h * 0.37, w * 0.05, 0, Math.PI); ctx.fill();
  }

  // Arms
  ctx.strokeStyle = outfit; ctx.lineWidth = Math.max(4, w * 0.04); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(rx - w * 0.06, ry - h * 0.25); ctx.lineTo(rx - w * 0.12, ry - h * 0.12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(rx + w * 0.06, ry - h * 0.25); ctx.lineTo(rx + w * 0.12, ry - h * 0.12); ctx.stroke();
}

// ── Color utils ────────────────────────────────────────────────────────────
function lerpColor(a, b, t) {
  const parse = h => h.startsWith('#')
    ? [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]
    : [128, 128, 128];
  const [r1,g1,b1] = parse(a), [r2,g2,b2] = parse(b);
  return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
}

function darkenColor(hex, amount) {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return '#888';
  const r = Math.max(0, parseInt(hex.slice(1,3),16) * (1-amount));
  const g = Math.max(0, parseInt(hex.slice(3,5),16) * (1-amount));
  const b = Math.max(0, parseInt(hex.slice(5,7),16) * (1-amount));
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}
