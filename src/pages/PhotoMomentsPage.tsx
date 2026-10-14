import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  ArrowLeft,
  QrCode,
  Lock,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Heart,
} from 'lucide-react';
import { verifyGuestSlug, verifyGuestCode, fetchInvitationData } from '../lib/api.js';
import { InvitedGuest, InvitationData } from '../types.js';
import { PhotoMomentsSection } from '../components/wedding/PhotoMomentsSection.js';
import { DigitalGuestPassModal } from '../components/wedding/DigitalGuestPassModal.js';

export const PhotoMomentsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const codeParam = searchParams.get('c') || '';
  const nameParam = searchParams.get('to') || '';

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [guest, setGuest] = useState<InvitedGuest | null>(null);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [isPassModalOpen, setIsPassModalOpen] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        // Load invitation info for branding
        const invData = await fetchInvitationData();
        if (isMounted) setInvitation(invData);

        // Verify guest check-in status if code param exists, or restore from localStorage
        if (codeParam) {
          const verification = await verifyGuestCode(codeParam);
          if (isMounted && verification.isValid && verification.guest) {
            setGuest(verification.guest);
            try {
              localStorage.setItem('wedding_verified_guest', JSON.stringify(verification.guest));
            } catch (e) {
              console.error(e);
            }
          }
        } else {
          try {
            const saved = localStorage.getItem('wedding_verified_guest');
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed && parsed.slug) {
                const verification = await verifyGuestCode(parsed.slug);
                if (isMounted && verification.isValid && verification.guest) {
                  setGuest(verification.guest);
                } else if (isMounted && parsed.isCheckedIn) {
                  setGuest(parsed);
                }
              }
            }
          } catch (e) {
            console.error(e);
          }
        }
      } catch (err) {
        console.error('Error loading Photo Moments page data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [codeParam]);

  const returnUrl = `/${codeParam ? `?c=${codeParam}&to=${encodeURIComponent(nameParam || guest?.name || '')}` : ''}`;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFCF9] flex flex-col items-center justify-center p-6 text-[#4A4A40]">
        <div className="w-10 h-10 rounded-full border-3 border-amber-600 border-t-transparent animate-spin mb-4" />
        <p className="font-['Playfair_Display'] text-lg font-semibold">
          Memeriksa Status Check-in Tamu...
        </p>
      </div>
    );
  }

  const isCheckedIn = Boolean(guest?.isCheckedIn);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-2 sm:p-6">
        {!isCheckedIn ? (
          /* Access Restricted View for Un-checked-in Guests */
          <div>
            <div className="p-4 flex items-center justify-between">
              <Link
                to={returnUrl}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-semibold border border-stone-800 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </Link>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="my-8 max-w-xl mx-auto bg-white text-stone-900 rounded-3xl p-8 sm:p-10 shadow-xl border border-stone-200/90 text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600" />

              <div className="w-16 h-16 rounded-3xl bg-amber-100/80 text-amber-800 flex items-center justify-center mx-auto mb-6 shadow-xs">
                <Lock className="w-8 h-8" />
              </div>

              <span className="inline-block px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold uppercase tracking-wider mb-3">
                Akses Khusus Lokasi Acara
              </span>

              <h2 className="font-['Playfair_Display'] text-2xl sm:text-3xl font-bold text-stone-900 mb-3">
                Fitur Photo Moments Terkunci
              </h2>

              <p className="text-sm text-stone-600 leading-relaxed mb-6">
                Halaman dan fitur kamera live **Photo Moments** hanya dapat dibuka dan digunakan oleh tamu undangan yang telah hadir serta melakukan **check-in** di meja penerima tamu lokasi acara.
              </p>

              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 mb-8 text-xs text-stone-600 text-left space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Tunjukkan Digital Guest Pass QR Code Anda saat tiba di lokasi.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Petunjuk penerima tamu akan melakukan pemindaian check-in.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Setelah terverifikasi, fitur ini akan otomatis terbuka secara khusus!</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {guest && (
                  <button
                    type="button"
                    onClick={() => setIsPassModalOpen(true)}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Buka Digital Guest Pass QR</span>
                  </button>
                )}

                <Link
                  to={returnUrl}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs flex items-center justify-center transition-all"
                >
                  Kembali ke Undangan Utama
                </Link>
              </div>
            </motion.div>
          </div>
        ) : (
          /* Full Screen Dedicated Photo Moments Section */
          <motion.div
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            {/* Embedded Photo Moments Component */}
            <PhotoMomentsSection
              verifiedGuest={guest}
              defaultGuestName={guest.name}
              isUnlocked={true}
              onBack={() => navigate(returnUrl)}
            />
          </motion.div>
        )}
      </main>

      {/* Digital Guest Pass Modal */}
      <AnimatePresence>
        {isPassModalOpen && guest && (
          <DigitalGuestPassModal
            guest={guest}
            weddingDate={invitation?.weddingDate || ''}
            coupleNames={invitation ? `${invitation.groomShortName} & ${invitation.brideShortName}` : ''}
            onClose={() => setIsPassModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
