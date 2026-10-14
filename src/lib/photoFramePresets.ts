export interface FramePresetOption {
  id: string;
  name: string;
  description: string;
  svgContent: string;
  dataUrl: string;
}

const buildDataUrl = (svg: string) =>
  'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

const goldEleganceSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
  <rect x="20" y="20" width="760" height="960" fill="none" stroke="#d97706" stroke-width="4" rx="16"/>
  <rect x="30" y="30" width="740" height="940" fill="none" stroke="#f59e0b" stroke-width="2" rx="12"/>
  <path d="M 30 90 L 90 30 M 30 110 L 110 30 M 40 40 L 120 40 L 40 120 Z" fill="none" stroke="#d97706" stroke-width="2"/>
  <circle cx="60" cy="60" r="8" fill="#f59e0b"/>
  <path d="M 770 90 L 710 30 M 770 110 L 690 30 M 760 40 L 680 40 L 760 120 Z" fill="none" stroke="#d97706" stroke-width="2"/>
  <circle cx="740" cy="60" r="8" fill="#f59e0b"/>
  <path d="M 30 910 L 90 970 M 30 890 L 110 970 M 40 960 L 120 960 L 40 880 Z" fill="none" stroke="#d97706" stroke-width="2"/>
  <circle cx="60" cy="940" r="8" fill="#f59e0b"/>
  <path d="M 770 910 L 710 970 M 770 890 L 690 970 M 760 960 L 680 960 L 760 880 Z" fill="none" stroke="#d97706" stroke-width="2"/>
  <circle cx="740" cy="940" r="8" fill="#f59e0b"/>
  <rect x="150" y="900" width="500" height="60" rx="15" fill="#1c1917" opacity="0.88" stroke="#f59e0b" stroke-width="2"/>
  <text x="400" y="938" font-family="serif" font-size="24" font-weight="bold" fill="#fbbf24" text-anchor="middle">Arya &amp; Nadhira Wedding</text>
</svg>`;

const floralGardenSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
  <rect x="15" y="15" width="770" height="970" fill="none" stroke="#f472b6" stroke-width="3" rx="20"/>
  <!-- Top Left Floral -->
  <g fill="#ec4899" opacity="0.85">
    <circle cx="50" cy="50" r="14"/>
    <circle cx="75" cy="45" r="10" fill="#f472b6"/>
    <circle cx="45" cy="75" r="10" fill="#f472b6"/>
    <path d="M 20 20 Q 80 30 110 10 M 20 20 Q 30 80 10 110" stroke="#a21caf" stroke-width="3" fill="none"/>
  </g>
  <!-- Top Right Floral -->
  <g fill="#ec4899" opacity="0.85">
    <circle cx="750" cy="50" r="14"/>
    <circle cx="725" cy="45" r="10" fill="#f472b6"/>
    <circle cx="755" cy="75" r="10" fill="#f472b6"/>
    <path d="M 780 20 Q 720 30 690 10 M 780 20 Q 770 80 790 110" stroke="#a21caf" stroke-width="3" fill="none"/>
  </g>
  <!-- Bottom Banner Floral -->
  <rect x="180" y="910" width="440" height="50" rx="25" fill="#831843" opacity="0.9" stroke="#f472b6" stroke-width="2"/>
  <text x="400" y="943" font-family="sans-serif" font-size="20" font-weight="bold" fill="#fbcfe8" text-anchor="middle">✨ Happy Wedding Arya &amp; Nadhira ✨</text>
</svg>`;

const modernMinimalistSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
  <rect x="30" y="30" width="740" height="940" fill="none" stroke="#ffffff" stroke-width="6"/>
  <rect x="42" y="42" width="716" height="916" fill="none" stroke="#fbbf24" stroke-width="2"/>
  <rect x="180" y="40" width="440" height="40" fill="#000000" opacity="0.75" rx="8"/>
  <text x="400" y="66" font-family="sans-serif" font-size="16" letter-spacing="4" font-weight="600" fill="#ffffff" text-anchor="middle">PHOTO MOMENT • ARYA &amp; NADHIRA</text>
</svg>`;

const polaroidVintageSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
  <!-- Outer Polaroid border -->
  <path d="M 0 0 L 800 0 L 800 1000 L 0 1000 Z M 40 40 L 40 820 L 760 820 L 760 40 Z" fill="#f5f5f4" fill-rule="evenodd"/>
  <rect x="40" y="40" width="720" height="780" fill="none" stroke="#e7e5e4" stroke-width="2"/>
  <text x="400" y="920" font-family="serif" font-size="32" font-style="italic" fill="#292524" text-anchor="middle">Arya &amp; Nadhira Wedding Moments</text>
</svg>`;

export const FRAME_PRESETS: FramePresetOption[] = [
  {
    id: 'gold_elegance',
    name: 'Gold Elegance Frame',
    description: 'Bingkai ornamen mewah bernuansa emas elegan dengan ukiran di tiap sudut.',
    svgContent: goldEleganceSvg,
    dataUrl: buildDataUrl(goldEleganceSvg),
  },
  {
    id: 'floral_garden',
    name: 'Floral Botanical Frame',
    description: 'Bingkai hiasan bunga warna pink dan magenta yang romantis.',
    svgContent: floralGardenSvg,
    dataUrl: buildDataUrl(floralGardenSvg),
  },
  {
    id: 'modern_minimalist',
    name: 'Modern Gold Line',
    description: 'Garis ganda bersih dan modern dengan badge header minimalis.',
    svgContent: modernMinimalistSvg,
    dataUrl: buildDataUrl(modernMinimalistSvg),
  },
  {
    id: 'polaroid_vintage',
    name: 'Classic Polaroid Frame',
    description: 'Style polaroid klasik dengan area tepi putih dan tulisan di bagian bawah.',
    svgContent: polaroidVintageSvg,
    dataUrl: buildDataUrl(polaroidVintageSvg),
  },
];
