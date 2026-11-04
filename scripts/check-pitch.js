#!/usr/bin/env node
/**
 * Check a pitch.json against the deck system.
 * Contrast uses a range per text role. Desa Alam is an example, not the target.
 * Usage: node scripts/check-pitch.js [slug ...]
 *        node scripts/check-pitch.js            # every folder with pitch.json
 *        node scripts/check-pitch.js --self-test
 *
 * Exit 0 when the files can be read. Warnings do not fail the run.
 * --self-test exits 1 when a built-in assertion fails.
 */

const fs = require('fs');
const path = require('path');
const { RULES, contrastRatio, oklabDistance, visibleHex } = require('./pitch-palette');

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

const TEXT_ROLES = ['contentPrimary', 'contentSecondary', 'contentSubtle'];
const SURFACES = ['bgPrimary', 'bgSecondary'];
const ROLE_RANGE = {
  contentPrimary: { min: RULES.primaryMin, max: null, label: `>= ${RULES.primaryMin}` },
  contentSecondary: { min: RULES.secondaryMin, max: RULES.secondaryMax, label: `${RULES.secondaryMin}–${RULES.secondaryMax}` },
  contentSubtle: { min: RULES.subtleMin, max: null, label: `>= ${RULES.subtleMin}` },
};

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

function inContrastRange(role, ratio) {
  const range = ROLE_RANGE[role];
  if (ratio == null) return false;
  if (ratio < range.min) return false;
  if (range.max != null && ratio > range.max) return false;
  return true;
}

function textGaps(palette) {
  const seen = TEXT_ROLES.map((role) => visibleHex(palette[role], palette.bgPrimary));
  const gaps = [];
  for (let i = 0; i < seen.length; i += 1) {
    for (let j = i + 1; j < seen.length; j += 1) {
      if (!seen[i] || !seen[j]) return null;
      gaps.push(oklabDistance(seen[i], seen[j]));
    }
  }
  return gaps;
}

