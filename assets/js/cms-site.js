/* Applies CMS-managed content to the storefront. */
(function () {
  'use strict';

  const previewEnabled = new URLSearchParams(window.location.search).get('preview') === '1';
  let previewContent = null;
  if (previewEnabled) {
    try {
      previewContent = JSON.parse(localStorage.getItem('bs_cms_preview') || 'null');
    } catch (error) {
      previewContent = null;
    }
  }

  const content = previewContent || window.BS_CMS_CONTENT;
  if (!content) return;
  if (previewContent && Array.isArray(previewContent.products)) {
    window.BS_PREVIEW_PRODUCTS = previewContent.products;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, match => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[match]));
  }

  function safeList(value) {
    return Array.isArray(value) ? value : [];
  }

  function renderAnnouncements() {
    const messages = safeList(content.announcement && content.announcement.messages).filter(Boolean);
    if (!messages.length) return;

    document.querySelectorAll('.announcement__group').forEach(group => {
      group.innerHTML = messages.map(message => `<span>&#10022; ${escapeHtml(message)}</span>`).join('');
    });
  }

  function renderNavigation() {
    const items = safeList(content.navigation && content.navigation.items);
    if (!items.length) return;

    const html = items.map(item => {
      const dropdown = safeList(item.dropdown);
      const hasDropdown = dropdown.length > 0;
      const dropdownHtml = hasDropdown
        ? `<ul class="header__dropdown${dropdown.some(entry => String(entry.label || '').length > 16) ? ' header__dropdown--wide' : ''}">${
            dropdown.map(entry => `<li><a href="${escapeHtml(entry.href || '#')}">${escapeHtml(entry.label)}</a></li>`).join('')
          }</ul>`
        : '';

      return `
        <li${hasDropdown ? ' class="has-dropdown"' : ''}>
          <a href="${escapeHtml(item.href || '#')}"${hasDropdown ? ' class="has-menu"' : ''}>
            ${escapeHtml(item.label)}
            ${hasDropdown ? '<span class="nav-caret" aria-hidden="true"></span>' : ''}
          </a>
          ${dropdownHtml}
        </li>
      `;
    }).join('');

    document.querySelectorAll('.header__nav').forEach(nav => {
      nav.innerHTML = `<ul>${html}</ul>`;
    });

    document.documentElement.classList.add('has-nav-dropdowns');
  }

  function renderHero() {
    const hero = content.home && content.home.hero;
    if (!hero || !document.querySelector('.hero')) return;

    const eyebrow = document.querySelector('.hero .eyebrow');
    if (eyebrow && hero.eyebrow) eyebrow.textContent = hero.eyebrow;

    const title = document.querySelector('.hero__title');
    const lines = safeList(hero.titleLines).filter(Boolean);
    if (title && lines.length) {
      title.innerHTML = lines.map(line => `<span class="line"><span>${escapeHtml(line)}</span></span>`).join('');
    }

    const subtitle = document.querySelector('.hero__subtitle');
    if (subtitle && hero.subtitle) subtitle.textContent = hero.subtitle;

    const ctas = document.querySelectorAll('.hero__cta .btn');
    if (ctas[0] && hero.primaryCta) {
      ctas[0].href = hero.primaryCta.href || '#';
      const label = ctas[0].querySelector('span');
      if (label) label.textContent = hero.primaryCta.label || 'Shop';
    }
    if (ctas[1] && hero.secondaryCta) {
      ctas[1].href = hero.secondaryCta.href || '#';
      ctas[1].textContent = hero.secondaryCta.label || 'Explore';
    }

    const slides = safeList(hero.slides).filter(slide => slide && slide.image);
    const media = document.getElementById('heroMedia');
    const indicators = document.getElementById('heroIndicators');
    if (media && slides.length) {
      media.querySelectorAll('.hero__slide').forEach(slide => slide.remove());
      slides.forEach((slide, index) => {
        const div = document.createElement('div');
        div.className = `hero__slide${index === 0 ? ' is-active' : ''}`;
        div.innerHTML = `<img src="${escapeHtml(slide.image)}" alt="${escapeHtml(slide.alt || '')}">`;
        media.insertBefore(div, media.querySelector('.hero__overlay'));
      });
    }
    if (indicators && slides.length) {
      indicators.innerHTML = slides.map((_, index) => `<button${index === 0 ? ' class="is-active"' : ''} aria-label="Slide ${index + 1}"><span></span></button>`).join('');
    }
  }

  function renderCategories() {
    const categories = safeList(content.home && content.home.categories);
    if (!categories.length) return;

    document.querySelectorAll('.categories__grid .cat-card').forEach((card, index) => {
      const item = categories[index];
      if (!item) return;
      if (item.href) card.href = item.href;
      const img = card.querySelector('img');
      if (img && item.image) img.src = item.image;
      const title = card.querySelector('h3');
      if (title && item.title) title.textContent = item.title;
      const desc = card.querySelector('p');
      if (desc && item.description) desc.textContent = item.description;
    });
  }

  function renderFooter() {
    const footer = content.footer;
    if (!footer) return;

    document.querySelectorAll('.footer__brand p').forEach(p => {
      if (footer.brandTagline) p.textContent = footer.brandTagline;
    });

    function applyColumn(heading, links) {
      document.querySelectorAll('.footer__col').forEach(col => {
        const h = col.querySelector('h4');
        if (!h || h.textContent.trim().toLowerCase() !== heading.toLowerCase()) return;
        const ul = col.querySelector('ul');
        if (!ul) return;
        ul.innerHTML = (links || []).map(item => `<li><a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a></li>`).join('');
      });
    }
    applyColumn('Shop', footer.shopLinks);
    applyColumn('Care', footer.careLinks);
    applyColumn('House', footer.houseLinks);

    document.querySelectorAll('.footer__legal').forEach(legal => {
      legal.innerHTML = (footer.legalLinks || []).map(item => `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`).join('');
    });

    document.querySelectorAll('.footer__pay').forEach(pay => {
      pay.innerHTML = (footer.paymentBrands || []).map(brand => `<span>${escapeHtml(brand)}</span>`).join('');
    });

    document.querySelectorAll('.footer__bottom > span:first-child').forEach(span => {
      if (footer.copyright) span.textContent = footer.copyright;
    });

    document.querySelectorAll('.footer__social').forEach(socialEl => {
      const items = footer.socialLinks || [];
      socialEl.innerHTML = items.map(s => `
        <a href="${escapeHtml(s.href)}" aria-label="${escapeHtml(s.label || s.network)}" target="${s.href && s.href.startsWith('http') ? '_blank' : '_self'}" rel="noopener noreferrer">
          ${socialIcon(s.network)}
        </a>
      `).join('');
    });
  }

  function socialIcon(network) {
    const map = {
      instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
      tiktok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M14 4v10a4 4 0 1 1-4-4"/><path d="M14 4c0 3 2 5 5 5"/></svg>',
      youtube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="6" width="20" height="12" rx="3"/><path d="m10 9 6 3-6 3z" fill="currentColor"/></svg>',
      pinterest: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="9"/><path d="M11 8c2 0 4 1.3 4 4s-2 4-3 4-2-1-2-1l-1 4"/></svg>',
      facebook: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M14 8h2V5h-2c-2 0-3 1-3 3v2H9v3h2v6h3v-6h2l1-3h-3V8z"/></svg>',
      x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M5 5l14 14M19 5L5 19"/></svg>',
      linkedin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a3 3 0 0 1 6 0v4"/></svg>',
      website: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18"/></svg>'
    };
    return map[network] || map.website;
  }

  function applyThemeColors() {
    const site = content.site;
    if (!site || !site.themeColors) return;
    const root = document.documentElement;
    if (site.themeColors.navy) root.style.setProperty('--navy', site.themeColors.navy);
    if (site.themeColors.red) root.style.setProperty('--red', site.themeColors.red);
    if (site.themeColors.cream) root.style.setProperty('--cream', site.themeColors.cream);
  }

  function applyBrandWordmark() {
    const site = content.site;
    if (!site) return;
    if (site.brandName) {
      document.querySelectorAll('.header__wordmark-name, .footer__wordmark-name, .loader__wordmark-name').forEach(el => {
        el.innerHTML = String(site.brandName).replace('&', '<i>&amp;</i>');
      });
    }
    if (site.brandTag) {
      document.querySelectorAll('.header__wordmark-tag, .footer__wordmark-tag, .loader__wordmark-tag').forEach(el => {
        el.textContent = site.brandTag;
      });
    }
  }

  renderAnnouncements();
  renderNavigation();
  renderHero();
  renderCategories();
  renderFooter();
  applyBrandWordmark();
  applyThemeColors();
})();
