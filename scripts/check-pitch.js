#!/usr/bin/env node
/**
 * Check a pitch.json against the deck system.
 * Contrast is compared with Desa Alam. Other findings are warnings.
 * Usage: node scripts/check-pitch.js [slug ...]
 *        node scripts/check-pitch.js            # every folder with pitch.json
 *
 * Exit 0 when the files can be read. Warnings do not fail the run.
 */

const fs = require('fs');
const path = require('path');
const { DESA, contrastRatio } = require('./pitch-palette');

const root = path.join(__dirname, '..');
const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December';
const COVER_DATE = new RegExp(`^Design Proposal · (${MONTHS}) \\d{4}$`);
const LAUNCH = new RegExp(`^Launch (first|second|third|fourth|last) week of (${MONTHS})(?: \\d{4})? \\(assuming kick-off on (${MONTHS}) \\d{1,2}(?:st|nd|rd|th)\\)\\.?$`);
const PHASE_DAYS = /^(\d+) design days?$/;
const CAL_WEEK = /^Cal week (\d{1,2})(?:\/(\d{1,2}))?$/;
const EQUATION = /^(\d+) days × (\d+) EUR$/;
const AMOUNT = /^\d{1,3}(?:\.\d{3})+$|^\d+$/;
const HEX_IN_TEXT = /#[0-9A-Fa-f]{3,8}\b|rgba\s*\(/i;
const DATE_HINT = new RegExp(`\\b(?:${MONTHS})\\b|\\b\\d{1,2}[./]\\d{1,2}\\b|\\b20\\d{2}\\b`, 'i');

const PAIRS = [
  ['contentPrimary', 'bgPrimary'],
  ['contentPrimary', 'bgSecondary'],
  ['contentSecondary', 'bgPrimary'],
  ['contentSecondary', 'bgSecondary'],
  ['contentSubtle', 'bgPrimary'],
  ['contentSubtle', 'bgSecondary'],
];

const BANNED = [
  ['minimal', /\bminimal\b/i],
  ['clearer', /\bclearer\b/i],
  ['CI review', /\bci review\b/i],
  ['existing', /\bexisting\b/i],
  ['restyling', /\brestyling\b/i],
  ['precise', /\bprecise\b/i],
  ['ever', /\bever\b/i],
  ['maintainable', /\bmaintainable\b/i],
  ['call', /\bcalls?\b/i],
];

const TITLE = [
  /^title$/,
  /^slides\[(?:0|1|2|3|4|5|6)\]\.title$/,
  /^slides\[\d+\]\.label$/,
  /^slides\[0\]\.eyebrow$/,
  /^slides\[0\]\.subtitle\[\d+\]$/,
  /^slides\[2\]\.items\[\d+\]\.title$/,
  /^slides\[3\]\.rows\[\d+\]\.key$/,
  /^slides\[4\]\.rows\[\d+\]\.key$/,
  /^slides\[5\]\.items\[\d+\]\.title$/,
  /^slides\[5\]\.items\[\d+\]\.days\[\d+\]$/,
  /^slides\[6\]\.hosting\.label$/,
  /^slides\[6\]\.hosting\.rows\[\d+\]\.name$/,
  /^slides\[7\]\.eyebrow$/,
];

const SENTENCE = [
  /^slides\[1\]\.lede$/,
  /^slides\[2\]\.items\[\d+\]\.points\[\d+\]$/,
  /^slides\[3\]\.rows\[\d+\]\.value$/,
  /^slides\[4\]\.rows\[\d+\]\.value$/,
  /^slides\[5\]\.items\[\d+\]\.points\[\d+\]$/,
  /^slides\[5\]\.launch$/,
  /^slides\[6\]\.equation$/,
  /^slides\[6\]\.hosting\.rows\[\d+\]\.value$/,
  /^slides\[6\]\.hosting\.disclaimer$/,
  /^slides\[7\]\.title$/,
  /^slides\[7\]\.subtitle\[\d+\]$/,
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function discover(requested) {
  if (requested.length) return requested;
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(root, entry.name, 'pitch.json')))
    .map((entry) => entry.name)
    .sort();
}

function walk(value, tokenPath, out) {
  if (typeof value === 'string') out.push([tokenPath, value]);
  else if (Array.isArray(value)) value.forEach((item, index) => walk(item, `${tokenPath}[${index}]`, out));
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) walk(item, tokenPath ? `${tokenPath}.${key}` : key, out);
  }
}

