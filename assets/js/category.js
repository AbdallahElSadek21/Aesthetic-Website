/* B&S Aesthetics - shared category page logic */
(function () {
  'use strict';

  const grid = document.getElementById('catalogueGrid');
  const filterBar = document.getElementById('filterPills');
  const sortSelect = document.getElementById('sortSelect');
  const empty = document.getElementById('catalogueEmpty');
  const countEl = document.getElementById('resultCount');
  const category = document.body.dataset.category || 'skincare';

  if (!grid || !window.BS_PRODUCTS) return;

  const ALL = window.BS_byCat ? window.BS_byCat(category) : [];
  const requestedFilter = new URLSearchParams(window.location.search).get('filter');
  let activeFilter = requestedFilter || 'all';
  let activeSort = 'featured';
  let filterSelect = null;

  function buildFilterDropdown() {
    if (!filterBar) return;

    const sortControl = document.querySelector('.catalogue__sort');
    if (!sortControl) return;

    // Collect filter options from the existing pill buttons (preserves order + labels)
    const options = Array.from(filterBar.querySelectorAll('button[data-filter]')).map(btn => ({
      key: btn.dataset.filter,
      label: btn.textContent.replace(/\s*\d+\s*$/, '').trim()
    }));

    // Hide the pill row entirely
    filterBar.style.display = 'none';

    // Inject a Filter dropdown right before the existing Sort control
    const wrapper = document.createElement('label');
    wrapper.className = 'catalogue__sort-control';
    wrapper.innerHTML = `
      <span>Filter</span>
      <select id="filterSelect"></select>
    `;
    const sortLabel = sortControl.querySelector('.catalogue__sort-control');
    if (sortLabel) sortControl.insertBefore(wrapper, sortLabel);
    else sortControl.appendChild(wrapper);

    filterSelect = wrapper.querySelector('#filterSelect');
    populateFilterOptions(options);

    filterSelect.addEventListener('change', () => {
      activeFilter = filterSelect.value;
      const url = new URL(window.location.href);
      if (activeFilter === 'all') url.searchParams.delete('filter');
      else url.searchParams.set('filter', activeFilter);
      window.history.replaceState(null, '', url);
      if (window.BS_syncHeaderNav) window.BS_syncHeaderNav();
      render();
    });
  }

  function populateFilterOptions(options) {
    if (!filterSelect) return;
    const counts = { all: ALL.length };
    ALL.forEach(p => { counts[p.sub] = (counts[p.sub] || 0) + 1; });

    const visible = options.filter(opt => opt.key === 'all' || (counts[opt.key] || 0) > 0);
    if (!visible.some(opt => opt.key === activeFilter)) activeFilter = 'all';

    filterSelect.innerHTML = visible.map(opt => {
      const total = counts[opt.key] || 0;
      const suffix = opt.key === 'all' ? ` (${total})` : ` (${total})`;
      return `<option value="${opt.key}"${activeFilter === opt.key ? ' selected' : ''}>${opt.label}${suffix}</option>`;
    }).join('');
  }

  function getList() {
    let list = activeFilter === 'all' ? [...ALL] : ALL.filter(p => p.sub === activeFilter);

    switch (activeSort) {
      case 'price-asc':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        list.sort((a, b) => b.rating - a.rating);
        break;
      case 'new':
        list.sort((a, b) => {
          const aNew = (a.tags || []).includes('new') ? 1 : 0;
          const bNew = (b.tags || []).includes('new') ? 1 : 0;
          return bNew - aNew;
        });
        break;
      default:
        break;
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

    const cards = grid.querySelectorAll('[data-reveal-card]');
    if (window.__bsReveal) cards.forEach(el => window.__bsReveal.observe(el));
    else cards.forEach(el => el.classList.add('is-revealed'));
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      activeSort = sortSelect.value;
      render();
    });
  }

  buildFilterDropdown();
  render();
})();
