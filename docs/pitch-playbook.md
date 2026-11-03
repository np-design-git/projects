# Pitch playbook

One folder per client is published from `main` to `https://project.np.design/{slug}/`. Layout, spacing, type sizes, and navigation live in `template/` and stay frozen. A pitch changes copy, colours, fonts, and assets.

`desa-alam/pitch.json` is the reference deck for tone and for the colour steps. `ocumeda/pitch.json` is the second worked example, including the short overview and the English page names.

## Start from the template

Copy an existing deck's `pitch.json` shape, or generate a skeleton:

```bash
node scripts/new-pitch.js <client> --light #RRGGBB --dark #RRGGBB --ink #RRGGBB --accent #RRGGBB
```

Then edit `{slug}/pitch.json` and files in `{slug}/assets/` only. Rebuild with `node scripts/build-pitch.js {slug}`. The built `{slug}/index.html` is generated. Hand-editing it is overwritten on the next build.

Check the copy and the palette before rebuilding:

```bash
node scripts/check-pitch.js {slug}
```

Commit `{slug}/pitch.json`, `{slug}/assets/`, and the generated `{slug}/index.html`, and push `main`, only when asked to publish. Change `template/` only when the deck system itself is the task. The field contract is `template/pitch.schema.json`.

Optional `password` adds a visual gate. The check runs in the browser, so the password is visible in the page source. Optional `noindex: true` adds a noindex tag. Omit both to leave a deck open and indexable. The scaffold sets `noindex: true` until the deck is ready. Gate copy defaults to English: Password, Open, Incorrect password.

## Eight slides

The order is fixed: cover, overview, cards, list, list, process, cost, closing. Rows and cards inside a slide can be longer or shorter. Each slide has its own job, so a sentence written for one slide is not repeated on the next.

1. **Cover.** The client, the kind of project, and the month and year. The eyebrow is `Design Proposal · Month YYYY`. The date is the month and year only. Subtitle lines are short. A label line uses `&`.

   Ocumeda: `Design Proposal · November 2026`, then `Website redesign based on the new CI` and `Design & Framer Implementation`.

   Desa Alam: `Design Proposal · May 2026`, then `Investor-facing website` and `Design & Webflow Development`.

2. **Overview.** A short, direct introduction of what this proposal is. No dates, no day counts, and no restatement of the objectives.

   Ocumeda: `Proposal for the design and Framer implementation of Ocumeda's website redesign.`

   New decks follow that length. Desa Alam's overview is the longer early version and stays as published.

3. **Design Objectives.** Three numbered points. Each card is the outcome, in one or two sentences, from the client's point of view. It is not a task list.

   Ocumeda: `Applying the new CI makes the website fresh, warm and human, without feeling clinical.`

4. **Scope of Work.** Outcome-led rows. The label says the area. The sentence says what will exist when the work is done. Labels stay on one line. Set `keyWidth` wide enough for the longest label so every row is the same height and every value starts at the same x. Ocumeda uses `"keyWidth": "15rem"` for `Style Guide & UI Library`.

   Ocumeda: `The new CI is applied across the whole website, through a style guide and UI library.`

5. **Scope Limitations.** The dark slide. Each row says what is out, and the boundary when something still reaches those pages. It does not repeat the scope sentences.

   Ocumeda, row `Secondary Pages`: `Team, Career and News get no structural or content changes. The new CI still reaches them through the components and style guide.`

   Ocumeda, row `Copy`: `Copy content is supplied by Ocumeda. Writing the copy is out of scope.`

   Desa Alam, row `Content`: `Final copy, photography, and renders provided by the client. I advise on structure and content needs, and support with AI-generated imagery and copy drafts as needed.`

   Desa Alam, row `Domain`: `The client is responsible for purchasing their own domain.`

6. **Design Process & Timeline.** Three phases, in this order: `Concept & Structure`, `Visual Design`, `Implementation & QA`. Each phase has two day lines: `N design days` and `Cal week N`. A phase that runs across two calendar weeks is written `Cal week 47/48`. Weeks run Monday to Sunday. There is no date range such as a start day and an end day. The footnote is `Launch <nth> week of <Month> (assuming kick-off on <Month> <Nth>).`

   Ocumeda days: `2 design days` / `Cal week 46`, `3 design days` / `Cal week 47/48`, `3 design days` / `Cal week 48/49`.

   Ocumeda footnote: `Launch second week of December (assuming kick-off on November 9th).`

   Desa Alam footnote: `Launch first week of July 2026 (assuming kick-off on June 1st)`

   Desa Alam names the tool in the third phase, `Webflow Build & Launch`. New decks use `Implementation & QA`.

