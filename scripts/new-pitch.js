#!/usr/bin/env node
/**
 * Scaffold a client pitch from the eight-slide template and a generated palette.
 * Usage:
 *   node scripts/new-pitch.js <client> --light #RRGGBB --dark #RRGGBB --ink #RRGGBB --accent #RRGGBB [--set light.bgSecondary=#RRGGBB]
 */

const fs = require('fs');
const path = require('path');
const { generatePalette } = require('./pitch-palette');

const root = path.join(__dirname, '..');
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RATE = 800;
const PHASE_DAYS = [2, 3, 3];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readArgs(argv) {
  const positional = [];
  const args = { set: {} };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }
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
  args.slug = positional[0];
  if (positional.length > 1) fail('Pass a single client slug');
  return args;
}

function displayName(slug) {
  return slug.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function amount(total) {
  const digits = String(total);
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function skeleton(slug, name, palette) {
  const total = PHASE_DAYS.reduce((sum, days) => sum + days, 0);
  return {
    slug,
    title: `${name} - Website Proposal`,
    lang: 'en',
    noindex: true,
    theme: {
      pageBackground: palette.pageBackground,
      light: palette.light,
      dark: palette.dark,
      fonts: {
        sans: { family: 'Jost', google: 'wght@200;300;400', fallback: 'sans-serif' },
        serif: {
          family: 'Cormorant Garamond',
          google: 'ital,wght@0,300;0,400;0,500;0,600;1,300;1,400',
          fallback: 'serif',
        },
      },
    },
    contact: {
      name: 'Natalia Patiño',
      email: 'hello@np.design',
      site: 'https://np.design',
      siteLabel: 'np.design',
    },
    slides: [
      {
        type: 'cover',
        eyebrow: 'Design Proposal · January 2026',
        title: name.toUpperCase(),
        subtitle: ['Website project', 'Design & Build'],
      },
      {
        type: 'overview',
        label: 'Overview',
        title: `${name.toUpperCase()} Website`,
        lede: `Proposal for the design and build of the ${name} website.`,
      },
      {
        type: 'cards',
        label: 'Proposal',
        title: 'Design Objectives',
        items: [
          { title: 'First Objective', points: ['One sentence on the outcome of this objective.'] },
          { title: 'Second Objective', points: ['One sentence on the outcome of this objective.'] },
          { title: 'Third Objective', points: ['One sentence on the outcome of this objective.'] },
        ],
      },
      {
        type: 'list',
        label: 'Proposal',
        title: 'Scope of Work',
        rows: [
          { key: 'Structure', value: 'The page structure is settled for the main pages.' },
          { key: 'Visual Design', value: 'The visual language is applied across the main pages.' },
          { key: 'Build', value: 'The site is built and ready for review.' },
          { key: 'QA', value: 'Pre-launch QA' },
        ],
      },
      {
        type: 'list',
        label: 'Proposal',
        title: 'Scope Limitations',
        rows: [
          { key: 'Copy', value: 'Copy content is supplied by the client. Writing the copy is out of scope.' },
          { key: 'Translations', value: 'Translations are not included.' },
          { key: 'Pages', value: 'Secondary pages get no structural or content changes.' },
        ],
      },
      {
        type: 'process',
        label: 'Proposal',
        title: 'Design Process & Timeline',
        items: [
          {
            title: 'Concept & Structure',
            days: [`${PHASE_DAYS[0]} design days`, 'Cal week 1'],
            points: [
              'Refine and finalize storyline and structure of the main pages',
              'Wireframe-level layouts',
            ],
          },
          {
            title: 'Visual Design',
            days: [`${PHASE_DAYS[1]} design days`, 'Cal week 2/3'],
            points: [
              'High-fidelity design and visual language of the website',
              'Typography system, colour palette, UI components, spacing and layout',
              'Desktop, tablet and mobile layouts',
            ],
          },
          {
            title: 'Implementation & QA',
            days: [`${PHASE_DAYS[2]} design days`, 'Cal week 3/4'],
            points: [
              'Styles and components set up in the build tool',
              'Full build',
              'Responsive implementation (desktop, tablet, mobile)',
              'Pre-launch QA',
            ],
          },
        ],
        launch: 'Launch first week of January (assuming kick-off on January 1st).',
      },
      {
        type: 'cost',
        label: 'Proposal',
        title: 'Total Cost',
        equation: `${total} days × ${RATE} EUR`,
        amount: amount(total * RATE),
        currency: 'EUR',
        hosting: {
          label: 'Hosting',
          rows: [{ name: 'Ongoing cost', value: 'depending on the plan' }],
          disclaimer: 'Hosting stays as it is and is not part of this proposal.',
        },
      },
      {
        type: 'closing',
        eyebrow: name.toUpperCase(),
        title: 'Looking forward to hearing your thoughts.',
        subtitle: ['Please reach out if you have any questions or if anything needs adjusting.'],
      },
    ],
  };
}

function main() {
  const args = readArgs(process.argv.slice(2));
  if (!args.slug || !SLUG.test(args.slug)) {
    fail('Usage: node scripts/new-pitch.js <client> --light #RRGGBB --dark #RRGGBB --ink #RRGGBB --accent #RRGGBB [--set light.bgSecondary=#RRGGBB]');
  }
  if (!args.light || !args.dark || !args.ink || !args.accent) {
    fail('Pass --light, --dark, --ink, and --accent as #RRGGBB colours.');
  }
  const dir = path.join(root, args.slug);
  if (fs.existsSync(dir)) fail(`${args.slug}/ already exists`);
  let palette;
  try {
    palette = generatePalette({
      light: args.light,
      dark: args.dark,
      ink: args.ink,
      accent: args.accent,
      overrides: args.set,
    });
  } catch (error) {
    fail(error.message);
  }
  const name = args.name || displayName(args.slug);
  fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'pitch.json'), `${JSON.stringify(skeleton(args.slug, name, palette), null, 2)}\n`);
  process.stdout.write(`Created ${args.slug}/pitch.json\nFill the copy, add assets, then run: node scripts/build-pitch.js ${args.slug}\n`);
}

if (require.main === module) main();
