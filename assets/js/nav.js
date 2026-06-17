/* B&S Aesthetics - Mobile nav drawer
   Self-injects a slide-in menu with categories + account links.
   Bound to all #menuToggle / .header__menu buttons across pages.
*/
(function () {
  'use strict';

  const NAV_ITEMS = [
    { label: 'Home', href: 'index.html' },
    { label: 'Skincare', href: 'skincare.html' },
    { label: 'Makeup', href: 'makeup.html' },
    { label: 'Fragrance', href: 'fragrance.html' },
    { label: 'Devices', href: 'devices.html' },
    { label: 'Wellness', href: 'wellness.html' },
    {
      label: 'Dermal Fillers', href: 'dermal-fillers.html?filter=dermal-fillers',
      children: [
        { label: 'Regenovue', href: 'dermal-fillers.html?filter=dermal-fillers&brand=regenovue' },
        { label: 'Lumifil', href: 'dermal-fillers.html?filter=dermal-fillers&brand=lumifil' },
        { label: 'Volifil', href: 'dermal-fillers.html?filter=dermal-fillers&brand=volifil' },
        { label: 'Aessoa', href: 'dermal-fillers.html?filter=dermal-fillers&brand=aessoa' },
        { label: 'Kairax', href: 'dermal-fillers.html?filter=dermal-fillers&brand=kairax' },
        { label: 'EPTQ', href: 'dermal-fillers.html?filter=dermal-fillers&brand=eptq' }
      ]
    },
    { label: 'Fat Dissolvers', href: 'dermal-fillers.html?filter=fat-dissolvers' },
    {
      label: 'Skin Boosters', href: 'dermal-fillers.html?filter=skin-boosters',
      children: [
        { label: 'Hyaluronic Acid', href: 'dermal-fillers.html?filter=skin-boosters&type=hyaluronic-acid' },
        { label: 'Polynucleotide', href: 'dermal-fillers.html?filter=skin-boosters&type=polynucleotide' },
        { label: 'PLLA', href: 'dermal-fillers.html?filter=plla' }
      ]
    },
    { label: 'Under Eye Boosters', href: 'dermal-fillers.html?filter=under-eye-boosters' },
    { label: 'Exosomes', href: 'dermal-fillers.html?filter=exosomes' },
    { label: 'Mesotherapy', href: 'dermal-fillers.html?filter=mesotherapy' },
    { label: 'Chemical Peel', href: 'dermal-fillers.html?filter=chemical-peel' },
    {
      label: 'Clinic Consumables', href: 'dermal-fillers.html?filter=clinic-consumables',
      children: [
        { label: 'Cannulas', href: 'dermal-fillers.html?filter=clinic-consumables&type=cannulas' },
        { label: 'Gloves', href: 'dermal-fillers.html?filter=clinic-consumables&type=gloves' },
        { label: 'Needles & Syringes', href: 'dermal-fillers.html?filter=clinic-consumables&type=needles-syringes' }
      ]
    }
  ];

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function ensureThirdBar(toggle) {
    if (!toggle) return;
    const spans = toggle.querySelectorAll('span');
    if (spans.length < 3) {
      while (toggle.querySelectorAll('span').length < 3) {
        toggle.appendChild(document.createElement('span'));
      }
    }
  }

  function buildItem(item) {
    if (item.children && item.children.length) {
      const subs = item.children.map(c =>
        `<li><a href="${escapeHtml(c.href)}">${escapeHtml(c.label)}</a></li>`
      ).join('');
      return `
        <li class="nav-drawer__group">
          <details>
            <summary>
              <span>${escapeHtml(item.label)}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
            </summary>
            <ul class="nav-drawer__sub">
              <li><a href="${escapeHtml(item.href)}" class="nav-drawer__view-all">View all ${escapeHtml(item.label)}</a></li>
              ${subs}
            </ul>
          </details>
        </li>
      `;
    }
    return `<li><a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a></li>`;
  }

  function buildDrawer() {
    if (document.getElementById('navDrawer')) return document.getElementById('navDrawer');
    const drawer = document.createElement('aside');
    drawer.id = 'navDrawer';
    drawer.className = 'nav-drawer';
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML = `
      <div class="nav-drawer__backdrop" data-nav-close></div>
      <nav class="nav-drawer__panel" role="dialog" aria-label="Site navigation">
        <header class="nav-drawer__head">
          <span class="nav-drawer__brand">
            <span class="header__wordmark-name">B<i>&amp;</i>S</span>
            <span class="header__wordmark-tag">Aesthetics</span>
          </span>
          <button type="button" class="nav-drawer__close" data-nav-close aria-label="Close menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M6 6l12 12M6 18 18 6"/></svg>
          </button>
        </header>

        <button type="button" class="nav-drawer__search" data-nav-search>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <span>Search products, brands…</span>
        </button>

        <ul class="nav-drawer__list">
          ${NAV_ITEMS.map(buildItem).join('')}
        </ul>

        <div class="nav-drawer__account" id="navDrawerAccount">
          <a href="login.html" class="nav-drawer__account-link" data-nav-account-link>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>
            <span data-nav-account-label>Sign in / Register</span>
          </a>
        </div>

        <footer class="nav-drawer__foot">
          <a href="#">Contact</a>
          <a href="#">Delivery &amp; Returns</a>
          <a href="#">FAQs</a>
        </footer>
      </nav>
    `;
    document.body.appendChild(drawer);
    return drawer;
  }

  let drawer = null;

  function open() {
    if (!drawer) return;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-nav-open');
    document.querySelectorAll('#menuToggle, .header__menu').forEach(b => b.classList.add('is-open'));
  }
  function close() {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-nav-open');
    document.querySelectorAll('#menuToggle, .header__menu').forEach(b => b.classList.remove('is-open'));
  }

  function syncAccount() {
    const link = drawer && drawer.querySelector('[data-nav-account-link]');
    const label = drawer && drawer.querySelector('[data-nav-account-label]');
    if (!link || !label) return;
    const user = window.BS_ACCOUNT && window.BS_ACCOUNT.user && window.BS_ACCOUNT.user();
    if (user) {
      link.href = 'account.html';
      label.textContent = `My account · ${user.firstName || user.email}`;
    } else {
      link.href = 'login.html';
      label.textContent = 'Sign in / Register';
    }
  }

  function init() {
    document.querySelectorAll('#menuToggle, .header__menu').forEach(ensureThirdBar);
    drawer = buildDrawer();

    document.querySelectorAll('#menuToggle, .header__menu').forEach(btn => {
      btn.addEventListener('click', event => {
        event.preventDefault();
        if (drawer.classList.contains('is-open')) close();
        else open();
      });
    });

    drawer.addEventListener('click', event => {
      if (event.target.closest('[data-nav-close]')) {
        close();
        return;
      }
      const search = event.target.closest('[data-nav-search]');
      if (search) {
        close();
        const trigger = document.querySelector('button.header__action[aria-label="Search"], [data-search-open]');
        if (trigger) trigger.click();
        return;
      }
      // Close when a real link is tapped (let browser navigate)
      if (event.target.closest('a[href]') && !event.target.closest('details > summary')) {
        close();
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && drawer.classList.contains('is-open')) close();
    });

    syncAccount();
    document.addEventListener('bs:account-ready', syncAccount);
    document.addEventListener('bs:account-changed', syncAccount);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
