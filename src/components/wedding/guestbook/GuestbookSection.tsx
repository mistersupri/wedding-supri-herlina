import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { Reveal } from '../../ui/Reveal.js';
import { UnlockPanel } from '../UnlockPanel.js';
import { RsvpPanel } from './RsvpPanel.js';
import { WishList } from './WishList.js';
import type { AttendanceStatus, GuestAccessVerification, InvitationData, PublicGuest } from '../../../types.js';

interface GuestbookSectionProps {
  invitation: InvitationData;
  guest: PublicGuest | null;
  onUnlock: (code: string) => Promise<GuestAccessVerification>;
  onShowPass: (rsvp: { attendance: AttendanceStatus; pax: number }) => void;
}

export const GuestbookSection: React.FC<GuestbookSectionProps> = ({ invitation, guest, onUnlock, onShowPass }) => {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: queryKeys.guestbook, queryFn: publicApi.guestbook });
  const wishes = data?.data || [];
  const stats = data?.stats;

  const existingWish = useMemo(() => {
    if (!guest) return null;
    const name = guest.name.trim().toLowerCase();
    return wishes.find((w) => w.guestName.trim().toLowerCase() === name) || null;
  }, [wishes, guest]);

  return (
    <section id="guestbook-section" aria-labelledby="guestbook-heading" className="bg-paper-2 px-5 py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-16">
        <div className="lg:sticky lg:top-8 lg:self-start">
          <Reveal>
            <h2 id="guestbook-heading" className="font-display text-4xl sm:text-5xl">
              Doa &amp; ucapan
            </h2>
            {stats && stats.totalWishes > 0 && (
              <p className="mt-3 text-[15px] text-ink-soft">
                {stats.totalWishes} ucapan masuk. {stats.attendingCount} tamu menyatakan hadir.
              </p>
            )}
          </Reveal>
          <Reveal className="mt-8">
            {guest ? (
              <div className="rounded-md border border-line bg-card p-6">
                <RsvpPanel invitation={invitation} guest={guest} existingWish={existingWish} onShowPass={onShowPass} />
              </div>
            ) : (
              <UnlockPanel onUnlock={onUnlock} />
            )}
          </Reveal>
        </div>

        <div aria-label="Daftar ucapan" role="region">
          <WishList wishes={wishes} isLoading={isLoading} isError={isError} onRetry={() => refetch()} />
        </div>
      </div>
    </section>
  );
};