7. **Total Cost.** The equation is `N days × RATE EUR`. `N` is the sum of the phase day counts. The amount uses a thousands dot (`6.400`, `8.000`). An optional hosting block has a label, one or more rows, and a footnote.

   Ocumeda: `8 days × 800 EUR`, amount `6.400`. Hosting footnote: `Framer hosting stays as it is and is not part of this proposal.`

   Desa Alam: `10 days × 800 EUR`, amount `8.000`. Hosting footnote: `Indicative costs for orientation. Final hosting will depend on the site's actual needs.`

8. **Closing.** The invitation to reply. Both decks use `Looking forward to hearing your thoughts.` and `Please reach out if you have any questions or if anything needs adjusting.`

When feedback changes a name or a claim on one slide, the same words are updated everywhere they appear. Ocumeda's secondary pages are `Team, Career and News` on the limitations row, and the main pages are `Home, Doctors, Opticians and Customers` on the scope row. Client page names are written in English only.

## Tone

Write in English unless the brief says otherwise. The voice is warm and direct, the way Desa Alam speaks: short statements, concrete outcomes, and the client's name where it helps.

Use first person or neutral wording. Desa Alam's content row says `I advise on structure and content needs`. The designer's name stays in `contact` and is printed by the template in the cover meta. It is not written into the slide sentences.

Use `&` in titles, labels, and phase titles. Use `and` in sentences and bullets.

- Titles: `Design Process & Timeline`, `Concept & Structure`, `Implementation & QA`, `Style Guide & UI Library`, `Content & Structure`, `Design & Framer Implementation`, `Webflow Build & Launch`.
- Sentences: `spacing and layout`, `Desktop, tablet and mobile layouts`, `Team, Career and News`.

A proper name in logo alt text can keep its own `&`, as in Desa Alam's `Desa Alam Hotel & Resort`. That alt text is not a sentence.

Do not mention calls. The cover date is the month and year only.

These words stay out of the deck: minimal, clearer, CI review, existing, restyling, precise, ever, maintainable. `clear` is fine. `every` and `never` are fine. The check looks for whole words, so `clear` does not match `clearer`.

## Reusable lines

Phase work, quoted from the decks:

- Concept, Ocumeda: `Refine and finalize storyline and structure of the main pages` and `Wireframe-level layouts`.
- Concept, Desa Alam: `Information architecture and page structure for all pages` and `Content briefing: defining what copy, imagery, and assets are needed per page`.
- Visual design, both decks: `High-fidelity design and visual language of the website` and `Desktop, tablet and mobile layouts`.
- Visual design, Ocumeda: `Typography system, colour palette, UI components, spacing and layout (built on the new CI)`.
- Visual design, Desa Alam: `Typography system, colour palette, UI components, spacing and layout (built on CI, logo and brand colours provided by client)`.
- Implementation, Ocumeda: `Styles and components set up in Framer`, `Full build in Framer`, `Responsive implementation (desktop, tablet, mobile)`, `Pre-launch QA`.
- Implementation, Desa Alam: `Full build in Webflow`, `Pre-launch QA`, `Domain connection`.

`Pre-launch QA` is also the Ocumeda scope row whose label is `QA`.

## Colour

Tokens live in `theme.light` and `theme.dark`. `theme.pageBackground` is the colour behind the slides. The password gate uses the dark theme. Cover, Scope Limitations, and Closing are dark unless a slide sets `"theme": "light"`. Ocumeda's cover and closing do that.

The nav pill is not a client token. It uses the fixed white and black in `template/deck.css`.

| Token | Role | Where it is used |
| --- | --- | --- |
| `bgPrimary` | Slide surface | Slide background. Gate background. |
| `bgSecondary` | Raised surface | Objective cards and process cards. |
| `contentPrimary` | Titles | Cover title, slide titles, overview lede, row labels, card titles, the total, hosting row name and value, gate input and button. |
| `contentSecondary` | Labels and subtitles | Cover eyebrow and subtitle, section labels, row values, card bullets, gate label. |
| `contentSubtle` | Meta | Cover contact lines, card numbers, phase day lines, the cost equation and currency, the hosting label and footnote, the launch footnote. |
| `borderPrimary` | Strong line | Cover rule, overview rule, card divider, card bullet, the cost column rule, the gate underline. |
| `borderSecondary` | Quiet line | List row rules, the rule above the launch footnote. |

