/* B&S Aesthetics - Order confirmation page */
(function () {
  'use strict';

  const LAST_ORDER_KEY = 'bs_last_order_v1';
  const card = document.getElementById('confirmCard');
  const empty = document.getElementById('confirmEmpty');

  let order = null;
  try {
    order = JSON.parse(localStorage.getItem(LAST_ORDER_KEY) || 'null');
  } catch (error) {
    order = null;
  }

  if (!order) {
    if (card) card.hidden = true;
    if (empty) empty.hidden = false;
    return;
  }

  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const fmt = (n) => '£' + Number(n).toFixed(2);

  const cmsConfirm = (window.BS_CMS_CONTENT && window.BS_CMS_CONTENT.confirmation) || {};

  // Apply CMS-managed copy where it overrides defaults
  if (cmsConfirm.subtitle) {
    const subtitleP = document.querySelector('#confirmCard > p');
    if (subtitleP) subtitleP.innerHTML = cmsConfirm.subtitle.replace(/[<>]/g, '');
  }
  document.querySelectorAll('.confirm-cta .btn span').forEach((span, idx) => {
    if (idx === 0 && cmsConfirm.continueShoppingLabel) span.textContent = cmsConfirm.continueShoppingLabel;
    if (idx === 1 && cmsConfirm.viewOrdersLabel) span.textContent = cmsConfirm.viewOrdersLabel;
  });

  document.getElementById('confirmName').textContent = order.shipping.firstName || 'friend';
  document.getElementById('confirmEmail').textContent = order.contact.email || 'your inbox';
  document.getElementById('confirmOrderNo').textContent = order.orderNumber;
  document.getElementById('confirmTotal').textContent = fmt(order.totals.grand);

  const eta = new Date(order.etaIso);
  document.getElementById('confirmEta').textContent = eta.toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  const itemsEl = document.getElementById('confirmItems');
  if (itemsEl) {
    itemsEl.innerHTML = order.items.map(item => `
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
    `).join('');
  }
})();
