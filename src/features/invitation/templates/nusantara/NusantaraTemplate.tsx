import React from 'react';
import { AnimatePresence } from 'motion/react';
import { useInvitation } from '../../InvitationContext.js';
import { Reveal } from '../../../../components/ui/Reveal.js';
import { CoverEnvelope } from '../../../../components/wedding/CoverEnvelope.js';
import { HeroSection } from '../../../../components/wedding/HeroSection.js';
import { CoupleSection } from '../../../../components/wedding/CoupleSection.js';
import { CountdownSection } from '../../../../components/wedding/CountdownSection.js';
import { EventsSection } from '../../../../components/wedding/EventsSection.js';
import { LoveStorySection } from '../../../../components/wedding/LoveStorySection.js';
import { GallerySection } from '../../../../components/wedding/GallerySection.js';
import { GuestbookSection } from '../../../../components/wedding/guestbook/GuestbookSection.js';
import { WeddingGiftSection } from '../../../../components/wedding/WeddingGiftSection.js';
import { FooterSection } from '../../../../components/wedding/FooterSection.js';
import { MusicPlayer } from '../../../../components/wedding/MusicPlayer.js';
import { BottomNav } from '../../../../components/wedding/BottomNav.js';

/** The batik-inspired default template: kawung cover, long scrolling page, bottom navigation. */
const NusantaraTemplate: React.FC = () => {
  const { invitation, guest, isOpen, photoMomentsHref, showPass } = useInvitation();

  const navSections = [
    { id: 'couple-section', label: 'Mempelai' },
    { id: 'events-section', label: 'Acara' },
    ...(invitation.gallery.length ? [{ id: 'gallery-section', label: 'Galeri' }] : []),
    { id: 'guestbook-section', label: 'Ucapan' },
    ...(guest && invitation.giftInfo.length ? [{ id: 'gifts-section', label: 'Kado' }] : []),
  ];

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <AnimatePresence>{!isOpen && <CoverEnvelope />}</AnimatePresence>

      {/* inert while the cover is up, so keyboard and screen readers start on the cover. */}
      <div inert={!isOpen ? true : undefined}>
        <main>
          <HeroSection />
          <CoupleSection />
          <CountdownSection />
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

          <GuestbookSection />
          {guest && <WeddingGiftSection gifts={invitation.giftInfo} />}
        </main>

        <FooterSection />
        <MusicPlayer />
        <BottomNav sections={navSections} photoMomentsHref={photoMomentsHref} onShowPass={guest ? () => showPass() : undefined} />
      </div>
    </div>
  );
};

export default NusantaraTemplate;
