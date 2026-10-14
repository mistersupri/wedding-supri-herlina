import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CalendarPlus, Clock, Sparkles } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.js';
import { InvitationData } from '../../types.js';

interface CountdownSectionProps {
  invitation?: InvitationData;
  targetDate?: string;
  groomShortName?: string;
  brideShortName?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

export const CountdownSection: React.FC<CountdownSectionProps> = ({
  invitation,
  targetDate,
  groomShortName,
  brideShortName,
}) => {
  const { styles } = useTheme();

  const effectiveCountdownTarget =
    invitation?.countdownTarget || targetDate || invitation?.weddingDate || '2026-11-20T08:00:00.000Z';
  const effectiveWeddingDate = invitation?.weddingDate || effectiveCountdownTarget;
  const effectiveGroomShort = invitation?.groomShortName || groomShortName || 'Dimas';
  const effectiveBrideShort = invitation?.brideShortName || brideShortName || 'Anindya';
  const effectiveGroomName = invitation?.groomName || 'Dimas Wicaksono, S.T.';
  const effectiveBrideName = invitation?.brideName || 'dr. Anindya Larasati';

  const calculateTimeLeft = (): TimeLeft => {
    const targetTime = new Date(effectiveCountdownTarget).getTime();
    const now = new Date().getTime();
    const difference = targetTime - now;

    if (difference <= 0 || isNaN(targetTime)) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      isPast: false,
    };
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

  useEffect(() => {
    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [effectiveCountdownTarget]);

  const handleAddToGoogleCalendar = () => {
    const startDate = new Date(effectiveWeddingDate);
    const endDate = new Date(startDate.getTime() + 6 * 60 * 60 * 1000); // 6 hours duration

    const formatCalDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');

    const title = encodeURIComponent(`The Wedding of ${effectiveGroomShort} & ${effectiveBrideShort}`);
    const details = encodeURIComponent(
      `Pernikahan ${effectiveGroomName} & ${effectiveBrideName}.\nDoa restu Anda merupakan kehormatan bagi kami.`
    );
    const location = encodeURIComponent(
      invitation?.events?.[0]?.venueName ? `${invitation.events[0].venueName}, ${invitation.events[0].address}` : 'Lokasi Acara'
    );

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatCalDate(
      startDate
    )}/${formatCalDate(endDate)}&details=${details}&location=${location}`;

    window.open(url, '_blank');
  };

  const timeBlocks = [
    { label: 'Hari', value: timeLeft.days },
    { label: 'Jam', value: timeLeft.hours },
    { label: 'Menit', value: timeLeft.minutes },
    { label: 'Detik', value: timeLeft.seconds },
  ];

  return (
    <section className="py-16 px-4">
      <div className="max-w-3xl mx-auto text-center">
        {/* Section Heading */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="w-3.5 h-3.5" style={{ color: styles.accent }} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] font-sans" style={{ color: styles.textSecondary }}>
              Menghitung Hari Bahagia
            </span>
          </div>
          <h2 className="font-['Playfair_Display'] text-3xl sm:text-4xl font-semibold" style={{ color: styles.textPrimary }}>
            Hitung Mundur Acara
          </h2>
          <p className="text-sm text-[#78786A] mt-1">
            Menuju momen ikrar suci pernikahan kami
          </p>
        </motion.div>

        {/* Countdown Timer Blocks Grid */}
        <div className="grid grid-cols-4 gap-2.5 sm:gap-4 max-w-lg mx-auto">
          {timeBlocks.map((block, idx) => (
            <motion.div
              key={block.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="rounded-2xl p-4 sm:p-6 border shadow-sm flex flex-col items-center justify-center transition-transform hover:-translate-y-1"
              style={{
                backgroundColor: styles.bgSecondary,
                borderColor: styles.borderAccent,
              }}
            >
              <span
                className="font-['Playfair_Display'] text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight"
                style={{ color: styles.accent }}
              >
                {String(block.value).padStart(2, '0')}
              </span>
              <span className="text-[10px] sm:text-[11px] font-sans font-bold uppercase tracking-[0.2em] mt-1.5 text-[#78786A]">
                {block.label}
              </span>
            </motion.div>
          ))}
        </div>

        {timeLeft.isPast && (
          <p className="text-xs font-semibold mt-4 text-[#5A5A40] bg-[#F0EEE6] border border-[#E9E4D9] py-2.5 px-5 rounded-full inline-block font-sans uppercase tracking-wider">
            ✨ Acara pernikahan telah berlangsung dengan penuh kebahagiaan
          </p>
        )}

        {/* Save The Date Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-3 mt-8"
        >
          <button
            type="button"
            onClick={handleAddToGoogleCalendar}
            className="py-3.5 px-6 rounded-xl font-sans text-xs uppercase tracking-[0.15em] font-bold text-white flex items-center gap-2 shadow-lg shadow-[#5A5A40]/20 transition-all hover:opacity-90 cursor-pointer"
            style={{ backgroundColor: styles.accent }}
          >
            <CalendarPlus className="w-4 h-4" />
            <span>Simpan ke Google Calendar</span>
          </button>
        </motion.div>
      </div>
    </section>
  );
};
