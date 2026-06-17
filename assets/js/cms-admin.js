(function () {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const loginView = $('#loginView');
  const appView = $('#appView');
  const panel = $('#panel');
  const sectionTitle = $('#sectionTitle');
  const statusEl = $('#status');
  const loginStatus = $('#loginStatus');
  const lastSaved = $('#lastSaved');
  const globalNote = $('#globalNote');

  const tabs = {
    dashboard: 'Dashboard',
    home: 'Home',
    navigation: 'Top Bar',
    footer: 'Footer',
    pages: 'Pages',
    site: 'Site',
    products: 'Products',
    backups: 'Backups',
    guide: 'Guide'
  };

  const SOCIAL_NETWORKS = ['instagram', 'tiktok', 'youtube', 'pinterest', 'facebook', 'x', 'linkedin', 'website'];
  let activePagesSection = 'pdp';

  const categoryLabels = {
    'skincare': 'Skincare',
    'makeup': 'Makeup',
    'fragrance': 'Fragrance',
    'dermal-fillers': 'Dermal Fillers',
    'devices': 'Devices',
    'wellness': 'Wellness'
  };

  const subcategoriesByCategory = {
    'skincare': ['cleanser', 'serum', 'moisturizer', 'treatment', 'mask', 'toner', 'eye', 'spf'],
    'makeup': ['complexion', 'lips', 'eyes', 'cheeks', 'tools', 'setting'],
    'fragrance': ['edp', 'extrait', 'candle', 'diffuser', 'body', 'discovery'],
    'dermal-fillers': ['dermal-fillers', 'skin-boosters', 'fat-dissolvers', 'under-eye-boosters', 'exosomes', 'mesotherapy', 'chemical-peel', 'clinic-consumables'],
    'devices': ['led', 'microcurrent', 'cleansing', 'cryo', 'ultrasonic', 'manual', 'massage', 'accessories'],
    'wellness': ['collagen', 'supplement', 'adaptogen', 'tea', 'hydration', 'sleep', 'body']
  };

  const tagOptions = ['bestseller', 'new', 'trending', 'popular', 'sale'];

  let content = null;
  let activeTab = 'dashboard';
  let selectedProductId = null;
  let productSearch = '';
  let isDirty = false;
  let draftAvailable = false;
  const cmsServerUrl = 'http://127.0.0.1:8010/cms.html';

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, match => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[match]));
  }

  function slug(value) {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `item-${Date.now()}`;
  }

  function list(value) {
    return Array.isArray(value) ? value : [];
  }

  function showStatus(message, type) {
    showToast(message, type);
  }

  /* ---------------- Toast stack ---------------- */
  function showToast(message, type) {
    const stack = document.getElementById('toastStack');
    if (!stack) {
      // Fallback to inline status when running before stack is mounted
      statusEl.hidden = false;
      statusEl.textContent = message;
      statusEl.className = `status${type === 'error' ? ' status--error' : ''}`;
      clearTimeout(showStatus.timer);
      showStatus.timer = setTimeout(() => { statusEl.hidden = true; }, type === 'error' ? 7000 : 3500);
      return;
    }
    const toast = document.createElement('div');
    toast.className = `toast toast--${type === 'error' ? 'error' : 'ok'}`;
    toast.innerHTML = `<span>${escapeHtml(message)}</span><button type="button" aria-label="Dismiss">×</button>`;
    stack.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    const timer = setTimeout(() => removeToast(toast), type === 'error' ? 6500 : 3500);
    toast.querySelector('button').addEventListener('click', () => {
      clearTimeout(timer);
      removeToast(toast);
    });
  }
  function removeToast(toast) {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 250);
  }

  /* ---------------- Modal ---------------- */
  let modalCloseHandler = null;
  function openModal({ title, body, foot, onClose }) {
    const modal = document.getElementById('modal');
    if (!modal) return;
    modal.querySelector('#modalTitle').textContent = title || '';
    modal.querySelector('#modalBody').innerHTML = '';
    if (typeof body === 'string') modal.querySelector('#modalBody').innerHTML = body;
    else if (body instanceof Node) modal.querySelector('#modalBody').appendChild(body);
    const footEl = modal.querySelector('#modalFoot');
    if (foot) {
      footEl.hidden = false;
      footEl.innerHTML = foot;
    } else {
      footEl.hidden = true;
      footEl.innerHTML = '';
    }
    modalCloseHandler = onClose || null;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-modal-open');
  }
  function closeModal(reason) {
    const modal = document.getElementById('modal');
    if (!modal || !modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-modal-open');
    const handler = modalCloseHandler;
    modalCloseHandler = null;
    if (handler) handler(reason);
  }
  document.addEventListener('click', event => {
    if (event.target.closest('[data-modal-close]')) closeModal('cancel');
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeModal('escape');
  });

  /* ---------------- Link picker ---------------- */
  const SITE_PAGES = [
    { label: 'Home', href: 'index.html' },
    { label: 'Skincare', href: 'skincare.html' },
    { label: 'Makeup', href: 'makeup.html' },
    { label: 'Fragrance', href: 'fragrance.html' },
    { label: 'Dermal Fillers', href: 'dermal-fillers.html' },
    { label: 'Devices', href: 'devices.html' },
    { label: 'Wellness', href: 'wellness.html' },
    { label: 'Login', href: 'login.html' },
    { label: 'Register', href: 'register.html' },
    { label: 'Account', href: 'account.html' },
    { label: 'Checkout', href: 'checkout.html' },
    { label: 'Order confirmation', href: 'order-confirmation.html' },
    { label: 'Anchor: Categories section (home)', href: 'index.html#categories' },
    { label: 'Anchor: Products section (home)', href: 'index.html#products' },
    { label: 'No link', href: '#' }
  ];

  function openLinkPicker(currentHref, allowExternal, onPick) {
    const isInternal = SITE_PAGES.some(p => p.href === currentHref) || currentHref === '' || currentHref === '#';
    const body = `
      <div class="picker">
        <div class="picker__tabs">
          <button type="button" class="${isInternal ? 'is-active' : ''}" data-picker-tab="internal">Pages</button>
          ${allowExternal ? `<button type="button" class="${!isInternal ? 'is-active' : ''}" data-picker-tab="external">External URL</button>` : ''}
        </div>
        <div class="picker__pane" data-picker-pane="internal" ${isInternal ? '' : 'hidden'}>
          <ul class="picker__list">
            ${SITE_PAGES.map(p => `
              <li><button type="button" data-picker-href="${escapeHtml(p.href)}" class="${currentHref === p.href ? 'is-active' : ''}">
                <strong>${escapeHtml(p.label)}</strong>
                <span>${escapeHtml(p.href)}</span>
              </button></li>
            `).join('')}
          </ul>
        </div>
        ${allowExternal ? `
        <div class="picker__pane" data-picker-pane="external" ${!isInternal ? '' : 'hidden'}>
          <label>Full URL (must start with https://, mailto:, or tel:)
            <input id="pickerExternal" type="url" value="${escapeHtml(isInternal ? '' : currentHref)}" placeholder="https://instagram.com/your-handle">
          </label>
          <button type="button" class="btn" data-picker-confirm-external>Use this URL</button>
        </div>` : ''}
      </div>
    `;
    openModal({
      title: 'Choose a link',
      body,
      onClose: () => {}
    });

    document.querySelector('#modalBody').addEventListener('click', function handler(event) {
      const tab = event.target.closest('[data-picker-tab]');
      if (tab) {
        const which = tab.dataset.pickerTab;
        document.querySelectorAll('[data-picker-tab]').forEach(b => b.classList.toggle('is-active', b.dataset.pickerTab === which));
        document.querySelectorAll('[data-picker-pane]').forEach(p => p.hidden = (p.dataset.pickerPane !== which));
        return;
      }
      const pick = event.target.closest('[data-picker-href]');
      if (pick) {
        onPick(pick.dataset.pickerHref);
        closeModal('pick');
        return;
      }
      const confirmExternal = event.target.closest('[data-picker-confirm-external]');
      if (confirmExternal) {
        const url = (document.getElementById('pickerExternal') || {}).value || '';
        onPick(url.trim());
        closeModal('pick');
      }
    }, { once: false });
  }

  /* ---------------- Image library picker ---------------- */
  let imageLibraryCache = null;
  async function fetchImageLibrary(force) {
    if (!force && imageLibraryCache) return imageLibraryCache;
    const data = await api('/api/admin/images');
    imageLibraryCache = data.images || [];
    return imageLibraryCache;
  }

  async function openImagePicker(currentPath, onPick) {
    let images = [];
    try {
      images = await fetchImageLibrary();
    } catch (error) {
      showToast(error.message, 'error');
      return;
    }

    const body = `
      <div class="picker">
        <div class="picker__toolbar">
          <input id="pickerImageSearch" placeholder="Search images by name…">
          <button type="button" class="btn btn--muted" data-picker-upload>Upload new</button>
          <input type="file" accept=".png,.jpg,.jpeg,.gif,.webp" id="pickerImageUpload" hidden>
        </div>
        <div class="picker__grid" id="pickerImageGrid">
          ${imagePickerGridHtml(images, currentPath)}
        </div>
      </div>
    `;
    openModal({ title: 'Image library', body });

    const grid = document.getElementById('pickerImageGrid');
    const search = document.getElementById('pickerImageSearch');
    const uploadInput = document.getElementById('pickerImageUpload');

    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      const filtered = q
        ? images.filter(img => img.name.toLowerCase().includes(q) || img.path.toLowerCase().includes(q))
        : images;
      grid.innerHTML = imagePickerGridHtml(filtered, currentPath);
    });

    grid.addEventListener('click', async (event) => {
      const card = event.target.closest('[data-picker-image]');
      if (card && !event.target.closest('[data-picker-delete]')) {
        onPick(card.dataset.pickerImage);
        closeModal('pick');
        return;
      }
      const del = event.target.closest('[data-picker-delete]');
      if (del) {
        event.stopPropagation();
        const filename = del.dataset.pickerDelete;
        if (!confirm(`Delete ${filename}? This permanently removes the file.`)) return;
        try {
          await api(`/api/admin/images/uploads/${encodeURIComponent(filename)}`, { method: 'DELETE' });
          imageLibraryCache = null;
          images = await fetchImageLibrary(true);
          grid.innerHTML = imagePickerGridHtml(images, currentPath);
          showToast('Image deleted.');
        } catch (error) {
          showToast(error.message, 'error');
        }
      }
    });

    document.querySelector('[data-picker-upload]').addEventListener('click', () => uploadInput.click());
    uploadInput.addEventListener('change', async () => {
      const file = uploadInput.files && uploadInput.files[0];
      if (!file) return;
      try {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const result = await api('/api/upload', {
              method: 'POST',
              body: JSON.stringify({ filename: file.name, dataUrl: reader.result })
            });
            imageLibraryCache = null;
            onPick(result.path);
            closeModal('pick');
            showToast('Image uploaded.');
          } catch (error) {
            showToast(error.message, 'error');
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  }

  function imagePickerGridHtml(images, currentPath) {
    if (!images.length) return '<div class="empty-state">No images found. Upload some first.</div>';
    return images.map(img => `
      <button type="button" class="picker-thumb${img.path === currentPath ? ' is-active' : ''}" data-picker-image="${escapeHtml(img.path)}">
        <img src="${escapeHtml(img.path)}" alt="" loading="lazy">
        <div class="picker-thumb__meta">
          <strong>${escapeHtml(img.name)}</strong>
          <span>${escapeHtml(img.group)} · ${formatSize(img.size)}</span>
        </div>
        ${img.deletable ? `<button type="button" class="picker-thumb__delete" data-picker-delete="${escapeHtml(img.name)}" aria-label="Delete">×</button>` : ''}
      </button>
    `).join('');
  }

  function formatSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  /* ---------------- Reorder helper ---------------- */
  function moveInArray(arr, index, delta) {
    if (!Array.isArray(arr)) return false;
    const target = index + delta;
    if (target < 0 || target >= arr.length) return false;
    const [item] = arr.splice(index, 1);
    arr.splice(target, 0, item);
    return true;
  }

  function reorderControls(group, index, length) {
    return `
      <div class="reorder">
        <button type="button" class="reorder__btn" data-reorder="up" data-group="${group}" data-index="${index}" ${index === 0 ? 'disabled' : ''} aria-label="Move up">▲</button>
        <button type="button" class="reorder__btn" data-reorder="down" data-group="${group}" data-index="${index}" ${index === length - 1 ? 'disabled' : ''} aria-label="Move down">▼</button>
      </div>
    `;
  }

  function applyReorder(group, index, delta) {
    const map = {
      navigation: () => content.navigation.items,
      heroSlides: () => content.home.hero.slides,
      homeCategories: () => content.home.categories,
      products: () => content.products,
      shopLinks: () => content.footer.shopLinks,
      careLinks: () => content.footer.careLinks,
      houseLinks: () => content.footer.houseLinks,
      legalLinks: () => content.footer.legalLinks,
      socialLinks: () => content.footer.socialLinks,
      shippingMethods: () => content.checkout.shippingMethods,
      promoCodes: () => content.checkout.promoCodes,
      searchChips: () => content.search.chips,
      announcement: () => content.announcement.messages,
      pdpPerks: () => content.pdp.perks,
      checkoutPerks: () => content.checkout.perks,
      paymentBrands: () => content.footer.paymentBrands,
      preferences: () => content.account.preferences,
      productTags: () => {
        const product = selectedProduct();
        return product ? product.tags : [];
      }
    };
    const arr = map[group] && map[group]();
    if (!moveInArray(arr, index, delta)) return;
    markDirty();
    render();
  }

  function markDirty() {
    isDirty = true;
    lastSaved.textContent = 'Unsaved changes';
  }

  async function api(path, options = {}) {
    let response;
    try {
      response = await fetch(path, {
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        },
        ...options
      });
    } catch (error) {
      throw new Error(`Cannot reach the CMS server. Open ${cmsServerUrl} and make sure the local server is running.`);
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const fallback = response.status === 404 || response.status === 405 || response.status === 501
        ? `This page is not connected to the CMS backend. Open ${cmsServerUrl}.`
        : 'Request failed.';
      const error = new Error(data.error || fallback);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function isSafeHref(value) {
    const href = String(value || '').trim();
    if (!href) return false;
    if (href.includes('\\') || href.includes('..')) return false;
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return false;
    return href === '#' || href.startsWith('#') || /^[a-z0-9/_-]+\.html([?#][^\\\s]*)?$/i.test(href);
  }

  function isSafeAssetPath(value) {
    const assetPath = String(value || '').trim().replace(/\\/g, '/');
    if (!assetPath || assetPath.includes('..')) return false;
    if (/^[a-z][a-z0-9+.-]*:/i.test(assetPath)) return false;
    return /^assets\/(images|uploads)\/[a-z0-9._/-]+\.(png|jpe?g|gif|webp)$/i.test(assetPath)
      || /^Logo\/[a-z0-9._/-]+\.(png|jpe?g|gif|webp)$/i.test(assetPath);
  }

  function validateContentLocal() {
    const errors = [];
    const ids = new Set();

    if (!content.cmsNote.trim()) errors.push('CMS note is required.');
    if (!content.announcement.messages.length) errors.push('Add at least one announcement message.');

    content.navigation.items.forEach((item, index) => {
      if (!item.label.trim()) errors.push(`Top bar item ${index + 1} needs a label.`);
      if (!isSafeHref(item.href)) errors.push(`Top bar item "${item.label || index + 1}" has an invalid link.`);
      list(item.dropdown).forEach((entry, entryIndex) => {
        if (!entry.label.trim()) errors.push(`Dropdown item ${entryIndex + 1} under "${item.label}" needs a label.`);
        if (!isSafeHref(entry.href)) errors.push(`Dropdown item "${entry.label || entryIndex + 1}" under "${item.label}" has an invalid link.`);
      });
    });

    const hero = content.home.hero;
    if (!list(hero.titleLines).length) errors.push('Homepage hero needs at least one title line.');
    if (!isSafeHref(hero.primaryCta && hero.primaryCta.href)) errors.push('Primary hero button link is invalid.');
    if (!isSafeHref(hero.secondaryCta && hero.secondaryCta.href)) errors.push('Secondary hero button link is invalid.');
    list(hero.slides).forEach((slide, index) => {
      if (!isSafeAssetPath(slide.image)) errors.push(`Hero slide ${index + 1} has an invalid image path.`);
    });
    content.home.categories.forEach((category, index) => {
      if (!category.title.trim()) errors.push(`Homepage category ${index + 1} needs a title.`);
      if (!isSafeHref(category.href)) errors.push(`Homepage category "${category.title || index + 1}" has an invalid link.`);
      if (!isSafeAssetPath(category.image)) errors.push(`Homepage category "${category.title || index + 1}" has an invalid image path.`);
    });

    content.products.forEach((product, index) => {
      const label = product.name || product.id || `product ${index + 1}`;
      if (!product.id) errors.push(`Product ${index + 1} needs an ID.`);
      if (ids.has(product.id)) errors.push(`Duplicate product ID: ${product.id}.`);
      ids.add(product.id);
      if (!product.name.trim()) errors.push(`Product "${label}" needs a name.`);
      if (!product.brand.trim()) errors.push(`Product "${label}" needs a brand.`);
      if (!product.cat.trim()) errors.push(`Product "${label}" needs a category.`);
      if (!product.sub.trim()) errors.push(`Product "${label}" needs a subcategory.`);
      if (!Number.isFinite(Number(product.price)) || Number(product.price) < 0) errors.push(`Product "${label}" has an invalid price.`);
      if (product.oldPrice !== undefined && product.oldPrice !== '' && (!Number.isFinite(Number(product.oldPrice)) || Number(product.oldPrice) < 0)) errors.push(`Product "${label}" has an invalid old price.`);
      if (!Number.isFinite(Number(product.rating)) || Number(product.rating) < 0 || Number(product.rating) > 5) errors.push(`Product "${label}" rating must be between 0 and 5.`);
      if (!isSafeAssetPath(product.image)) errors.push(`Product "${label}" has an invalid main image path.`);
      if (!isSafeAssetPath(product.alt)) errors.push(`Product "${label}" has an invalid hover image path.`);
    });

    return errors;
  }

  function showValidation(errors) {
    if (!errors.length) return false;
    statusEl.hidden = false;
    statusEl.className = 'status status--error';
    statusEl.innerHTML = `<strong>Please fix these issues:</strong><ul>${errors.map(error => `<li>${escapeHtml(error)}</li>`).join('')}</ul>`;
    return true;
  }

  function normalize() {
    content.announcement = content.announcement || { messages: [] };
    content.announcement.messages = list(content.announcement.messages);
    content.navigation = content.navigation || { items: [] };
    content.navigation.items = list(content.navigation.items);
    content.home = content.home || {};
    content.home.hero = content.home.hero || {};
    content.home.hero.titleLines = list(content.home.hero.titleLines);
    content.home.hero.slides = list(content.home.hero.slides);
    content.home.categories = list(content.home.categories);
    content.products = list(content.products);

    content.footer = content.footer || {};
    ['shopLinks', 'careLinks', 'houseLinks', 'legalLinks', 'socialLinks'].forEach(k => {
      content.footer[k] = list(content.footer[k]);
    });
    content.footer.paymentBrands = list(content.footer.paymentBrands);

    content.pdp = content.pdp || {};
    content.pdp.perks = list(content.pdp.perks);

    content.checkout = content.checkout || {};
    content.checkout.shippingMethods = list(content.checkout.shippingMethods);
    content.checkout.promoCodes = list(content.checkout.promoCodes);
    content.checkout.perks = list(content.checkout.perks);

    content.confirmation = content.confirmation || {};
    content.account = content.account || {};
    content.account.tabLabels = content.account.tabLabels || {};
    content.account.preferences = list(content.account.preferences);

    content.search = content.search || {};
    content.search.chips = list(content.search.chips);

    content.site = content.site || {};
    content.site.themeColors = content.site.themeColors || {};

    if (!content.cmsNote) {
      content.cmsNote = 'Important: whenever a new section, dropdown, product field, banner, or content block is added to the main website, add its matching editable field in this CMS too. The website and CMS must stay paired.';
    }
  }

  async function loadContent() {
    const data = await api('/api/content');
    content = data.content || data;
    lastPublishedSnapshot = JSON.parse(JSON.stringify(content));
    draftAvailable = Boolean(data.draft);
    normalize();
    globalNote.textContent = content.cmsNote;
    lastSaved.textContent = content.updatedAt ? `Live saved ${new Date(content.updatedAt).toLocaleString()}` : 'Loaded';
    isDirty = false;
    if (!selectedProductId && content.products[0]) selectedProductId = content.products[0].id;
    startAutoSave();
    render();
  }

  let lastPublishedSnapshot = null;

  async function saveContent() {
    if (!content) return;
    normalize();
    const errors = validateContentLocal();
    if (showValidation(errors)) return;

    const diff = lastPublishedSnapshot ? computePublishDiff(lastPublishedSnapshot, content) : null;
    const proceed = await confirmPublish(diff);
    if (!proceed) return;

    const result = await api('/api/content', {
      method: 'PUT',
      body: JSON.stringify(content)
    });
    content = result.content;
    lastPublishedSnapshot = JSON.parse(JSON.stringify(content));
    normalize();
    draftAvailable = false;
    globalNote.textContent = content.cmsNote;
    lastSaved.textContent = `Live saved ${new Date(content.updatedAt).toLocaleString()}`;
    isDirty = false;
    stopAutoSave();
    startAutoSave();
    showToast('Published. The website files have been updated.');
    render();
  }

  function confirmPublish(diff) {
    return new Promise(resolve => {
      const summary = diff && diff.length
        ? `<ul class="diff-list">${diff.slice(0, 30).map(d => `<li>${escapeHtml(d)}</li>`).join('')}${diff.length > 30 ? `<li class="helper">…and ${diff.length - 30} more</li>` : ''}</ul>`
        : '<p class="helper">No changes detected since last load. Publishing will still bump the revision.</p>';
      openModal({
        title: 'Publish to live site?',
        body: `<p>About to publish these changes to the public website:</p>${summary}`,
        foot: `
          <button type="button" class="btn btn--ghost" data-modal-close>Cancel</button>
          <button type="button" class="btn" data-confirm-publish>Publish live</button>
        `,
        onClose: (reason) => {
          if (reason !== 'confirm') resolve(false);
        }
      });
      document.querySelector('[data-confirm-publish]').addEventListener('click', () => {
        const modal = document.getElementById('modal');
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('is-modal-open');
        modalCloseHandler = null;
        resolve(true);
      }, { once: true });
    });
  }

  function computePublishDiff(prev, next) {
    const diff = [];
    const compareValue = (path, a, b) => {
      const sa = JSON.stringify(a);
      const sb = JSON.stringify(b);
      if (sa !== sb) {
        if (typeof a === 'string' && typeof b === 'string') diff.push(`${path}: "${truncate(a, 30)}" → "${truncate(b, 30)}"`);
        else if (Array.isArray(a) && Array.isArray(b)) diff.push(`${path}: ${a.length} → ${b.length} item${b.length === 1 ? '' : 's'}`);
        else diff.push(`${path} changed`);
      }
    };
    const sections = ['announcement', 'navigation', 'home.hero', 'home.categories', 'footer', 'pdp', 'checkout', 'confirmation', 'account', 'search', 'site'];
    sections.forEach(key => {
      const a = key.split('.').reduce((o, k) => o && o[k], prev);
      const b = key.split('.').reduce((o, k) => o && o[k], next);
      if (JSON.stringify(a) !== JSON.stringify(b)) diff.push(`${key} changed`);
    });
    if (JSON.stringify((prev.products || []).map(p => p.id)) !== JSON.stringify((next.products || []).map(p => p.id))) {
      diff.push(`products: list reordered or items added/removed`);
    }
    return diff;
  }

  function truncate(s, n) {
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  /* ---------------- Auto-save draft ---------------- */
  let autoSaveTimer = null;
  let autoSaveInFlight = false;

  function startAutoSave() {
    stopAutoSave();
    autoSaveTimer = setInterval(async () => {
      if (!isDirty || autoSaveInFlight) return;
      try {
        autoSaveInFlight = true;
        normalize();
        const errors = validateContentLocal();
        if (errors.length) return; // Don't auto-save invalid drafts
        await api('/api/draft', { method: 'PUT', body: JSON.stringify(content) });
        draftAvailable = true;
        isDirty = false;
        lastSaved.textContent = `Auto-saved draft ${new Date().toLocaleTimeString()}`;
      } catch (error) {
        // Silent — toast would be noisy
      } finally {
        autoSaveInFlight = false;
      }
    }, 8000);
  }
  function stopAutoSave() {
    if (autoSaveTimer) clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }

  async function saveDraft() {
    if (!content) return;
    normalize();
    const errors = validateContentLocal();
    if (showValidation(errors)) return;
    const result = await api('/api/draft', {
      method: 'PUT',
      body: JSON.stringify(content)
    });
    content = result.draft;
    normalize();
    draftAvailable = true;
    isDirty = false;
    lastSaved.textContent = `Draft saved ${new Date(content.updatedAt).toLocaleString()}`;
    showStatus('Draft saved. The live website was not changed.');
    render();
  }

  async function loadDraft() {
    const result = await api('/api/draft');
    if (!result.draft) {
      showStatus('No draft is saved yet.', 'error');
      return;
    }
    if (isDirty && !confirm('Load the saved draft and discard unsaved changes on this screen?')) return;
    content = result.draft;
    normalize();
    draftAvailable = true;
    isDirty = false;
    lastSaved.textContent = `Draft loaded ${new Date(content.updatedAt).toLocaleString()}`;
    showStatus('Draft loaded. Publish it when ready.');
    render();
  }

  function previewContent() {
    normalize();
    const errors = validateContentLocal();
    if (showValidation(errors)) return;
    localStorage.setItem('bs_cms_preview', JSON.stringify(content));
    window.open('index.html?preview=1', '_blank', 'noopener,noreferrer');
  }

  function showLogin() {
    loginView.hidden = false;
    appView.hidden = true;
    $('#passwordInput').focus();
  }

  function showApp() {
    loginView.hidden = true;
    appView.hidden = false;
  }

  function setTab(tab) {
    activeTab = tab;
    $$('.tabs button').forEach(button => {
      button.classList.toggle('is-active', button.dataset.tab === tab);
    });
    render();
  }

  function render() {
    if (!content) return;
    sectionTitle.textContent = tabs[activeTab];
    if (activeTab === 'dashboard') renderDashboard();
    if (activeTab === 'home') renderHome();
    if (activeTab === 'navigation') renderNavigation();
    if (activeTab === 'footer') renderFooter();
    if (activeTab === 'pages') renderPages();
    if (activeTab === 'site') renderSite();
    if (activeTab === 'products') renderProducts();
    if (activeTab === 'backups') renderBackups();
    if (activeTab === 'guide') renderGuide();
  }

  function renderDashboard() {
    const productCount = content.products.length;
    const categoryCount = new Set(content.products.map(product => product.cat)).size;
    const navCount = content.navigation.items.length;
    const uploadCount = content.products.filter(product => String(product.image || '').includes('assets/uploads/')).length;

    panel.innerHTML = `
      <div class="grid">
        <div class="metric"><span>Products</span><strong>${productCount}</strong></div>
        <div class="metric"><span>Categories used</span><strong>${categoryCount}</strong></div>
        <div class="metric"><span>Top bar items</span><strong>${navCount}</strong></div>
        <div class="metric"><span>Uploaded images</span><strong>${uploadCount}</strong></div>
      </div>
      <div class="panel stack" style="margin-top:16px">
        <h2>CMS rule</h2>
        <p>${escapeHtml(content.cmsNote)}</p>
        <p class="helper">This rule keeps the CMS and the website paired. Whenever a new visible section or product field is added to the website, a matching control should be added here so editors can update it without touching code.</p>
      </div>
      <div class="panel stack" style="margin-top:16px">
        <h2>Where to start</h2>
        <p>Update homepage hero, announcements, top nav, footer, page copy, and the product catalogue from the tabs on the left. Save a draft while working, preview it, then publish live when finished.</p>
        ${draftAvailable ? '<p class="helper"><strong>A draft is saved.</strong> Open any editing tab and use Load draft when you want to continue it.</p>' : ''}
      </div>
    `;
  }

  function renderHome() {
    const hero = content.home.hero;
    panel.innerHTML = `
      <div class="stack">
        <div class="panel stack">
          <h2>Announcement bar</h2>
          <p class="helper">One message per line. These appear in the moving strip at the top of the website.</p>
          <label>Messages
            <textarea data-announcements>${escapeHtml(content.announcement.messages.join('\n'))}</textarea>
          </label>
        </div>

        <div class="panel stack">
          <h2>Homepage hero</h2>
          <div class="form-grid">
            <label>Eyebrow
              <input data-hero-field="eyebrow" value="${escapeHtml(hero.eyebrow || '')}">
            </label>
            <label>Subtitle
              <input data-hero-field="subtitle" value="${escapeHtml(hero.subtitle || '')}">
            </label>
            <label class="wide">Title lines
              <textarea data-hero-lines>${escapeHtml(list(hero.titleLines).join('\n'))}</textarea>
            </label>
            <label>Primary button label
              <input data-hero-cta="primaryCta.label" value="${escapeHtml(hero.primaryCta && hero.primaryCta.label || '')}">
            </label>
            <label>Primary button link
              <div class="image-input">
                <input id="heroPrimaryHref" data-hero-cta="primaryCta.href" value="${escapeHtml(hero.primaryCta && hero.primaryCta.href || '')}">
                <button type="button" class="btn btn--ghost" data-link-picker="#heroPrimaryHref">Browse</button>
              </div>
            </label>
            <label>Secondary button label
              <input data-hero-cta="secondaryCta.label" value="${escapeHtml(hero.secondaryCta && hero.secondaryCta.label || '')}">
            </label>
            <label>Secondary button link
              <div class="image-input">
                <input id="heroSecondaryHref" data-hero-cta="secondaryCta.href" value="${escapeHtml(hero.secondaryCta && hero.secondaryCta.href || '')}">
                <button type="button" class="btn btn--ghost" data-link-picker="#heroSecondaryHref">Browse</button>
              </div>
            </label>
          </div>
        </div>

        <div class="panel stack">
          <div class="toolbar">
            <h2>Hero slides</h2>
            <button type="button" class="btn btn--muted" data-action="add-slide">Add slide</button>
          </div>
          <div class="rows">
            ${list(hero.slides).map((slide, index) => renderImageRow('slide', index, slide.image, slide.alt)).join('')}
          </div>
        </div>

        <div class="panel stack">
          <h2>Homepage category cards</h2>
          <div class="rows">
            ${content.home.categories.map((category, index) => renderCategoryRow(category, index)).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function renderImageRow(type, index, image, alt) {
    const preview = isSafeAssetPath(image) ? `<img class="image-preview" src="${escapeHtml(image)}" alt="">` : '<div class="image-preview image-preview--empty">No preview</div>';
    const total = type === 'slide' ? content.home.hero.slides.length : 0;
    const reorderHtml = type === 'slide' ? reorderControls('heroSlides', index, total) : '';
    const inputId = `${type}-${index}-image-input`;
    return `
      <div class="row">
        ${preview}
        <label>Image path
          <div class="image-input">
            <input id="${inputId}" data-${type}-field="image" data-index="${index}" value="${escapeHtml(image || '')}">
            <button type="button" class="btn btn--ghost" data-image-picker="#${inputId}">Browse</button>
          </div>
        </label>
        <label>Alt text
          <input data-${type}-field="alt" data-index="${index}" value="${escapeHtml(alt || '')}">
        </label>
        <div class="row__actions">
          ${reorderHtml}
          <button type="button" class="btn btn--danger" data-action="remove-${type}" data-index="${index}">Remove</button>
        </div>
      </div>
    `;
  }

  function renderCategoryRow(category, index) {
    const preview = isSafeAssetPath(category.image) ? `<img class="image-preview" src="${escapeHtml(category.image)}" alt="">` : '<div class="image-preview image-preview--empty">No preview</div>';
    const total = content.home.categories.length;
    const inputIdHref = `category-${index}-href`;
    const inputIdImage = `category-${index}-image-input`;
    return `
      <div class="row row--tall row--category">
        ${preview}
        <div class="form-grid wide">
          <label>Title
            <input data-category-field="title" data-index="${index}" value="${escapeHtml(category.title || '')}">
          </label>
          <label>Link
            <div class="image-input">
              <input id="${inputIdHref}" data-category-field="href" data-index="${index}" value="${escapeHtml(category.href || '')}">
              <button type="button" class="btn btn--ghost" data-link-picker="#${inputIdHref}">Browse</button>
            </div>
          </label>
          <label>Description
            <input data-category-field="description" data-index="${index}" value="${escapeHtml(category.description || '')}">
          </label>
          <label>Image path
            <div class="image-input">
              <input id="${inputIdImage}" data-category-field="image" data-index="${index}" value="${escapeHtml(category.image || '')}">
              <button type="button" class="btn btn--ghost" data-image-picker="#${inputIdImage}">Browse</button>
            </div>
          </label>
        </div>
      </div>
    `;
  }

  function renderNavigation() {
    panel.innerHTML = `
      <div class="panel stack">
        <div class="toolbar">
          <div>
            <h2>Top bar items</h2>
            <p class="helper">Use simple rows for each menu and dropdown item. Links should be internal pages or anchors.</p>
          </div>
          <button type="button" class="btn btn--muted" data-action="add-nav">Add menu item</button>
        </div>
        ${draftAvailable ? '<button type="button" class="btn btn--ghost" data-action="load-draft">Load saved draft</button>' : ''}
        <div class="rows">
          ${content.navigation.items.map((item, index) => renderNavRow(item, index)).join('')}
        </div>
      </div>
    `;
  }

  function renderNavRow(item, index) {
    const total = content.navigation.items.length;
    const inputId = `nav-${index}-href`;
    return `
      <div class="row row--tall row--nav">
        <div class="form-grid wide">
          <label>Menu label
            <input data-nav-field="label" data-index="${index}" value="${escapeHtml(item.label || '')}">
          </label>
          <label>Menu link
            <div class="image-input">
              <input id="${inputId}" data-nav-field="href" data-index="${index}" value="${escapeHtml(item.href || '')}">
              <button type="button" class="btn btn--ghost" data-link-picker="#${inputId}">Browse</button>
            </div>
          </label>
          <div class="wide mini-table">
            <div class="mini-table__head">
              <strong>Dropdown items</strong>
              <button type="button" class="btn btn--muted" data-action="add-dropdown" data-index="${index}">Add dropdown item</button>
            </div>
            ${list(item.dropdown).length ? list(item.dropdown).map((entry, entryIndex) => renderDropdownRow(entry, index, entryIndex)).join('') : '<p class="helper">No dropdown items.</p>'}
          </div>
        </div>
        <div class="row__actions">
          ${reorderControls('navigation', index, total)}
          <button type="button" class="btn btn--danger" data-action="remove-nav" data-index="${index}">Remove</button>
        </div>
      </div>
    `;
  }

  function renderDropdownRow(entry, navIndex, entryIndex) {
    const inputId = `nav-${navIndex}-dd-${entryIndex}-href`;
    return `
      <div class="mini-row">
        <label>Label
          <input data-dropdown-field="label" data-nav-index="${navIndex}" data-entry-index="${entryIndex}" value="${escapeHtml(entry.label || '')}">
        </label>
        <label>Link
          <div class="image-input">
            <input id="${inputId}" data-dropdown-field="href" data-nav-index="${navIndex}" data-entry-index="${entryIndex}" value="${escapeHtml(entry.href || '')}">
            <button type="button" class="btn btn--ghost" data-link-picker="#${inputId}">Browse</button>
          </div>
        </label>
        <button type="button" class="btn btn--danger" data-action="remove-dropdown" data-index="${navIndex}" data-entry-index="${entryIndex}">Remove</button>
      </div>
    `;
  }

  /* =========================================================
     Backups
     ========================================================= */
  function renderBackups() {
    panel.innerHTML = `
      <div class="panel stack">
        <h2>Backups</h2>
        <p>Every publish creates a timestamped snapshot of <code>cms-content.json</code>. Restore one if a publish broke something — the website files will be regenerated from the backup.</p>
        <div id="backupList"><p class="helper">Loading backups…</p></div>
      </div>
    `;
    api('/api/admin/backups').then(data => {
      const list = data.backups || [];
      const container = document.getElementById('backupList');
      if (!container) return;
      if (!list.length) {
        container.innerHTML = '<p class="helper">No backups yet. Publish a change to create one.</p>';
        return;
      }
      container.innerHTML = `
        <div class="rows">
          ${list.map(b => `
            <div class="mini-row" style="grid-template-columns: 1fr auto auto">
              <div>
                <strong>${escapeHtml(new Date(b.modifiedAt).toLocaleString())}</strong>
                <span class="helper" style="display:block">${escapeHtml(b.filename)} · ${formatSize(b.size)}</span>
              </div>
              <div class="row__actions">
                <button type="button" class="btn btn--muted" data-action="restore-backup" data-id="${escapeHtml(b.filename)}">Restore</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }).catch(error => {
      const container = document.getElementById('backupList');
      if (container) container.innerHTML = `<p class="status status--error">${escapeHtml(error.message)}</p>`;
    });
  }

  function restoreBackup(filename) {
    openModal({
      title: 'Restore this backup?',
      body: `
        <p>This replaces <strong>cms-content.json</strong> and the generated site files with the version from <code>${escapeHtml(filename)}</code>.</p>
        <p class="helper">A new backup of the current state is created before restoring, so you can undo this.</p>
      `,
      foot: `
        <button type="button" class="btn btn--ghost" data-modal-close>Cancel</button>
        <button type="button" class="btn btn--danger" data-confirm-restore>Restore</button>
      `
    });
    document.querySelector('[data-confirm-restore]').addEventListener('click', async () => {
      try {
        await api('/api/admin/backups/restore', { method: 'POST', body: JSON.stringify({ filename }) });
        closeModal('confirm');
        await loadContent();
        showToast('Backup restored. Live site updated.');
      } catch (error) {
        showToast(error.message, 'error');
      }
    }, { once: true });
  }

  /* =========================================================
     Footer / Pages / Site renderers
     ========================================================= */
  function linkRowsHtml(items, group) {
    if (!items.length) return `<p class="helper">No items yet. Click "Add" to start.</p>`;
    const total = items.length;
    return items.map((item, i) => {
      const inputId = `${group}-${i}-href`;
      return `
        <div class="mini-row" style="grid-template-columns: 1fr 1.4fr auto auto">
          <label>Label
            <input data-link-field="label" data-group="${group}" data-index="${i}" value="${escapeHtml(item.label || '')}">
          </label>
          <label>Link
            <div class="image-input">
              <input id="${inputId}" data-link-field="href" data-group="${group}" data-index="${i}" value="${escapeHtml(item.href || '')}">
              <button type="button" class="btn btn--ghost" data-link-picker="#${inputId}" data-external="true">Browse</button>
            </div>
          </label>
          ${reorderControls(group, i, total)}
          <button type="button" class="btn btn--danger" data-action="remove-link" data-group="${group}" data-index="${i}">Remove</button>
        </div>
      `;
    }).join('');
  }

  function renderFooter() {
    const footer = content.footer;
    panel.innerHTML = `
      <div class="stack">
        <div class="panel stack">
          <h2>Brand description</h2>
          <p class="helper">Shown next to the footer logo.</p>
          <label class="wide">Tagline
            <textarea data-footer-field="brandTagline">${escapeHtml(footer.brandTagline || '')}</textarea>
          </label>
        </div>

        ${footerColumnPanel('Shop column', 'shopLinks', footer.shopLinks)}
        ${footerColumnPanel('Care column', 'careLinks', footer.careLinks)}
        ${footerColumnPanel('House column', 'houseLinks', footer.houseLinks)}
        ${footerColumnPanel('Legal links (bottom row)', 'legalLinks', footer.legalLinks)}

        <div class="panel stack">
          <div class="toolbar">
            <h2>Social links</h2>
            <button type="button" class="btn btn--muted" data-action="add-social">Add social</button>
          </div>
          <p class="helper">External URLs (https://) are allowed for social and footer links. Network controls the icon shown on the site.</p>
          <div class="rows">
            ${footer.socialLinks.length ? footer.socialLinks.map((s, i) => {
              const inputId = `social-${i}-href`;
              return `
                <div class="mini-row" style="grid-template-columns: 140px 1fr 1.4fr auto auto">
                  <label>Network
                    <select data-social-field="network" data-index="${i}">
                      ${SOCIAL_NETWORKS.map(n => `<option value="${n}"${(s.network || '') === n ? ' selected' : ''}>${n}</option>`).join('')}
                    </select>
                  </label>
                  <label>Label
                    <input data-social-field="label" data-index="${i}" value="${escapeHtml(s.label || '')}">
                  </label>
                  <label>URL
                    <div class="image-input">
                      <input id="${inputId}" data-social-field="href" data-index="${i}" value="${escapeHtml(s.href || '')}" placeholder="https://instagram.com/your-handle">
                      <button type="button" class="btn btn--ghost" data-link-picker="#${inputId}" data-external="true">Browse</button>
                    </div>
                  </label>
                  ${reorderControls('socialLinks', i, footer.socialLinks.length)}
                  <button type="button" class="btn btn--danger" data-action="remove-social" data-index="${i}">Remove</button>
                </div>
              `;
            }).join('') : '<p class="helper">No social links yet.</p>'}
          </div>
        </div>

        <div class="panel stack">
          <h2>Copyright</h2>
          <label class="wide">Copyright line
            <input data-footer-field="copyright" value="${escapeHtml(footer.copyright || '')}">
          </label>
        </div>
      </div>
    `;
  }

  function footerColumnPanel(title, group, items) {
    return `
      <div class="panel stack">
        <div class="toolbar">
          <h2>${escapeHtml(title)}</h2>
          <button type="button" class="btn btn--muted" data-action="add-link" data-group="${group}">Add link</button>
        </div>
        <div class="rows">
          ${linkRowsHtml(items, group)}
        </div>
      </div>
    `;
  }

  function renderPages() {
    const sections = [
      { key: 'pdp', label: 'Product page' },
      { key: 'checkout', label: 'Checkout' },
      { key: 'confirmation', label: 'Order confirmation' },
      { key: 'account', label: 'Account' },
      { key: 'search', label: 'Search' }
    ];
    panel.innerHTML = `
      <div class="pages-tabs">
        ${sections.map(s => `<button type="button" class="${activePagesSection === s.key ? 'is-active' : ''}" data-pages-section="${s.key}">${escapeHtml(s.label)}</button>`).join('')}
      </div>
      <div class="pages-body" id="pagesBody"></div>
    `;
    paintPages();
  }

  function paintPages() {
    const body = $('#pagesBody');
    if (!body) return;
    if (activePagesSection === 'pdp') body.innerHTML = renderPdpPanel();
    if (activePagesSection === 'checkout') body.innerHTML = renderCheckoutPanel();
    if (activePagesSection === 'confirmation') body.innerHTML = renderConfirmationPanel();
    if (activePagesSection === 'account') body.innerHTML = renderAccountPanel();
    if (activePagesSection === 'search') body.innerHTML = renderSearchPanel();
  }

  function renderPdpPanel() {
    const pdp = content.pdp;
    return `
      <div class="stack">
        <div class="panel stack">
          <h2>Description templates</h2>
          <p class="helper">Use <code>{name}</code> and <code>{brand}</code> as placeholders. Each product reuses the same template; product-specific text isn't editable per-product yet.</p>
          <label class="wide">Short description (under price)
            <textarea data-pdp-field="shortDescTemplate">${escapeHtml(pdp.shortDescTemplate || '')}</textarea>
          </label>
          <label class="wide">Long description (Description accordion)
            <textarea data-pdp-field="longDescTemplate">${escapeHtml(pdp.longDescTemplate || '')}</textarea>
          </label>
        </div>

        <div class="panel stack">
          <h2>Trust perks</h2>
          <p class="helper">One per line. Shown next to the Add-to-bag button on every product page.</p>
          <label class="wide">Perks
            <textarea data-pdp-list="perks">${escapeHtml((pdp.perks || []).join('\n'))}</textarea>
          </label>
        </div>

        <div class="panel stack">
          <h2>Accordions</h2>
          <div class="form-grid">
            <label>How-to-use title
              <input data-pdp-field="howToUseTitle" value="${escapeHtml(pdp.howToUseTitle || '')}">
            </label>
            <label>Delivery & returns title
              <input data-pdp-field="deliveryReturnsTitle" value="${escapeHtml(pdp.deliveryReturnsTitle || '')}">
            </label>
            <label class="wide">How-to-use copy
              <textarea data-pdp-field="howToUseCopy">${escapeHtml(pdp.howToUseCopy || '')}</textarea>
            </label>
            <label class="wide">Delivery & returns copy
              <textarea data-pdp-field="deliveryReturnsCopy">${escapeHtml(pdp.deliveryReturnsCopy || '')}</textarea>
            </label>
          </div>
        </div>

        <div class="panel stack">
          <h2>Related products section</h2>
          <div class="form-grid">
            <label>Eyebrow
              <input data-pdp-field="relatedEyebrow" value="${escapeHtml(pdp.relatedEyebrow || '')}">
            </label>
            <label>Heading
              <input data-pdp-field="relatedTitle" value="${escapeHtml(pdp.relatedTitle || '')}">
            </label>
          </div>
        </div>
      </div>
    `;
  }

  function renderCheckoutPanel() {
    const checkout = content.checkout;
    return `
      <div class="stack">
        <div class="panel stack">
          <h2>Top labels</h2>
          <div class="form-grid">
            <label>Secure-checkout label (header)
              <input data-checkout-field="secureLabel" value="${escapeHtml(checkout.secureLabel || '')}">
            </label>
          </div>
        </div>

        <div class="panel stack">
          <div class="toolbar">
            <h2>Shipping methods</h2>
            <button type="button" class="btn btn--muted" data-action="add-shipping">Add method</button>
          </div>
          <p class="helper">"Standard" gets free shipping when subtotal ≥ free-shipping threshold. Use whole numbers in pounds.</p>
          <div class="rows">
            ${checkout.shippingMethods.length ? checkout.shippingMethods.map((m, i) => `
              <div class="mini-row" style="grid-template-columns: 130px 1fr 1.4fr 100px auto auto">
                <label>Key
                  <input data-shipping-field="key" data-index="${i}" value="${escapeHtml(m.key || '')}" placeholder="standard">
                </label>
                <label>Label
                  <input data-shipping-field="label" data-index="${i}" value="${escapeHtml(m.label || '')}">
                </label>
                <label>Sub-label
                  <input data-shipping-field="sublabel" data-index="${i}" value="${escapeHtml(m.sublabel || '')}">
                </label>
                <label>Price (£)
                  <input type="number" step="0.01" min="0" data-shipping-field="price" data-index="${i}" value="${escapeHtml(m.price ?? 0)}">
                </label>
                ${reorderControls('shippingMethods', i, checkout.shippingMethods.length)}
                <button type="button" class="btn btn--danger" data-action="remove-shipping" data-index="${i}">Remove</button>
              </div>
            `).join('') : '<p class="helper">No shipping methods yet.</p>'}
          </div>
        </div>

        <div class="panel stack">
          <h2>Pricing rules</h2>
          <div class="form-grid">
            <label>Free shipping over (£)
              <input type="number" step="1" min="0" data-checkout-field="freeShippingThreshold" value="${Number(checkout.freeShippingThreshold || 0)}">
            </label>
            <label>VAT rate (0–1)
              <input type="number" step="0.01" min="0" max="1" data-checkout-field="vatRate" value="${Number(checkout.vatRate || 0)}">
            </label>
          </div>
        </div>

        <div class="panel stack">
          <div class="toolbar">
            <h2>Promo codes</h2>
            <button type="button" class="btn btn--muted" data-action="add-promo">Add promo</button>
          </div>
          <div class="rows">
            ${checkout.promoCodes.length ? checkout.promoCodes.map((p, i) => `
              <div class="mini-row" style="grid-template-columns: 1fr 100px auto auto">
                <label>Code (uppercase)
                  <input data-promo-field="code" data-index="${i}" value="${escapeHtml(p.code || '')}" style="text-transform:uppercase">
                </label>
                <label>Discount %
                  <input type="number" step="1" min="1" max="100" data-promo-field="percent" data-index="${i}" value="${Number(p.percent || 0)}">
                </label>
                ${reorderControls('promoCodes', i, checkout.promoCodes.length)}
                <button type="button" class="btn btn--danger" data-action="remove-promo" data-index="${i}">Remove</button>
              </div>
            `).join('') : '<p class="helper">No promo codes yet.</p>'}
          </div>
        </div>

        <div class="panel stack">
          <h2>Order summary perks</h2>
          <p class="helper">One per line. Shown in the checkout sidebar.</p>
          <label class="wide">Perks
            <textarea data-checkout-list="perks">${escapeHtml((checkout.perks || []).join('\n'))}</textarea>
          </label>
        </div>

        <div class="panel stack">
          <h2>Fineprint</h2>
          <label class="wide">Below "Place order" button
            <textarea data-checkout-field="fineprint">${escapeHtml(checkout.fineprint || '')}</textarea>
          </label>
        </div>
      </div>
    `;
  }

  function renderConfirmationPanel() {
    const conf = content.confirmation;
    return `
      <div class="stack">
        <div class="panel stack">
          <h2>Order confirmation copy</h2>
          <div class="form-grid">
            <label>Title
              <input data-confirmation-field="title" value="${escapeHtml(conf.title || '')}">
            </label>
            <label class="wide">Subtitle
              <textarea data-confirmation-field="subtitle">${escapeHtml(conf.subtitle || '')}</textarea>
            </label>
            <label>"Continue shopping" button
              <input data-confirmation-field="continueShoppingLabel" value="${escapeHtml(conf.continueShoppingLabel || '')}">
            </label>
            <label>"View order history" button
              <input data-confirmation-field="viewOrdersLabel" value="${escapeHtml(conf.viewOrdersLabel || '')}">
            </label>
          </div>
        </div>
      </div>
    `;
  }

  function renderAccountPanel() {
    const acc = content.account;
    return `
      <div class="stack">
        <div class="panel stack">
          <h2>Sign-in gate (logged-out users)</h2>
          <div class="form-grid">
            <label class="wide">Title
              <input data-account-field="gateTitle" value="${escapeHtml(acc.gateTitle || '')}">
            </label>
            <label class="wide">Subtitle
              <textarea data-account-field="gateSubtitle">${escapeHtml(acc.gateSubtitle || '')}</textarea>
            </label>
            <label>Primary button
              <input data-account-field="gatePrimaryLabel" value="${escapeHtml(acc.gatePrimaryLabel || '')}">
            </label>
            <label>Secondary button
              <input data-account-field="gateSecondaryLabel" value="${escapeHtml(acc.gateSecondaryLabel || '')}">
            </label>
          </div>
        </div>

        <div class="panel stack">
          <h2>Tab labels</h2>
          <div class="form-grid">
            <label>Orders tab
              <input data-account-tab="orders" value="${escapeHtml((acc.tabLabels && acc.tabLabels.orders) || '')}">
            </label>
            <label>Profile tab
              <input data-account-tab="profile" value="${escapeHtml((acc.tabLabels && acc.tabLabels.profile) || '')}">
            </label>
            <label>Addresses tab
              <input data-account-tab="addresses" value="${escapeHtml((acc.tabLabels && acc.tabLabels.addresses) || '')}">
            </label>
            <label>Preferences tab
              <input data-account-tab="preferences" value="${escapeHtml((acc.tabLabels && acc.tabLabels.preferences) || '')}">
            </label>
          </div>
        </div>

        <div class="panel stack">
          <h2>Preferences toggles</h2>
          <p class="helper">One per line. Each line becomes a checkbox label on the Preferences tab.</p>
          <label class="wide">Preference labels
            <textarea data-account-list="preferences">${escapeHtml((acc.preferences || []).join('\n'))}</textarea>
          </label>
        </div>
      </div>
    `;
  }

  function renderSearchPanel() {
    const s = content.search;
    return `
      <div class="stack">
        <div class="panel stack">
          <h2>Search field</h2>
          <div class="form-grid">
            <label class="wide">Placeholder text
              <input data-search-field="placeholder" value="${escapeHtml(s.placeholder || '')}">
            </label>
            <label>Popular searches label
              <input data-search-field="popularLabel" value="${escapeHtml(s.popularLabel || '')}">
            </label>
          </div>
        </div>

        <div class="panel stack">
          <div class="toolbar">
            <h2>Popular search chips</h2>
            <button type="button" class="btn btn--muted" data-action="add-chip">Add chip</button>
          </div>
          <p class="helper">Each chip pre-fills the search box with its query when tapped.</p>
          <div class="rows">
            ${s.chips.length ? s.chips.map((c, i) => `
              <div class="mini-row" style="grid-template-columns: 1fr 1fr auto auto">
                <label>Label
                  <input data-chip-field="label" data-index="${i}" value="${escapeHtml(c.label || '')}">
                </label>
                <label>Query
                  <input data-chip-field="query" data-index="${i}" value="${escapeHtml(c.query || '')}">
                </label>
                ${reorderControls('searchChips', i, s.chips.length)}
                <button type="button" class="btn btn--danger" data-action="remove-chip" data-index="${i}">Remove</button>
              </div>
            `).join('') : '<p class="helper">No chips yet.</p>'}
          </div>
        </div>

        <div class="panel stack">
          <h2>No-results message</h2>
          <div class="form-grid">
            <label>Title
              <input data-search-field="noResultsTitle" value="${escapeHtml(s.noResultsTitle || '')}">
            </label>
            <label class="wide">Body
              <textarea data-search-field="noResultsBody">${escapeHtml(s.noResultsBody || '')}</textarea>
            </label>
          </div>
        </div>
      </div>
    `;
  }

  function renderSite() {
    const site = content.site;
    panel.innerHTML = `
      <div class="stack">
        <div class="panel stack">
          <h2>Brand wordmark</h2>
          <p class="helper">Used in the header, footer, and CMS topbar.</p>
          <div class="form-grid">
            <label>Brand name
              <input data-site-field="brandName" value="${escapeHtml(site.brandName || '')}">
            </label>
            <label>Brand tag (e.g. "Aesthetics")
              <input data-site-field="brandTag" value="${escapeHtml(site.brandTag || '')}">
            </label>
          </div>
        </div>

        <div class="panel stack">
          <h2>Theme colours</h2>
          <p class="helper">Hex values. Applied site-wide via CSS variables on next publish.</p>
          <div class="form-grid">
            <label>Navy (primary)
              <input type="color" data-site-color="navy" value="${escapeHtml(site.themeColors.navy || '#0F2C5C')}">
            </label>
            <label>Red (accent)
              <input type="color" data-site-color="red" value="${escapeHtml(site.themeColors.red || '#C8102E')}">
            </label>
            <label>Cream (background)
              <input type="color" data-site-color="cream" value="${escapeHtml(site.themeColors.cream || '#F8F4EC')}">
            </label>
          </div>
        </div>
      </div>
    `;
  }

  function renderProducts() {
    const products = filteredProducts();
    const selected = selectedProduct();
    panel.innerHTML = `
      <div class="product-layout">
        <aside class="panel">
          <div class="toolbar">
            <h2>Catalogue</h2>
            <button type="button" class="btn btn--muted" data-action="new-product">New</button>
          </div>
          ${draftAvailable ? '<button type="button" class="btn btn--ghost" data-action="load-draft" style="width:100%;margin-bottom:12px">Load saved draft</button>' : ''}
          <label>Search products
            <input id="productSearch" value="${escapeHtml(productSearch)}" placeholder="Name, brand, category">
          </label>
          <div class="product-list" style="margin-top:12px">
            ${products.length ? products.map(renderProductButton).join('') : '<div class="empty-state">No products found.</div>'}
          </div>
        </aside>
        <section class="editor">
          ${selected ? renderProductForm(selected) : '<div class="empty-state">Select or create a product.</div>'}
        </section>
      </div>
    `;
  }

  function filteredProducts() {
    const q = productSearch.trim().toLowerCase();
    if (!q) return content.products;
    return content.products.filter(product => {
      return [product.name, product.brand, product.cat, product.sub, product.id].some(value => String(value || '').toLowerCase().includes(q));
    });
  }

  function selectedProduct() {
    return content.products.find(product => product.id === selectedProductId) || content.products[0] || null;
  }

  function renderProductButton(product) {
    return `
      <button type="button" class="product-item${product.id === selectedProductId ? ' is-active' : ''}" data-product-id="${escapeHtml(product.id)}">
        <strong>${escapeHtml(product.name)}</strong>
        <span>${escapeHtml(product.brand)} - ${escapeHtml(categoryLabels[product.cat] || product.cat)} / ${escapeHtml(product.sub)}</span>
      </button>
    `;
  }

  function renderProductForm(product) {
    return `
      <div class="toolbar">
        <h2>Edit product</h2>
        <div class="row__actions">
          <button type="button" class="btn btn--muted" data-action="duplicate-product">Duplicate</button>
          <button type="button" class="btn btn--danger" data-action="delete-product">Delete</button>
        </div>
      </div>
      <div class="form-grid">
        <label>Product ID
          <input data-product-field="id" value="${escapeHtml(product.id)}">
        </label>
        <label>Category
          <select data-product-field="cat">
            ${Object.entries(categoryLabels).map(([value, label]) => `<option value="${value}"${product.cat === value ? ' selected' : ''}>${label}</option>`).join('')}
          </select>
        </label>
        <label>Subcategory
          ${renderSubcategorySelect(product)}
        </label>
        <label>Brand
          <input data-product-field="brand" value="${escapeHtml(product.brand || '')}">
        </label>
        <label class="wide">Product name
          <input data-product-field="name" value="${escapeHtml(product.name || '')}">
        </label>
        <label>Size
          <input data-product-field="size" value="${escapeHtml(product.size || '')}">
        </label>
        <label>Price
          <input type="number" step="0.01" data-product-field="price" value="${escapeHtml(product.price || 0)}">
        </label>
        <label>Old price
          <input type="number" step="0.01" data-product-field="oldPrice" value="${escapeHtml(product.oldPrice || '')}">
        </label>
        <label>Rating
          <input type="number" step="0.1" min="0" max="5" data-product-field="rating" value="${escapeHtml(product.rating || 0)}">
        </label>
        <label class="wide">Tags
          ${renderTagChips(product)}
        </label>
        <label class="wide">Main image
          ${isSafeAssetPath(product.image) ? `<img class="image-preview image-preview--wide" src="${escapeHtml(product.image)}" alt="">` : '<div class="image-preview image-preview--wide image-preview--empty">No preview</div>'}
          <div class="image-input">
            <input id="product-image-input" data-product-field="image" value="${escapeHtml(product.image || '')}">
            <button type="button" class="btn btn--ghost" data-image-picker="#product-image-input">Browse</button>
          </div>
        </label>
        <label class="wide">Hover image
          ${isSafeAssetPath(product.alt) ? `<img class="image-preview image-preview--wide" src="${escapeHtml(product.alt)}" alt="">` : '<div class="image-preview image-preview--wide image-preview--empty">No preview</div>'}
          <div class="image-input">
            <input id="product-alt-input" data-product-field="alt" value="${escapeHtml(product.alt || '')}">
            <button type="button" class="btn btn--ghost" data-image-picker="#product-alt-input">Browse</button>
          </div>
        </label>
      </div>
      <p class="helper" style="margin-top:14px">Tip: for dermal top-bar filters, use subcategories such as dermal-fillers, skin-boosters, fat-dissolvers, chemical-peel, exosomes, mesotherapy, under-eye-boosters, or clinic-consumables.</p>
    `;
  }

  function renderTagChips(product) {
    const tags = list(product.tags);
    return `
      <div class="tag-chips" id="tagChips">
        ${tags.map((tag, i) => `
          <span class="tag-chip">
            ${escapeHtml(tag)}
            <button type="button" class="tag-chip__remove" data-action="remove-tag" data-tag="${escapeHtml(tag)}" aria-label="Remove">×</button>
          </span>
        `).join('')}
        <button type="button" class="tag-chip tag-chip--add" data-action="add-tag-prompt">+ Add tag</button>
      </div>
      <div class="helper">Suggestions: ${tagOptions.map(t => `<button type="button" class="tag-suggest${tags.includes(t) ? ' is-active' : ''}" data-action="toggle-suggested-tag" data-tag="${t}">${t}</button>`).join(' ')}</div>
    `;
  }

  function renderSubcategorySelect(product) {
    const options = subcategoriesByCategory[product.cat] || [];
    const hasCurrent = options.includes(product.sub);
    return `
      <select data-product-field="sub">
        ${!hasCurrent && product.sub ? `<option value="${escapeHtml(product.sub)}" selected>${escapeHtml(product.sub)} (custom)</option>` : ''}
        ${options.map(option => `<option value="${option}"${product.sub === option ? ' selected' : ''}>${option}</option>`).join('')}
      </select>
    `;
  }

  function renderGuide() {
    panel.innerHTML = `
      <div class="stack">
        <div class="panel stack">
          <h2>Editor guide</h2>
          <p>1. Make edits in the matching tab. 2. Save a draft while work is unfinished. 3. Preview the draft. 4. Publish live when it is ready.</p>
          <p>Image uploads are saved to assets/uploads and the CMS places that path into the selected image field.</p>
        </div>
        <div class="panel stack">
          <h2>Website/CMS rule</h2>
          <p>${escapeHtml(content.cmsNote)}</p>
          <p class="helper">Examples: if the main website gets a new homepage block, add a CMS block for it. If products get a new field like stock, shade, treatment area, or SKU, add a product field here too.</p>
        </div>
        <div class="panel stack">
          <h2>Starting the system</h2>
          <p>Run <strong>npm start</strong> from this folder. Open the website at the local URL and open the CMS at /cms.html.</p>
        </div>
      </div>
    `;
  }

  function parseDropdown(value) {
    return String(value || '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [label, ...hrefParts] = line.split('|');
        return {
          label: label.trim(),
          href: hrefParts.join('|').trim()
        };
      })
      .filter(item => item.label);
  }

  function updateByDataset(target) {
    if (!content) return;

    if (target.matches('[data-announcements]')) {
      content.announcement.messages = target.value.split('\n').map(line => line.trim()).filter(Boolean);
      markDirty();
      return;
    }

    if (target.dataset.heroField) {
      content.home.hero[target.dataset.heroField] = target.value;
      markDirty();
      return;
    }

    if (target.matches('[data-hero-lines]')) {
      content.home.hero.titleLines = target.value.split('\n').map(line => line.trim()).filter(Boolean);
      markDirty();
      return;
    }

    if (target.dataset.heroCta) {
      const [key, field] = target.dataset.heroCta.split('.');
      content.home.hero[key] = content.home.hero[key] || {};
      content.home.hero[key][field] = target.value;
      markDirty();
      return;
    }

    if (target.dataset.slideField) {
      const slide = content.home.hero.slides[Number(target.dataset.index)];
      if (slide) slide[target.dataset.slideField] = target.value;
      markDirty();
      return;
    }

    if (target.dataset.categoryField) {
      const category = content.home.categories[Number(target.dataset.index)];
      if (category) category[target.dataset.categoryField] = target.value;
      markDirty();
      return;
    }

    if (target.dataset.navField) {
      const item = content.navigation.items[Number(target.dataset.index)];
      if (item) item[target.dataset.navField] = target.value;
      markDirty();
      return;
    }

    if (target.matches('[data-nav-dropdown]')) {
      const item = content.navigation.items[Number(target.dataset.index)];
      if (item) item.dropdown = parseDropdown(target.value);
      markDirty();
      return;
    }

    if (target.dataset.dropdownField) {
      const item = content.navigation.items[Number(target.dataset.navIndex)];
      const entry = item && item.dropdown[Number(target.dataset.entryIndex)];
      if (entry) entry[target.dataset.dropdownField] = target.value;
      markDirty();
      return;
    }

    if (target.dataset.productField) {
      const product = selectedProduct();
      if (!product) return;
      const field = target.dataset.productField;
      const previousId = product.id;
      if (field === 'price' || field === 'oldPrice' || field === 'rating') {
        const number = target.value === '' ? '' : Number(target.value);
        if (field === 'oldPrice' && number === '') delete product.oldPrice;
        else product[field] = number;
      } else if (field === 'id') {
        product.id = slug(target.value);
        selectedProductId = product.id;
        if (target.value !== product.id) target.value = product.id;
      } else {
        product[field] = target.value;
      }
      if (field === 'cat') {
        const options = subcategoriesByCategory[product.cat] || [];
        product.sub = options[0] || 'general';
        renderProducts();
      }
      if (field === 'id' && previousId !== product.id) renderProducts();
      markDirty();
      return;
    }

    if (target.matches('[data-product-tags]')) {
      const product = selectedProduct();
      if (product) product.tags = target.value.split(',').map(tag => tag.trim()).filter(Boolean);
      markDirty();
      return;
    }

    if (target.dataset.productTag) {
      const product = selectedProduct();
      if (!product) return;
      const tags = new Set(list(product.tags));
      if (target.checked) tags.add(target.dataset.productTag);
      else tags.delete(target.dataset.productTag);
      product.tags = Array.from(tags);
      markDirty();
      return;
    }

    /* Footer */
    if (target.dataset.footerField) {
      content.footer[target.dataset.footerField] = target.value;
      markDirty();
      return;
    }
    if (target.dataset.footerList) {
      content.footer[target.dataset.footerList] = target.value.split('\n').map(s => s.trim()).filter(Boolean);
      markDirty();
      return;
    }
    if (target.dataset.linkField) {
      const group = target.dataset.group;
      const idx = Number(target.dataset.index);
      const arr = list(content.footer[group]);
      if (arr[idx]) arr[idx][target.dataset.linkField] = target.value;
      markDirty();
      return;
    }
    if (target.dataset.socialField) {
      const idx = Number(target.dataset.index);
      const social = content.footer.socialLinks[idx];
      if (social) social[target.dataset.socialField] = target.value;
      markDirty();
      return;
    }

    /* PDP */
    if (target.dataset.pdpField) {
      content.pdp[target.dataset.pdpField] = target.value;
      markDirty();
      return;
    }
    if (target.dataset.pdpList) {
      content.pdp[target.dataset.pdpList] = target.value.split('\n').map(s => s.trim()).filter(Boolean);
      markDirty();
      return;
    }

    /* Checkout */
    if (target.dataset.checkoutField) {
      const field = target.dataset.checkoutField;
      if (field === 'freeShippingThreshold' || field === 'vatRate') {
        content.checkout[field] = Number(target.value);
      } else {
        content.checkout[field] = target.value;
      }
      markDirty();
      return;
    }
    if (target.dataset.checkoutList) {
      content.checkout[target.dataset.checkoutList] = target.value.split('\n').map(s => s.trim()).filter(Boolean);
      markDirty();
      return;
    }
    if (target.dataset.shippingField) {
      const idx = Number(target.dataset.index);
      const method = content.checkout.shippingMethods[idx];
      if (!method) return;
      const field = target.dataset.shippingField;
      if (field === 'price') method.price = Number(target.value);
      else method[field] = target.value;
      markDirty();
      return;
    }
    if (target.dataset.promoField) {
      const idx = Number(target.dataset.index);
      const promo = content.checkout.promoCodes[idx];
      if (!promo) return;
      const field = target.dataset.promoField;
      if (field === 'percent') promo.percent = Number(target.value);
      else if (field === 'code') promo.code = target.value.toUpperCase();
      else promo[field] = target.value;
      markDirty();
      return;
    }

    /* Confirmation */
    if (target.dataset.confirmationField) {
      content.confirmation[target.dataset.confirmationField] = target.value;
      markDirty();
      return;
    }

    /* Account */
    if (target.dataset.accountField) {
      content.account[target.dataset.accountField] = target.value;
      markDirty();
      return;
    }
    if (target.dataset.accountTab) {
      content.account.tabLabels = content.account.tabLabels || {};
      content.account.tabLabels[target.dataset.accountTab] = target.value;
      markDirty();
      return;
    }
    if (target.dataset.accountList) {
      content.account[target.dataset.accountList] = target.value.split('\n').map(s => s.trim()).filter(Boolean);
      markDirty();
      return;
    }

    /* Search */
    if (target.dataset.searchField) {
      content.search[target.dataset.searchField] = target.value;
      markDirty();
      return;
    }
    if (target.dataset.chipField) {
      const idx = Number(target.dataset.index);
      const chip = content.search.chips[idx];
      if (chip) chip[target.dataset.chipField] = target.value;
      markDirty();
      return;
    }

    /* Site */
    if (target.dataset.siteField) {
      content.site[target.dataset.siteField] = target.value;
      markDirty();
      return;
    }
    if (target.dataset.siteColor) {
      content.site.themeColors = content.site.themeColors || {};
      content.site.themeColors[target.dataset.siteColor] = target.value;
      markDirty();
      return;
    }
  }

  /* Add/remove helpers for footer/pages lists */
  function addLink(group) {
    if (!content.footer[group]) content.footer[group] = [];
    content.footer[group].push({ label: 'New link', href: '#' });
    markDirty();
    renderFooter();
  }
  function removeLink(group, index) {
    if (!content.footer[group]) return;
    content.footer[group].splice(index, 1);
    markDirty();
    renderFooter();
  }
  function addSocial() {
    content.footer.socialLinks = list(content.footer.socialLinks);
    content.footer.socialLinks.push({ network: 'instagram', label: 'Instagram', href: 'https://' });
    markDirty();
    renderFooter();
  }
  function removeSocial(index) {
    content.footer.socialLinks.splice(index, 1);
    markDirty();
    renderFooter();
  }
  function addShipping() {
    content.checkout.shippingMethods.push({ key: `method-${Date.now()}`, label: 'New method', sublabel: '', price: 0 });
    markDirty();
    paintPages();
  }
  function removeShipping(index) {
    content.checkout.shippingMethods.splice(index, 1);
    markDirty();
    paintPages();
  }
  function addPromo() {
    content.checkout.promoCodes.push({ code: 'NEWCODE', percent: 10 });
    markDirty();
    paintPages();
  }
  function removePromo(index) {
    content.checkout.promoCodes.splice(index, 1);
    markDirty();
    paintPages();
  }
  function addChip() {
    content.search.chips.push({ label: 'New chip', query: '' });
    markDirty();
    paintPages();
  }
  function removeChip(index) {
    content.search.chips.splice(index, 1);
    markDirty();
    paintPages();
  }

  function addProduct() {
    const product = {
      id: `new-product-${Date.now()}`,
      cat: 'dermal-fillers',
      sub: 'dermal-fillers',
      brand: '',
      name: 'New Product',
      size: '',
      price: 0,
      rating: 0,
      image: 'assets/images/product-dropper.jpg',
      alt: 'assets/images/cat-dermal.jpg',
      tags: ['new']
    };
    content.products.unshift(product);
    selectedProductId = product.id;
    markDirty();
    renderProducts();
  }

  function duplicateProduct() {
    const product = selectedProduct();
    if (!product) return;
    const copy = JSON.parse(JSON.stringify(product));
    copy.id = `${product.id}-copy-${Date.now()}`;
    copy.name = `${product.name} Copy`;
    content.products.unshift(copy);
    selectedProductId = copy.id;
    markDirty();
    renderProducts();
  }

  function deleteProduct() {
    const product = selectedProduct();
    if (!product) return;
    if (!confirm(`Delete ${product.name}?`)) return;
    content.products = content.products.filter(item => item.id !== product.id);
    selectedProductId = content.products[0] ? content.products[0].id : null;
    markDirty();
    renderProducts();
  }

  function addNavItem() {
    content.navigation.items.push({ label: 'New item', href: '#', dropdown: [] });
    markDirty();
    renderNavigation();
  }

  function removeNavItem(index) {
    content.navigation.items.splice(index, 1);
    markDirty();
    renderNavigation();
  }

  function addDropdownItem(index) {
    const item = content.navigation.items[index];
    if (!item) return;
    item.dropdown = list(item.dropdown);
    item.dropdown.push({ label: 'New dropdown item', href: item.href || '#' });
    markDirty();
    renderNavigation();
  }

  function removeDropdownItem(navIndex, entryIndex) {
    const item = content.navigation.items[navIndex];
    if (!item) return;
    item.dropdown.splice(entryIndex, 1);
    markDirty();
    renderNavigation();
  }

  function addSlide() {
    content.home.hero.slides.push({ image: 'assets/images/hero-01.jpg', alt: '' });
    markDirty();
    renderHome();
  }

  function removeSlide(index) {
    content.home.hero.slides.splice(index, 1);
    markDirty();
    renderHome();
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function uploadFile(input) {
    const file = input.files && input.files[0];
    if (!file) return;

    try {
      const result = await api('/api/upload', {
        method: 'POST',
        body: JSON.stringify({
          filename: file.name,
          dataUrl: await fileToDataUrl(file)
        })
      });

      const field = input.dataset.field;
      const type = input.dataset.upload;
      const index = Number(input.dataset.index);

      if (type === 'product') {
        const product = selectedProduct();
        if (product) product[field] = result.path;
      }
      if (type === 'slide' && content.home.hero.slides[index]) {
        content.home.hero.slides[index][field] = result.path;
      }
      if (type === 'category' && content.home.categories[index]) {
        content.home.categories[index][field] = result.path;
      }

      markDirty();
      render();
      showStatus('Image uploaded. Publish changes to update the website.');
    } catch (error) {
      showStatus(error.message, 'error');
    }
  }

  document.addEventListener('click', event => {
    const tabButton = event.target.closest('[data-tab]');
    if (tabButton) {
      setTab(tabButton.dataset.tab);
      return;
    }

    const pagesSection = event.target.closest('[data-pages-section]');
    if (pagesSection) {
      activePagesSection = pagesSection.dataset.pagesSection;
      $$('.pages-tabs button').forEach(btn => btn.classList.toggle('is-active', btn.dataset.pagesSection === activePagesSection));
      paintPages();
      return;
    }

    const reorderBtn = event.target.closest('[data-reorder]');
    if (reorderBtn) {
      const delta = reorderBtn.dataset.reorder === 'up' ? -1 : 1;
      applyReorder(reorderBtn.dataset.group, Number(reorderBtn.dataset.index), delta);
      return;
    }

    const linkPickerBtn = event.target.closest('[data-link-picker]');
    if (linkPickerBtn) {
      const targetSelector = linkPickerBtn.dataset.linkPicker;
      const allowExternal = linkPickerBtn.dataset.external === 'true';
      const input = document.querySelector(targetSelector);
      if (input) openLinkPicker(input.value, allowExternal, value => {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      return;
    }

    const imagePickerBtn = event.target.closest('[data-image-picker]');
    if (imagePickerBtn) {
      const targetSelector = imagePickerBtn.dataset.imagePicker;
      const input = document.querySelector(targetSelector);
      if (input) openImagePicker(input.value, value => {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      return;
    }

    const productButton = event.target.closest('[data-product-id]');
    if (productButton) {
      selectedProductId = productButton.dataset.productId;
      renderProducts();
      return;
    }

    const uploadButton = event.target.closest('[data-upload-trigger]');
    if (uploadButton) {
      const input = document.getElementById(uploadButton.dataset.uploadTrigger);
      if (input) input.click();
      return;
    }

    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;

    const action = actionButton.dataset.action;
    const index = Number(actionButton.dataset.index);
    const id = actionButton.dataset.id;
    if (action === 'new-product') addProduct();
    if (action === 'duplicate-product') duplicateProduct();
    if (action === 'delete-product') deleteProduct();
    if (action === 'add-nav') addNavItem();
    if (action === 'remove-nav') removeNavItem(index);
    if (action === 'add-dropdown') addDropdownItem(index);
    if (action === 'remove-dropdown') removeDropdownItem(index, Number(actionButton.dataset.entryIndex));
    if (action === 'add-slide') addSlide();
    if (action === 'remove-slide') removeSlide(index);
    if (action === 'load-draft') loadDraft();

    /* Footer / Pages list edits */
    if (action === 'add-link') addLink(actionButton.dataset.group);
    if (action === 'remove-link') removeLink(actionButton.dataset.group, index);
    if (action === 'add-social') addSocial();
    if (action === 'remove-social') removeSocial(index);
    if (action === 'add-shipping') addShipping();
    if (action === 'remove-shipping') removeShipping(index);
    if (action === 'add-promo') addPromo();
    if (action === 'remove-promo') removePromo(index);
    if (action === 'add-chip') addChip();
    if (action === 'remove-chip') removeChip(index);
    if (action === 'restore-backup') restoreBackup(id);

    /* Custom tag chips */
    if (action === 'add-tag-prompt') {
      const product = selectedProduct();
      if (!product) return;
      const tag = (prompt('New tag (e.g. "limited", "vegan"):') || '').trim().toLowerCase();
      if (!tag || !/^[a-z0-9-]+$/.test(tag)) {
        if (tag) showToast('Tags must be lowercase letters, numbers, or hyphens.', 'error');
        return;
      }
      product.tags = list(product.tags);
      if (!product.tags.includes(tag)) {
        product.tags.push(tag);
        markDirty();
        renderProducts();
      }
    }
    if (action === 'remove-tag') {
      const product = selectedProduct();
      const tag = actionButton.dataset.tag;
      if (!product || !tag) return;
      product.tags = list(product.tags).filter(t => t !== tag);
      markDirty();
      renderProducts();
    }
    if (action === 'toggle-suggested-tag') {
      const product = selectedProduct();
      const tag = actionButton.dataset.tag;
      if (!product || !tag) return;
      product.tags = list(product.tags);
      if (product.tags.includes(tag)) product.tags = product.tags.filter(t => t !== tag);
      else product.tags.push(tag);
      markDirty();
      renderProducts();
    }
  });

  function refocusSearch(selector, caret) {
    const el = $(selector);
    if (!el) return;
    el.focus();
    try { el.setSelectionRange(caret, caret); } catch (error) {}
  }

  document.addEventListener('input', event => {
    if (event.target.id === 'productSearch') {
      const caret = event.target.selectionStart;
      productSearch = event.target.value;
      renderProducts();
      refocusSearch('#productSearch', caret);
      return;
    }
    updateByDataset(event.target);
  });

  document.addEventListener('change', event => {
    if (event.target.matches('[data-upload]')) {
      uploadFile(event.target);
      return;
    }
    updateByDataset(event.target);
  });

  $('#loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    loginStatus.hidden = true;
    try {
      await api('/api/login', {
        method: 'POST',
        body: JSON.stringify({ password: $('#passwordInput').value })
      });
      showApp();
      await loadContent();
    } catch (error) {
      loginStatus.hidden = false;
      loginStatus.textContent = error.message;
    }
  });

  $('#saveBtn').addEventListener('click', async () => {
    try {
      await saveContent();
    } catch (error) {
      showValidation(error.errors || [error.message]);
    }
  });

  $('#draftBtn').addEventListener('click', async () => {
    try {
      await saveDraft();
    } catch (error) {
      showValidation(error.errors || [error.message]);
    }
  });

  $('#previewBtn').addEventListener('click', () => {
    previewContent();
  });

  $('#loadDraftBtn').addEventListener('click', () => {
    loadDraft();
  });

  $('#reloadBtn').addEventListener('click', async () => {
    if (isDirty && !confirm('Reload and discard unsaved changes?')) return;
    try {
      await loadContent();
      showStatus('Content reloaded.');
    } catch (error) {
      showStatus(error.message, 'error');
    }
  });

  $('#logoutBtn').addEventListener('click', async () => {
    await api('/api/logout', { method: 'POST', body: '{}' }).catch(() => {});
    showLogin();
  });

  window.addEventListener('beforeunload', event => {
    if (!isDirty) return;
    event.preventDefault();
    event.returnValue = '';
  });

  (async function init() {
    if (window.location.protocol === 'file:') {
      showLogin();
      loginStatus.hidden = false;
      loginStatus.textContent = `Open the CMS from ${cmsServerUrl}, not by double-clicking cms.html.`;
      return;
    }

    try {
      await loadContent();
      showApp();
    } catch (error) {
      if (error.status === 401) showLogin();
      else {
        showLogin();
        loginStatus.hidden = false;
        loginStatus.textContent = error.message;
      }
    }
  })();
})();