A slide may set `background` to a theme base: `light.bgPrimary`, `dark.bgPrimary`, or `pageBackground`. Ocumeda's cover and closing use `#EAF5FF`, which is `light.bgPrimary`, under a full-bleed image. Per-slide `contentSecondary` or `contentSubtle` overrides are outside the system. Hex colours in the copy are outside the system. `rgba()` belongs in the theme when a line needs opacity, as with Ocumeda's dark `borderPrimary`.

### Role ranges

Each text role is checked against both `bgPrimary` and `bgSecondary`. The range belongs to the role. Desa Alam's measured ratios are the reference example below, not the target.

| Role | Contrast on both backgrounds | Why this range |
| --- | --- | --- |
| `contentPrimary` | at least 7:1, no cap | Titles stay strong. The quietest title in the two decks is Ocumeda's Coal on Fog, 9.99:1. |
| `contentSecondary` | 4.5:1 to 9:1 | Labels stay readable and do not turn into a second title. The decks run from 5.90:1 (Ocumeda dark on Coal) to 8.17:1 (Ocumeda light on Not White). |
| `contentSubtle` | at least 3:1, no cap | Meta can sit under the labels or above them. Desa Alam's light meta is 3.07:1 and 3.57:1, under the green. Its dark meta is 8.70:1 and 11.17:1, above the sand. |

### Tones have to stay apart

Primary, secondary, and subtle are compared in OKLab. At least two of the three pairs must be at least **0.08** apart. One just-noticeable step is about 0.02, so 0.08 is a clearly different tone. The rule is on the set, not on every pair: a title and a meta line may both be pale when the label is the tone that separates them.

The old Ocumeda dark text, `#FAFBF9` / `#EAF5FF` / `#F5F8FE`, measures 0.029, 0.014, and 0.017. No pair clears 0.08, so those three near-whites are one tone. The current dark text keeps `#FAFBF9` and `#F5F8FE` (0.014) and puts the label at `#A9BDF0` (0.201 and 0.190). Two pairs clear 0.08. `node scripts/check-pitch.js --self-test` prints that comparison.

### Surfaces and lines

`bgSecondary` must be at least **0.02** OKLab away from `bgPrimary`. A card is a large field, so one visible step is enough. Ocumeda's Fog and Not White are 0.029 apart. The text-role gap of 0.08 would reject that pair, which is why surfaces use the smaller step.

A border is measured after `rgba()` is composited onto the background. Each border needs at least **1.2:1** on both backgrounds. The quietest line in the decks is Desa Alam's light `borderSecondary` on the card, 1.25:1. Ocumeda's blue at 25% opacity is 1.30:1 on Coal.

`borderSecondary` should be the quieter line. It may measure up to **0.4:1** stronger than `borderPrimary`, and no more. The slack is there because Ocumeda's solid dark line `#414E70` is 1.72:1 on the card while the 25% blue line is 1.37:1. A gap larger than 0.4:1 warns.

### Desa Alam, as an example

Light base `#F5F0E6`, dark base `#2D3B2A`, ink `#1E1C1A`, accent `#3D4F38`. These values illustrate the ranges. They are not the numbers a new deck has to hit.

| Pair | Light | Dark |
| --- | --- | --- |
| `contentPrimary` on `bgPrimary` | 14.96:1 | 10.44:1 |
| `contentPrimary` on `bgSecondary` | 12.86:1 | 13.40:1 |
| `contentSecondary` on `bgPrimary` | 7.79:1 | 6.09:1 |
| `contentSecondary` on `bgSecondary` | 6.70:1 | 7.81:1 |
| `contentSubtle` on `bgPrimary` | 3.57:1 | 8.70:1 |
| `contentSubtle` on `bgSecondary` | 3.07:1 | 11.17:1 |

OKLab lightness for the same palette: light page 0.956 and card 0.907; dark page 0.334 and card 0.264; light ink 0.228, accent 0.405, meta 0.595; dark title 0.956, label 0.788, meta 0.894. The dark title and meta are 0.065 apart, and the other two text gaps are 0.171 and 0.111, so the set still passes.

### Ocumeda mapping

