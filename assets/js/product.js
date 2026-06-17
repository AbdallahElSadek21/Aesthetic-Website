/* B&S Aesthetics - Product detail page logic */
(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const product = id && window.BS_findById ? window.BS_findById(id) : null;

  const pdp = document.getElementById('pdp');
  const empty = document.getElementById('pdpEmpty');

  if (!product) {
    if (pdp) pdp.hidden = true;
    if (empty) empty.hidden = false;
    return;
  }

  pdp.hidden = false;
  document.title = `${product.name} — B&S Aesthetics`;

  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

  const CATEGORY_LABELS = {
    skincare: { label: 'Skincare', href: 'skincare.html' },
    makeup: { label: 'Makeup', href: 'makeup.html' },
    fragrance: { label: 'Fragrance', href: 'fragrance.html' },
    'dermal-fillers': { label: 'Dermal Fillers', href: 'dermal-fillers.html' },
    devices: { label: 'Devices', href: 'devices.html' },
    wellness: { label: 'Wellness', href: 'wellness.html' }
  };
  const cat = CATEGORY_LABELS[product.cat] || { label: 'Catalogue', href: 'index.html' };
  const catLink = document.getElementById('pdpCatLink');
  if (catLink) {
    catLink.href = cat.href;
    catLink.textContent = cat.label;
  }
  document.getElementById('pdpCrumbName').textContent = product.name;

  document.getElementById('pdpBrand').textContent = product.brand;
  document.getElementById('pdpName').textContent = product.name;

  const ratingEl = document.getElementById('pdpRating');
  if (ratingEl) {
    const filled = Math.round(product.rating);
    const stars = '★★★★★☆☆☆☆☆'.slice(5 - filled, 10 - filled);
    ratingEl.innerHTML = `<span class="pdp__stars" aria-hidden="true">${stars}</span> ${product.rating.toFixed(1)}`;
  }

  const sizeEl = document.getElementById('pdpSize');
  if (sizeEl) sizeEl.textContent = product.size || '';

  const priceEl = document.getElementById('pdpPrice');
  if (priceEl) {
    const oldPrice = product.oldPrice ? `<del>£${product.oldPrice}</del>` : '';
    priceEl.innerHTML = `${oldPrice}<span>£${product.price}</span>`;
  }

  const cmsPdp = (window.BS_CMS_CONTENT && window.BS_CMS_CONTENT.pdp) || {};
  function applyTemplate(template, fallback) {
    return String(template || fallback)
      .replace(/\{name\}/g, product.name)
      .replace(/\{brand\}/g, product.brand)
      .replace(/\{size\}/g, product.size || '');
  }
  const shortDesc = applyTemplate(cmsPdp.shortDescTemplate, `An editorial favourite from ${product.brand}. The ${product.name} delivers a refined ritual designed for those who want efficacy without compromise on craft.`);
  const longDesc = applyTemplate(cmsPdp.longDescTemplate, `${product.name} is part of the curated B&S edit — formulated for visible results and a sensory experience worthy of your shelf. Every product on B&S is sourced direct from authorised channels and tested before listing.`);
  document.getElementById('pdpDesc').textContent = shortDesc;
  document.getElementById('pdpLongDesc').textContent = longDesc;

  const perksEl = document.querySelector('.pdp__perks');
  if (perksEl && Array.isArray(cmsPdp.perks) && cmsPdp.perks.length) {
    perksEl.innerHTML = cmsPdp.perks.map(p => `
      <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 12l4 4L21 6"/></svg> ${p.replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]))}</li>
    `).join('');
  }

  const detailEls = document.querySelectorAll('.pdp__details');
  if (detailEls[1]) {
    const sum = detailEls[1].querySelector('summary');
    const para = detailEls[1].querySelector('p');
    if (sum && cmsPdp.howToUseTitle) sum.textContent = cmsPdp.howToUseTitle;
    if (para && cmsPdp.howToUseCopy) para.textContent = cmsPdp.howToUseCopy;
  }
  if (detailEls[2]) {
    const sum = detailEls[2].querySelector('summary');
    const para = detailEls[2].querySelector('p');
    if (sum && cmsPdp.deliveryReturnsTitle) sum.textContent = cmsPdp.deliveryReturnsTitle;
    if (para && cmsPdp.deliveryReturnsCopy) para.textContent = cmsPdp.deliveryReturnsCopy;
  }

  const relatedEyebrow = document.querySelector('.pdp-related__head .eyebrow');
  const relatedHeading = document.querySelector('.pdp-related__head h2');
  if (relatedEyebrow && cmsPdp.relatedEyebrow) relatedEyebrow.textContent = cmsPdp.relatedEyebrow;
  if (relatedHeading && cmsPdp.relatedTitle) relatedHeading.textContent = cmsPdp.relatedTitle;

  const mainImg = document.getElementById('pdpMainImg');
  const thumbsEl = document.getElementById('pdpThumbs');
  const images = [product.image, product.alt].filter(Boolean);
  let activeIdx = 0;

  function setActive(idx) {
    activeIdx = idx;
    if (mainImg) {
      mainImg.src = images[idx];
      mainImg.alt = product.name;
    }
    if (thumbsEl) {
      thumbsEl.querySelectorAll('button').forEach((b, i) => b.classList.toggle('is-active', i === idx));
    }
  }

  if (thumbsEl) {
    thumbsEl.innerHTML = images.map((src, i) => `
      <button type="button" class="${i === 0 ? 'is-active' : ''}" aria-label="Image ${i + 1}">
        <img src="${escapeHtml(src)}" alt="">
      </button>
    `).join('');
    thumbsEl.addEventListener('click', event => {
      const btn = event.target.closest('button');
      if (!btn) return;
      const idx = Array.from(thumbsEl.children).indexOf(btn);
      if (idx >= 0) setActive(idx);
    });
  }
  setActive(0);

  let qty = 1;
  const qtyEl = document.getElementById('pdpQty');
  document.querySelector('[data-pdp-inc]').addEventListener('click', () => {
    qty = Math.min(99, qty + 1);
    if (qtyEl) qtyEl.textContent = qty;
  });
  document.querySelector('[data-pdp-dec]').addEventListener('click', () => {
    qty = Math.max(1, qty - 1);
    if (qtyEl) qtyEl.textContent = qty;
  });

  const addBtn = document.getElementById('pdpAdd');
  if (addBtn && window.BS_CART) {
    addBtn.addEventListener('click', () => {
      for (let i = 0; i < qty; i += 1) window.BS_CART.add(product.id);
      window.BS_CART.open();
    });
  }

  const wishBtn = document.getElementById('pdpWish');
  if (wishBtn) {
    wishBtn.addEventListener('click', () => {
      wishBtn.classList.toggle('is-saved');
      const span = wishBtn.querySelector('span');
      if (span) span.textContent = wishBtn.classList.contains('is-saved') ? 'Saved to wishlist' : 'Save to wishlist';
    });
  }

  // Related products: same category, exclude current, max 4
  if (window.BS_byCat) {
    const related = window.BS_byCat(product.cat).filter(p => p.id !== product.id).slice(0, 4);
    if (related.length) {
      const section = document.getElementById('pdpRelated');
      const grid = document.getElementById('pdpRelatedGrid');
      if (section && grid && window.BS_renderCard) {
        section.hidden = false;
        grid.innerHTML = related.map(p => window.BS_renderCard(p)).join('');
      }
    }
  }
})();
