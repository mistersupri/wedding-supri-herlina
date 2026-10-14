import React from 'react';
import { CalendarPlus } from 'lucide-react';
import { useCountdown } from '../../hooks/useCountdown.js';
import { Reveal } from '../ui/Reveal.js';
import type { InvitationData } from '../../types.js';

function googleCalendarUrl(inv: InvitationData) {
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

export const CountdownSection: React.FC<{ invitation: InvitationData }> = ({ invitation }) => {
  const left = useCountdown(invitation.countdownTarget || invitation.weddingDate);
  const units = [
    { value: left.days, label: 'hari' },
    { value: left.hours, label: 'jam' },
    { value: left.minutes, label: 'menit' },
    { value: left.seconds, label: 'detik' },
  ];

  return (
    <section aria-labelledby="countdown-heading" className="on-deep px-5 py-16 sm:py-20">
      <Reveal className="mx-auto max-w-4xl">
        <h2 id="countdown-heading" className="text-center font-display text-2xl italic sm:text-3xl">
          {left.isPast ? 'Hari bahagia telah tiba' : 'Menuju hari bahagia'}
        </h2>

        {left.isPast ? (
          <p className="mx-auto mt-4 max-w-md text-center text-on-deep-soft">
            Terima kasih atas doa restu yang telah Bapak/Ibu/Saudara/i berikan.
          </p>
        ) : (
          <dl className="mt-10 grid grid-cols-4 divide-x divide-on-deep/20" aria-live="off">
            {units.map((u) => (
              <div key={u.label} className="flex flex-col-reverse items-center px-1">
                <dt className="mt-2 text-xs text-on-deep-soft sm:text-sm">{u.label}</dt>
                <dd className="display-numeral text-[clamp(2rem,9vw,4.5rem)] leading-none">{String(u.value).padStart(2, '0')}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-10 flex justify-center">
          <a
            href={googleCalendarUrl(invitation)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-on-deep/40 px-5 text-sm font-semibold hover:bg-white/10"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            Simpan ke Google Calendar
          </a>
        </div>
      </Reveal>
    </section>
  );
};