function sameColor(a, b) {
  return typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase();
}

function parseAmount(value) {
  if (typeof value !== 'string' || !AMOUNT.test(value)) return null;
  if (/^\d{1,3}(?:\.\d{3})+$/.test(value)) return Number(value.replace(/\./g, ''));
  return Number(value);
}

function roleOf(tokenPath) {
  if (TITLE.some((pattern) => pattern.test(tokenPath))) return 'title';
  if (SENTENCE.some((pattern) => pattern.test(tokenPath))) return 'sentence';
  return null;
}

function referenceContrasts() {
  const table = {};
  for (const theme of ['light', 'dark']) {
    table[theme] = PAIRS.map(([text, surface]) => ({
      text,
      surface,
      ratio: contrastRatio(DESA[theme][text], DESA[theme][surface]),
    }));
  }
  return table;
}

function inRange(actual, reference) {
  const gap = Math.abs(actual - reference);
  return gap <= 0.45 || gap / reference <= 0.15;
}

function checkContrast(pitch, reference, lines, warnings) {
  lines.push('  contrast');
  for (const theme of ['light', 'dark']) {
    const palette = pitch.theme && pitch.theme[theme];
    if (!palette) {
      warnings.push(`${theme} palette is missing`);
      lines.push(`    ${theme}  missing`);
      continue;
    }
    for (const pair of reference[theme]) {
      const actual = contrastRatio(palette[pair.text], palette[pair.surface]);
      const label = `${theme} ${pair.text} on ${pair.surface}`;
      if (actual == null) {
        warnings.push(`${label} could not be measured`);
        lines.push(`    ${label}  unreadable`);
        continue;
      }
      const ok = inRange(actual, pair.ratio);
      if (!ok) warnings.push(`${label} is ${actual.toFixed(2)}:1, outside the Desa Alam ${pair.ratio.toFixed(2)}:1 range`);
      lines.push(`    ${label.padEnd(46)} ${actual.toFixed(2).padStart(5)}:1   reference ${pair.ratio.toFixed(2)}:1   ${ok ? 'ok' : 'warning'}`);
    }
  }
}

function checkSlideColours(pitch, lines, warnings) {
  const theme = pitch.theme || {};
  const allowed = [theme.light && theme.light.bgPrimary, theme.dark && theme.dark.bgPrimary, theme.pageBackground].filter(Boolean);
  const notes = [];
  (pitch.slides || []).forEach((slide, index) => {
    const where = `slides[${index}]`;
    if (slide.background !== undefined) {
      const listed = allowed.some((color) => sameColor(color, slide.background));
      if (listed) notes.push(`${where}.background ${slide.background} matches a theme base`);
      else warnings.push(`${where}.background ${slide.background} is outside the theme`);
    }
    for (const key of ['contentSecondary', 'contentSubtle']) {
      if (slide[key] !== undefined) warnings.push(`${where}.${key} overrides the theme`);
    }
  });
  const strings = [];
  walk(pitch.slides || [], 'slides', strings);
  for (const [tokenPath, value] of strings) {
    if (!HEX_IN_TEXT.test(value)) continue;
    if (/\.background$/.test(tokenPath)) continue;
    warnings.push(`${tokenPath} has a hard-coded colour`);
  }
  lines.push(notes.length ? `  slide colours  ${notes.join('; ')}` : '  slide colours  none outside the theme');
}

