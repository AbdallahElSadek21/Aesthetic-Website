/* B&S Aesthetics - Login / Register form handling.
   Talks to /api/account/{login,register} and uses BS_ACCOUNT for state.
*/
(function () {
  'use strict';

  document.querySelectorAll('[data-password-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.passwordToggle);
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      button.textContent = isPassword ? 'Hide' : 'Show';
    });
  });

  function getRedirect() {
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');
    if (next && /^[a-z0-9._/-]+\.html(\?[^"'<>]*)?$/i.test(next)) return next;
    return 'account.html';
  }

  function setStatus(form, message, kind) {
    const status = form.querySelector('.auth-panel__status');
    if (!status) return;
    status.textContent = message || '';
    status.style.color = kind === 'error' ? 'var(--red)' : kind === 'success' ? 'var(--navy)' : '';
  }

  document.querySelectorAll('[data-auth-form]').forEach(form => {
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const mode = form.dataset.authForm;
      const submit = form.querySelector('button[type="submit"]');
      const submitSpan = submit && submit.querySelector('span');
      const originalLabel = submitSpan ? submitSpan.textContent : '';

      if (!window.BS_ACCOUNT) {
        setStatus(form, 'Account service not available.', 'error');
        return;
      }

      if (submit) submit.disabled = true;
      if (submitSpan) submitSpan.textContent = mode === 'register' ? 'Creating…' : 'Signing in…';
      setStatus(form, '');

      try {
        if (mode === 'register') {
          const firstName = (form.querySelector('#registerFirstName') || {}).value || '';
          const lastName = (form.querySelector('#registerLastName') || {}).value || '';
          const email = (form.querySelector('#registerEmail') || {}).value || '';
          const password = (form.querySelector('#registerPassword') || {}).value || '';
          await window.BS_ACCOUNT.register({ firstName, lastName, email, password });
        } else {
          const email = (form.querySelector('#loginEmail') || {}).value || '';
          const password = (form.querySelector('#loginPassword') || {}).value || '';
          await window.BS_ACCOUNT.login(email, password);
        }
        if (submitSpan) submitSpan.textContent = mode === 'register' ? 'Account created' : 'Signed in';
        setStatus(form, 'Redirecting…', 'success');
        setTimeout(() => { window.location.href = getRedirect(); }, 600);
      } catch (error) {
        setStatus(form, error.message || 'Something went wrong.', 'error');
        if (submit) submit.disabled = false;
        if (submitSpan) submitSpan.textContent = originalLabel;
      }
    });
  });
})();
