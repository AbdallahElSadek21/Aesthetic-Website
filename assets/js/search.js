/* B&S Aesthetics - Header search overlay
   Self-injects an overlay and binds to header search buttons.
   Live-filters window.BS_PRODUCTS by name, brand, category, sub.
*/
(function () {
  'use strict';

  function injectStylesheetEnsured() { /* CSS lives in styles.css */ }

  function buildOverlay() {
    if (document.getElementById('searchOverlay')) return document.getElementById('searchOverlay');
    const cms = (window.BS_CMS_CONTENT && window.BS_CMS_CONTENT.search) || {};
    const placeholder = cms.placeholder || 'Search products, brands, categories…';
    const popularLabel = cms.popularLabel || 'Popular searches';
    const chips = (Array.isArray(cms.chips) && cms.chips.length) ? cms.chips : [
      { label: 'Serums', query: 'serum' },
      { label: 'Dermal Fillers', query: 'dermal' },
      { label: 'Vitamin C', query: 'vitamin c' },
      { label: 'Lips', query: 'lip' },
      { label: 'Fragrance', query: 'fragrance' },
      { label: 'LED Devices', query: 'LED' }
    ];
    const noResultsTitle = cms.noResultsTitle || 'No matches';
    const noResultsBody = cms.noResultsBody || 'Try a brand, ingredient, or category.';

    function esc(s) {
      return String(s).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
    }

    const overlay = document.createElement('div');
    overlay.id = 'searchOverlay';
    overlay.className = 'search-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="search-overlay__backdrop" data-search-close></div>
      <div class="search-overlay__panel" role="dialog" aria-modal="true" aria-label="Site search">
        <header class="search-overlay__head">
          <div class="search-overlay__field">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="search" id="searchInput" placeholder="${esc(placeholder)}" autocomplete="off" spellcheck="false">
            <button type="button" class="search-overlay__clear" id="searchClear" aria-label="Clear" hidden>×</button>
          </div>
          <button type="button" class="search-overlay__close" data-search-close aria-label="Close">Close</button>
        </header>

        <div class="search-overlay__body">
          <div class="search-overlay__suggestions" id="searchSuggestions">
            <span class="search-overlay__label">${esc(popularLabel)}</span>
            <div class="search-overlay__chips">
              ${chips.map(c => `<button type="button" data-search-chip="${esc(c.query || c.label)}">${esc(c.label)}</button>`).join('')}
            </div>
          </div>

          <div class="search-overlay__results" id="searchResults" hidden></div>
          <div class="search-overlay__none" id="searchNone" hidden>
            <h4>${esc(noResultsTitle)}</h4>
            <p>${esc(noResultsBody)}</p>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  let overlay = null;
  let inputEl = null;
  let resultsEl = null;
  let suggestionsEl = null;
  let noneEl = null;
  let clearBtn = null;

  function open() {
    if (!overlay) return;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-search-open');
    setTimeout(() => inputEl && inputEl.focus(), 30);
  }
  function close() {
    if (!overlay) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-search-open');
  }

  function score(product, query) {
    const q = query.toLowerCase();
    const fields = [
      [product.name, 4],
      [product.brand, 3],
      [product.cat, 1.5],
      [product.sub, 1.5],
      [(product.tags || []).join(' '), 1]
    ];
    let total = 0;
    fields.forEach(([value, weight]) => {
      const v = String(value || '').toLowerCase();
      if (!v) return;
      if (v === q) total += weight * 5;
      else if (v.startsWith(q)) total += weight * 3;
      else if (v.includes(q)) total += weight;
    });
    return total;
  }

  function search(query) {
    const q = String(query || '').trim();
    if (!q) {
      resultsEl.hidden = true;
      noneEl.hidden = true;
      suggestionsEl.hidden = false;
      resultsEl.innerHTML = '';
      return;
    }
    suggestionsEl.hidden = true;
    const products = window.BS_PRODUCTS || [];
    const matches = products
      .map(p => ({ p, s: score(p, q) }))
      .filter(m => m.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 12)
      .map(m => m.p);

    if (!matches.length) {
      resultsEl.hidden = true;
      noneEl.hidden = false;
      return;
    }
    noneEl.hidden = true;
    resultsEl.hidden = false;
    resultsEl.innerHTML = matches.map(p => `
      <a href="product.html?id=${encodeURIComponent(p.id)}" class="search-result">
        <img src="${escapeHtml(p.image)}" alt="">
        <div class="search-result__body">
          <span class="search-result__brand">${escapeHtml(p.brand)}</span>
          <h4>${escapeHtml(p.name)}</h4>
          ${p.size ? `<small>${escapeHtml(p.size)}</small>` : ''}
        </div>
        <div class="search-result__price">£${p.price}</div>
      </a>
    `).join('');
  }

  function init() {
    overlay = buildOverlay();
    inputEl = document.getElementById('searchInput');
    resultsEl = document.getElementById('searchResults');
    suggestionsEl = document.getElementById('searchSuggestions');
    noneEl = document.getElementById('searchNone');
    clearBtn = document.getElementById('searchClear');

    inputEl.addEventListener('input', () => {
      clearBtn.hidden = !inputEl.value;
      search(inputEl.value);
    });

    clearBtn.addEventListener('click', () => {
      inputEl.value = '';
      clearBtn.hidden = true;
      search('');
      inputEl.focus();
    });

    overlay.addEventListener('click', event => {
      if (event.target.closest('[data-search-close]')) close();
      const chip = event.target.closest('[data-search-chip]');
      if (chip) {
        inputEl.value = chip.dataset.searchChip;
        clearBtn.hidden = !inputEl.value;
        search(inputEl.value);
        inputEl.focus();
      }
    });

    // Bind any header search button
    document.querySelectorAll('button.header__action[aria-label="Search"], [data-search-open]').forEach(btn => {
      btn.addEventListener('click', event => {
        event.preventDefault();
        open();
      });
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && overlay.classList.contains('is-open')) close();
      if ((event.key === '/' || (event.metaKey && event.key === 'k') || (event.ctrlKey && event.key === 'k')) && !overlay.classList.contains('is-open')) {
        const tag = document.activeElement && document.activeElement.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        event.preventDefault();
        open();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