function checkPalette(theme, palette, lines, warnings) {
  if (!palette) {
    warnings.push(`${theme} palette is missing`);
    lines.push(`  ${theme}  missing`);
    return;
  }
  lines.push(`  ${theme} contrast`);
  for (const role of TEXT_ROLES) {
    for (const surface of SURFACES) {
      const ratio = contrastRatio(palette[role], palette[surface]);
      const label = `${role} on ${surface}`;
      const range = ROLE_RANGE[role].label;
      if (ratio == null) {
        warnings.push(`${theme} ${label} could not be measured`);
        lines.push(`    ${label.padEnd(36)} unreadable`);
        continue;
      }
      const ok = inContrastRange(role, ratio);
      if (!ok) warnings.push(`${theme} ${label} is ${ratio.toFixed(2)}:1, outside ${range}`);
      lines.push(`    ${label.padEnd(36)} ${ratio.toFixed(2).padStart(5)}:1   ${range.padEnd(8)} ${ok ? 'ok' : 'warning'}`);
    }
  }

  const gaps = textGaps(palette);
  if (!gaps) {
    warnings.push(`${theme} text roles could not be compared`);
    lines.push(`  ${theme} tones      unreadable`);
  } else {
    const wide = gaps.filter((gap) => gap >= RULES.textGap).length;
    const ok = wide >= RULES.textGapPairs;
    if (!ok) {
      warnings.push(`${theme} text roles collapse into one tone (${gaps.map((gap) => gap.toFixed(3)).join(', ')} OKLab; need ${RULES.textGapPairs} gaps of at least ${RULES.textGap})`);
    }
    lines.push(`  ${theme} tones      gaps ${gaps.map((gap) => gap.toFixed(3)).join(', ')}   ${ok ? 'ok' : 'warning'}`);
  }

  const bgSeen = [
    visibleHex(palette.bgPrimary, palette.bgPrimary),
    visibleHex(palette.bgSecondary, palette.bgPrimary),
  ];
  if (!bgSeen[0] || !bgSeen[1]) {
    warnings.push(`${theme} backgrounds could not be compared`);
  } else {
    const gap = oklabDistance(bgSeen[0], bgSeen[1]);
    const ok = gap >= RULES.bgGap;
    if (!ok) warnings.push(`${theme} bgSecondary is not distinct from bgPrimary (${gap.toFixed(3)} OKLab, minimum ${RULES.bgGap})`);
    lines.push(`  ${theme} surfaces   bg gap ${gap.toFixed(3)}   ${ok ? 'ok' : 'warning'}`);
  }

  for (const surface of SURFACES) {
    const primary = contrastRatio(palette.borderPrimary, palette[surface]);
    const secondary = contrastRatio(palette.borderSecondary, palette[surface]);
    if (primary == null || secondary == null) {
      warnings.push(`${theme} borders on ${surface} could not be measured`);
      continue;
    }
    const visible = primary >= RULES.borderMin && secondary >= RULES.borderMin;
    const quieter = secondary <= primary + RULES.borderQuietSlack;
    if (!visible) warnings.push(`${theme} borders on ${surface} are faint (${primary.toFixed(2)}:1 and ${secondary.toFixed(2)}:1, minimum ${RULES.borderMin}:1)`);
    if (!quieter) warnings.push(`${theme} borderSecondary on ${surface} is louder than borderPrimary (${secondary.toFixed(2)}:1 vs ${primary.toFixed(2)}:1)`);
    lines.push(`  ${theme} borders    ${surface} ${primary.toFixed(2)}:1 / ${secondary.toFixed(2)}:1   ${visible && quieter ? 'ok' : 'warning'}`);
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

function checkDeck(slug) {
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
  checkPalette('light', pitch.theme && pitch.theme.light, lines, warnings);
  checkPalette('dark', pitch.theme && pitch.theme.dark, lines, warnings);
  checkSlideColours(pitch, lines, warnings);
  checkCopy(pitch, lines, warnings);
  if (warnings.length) {
    lines.push('  warnings');
    for (const warning of warnings) lines.push(`    ${warning}`);
  }
  lines.push(`  result        ${warnings.length ? `pass with ${warnings.length} warning${warnings.length === 1 ? '' : 's'}` : 'pass'}`);
  return { lines, warnings: warnings.length };
}

function selfTest() {
  const { generatePalette, DESA } = require('./pitch-palette');
  const failures = [];
  const oldDark = {
    bgPrimary: '#333D48',
    bgSecondary: '#242B3C',
    contentPrimary: '#FAFBF9',
    contentSecondary: '#EAF5FF',
    contentSubtle: '#F5F8FE',
    borderPrimary: 'rgba(80, 120, 255, 0.25)',
    borderSecondary: '#414E70',
  };
  const currentDark = {
    bgPrimary: '#333D48',
    bgSecondary: '#242B3C',
    contentPrimary: '#FAFBF9',
    contentSecondary: '#A9BDF0',
    contentSubtle: '#F5F8FE',
    borderPrimary: 'rgba(80, 120, 255, 0.25)',
    borderSecondary: '#414E70',
  };
  const oldLines = [];
  const oldWarnings = [];
  checkPalette('old-dark', oldDark, oldLines, oldWarnings);
  const currentLines = [];
  const currentWarnings = [];
  checkPalette('current-dark', currentDark, currentLines, currentWarnings);
  const oldTone = oldWarnings.find((warning) => warning.includes('collapse into one tone'));
  const currentTone = currentWarnings.find((warning) => warning.includes('collapse into one tone'));
  process.stdout.write(`${oldLines.join('\n')}\n`);
  process.stdout.write(oldTone ? `  distinguish   fail  ${oldTone}\n\n` : '  distinguish   unexpectedly passed\n\n');
  process.stdout.write(`${currentLines.join('\n')}\n`);
  process.stdout.write(`  distinguish   ${currentTone ? 'fail' : 'pass'}\n\n`);
  if (!oldTone) failures.push('old Ocumeda dark text did not fail distinguishability');
  if (currentTone) failures.push('current Ocumeda dark text failed distinguishability');

  const reproduced = generatePalette({
    light: DESA.light.bgPrimary,
    dark: DESA.dark.bgPrimary,
    ink: DESA.light.contentPrimary,
    accent: DESA.light.contentSecondary,
  });
  for (const theme of ['light', 'dark']) {
    for (const [key, value] of Object.entries(DESA[theme])) {
      if (reproduced[theme][key].toLowerCase() !== value.toLowerCase()) {
        failures.push(`Desa Alam ${theme}.${key} reproduced as ${reproduced[theme][key]}`);
      }
    }
  }
  const generated = generatePalette({
    light: '#F4EFE6',
    dark: '#243028',
    ink: '#241C16',
    accent: '#3E5340',
  });
  const generatedWarnings = [];
  checkPalette('generated-light', generated.light, [], generatedWarnings);
  checkPalette('generated-dark', generated.dark, [], generatedWarnings);
  if (generatedWarnings.length) failures.push(`generated palette warnings: ${generatedWarnings.join('; ')}`);
  if (failures.length) {
    for (const failure of failures) process.stderr.write(`${failure}\n`);
    process.exit(1);
  }
  process.stdout.write('self-test: old dark text fails distinguishability, current dark text passes, Desa Alam reproduces\n');
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) {
    selfTest();
    return;
  }
  const slugs = discover(args);
  if (!slugs.length) fail('No pitch.json folders found');
  let warnings = 0;
  for (const slug of slugs) {
    const report = checkDeck(slug);
    warnings += report.warnings;
    process.stdout.write(`${report.lines.join('\n')}\n\n`);
  }
  process.stdout.write(`check-pitch: ${slugs.length} deck${slugs.length === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}\n`);
}

if (require.main === module) main();

module.exports = { checkDeck, checkPalette };