function checkCopy(pitch, lines, warnings) {
  const strings = [];
  walk(pitch, '', strings);
  const bannedHits = [];
  for (const [tokenPath, value] of strings) {
    if (tokenPath.startsWith('theme')) continue;
    for (const [label, pattern] of BANNED) {
      if (pattern.test(value)) bannedHits.push(`${label} in ${tokenPath}`);
    }
    const role = roleOf(tokenPath);
    if (role === 'title' && /\band\b/i.test(value)) warnings.push(`${tokenPath} uses "and" in a title. Use "&".`);
    if (role === 'sentence' && /&/.test(value)) warnings.push(`${tokenPath} uses "&" in a sentence. Use "and".`);
  }
  const designer = pitch.contact && pitch.contact.name;
  if (designer) {
    const needle = designer.toLowerCase();
    for (const [tokenPath, value] of strings) {
      if (!tokenPath.startsWith('slides')) continue;
      if (value.toLowerCase().includes(needle)) warnings.push(`${tokenPath} names the designer in the copy`);
    }
  }
  lines.push(bannedHits.length ? `  banned words  ${bannedHits.join('; ')}` : '  banned words  none');
  for (const hit of bannedHits) warnings.push(`banned word ${hit}`);

  const eyebrow = pitch.slides && pitch.slides[0] && pitch.slides[0].eyebrow;
  if (COVER_DATE.test(eyebrow || '')) lines.push(`  cover date    ${eyebrow}  ok`);
  else {
    warnings.push(`cover eyebrow should be "Design Proposal · Month YYYY", found ${JSON.stringify(eyebrow)}`);
    lines.push(`  cover date    ${eyebrow || '(missing)'}  warning`);
  }

  const lede = pitch.slides && pitch.slides[1] && pitch.slides[1].lede;
  if (lede && DATE_HINT.test(lede)) warnings.push('overview lede contains a date');

  const launch = pitch.slides && pitch.slides[5] && pitch.slides[5].launch;
  if (LAUNCH.test(launch || '')) lines.push(`  launch        ${launch}  ok`);
  else {
    warnings.push(`launch footnote does not match "Launch <nth> week of <Month> (assuming kick-off on <Month> <Nth>)."`);
    lines.push(`  launch        ${launch || '(missing)'}  warning`);
  }

  const items = (pitch.slides && pitch.slides[5] && pitch.slides[5].items) || [];
  const counts = [];
  items.forEach((item, index) => {
    const days = item.days || [];
    const count = PHASE_DAYS.exec(days[0] || '');
    const week = CAL_WEEK.exec(days[1] || '');
    if (!count) warnings.push(`phase ${index + 1} day line should read "N design days"`);
    if (!week) warnings.push(`phase ${index + 1} should include "Cal week N"`);
    if (count) counts.push(Number(count[1]));
  });
  const total = counts.reduce((sum, count) => sum + count, 0);
  lines.push(`  phase days    ${counts.join(' + ') || '(none)'} = ${total}`);

  const cost = pitch.slides && pitch.slides[6];
  const equation = cost && cost.equation;
  const match = EQUATION.exec(equation || '');
  const amount = cost ? parseAmount(cost.amount) : null;
  if (!match) {
    warnings.push(`cost equation should read "N days × RATE EUR"`);
    lines.push(`  cost          ${equation || '(missing)'}  warning`);
  } else {
    const days = Number(match[1]);
    const rate = Number(match[2]);
    const expected = days * rate;
    if (days !== total) warnings.push(`cost equation says ${days} days and the phases add up to ${total}`);
    if (amount == null) warnings.push('cost amount should use a thousands dot, such as 6.400');
    else if (amount !== expected) warnings.push(`cost amount ${cost.amount} does not equal ${days} × ${rate}`);
    const dayOk = days === total;
    const amountOk = amount === expected;
    lines.push(`  cost          ${equation} = ${cost.amount} ${cost.currency || ''}  ${dayOk && amountOk ? 'ok' : 'warning'}`);
  }
}

function checkDeck(slug, reference) {
  const file = path.join(root, slug, 'pitch.json');
  if (!fs.existsSync(file)) fail(`No pitch.json in ${slug}/`);
  let pitch;
  try {
    pitch = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`Could not read ${slug}/pitch.json: ${error.message}`);
  }
  const lines = [slug];
  const warnings = [];
  checkContrast(pitch, reference, lines, warnings);
  checkSlideColours(pitch, lines, warnings);
  checkCopy(pitch, lines, warnings);
  if (warnings.length) {
    lines.push('  warnings');
    for (const warning of warnings) lines.push(`    ${warning}`);
  }
  lines.push(`  result        ${warnings.length ? `pass with ${warnings.length} warning${warnings.length === 1 ? '' : 's'}` : 'pass'}`);
  return { lines, warnings: warnings.length };
}

function main() {
  const slugs = discover(process.argv.slice(2));
  if (!slugs.length) fail('No pitch.json folders found');
  const reference = referenceContrasts();
  let warnings = 0;
  for (const slug of slugs) {
    const report = checkDeck(slug, reference);
    warnings += report.warnings;
    process.stdout.write(`${report.lines.join('\n')}\n\n`);
  }
  process.stdout.write(`check-pitch: ${slugs.length} deck${slugs.length === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}\n`);
}

if (require.main === module) main();

module.exports = { checkDeck, referenceContrasts };
