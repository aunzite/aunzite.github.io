const progressBar = document.querySelector('.scroll-progress');
const nav = document.querySelector('nav');
const hero = document.querySelector('.hero');
const cursor = document.querySelector('.cursor');
const loader = document.getElementById('loader');
const loaderCount = document.getElementById('loaderCount');

// ── Loader: percentage + pencil scribble drawing itself ───────
document.body.classList.add('loading');

const loaderPath = document.getElementById('loaderPath');
const loadStart = performance.now();
const LOAD_DURATION = 1500;

function tickLoader(now) {
  const t = Math.min((now - loadStart) / LOAD_DURATION, 1);
  const eased = 1 - Math.pow(1 - t, 3);
  loaderCount.textContent = Math.floor(eased * 100) + '%';
  loaderPath.style.strokeDashoffset = 1 - eased;
  if (t < 1) {
    requestAnimationFrame(tickLoader);
  } else {
    setTimeout(finishLoad, 350);
  }
}

function finishLoad() {
  loader.classList.add('done');
  document.body.classList.remove('loading');
  document.body.classList.add('loaded');
  setTimeout(() => loader.remove(), 700);
}

requestAnimationFrame(tickLoader);

// ── Smooth scroll (Lenis) ──────────────────────────────────────
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  autoRaf: true,
});

// ── Scroll progress + nav state ────────────────────────────────
lenis.on('scroll', ({ scroll }) => {
  const scrolled = scroll / (document.body.scrollHeight - window.innerHeight);
  progressBar.style.transform = `scaleX(${scrolled})`;
  nav.classList.toggle('scrolled', scroll > hero.offsetHeight - 80);
});

// ── Scroll reveal ──────────────────────────────────────────────
const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
);
reveals.forEach((el) => observer.observe(el));

// ── Custom cursor with lerp ────────────────────────────────────
let cx = 0, cy = 0, tx = 0, ty = 0;

document.addEventListener('mousemove', (e) => {
  tx = e.clientX;
  ty = e.clientY;
});

(function animateCursor() {
  cx += (tx - cx) * 0.12;
  cy += (ty - cy) * 0.12;
  cursor.style.left = cx + 'px';
  cursor.style.top = cy + 'px';
  requestAnimationFrame(animateCursor);
})();

document.querySelectorAll('a, button, .project-header, .nav-logo').forEach((el) => {
  el.addEventListener('mouseenter', () => cursor.classList.add('grow'));
  el.addEventListener('mouseleave', () => cursor.classList.remove('grow'));
});

// ── Accordion projects ─────────────────────────────────────────
document.querySelectorAll('.project-header').forEach((header) => {
  header.addEventListener('click', () => {
    const row = header.closest('.project-row');
    const isOpen = row.classList.contains('open');
    document.querySelectorAll('.project-row.open').forEach((r) => r.classList.remove('open'));
    if (!isOpen) row.classList.add('open');
  });
});

// ── Live Discord card (Lanyard API) ────────────────────────────
const DISCORD_ID = '929787190790217828';

async function updateDiscord() {
  try {
    const res = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_ID}`);
    const { data, success } = await res.json();
    if (!success) return;

    const card = document.getElementById('discordCard');
    const avatar = document.getElementById('discordAvatar');
    const dot = document.getElementById('discordDot');
    const handle = document.getElementById('discordHandle');
    const status = document.getElementById('discordStatus');

    card.classList.add('live');
    const u = data.discord_user;
    avatar.style.backgroundImage = `url(https://cdn.discordapp.com/avatars/${DISCORD_ID}/${u.avatar}.webp?size=96)`;
    handle.textContent = u.username;
    dot.className = 'discord-dot ' + data.discord_status;

    const custom = data.activities.find((a) => a.type === 4);
    const activity = data.activities.find((a) => a.type === 0);
    if (activity) {
      status.textContent = 'playing ' + activity.name;
    } else if (custom && custom.state) {
      status.textContent = custom.state;
    } else if (data.listening_to_spotify) {
      status.textContent = '♪ ' + data.spotify.song;
    } else {
      status.textContent = data.discord_status === 'offline' ? 'currently offline' : 'online, come say hi';
    }
  } catch (e) {
    /* API down or not in Lanyard server — card stays static */
  }
}

updateDiscord();
setInterval(updateDiscord, 30000);

// ── Crayon drawing (fades 2s after you stop, page-anchored) ────
const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d');
let strokes = [];
let currentStroke = null;
let lastDrawTime = 0;
let fadeStart = null;
let drawColor = '#1c1b18';
let rafActive = false;

function sizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}
sizeCanvas();
window.addEventListener('resize', sizeCanvas);

// palette
document.querySelectorAll('.draw-color').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    drawColor = btn.dataset.color;
    document.querySelectorAll('.draw-color').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

function startStroke(x, y) {
  currentStroke = { color: drawColor, points: [{ x, y }] };
  strokes.push(currentStroke);
  lastDrawTime = performance.now();
  fadeStart = null;
  if (!rafActive) { rafActive = true; requestAnimationFrame(renderStrokes); }
}

function extendStroke(x, y) {
  if (!currentStroke) return;
  const pts = currentStroke.points;
  const last = pts[pts.length - 1];
  if (Math.hypot(x - last.x, y - last.y) > 2) {
    pts.push({ x, y });
    lastDrawTime = performance.now();
    fadeStart = null;
  }
}

document.addEventListener('pointerdown', (e) => {
  // don't draw when clicking interactive stuff
  if (e.target.closest('a, button, .project-header, nav')) return;
  document.body.classList.add('drawing');
  startStroke(e.clientX + window.scrollX, e.clientY + window.scrollY);
});

document.addEventListener('selectstart', (e) => {
  if (currentStroke) e.preventDefault();
});

document.addEventListener('pointermove', (e) => {
  if (e.buttons !== 1) { currentStroke = null; return; }
  if (currentStroke) extendStroke(e.clientX + window.scrollX, e.clientY + window.scrollY);
});

document.addEventListener('pointerup', () => {
  currentStroke = null;
  document.body.classList.remove('drawing');
});

function drawStroke(s) {
  ctx.strokeStyle = s.color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  const pts = s.points;
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  if (pts.length > 1) {
    const p = pts[pts.length - 1];
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
}

const FADE_DELAY = 2000;
const FADE_TIME = 900;

function renderStrokes(now) {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  ctx.save();
  ctx.translate(-window.scrollX, -window.scrollY);

  if (strokes.length === 0) { ctx.restore(); rafActive = false; return; }

  let alpha = 1;
  if (!currentStroke && now - lastDrawTime > FADE_DELAY) {
    if (fadeStart === null) fadeStart = now;
    alpha = Math.max(0, 1 - (now - fadeStart) / FADE_TIME);
    if (alpha === 0) {
      strokes = [];
      ctx.restore();
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      rafActive = false;
      return;
    }
  }

  ctx.globalAlpha = alpha;
  strokes.forEach(drawStroke);
  ctx.globalAlpha = 1;
  ctx.restore();
  requestAnimationFrame(renderStrokes);
}

// stop native image dragging from hijacking draw strokes
document.addEventListener('dragstart', (e) => {
  if (e.target.tagName === 'IMG') e.preventDefault();
});
