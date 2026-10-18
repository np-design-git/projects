# Client pitches

GitHub Pages publishes the `main` branch at [project.np.design](https://project.np.design/). Each client is a folder, and the folder name is the URL: [project.np.design/desa-alam/](https://project.np.design/desa-alam/).

The deck layout is frozen in `template/`. A client pitch changes copy, colors, and fonts.

## New pitch

1. Create `{slug}/pitch.json`. Copy [desa-alam/pitch.json](desa-alam/pitch.json) and replace the copy. The slug is lowercase words with hyphens, matching the folder name.
2. Set `theme.light`, `theme.dark`, `theme.pageBackground`, and the two Google Fonts (`theme.fonts.sans` and `theme.fonts.serif`).
3. Put the logo in `{slug}/assets/` and point `slides[0].logo.src` at it.
4. Build the page:

```bash
node scripts/build-pitch.js {slug}
```

5. Commit `{slug}/pitch.json`, `{slug}/assets/`, and the generated `{slug}/index.html`.
6. Push `main`. The page is live at `https://project.np.design/{slug}/` after GitHub Pages rebuilds.

`index.html` is generated. Edit `pitch.json`, then run the build again. The field contract is [template/pitch.schema.json](template/pitch.schema.json).

Slide order stays cover, overview, numbered cards, two label/value lists, process cards with a launch line, total cost, then closing. Lists and cards can grow or shrink. Spacing, type sizes, and navigation do not change per client.

This repository is public, including prices written into a pitch.
