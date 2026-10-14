# DESIGN.md

Direction chosen by the owner: **Jawa / Nusantara modern**. This file records that choice so later work stays on it.

Dial (public invitation): ENERGY 3 / RHYTHM 3 / MOTION 2
Dial (CMS admin): ENERGY 1 / RHYTHM 1 / MOTION 1, same palette and type, calmer composition.

Design Read: an Indonesian wedding invitation opened from a WhatsApp link, read mostly on a phone by family and friends of every age, in the visual language of batik sogan and Javanese printed invitations.

## Identity

- **Motif: kawung.** Four petals around a seed, one of the oldest batik patterns. It is the only ornament: section dividers, the cover and closing pattern, the active marker in the bottom nav, photo-frame corners. Nothing else decorates.
- **Shape: gunungan arch.** Couple portraits and story photos sit in a pointed arch, the silhouette of the wayang gunungan. Everything else is rectangular with small radii, like a printed card.
- **Voice:** formal Indonesian invitation register (Bapak/Ibu/Saudara/i), short sentences, no English filler labels.

## Palette

Each theme preset is named after a batik dye. The owner picks one in CMS > Tema. Tokens live in `src/styles/index.css`.

| Token | Sogan (default) | Role |
|---|---|---|
| `--paper` | `#F4ECDF` | page, like unbleached mori cloth |
| `--paper-2` | `#EADFCC` | alternate section band |
| `--card` | `#FBF7F0` | raised surfaces, inputs |
| `--ink` | `#2A1B12` | text (14.2:1 on paper) |
| `--ink-soft` | `#5E4836` | secondary text (7.3:1) |
| `--primary` | `#6E3B1E` | sogan brown, buttons and links |
| `--prada` | `#B4862E` | gold leaf, **ornament only** (2.8:1, never text on paper) |
| `--prada-ink` | `#80591A` | gold for small text on paper (5.3:1) |
| `--deep` | `#1F2338` | wedel indigo: cover, countdown, closing |

Other presets: **Wedel** (indigo primary), **Gadung** (green of gadung melati), **Jambon** (soga red). Each has its own values for the same tokens, all checked to WCAG AA.

Core colours per page: paper, primary, deep, plus one accent (prada). Status colours (hadir, tidak hadir, ragu) appear only on RSVP chips.

## Typography

- **Display: Fraunces.** A soft, high-contrast serif whose italic has the hand-drawn swing of canting-drawn lines; it carries names, headings and the large date numerals.
- **Text: Plus Jakarta Sans.** Drawn by Tokotype for Jakarta's city identity, so the body type is itself Indonesian; legible at small sizes on phones.
- No uppercase-with-wide-tracking labels; small labels are sentence case in the text face.

## Theme mode

The invitation has no light/dark toggle on purpose: its colours are the couple's chosen preset, and the dark wedel bands (cover, countdown, closing) already give the page its night tones. The CMS is a light working surface for the same reason it shares the palette.

## Motion

- Cover opens like a cloth lifted upward (one exit transition).
- Sections rise 12px into place once as they enter, to pace reading like turning invitation pages.
- Everything respects `prefers-reduced-motion`.
