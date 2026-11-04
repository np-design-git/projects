#!/usr/bin/env node
/**
 * Build a light and dark pitch palette from a few brand colours.
 *
 * Ink and accent are kept. Derived tones aim at the middle of the role ranges
 * in RULES. Desa Alam's four brand colours still reproduce that palette exactly.
 *
 * Usage:
 *   node scripts/pitch-palette.js --light #F5F0E6 --dark #2D3B2A --ink #1E1C1A --accent #3D4F38
 *   node scripts/pitch-palette.js --light #EAF5FF --dark #333D48 --ink #333D48 --accent #3A4C76 --set light.bgSecondary=#FAFBF9
 */

const HEX = /^#([0-9A-Fa-f]{6})$/;
const RGBA = /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0|1|0?\.\d+)\s*\)$/;

const DESA = {
  light: {
    bgPrimary: '#F5F0E6',
    bgSecondary: '#E8DFD0',
    contentPrimary: '#1E1C1A',
    contentSecondary: '#3D4F38',
    contentSubtle: '#8C7B6E',
    borderPrimary: '#C8B89A',
    borderSecondary: '#D4C8B4',
  },
  dark: {
    bgPrimary: '#2D3B2A',
    bgSecondary: '#1E2820',
    contentPrimary: '#F5F0E6',
    contentSecondary: '#C8B89A',
    contentSubtle: '#D6E0CE',
    borderPrimary: '#C8B89A',
    borderSecondary: '#3D4F38',
  },
};

const LIGHT_KEYS = ['bgPrimary', 'bgSecondary', 'contentPrimary', 'contentSecondary', 'contentSubtle', 'borderPrimary', 'borderSecondary'];

// Role ranges are loose on purpose. Desa Alam is a reference example, not the target.
// Primary has no cap: 10 is the working middle of "at least 7" and the strong titles
// already in the decks (about 10 to 15). Secondary is a closed band, so its middle is 6.75.
// Subtle only has a floor. On a light ground the practical band is 3 to 6, middle 4.5,
// quieter than a secondary label. On a dark ground subtle may sit above secondary,
// so the target is 8, between the secondary middle and the primary target.
const RULES = {
  primaryMin: 7,
  secondaryMin: 4.5,
  secondaryMax: 9,
  subtleMin: 3,
  textGap: 0.08,
  textGapPairs: 2,
  bgGap: 0.02,
  borderMin: 1.2,
  borderQuietSlack: 0.4,
  targets: {
    primary: 10,
    secondary: 6.75,
    subtleLight: 4.5,
    subtleDark: 8,
    borderPrimary: 1.7,
    borderSecondary: 1.4,
    bgStep: 0.04,
  },
};

function fail(message) {
  console.error(message);
  process.exit(1);
}

