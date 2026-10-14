import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence } from 'motion/react';
import { publicApi } from '../lib/api.js';
import { queryKeys } from '../lib/queryKeys.js';
import { coupleNames } from '../lib/format.js';
import { useThemePreset } from '../lib/theme.js';
import { useAuth } from '../context/AuthContext.js';
import { useInvitationGuest } from '../hooks/useInvitationGuest.js';
import { ErrorState, LoadingState } from '../components/ui/StateView.js';
import { Reveal } from '../components/ui/Reveal.js';
import { CoverEnvelope } from '../components/wedding/CoverEnvelope.js';
import { HeroSection } from '../components/wedding/HeroSection.js';
import { CoupleSection } from '../components/wedding/CoupleSection.js';
import { CountdownSection } from '../components/wedding/CountdownSection.js';
import { EventsSection } from '../components/wedding/EventsSection.js';
import { LoveStorySection } from '../components/wedding/LoveStorySection.js';
import { GallerySection } from '../components/wedding/GallerySection.js';
import { GuestbookSection } from '../components/wedding/guestbook/GuestbookSection.js';
import { WeddingGiftSection } from '../components/wedding/WeddingGiftSection.js';
import { FooterSection } from '../components/wedding/FooterSection.js';
import { MusicPlayer } from '../components/wedding/MusicPlayer.js';
import { BottomNav } from '../components/wedding/BottomNav.js';
import { GuestPassModal } from '../components/wedding/GuestPassModal.js';
import type { AttendanceStatus } from '../types.js';

export const PublicInvitationPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { data: invitation, isLoading, isError, refetch } = useQuery({ queryKey: queryKeys.invitation, queryFn: publicApi.invitation });
  const { guest, displayName, unlock } = useInvitationGuest();
  const [isOpen, setIsOpen] = useState(false);
  const [pass, setPass] = useState<{ open: boolean; rsvp: { attendance: AttendanceStatus; pax: number } | null }>({
    open: false,
    rsvp: null,
  });

  useThemePreset(invitation?.themeColor);

  useEffect(() => {
    if (invitation) document.title = `Pernikahan ${coupleNames(invitation)}`;
  }, [invitation]);

  if (isLoading) return <LoadingState label="Menyiapkan undangan..." className="min-h-dvh" />;
  if (isError || !invitation) {
    return (
      <ErrorState
        title="Undangan belum bisa dimuat."
        detail="Periksa koneksi internet Anda, lalu coba lagi."
        onRetry={() => refetch()}
        className="min-h-dvh justify-center px-6"
      />
    );
  }

  const names = coupleNames(invitation);
  const photoMomentsHref = guest?.isCheckedIn ? `/photo-moments?c=${guest.slug}&to=${encodeURIComponent(guest.name)}` : undefined;
  const navSections = [
    { id: 'couple-section', label: 'Mempelai' },
    { id: 'events-section', label: 'Acara' },
    ...(invitation.gallery.length ? [{ id: 'gallery-section', label: 'Galeri' }] : []),
    { id: 'guestbook-section', label: 'Ucapan' },
    ...(guest && invitation.giftInfo.length ? [{ id: 'gifts-section', label: 'Kado' }] : []),
  ];

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <AnimatePresence>
        {!isOpen && <CoverEnvelope invitation={invitation} recipientName={displayName} guest={guest} onOpen={() => setIsOpen(true)} />}
      </AnimatePresence>

      {/* inert while the cover is up, so keyboard and screen readers start on the cover. */}
      <div inert={!isOpen ? true : undefined}>
        <main>
          <HeroSection invitation={invitation} />
          <CoupleSection invitation={invitation} />
          <CountdownSection invitation={invitation} />
          <EventsSection events={invitation.events} isUnlocked={Boolean(guest)} />
          <LoveStorySection stories={invitation.loveStories} />
          <GallerySection gallery={invitation.gallery} />

          {photoMomentsHref && (
            <section aria-labelledby="moments-heading" className="on-deep px-5 py-14">
              <Reveal className="mx-auto flex max-w-4xl flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 id="moments-heading" className="font-display text-3xl italic">
                    Anda sudah tercatat hadir
                  </h2>
                  <p className="mt-2 max-w-lg text-on-deep-soft">
                    Abadikan suasana di lokasi dan bagikan ke galeri tamu, hingga tiga foto.
                  </p>
                </div>
                <a
                  href={photoMomentsHref}
                  className="inline-flex min-h-11 shrink-0 items-center rounded-sm bg-on-deep px-5 font-semibold text-deep hover:bg-white"
                >
                  Buka kamera Photo Moments
                </a>
              </Reveal>
            </section>
          )}

          <GuestbookSection invitation={invitation} guest={guest} onUnlock={unlock} onShowPass={(rsvp) => setPass({ open: true, rsvp })} />
          {guest && <WeddingGiftSection gifts={invitation.giftInfo} />}
        </main>

        <FooterSection invitation={invitation} isAuthenticated={isAuthenticated} />
        <MusicPlayer src={invitation.musicUrl} title={invitation.musicTitle} autoStart={isOpen} />
        <BottomNav
          sections={navSections}
          photoMomentsHref={photoMomentsHref}
          onShowPass={guest ? () => setPass({ open: true, rsvp: null }) : undefined}
        />
      </div>

      {guest && (
        <GuestPassModal
          open={pass.open}
          onClose={() => setPass((p) => ({ ...p, open: false }))}
          guest={guest}
          coupleNames={names}
          rsvp={pass.rsvp}
        />
      )}
    </div>
  );
};
