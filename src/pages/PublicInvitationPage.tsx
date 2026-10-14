import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { Heart, Calendar, Images, MessageSquareHeart, Gift, Sparkles, QrCode, Lock, CheckCircle2, ShieldCheck, Camera } from 'lucide-react';
import { fetchInvitationData, verifyGuestSlug, verifyGuestCode } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { FloatingMusicPlayer } from '../components/common/FloatingMusicPlayer.js';
import { CoverEnvelope } from '../components/wedding/CoverEnvelope.js';
import { HeroSection } from '../components/wedding/HeroSection.js';
import { CountdownSection } from '../components/wedding/CountdownSection.js';
import { CoupleSection } from '../components/wedding/CoupleSection.js';
import { EventsSection } from '../components/wedding/EventsSection.js';
import { LoveStorySection } from '../components/wedding/LoveStorySection.js';
import { GallerySection } from '../components/wedding/GallerySection.js';
import { PhotoMomentsSection } from '../components/wedding/PhotoMomentsSection.js';
import { GuestbookSection } from '../components/wedding/GuestbookSection.js';
import { WeddingGiftSection } from '../components/wedding/WeddingGiftSection.js';
import { FooterSection } from '../components/wedding/FooterSection.js';
import { DigitalGuestPassModal } from '../components/wedding/DigitalGuestPassModal.js';
import { InvitedGuest } from '../types.js';

