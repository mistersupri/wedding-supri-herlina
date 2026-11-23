/**
 * Photo Moments frame overlays. Pure string builders (no DOM), so the server
 * can seed the default frame with the same markup the CMS offers.
 * Every frame is a 1080x1920 SVG (9:16), the size of an Instagram Story, drawn over the guest's photo.
 *
 * Instagram covers the top and bottom of a Story with its own interface (profile name above, the reply bar
 * below), so names and other text stay inside the safe area; only decoration reaches the edges.
 */

export const FRAME_WIDTH = 1080;
export const FRAME_HEIGHT = 1920;
/** Pixels at the top and bottom of a 1080x1920 Story that Instagram's interface can cover. */
export const STORY_SAFE = { top: 250, bottom: 340 } as const;
/** Lowest baseline for text on a frame. */
export const SAFE_TEXT_BOTTOM = FRAME_HEIGHT - STORY_SAFE.bottom;

export interface FramePreset {
  id: string;
  name: string;
  description: string;
  dataUrl: string;
}

const escapeXml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const toDataUrl = (svg: string) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

/** One kawung unit: four petals around a centre seed, the motif used across the invitation. */
function kawung(cx: number, cy: number, size: number, fill: string, seed: string) {
  const rx = size * 0.15;
  const ry = size * 0.175;
  const d = size * 0.24;
  const petals = [45, 135, 225, 315]
    .map((deg) => {
      const rad = (deg * Math.PI) / 180;
      const x = cx + Math.cos(rad) * d;
      const y = cy + Math.sin(rad) * d;
      return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx}" ry="${ry}" transform="rotate(${deg + 90} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${fill}"/>`;
    })
    .join('');
  return `${petals}<circle cx="${cx}" cy="${cy}" r="${size * 0.05}" fill="${seed}"/>`;
}

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FRAME_WIDTH} ${FRAME_HEIGHT}" width="${FRAME_WIDTH}" height="${FRAME_HEIGHT}">${body}</svg>`;

/** Baseline for the name line on the frames that carry one: above the area Instagram covers. */
const NAME_Y = SAFE_TEXT_BOTTOM - 70;

function kawungPrada(names: string) {
  const gold = '#C9A253';
  const corners = [
    [110, 110],
    [970, 110],
    [110, 1810],
    [970, 1810],
  ]
    .map(([x, y]) => kawung(x, y, 96, gold, '#2B1A10'))
    .join('');
  return svg(
    `<rect x="32" y="32" width="1016" height="1856" fill="none" stroke="${gold}" stroke-width="4"/>` +
      `<rect x="48" y="48" width="984" height="1824" fill="none" stroke="${gold}" stroke-width="1.5"/>` +
      corners +
      `<rect x="250" y="${NAME_Y - 62}" width="580" height="88" fill="#2B1A10" opacity="0.86"/>` +
      `<text x="540" y="${NAME_Y}" font-family="Georgia, serif" font-size="38" font-style="italic" fill="#F3EADB" text-anchor="middle">${names}</text>`,
  );
}

function sogan(names: string) {
  const top = Math.round(NAME_Y - 120);
  const stripes = Array.from({ length: 28 }, (_, i) => {
    const x = i * 44 - 44;
    return `<path d="M${x} ${top + 110} L${x + 70} ${top + 10}" stroke="#B88A3B" stroke-width="7" opacity="0.55"/>`;
  }).join('');
  return svg(
    `<rect x="0" y="0" width="1080" height="26" fill="#4A2A15"/>` +
      `<rect x="0" y="${top}" width="1080" height="130" fill="#4A2A15"/>` +
      stripes +
      `<rect x="0" y="${top - 4}" width="1080" height="5" fill="#B88A3B"/>` +
      `<rect x="250" y="${NAME_Y - 52}" width="580" height="78" fill="#4A2A15"/>` +
      `<text x="540" y="${NAME_Y}" font-family="Georgia, serif" font-size="34" fill="#F3EADB" text-anchor="middle">${names}</text>`,
  );
}

function mori(names: string) {
  // The photo shows through a window; the cream border is widest at the bottom, where the name sits just above the covered area.
  const windowBottom = NAME_Y - 190;
  return svg(
    `<path d="M0 0 H1080 V1920 H0 Z M52 52 V${windowBottom} H1028 V52 Z" fill="#F3EADB" fill-rule="evenodd"/>` +
      kawung(540, windowBottom + 78, 60, '#B88A3B', '#2B1A10') +
      `<text x="540" y="${NAME_Y}" font-family="Georgia, serif" font-size="44" font-style="italic" fill="#2B1A10" text-anchor="middle">${names}</text>`,
  );
}

function garisTipis(names: string) {
  return svg(
    `<rect x="40" y="40" width="1000" height="1840" fill="none" stroke="#FFFFFF" stroke-width="5"/>` +
      `<rect x="58" y="58" width="964" height="1804" fill="none" stroke="#FFFFFF" stroke-width="1.5" opacity="0.8"/>` +
      `<rect x="290" y="${NAME_Y - 50}" width="500" height="72" rx="36" fill="#000000" opacity="0.34"/>` +
      `<text x="540" y="${NAME_Y}" font-family="Georgia, serif" font-size="32" fill="#FFFFFF" text-anchor="middle">${names}</text>`,
  );
}

export function buildFramePresets(groomShortName: string, brideShortName: string): FramePreset[] {
  const names = escapeXml(`${groomShortName} & ${brideShortName}`);
  return [
    {
      id: 'kawung_prada',
      name: 'Kawung Prada',
      description: 'Garis emas ganda dengan motif kawung di keempat sudut dan papan nama di bawah.',
      dataUrl: toDataUrl(kawungPrada(names)),
    },
    {
      id: 'sogan',
      name: 'Pita Sogan',
      description: 'Pita cokelat sogan bergaris miring di tepi bawah, foto tetap lapang.',
      dataUrl: toDataUrl(sogan(names)),
    },
    {
      id: 'mori',
      name: 'Kertas Mori',
      description: 'Bingkai ala foto cetak dengan tepi krem lebar dan nama di bawah.',
      dataUrl: toDataUrl(mori(names)),
    },
    {
      id: 'garis_tipis',
      name: 'Garis Tipis',
      description: 'Garis putih ganda yang tipis, paling sedikit menutupi foto.',
      dataUrl: toDataUrl(garisTipis(names)),
    },
  ];
}
