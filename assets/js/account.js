/* B&S Aesthetics - Account dashboard logic */
(function () {
  'use strict';

  const shell = document.getElementById('accountShell');
  const gate = document.getElementById('accountGate');

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }
  const fmt = (n) => '£' + Number(n).toFixed(2);

  function applyCmsCopy() {
    const cms = (window.BS_CMS_CONTENT && window.BS_CMS_CONTENT.account) || {};

    if (gate) {
      const titleEl = gate.querySelector('h1');
      const subtitleEl = gate.querySelector('p');
      if (titleEl && cms.gateTitle) titleEl.textContent = cms.gateTitle;
      if (subtitleEl && cms.gateSubtitle) subtitleEl.textContent = cms.gateSubtitle;
      const btns = gate.querySelectorAll('.account-gate__cta .btn span');
      if (btns[0] && cms.gatePrimaryLabel) btns[0].textContent = cms.gatePrimaryLabel;
      if (btns[1] && cms.gateSecondaryLabel) btns[1].textContent = cms.gateSecondaryLabel;
    }

    if (cms.tabLabels) {
      document.querySelectorAll('[data-account-tab]').forEach(btn => {
        const key = btn.dataset.accountTab;
        if (cms.tabLabels[key]) btn.textContent = cms.tabLabels[key];
      });
      document.querySelectorAll('[data-account-pane]').forEach(pane => {
        const key = pane.dataset.accountPane;
        const head = pane.querySelector('.account-tab__head h2');
        if (head && cms.tabLabels[key]) head.textContent = cms.tabLabels[key];
      });
    }

    const prefs = Array.isArray(cms.preferences) ? cms.preferences : null;
    if (prefs && prefs.length) {
      const list = document.querySelector('.account-prefs');
      if (list) {
        list.innerHTML = prefs.map((label, i) => `
          <li><label class="auth-check"><input type="checkbox"${i === 0 || i === 2 ? ' checked' : ''}> ${label.replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]))}</label></li>
        `).join('');
      }
    }
  }
  applyCmsCopy();

  function showGate() {
    if (gate) gate.hidden = false;
    if (shell) shell.hidden = true;
  }
  function showShell() {
    if (gate) gate.hidden = true;
    if (shell) shell.hidden = false;
  }

  function renderProfile(user) {
    const list = document.getElementById('accountProfile');
    if (!list) return;
    list.innerHTML = `
      <div><dt>Name</dt><dd>${escapeHtml((user.firstName + ' ' + user.lastName).trim() || '—')}</dd></div>
      <div><dt>Email</dt><dd>${escapeHtml(user.email)}</dd></div>
      <div><dt>Member ID</dt><dd>${escapeHtml(user.id)}</dd></div>
      <div><dt>Joined</dt><dd>${new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</dd></div>
    `;
  }

  function renderHeader(user) {
    const initial = (user.firstName || user.email || 'B').trim().charAt(0).toUpperCase();
    document.getElementById('accountAvatar').textContent = initial;
    document.getElementById('accountGreeting').textContent = `Welcome back, ${user.firstName || user.email.split('@')[0]}.`;
    document.getElementById('accountEmail').textContent = user.email;
    document.getElementById('accountSince').textContent = new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
  }

  function renderOrders(orders) {
    const wrap = document.getElementById('accountOrders');
    const empty = document.getElementById('accountOrdersEmpty');
    if (!wrap) return;
    if (!orders.length) {
      wrap.innerHTML = '';
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    wrap.innerHTML = orders.map(o => {
      const placed = new Date(o.placedAt);
      const eta = o.etaIso ? new Date(o.etaIso) : null;
      return `
        <article class="account-order">
          <header>
            <div>
              <span class="eyebrow">Order ${escapeHtml(o.orderNumber)}</span>
              <h3>${placed.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</h3>
            </div>
            <div class="account-order__total">
              <span>Total</span>
              <strong>${fmt(o.totals.grand)}</strong>
            </div>
          </header>
          <div class="account-order__items">
            ${(o.items || []).map(item => `
              <div class="account-order__item">
                <img src="${escapeHtml(item.image)}" alt="">
                <div>
                  <span>${escapeHtml(item.brand)}</span>
                  <strong>${escapeHtml(item.name)}</strong>
                  <small>Qty ${item.qty} · ${fmt(item.price * item.qty)}</small>
                </div>
              </div>
            `).join('')}
          </div>
          <footer>
            <span>Estimated ${eta ? eta.toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) : '—'}</span>
            <span class="account-order__status">${o.shipping && o.shipping.method === 'collection' ? 'Ready for collection' : 'In progress'}</span>
          </footer>
        </article>
      `;
    }).join('');
  }

  function renderAddresses(orders) {
    const wrap = document.getElementById('accountAddresses');
    if (!wrap) return;
    const lastWithAddress = orders.find(o => o.shipping && o.shipping.address);
    if (!lastWithAddress) {
      wrap.innerHTML = '<p class="account-empty__inline">No saved addresses yet.</p>';
      return;
    }
    const s = lastWithAddress.shipping;
    wrap.innerHTML = `
      <div><dt>Default delivery address</dt><dd>
        ${escapeHtml(s.firstName + ' ' + s.lastName).trim()}<br>
        ${escapeHtml(s.address)}${s.address2 ? '<br>' + escapeHtml(s.address2) : ''}<br>
        ${escapeHtml(s.city)} ${escapeHtml(s.postcode)}<br>
        ${escapeHtml(s.country)}
      </dd></div>
    `;
  }

  function bindTabs() {
    const buttons = document.querySelectorAll('[data-account-tab]');
    const panes = document.querySelectorAll('[data-account-pane]');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        const target = btn.dataset.accountTab;
        panes.forEach(p => p.classList.toggle('is-active', p.dataset.accountPane === target));
      });
    });
  }

  function bindLogout() {
    const btn = document.getElementById('accountLogout');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Signing out…';
      await window.BS_ACCOUNT.logout();
      window.location.href = 'index.html';
    });
  }

  async function init() {
    if (!window.BS_ACCOUNT) return showGate();
    const user = window.BS_ACCOUNT.user();
    if (!user) return showGate();

    showShell();
    renderHeader(user);
    renderProfile(user);
    bindTabs();
    bindLogout();

    let orders = [];
    try {
      orders = await window.BS_ACCOUNT.listOrders();
    } catch (error) {
      orders = [];
    }
    // Merge in last anonymous local order if it isn't on the server (offline placement before login)
    try {
      const local = JSON.parse(localStorage.getItem('bs_orders_v1') || '[]');
      const seen = new Set(orders.map(o => o.orderNumber));
      local.forEach(o => { if (!seen.has(o.orderNumber)) orders.push(o); });
      orders.sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));
    } catch (error) {}

    renderOrders(orders);
    renderAddresses(orders);
  }

  let initialised = false;
  function maybeInit() {
    if (initialised) return;
    initialised = true;
    init();
  }
  document.addEventListener('bs:account-ready', maybeInit);
})();