export const PublicInvitationPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { currentTheme, setTheme, styles } = useTheme();

  const [isEnvelopeOpen, setIsEnvelopeOpen] = useState(false);
  const [autoPlayRequested, setAutoPlayRequested] = useState(false);
  const [guestParamName, setGuestParamName] = useState('Tamu Undangan');
  const [isGuestVerified, setIsGuestVerified] = useState<boolean>(false);
  const [verifiedGuest, setVerifiedGuest] = useState<InvitedGuest | null>(null);
  const [showPassModal, setShowPassModal] = useState<boolean>(false);
  const [isCheckingCode, setIsCheckingCode] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>('hero-section');

  // Track active section on scroll for bottom navigation feedback
  useEffect(() => {
    const handleScroll = () => {
      const sectionIds = [
        'hero-section',
        'couple-section',
        'events-section',
        'story-section',
        'gallery-section',
        'moments-section',
        'guestbook-section',
        'gifts-section',
      ];

      const scrollPosition = window.scrollY + window.innerHeight * 0.35;
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el) {
          const top = el.offsetTop;
          if (scrollPosition >= top) {
            setActiveSection(sectionIds[i]);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch safe public invitation payload
  const { data: invitation, isLoading, error } = useQuery({
    queryKey: ['invitation'],
    queryFn: fetchInvitationData,
  });

  // Read URL parameters & verify 4-character slug
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawTo = params.get('to') || params.get('guest') || params.get('nama');
    const rawCode = params.get('c') || params.get('code') || params.get('slug') || params.get('u');

    if (rawTo) {
      setGuestParamName(rawTo);
    }

    // Auto verify 4-char code if present or restore from localStorage
    if (rawCode && rawCode.trim().length === 4) {
      const code = rawCode.trim().toUpperCase();
      setIsCheckingCode(true);
      verifyGuestSlug(code).then((result) => {
        setIsCheckingCode(false);
        if (result.isValid && result.guest) {
          setIsGuestVerified(true);
          setVerifiedGuest(result.guest);
          try {
            localStorage.setItem('wedding_verified_guest', JSON.stringify(result.guest));
          } catch (e) {
            console.error(e);
          }
          if (!rawTo && result.guest.name) {
            setGuestParamName(result.guest.name);
          }
        }
      });
    } else {
      try {
        const saved = localStorage.getItem('wedding_verified_guest');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.slug) {
            setIsGuestVerified(true);
            setVerifiedGuest(parsed);
            if (!rawTo && parsed.name) {
              setGuestParamName(parsed.name);
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Sync theme
  useEffect(() => {
    if (invitation?.themeColor && invitation.themeColor !== currentTheme) {
      setTheme(invitation.themeColor);
    }
  }, [invitation?.themeColor, currentTheme, setTheme]);

  // Handler to unlock via code
  const handleUnlockByCode = useCallback(async (code: string) => {
    const res = await verifyGuestCode(code);
    if (res.isValid && res.guest) {
      setIsGuestVerified(true);
      setVerifiedGuest(res.guest);
      setGuestParamName(res.guest.name);

      // Update URL query parameters without full reload
      const url = new URL(window.location.href);
      url.searchParams.set('to', res.guest.name);
      url.searchParams.set('c', res.guest.slug);
      window.history.replaceState({}, '', url.toString());

      return {
        success: true,
        message: res.message || `Selamat datang, ${res.guest.name}! Akses berhasil dibuka.`,
      };
    }
    return {
      success: false,
      message: res.message || 'Kode undangan 4 karakter tidak terdaftar.',
    };
  }, []);

  const handleOpenEnvelope = () => {
    setIsEnvelopeOpen(true);
    setAutoPlayRequested(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFCF9] text-[#4A4A40]">
        <div className="w-12 h-12 rounded-full border-4 border-[#5A5A40]/30 border-t-[#5A5A40] animate-spin mb-4" />
        <h2 className="font-['Playfair_Display'] text-xl font-semibold">
          Mempersiapkan Undangan Pernikahan...
        </h2>
        <p className="text-xs text-[#78786A] mt-1">Harap tunggu sebentar</p>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFCF9] p-6 text-center text-[#4A4A40]">
        <p className="text-rose-600 font-semibold mb-2">Gagal memuat data undangan.</p>
        <p className="text-xs text-[#78786A] mb-4">Pastikan server berjalan dengan baik.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 bg-[#5A5A40] text-white rounded-xl text-xs font-semibold hover:bg-[#484833] transition-colors cursor-pointer"
        >
          Muat Ulang
        </button>
      </div>
    );
  }

  const coupleShortNames = `${invitation.groomShortName} & ${invitation.brideShortName}`;

  return (
    <div
      className="min-h-screen relative font-['Plus_Jakarta_Sans'] transition-colors duration-500 selection:bg-[#E9E4D9] selection:text-[#4A4A40]"
      style={{
        backgroundColor: styles.bgPrimary,
        color: styles.textPrimary,
      }}
    >
      {/* 1. Cover Envelope (Full Screen until opened) */}
      <AnimatePresence>
        {!isEnvelopeOpen && (
          <CoverEnvelope
            invitation={invitation}
            recipientName={guestParamName}
            verifiedGuest={verifiedGuest}
            onOpen={handleOpenEnvelope}
          />
        )}
      </AnimatePresence>

      {/* 2. Main Wedding Website Content */}
      <main className="relative pb-24">
        {/* Floating Background Music Player */}
        <FloatingMusicPlayer
          audioUrl={invitation.musicUrl}
          songTitle={invitation.musicTitle}
          autoPlayTrigger={autoPlayRequested}
        />

        {/* Verified Guest Floating Pill / Pass Trigger (If verified) */}
        {isGuestVerified && verifiedGuest && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="sticky top-3 z-40 max-w-md mx-auto px-4"
          >
            <div className="bg-emerald-900/90 text-white backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl border border-emerald-700/50 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 overflow-hidden">
                <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
                <div className="truncate">
                  <span className="font-bold">{verifiedGuest.name}</span>
                  <span className="text-[10px] text-emerald-200 block truncate">
                    Undangan Resmi ({verifiedGuest.slug}) • {verifiedGuest.pax} Kursi
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPassModal(true)}
                className="py-1.5 px-3 rounded-xl bg-white text-emerald-950 font-sans font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 shrink-0 hover:bg-emerald-50 transition-colors shadow-xs cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-800" />
                <span>QR Tamu</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Sections */}
        <HeroSection invitation={invitation} />
        <CountdownSection invitation={invitation} />
        <CoupleSection invitation={invitation} />
        
        {/* Events & Venue */}
        <EventsSection
          events={invitation.events}
          isUnlocked={isGuestVerified}
        />

        <LoveStorySection stories={invitation.loveStories} />
        <GallerySection gallery={invitation.gallery} />

        {/* Highlight Banner for Checked-in Guests to Access Photo Moments Page */}
        {verifiedGuest?.isCheckedIn && (
          <div id="moments-section" className="my-12 px-4 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 rounded-3xl p-6 sm:p-8 text-white shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6 border border-amber-500/30 relative overflow-hidden"
            >
              <div className="relative z-10 space-y-2 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span>Status Check-in Terverifikasi</span>
                </div>
                <h3 className="font-['Playfair_Display'] text-2xl sm:text-3xl font-bold">
                  Fitur Photo Moments Khusus Tamu
                </h3>
                <p className="text-xs sm:text-sm text-stone-300 max-w-lg leading-relaxed">
                  Terima kasih telah hadir! Abadikan momen indah Anda di lokasi acara secara langsung dan bagikan dalam galeri eksklusif tamu.
                </p>
              </div>

              <a
                href={`/photo-moments?c=${verifiedGuest.slug}&to=${encodeURIComponent(verifiedGuest.name)}`}
                className="relative z-10 px-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-2xl font-bold text-xs flex items-center gap-2.5 shadow-xl shrink-0 transition-all hover:scale-105 active:scale-95 cursor-pointer border border-amber-400/40"
              >
                <Camera className="w-4 h-4 text-white" />
                <span>Buka Halaman Photo Moments →</span>
              </a>
            </motion.div>
          </div>
        )}

        {/* Guestbook & RSVP */}
        <GuestbookSection
          invitation={invitation}
          isUnlocked={isGuestVerified}
          verifiedGuest={verifiedGuest}
        />

        {/* Wedding Gifts & Bank Accounts (Only visible when guest is verified / has unique slug) */}
        {isGuestVerified && (
          <WeddingGiftSection
            gifts={invitation.giftInfo}
            isUnlocked={isGuestVerified}
          />
        )}

        <FooterSection invitation={invitation} isAuthenticated={isAuthenticated} />

        {/* Quick Icon-Only Mobile Bottom Navigation Bar with Active Section Feedback */}
        {(() => {
          const isCheckedIn = Boolean(verifiedGuest?.isCheckedIn);

          const navItems = [
            {
              id: 'couple-section',
              matchIds: ['hero-section', 'couple-section'],
              label: 'Mempelai',
              icon: Heart,
              targetId: 'hero-section',
            },
            {
              id: 'events-section',
              matchIds: ['events-section'],
              label: 'Acara',
              icon: Calendar,
              targetId: 'events-section',
            },
            {
              id: 'gallery-section',
              matchIds: ['story-section', 'gallery-section'],
              label: 'Galeri',
              icon: Images,
              targetId: 'gallery-section',
            },
            {
              id: 'guestbook-section',
              matchIds: ['guestbook-section'],
              label: 'RSVP',
              icon: MessageSquareHeart,
              targetId: 'guestbook-section',
            },
            ...(isGuestVerified
              ? [
                  {
                    id: 'gifts-section',
                    matchIds: ['gifts-section'],
                    label: 'Kado',
                    icon: Gift,
                    targetId: 'gifts-section',
                  },
                ]
              : []),
            ...(isCheckedIn
              ? [
                  {
                    id: 'moments-page',
                    matchIds: ['moments-section'],
                    label: 'Photo Moments',
                    icon: Camera,
                    isHighlight: true,
                    url: `/photo-moments?c=${verifiedGuest.slug}&to=${encodeURIComponent(verifiedGuest.name)}`,
                  },
                ]
              : []),
          ];

          return (
            <nav
              aria-label="Navigasi Utama Undangan"
              className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 bg-[#FDFCF9]/95 backdrop-blur-md px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full border shadow-2xl flex items-center gap-1.5 sm:gap-2 transition-all duration-300"
              style={{ borderColor: styles.borderAccent }}
            >
              {navItems.map((item: any) => {
                const Icon = item.icon;
                const isActive = item.matchIds.includes(activeSection);

                if (item.isHighlight) {
                  return (
                    <a
                      key={item.id}
                      href={item.url}
                      title="Photo Moments (Spesial Tamu Check-in)"
                      aria-label="Photo Moments (Spesial Tamu Check-in)"
                      className="relative group min-w-[50px] min-h-[50px] w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-amber-500 via-rose-500 to-amber-600 text-white shadow-xl hover:shadow-amber-500/40 ring-2 ring-amber-300/80 active:scale-95 transition-all duration-300 cursor-pointer"
                    >
                      <Icon className="w-5 h-5 animate-bounce" />
                      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-300 border border-white"></span>
                      </span>

                      {/* Tooltip on Hover/Focus */}
                      <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-amber-900 text-amber-200 text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md border border-amber-600">
                        Photo Moments
                      </span>
                    </a>
                  );
                }

                return (
                  <button
                    key={item.id}
                    type="button"
                    title={item.label}
                    aria-label={item.label}
                    onClick={() => {
                      if (item.targetId === 'hero-section') {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      } else {
                        const el = document.getElementById(item.targetId);
                        el?.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className={`relative group min-w-[48px] min-h-[48px] w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${
                      isActive
                        ? 'text-white shadow-md scale-105'
                        : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100/80 active:scale-95'
                    }`}
                    style={{
                      backgroundColor: isActive ? styles.accent : 'transparent',
                    }}
                  >
                    <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />

                    {/* Active Section Feedback Indicator Pill */}
                    {isActive && (
                      <motion.span
                        layoutId="activeNavDot"
                        className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-white shadow-xs"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}

                    {/* Tooltip on Hover/Focus */}
                    <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-stone-900/90 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md border border-stone-700">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          );
        })()}
      </main>

      {/* Digital QR Pass Modal */}
      <AnimatePresence>
        {showPassModal && verifiedGuest && (
          <DigitalGuestPassModal
            guest={verifiedGuest}
            weddingDate={invitation.weddingDate}
            coupleNames={coupleShortNames}
            onClose={() => setShowPassModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

