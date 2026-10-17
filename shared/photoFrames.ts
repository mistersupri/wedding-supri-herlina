/**
 * Photo Moments frame overlays. Pure string builders (no DOM), so the server
 * can seed the default frame with the same markup the CMS offers.
 * Every frame is an 800x1000 SVG drawn over the guest's photo.
 */

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

const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">${body}</svg>`;

function kawungPrada(names: string) {
  const gold = '#C9A253';
  const corners = [
    [70, 70],
    [730, 70],
    [70, 930],
    [730, 930],
  ]
    .map(([x, y]) => kawung(x, y, 70, gold, '#2B1A10'))
    .join('');
  return svg(
    `<rect x="24" y="24" width="752" height="952" fill="none" stroke="${gold}" stroke-width="3"/>` +
      `<rect x="36" y="36" width="728" height="928" fill="none" stroke="${gold}" stroke-width="1"/>` +
      corners +
      `<rect x="190" y="880" width="420" height="62" fill="#2B1A10" opacity="0.86"/>` +
      `<text x="400" y="921" font-family="Georgia, serif" font-size="28" font-style="italic" fill="#F3EADB" text-anchor="middle">${names}</text>`,
  );
}

function sogan(names: string) {
  const stripes = Array.from({ length: 22 }, (_, i) => {
    const x = i * 40 - 40;
    return `<path d="M${x} 1000 L${x + 60} 900" stroke="#B88A3B" stroke-width="6" opacity="0.55"/>`;
  }).join('');
  return svg(
    `<rect x="0" y="900" width="800" height="100" fill="#4A2A15"/>` +
      stripes +
      `<rect x="0" y="896" width="800" height="4" fill="#B88A3B"/>` +
      `<rect x="200" y="918" width="400" height="56" fill="#4A2A15"/>` +
      `<text x="400" y="955" font-family="Georgia, serif" font-size="26" fill="#F3EADB" text-anchor="middle">${names}</text>`,
  );
}

function mori(names: string) {
  return svg(
    `<path d="M0 0 H800 V1000 H0 Z M40 40 V820 H760 V40 Z" fill="#F3EADB" fill-rule="evenodd"/>` +
      kawung(400, 870, 46, '#B88A3B', '#2B1A10') +
      `<text x="400" y="950" font-family="Georgia, serif" font-size="34" font-style="italic" fill="#2B1A10" text-anchor="middle">${names}</text>`,
  );
}

function garisTipis(names: string) {
  return svg(
    `<rect x="30" y="30" width="740" height="940" fill="none" stroke="#FFFFFF" stroke-width="4"/>` +
      `<rect x="44" y="44" width="712" height="912" fill="none" stroke="#FFFFFF" stroke-width="1" opacity="0.8"/>` +
      `<text x="400" y="940" font-family="Georgia, serif" font-size="24" fill="#FFFFFF" text-anchor="middle">${names}</text>`,
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
