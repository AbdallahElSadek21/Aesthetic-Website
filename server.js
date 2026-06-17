const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8010);
const DATA_DIR = path.join(ROOT, 'assets', 'data');
const UPLOAD_DIR = path.join(ROOT, 'assets', 'uploads');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const CONTENT_PATH = path.join(DATA_DIR, 'cms-content.json');
const DRAFT_PATH = path.join(DATA_DIR, 'cms-draft.json');
const CMS_CONTENT_JS_PATH = path.join(ROOT, 'assets', 'js', 'cms-content.js');
const PRODUCTS_JS_PATH = path.join(ROOT, 'assets', 'js', 'products.js');
const PASSWORD_FILE = path.join(ROOT, 'CMS-PASSWORD.txt');
const ACCOUNTS_PATH = path.join(DATA_DIR, 'accounts.json');

const SESSION_TTL = 12 * 60 * 60 * 1000;
const ACCOUNT_SESSION_TTL = 30 * 24 * 60 * 60 * 1000;
const sessions = new Map();
const accountSessions = new Map();
const CMS_PASSWORD = loadCmsPassword();
const CMS_PASSWORD_HASH = hashSecret(CMS_PASSWORD);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function hashSecret(value) {
  return crypto.createHash('sha256').update(String(value)).digest();
}

function secretsEqual(a, b) {
  const left = hashSecret(a);
  const right = Buffer.isBuffer(b) ? b : hashSecret(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function loadCmsPassword() {
  if (process.env.CMS_PASSWORD) return process.env.CMS_PASSWORD;
  try {
    const raw = fs.readFileSync(PASSWORD_FILE, 'utf8');
    const firstLine = raw.split(/\r?\n/)[0].trim();
    if (firstLine) return firstLine;
  } catch (error) {}

  const generated = `bs-${crypto.randomBytes(5).toString('hex')}`;
  fs.writeFileSync(
    PASSWORD_FILE,
    `${generated}\n\nThis is the local CMS password. You can replace the first line with a new password, then restart the CMS server.\n`,
    'utf8'
  );
  return generated;
}

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return fallback;
  }
}

function extractCurrentProducts() {
  try {
    const code = fs.readFileSync(PRODUCTS_JS_PATH, 'utf8');
    const sandbox = { window: {} };
    vm.runInNewContext(code, sandbox, { timeout: 1000 });
    return Array.isArray(sandbox.window.BS_PRODUCTS) ? sandbox.window.BS_PRODUCTS : [];
  } catch (error) {
    return [];
  }
}

