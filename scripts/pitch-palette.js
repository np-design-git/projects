#!/usr/bin/env node
/**
 * Build a light and dark pitch palette from a few brand colours.
 *
 * The derived tokens follow Desa Alam's OKLab lightness and chroma steps.
 * Text roles that are inputs (ink, accent) are kept as given. Dark text and
 * dark borders reuse the light surfaces and the accent, the way Desa Alam does.
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
const DERIVED_LIGHT = ['bgSecondary', 'contentSubtle', 'borderPrimary', 'borderSecondary'];

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

function hueDelta(from, to) {
  let delta = to - from;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}

function stepBetween(anchorHex, targetHex) {
  const anchor = hexToOklch(anchorHex);
  const target = hexToOklch(targetHex);
  return {
    dL: target.L - anchor.L,
    dC: target.C - anchor.C,
    dh: hueDelta(anchor.h, target.h),
  };
}

const LIGHT_STEPS = Object.fromEntries(DERIVED_LIGHT.map((key) => [
  key,
  stepBetween(DESA.light.bgPrimary, DESA.light[key]),
]));
const DARK_SURFACE_STEP = stepBetween(DESA.dark.bgPrimary, DESA.dark.bgSecondary);
const DARK_SUBTLE_STEP = stepBetween(DESA.dark.bgPrimary, DESA.dark.contentSubtle);

function applyStep(anchorHex, step) {
  const anchor = hexToOklch(anchorHex);
  let h = anchor.h + step.dh;
  h = ((h % 360) + 360) % 360;
  return oklchToHex({
    L: Math.min(1, Math.max(0, anchor.L + step.dL)),
    C: Math.max(0, anchor.C + step.dC),
    h,
  });
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

function generatePalette({ light, dark, ink, accent, overrides = {} }) {
  for (const [label, value] of [['light', light], ['dark', dark], ['ink', ink], ['accent', accent]]) {
    if (!parseHex(value)) throw new Error(`${label} must be a #RRGGBB colour`);
  }
  const palette = {
    pageBackground: rgbToHex(parseHex(dark)),
    light: {
      bgPrimary: rgbToHex(parseHex(light)),
      contentPrimary: rgbToHex(parseHex(ink)),
      contentSecondary: rgbToHex(parseHex(accent)),
    },
    dark: {
      bgPrimary: rgbToHex(parseHex(dark)),
    },
  };
  for (const key of DERIVED_LIGHT) {
    palette.light[key] = applyStep(palette.light.bgPrimary, LIGHT_STEPS[key]);
  }
  palette.dark.bgSecondary = applyStep(palette.dark.bgPrimary, DARK_SURFACE_STEP);
  palette.dark.contentSubtle = applyStep(palette.dark.bgPrimary, DARK_SUBTLE_STEP);
  palette.dark.contentPrimary = palette.light.bgPrimary;
  palette.dark.contentSecondary = palette.light.borderPrimary;
  palette.dark.borderPrimary = palette.light.borderPrimary;
  palette.dark.borderSecondary = palette.light.contentSecondary;

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
  generatePalette,
  contrastRatio,
  parseHex,
  hexToOklch,
  resolveOn,
};

if (require.main === module) main();
