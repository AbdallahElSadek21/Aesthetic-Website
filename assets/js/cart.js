/* B&S Aesthetics - Cart logic + drawer
   State is persisted in localStorage under bs_cart_v1.
*/
(function () {
  'use strict';

  const STORAGE_KEY = 'bs_cart_v1';
  let state = {};

  try {
    state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
  } catch (error) {
    state = {};
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {}
  }

  function count() {
    return Object.values(state).reduce((sum, item) => sum + item.qty, 0);
  }

  function subtotal() {
    return Object.values(state).reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  function add(id) {
    const product = window.BS_findById ? window.BS_findById(id) : null;
    if (!product) {
      console.warn('[cart] product not found:', id);
      return;
    }

    if (state[id]) {
      state[id].qty += 1;
    } else {
      state[id] = {
        id: product.id,
        brand: product.brand,
        name: product.name,
        price: product.price,
        size: product.size,
        image: product.image,
        qty: 1
      };
    }

    persist();
    render();
    flashCart();
  }

  function remove(id) {
    delete state[id];
    persist();
    render();
  }

  function setQty(id, qty) {
    if (qty <= 0) {
      delete state[id];
    } else if (state[id]) {
      state[id].qty = qty;
    }
    persist();
    render();
  }

  let drawer = null;

  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-cart-open');
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-cart-open');
  }

  function toggleDrawer() {
    if (!drawer) return;
    if (drawer.classList.contains('is-open')) closeDrawer();
    else openDrawer();
  }

  function flashCart() {
    document.querySelectorAll('.header__cart').forEach(el => {
      el.classList.remove('is-bumped');
      void el.offsetWidth;
      el.classList.add('is-bumped');
    });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, match => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[match]));
  }

  function renderItems() {
    const list = document.getElementById('cartItems');
    const empty = document.getElementById('cartEmpty');
    const footer = document.getElementById('cartFooter');
    if (!list) return;

    const ids = Object.keys(state);
    if (ids.length === 0) {
      list.innerHTML = '';
      if (empty) empty.hidden = false;
      if (footer) footer.hidden = true;
      return;
    }

    if (empty) empty.hidden = true;
    if (footer) footer.hidden = false;

    list.innerHTML = ids.map(id => {
      const item = state[id];
      return `
        <article class="cart-item" data-id="${escapeHtml(id)}">
          <img src="${escapeHtml(item.image)}" alt="">
          <div class="cart-item__body">
            <span class="cart-item__brand">${escapeHtml(item.brand)}</span>
            <h4>${escapeHtml(item.name)}</h4>
            ${item.size ? `<span class="cart-item__size">${escapeHtml(item.size)}</span>` : ''}
            <div class="cart-item__row">
              <div class="cart-item__qty">
                <button data-cart-dec aria-label="Decrease quantity">&minus;</button>
                <span>${item.qty}</span>
                <button data-cart-inc aria-label="Increase quantity">+</button>
              </div>
              <div class="cart-item__price">\u00A3${(item.price * item.qty).toFixed(2)}</div>
            </div>
            <button class="cart-item__remove" data-cart-remove type="button">Remove</button>
          </div>
        </article>
      `;
    }).join('');

    const sub = document.getElementById('cartSubtotal');
    if (sub) sub.textContent = '\u00A3' + subtotal().toFixed(2);
  }

  function renderBadges() {
    const total = count();
    document.querySelectorAll('.header__cart-count').forEach(el => {
      el.textContent = total;
      if (total === 0) el.classList.add('is-empty');
      else el.classList.remove('is-empty');
    });
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = total;
    });
  }

  function render() {
    renderBadges();
    renderItems();
  }

  const HEADER_DROPDOWNS = {
    'dermal-fillers': [
      { label: 'Regenovue', href: 'dermal-fillers.html?filter=dermal-fillers&brand=regenovue' },
      { label: 'Lumifil', href: 'dermal-fillers.html?filter=dermal-fillers&brand=lumifil' },
      { label: 'Volifil', href: 'dermal-fillers.html?filter=dermal-fillers&brand=volifil' },
      { label: 'Aessoa', href: 'dermal-fillers.html?filter=dermal-fillers&brand=aessoa' },
      { label: 'Kairax', href: 'dermal-fillers.html?filter=dermal-fillers&brand=kairax' },
      { label: 'EPTQ', href: 'dermal-fillers.html?filter=dermal-fillers&brand=eptq' },
      { label: 'View all brands', href: 'dermal-fillers.html?filter=dermal-fillers' }
    ],
    'skin-boosters': [
      { label: 'Hyaluronic Acid Skin Boosters', href: 'dermal-fillers.html?filter=skin-boosters&type=hyaluronic-acid' },
      { label: 'Polynucleotide Skin Boosters', href: 'dermal-fillers.html?filter=skin-boosters&type=polynucleotide' },
      { label: 'PLLA', href: 'dermal-fillers.html?filter=plla' }
    ],
    'clinic-consumables': [
      { label: 'Cannulas', href: 'dermal-fillers.html?filter=clinic-consumables&type=cannulas' },
      { label: 'Gloves', href: 'dermal-fillers.html?filter=clinic-consumables&type=gloves' },
      { label: 'Needles and Syringes', href: 'dermal-fillers.html?filter=clinic-consumables&type=needles-syringes' }
    ]
  };

  function buildHeaderDropdowns() {
    let built = 0;
    document.querySelectorAll('.header__nav > ul > li > a.has-menu[href]').forEach(link => {
      let url;
      try {
        url = new URL(link.getAttribute('href'), window.location.href);
      } catch (error) {
        return;
      }

      const items = HEADER_DROPDOWNS[url.searchParams.get('filter')];
      const item = link.closest('li');
      if (!items || !item || item.querySelector('.header__dropdown')) return;
      item.classList.add('has-dropdown');

      const menu = document.createElement('ul');
      menu.className = 'header__dropdown';
      if (items.some(entry => entry.label.length > 16)) menu.classList.add('header__dropdown--wide');

      items.forEach(entry => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = entry.href;
        a.textContent = entry.label;
        li.appendChild(a);
        menu.appendChild(li);
      });

      item.appendChild(menu);
      built += 1;
    });
    if (built > 0) document.documentElement.classList.add('has-nav-dropdowns');
  }

  function syncHeaderNav() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const currentFilter = new URLSearchParams(window.location.search).get('filter') || 'dermal-fillers';

    document.querySelectorAll('.header__nav > ul > li > a[href]').forEach(link => {
      link.classList.remove('is-current');

      let url;
      try {
        url = new URL(link.getAttribute('href'), window.location.href);
      } catch (error) {
        return;
      }

      const linkPath = url.pathname.split('/').pop() || 'index.html';
      if (currentPath === 'dermal-fillers.html' && linkPath === 'dermal-fillers.html') {
        const linkFilter = url.searchParams.get('filter') || 'dermal-fillers';
        if (linkFilter === currentFilter) link.classList.add('is-current');
      } else if (currentPath === linkPath && window.location.hash && url.hash === window.location.hash) {
        link.classList.add('is-current');
      }
    });
  }

  document.addEventListener('click', event => {
    const addBtn = event.target.closest('[data-add-to-cart][data-id]');
    if (addBtn) {
      event.preventDefault();
      event.stopPropagation();
      add(addBtn.dataset.id);
      openDrawer();
      return;
    }

    const toggle = event.target.closest('[data-cart-toggle]');
    if (toggle) {
      event.preventDefault();
      toggleDrawer();
      return;
    }

    const closeBtn = event.target.closest('[data-cart-close]');
    if (closeBtn) {
      event.preventDefault();
      closeDrawer();
      return;
    }

    const checkout = event.target.closest('.cart-drawer__checkout');
    if (checkout) {
      event.preventDefault();
      if (count() === 0) return;
      window.location.href = 'checkout.html';
      return;
    }

    const item = event.target.closest('.cart-item');
    if (item) {
      const id = item.dataset.id;
      if (event.target.closest('[data-cart-inc]')) {
        setQty(id, (state[id]?.qty || 0) + 1);
        return;
      }
      if (event.target.closest('[data-cart-dec]')) {
        setQty(id, (state[id]?.qty || 0) - 1);
        return;
      }
      if (event.target.closest('[data-cart-remove]')) {
        remove(id);
        return;
      }
    }

    const wish = event.target.closest('.product__wishlist');
    if (wish) {
      event.preventDefault();
      event.stopPropagation();
      wish.classList.toggle('is-saved');
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && drawer && drawer.classList.contains('is-open')) closeDrawer();
  });

  function init() {
    drawer = document.getElementById('cartDrawer');
    buildHeaderDropdowns();
    render();
    syncHeaderNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.BS_syncHeaderNav = syncHeaderNav;
  window.BS_CART = { add, remove, setQty, count, subtotal, open: openDrawer, close: closeDrawer };
})();
