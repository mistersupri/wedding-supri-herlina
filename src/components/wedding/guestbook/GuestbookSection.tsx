import React from 'react';
import { useInvitation } from '../../../features/invitation/InvitationContext.js';
import { useGuestbook } from '../../../features/invitation/hooks/useGuestbook.js';
import { Reveal } from '../../ui/Reveal.js';
import { UnlockPanel } from '../UnlockPanel.js';
import { RsvpPanel } from './RsvpPanel.js';
import { WishList } from './WishList.js';

export const GuestbookSection: React.FC = () => {
  const { guest } = useInvitation();
  const { wishes, stats, isLoading, isError, refetch } = useGuestbook();

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
                <RsvpPanel />
              </div>
            ) : (
              <UnlockPanel />
            )}
          </Reveal>
        </div>

        <div aria-label="Daftar ucapan" role="region">
          <WishList wishes={wishes} isLoading={isLoading} isError={isError} onRetry={refetch} />
        </div>
      </div>
    </section>
  );
};
