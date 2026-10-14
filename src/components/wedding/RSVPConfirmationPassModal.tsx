import React, { useState } from 'react';
import { motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, X, Sparkles, CheckCircle2, Users, Download, Share2, Calendar, MapPin, Heart, ArrowRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.js';
import { AttendanceStatus } from '../../types.js';

interface RSVPConfirmationPassModalProps {
  guestData: {
    id?: string;
    name: string;
    attendance: AttendanceStatus;
    pax: number;
    relationship: string;
    code?: string;
  };
  weddingDate: string;
  coupleNames: string;
  onClose: () => void;
}

export const RSVPConfirmationPassModal: React.FC<RSVPConfirmationPassModalProps> = ({
  guestData,
  weddingDate,
  coupleNames,
  onClose,
}) => {
  const { styles } = useTheme();
  const [isCopied, setIsCopied] = useState(false);

  // Fallback unique pass code
  const passCode = guestData.code || 'RSVP-PASS';

  // Construct QR Data
  // If it's a verified guest with 4-char code, encode the code so the receptionist scans it instantly.
  // Otherwise, encode a detailed RSVP string
  const qrData = passCode.length === 4 
    ? passCode 
    : `RSVP_PASS:${guestData.name}|${guestData.attendance}|${guestData.pax}|${guestData.relationship}`;

  const handleSharePass = () => {
    const text = `Halo! Saya baru saja melakukan konfirmasi kehadiran (RSVP) untuk pernikahan ${coupleNames}.\n` +
      `📌 Nama: ${guestData.name}\n` +
      `📌 Kehadiran: ${guestData.attendance === 'HADIR' ? 'Hadir ✔️' : guestData.attendance === 'TIDAK_HADIR' ? 'Tidak Hadir ❌' : 'Ragu-ragu ❓'}\n` +
      `📌 Jumlah Tamu: ${guestData.pax} Orang\n` +
      `Kode Tiket: ${passCode}\n` +
      `Buka Undangan: ${window.location.origin}/?to=${encodeURIComponent(guestData.name)}`;
    
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const getAttendanceLabel = (status: AttendanceStatus) => {
    switch (status) {
      case 'HADIR':
        return {
          text: 'Konfirmasi: Hadir',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
        };
      case 'TIDAK_HADIR':
        return {
          text: 'Konfirmasi: Tidak Hadir',
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
        };
      case 'RAGU':
        return {
          text: 'Konfirmasi: Masih Ragu',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
        };
    }
  };

  const attendanceInfo = getAttendanceLabel(guestData.attendance);

  const formattedWeddingDate = new Date(weddingDate).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

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
        {/* Decorative Top Accent */}
        <div 
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ backgroundColor: styles.accent }}
        />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-center gap-1.5 mb-2 mt-2">
          <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ color: styles.accent }} />
          <span className="text-[10px] font-bold font-sans uppercase tracking-[0.25em] text-[#78786A]">
            RSVP E-Ticket & Pass
          </span>
          <Sparkles className="w-3.5 h-3.5 animate-pulse" style={{ color: styles.accent }} />
        </div>

        <h3 className="font-['Playfair_Display'] text-xl font-bold mb-1" style={{ color: styles.accent }}>
          {coupleNames}
        </h3>

        {/* Guest Details Panel */}
        <div className="my-4 p-4 rounded-2xl bg-[#FDFCF9] border border-[#EBE7DF] text-left">
          <div className="flex items-center justify-between gap-2 border-b border-[#EBE7DF] pb-2 mb-2.5">
            <span className="text-[9px] font-sans font-bold uppercase tracking-widest text-[#78786A]">
              RSVP Konfirmasi
            </span>
            <span
              className={`text-[9px] font-sans font-bold px-2 py-0.5 rounded-full border uppercase inline-flex items-center gap-1 ${attendanceInfo.bg}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${attendanceInfo.dot}`} />
              {attendanceInfo.text}
            </span>
          </div>

          <p className="font-bold text-base text-stone-900 leading-snug">
            {guestData.name}
          </p>

          <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-[#EBE7DF] text-[11px]">
            <div>
              <span className="text-[9px] text-[#78786A] block">Relasi Tamu</span>
              <span className="font-semibold text-stone-800">{guestData.relationship}</span>
            </div>
            <div>
              <span className="text-[9px] text-[#78786A] block">Jumlah Pax</span>
              <span className="font-semibold text-stone-800">
                {guestData.attendance === 'TIDAK_HADIR' ? '0 Orang' : `${guestData.pax} Orang`}
              </span>
            </div>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="p-3 border border-stone-200 rounded-2xl bg-white shadow-xs inline-block my-1">
          <QRCodeSVG
            value={qrData}
            size={160}
            level="H"
            includeMargin={true}
            className="mx-auto"
          />
        </div>

        {/* Ticket Code */}
        <div className="mt-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-stone-100 border border-stone-200">
            <span className="text-[9px] font-sans font-medium text-stone-500 uppercase tracking-wider">
              TICKET CODE:
            </span>
            <span className="font-mono text-sm font-extrabold tracking-widest text-stone-900">
              {passCode}
            </span>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4 p-3 rounded-xl bg-amber-50/50 border border-amber-100 text-left text-[11px] leading-relaxed text-[#78786A]">
          <div className="flex gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#2D6A4F] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-stone-800 block">Bagaimana Cara Menggunakannya?</span>
              Silakan ambil tangkapan layar (screenshot) tiket ini atau tunjukkan saat memasuki area resepsi untuk mempermudah presensi kehadiran Anda.
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleSharePass}
            className="w-full py-2.5 px-4 rounded-xl border border-stone-300 font-sans text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors flex items-center justify-center gap-2 cursor-pointer bg-white"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{isCopied ? 'Info RSVP Tersalin!' : 'Salin & Bagikan Tiket'}</span>
          </button>
          
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl font-sans text-xs font-bold text-white transition-opacity flex items-center justify-center gap-1.5 cursor-pointer"
            style={{ backgroundColor: styles.accent }}
          >
            <span>Tutup Tiket</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
