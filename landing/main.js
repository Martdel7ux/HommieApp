// Store links: fill these in once the listings are live. While empty, the
// badges show a "coming soon" message instead of navigating.
const STORE_LINKS = {
  ios: '',      // e.g. https://apps.apple.com/app/hommie/id6811326854
  android: '',  // e.g. https://play.google.com/store/apps/details?id=com.hommie.app
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// store badges
const toast = $('#toast');
let toastTimer;
function say(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}
$$('[data-store]').forEach((a) => {
  const url = STORE_LINKS[a.dataset.store];
  if (url) {
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
  } else {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      say(a.dataset.store === 'ios' ? 'Coming soon to the App Store' : 'Coming soon to Google Play');
    });
  }
});

// nav: border on scroll + mobile menu
const nav = $('#nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });
const menuBtn = $('#menubtn');
menuBtn.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', String(open));
});
$$('#navlinks a').forEach((a) => a.addEventListener('click', () => {
  nav.classList.remove('open');
  menuBtn.setAttribute('aria-expanded', 'false');
}));

// scroll reveal
const items = $$('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  items.forEach((el) => io.observe(el));
} else {
  items.forEach((el) => el.classList.add('in'));
}

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// hero: the phone image drifts a little against the pointer (mouse devices only)
const hero = $('.hero');
if (hero && !reduced && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    hero.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  });
  hero.addEventListener('pointerleave', () => {
    hero.style.setProperty('--px', 0);
    hero.style.setProperty('--py', 0);
  });
}

// phones: each app screenshot scrolls inside its phone as the page scrolls past
if (!reduced) {
  const screens = $$('.screen').map((screen) => ({ screen, img: $('img', screen) }));
  let ticking = false;
  const update = () => {
    ticking = false;
    const vh = window.innerHeight;
    screens.forEach(({ screen, img }) => {
      const r = screen.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) return;
      const room = img.offsetTop + img.offsetHeight - screen.clientHeight;
      if (room <= 0) return;
      const centre = r.top + r.height / 2;
      const p = clamp((vh * 0.95 - centre) / (vh * 0.8), 0, 1);
      img.style.setProperty('--y', `${(-room * p).toFixed(1)}px`);
    });
  };
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  window.addEventListener('load', request);
  request();
}

// landlord stats count up the first time they scroll into view
const counters = $$('[data-count]');
if (!reduced && 'IntersectionObserver' in window) {
  const format = (n) => Math.round(n).toLocaleString('en-US');
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      const el = e.target;
      const to = Number(el.dataset.count);
      const start = performance.now();
      const dur = 1400;
      const tick = (now) => {
        const t = clamp((now - start) / dur, 0, 1);
        el.textContent = format(to * (1 - Math.pow(1 - t, 3)));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  counters.forEach((el) => { el.textContent = '0'; countIO.observe(el); });
}

// FAQ: smooth open and close, one open at a time
const openFaq = (d) => {
  const ans = $('.answer', d);
  ans.getAnimations().forEach((a) => a.cancel());
  d.classList.remove('closing');
  d.open = true;
  if (reduced) return;
  const h = ans.offsetHeight;
  const pad = getComputedStyle(ans).paddingBottom;
  ans.style.overflow = 'hidden';
  const a = ans.animate(
    [{ height: '0px', paddingBottom: '0px', opacity: 0 }, { height: `${h}px`, paddingBottom: pad, opacity: 1 }],
    { duration: 320, easing: 'cubic-bezier(0.22, 0.7, 0.2, 1)' },
  );
  a.onfinish = a.oncancel = () => { ans.style.overflow = ''; };
};
const closeFaq = (d) => {
  if (!d.open || d.classList.contains('closing')) return;
  if (reduced) { d.open = false; return; }
  const ans = $('.answer', d);
  const pad = getComputedStyle(ans).paddingBottom;
  d.classList.add('closing');
  ans.style.overflow = 'hidden';
  const a = ans.animate(
    [{ height: `${ans.offsetHeight}px`, paddingBottom: pad, opacity: 1 }, { height: '0px', paddingBottom: '0px', opacity: 0 }],
    { duration: 260, easing: 'cubic-bezier(0.22, 0.7, 0.2, 1)' },
  );
  a.onfinish = () => { d.open = false; d.classList.remove('closing'); ans.style.overflow = ''; };
};
$$('.faq summary').forEach((s) => s.addEventListener('click', (e) => {
  e.preventDefault();
  const d = s.parentElement;
  if (d.open && !d.classList.contains('closing')) {
    closeFaq(d);
  } else {
    $$('.faq details').forEach((o) => { if (o !== d) closeFaq(o); });
    openFaq(d);
  }
}));
