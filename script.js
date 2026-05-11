const progressBar = document.querySelector('.scroll-progress');
const nav = document.querySelector('nav');
const hero = document.querySelector('.hero');
const cursor = document.querySelector('.cursor');

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
