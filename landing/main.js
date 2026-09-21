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

// only one FAQ open at a time
$$('.faq details').forEach((d) => d.addEventListener('toggle', () => {
  if (d.open) $$('.faq details').forEach((o) => { if (o !== d) o.open = false; });
}));
