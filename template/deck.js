const slides = document.querySelectorAll('.slide');
const dotsEl = document.getElementById('dots');
const countEl = document.getElementById('count');
const navEl = document.querySelector('.nav');
let cur = 0;
const total = slides.length;

const SCROLL_DIR_THRESHOLD = 6;
const SCROLL_HIDE_MIN = 28;
let lastSlideScrollTop = 0;
let navTouchStart = null;

function showNav() {
  if (navEl) navEl.classList.remove('nav--hidden');
}

function hideNav() {
  if (navEl) navEl.classList.add('nav--hidden');
}

function onSlideScroll(e) {
  const el = e.currentTarget;
  const st = el.scrollTop;
  const dy = st - lastSlideScrollTop;
  if (Math.abs(dy) < SCROLL_DIR_THRESHOLD) {
    lastSlideScrollTop = st;
    return;
  }
  if (dy > 0 && st > SCROLL_HIDE_MIN) hideNav();
  else if (dy < 0) showNav();
  lastSlideScrollTop = st;
}

function bindActiveSlideScroll() {
  slides.forEach((s) => s.removeEventListener('scroll', onSlideScroll));
  const active = document.querySelector('.slide.active');
  if (active) {
    lastSlideScrollTop = active.scrollTop;
    active.addEventListener('scroll', onSlideScroll, { passive: true });
  }
}

document.addEventListener('click', (e) => {
  if (!navEl || navEl.contains(e.target)) return;
  showNav();
});

document.addEventListener('touchstart', (e) => {
  if (e.touches.length !== 1) return;
  const t = e.touches[0];
  navTouchStart = { x: t.clientX, y: t.clientY };
}, { passive: true });

document.addEventListener('touchend', (e) => {
  if (!navTouchStart || !navEl || !e.changedTouches.length) return;
  const t = e.changedTouches[0];
  const dx = Math.abs(t.clientX - navTouchStart.x);
  const dy = Math.abs(t.clientY - navTouchStart.y);
  navTouchStart = null;
  if (dx > 22 || dy > 22) return;
  if (!navEl.contains(t.target)) showNav();
}, { passive: true });

slides.forEach((_, i) => {
  const d = document.createElement('div');
  d.className = 'dot' + (i === 0 ? ' active' : '');
  d.onclick = () => goTo(i);
  dotsEl.appendChild(d);
});

function updateNavAppearance() {
  if (!navEl) return;
  const active = document.querySelector('.slide.active');
  navEl.classList.remove('appearance-on-light', 'appearance-on-dark');
  if (active && active.classList.contains('theme-light')) {
    navEl.classList.add('appearance-on-light');
  } else {
    navEl.classList.add('appearance-on-dark');
  }
}

function goTo(n) {
  slides[cur].classList.remove('active');
  dotsEl.children[cur].classList.remove('active');
  cur = Math.max(0, Math.min(total - 1, n));
  slides[cur].classList.add('active');
  dotsEl.children[cur].classList.add('active');
  countEl.textContent = (cur + 1) + ' / ' + total;
  updateNavAppearance();
  showNav();
  bindActiveSlideScroll();
}

function go(dir) { goTo(cur + dir); }

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(1);
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(-1);
});

goTo(0);
