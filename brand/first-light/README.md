# Court Trips — First Light

The approved destination emblem, paired with the existing outlined Court Trips wordmark. This is the current asset kit; the older rounds remain under `brand/explorations/`.

## Choose a logo

| Folder | Use |
| --- | --- |
| `logos/horizontal/` | Website headers, email signatures, partner listings, wide spaces. |
| `logos/stacked/` | Covers, square layouts, signs and layouts with the wordmark below the emblem. |
| `logos/emblem/` | Standalone brand mark, avatars and places where the name already appears nearby. |
| `logos/wordmark/` | Compact navigation and places where the established wordmark works on its own. |

Each folder has five SVG and transparent PNG variants:

- `primary`: blue court, green horizon, lime ball/sun; approved two-colour wordmark.
- `reversed`: white emblem with lime ball/sun; lime-and-white wordmark, for dark surfaces.
- `ink`: one colour, `#16233a`.
- `black`: pure black, for single-colour production.
- `white`: pure white, for dark backgrounds and single-colour production.

SVG is the scalable master. The horizontal and wordmark PNGs are 1600 px wide; stacked and emblem PNGs are 1024 px square. All logo PNGs have transparent backgrounds, including the seam and court lines.

Use the existing proportions. Keep at least one wordmark-ball diameter of clear space around a lockup. At small sizes, use the wordmark alone or the separately drawn favicon rather than squeezing the detailed emblem into a tiny space. A practical starting minimum is 200 px wide for the horizontal logo, 140 px for the stacked logo, and 64 px for the standalone emblem.

## Favicons

- `favicons/favicon.svg`: adaptive light/dark SVG.
- `favicons/favicon-light.svg`, `favicon-dark.svg`: fixed variants.
- `favicon-light-16.png` through `favicon-light-128.png`, with matching dark exports; sizes 16, 24, 32, 48, 64 and 128.
- `favicons/favicon.ico` and `favicon-dark.ico`: 16, 32 and 48 px images in each file.
- `favicons/safari-pinned-tab.svg`: one-colour pinned-tab artwork; use `#16233a` for its colour.

The favicon has a larger sun and simpler court drawing. It is an optical adaptation of the emblem, rather than a miniature of the full illustration.

## App icons

`app-icons/` contains paper, white, ink and green variants. SVG masters have a full-bleed square background; exported PNGs are 1024, 512, 192 and 180 px square. Let the platform apply its own corner mask.

- `apple-touch-icon.png`: the paper version at 180 px.
- `icon-192.png`, `icon-512.png`: default paper icons.
- `icon-maskable-192.png`, `icon-maskable-512.png`: extra inset for Android masks.
- `site.webmanifest`: a starter manifest with local, relative icon references. Copy it together with those PNGs when integrating it.

The site is not modified by this kit. Its current Next.js icon routes still need to be connected to these exports when the website update is made.

## The illustration

Keep the detailed illustration as a recurring editorial asset. It gives the brand a sense of place, while the small emblem handles everyday identification.

Start with these uses:

1. **About / brand introduction:** a large illustration beside a short explanation of Court Trips. On the home page it can also support an introduction below the existing trip-search hero.
2. **Newsletter welcome:** one generous image at the top of the welcome message or a seasonal editorial note. The 640 px JPEG or PNG is suitable for email; the WebP exports are for the website.
3. **Travel guides and social covers:** pair the illustration with the wordmark and the guide title. Ready-made landscape and square brand covers are in `social/`.

Give the whole scene room, keep it in its original proportions, and put copy beside or below it. The pale paper background is part of the original artwork. Keep trip cards and venue pages grounded in the real destination photographs. Reserve the illustration for the Court Trips story and editorial material so it remains special.

### Background correction

The original image has a textured peach-cream background (approximately `#fcf1e0`), which differs from the brand's `#faf8f1` warm paper. Use the **transparent** illustration on website sections so their own background shows through, including the negative spaces inside the artwork. The original and its earlier exports remain available for reference.

- Website: `illustrations/court-trips-editorial-transparent.webp` or the `-transparent-640.webp` version for a smaller placement.
- Transparent PNG fallback: `illustrations/court-trips-editorial-transparent.png`.
- Email / fixed warm-paper background: `illustrations/court-trips-editorial-warm-paper-640.png`, flattened onto `#faf8f1`.
- Full-size opaque version: `illustrations/court-trips-editorial-warm-paper.png` or `.webp`.

Display the transparent file normally on a `#faf8f1` section. No blend mode, opacity adjustment or CSS colour filter is needed. These are new files; the original illustration is preserved. The alpha master was made using a background-extraction edit with the built-in image generation tool; its prompt is saved in `source/background-extraction.json`.

### Illustration exports

| File | Intended use |
| --- | --- |
| `illustrations/court-trips-editorial-original.png` | Original 1254 × 1254 artwork, preserved unchanged. |
| `illustrations/court-trips-editorial.webp` | Original opaque cream-background export. |
| `illustrations/court-trips-editorial-640.webp` | Smaller original opaque export. |
| `illustrations/court-trips-editorial-640.jpg` | Original cream-background newsletter export. |
| `illustrations/court-trips-editorial-640.png` | Original cream-background fallback. |

`previews/illustration-uses.png` shows the three suggested layouts. The copy and layouts are examples, not changes to the live website.

## Palette and source

Court blue `#2d5d8c`; garden green `#3a6e52`; ball/sun `#dcf343`; ink `#16233a`; warm paper `#faf8f1`. Machine-readable values are in `palette.json`.

`source/` preserves the approved emblem, outlined wordmarks, optical favicon masters and generation notes. The illustration was explored with the built-in image generation tool; the logo was redrawn as SVG. The existing wordmark's shapes are retained. Reversed and single-colour variants change colours only.

To regenerate exports from the repository root:

```sh
python3 brand/build_first_light.py
node brand/render_first_light.cjs
```

The renderer uses the existing `web/node_modules/sharp` dependency. `asset-manifest.json` records file dimensions and hashes for this delivery.
