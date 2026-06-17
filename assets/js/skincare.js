/* B&S Aesthetics — Skincare page logic
   - Filters by sub-category (serum, moisturizer, etc.)
   - Sorts by featured / price / rating / new
   - Renders cards via the shared BS_renderCard
*/
(function () {
  'use strict';

  const grid       = document.getElementById('catalogueGrid');
  const filterBar  = document.getElementById('filterPills');
  const sortSelect = document.getElementById('sortSelect');
  const empty      = document.getElementById('catalogueEmpty');
  const countEl    = document.getElementById('resultCount');
  if (!grid || !window.BS_PRODUCTS) return;

  const ALL = window.BS_byCat('skincare');

  let activeFilter = 'all';
  let activeSort   = 'featured';

  /* Build filter pill counts */
  function buildFilterCounts() {
    if (!filterBar) return;
    const counts = { all: ALL.length };
    ALL.forEach(p => { counts[p.sub] = (counts[p.sub] || 0) + 1; });
    filterBar.querySelectorAll('button').forEach(btn => {
      const k = btn.dataset.filter;
      const span = btn.querySelector('.count');
      if (span) span.textContent = counts[k] || 0;
      // Hide pills with 0 results except 'all'
      if (k !== 'all' && (counts[k] || 0) === 0) btn.style.display = 'none';
    });
  }

  function getList() {
    let list = activeFilter === 'all' ? [...ALL] : ALL.filter(p => p.sub === activeFilter);

    switch (activeSort) {
      case 'price-asc':  list.sort((a, b) => a.price - b.price); break;
      case 'price-desc': list.sort((a, b) => b.price - a.price); break;
      case 'rating':     list.sort((a, b) => b.rating - a.rating); break;
      case 'new':
        list.sort((a, b) => {
          const aN = (a.tags || []).includes('new') ? 1 : 0;
          const bN = (b.tags || []).includes('new') ? 1 : 0;
          return bN - aN;
        });
        break;
      // 'featured' — leave as authored order
    }
    return list;
  }

  function render() {
    const list = getList();
    if (countEl) countEl.textContent = list.length;
    if (list.length === 0) {
      grid.innerHTML = '';
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    grid.innerHTML = list.map(p => window.BS_renderCard(p)).join('');

    // Re-trigger reveal observer for newly inserted cards
    if (window.__bsReveal) {
      grid.querySelectorAll('[data-reveal-card]').forEach(el => window.__bsReveal.observe(el));
    } else {
      grid.querySelectorAll('[data-reveal-card]').forEach(el => el.classList.add('is-revealed'));
    }
  }

  if (filterBar) {
    filterBar.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-filter]');
      if (!btn) return;
      filterBar.querySelectorAll('button').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeFilter = btn.dataset.filter;
      render();
    });
  }
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      activeSort = sortSelect.value;
      render();
    });
  }

  buildFilterCounts();
  render();
})();
