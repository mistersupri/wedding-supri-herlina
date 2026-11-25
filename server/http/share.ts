/**
 * Link preview for WhatsApp and other chat apps. They read the first HTML they get and never run the page's JavaScript,
 * so the title, description and picture must already be in index.html when the server sends it.
 */

export interface ShareInfo {
  groomShortName: string;
  brideShortName: string;
  weddingDate: string;
  /** Picture for the preview: the hero photo, else a portrait. May be a path on this server or a full URL. */
  image: string;
}

const escapeHtml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const longDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
};

/** An image URL other sites can fetch: paths on this server get the site's origin; data: URLs cannot be previewed. */
export function absoluteImage(image: string, origin: string): string {
  if (!image || image.startsWith('data:')) return '';
  return /^https?:\/\//i.test(image) ? image : `${origin}${image.startsWith('/') ? '' : '/'}${image}`;
}

/** The guest's name from `?to=`, tidied for a sentence; empty when it is missing or silly. */
export function guestFromQuery(to: unknown): string {
  const name = typeof to === 'string' ? to.replace(/\s+/g, ' ').trim().slice(0, 60) : '';
  return name;
}

export function shareTags(info: ShareInfo, origin: string, path: string, guest = ''): string {
  const names = `${info.groomShortName} & ${info.brideShortName}`;
  const title = `Undangan Pernikahan ${names}`;
  const date = longDate(info.weddingDate);
  const description = guest
    ? `Kepada Yth. ${guest}, kami mengundang Anda di pernikahan ${names}${date ? ` pada ${date}` : ''}. Buka undangan pribadi Anda.`
    : `Dengan hormat, kami mengundang Anda di pernikahan ${names}${date ? ` pada ${date}` : ''}.`;
  const image = absoluteImage(info.image, origin);
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta property="og:site_name" content="${escapeHtml(title)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="id_ID" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(origin + path)}" />`,
    ...(image
      ? [`<meta property="og:image" content="${escapeHtml(image)}" />`, `<meta name="twitter:card" content="summary_large_image" />`, `<meta name="twitter:image" content="${escapeHtml(image)}" />`]
      : [`<meta name="twitter:card" content="summary" />`]),
  ];
  return tags.join('\n    ');
}

/** index.html with its generic title and description swapped for this wedding's. */
export function withShareTags(html: string, info: ShareInfo, origin: string, path: string, guest = ''): string {
  const stripped = html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+name="description"[^>]*>\s*/i, '')
    .replace(/<meta\s+property="og:[^>]*>\s*/gi, '');
  return stripped.replace('</head>', `    ${shareTags(info, origin, path, guest)}\n  </head>`);
}