function defaultContent() {
  return {
    version: 1,
    revision: 1,
    updatedAt: new Date().toISOString(),
    cmsNote: 'Important: whenever a new section, dropdown, product field, banner, or content block is added to the main website, add its matching editable field in this CMS too. The website and CMS must stay paired.',
    announcement: {
      messages: [
        'Complimentary delivery on orders over \u00A3150',
        '10% off your first order - code WELCOME10',
        'New season edit - discover the latest arrivals',
        'Same-day London dispatch on orders before 3pm'
      ]
    },
    navigation: {
      items: [
        {
          label: 'Dermal Fillers',
          href: 'dermal-fillers.html?filter=dermal-fillers',
          dropdown: [
            { label: 'Regenovue', href: 'dermal-fillers.html?filter=dermal-fillers&brand=regenovue' },
            { label: 'Lumifil', href: 'dermal-fillers.html?filter=dermal-fillers&brand=lumifil' },
            { label: 'Volifil', href: 'dermal-fillers.html?filter=dermal-fillers&brand=volifil' },
            { label: 'Aessoa', href: 'dermal-fillers.html?filter=dermal-fillers&brand=aessoa' },
            { label: 'Kairax', href: 'dermal-fillers.html?filter=dermal-fillers&brand=kairax' },
            { label: 'EPTQ', href: 'dermal-fillers.html?filter=dermal-fillers&brand=eptq' },
            { label: 'View all brands', href: 'dermal-fillers.html?filter=dermal-fillers' }
          ]
        },
        { label: 'Fat Dissolvers', href: 'dermal-fillers.html?filter=fat-dissolvers', dropdown: [] },
        {
          label: 'Skin Boosters',
          href: 'dermal-fillers.html?filter=skin-boosters',
          dropdown: [
            { label: 'Hyaluronic Acid Skin Boosters', href: 'dermal-fillers.html?filter=skin-boosters&type=hyaluronic-acid' },
            { label: 'Polynucleotide Skin Boosters', href: 'dermal-fillers.html?filter=skin-boosters&type=polynucleotide' },
            { label: 'PLLA', href: 'dermal-fillers.html?filter=plla' }
          ]
        },
        { label: 'Under Eye Boosters', href: 'dermal-fillers.html?filter=under-eye-boosters', dropdown: [] },
        { label: 'Exosomes', href: 'dermal-fillers.html?filter=exosomes', dropdown: [] },
        { label: 'Mesotherapy', href: 'dermal-fillers.html?filter=mesotherapy', dropdown: [] },
        { label: 'Chemical Peel', href: 'dermal-fillers.html?filter=chemical-peel', dropdown: [] },
        {
          label: 'Clinic Consumables',
          href: 'dermal-fillers.html?filter=clinic-consumables',
          dropdown: [
            { label: 'Cannulas', href: 'dermal-fillers.html?filter=clinic-consumables&type=cannulas' },
            { label: 'Gloves', href: 'dermal-fillers.html?filter=clinic-consumables&type=gloves' },
            { label: 'Needles and Syringes', href: 'dermal-fillers.html?filter=clinic-consumables&type=needles-syringes' }
          ]
        },
        { label: 'More', href: 'index.html#categories', dropdown: [] }
      ]
    },
    home: {
      hero: {
        eyebrow: 'Curated for those who demand more',
        titleLines: ['The Quiet', 'Luxury of', 'Modern Beauty'],
        subtitle: 'Premium skincare, makeup, fragrance, and devices - selected for those who refuse to compromise.',
        primaryCta: { label: 'Shop', href: '#categories' },
        secondaryCta: { label: 'Explore Bestsellers', href: '#products' },
        slides: [
          { image: 'assets/images/hero-01.jpg', alt: '' },
          { image: 'assets/images/hero-02.jpg', alt: '' },
          { image: 'assets/images/hero-03.jpg', alt: '' }
        ]
      },
      categories: [
        { title: 'Skincare', description: 'Serums, moisturizers, masks', href: 'skincare.html', image: 'assets/images/cat-skincare.jpg' },
        { title: 'Makeup', description: 'Lips, eyes, complexion', href: 'makeup.html', image: 'assets/images/cat-makeup.jpg' },
        { title: 'Fragrance', description: 'Eaux de parfum, candles', href: 'fragrance.html', image: 'assets/images/cat-fragrance.jpg' },
        { title: 'Dermal Fillers', description: 'Hyaluronic & advanced formulas', href: 'dermal-fillers.html', image: 'assets/images/cat-dermal.jpg' },
        { title: 'Devices', description: 'LED, microcurrent, ultrasonic', href: 'devices.html', image: 'assets/images/cat-devices.jpg' },
        { title: 'Wellness', description: 'Supplements & beauty from within', href: 'wellness.html', image: 'assets/images/cat-wellness.jpg' }
      ]
    },
    footer: {
      brandTagline: 'Curated premium aesthetic products. Crafted in London, shipped worldwide.',
      shopLinks: [
        { label: 'Skincare', href: 'skincare.html' },
        { label: 'Makeup', href: 'makeup.html' },
        { label: 'Fragrance', href: 'fragrance.html' },
        { label: 'Dermal Fillers', href: 'dermal-fillers.html' },
        { label: 'Devices', href: 'devices.html' },
        { label: 'Wellness', href: 'wellness.html' }
      ],
      careLinks: [
        { label: 'Contact', href: '#' },
        { label: 'Delivery', href: '#' },
        { label: 'Returns', href: '#' },
        { label: 'FAQs', href: '#' },
        { label: 'Track order', href: '#' }
      ],
      houseLinks: [
        { label: 'Our story', href: '#' },
        { label: 'Journal', href: '#' },
        { label: 'Press', href: '#' },
        { label: 'Sustainability', href: '#' },
        { label: 'Careers', href: '#' }
      ],
      legalLinks: [
        { label: 'Privacy', href: '#' },
        { label: 'Terms', href: '#' },
        { label: 'Cookies', href: '#' },
        { label: 'Modern Slavery', href: '#' }
      ],
      socialLinks: [
        { network: 'instagram', label: 'Instagram', href: '#' },
        { network: 'tiktok', label: 'TikTok', href: '#' },
        { network: 'youtube', label: 'YouTube', href: '#' },
        { network: 'pinterest', label: 'Pinterest', href: '#' }
      ],
      paymentBrands: ['Visa', 'Mastercard', 'Amex', 'PayPal', 'Klarna'],
      copyright: '© 2026 B&S Aesthetics. All rights reserved.'
    },
    pdp: {
      shortDescTemplate: 'An editorial favourite from {brand}. The {name} delivers a refined ritual designed for those who want efficacy without compromise on craft.',
      longDescTemplate: '{name} is part of the curated B&S edit — formulated for visible results and a sensory experience worthy of your shelf. Every product on B&S is sourced direct from authorised channels and tested before listing.',
      perks: [
        'Authenticity guaranteed',
        'Same-day London dispatch before 3pm',
        'Free 30-day returns'
      ],
      howToUseTitle: 'How to use',
      howToUseCopy: 'Apply to clean skin morning and evening. Pat gently into face and neck, follow with moisturizer. For external use only.',
      deliveryReturnsTitle: 'Delivery & returns',
      deliveryReturnsCopy: 'Standard UK delivery £5.95 (free over £150). Express next-day £12. Returns accepted within 30 days for unused product in original packaging.',
      relatedEyebrow: 'You may also like',
      relatedTitle: 'Pairs well with'
    },
    checkout: {
      secureLabel: 'Secure checkout',
      shippingMethods: [
        { key: 'standard', label: 'Standard delivery', sublabel: '2–4 working days', price: 5.95 },
        { key: 'express', label: 'Express delivery', sublabel: 'Next working day — order before 3pm', price: 12 },
        { key: 'collection', label: 'Collection — London W1', sublabel: 'Ready in 2 hours', price: 0 }
      ],
      freeShippingThreshold: 150,
      vatRate: 0.2,
      promoCodes: [
        { code: 'WELCOME10', percent: 10 },
        { code: 'WELCOME15', percent: 15 },
        { code: 'BS25', percent: 25 }
      ],
      perks: [
        'Complimentary samples with every order',
        '30-day returns',
        'Same-day dispatch before 3pm'
      ],
      fineprint: 'By placing your order you agree to our Terms and Privacy Notice.'
    },
    confirmation: {
      title: 'Thank you',
      subtitle: 'Your order has been received. We’ve sent a confirmation to your inbox.',
      continueShoppingLabel: 'Continue shopping',
      viewOrdersLabel: 'View order history'
    },
    account: {
      gateTitle: 'Sign in to your account',
      gateSubtitle: 'Track orders, save your address, and access member previews.',
      gatePrimaryLabel: 'Sign in',
      gateSecondaryLabel: 'Create account',
      tabLabels: {
        orders: 'Orders',
        profile: 'Profile',
        addresses: 'Addresses',
        preferences: 'Preferences'
      },
      preferences: [
        'Email me about new arrivals and edits',
        'SMS for express dispatch updates',
        'Member-only previews'
      ]
    },
    search: {
      placeholder: 'Search products, brands, categories…',
      popularLabel: 'Popular searches',
      chips: [
        { label: 'Serums', query: 'serum' },
        { label: 'Dermal Fillers', query: 'dermal' },
        { label: 'Vitamin C', query: 'vitamin c' },
        { label: 'Lips', query: 'lip' },
        { label: 'Fragrance', query: 'fragrance' },
        { label: 'LED Devices', query: 'LED' }
      ],
      noResultsTitle: 'No matches',
      noResultsBody: 'Try a brand, ingredient, or category.'
    },
    site: {
      brandName: 'B&S',
      brandTag: 'Aesthetics',
      themeColors: {
        navy: '#0F2C5C',
        red: '#C8102E',
        cream: '#F8F4EC'
      }
    },
    products: extractCurrentProducts()
  };
}

