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

## Templates

Nusantara (everything above) is the default. Three more templates each carry their own palette and type, scoped under one root class so nothing leaks into the CMS or into each other. Shared dialogs (guest pass, QR, lightbox) pick up a matching token set through `<html data-theme="gulungan|bilik|cozy">` in `src/index.css`.

| Template | Palette | Type | Signature |
|---|---|---|---|
| Gulungan Kenangan (`.gk`) | film grey `#34352F`, cream `#F3ECC9`, stamp red `#C8453A`, amber `#FF9A4A` | EB Garamond, Pinyon Script, VT323 | Scrolling unrolls the love story out of a film roll into a projector window, ticket stubs per event, film-leader countdown, contact sheet, end credits that roll up. |
| Bilik Foto (`.bf`) | dotted paper wall `#EFE8DC`, ink `#221D1A`, booth red `#B42A2F`, lamp `#FFCF3A` | Fraunces, Instrument Sans, Courier Prime, DotGothic16, Reenie Beanie | A booth slot prints the couple's strip, letterboard schedule, LCD countdown, receipt for the venue, wishes printed as strips. |
| Cozy Home (`.ch`) | mint sky `#AFD9D5`, paper `#FFFDF0`, wood grain, pink `#E3928A`, leaf `#587957` | Nunito (rounded) | One screen: a cottage scene, wooden masthead, signposts and a dock that open wood-framed panels, a letter that types itself. |

Rules every template keeps: the film-edge or watermark text is the couple's initials or names, never a product name; photos always come from the couple's own data; addresses and the digital envelope stay behind the guest code; motion respects `prefers-reduced-motion`. The original 3D walking world of Cozy Home is drawn as a still 2D scene without a joystick, because a joystick with nothing to walk around would be a dead control.

Gulungan Kenangan motion, in order of scroll: the page waits at 0.88 scale behind the ticket and settles to full size when opened; the reel section is 4.2 screens tall with a sticky stage, and `useReelScroll` writes scroll progress as CSS variables (`--p`, `--o`, `--lift`, `--fade`, `--spin`) so the names lift and fade, the roll thins and turns, and the film slides down through a masked window; every `.gk-rv` element rises 22px into place once; the credits roll up over 26 seconds. Background blobs drift and film grain flickers throughout. All of it is dropped for `prefers-reduced-motion`, which shows the same content laid out still.