function srgbToLinear(channel) {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(channel) {
  const clamped = Math.min(1, Math.max(0, channel));
  return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
}

function parseHex(value) {
  const match = typeof value === 'string' ? value.match(HEX) : null;
  if (!match) return null;
  const hex = match[1];
  return [
    parseInt(hex.slice(0, 2), 16) / 255,
    parseInt(hex.slice(2, 4), 16) / 255,
    parseInt(hex.slice(4, 6), 16) / 255,
  ];
}

function rgbToHex(rgb) {
  const parts = rgb.map((channel) => {
    const byte = Math.round(Math.min(1, Math.max(0, channel)) * 255);
    return byte.toString(16).padStart(2, '0');
  });
  return `#${parts.join('')}`.toUpperCase();
}

function linearRgbToOklab(rgb) {
  const [r, g, b] = rgb.map(srgbToLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    L: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  };
}

function oklabToLinearRgb(lab) {
  const l_ = lab.L + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
  const m_ = lab.L - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
  const s_ = lab.L - 0.0894841775 * lab.a - 1.2914855480 * lab.b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

function oklabToOklch(lab) {
  const C = Math.hypot(lab.a, lab.b);
  let h = Math.atan2(lab.b, lab.a) * 180 / Math.PI;
  if (h < 0) h += 360;
  return { L: lab.L, C, h: C < 1e-6 ? 0 : h };
}

function oklchToOklab(lch) {
  const hue = lch.h * Math.PI / 180;
  return {
    L: lch.L,
    a: Math.cos(hue) * lch.C,
    b: Math.sin(hue) * lch.C,
  };
}

function inGamut(linear) {
  return linear.every((channel) => channel >= -1e-6 && channel <= 1 + 1e-6);
}

function oklchToHex(lch) {
  let low = 0;
  let high = lch.C;
  let chosen = { ...lch, C: 0 };
  if (inGamut(oklabToLinearRgb(oklchToOklab(lch)))) {
    chosen = lch;
  } else {
    for (let i = 0; i < 24; i += 1) {
      const mid = (low + high) / 2;
      const candidate = { ...lch, C: mid };
      if (inGamut(oklabToLinearRgb(oklchToOklab(candidate)))) {
        chosen = candidate;
        low = mid;
      } else {
        high = mid;
      }
    }
  }
  const linear = oklabToLinearRgb(oklchToOklab(chosen));
  return rgbToHex(linear.map(linearToSrgb));
}

function hexToOklch(hex) {
  const rgb = parseHex(hex);
  if (!rgb) throw new Error(`${hex} is not a #RRGGBB colour`);
  return oklabToOklch(linearRgbToOklab(rgb));
}

function oklabOf(hex) {
  const lch = hexToOklch(hex);
  const hue = lch.h * Math.PI / 180;
  return { L: lch.L, a: Math.cos(hue) * lch.C, b: Math.sin(hue) * lch.C };
}

function oklabDistance(a, b) {
  const left = oklabOf(a);
  const right = oklabOf(b);
  return Math.hypot(left.L - right.L, left.a - right.a, left.b - right.b);
}

function visibleHex(color, background) {
  const rgb = resolveOn(color, background || '#000000');
  return rgb ? rgbToHex(rgb) : null;
}

function sameHex(a, b) {
  return typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase();
}

function tune(anchorHex, backgroundHex, target, lighter, chroma) {
  const background = hexToOklch(backgroundHex);
  const hue = hexToOklch(anchorHex).h;
  let low = lighter ? background.L : 0;
  let high = lighter ? 1 : background.L;
  let bestHex = oklchToHex({ L: lighter ? Math.min(1, background.L + 0.2) : Math.max(0, background.L - 0.2), C: chroma, h: hue });
  let bestGap = Infinity;
  for (let i = 0; i < 28; i += 1) {
    const L = (low + high) / 2;
    const hex = oklchToHex({ L, C: chroma, h: hue });
    const ratio = contrastRatio(hex, backgroundHex);
    const gap = Math.abs(ratio - target);
    if (gap < bestGap) {
      bestGap = gap;
      bestHex = hex;
    }
    const tooStrong = ratio > target;
    if (lighter) {
      if (tooStrong) high = L;
      else low = L;
    } else if (tooStrong) low = L;
    else high = L;
  }
  return bestHex;
}

function shiftSurface(anchorHex, deltaL) {
  const anchor = hexToOklch(anchorHex);
  return oklchToHex({
    L: Math.min(0.98, Math.max(0.04, anchor.L + deltaL)),
    C: anchor.C,
    h: anchor.h,
  });
}

function textGapCount(primary, secondary, subtle) {
  return [
    oklabDistance(primary, secondary),
    oklabDistance(primary, subtle),
    oklabDistance(secondary, subtle),
  ].filter((gap) => gap >= RULES.textGap).length;
}

function separateSubtle(palette) {
  const start = hexToOklch(palette.contentSubtle);
  if (textGapCount(palette.contentPrimary, palette.contentSecondary, palette.contentSubtle) >= RULES.textGapPairs) {
    return palette.contentSubtle;
  }
  let best = palette.contentSubtle;
  let bestCount = textGapCount(palette.contentPrimary, palette.contentSecondary, best);
  for (const direction of [1, -1]) {
    for (let step = 1; step <= 50; step += 1) {
      const L = Math.min(0.99, Math.max(0.02, start.L + direction * step * 0.012));
      const hex = oklchToHex({ L, C: start.C, h: start.h });
      const onPrimary = contrastRatio(hex, palette.bgPrimary);
      const onCard = contrastRatio(hex, palette.bgSecondary);
      if (onPrimary < RULES.subtleMin || onCard < RULES.subtleMin) continue;
      const count = textGapCount(palette.contentPrimary, palette.contentSecondary, hex);
      if (count > bestCount) {
        best = hex;
        bestCount = count;
      }
      if (count >= RULES.textGapPairs) return hex;
    }
  }
  return best;
}

function relativeLuminance(rgb) {
  const [r, g, b] = rgb.map(srgbToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground, background) {
  const fg = resolveOn(foreground, background);
  const bg = parseHex(background);
  if (!fg || !bg) return null;
  const lighter = Math.max(relativeLuminance(fg), relativeLuminance(bg));
  const darker = Math.min(relativeLuminance(fg), relativeLuminance(bg));
  return (lighter + 0.05) / (darker + 0.05);
}

function resolveOn(color, background) {
  if (parseHex(color)) return parseHex(color);
  const match = typeof color === 'string' ? color.match(RGBA) : null;
  const bg = parseHex(background);
  if (!match || !bg) return null;
  const alpha = Number(match[4]);
  const channels = [match[1], match[2], match[3]].map(Number);
  if (channels.some((channel) => channel > 255) || alpha < 0 || alpha > 1) return null;
  return channels.map((channel, index) => (channel / 255) * alpha + bg[index] * (1 - alpha));
}

function desaInputs(light, dark, ink, accent) {
  return sameHex(light, DESA.light.bgPrimary)
    && sameHex(dark, DESA.dark.bgPrimary)
    && sameHex(ink, DESA.light.contentPrimary)
    && sameHex(accent, DESA.light.contentSecondary);
}

function generatePalette({ light, dark, ink, accent, overrides = {} }) {
  for (const [label, value] of [['light', light], ['dark', dark], ['ink', ink], ['accent', accent]]) {
    if (!parseHex(value)) throw new Error(`${label} must be a #RRGGBB colour`);
  }
  const lightHex = rgbToHex(parseHex(light));
  const darkHex = rgbToHex(parseHex(dark));
  const inkHex = rgbToHex(parseHex(ink));
  const accentHex = rgbToHex(parseHex(accent));
  const palette = desaInputs(lightHex, darkHex, inkHex, accentHex)
    ? {
      pageBackground: DESA.dark.bgPrimary,
      light: { ...DESA.light },
      dark: { ...DESA.dark },
    }
    : {
      pageBackground: darkHex,
      light: {
        bgPrimary: lightHex,
        bgSecondary: shiftSurface(lightHex, -RULES.targets.bgStep),
        contentPrimary: inkHex,
        contentSecondary: accentHex,
        contentSubtle: tune(lightHex, lightHex, RULES.targets.subtleLight, false, 0.02),
        borderPrimary: tune(lightHex, lightHex, RULES.targets.borderPrimary, false, 0.035),
        borderSecondary: tune(lightHex, lightHex, RULES.targets.borderSecondary, false, 0.025),
      },
      dark: {
        bgPrimary: darkHex,
        bgSecondary: shiftSurface(darkHex, -RULES.targets.bgStep),
        contentPrimary: tune(lightHex, darkHex, RULES.targets.primary, true, 0.02),
        contentSecondary: tune(accentHex, darkHex, RULES.targets.secondary, true, 0.04),
        contentSubtle: tune(lightHex, darkHex, RULES.targets.subtleDark, true, 0.02),
        borderPrimary: tune(accentHex, darkHex, RULES.targets.borderPrimary, true, 0.04),
        borderSecondary: tune(accentHex, darkHex, RULES.targets.borderSecondary, true, 0.03),
      },
    };
  if (!desaInputs(lightHex, darkHex, inkHex, accentHex)) {
    palette.light.contentSubtle = separateSubtle(palette.light);
    palette.dark.contentSubtle = separateSubtle(palette.dark);
  }

  for (const [tokenPath, value] of Object.entries(overrides)) {
    const [theme, key] = tokenPath.split('.');
    if (theme === 'pageBackground' && key === undefined) {
      if (!parseHex(value)) throw new Error('pageBackground override must be a #RRGGBB colour');
      palette.pageBackground = rgbToHex(parseHex(value));
      continue;
    }
    if ((theme !== 'light' && theme !== 'dark') || !LIGHT_KEYS.includes(key)) {
      throw new Error(`Unknown override ${tokenPath}. Use light.bgPrimary or dark.borderPrimary.`);
    }
    if (!parseHex(value) && !RGBA.test(value)) {
      throw new Error(`${tokenPath} override must be a #RRGGBB colour or rgba()`);
    }
    palette[theme][key] = parseHex(value) ? rgbToHex(parseHex(value)) : value.replace(/\s+/g, ' ').trim();
  }
  const order = (source) => Object.fromEntries(LIGHT_KEYS.map((key) => [key, source[key]]));
  return {
    pageBackground: palette.pageBackground,
    light: order(palette.light),
    dark: order(palette.dark),
  };
}

function readArgs(argv) {
  const args = { set: {} };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) fail(`Unexpected argument ${token}`);
    const body = token.slice(2);
    const eq = body.indexOf('=');
    const key = eq === -1 ? body : body.slice(0, eq);
    const inline = eq === -1 ? undefined : body.slice(eq + 1);
    const value = inline === undefined ? argv[++i] : inline;
    if (value === undefined) fail(`Missing value for --${key}`);
    if (key === 'set') {
      const split = value.indexOf('=');
      if (split === -1) fail('--set expects light.bgSecondary=#RRGGBB');
      args.set[value.slice(0, split)] = value.slice(split + 1);
    } else {
      args[key] = value;
    }
  }
  return args;
}

function main() {
  const args = readArgs(process.argv.slice(2));
  if (!args.light || !args.dark || !args.ink || !args.accent) {
    fail('Usage: node scripts/pitch-palette.js --light #RRGGBB --dark #RRGGBB --ink #RRGGBB --accent #RRGGBB [--set light.bgSecondary=#RRGGBB]');
  }
  try {
    const palette = generatePalette({
      light: args.light,
      dark: args.dark,
      ink: args.ink,
      accent: args.accent,
      overrides: args.set,
    });
    process.stdout.write(`${JSON.stringify(palette, null, 2)}\n`);
  } catch (error) {
    fail(error.message);
  }
}

module.exports = {
  DESA,
  LIGHT_KEYS,
  RULES,
  generatePalette,
  contrastRatio,
  parseHex,
  hexToOklch,
  resolveOn,
  oklabDistance,
  visibleHex,
};

if (require.main === module) main();