The same roles, with Ocumeda's brand colours. Fog `#EAF5FF` is the light base and the cover background. Not White `#FAFBF9` is the card surface and the dark title colour. Coal `#333D48` is the ink, the dark base, and the page background. Blue `#5078FF` is the accent family. The dark strong line is that blue at 25% opacity, `rgba(80, 120, 255, 0.25)`, because a solid blue line was too strong on Coal.

| Token | Light | Dark |
| --- | --- | --- |
| `bgPrimary` | `#EAF5FF` Fog | `#333D48` Coal |
| `bgSecondary` | `#FAFBF9` Not White | `#242B3C` |
| `contentPrimary` | `#333D48` Coal | `#FAFBF9` Not White |
| `contentSecondary` | `#3A4C76` | `#A9BDF0` |
| `contentSubtle` | `#7080A0` | `#F5F8FE` |
| `borderPrimary` | `#A2BAFF` | `rgba(80, 120, 255, 0.25)` |
| `borderSecondary` | `#B7CCFF` | `#414E70` |

Ocumeda's cards are lighter than the page. Desa Alam's cards are darker than the page. Both pass the surface rule. Both pass the text ranges above.

`node scripts/pitch-palette.js` takes the four brand colours and optional `--set theme.token=#RRGGBB` overrides. Ink and accent are kept. Passing Desa Alam's four colours reproduces that palette exactly, including every derived token.

For any other inputs the derived tones aim at the middle of the ranges, not at Desa Alam's ratios. Dark title, label, and meta aim at 10:1, 6.75:1, and 8:1. Light meta aims at 4.5:1, the middle of a quiet 3:1 to 6:1 band under a secondary label. Borders aim at 1.7:1 and 1.4:1. The card steps 0.04 in OKLab lightness away from the page, between the 0.02 minimum and Desa Alam's larger step. If those midpoints would still collapse the three text tones, meta moves along its lightness until two OKLab gaps reach 0.08, staying at or above 3:1. An override replaces one token after that and does not rebuild the others.

```bash
node scripts/pitch-palette.js --light #F5F0E6 --dark #2D3B2A --ink #1E1C1A --accent #3D4F38
node scripts/pitch-palette.js --light #EAF5FF --dark #333D48 --ink #333D48 --accent #3A4C76 --set light.bgSecondary=#FAFBF9
```

## Check

`node scripts/check-pitch.js` reads every `pitch.json`, or the slugs you pass. It prints the contrast ratios and checks:

- each text role against both backgrounds, inside the role range above
- text roles at least 0.08 OKLab apart on two of the three pairs
- `bgSecondary` at least 0.02 OKLab from `bgPrimary`
- borders at least 1.2:1, with `borderSecondary` no more than 0.4:1 stronger than `borderPrimary`
- per-slide colour overrides and hex colours outside `theme`, with cover and closing backgrounds allowed when they match a theme base
- the banned words, including calls
- `&` in titles and labels, and `and` in sentences and bullets
- a month-and-year cover date
- phase lines in the form `N design days` and `Cal week N`
- a launch footnote in the form above
- a cost equation whose day count is the sum of the phases, and an amount equal to days times the rate

Warnings are printed and the command still exits 0. A missing or unreadable `pitch.json` exits 1. The check does not edit the deck. `node scripts/check-pitch.js --self-test` checks the old Ocumeda dark text, the current dark text, and Desa Alam's exact reproduction. That command exits 1 when one of those assertions fails.

## Scaffold

`node scripts/new-pitch.js <client>` writes `<client>/pitch.json` and an empty `assets/` folder. The slug is lowercase words with hyphens. The command refuses to overwrite an existing folder. The skeleton has the eight slides, placeholder copy that already follows the title and sentence rules, a palette from the colours you pass, and the studio contact. Replace the Jost and Cormorant Garamond pair when the client has its own fonts. Self-hosted faces use `theme.fonts.*.files`, as Ocumeda does for TT Commons Pro. Add the logo under `assets/` and set `slides[0].logo`. Then build.

## QA checklist

Review the built deck in the browser at 1920×1080, 1440×900, 1280×800, 1024×768, 768×1024, 1024×1366, 390×844, and 360×740.

- The password gate accepts the password and shows the English label, button, and error.
- Print to PDF is 8 pages and nothing is clipped. The template page size is 1280×832.
- Footnotes sit clear of the nav.
- There is no horizontal scroll.
- `node scripts/check-pitch.js {slug}` reports the banned-word scan, the contrast ratios, and the cost check.
