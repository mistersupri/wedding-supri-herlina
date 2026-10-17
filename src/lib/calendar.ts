import type { InvitationData } from '@shared/types';

/** "Add to Google Calendar" link for the wedding day, placed at the first event's venue. */
export function googleCalendarUrl(inv: InvitationData) {
  const start = new Date(inv.weddingDate);
  const end = new Date(start.getTime() + 6 * 3_600_000);
  const stamp = (d: Date) => d.toISOString().replace(/-|:|\.\d{3}/g, '');
  const first = inv.events[0];
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Pernikahan ${inv.groomShortName} & ${inv.brideShortName}`,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: `Pernikahan ${inv.groomName} dan ${inv.brideName}.`,
    location: first ? `${first.venueName}, ${first.address}` : '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
