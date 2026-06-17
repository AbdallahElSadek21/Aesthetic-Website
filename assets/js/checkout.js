/* B&S Aesthetics - Checkout page logic */
(function () {
  'use strict';

  const CART_KEY = 'bs_cart_v1';
  const ORDERS_KEY = 'bs_orders_v1';
  const LAST_ORDER_KEY = 'bs_last_order_v1';

  const cmsCheckout = (window.BS_CMS_CONTENT && window.BS_CMS_CONTENT.checkout) || {};
  const SHIPPING_METHODS = Array.isArray(cmsCheckout.shippingMethods) && cmsCheckout.shippingMethods.length
    ? cmsCheckout.shippingMethods
    : [
        { key: 'standard', label: 'Standard delivery', sublabel: '2–4 working days', price: 5.95 },
        { key: 'express', label: 'Express delivery', sublabel: 'Next working day — order before 3pm', price: 12 },
        { key: 'collection', label: 'Collection — London W1', sublabel: 'Ready in 2 hours', price: 0 }
      ];
  const SHIPPING_RATES = SHIPPING_METHODS.reduce((acc, m) => { acc[m.key] = Number(m.price || 0); return acc; }, {});
  const FREE_SHIPPING_THRESHOLD = Number(cmsCheckout.freeShippingThreshold ?? 150);
  const VAT_RATE = Number(cmsCheckout.vatRate ?? 0.2);
  const PROMOS = (Array.isArray(cmsCheckout.promoCodes) ? cmsCheckout.promoCodes : [])
    .reduce((acc, promo) => {
      if (promo && promo.code && promo.percent) acc[promo.code.toUpperCase()] = Number(promo.percent) / 100;
      return acc;
    }, { WELCOME10: 0.1, WELCOME15: 0.15, BS25: 0.25 });

  function readCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || '{}') || {};
    } catch (error) {
      return {};
    }
  }

  function clearCart() {
    try {
      localStorage.removeItem(CART_KEY);
    } catch (error) {}
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function fmt(value) {
    return '£' + Number(value).toFixed(2);
  }

  const form = document.getElementById('checkoutForm');
  const itemsEl = document.getElementById('checkoutItems');
  const emptyEl = document.getElementById('checkoutEmpty');
  const totalsEl = document.getElementById('checkoutTotals');
  const subEl = document.getElementById('ckSub');
  const shipEl = document.getElementById('ckShip');
  const vatEl = document.getElementById('ckVat');
  const totalEl = document.getElementById('ckTotal');
  const discountRow = document.getElementById('ckDiscountRow');
  const discountEl = document.getElementById('ckDiscount');
  const standardLabel = document.querySelector('[data-shipping-standard]');
  const promoInput = document.getElementById('ckPromo');
  const promoBtn = document.getElementById('ckPromoApply');
  const status = document.getElementById('ckStatus');
  const submit = form && form.querySelector('button[type="submit"]');

  let cart = readCart();
  let promoCode = null;

  // Apply CMS-controlled checkout copy to the DOM
  function applyCheckoutCms() {
    const secureEl = document.querySelector('.checkout-secure');
    if (secureEl && cmsCheckout.secureLabel) {
      const text = secureEl.lastChild;
      if (text && text.nodeType === Node.TEXT_NODE) text.textContent = ' ' + cmsCheckout.secureLabel;
    }

    const fineprintEl = document.querySelector('.checkout-fineprint');
    if (fineprintEl && cmsCheckout.fineprint) fineprintEl.textContent = cmsCheckout.fineprint;

    const shippingWrap = document.querySelector('.checkout-shipping');
    if (shippingWrap && SHIPPING_METHODS.length) {
      shippingWrap.innerHTML = SHIPPING_METHODS.map((method, idx) => `
        <label class="checkout-shipping__option">
          <input type="radio" name="shipping" value="${escapeHtml(method.key)}"${idx === 0 ? ' checked' : ''}>
          <span class="checkout-shipping__copy">
            <strong>${escapeHtml(method.label)}</strong>
            ${method.sublabel ? `<small>${escapeHtml(method.sublabel)}</small>` : ''}
          </span>
          <span class="checkout-shipping__price"${idx === 0 ? ' data-shipping-standard' : ''}>${method.price === 0 ? 'Free' : fmt(method.price)}</span>
        </label>
      `).join('');
    }

    const perksEl = document.querySelector('.checkout-summary__perks');
    if (perksEl && Array.isArray(cmsCheckout.perks) && cmsCheckout.perks.length) {
      perksEl.innerHTML = cmsCheckout.perks.map(perk => `
        <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 12l4 4L21 6"/></svg> ${escapeHtml(perk)}</li>
      `).join('');
    }
  }
  applyCheckoutCms();

  function subtotal() {
    return Object.values(cart).reduce((s, item) => s + item.price * item.qty, 0);
  }

  function shippingMethod() {
    const checked = form && form.querySelector('input[name="shipping"]:checked');
    return checked ? checked.value : 'standard';
  }

  function shippingCost() {
    if (shippingMethod() === 'standard' && subtotal() >= FREE_SHIPPING_THRESHOLD) return 0;
    return SHIPPING_RATES[shippingMethod()] || 0;
  }

  function discount() {
    if (!promoCode) return 0;
    const rate = PROMOS[promoCode] || 0;
    return subtotal() * rate;
  }

  function totals() {
    const sub = subtotal();
    const disc = discount();
    const ship = shippingCost();
    const taxableBase = Math.max(0, sub - disc);
    const vat = (taxableBase + ship) * (VAT_RATE / (1 + VAT_RATE));
    const grand = taxableBase + ship;
    return { sub, disc, ship, vat, grand };
  }

  function renderItems() {
    const ids = Object.keys(cart);
    if (!itemsEl) return;
    if (!ids.length) {
      itemsEl.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
      if (totalsEl) totalsEl.hidden = true;
      if (form) form.classList.add('is-disabled');
      if (submit) submit.disabled = true;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    if (totalsEl) totalsEl.hidden = false;
    if (form) form.classList.remove('is-disabled');
    if (submit) submit.disabled = false;

    itemsEl.innerHTML = ids.map(id => {
      const item = cart[id];
      return `
        <article class="checkout-line">
          <div class="checkout-line__media">
            <img src="${escapeHtml(item.image)}" alt="">
            <span class="checkout-line__qty">${item.qty}</span>
          </div>
          <div class="checkout-line__body">
            <span class="checkout-line__brand">${escapeHtml(item.brand)}</span>
            <h4>${escapeHtml(item.name)}</h4>
            ${item.size ? `<small>${escapeHtml(item.size)}</small>` : ''}
          </div>
          <div class="checkout-line__price">${fmt(item.price * item.qty)}</div>
        </article>
      `;
    }).join('');
  }

  function renderTotals() {
    const t = totals();
    if (subEl) subEl.textContent = fmt(t.sub);
    if (shipEl) shipEl.textContent = t.ship === 0 ? 'Free' : fmt(t.ship);
    if (vatEl) vatEl.textContent = fmt(t.vat);
    if (totalEl) totalEl.textContent = fmt(t.grand);
    if (discountRow) {
      if (t.disc > 0) {
        discountRow.hidden = false;
        if (discountEl) discountEl.textContent = '−' + fmt(t.disc);
      } else {
        discountRow.hidden = true;
      }
    }
    if (standardLabel) {
      standardLabel.textContent = subtotal() >= FREE_SHIPPING_THRESHOLD ? 'Free' : fmt(SHIPPING_RATES.standard);
    }
  }

  function render() {
    renderItems();
    renderTotals();
  }

  if (form) {
    form.addEventListener('change', event => {
      if (event.target && event.target.name === 'shipping') renderTotals();
    });
  }

  if (promoBtn && promoInput) {
    promoBtn.addEventListener('click', () => {
      const code = String(promoInput.value || '').trim().toUpperCase();
      if (!code) return;
      if (PROMOS[code]) {
        promoCode = code;
        promoInput.disabled = true;
        promoBtn.textContent = 'Applied';
        promoBtn.disabled = true;
        if (status) {
          status.textContent = `Code "${code}" applied — ${Math.round(PROMOS[code] * 100)}% off.`;
          status.style.color = 'var(--navy)';
        }
      } else {
        if (status) {
          status.textContent = `Code "${code}" is not valid.`;
          status.style.color = '';
        }
      }
      renderTotals();
    });
  }

  function generateOrderNumber() {
    const stamp = Date.now().toString(36).toUpperCase().slice(-6);
    const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    return `BS-${stamp}-${rand}`;
  }

  function buildOrder(formData) {
    const t = totals();
    const items = Object.values(cart).map(item => ({
      id: item.id,
      brand: item.brand,
      name: item.name,
      size: item.size || '',
      image: item.image,
      price: item.price,
      qty: item.qty
    }));
    const eta = new Date();
    const days = formData.get('shipping') === 'express' ? 1 : formData.get('shipping') === 'collection' ? 0 : 3;
    eta.setDate(eta.getDate() + days);

    return {
      orderNumber: generateOrderNumber(),
      placedAt: new Date().toISOString(),
      contact: {
        email: String(formData.get('email') || '').trim(),
        phone: String(formData.get('phone') || '').trim()
      },
      shipping: {
        firstName: String(formData.get('firstName') || '').trim(),
        lastName: String(formData.get('lastName') || '').trim(),
        address: String(formData.get('address') || '').trim(),
        address2: String(formData.get('address2') || '').trim(),
        city: String(formData.get('city') || '').trim(),
        postcode: String(formData.get('postcode') || '').trim(),
        country: String(formData.get('country') || '').trim(),
        method: String(formData.get('shipping') || 'standard')
      },
      items,
      promoCode,
      totals: { subtotal: t.sub, discount: t.disc, shipping: t.ship, vat: t.vat, grand: t.grand },
      etaIso: eta.toISOString()
    };
  }

  function persistOrder(order) {
    try {
      localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
    } catch (error) {}
    try {
      const existing = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
      existing.unshift(order);
      localStorage.setItem(ORDERS_KEY, JSON.stringify(existing.slice(0, 50)));
    } catch (error) {}
  }

  async function submitOrder(order) {
    try {
      await fetch('/api/orders', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      });
    } catch (error) {}
  }

  if (form) {
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!Object.keys(cart).length) return;
      if (!form.reportValidity()) return;

      if (submit) {
        submit.disabled = true;
        const span = submit.querySelector('span');
        if (span) span.textContent = 'Placing order…';
      }
      if (status) {
        status.textContent = '';
        status.style.color = '';
      }

      const order = buildOrder(new FormData(form));
      persistOrder(order);
      await submitOrder(order);
      clearCart();

      window.location.href = 'order-confirmation.html';
    });
  }

  // Prefill from signed-in user if available
  function prefill() {
    if (!form || !window.BS_ACCOUNT || !window.BS_ACCOUNT.user) return;
    const user = window.BS_ACCOUNT.user();
    if (!user) return;
    const map = { ckEmail: user.email, ckFirst: user.firstName, ckLast: user.lastName };
    Object.entries(map).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el && !el.value && value) el.value = value;
    });
  }

  document.addEventListener('bs:account-ready', prefill);
  prefill();

  render();
})();
