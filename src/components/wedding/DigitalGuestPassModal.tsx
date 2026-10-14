import React, { useState } from 'react';
import { motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, X, Sparkles, CheckCircle2, UserCheck, Users, Calendar, MapPin, Download, Share2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.js';
import { InvitedGuest } from '../../types.js';

interface DigitalGuestPassModalProps {
  guest: InvitedGuest;
  weddingDate: string;
  coupleNames: string;
  onClose: () => void;
}

export const DigitalGuestPassModal: React.FC<DigitalGuestPassModalProps> = ({
  guest,
  weddingDate,
  coupleNames,
  onClose,
}) => {
  const { styles } = useTheme();
  const [isCopied, setIsCopied] = useState(false);

  const handleShareLink = () => {
    const url = `${window.location.origin}/?to=${encodeURIComponent(guest.name)}&c=${guest.slug}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-3xl p-6 sm:p-7 text-center shadow-2xl overflow-hidden border"
        style={{
          backgroundColor: '#FFFFFF',
          borderColor: styles.borderAccent,
          color: styles.textPrimary,
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Card Header */}
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <Sparkles className="w-3.5 h-3.5" style={{ color: styles.accent }} />
          <span className="text-[10px] font-bold font-sans uppercase tracking-[0.25em] text-[#78786A]">
            Digital Guest Pass & Presensi
          </span>
          <Sparkles className="w-3.5 h-3.5" style={{ color: styles.accent }} />
        </div>

        <h3 className="font-['Playfair_Display'] text-xl font-bold mb-1" style={{ color: styles.accent }}>
          {coupleNames}
        </h3>

        <div className="my-4 p-4 rounded-2xl bg-[#FDFCF9] border border-[#EBE7DF] text-left">
          <div className="flex items-center justify-between gap-2 border-b border-[#EBE7DF] pb-2 mb-2.5">
            <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-[#78786A]">
              Tamu Undangan
            </span>
            <span
              className="text-[10px] font-sans font-bold px-2.5 py-0.5 rounded-full uppercase"
              style={{ backgroundColor: styles.badgeBg, color: styles.badgeText }}
            >
              {guest.category || 'Umum'}
            </span>
          </div>

          <p className="font-bold text-base text-stone-900 leading-snug">
            {guest.name}
          </p>

          <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-[#EBE7DF] text-xs">
            <div>
              <span className="text-[10px] text-[#78786A] block">Kuota Undangan</span>
              <span className="font-semibold text-stone-800">{guest.pax} Orang</span>
            </div>
            {guest.tableNumber && (
              <div>
                <span className="text-[10px] text-[#78786A] block">Meja / Posisi</span>
                <span className="font-semibold text-stone-800">{guest.tableNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* QR Code Graphic */}
        <div className="p-3.5 border border-stone-200 rounded-2xl bg-white shadow-xs inline-block my-1">
          <QRCodeSVG
            value={guest.slug}
            size={176}
            level="H"
            includeMargin={true}
            className="mx-auto"
          />
        </div>

        {/* 4-Char Slug Badge */}
        <div className="mt-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-100 border border-stone-200">
            <span className="text-[10px] font-sans font-medium text-stone-500 uppercase tracking-wider">
              Kode Unik:
            </span>
            <span className="font-mono text-base font-extrabold tracking-widest text-stone-900">
              {guest.slug}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-[#78786A] mt-3 leading-relaxed">
          Tunjukkan QR Code ini kepada petugas resepsionis di meja penerima tamu saat tiba di lokasi acara.
        </p>

        {guest.isCheckedIn && (
          <div className="mt-3 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Telah Terverifikasi Hadir di Lokasi</span>
          </div>
        )}

        {/* Action button */}
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={handleShareLink}
            className="w-full py-2.5 px-4 rounded-xl border border-stone-300 font-sans text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{isCopied ? 'Tautan Undangan Tersalin!' : 'Salin Tautan Undangan'}</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
