const EARTH_RADIUS_M = 6_371_000;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two coordinates, in metres (haversine). */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const isLatitude = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= -90 && v <= 90;
export const isLongitude = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= -180 && v <= 180;

/** "1,2 km" or "150 m", for messages shown to guests. */
export const formatDistance = (meters: number) =>
  meters >= 1000 ? `${(meters / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(meters / 10) * 10} m`;

/**
 * Reads a coordinate pair out of what people paste: "-6.2088, 106.8456", or a Google Maps link
 * containing "@-6.2088,106.8456", "!3d-6.2088!4d106.8456" or "q=-6.2088,106.8456". Short links
 * (maps.app.goo.gl) hold no coordinates and give null.
 */
export function parseCoordinates(text: string): { lat: number; lng: number } | null {
  const num = '(-?\\d{1,3}(?:\\.\\d+)?)';
  const patterns = [
    new RegExp(`!3d${num}!4d${num}`),
    new RegExp(`@${num},\\s*${num}`),
    new RegExp(`[?&](?:q|ll|query)=${num}(?:,|%2C)\\s*${num}`),
    new RegExp(`^\\s*${num}\\s*[,;\\s]\\s*${num}\\s*$`),
  ];
  for (const pattern of patterns) {
    const m = pattern.exec(text);
    if (!m) continue;
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (isLatitude(lat) && isLongitude(lng)) return { lat, lng };
  }
  return null;
}
