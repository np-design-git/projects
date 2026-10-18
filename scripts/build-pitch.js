#!/usr/bin/env node
/**
 * Build a client pitch into a standalone index.html.
 * Usage: node scripts/build-pitch.js <slug>
 *        node scripts/build-pitch.js            # every folder with pitch.json
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const SLIDE_ORDER = ['cover', 'overview', 'cards', 'list', 'list', 'process', 'cost', 'closing'];
const SLIDE_LABELS = ['COVER', 'OVERVIEW', 'OBJECTIVES', 'SCOPE', 'LIMITATIONS', 'PROCESS', 'TOTAL', 'CLOSING'];
const DARK_SLIDES = new Set([0, 4, 7]);
const COLOR_KEYS = [
  'bgPrimary',
  'bgSecondary',
  'contentPrimary',
  'contentSecondary',
  'contentSubtle',
  'borderPrimary',
  'borderSecondary',
];
const HEX = /^#[0-9A-Fa-f]{6}$/;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`Could not read ${file}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function assertString(value, label) {
  assert(isNonEmptyString(value), `${label} must be a non-empty string`);
}

function assertStringList(value, label) {
  assert(Array.isArray(value) && value.length > 0, `${label} must be a non-empty list`);
  value.forEach((item, i) => assertString(item, `${label}[${i}]`));
}

function assertHex(value, label) {
  assert(typeof value === 'string' && HEX.test(value), `${label} must be a #RRGGBB color`);
}

function validatePalette(palette, label) {
  assert(palette && typeof palette === 'object', `${label} palette is required`);
  for (const key of COLOR_KEYS) assertHex(palette[key], `${label}.${key}`);
}

function validateFont(font, label) {
  assert(font && typeof font === 'object', `${label} is required`);
  assertString(font.family, `${label}.family`);
  assert(/^[\p{L}\p{N} ]+$/u.test(font.family), `${label}.family must be a Google Font family name`);
  assertString(font.google, `${label}.google`);
  assert(/^[\w@,;.+-]+$/.test(font.google), `${label}.google must be a Google Fonts axis spec, such as wght@300;400`);
  assert(font.fallback === 'sans-serif' || font.fallback === 'serif', `${label}.fallback must be sans-serif or serif`);
}

function validatePitch(pitch, slug) {
  assert(pitch && typeof pitch === 'object', 'pitch.json must be an object');
  assert(pitch.slug === slug, `pitch.slug must match the folder name "${slug}"`);
  assertString(pitch.title, 'title');
  assert(pitch.lang === undefined || isNonEmptyString(pitch.lang), 'lang must be a language code');

  assert(pitch.theme && typeof pitch.theme === 'object', 'theme is required');
  assertHex(pitch.theme.pageBackground, 'theme.pageBackground');
  validatePalette(pitch.theme.light, 'theme.light');
  validatePalette(pitch.theme.dark, 'theme.dark');
  assert(pitch.theme.fonts && typeof pitch.theme.fonts === 'object', 'theme.fonts is required');
  validateFont(pitch.theme.fonts.sans, 'theme.fonts.sans');
  validateFont(pitch.theme.fonts.serif, 'theme.fonts.serif');

  const contact = pitch.contact;
  assert(contact && typeof contact === 'object', 'contact is required');
  assertString(contact.name, 'contact.name');
  assertString(contact.email, 'contact.email');
  assert(/^[^"'\s]+@[^"'\s]+$/.test(contact.email), 'contact.email must be an email address');
  assertString(contact.site, 'contact.site');
  assert(/^https:\/\/[^"'\s]+$/.test(contact.site), 'contact.site must be an https URL');
  assertString(contact.siteLabel, 'contact.siteLabel');

  assert(Array.isArray(pitch.slides), 'slides must be a list');
  assert(
    pitch.slides.length === SLIDE_ORDER.length && pitch.slides.every((slide, i) => slide && slide.type === SLIDE_ORDER[i]),
    `slides must be exactly: ${SLIDE_ORDER.join(', ')}`
  );

  pitch.slides.forEach((slide, i) => validateSlide(slide, i));
}

function validateSlide(slide, index) {
  const where = `slides[${index}] (${slide.type})`;
  if (slide.type === 'cover') {
    assertString(slide.eyebrow, `${where}.eyebrow`);
    assertString(slide.title, `${where}.title`);
    assertStringList(slide.subtitle, `${where}.subtitle`);
    if (slide.logo !== undefined) {
      assert(slide.logo && typeof slide.logo === 'object', `${where}.logo must be an object`);
      assertString(slide.logo.src, `${where}.logo.src`);
      assert(!slide.logo.src.includes('..') && !slide.logo.src.startsWith('/'), `${where}.logo.src must be a file inside the client folder`);
      assertString(slide.logo.alt, `${where}.logo.alt`);
      assert(Number.isInteger(slide.logo.width) && slide.logo.width > 0, `${where}.logo.width must be a positive integer`);
      assert(Number.isInteger(slide.logo.height) && slide.logo.height > 0, `${where}.logo.height must be a positive integer`);
    }
    return;
  }
  if (slide.type === 'overview') {
    assertString(slide.label, `${where}.label`);
    assertString(slide.title, `${where}.title`);
    assertString(slide.lede, `${where}.lede`);
    return;
  }
  if (slide.type === 'cards' || slide.type === 'process') {
    assertString(slide.label, `${where}.label`);
    assertString(slide.title, `${where}.title`);
    assert(Array.isArray(slide.items) && slide.items.length > 0, `${where}.items must be a non-empty list`);
    slide.items.forEach((item, n) => {
      const itemWhere = `${where}.items[${n}]`;
      assert(item && typeof item === 'object', `${itemWhere} must be an object`);
      assertString(item.title, `${itemWhere}.title`);
      assertStringList(item.points, `${itemWhere}.points`);
      if (slide.type === 'process') assertStringList(item.days, `${itemWhere}.days`);
    });
    if (slide.type === 'process') assertString(slide.launch, `${where}.launch`);
    return;
  }
  if (slide.type === 'list') {
    assertString(slide.label, `${where}.label`);
    assertString(slide.title, `${where}.title`);
    assert(Array.isArray(slide.rows) && slide.rows.length > 0, `${where}.rows must be a non-empty list`);
    slide.rows.forEach((row, n) => {
      assert(row && typeof row === 'object', `${where}.rows[${n}] must be an object`);
      assertString(row.key, `${where}.rows[${n}].key`);
      assertString(row.value, `${where}.rows[${n}].value`);
    });
    return;
  }
  if (slide.type === 'cost') {
    assertString(slide.label, `${where}.label`);
    assertString(slide.title, `${where}.title`);
    assertString(slide.equation, `${where}.equation`);
    assertString(slide.amount, `${where}.amount`);
    assertString(slide.currency, `${where}.currency`);
    assert(slide.hosting && typeof slide.hosting === 'object', `${where}.hosting is required`);
    assertString(slide.hosting.label, `${where}.hosting.label`);
    assert(Array.isArray(slide.hosting.rows) && slide.hosting.rows.length > 0, `${where}.hosting.rows must be a non-empty list`);
    slide.hosting.rows.forEach((row, n) => {
      assertString(row.name, `${where}.hosting.rows[${n}].name`);
      assertString(row.value, `${where}.hosting.rows[${n}].value`);
    });
    assertString(slide.hosting.disclaimer, `${where}.hosting.disclaimer`);
    return;
  }
  if (slide.type === 'closing') {
    assertString(slide.eyebrow, `${where}.eyebrow`);
    assertString(slide.title, `${where}.title`);
    assertStringList(slide.subtitle, `${where}.subtitle`);
  }
}

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cssFamily(font) {
  const quoted = `'${font.family}'`;
  return `${quoted}, ${font.fallback}`;
}

function googleFontsHref(fonts) {
  const family = (font) => `family=${encodeURIComponent(font.family).replace(/%20/g, '+')}:${font.google}`;
  return `https://fonts.googleapis.com/css2?${family(fonts.serif)}&${family(fonts.sans)}&display=swap`;
}

function themeCss(theme) {
  const block = (selector, palette) => {
    const lines = COLOR_KEYS.map((key) => {
      const cssName = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      return `    --${cssName}: ${palette[key]};`;
    });
    return `  ${selector} {\n${lines.join('\n')}\n  }`;
  };
  return `  @import url('${googleFontsHref(theme.fonts)}');

  :root {
    --font-sans: ${cssFamily(theme.fonts.sans)};
    --font-serif: ${cssFamily(theme.fonts.serif)};
    --page-background: ${theme.pageBackground};
  }

${block('.slide.theme-light', theme.light)}
${block('.slide.theme-dark', theme.dark)}
`;
}

function slideClasses(type, index) {
  const surface = type === 'cover' || type === 'closing' ? 's-cover' : (index === 4 ? 's-dark-green' : 's-light');
  const theme = DARK_SLIDES.has(index) ? 'theme-dark' : 'theme-light';
  const active = index === 0 ? ' active' : '';
  return `${surface} ${theme}${active}`;
}

function lines(parts) {
  return parts.filter((part) => part !== '').join('\n');
}

function coverMeta(contact) {
  return lines([
    '    <div class="cover-meta">',
    `      ${esc(contact.name)}<br>`,
    `      <a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a><br>`,
    `      <a href="${esc(contact.site)}">${esc(contact.siteLabel)}</a>`,
    '    </div>',
  ]);
}

function subtitle(items) {
  return lines([
    '    <div class="subtitle">',
    `      ${items.map(esc).join('<br>\n      ')}`,
    '    </div>',
  ]);
}

function header(slide, size) {
  return lines([
    '      <div class="slide-header">',
    `        <div class="section-label">${esc(slide.label)}</div>`,
    `        <h2 class="slide-title ${size}">${esc(slide.title)}</h2>`,
    '      </div>',
  ]);
}

function packageCard(item, index, withDays) {
  const number = String(index + 1).padStart(2, '0');
  const points = item.points.map((point) => `            <div class="pkg-item">${esc(point)}</div>`).join('\n');
  return lines([
    '        <div class="pkg">',
    `          <div class="pkg-num">${number}</div>`,
    `          <div class="pkg-title">${esc(item.title)}</div>`,
    withDays ? `          <div class="pkg-days">${item.days.map(esc).join('<br>')}</div>` : '',
    '          <div class="pkg-divider"></div>',
    '          <div class="pkg-items">',
    points,
    '          </div>',
    '        </div>',
  ]);
}

function renderCover(slide, pitch) {
  const logo = slide.logo
    ? `    <img class="cover-ornament" src="${esc(slide.logo.src)}" alt="${esc(slide.logo.alt)}" width="${slide.logo.width}" height="${slide.logo.height}" decoding="async" />`
    : '';
  return lines([
    `    <div class="eyebrow">${esc(slide.eyebrow)}</div>`,
    `    <h1 class="cover-brand-title">${esc(slide.title)}</h1>`,
    subtitle(slide.subtitle),
    '    <div class="cover-line"></div>',
    coverMeta(pitch.contact),
    logo,
  ]);
}

function renderOverview(slide) {
  return lines([
    '    <div class="slide-inner">',
    header(slide, 'title-lg'),
    '      <div>',
    '        <p class="lede">',
    `          ${esc(slide.lede)}`,
    '        </p>',
    '        <div class="lede-rule"></div>',
    '      </div>',
    '    </div>',
  ]);
}

function renderCards(slide) {
  const cards = slide.items.map((item, i) => packageCard(item, i, false)).join('\n');
  return lines([
    '    <div class="slide-inner slide-inner--bottompad">',
    header(slide, 'title-md'),
    '      <div class="packages-grid packages-grid--bottompad">',
    cards,
    '      </div>',
    '    </div>',
  ]);
}

function renderList(slide) {
  const rows = slide.rows.map((row, i) => {
    const last = i === slide.rows.length - 1 ? ' limit-row--noborder' : '';
    return lines([
      `        <div class="limit-row${last}">`,
      `          <div class="limit-key">${esc(row.key)}</div>`,
      `          <div class="limit-val">${esc(row.value)}</div>`,
      '        </div>',
    ]);
  }).join('\n');
  return lines([
    '    <div class="slide-inner">',
    header(slide, 'title-md'),
    '      <div class="limits-list">',
    rows,
    '      </div>',
    '    </div>',
  ]);
}

function renderProcess(slide) {
  const cards = slide.items.map((item, i) => packageCard(item, i, true)).join('\n');
  return lines([
    '    <div class="slide-inner slide-inner--bottompad">',
    header(slide, 'title-md'),
    '      <div class="packages-grid">',
    cards,
    '      </div>',
    '      <div class="tl-launch">',
    `        ${esc(slide.launch)}`,
    '      </div>',
    '    </div>',
  ]);
}

function renderCost(slide) {
  const rows = slide.hosting.rows.map((row) => lines([
    '          <div class="cost-row">',
    '            <div class="cost-key">',
    `              <strong>${esc(row.name)}</strong>`,
    '            </div>',
    `            <div class="cost-val">${esc(row.value)}</div>`,
    '          </div>',
  ])).join('\n');
  return lines([
    '    <div class="slide-inner">',
    header(slide, 'title-md'),
    '      <div class="total-layout">',
    '        <div class="total-left">',
    `          <div class="total-equation">${esc(slide.equation)}</div>`,
    `          <div class="total-amount">${esc(slide.amount)}<span class="currency">${esc(slide.currency)}</span></div>`,
    '        </div>',
    '        <div class="total-right">',
    `          <div class="costs-label">${esc(slide.hosting.label)}</div>`,
    rows,
    '          <div class="costs-disclaimer">',
    `            ${esc(slide.hosting.disclaimer)}`,
    '          </div>',
    '        </div>',
    '      </div>',
    '    </div>',
  ]);
}

function renderClosing(slide, pitch) {
  return lines([
    `    <div class="eyebrow">${esc(slide.eyebrow)}</div>`,
    `    <h1>${esc(slide.title)}</h1>`,
    subtitle(slide.subtitle),
    '    <div class="cover-line"></div>',
    coverMeta(pitch.contact),
  ]);
}

const RENDER = {
  cover: renderCover,
  overview: renderOverview,
  cards: renderCards,
  list: renderList,
  process: renderProcess,
  cost: renderCost,
  closing: renderClosing,
};

function renderDocument(pitch, css, js) {
  const slides = pitch.slides.map((slide, index) => {
    const body = RENDER[slide.type](slide, pitch);
    return lines([
      `  <!-- SLIDE ${index + 1}: ${SLIDE_LABELS[index]} -->`,
      `  <div class="slide ${slideClasses(slide.type, index)}" data-index="${index}">`,
      body,
      '  </div>',
    ]);
  }).join('\n\n');

  const lang = esc(pitch.lang || 'en');
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(pitch.title)}</title>
<style>
${themeCss(pitch.theme)}
${css.trimEnd()}
</style>
</head>
<body>

<!-- Generated from pitch.json. Edit pitch.json, then rebuild. -->
<div class="deck" id="deck">

${slides}

</div>

<!-- NAV -->
<nav class="nav appearance-on-dark" role="navigation" aria-label="Slide navigation">
  <button type="button" onclick="go(-1)" aria-label="Previous slide"><span class="nav-btn-arrow" aria-hidden="true">←</span><span class="nav-btn-text">Prev</span></button>
  <div class="nav-dots" id="dots"></div>
  <button type="button" onclick="go(1)" aria-label="Next slide"><span class="nav-btn-arrow" aria-hidden="true">→</span><span class="nav-btn-text">Next</span></button>
  <span class="slide-count" id="count"></span>
</nav>

<script>
${js.trimEnd()}
</script>
</body>
</html>
`;
}

function clientSlugs(arg) {
  if (arg) return [arg];
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(root, entry.name, 'pitch.json')))
    .map((entry) => entry.name);
}

function build(slug) {
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug), `Slug "${slug}" must be lowercase words separated by hyphens`);
  const dir = path.join(root, slug);
  const pitchPath = path.join(dir, 'pitch.json');
  assert(fs.existsSync(pitchPath), `Missing ${path.relative(root, pitchPath)}`);
  const pitch = readJson(pitchPath);
  validatePitch(pitch, slug);
  const cover = pitch.slides[0];
  if (cover.logo) {
    const logoPath = path.join(dir, cover.logo.src);
    assert(fs.existsSync(logoPath), `Missing logo file ${slug}/${cover.logo.src}`);
  }
  const css = fs.readFileSync(path.join(root, 'template', 'deck.css'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'template', 'deck.js'), 'utf8');
  const html = renderDocument(pitch, css, js);
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  console.log(`Built ${slug}/index.html`);
}

const slugs = clientSlugs(process.argv[2]);
if (slugs.length === 0) fail('No pitch.json files found. Pass a client slug.');
for (const slug of slugs) build(slug);
