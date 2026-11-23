/** Instagram names, shared by the CMS fields and the server so both clean them the same way. */

/** "@nama", "nama", "instagram.com/nama/?hl=id" and "https://www.instagram.com/nama" all become "nama". */
export function cleanInstagram(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^(www\.)?instagram\.com\//i, '')
    .replace(/[?#].*$/, '')
    .replace(/\/.*$/, '')
    .replace(/^@+/, '')
    .replace(/\s+/g, '');
}

export const INSTAGRAM_PATTERN = '^[A-Za-z0-9._]{1,30}$';

export const isInstagramHandle = (handle: string) => new RegExp(INSTAGRAM_PATTERN).test(handle);