function normalizeContent(input, options = {}) {
  const fallback = defaultContent();
  const content = input && typeof input === 'object' ? input : {};

  content.version = 1;
  content.revision = Number(options.revision || content.revision || fallback.revision || 1);
  content.updatedAt = String(options.updatedAt || content.updatedAt || fallback.updatedAt);
  content.cmsNote = String(content.cmsNote || fallback.cmsNote);
  content.announcement = content.announcement || fallback.announcement;
  content.navigation = content.navigation || fallback.navigation;
  content.home = content.home || fallback.home;
  content.products = Array.isArray(content.products) ? content.products : fallback.products;
  content.announcement.messages = Array.isArray(content.announcement.messages)
    ? content.announcement.messages.map(String).filter(Boolean)
    : fallback.announcement.messages;
  content.navigation.items = Array.isArray(content.navigation.items)
    ? content.navigation.items.map(normalizeNavItem)
    : fallback.navigation.items;
  content.home.hero = content.home.hero || fallback.home.hero;
  content.home.hero.titleLines = Array.isArray(content.home.hero.titleLines)
    ? content.home.hero.titleLines.map(String).filter(Boolean)
    : fallback.home.hero.titleLines;
  content.home.hero.primaryCta = normalizeCta(content.home.hero.primaryCta || fallback.home.hero.primaryCta);
  content.home.hero.secondaryCta = normalizeCta(content.home.hero.secondaryCta || fallback.home.hero.secondaryCta);
  content.home.hero.slides = Array.isArray(content.home.hero.slides)
    ? content.home.hero.slides.map(slide => ({ ...slide, image: String(slide.image || ''), alt: String(slide.alt || '') }))
    : fallback.home.hero.slides;
  content.home.categories = Array.isArray(content.home.categories)
    ? content.home.categories.map(category => ({
        ...category,
        title: String(category.title || ''),
        description: String(category.description || ''),
        href: String(category.href || ''),
        image: String(category.image || '')
      }))
    : fallback.home.categories;

  content.products = content.products.map((product, index) => {
    const id = slug(product.id || product.name || `product-${index + 1}`);
    return {
      ...product,
      id,
      cat: String(product.cat || 'skincare'),
      sub: String(product.sub || 'general'),
      brand: String(product.brand || ''),
      name: String(product.name || 'Untitled product'),
      size: String(product.size || ''),
      price: Number(product.price || 0),
      ...(product.oldPrice ? { oldPrice: Number(product.oldPrice) } : {}),
      rating: Number(product.rating || 0),
      image: String(product.image || 'assets/images/product-dropper.jpg'),
      alt: String(product.alt || product.image || 'assets/images/product-dropper.jpg'),
      tags: Array.isArray(product.tags) ? product.tags.map(String).filter(Boolean) : []
    };
  });

  // New page-level sections — merge with defaults so older content files keep working.
  content.footer = normalizeFooter(content.footer, fallback.footer);
  content.pdp = normalizePdp(content.pdp, fallback.pdp);
  content.checkout = normalizeCheckoutContent(content.checkout, fallback.checkout);
  content.confirmation = normalizeConfirmation(content.confirmation, fallback.confirmation);
  content.account = normalizeAccountContent(content.account, fallback.account);
  content.search = normalizeSearchContent(content.search, fallback.search);
  content.site = normalizeSiteContent(content.site, fallback.site);

  return content;
}

function normalizeLinkList(input, fallback, allowExternal = false) {
  const list = Array.isArray(input) ? input : fallback;
  return list.map(item => ({
    label: String(item && item.label || ''),
    href: String(item && item.href || '#')
  })).filter(item => item.label);
}

function normalizeFooter(input, fallback) {
  const footer = input && typeof input === 'object' ? input : {};
  return {
    brandTagline: String(footer.brandTagline || fallback.brandTagline),
    shopLinks: normalizeLinkList(footer.shopLinks, fallback.shopLinks),
    careLinks: normalizeLinkList(footer.careLinks, fallback.careLinks),
    houseLinks: normalizeLinkList(footer.houseLinks, fallback.houseLinks),
    legalLinks: normalizeLinkList(footer.legalLinks, fallback.legalLinks),
    socialLinks: (Array.isArray(footer.socialLinks) ? footer.socialLinks : fallback.socialLinks).map(social => ({
      network: String(social && social.network || 'instagram').toLowerCase(),
      label: String(social && social.label || social.network || ''),
      href: String(social && social.href || '#')
    })).filter(social => social.label),
    paymentBrands: (Array.isArray(footer.paymentBrands) ? footer.paymentBrands : fallback.paymentBrands).map(String).filter(Boolean),
    copyright: String(footer.copyright || fallback.copyright)
  };
}

function normalizePdp(input, fallback) {
  const pdp = input && typeof input === 'object' ? input : {};
  return {
    shortDescTemplate: String(pdp.shortDescTemplate || fallback.shortDescTemplate),
    longDescTemplate: String(pdp.longDescTemplate || fallback.longDescTemplate),
    perks: (Array.isArray(pdp.perks) ? pdp.perks : fallback.perks).map(String).filter(Boolean),
    howToUseTitle: String(pdp.howToUseTitle || fallback.howToUseTitle),
    howToUseCopy: String(pdp.howToUseCopy || fallback.howToUseCopy),
    deliveryReturnsTitle: String(pdp.deliveryReturnsTitle || fallback.deliveryReturnsTitle),
    deliveryReturnsCopy: String(pdp.deliveryReturnsCopy || fallback.deliveryReturnsCopy),
    relatedEyebrow: String(pdp.relatedEyebrow || fallback.relatedEyebrow),
    relatedTitle: String(pdp.relatedTitle || fallback.relatedTitle)
  };
}

