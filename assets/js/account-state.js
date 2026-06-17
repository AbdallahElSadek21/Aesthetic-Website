/* B&S Aesthetics - Account state (header sync, global BS_ACCOUNT) */
(function () {
  'use strict';

  let currentUser = null;

  async function fetchMe() {
    try {
      const res = await fetch('/api/account/me', { credentials: 'same-origin' });
      if (!res.ok) return null;
      const data = await res.json();
      return data.user || null;
    } catch (error) {
      return null;
    }
  }

  function applyHeaderState() {
    const links = document.querySelectorAll('a[aria-label="Account"]');
    links.forEach(link => {
      if (currentUser) {
        link.href = 'account.html';
        link.classList.add('is-signed-in');
        link.title = `Signed in as ${currentUser.firstName || currentUser.email}`;
      } else {
        link.href = 'login.html';
        link.classList.remove('is-signed-in');
        link.removeAttribute('title');
      }
    });
  }

  async function refresh() {
    currentUser = await fetchMe();
    applyHeaderState();
    document.dispatchEvent(new CustomEvent('bs:account-ready', { detail: { user: currentUser } }));
  }

  async function logout() {
    try {
      await fetch('/api/account/logout', { method: 'POST', credentials: 'same-origin' });
    } catch (error) {}
    currentUser = null;
    applyHeaderState();
    document.dispatchEvent(new CustomEvent('bs:account-changed', { detail: { user: null } }));
  }

  async function login(email, password) {
    const res = await fetch('/api/account/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Sign in failed.');
    currentUser = data.user;
    applyHeaderState();
    document.dispatchEvent(new CustomEvent('bs:account-changed', { detail: { user: currentUser } }));
    return currentUser;
  }

  async function register(payload) {
    const res = await fetch('/api/account/register', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Registration failed.');
    currentUser = data.user;
    applyHeaderState();
    document.dispatchEvent(new CustomEvent('bs:account-changed', { detail: { user: currentUser } }));
    return currentUser;
  }

  async function listOrders() {
    const res = await fetch('/api/account/orders', { credentials: 'same-origin' });
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    return Array.isArray(data.orders) ? data.orders : [];
  }

  window.BS_ACCOUNT = {
    user: () => currentUser,
    isSignedIn: () => !!currentUser,
    login,
    register,
    logout,
    refresh,
    listOrders
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refresh);
  } else {
    refresh();
  }
})();
