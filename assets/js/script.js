/* B&S — Front page interactions
   - Loader fade
   - Lenis smooth scroll
   - Header scroll state
   - Hero slideshow + indicators
   - Reveal-on-scroll (IntersectionObserver)
   - Number counters
   - Product grid (data-driven) + tab switch
   - Newsletter submit
*/
(function () {
  'use strict';

  /* ---------- Loader ---------- */
  function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader && !loader.classList.contains('is-done')) {
      loader.classList.add('is-done');
    }
    document.querySelector('.hero')?.classList.add('is-revealed');
  }
  if (document.readyState === 'complete') {
    setTimeout(hideLoader, 700);
  } else {
    window.addEventListener('load', () => setTimeout(hideLoader, 600));
  }
  // Safety net — never let the loader stay longer than ~3s
  setTimeout(hideLoader, 3000);

  /* ---------- Lenis smooth scroll ---------- */
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({
      duration: 1.0,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1.1,
      touchMultiplier: 1.5
    });

    // Drive Lenis from a SINGLE animation loop. If GSAP is loaded, use its
    // ticker so ScrollTrigger stays in sync; otherwise fall back to RAF.
    if (window.gsap && window.ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  /* ---------- Anchor smooth scroll ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || href === '#' || href.length < 2) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(target, { offset: -80, duration: 1.4 });
      } else {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ---------- Header scroll state ---------- */
  const header = document.getElementById('header');
  const onScroll = () => {
    if (!header) return;
    if (window.scrollY > 30) header.classList.add('is-scrolled');
    else header.classList.remove('is-scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Hero slideshow ---------- */
  const slides = document.querySelectorAll('.hero__slide');
  const indicators = document.querySelectorAll('.hero__indicators button');
  let slideIdx = 0;
  let slideTimer = null;

  function showSlide(i) {
    slides.forEach(s => s.classList.remove('is-active'));
    indicators.forEach(b => b.classList.remove('is-active'));
    if (slides[i]) slides[i].classList.add('is-active');
    if (indicators[i]) indicators[i].classList.add('is-active');
    slideIdx = i;
  }
  function nextSlide() { showSlide((slideIdx + 1) % slides.length); }
  function startSlider() {
    if (slideTimer) clearInterval(slideTimer);
    slideTimer = setInterval(nextSlide, 5500);
  }
  indicators.forEach((btn, i) => {
    btn.addEventListener('click', () => { showSlide(i); startSlider(); });
  });
  if (slides.length) startSlider();

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll('[data-reveal], [data-reveal-card], [data-reveal-text]');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
  revealEls.forEach(el => io.observe(el));

  /* ---------- Number counters (editorial stats) ---------- */
  const counters = document.querySelectorAll('[data-counter]');
  const counterIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.counter, 10);
      const duration = 1800;
      const start = performance.now();
      function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.floor(eased * target).toLocaleString();
        if (t < 1) requestAnimationFrame(tick);
        else el.textContent = target.toLocaleString() + (target >= 100 ? '+' : '');
      }
      requestAnimationFrame(tick);
      counterIO.unobserve(el);
    });
  }, { threshold: 0.3 });
  counters.forEach(el => counterIO.observe(el));

  /* ---------- Products grid (uses shared products.js) ---------- */
  const grid = document.getElementById('productGrid');
  const tabs = document.querySelectorAll('#productTabs button');

  // Map tab key → first 4 products with that tag
  function pickByTag(tag) {
    return (window.BS_byTag ? window.BS_byTag(tag) : []).slice(0, 4);
  }

  function renderProducts(key) {
    if (!grid || !window.BS_renderCard) return;
    const items = pickByTag(key === 'bestsellers' ? 'bestseller' : key === 'new' ? 'new' : 'trending');
    grid.innerHTML = items.map(p => window.BS_renderCard(p)).join('');
    grid.querySelectorAll('[data-reveal-card]').forEach(el => io.observe(el));
  }
  renderProducts('bestsellers');

  tabs.forEach(t => {
    t.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('is-active'));
      t.classList.add('is-active');
      renderProducts(t.dataset.tab);
    });
  });

  /* ---------- Newsletter ---------- */
  const form = document.getElementById('newsletterForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input');
      if (!input.value) return;
      const btnSpan = form.querySelector('button span');
      const original = btnSpan.textContent;
      btnSpan.textContent = 'Subscribed ✦';
      input.value = '';
      setTimeout(() => { btnSpan.textContent = original; }, 3000);
    });
  }

  /* ---------- Mobile menu (placeholder for nav drawer) ---------- */
  const menuToggle = document.getElementById('menuToggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('is-open');
      // Future: open mobile drawer
    });
  }
})();