function normalizeCheckoutContent(input, fallback) {
  const checkout = input && typeof input === 'object' ? input : {};
  return {
    secureLabel: String(checkout.secureLabel || fallback.secureLabel),
    shippingMethods: (Array.isArray(checkout.shippingMethods) ? checkout.shippingMethods : fallback.shippingMethods).map(method => ({
      key: String(method && method.key || 'standard'),
      label: String(method && method.label || ''),
      sublabel: String(method && method.sublabel || ''),
      price: Number(method && method.price || 0)
    })).filter(method => method.label && method.key),
    freeShippingThreshold: Number(checkout.freeShippingThreshold !== undefined ? checkout.freeShippingThreshold : fallback.freeShippingThreshold),
    vatRate: Number(checkout.vatRate !== undefined ? checkout.vatRate : fallback.vatRate),
    promoCodes: (Array.isArray(checkout.promoCodes) ? checkout.promoCodes : fallback.promoCodes).map(promo => ({
      code: String(promo && promo.code || '').toUpperCase().trim(),
      percent: Number(promo && promo.percent || 0)
    })).filter(promo => promo.code && promo.percent > 0 && promo.percent <= 100),
    perks: (Array.isArray(checkout.perks) ? checkout.perks : fallback.perks).map(String).filter(Boolean),
    fineprint: String(checkout.fineprint || fallback.fineprint)
  };
}

function normalizeConfirmation(input, fallback) {
  const confirmation = input && typeof input === 'object' ? input : {};
  return {
    title: String(confirmation.title || fallback.title),
    subtitle: String(confirmation.subtitle || fallback.subtitle),
    continueShoppingLabel: String(confirmation.continueShoppingLabel || fallback.continueShoppingLabel),
    viewOrdersLabel: String(confirmation.viewOrdersLabel || fallback.viewOrdersLabel)
  };
}

function normalizeAccountContent(input, fallback) {
  const account = input && typeof input === 'object' ? input : {};
  const tabLabels = account.tabLabels && typeof account.tabLabels === 'object' ? account.tabLabels : {};
  return {
    gateTitle: String(account.gateTitle || fallback.gateTitle),
    gateSubtitle: String(account.gateSubtitle || fallback.gateSubtitle),
    gatePrimaryLabel: String(account.gatePrimaryLabel || fallback.gatePrimaryLabel),
    gateSecondaryLabel: String(account.gateSecondaryLabel || fallback.gateSecondaryLabel),
    tabLabels: {
      orders: String(tabLabels.orders || fallback.tabLabels.orders),
      profile: String(tabLabels.profile || fallback.tabLabels.profile),
      addresses: String(tabLabels.addresses || fallback.tabLabels.addresses),
      preferences: String(tabLabels.preferences || fallback.tabLabels.preferences)
    },
    preferences: (Array.isArray(account.preferences) ? account.preferences : fallback.preferences).map(String).filter(Boolean)
  };
}

function normalizeSearchContent(input, fallback) {
  const search = input && typeof input === 'object' ? input : {};
  return {
    placeholder: String(search.placeholder || fallback.placeholder),
    popularLabel: String(search.popularLabel || fallback.popularLabel),
    chips: (Array.isArray(search.chips) ? search.chips : fallback.chips).map(chip => ({
      label: String(chip && chip.label || ''),
      query: String(chip && chip.query || chip && chip.label || '')
    })).filter(chip => chip.label && chip.query),
    noResultsTitle: String(search.noResultsTitle || fallback.noResultsTitle),
    noResultsBody: String(search.noResultsBody || fallback.noResultsBody)
  };
}

function normalizeSiteContent(input, fallback) {
  const site = input && typeof input === 'object' ? input : {};
  const colors = site.themeColors && typeof site.themeColors === 'object' ? site.themeColors : {};
  return {
    brandName: String(site.brandName || fallback.brandName),
    brandTag: String(site.brandTag || fallback.brandTag),
    themeColors: {
      navy: String(colors.navy || fallback.themeColors.navy),
      red: String(colors.red || fallback.themeColors.red),
      cream: String(colors.cream || fallback.themeColors.cream)
    }
  };
}

function normalizeCta(cta) {
  return {
    ...cta,
    label: String(cta && cta.label || ''),
    href: String(cta && cta.href || '#')
  };
}

function normalizeNavItem(item) {
  return {
    ...item,
    label: String(item && item.label || ''),
    href: String(item && item.href || '#'),
    dropdown: Array.isArray(item && item.dropdown)
      ? item.dropdown.map(entry => ({
          ...entry,
          label: String(entry && entry.label || ''),
          href: String(entry && entry.href || '#')
        })).filter(entry => entry.label)
      : []
  };
}

function loadContent() {
  const existing = readJson(CONTENT_PATH);
  return normalizeContent(existing || defaultContent());
}

function loadDraft() {
  const existing = readJson(DRAFT_PATH);
  return existing ? normalizeContent(existing) : null;
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function safeJson(data) {
  return JSON.stringify(data, null, 2)
    .replace(/</g, '\\u003c')
    .replace(/[\u007f-\uffff]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

function renderCmsContentJs(content) {
  const publicContent = {
    cmsNote: content.cmsNote,
    announcement: content.announcement,
    navigation: content.navigation,
    home: content.home,
    footer: content.footer,
    pdp: content.pdp,
    checkout: content.checkout,
    confirmation: content.confirmation,
    account: content.account,
    search: content.search,
    site: content.site,
    updatedAt: content.updatedAt
  };
  return `window.BS_CMS_CONTENT = ${safeJson(publicContent)};\n`;
}

function renderProductsJs(content) {
  const renderer = String.raw`
window.BS_findById = (id) => window.BS_PRODUCTS.find(p => p.id === id);
window.BS_byCat = (cat) => window.BS_PRODUCTS.filter(p => p.cat === cat);
window.BS_byTag = (tag) => window.BS_PRODUCTS.filter(p => (p.tags || []).includes(tag));

window.BS_renderCard = function (p) {
  const escape = (s) => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const tags = p.tags || [];
  const badge = tags.includes('sale') ? { label: p.oldPrice ? 'Save ' + Math.round((1 - p.price / p.oldPrice) * 100) + '%' : 'Sale', red: true }
    : tags.includes('new') ? { label: 'New', red: false }
    : tags.includes('bestseller') ? { label: 'Bestseller', red: false }
    : tags.includes('trending') ? { label: 'Trending', red: false }
    : null;
  const badgeHtml = badge ? '<span class="product__badge' + (badge.red ? ' product__badge--red' : '') + '">' + escape(badge.label) + '</span>' : '';
  const oldPrice = p.oldPrice ? '<del>\u00A3' + p.oldPrice + '</del>' : '';

  return [
    '<a href="product.html?id=' + encodeURIComponent(p.id) + '" class="product" data-reveal-card data-product-id="' + escape(p.id) + '">',
      '<div class="product__media">',
        badgeHtml,
        '<button class="product__wishlist" aria-label="Add to wishlist" type="button">',
          '<svg viewBox="0 0 24 24"><path d="M12 21s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>',
        '</button>',
        '<img src="' + escape(p.image) + '" alt="' + escape(p.name) + '" class="product__img product__img--main" loading="lazy">',
        '<img src="' + escape(p.alt) + '" alt="" class="product__img product__img--hover" loading="lazy">',
        '<div class="product__quick" data-add-to-cart data-id="' + escape(p.id) + '">',
          '<span>Quick Add</span>',
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 5v14M5 12h14"/></svg>',
        '</div>',
      '</div>',
      '<div class="product__brand">' + escape(p.brand) + '</div>',
      '<div class="product__name">' + escape(p.name) + '</div>',
      '<div class="product__meta">',
        '<div class="product__price">' + oldPrice + '\u00A3' + p.price + '</div>',
        '<div class="product__rating">' + escape(p.rating) + '</div>',
      '</div>',
    '</a>'
  ].join('');
};
`;
  return `/* Generated by the B&S CMS. Edit content in /cms.html, not this file. */\nwindow.BS_PRODUCTS = window.BS_PREVIEW_PRODUCTS || ${safeJson(content.products)};\n${renderer}`;
}

function validationError(errors) {
  const error = new Error('Please fix the highlighted issues before publishing.');
  error.status = 400;
  error.errors = errors;
  return error;
}

function isSafeHref(value) {
  const href = String(value || '').trim();
  if (!href) return false;
  if (href.includes('\\') || href.includes('..')) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return false;
  return href === '#' || href.startsWith('#') || /^[a-z0-9/_-]+\.html([?#][^\\\s]*)?$/i.test(href);
}

function isSafeExternalHref(value) {
  const href = String(value || '').trim();
  if (!href) return false;
  if (isSafeHref(href)) return true;
  if (href.startsWith('mailto:') && href.length > 7) return true;
  if (href.startsWith('tel:') && href.length > 4) return true;
  return /^https:\/\/[^\s<>"]+$/i.test(href);
}

function isSafeAssetPath(value) {
  const assetPath = String(value || '').trim().replace(/\\/g, '/');
  if (!assetPath || assetPath.includes('..')) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(assetPath)) return false;
  return /^assets\/(images|uploads)\/[a-z0-9._/-]+\.(png|jpe?g|gif|webp)$/i.test(assetPath)
    || /^Logo\/[a-z0-9._/-]+\.(png|jpe?g|gif|webp)$/i.test(assetPath);
}

function validateContent(content) {
  const errors = [];
  const ids = new Map();

  if (!content.cmsNote.trim()) errors.push('CMS note is required.');
  if (!content.announcement.messages.length) errors.push('Add at least one announcement message.');

  content.navigation.items.forEach((item, index) => {
    if (!item.label.trim()) errors.push(`Top bar item ${index + 1} needs a label.`);
    if (!isSafeHref(item.href)) errors.push(`Top bar item "${item.label || index + 1}" has an unsafe or invalid link.`);
    item.dropdown.forEach((entry, entryIndex) => {
      if (!entry.label.trim()) errors.push(`Dropdown item ${entryIndex + 1} under "${item.label}" needs a label.`);
      if (!isSafeHref(entry.href)) errors.push(`Dropdown item "${entry.label || entryIndex + 1}" under "${item.label}" has an unsafe or invalid link.`);
    });
  });

  const hero = content.home.hero;
  if (!hero.titleLines.length) errors.push('Homepage hero needs at least one title line.');
  if (!isSafeHref(hero.primaryCta.href)) errors.push('Primary hero button link is invalid.');
  if (!isSafeHref(hero.secondaryCta.href)) errors.push('Secondary hero button link is invalid.');
  hero.slides.forEach((slide, index) => {
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
    ids.set(product.id, true);
    if (!product.name.trim()) errors.push(`Product "${label}" needs a name.`);
    if (!product.brand.trim()) errors.push(`Product "${label}" needs a brand.`);
    if (!product.cat.trim()) errors.push(`Product "${label}" needs a category.`);
    if (!product.sub.trim()) errors.push(`Product "${label}" needs a subcategory.`);
    if (!Number.isFinite(product.price) || product.price < 0) errors.push(`Product "${label}" has an invalid price.`);
    if (product.oldPrice !== undefined && (!Number.isFinite(product.oldPrice) || product.oldPrice < 0)) errors.push(`Product "${label}" has an invalid old price.`);
    if (!Number.isFinite(product.rating) || product.rating < 0 || product.rating > 5) errors.push(`Product "${label}" rating must be between 0 and 5.`);
    if (!isSafeAssetPath(product.image)) errors.push(`Product "${label}" has an invalid main image path.`);
    if (!isSafeAssetPath(product.alt)) errors.push(`Product "${label}" has an invalid hover image path.`);
  });

  // Footer — allows external https for social/footer
  const footer = content.footer || {};
  ['shopLinks', 'careLinks', 'houseLinks', 'legalLinks'].forEach(key => {
    (footer[key] || []).forEach((item, index) => {
      if (!isSafeExternalHref(item.href)) errors.push(`Footer ${key} item "${item.label || index + 1}" has an invalid link.`);
    });
  });
  (footer.socialLinks || []).forEach((social, index) => {
    if (!isSafeExternalHref(social.href)) errors.push(`Footer social link "${social.label || index + 1}" has an invalid URL.`);
  });

  // Checkout — sanity
  const checkout = content.checkout || {};
  if (Array.isArray(checkout.shippingMethods) && !checkout.shippingMethods.length) {
    errors.push('Add at least one shipping method.');
  }
  if (!Number.isFinite(checkout.freeShippingThreshold) || checkout.freeShippingThreshold < 0) {
    errors.push('Free-shipping threshold must be a non-negative number.');
  }
  if (!Number.isFinite(checkout.vatRate) || checkout.vatRate < 0 || checkout.vatRate > 1) {
    errors.push('VAT rate must be between 0 and 1 (e.g. 0.2 for 20%).');
  }
  (checkout.promoCodes || []).forEach((promo, index) => {
    if (!promo.code) errors.push(`Promo code ${index + 1} needs a code.`);
    if (!Number.isFinite(promo.percent) || promo.percent <= 0 || promo.percent > 100) {
      errors.push(`Promo code "${promo.code || index + 1}" must have a discount percent between 1 and 100.`);
    }
  });

  if (errors.length) throw validationError(errors);
}

function assertGeneratedJs(cmsJs, productsJs) {
  new vm.Script(cmsJs);
  new vm.Script(productsJs);
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function writeFileAtomic(filePath, data) {
  const tempPath = `${filePath}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  fs.writeFileSync(tempPath, data, 'utf8');
  return tempPath;
}

function publishFiles(files) {
  ensureDirs();
  const temps = [];
  const backups = [];
  try {
    files.forEach(file => {
      temps.push({ target: file.path, temp: writeFileAtomic(file.path, file.data) });
    });

    files.forEach(file => {
      if (fs.existsSync(file.path)) {
        const backup = path.join(BACKUP_DIR, `${path.basename(file.path)}.${stamp()}.bak`);
        fs.copyFileSync(file.path, backup);
        backups.push({ target: file.path, backup });
      }
    });

    temps.forEach(file => fs.renameSync(file.temp, file.target));
  } catch (error) {
    temps.forEach(file => {
      try {
        if (fs.existsSync(file.temp)) fs.rmSync(file.temp);
      } catch (cleanupError) {}
    });
    backups.forEach(file => {
      try {
        if (fs.existsSync(file.backup)) fs.copyFileSync(file.backup, file.target);
      } catch (restoreError) {}
    });
    throw error;
  }
}

function saveContent(input, options = {}) {
  ensureDirs();
  const current = loadContent();
  const nextRevision = options.revision || current.revision + 1;
  const content = normalizeContent(input, {
    revision: nextRevision,
    updatedAt: new Date().toISOString()
  });
  validateContent(content);

  const contentJson = JSON.stringify(content, null, 2) + '\n';
  const cmsJs = renderCmsContentJs(content);
  const productsJs = renderProductsJs(content);
  assertGeneratedJs(cmsJs, productsJs);

  publishFiles([
    { path: CONTENT_PATH, data: contentJson },
    { path: CMS_CONTENT_JS_PATH, data: cmsJs },
    { path: PRODUCTS_JS_PATH, data: productsJs }
  ]);

  return content;
}

function saveDraft(input) {
  ensureDirs();
  const content = normalizeContent(input, {
    revision: Number(input.revision || 1),
    updatedAt: new Date().toISOString()
  });
  validateContent(content);
  writeJson(DRAFT_PATH, content);
  return content;
}

function bootstrapContent() {
  ensureDirs();
  const content = loadContent();
  const cmsJs = renderCmsContentJs(content);
  const productsJs = renderProductsJs(content);
  assertGeneratedJs(cmsJs, productsJs);
  publishFiles([
    { path: CONTENT_PATH, data: JSON.stringify(content, null, 2) + '\n' },
    { path: CMS_CONTENT_JS_PATH, data: cmsJs },
    { path: PRODUCTS_JS_PATH, data: productsJs }
  ]);
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || crypto.randomBytes(4).toString('hex');
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(header.split(';').map(part => {
    const [key, ...rest] = part.trim().split('=');
    return [key, decodeURIComponent(rest.join('='))];
  }).filter(([key]) => key));
}

function isAuthed(req) {
  const token = parseCookies(req).cms_session;
  const expiresAt = sessions.get(token);
  if (!expiresAt) return false;
  if (expiresAt < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': type.includes('json') ? 'no-store' : 'no-cache'
  });
  res.end(body);
}

function sendJson(res, status, data) {
  send(res, status, JSON.stringify(data), 'application/json; charset=utf-8');
}

function readBody(req, limit = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > limit) {
        reject(new Error('Request body is too large.'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function readJsonBody(req) {
  const body = await readBody(req);
  return body ? JSON.parse(body) : {};
}

function requireAuth(req, res) {
  if (isAuthed(req)) return true;
  sendJson(res, 401, { error: 'Please sign in to the CMS.' });
  return false;
}

/* ---------- User accounts (storefront) ---------- */
function readAccounts() {
  const data = readJson(ACCOUNTS_PATH, { users: [], orders: [] }) || { users: [], orders: [] };
  if (!Array.isArray(data.users)) data.users = [];
  if (!Array.isArray(data.orders)) data.orders = [];
  // Migrate any legacy per-user orders into the top-level array
  let migrated = false;
  data.users.forEach(user => {
    if (Array.isArray(user.orders) && user.orders.length) {
      user.orders.forEach(order => {
        if (!data.orders.some(existing => existing.orderNumber === order.orderNumber)) {
          data.orders.push({ ...order, userId: order.userId || user.id });
        }
      });
      delete user.orders;
      migrated = true;
    }
  });
  if (migrated) writeAccounts(data);
  return data;
}

function writeAccounts(data) {
  ensureDirs();
  writeJson(ACCOUNTS_PATH, data);
}

const VALID_ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

function normalizeOrder(input, options = {}) {
  if (!input || typeof input !== 'object') return null;
  const items = Array.isArray(input.items) ? input.items : [];
  const totals = input.totals && typeof input.totals === 'object' ? input.totals : {};
  return {
    orderNumber: String(input.orderNumber || `BS-${Date.now()}`),
    placedAt: String(input.placedAt || new Date().toISOString()),
    userId: options.userId || input.userId || null,
    status: VALID_ORDER_STATUSES.includes(input.status) ? input.status : 'pending',
    contact: input.contact && typeof input.contact === 'object' ? input.contact : {},
    shipping: input.shipping && typeof input.shipping === 'object' ? input.shipping : {},
    items: items.map(item => ({
      id: String(item.id || ''),
      brand: String(item.brand || ''),
      name: String(item.name || ''),
      size: String(item.size || ''),
      image: String(item.image || ''),
      price: Number(item.price || 0),
      qty: Number(item.qty || 1)
    })),
    promoCode: input.promoCode || null,
    totals: {
      subtotal: Number(totals.subtotal || 0),
      discount: Number(totals.discount || 0),
      shipping: Number(totals.shipping || 0),
      vat: Number(totals.vat || 0),
      grand: Number(totals.grand || 0)
    },
    etaIso: String(input.etaIso || new Date().toISOString())
  };
}

function hashPassword(password, salt) {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), useSalt, 64).toString('hex');
  return { salt: useSalt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  try {
    const computed = crypto.scryptSync(String(password), salt, 64);
    const expected = Buffer.from(expectedHash, 'hex');
    return computed.length === expected.length && crypto.timingSafeEqual(computed, expected);
  } catch (error) {
    return false;
  }
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    createdAt: user.createdAt
  };
}

function findUserByEmail(email) {
  const accounts = readAccounts();
  const lower = String(email || '').trim().toLowerCase();
  return accounts.users.find(u => u.email.toLowerCase() === lower) || null;
}

function findUserById(id) {
  const accounts = readAccounts();
  return accounts.users.find(u => u.id === id) || null;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function setAccountCookie(res, token, maxAgeMs) {
  res.setHeader('Set-Cookie', `bs_user_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(maxAgeMs / 1000)}`);
}

function clearAccountCookie(res) {
  res.setHeader('Set-Cookie', 'bs_user_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
}

function getAccountSession(req) {
  const token = parseCookies(req).bs_user_session;
  if (!token) return null;
  const session = accountSessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    accountSessions.delete(token);
    return null;
  }
  return { token, userId: session.userId };
}

function getCurrentUser(req) {
  const session = getAccountSession(req);
  if (!session) return null;
  return findUserById(session.userId);
}

async function handleAccountApi(req, res, url) {
  if (req.method === 'POST' && url.pathname === '/api/account/register') {
    const body = await readJsonBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();

    if (!isValidEmail(email)) return sendJson(res, 400, { error: 'Please enter a valid email address.' });
    if (password.length < 8) return sendJson(res, 400, { error: 'Password must be at least 8 characters.' });
    if (findUserByEmail(email)) return sendJson(res, 409, { error: 'An account with that email already exists.' });

    const accounts = readAccounts();
    const { salt, hash } = hashPassword(password);
    const user = {
      id: crypto.randomBytes(8).toString('hex'),
      email,
      firstName,
      lastName,
      passwordSalt: salt,
      passwordHash: hash,
      createdAt: new Date().toISOString()
    };
    accounts.users.push(user);
    writeAccounts(accounts);

    const token = crypto.randomBytes(24).toString('hex');
    accountSessions.set(token, { userId: user.id, expiresAt: Date.now() + ACCOUNT_SESSION_TTL });
    setAccountCookie(res, token, ACCOUNT_SESSION_TTL);
    sendJson(res, 200, { ok: true, user: publicUser(user) });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/account/login') {
    const body = await readJsonBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const user = findUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      sendJson(res, 401, { error: 'Email or password is incorrect.' });
      return;
    }
    const token = crypto.randomBytes(24).toString('hex');
    accountSessions.set(token, { userId: user.id, expiresAt: Date.now() + ACCOUNT_SESSION_TTL });
    setAccountCookie(res, token, ACCOUNT_SESSION_TTL);
    sendJson(res, 200, { ok: true, user: publicUser(user) });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/account/logout') {
    const session = getAccountSession(req);
    if (session) accountSessions.delete(session.token);
    clearAccountCookie(res);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/account/me') {
    const user = getCurrentUser(req);
    if (!user) return sendJson(res, 200, { user: null });
    sendJson(res, 200, { user: publicUser(user) });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/account/orders') {
    const user = getCurrentUser(req);
    if (!user) return sendJson(res, 401, { error: 'Please sign in.' });
    const accounts = readAccounts();
    const orders = accounts.orders.filter(order => order.userId === user.id);
    sendJson(res, 200, { orders });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/account/orders') {
    return handlePlaceOrder(req, res);
  }

  sendJson(res, 404, { error: 'API route not found.' });
}

/* ---------- Image library ---------- */
const IMAGE_LIBRARY_DIRS = [
  { dir: path.join(ROOT, 'assets', 'images'), prefix: 'assets/images', label: 'Images' },
  { dir: path.join(ROOT, 'assets', 'uploads'), prefix: 'assets/uploads', label: 'Uploads' },
  { dir: path.join(ROOT, 'Logo'), prefix: 'Logo', label: 'Logo' }
];

function listLibraryImages() {
  const all = [];
  IMAGE_LIBRARY_DIRS.forEach(({ dir, prefix, label }) => {
    let files = [];
    try {
      files = fs.readdirSync(dir);
    } catch (error) {
      return;
    }
    files.forEach(filename => {
      if (!/\.(png|jpe?g|gif|webp)$/i.test(filename)) return;
      let stat = null;
      try {
        stat = fs.statSync(path.join(dir, filename));
      } catch (error) {
        return;
      }
      if (!stat.isFile()) return;
      all.push({
        path: `${prefix}/${filename}`,
        name: filename,
        group: label,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        deletable: prefix === 'assets/uploads'
      });
    });
  });
  return all.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
}

function listBackups() {
  let entries = [];
  try {
    entries = fs.readdirSync(BACKUP_DIR);
  } catch (error) {
    return [];
  }
  return entries
    .filter(name => /^cms-content\.json\..+\.bak$/.test(name))
    .map(name => {
      try {
        const stat = fs.statSync(path.join(BACKUP_DIR, name));
        const stampMatch = name.match(/^cms-content\.json\.(.+)\.bak$/);
        return { filename: name, modifiedAt: stat.mtime.toISOString(), stamp: stampMatch ? stampMatch[1] : '', size: stat.size };
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt))
    .slice(0, 50);
}

/* ---------- Admin (CMS-authed) endpoints ---------- */
async function handleAdminApi(req, res, url) {
  // Image library
  if (req.method === 'GET' && url.pathname === '/api/admin/images') {
    sendJson(res, 200, { images: listLibraryImages() });
    return;
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/api/admin/images/uploads/')) {
    const filename = decodeURIComponent(url.pathname.replace('/api/admin/images/uploads/', ''));
    if (!/^[a-z0-9._-]+\.(png|jpe?g|gif|webp)$/i.test(filename)) {
      return sendJson(res, 400, { error: 'Invalid filename.' });
    }
    const target = path.join(UPLOAD_DIR, filename);
    if (!target.startsWith(UPLOAD_DIR + path.sep) && target !== UPLOAD_DIR) {
      return sendJson(res, 403, { error: 'Forbidden.' });
    }
    try {
      fs.unlinkSync(target);
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 404, { error: 'Image not found.' });
    }
    return;
  }

  // Backups: list + restore
  if (req.method === 'GET' && url.pathname === '/api/admin/backups') {
    sendJson(res, 200, { backups: listBackups() });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/backups/restore') {
    const body = await readJsonBody(req);
    const filename = String(body.filename || '');
    if (!/^cms-content\.json\.[\w.-]+\.bak$/.test(filename)) {
      return sendJson(res, 400, { error: 'Invalid backup filename.' });
    }
    const target = path.join(BACKUP_DIR, filename);
    const relative = path.relative(BACKUP_DIR, target);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      return sendJson(res, 403, { error: 'Forbidden.' });
    }
    if (!fs.existsSync(target)) return sendJson(res, 404, { error: 'Backup not found.' });
    try {
      const restored = readJson(target);
      if (!restored) return sendJson(res, 400, { error: 'Backup file is corrupt.' });
      saveContent(restored);
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 500, { error: error.message || 'Restore failed.' });
    }
    return;
  }

  sendJson(res, 404, { error: 'Admin route not found.' });
}

async function handlePlaceOrder(req, res) {
  const user = getCurrentUser(req);
  const body = await readJsonBody(req);
  if (!body || !body.orderNumber || !Array.isArray(body.items)) {
    return sendJson(res, 400, { error: 'Invalid order payload.' });
  }
  const accounts = readAccounts();
  const order = normalizeOrder(body, { userId: user ? user.id : null });
  if (!accounts.orders.some(existing => existing.orderNumber === order.orderNumber)) {
    accounts.orders.unshift(order);
    accounts.orders = accounts.orders.slice(0, 500);
    writeAccounts(accounts);
  }
  sendJson(res, 200, { ok: true, order });
}

async function handleApi(req, res, url) {
  try {
    if (url.pathname.startsWith('/api/account/')) {
      await handleAccountApi(req, res, url);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/orders') {
      await handlePlaceOrder(req, res);
      return;
    }

    if (url.pathname.startsWith('/api/admin/')) {
      if (!requireAuth(req, res)) return;
      await handleAdminApi(req, res, url);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/login') {
      const body = await readJsonBody(req);
      if (!secretsEqual(String(body.password || ''), CMS_PASSWORD_HASH)) {
        sendJson(res, 403, { error: 'Incorrect password.' });
        return;
      }
      const token = crypto.randomBytes(24).toString('hex');
      sessions.set(token, Date.now() + SESSION_TTL);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Set-Cookie': `cms_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200`,
        'Cache-Control': 'no-store'
      });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/logout') {
      const token = parseCookies(req).cms_session;
      if (token) sessions.delete(token);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Set-Cookie': 'cms_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
        'Cache-Control': 'no-store'
      });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (!requireAuth(req, res)) return;

    if (req.method === 'GET' && url.pathname === '/api/content') {
      sendJson(res, 200, { content: loadContent(), draft: loadDraft() });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/draft') {
      sendJson(res, 200, { draft: loadDraft() });
      return;
    }

    if (req.method === 'PUT' && url.pathname === '/api/draft') {
      const content = await readJsonBody(req);
      sendJson(res, 200, { ok: true, draft: saveDraft(content) });
      return;
    }

    if (req.method === 'PUT' && url.pathname === '/api/content') {
      const content = await readJsonBody(req);
      const current = loadContent();
      if (Number(content.revision) !== Number(current.revision)) {
        sendJson(res, 409, {
          error: 'This content was changed elsewhere. Reload before publishing.',
          currentRevision: current.revision
        });
        return;
      }
      const saved = saveContent(content);
      if (fs.existsSync(DRAFT_PATH)) fs.rmSync(DRAFT_PATH);
      sendJson(res, 200, { ok: true, content: saved });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/upload') {
      const body = await readJsonBody(req);
      const match = String(body.dataUrl || '').match(/^data:(image\/(?:png|jpeg|jpg|gif|webp));base64,(.+)$/);
      if (!match) {
        sendJson(res, 400, { error: 'Please upload a valid image file.' });
        return;
      }

      const extByMime = {
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/gif': '.gif',
        'image/webp': '.webp'
      };
      const ext = extByMime[match[1]] || path.extname(body.filename || '') || '.png';
      const name = `${Date.now()}-${slug(path.basename(body.filename || 'image', path.extname(body.filename || '')))}${ext}`;
      const buffer = Buffer.from(match[2], 'base64');
      if (buffer.length > 5 * 1024 * 1024) {
        sendJson(res, 400, { error: 'Images must be 5MB or smaller.' });
        return;
      }
      fs.writeFileSync(path.join(UPLOAD_DIR, name), buffer);
      sendJson(res, 200, { ok: true, path: `assets/uploads/${name}` });
      return;
    }

    sendJson(res, 404, { error: 'API route not found.' });
  } catch (error) {
    sendJson(res, error.status || 500, {
      error: error.message || 'Something went wrong.',
      errors: error.errors || undefined
    });
  }
}

function serveStatic(req, res, url) {
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch (error) {
    send(res, 400, 'Bad request', 'text/plain; charset=utf-8');
    return;
  }
  if (pathname === '/') pathname = '/index.html';
  if (pathname === '/cms') pathname = '/cms.html';

  const filePath = path.resolve(ROOT, `.${pathname}`);
  const relative = path.relative(ROOT, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, 404, 'Not found', 'text/plain; charset=utf-8');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const headers = {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Cache-Control': filePath.includes(`${path.sep}assets${path.sep}js${path.sep}`) || filePath.includes(`${path.sep}assets${path.sep}data${path.sep}`)
        ? 'no-cache'
        : 'public, max-age=120'
    };
    res.writeHead(200, headers);
    res.end(data);
  });
}

bootstrapContent();

http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  if (url.pathname.startsWith('/api/')) {
    handleApi(req, res, url);
    return;
  }
  serveStatic(req, res, url);
}).listen(PORT, '127.0.0.1', () => {
  console.log(`B&S website: http://127.0.0.1:${PORT}/`);
  console.log(`B&S CMS:     http://127.0.0.1:${PORT}/cms.html`);
  console.log(process.env.CMS_PASSWORD ? 'CMS password: set from CMS_PASSWORD environment variable' : `CMS password: see ${PASSWORD_FILE}`);
});
