import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock, MapPin, Navigation, Shirt, Map as MapIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.js';
import { WeddingEvent } from '../../types.js';

interface EventsSectionProps {
  events: WeddingEvent[];
  isUnlocked?: boolean;
}

export const EventsSection: React.FC<EventsSectionProps> = ({
  events,
  isUnlocked = true,
}) => {
  const { styles } = useTheme();
  const [activeMapId, setActiveMapId] = useState<string | null>(events[0]?.id || null);

  const toggleMap = (id: string) => {
    setActiveMapId(activeMapId === id ? null : id);
  };

  return (
    <section id="events-section" className="py-20 px-4" style={{ backgroundColor: styles.bgSecondary }}>
      <div className="max-w-5xl mx-auto">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <MapPin className="w-3.5 h-3.5" style={{ color: styles.accent }} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] font-sans" style={{ color: styles.textSecondary }}>
              Waktu & Tempat
            </span>
          </div>
          <h2 className="font-['Playfair_Display'] text-3xl sm:text-4xl md:text-5xl font-semibold" style={{ color: styles.textPrimary }}>
            Rangkaian Acara
          </h2>
          <p className="text-sm sm:text-base text-[#78786A] mt-2 max-w-xl mx-auto">
            Kehadiran dan doa restu Bapak/Ibu/Saudara/i sekalian merupakan suatu kehormatan dan kebahagiaan bagi kami.
          </p>
        </motion.div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {events.map((event, idx) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
              className="rounded-3xl p-6 sm:p-8 border shadow-sm flex flex-col justify-between"
              style={{
                backgroundColor: styles.bgCard,
                borderColor: styles.borderAccent,
              }}
            >
              <div>
                {/* Event Title Badge */}
                <div className="flex items-center justify-between gap-2 border-b pb-4 mb-6" style={{ borderColor: styles.borderAccent }}>
                  <h3 className="font-['Playfair_Display'] text-2xl font-bold" style={{ color: styles.accent }}>
                    {event.title}
                  </h3>
                  <span
                    className="text-[10px] font-sans font-bold px-3 py-1 rounded-full uppercase tracking-widest"
                    style={{ backgroundColor: styles.badgeBg, color: styles.badgeText }}
                  >
                    Sesi {idx + 1}
                  </span>
                </div>

                {/* Event Schedule Info */}
                <div className="space-y-3.5 mb-6">
                  <div className="flex items-start gap-3 text-[#4A4A40]">
                    <Calendar className="w-4 h-4 mt-0.5 shrink-0" style={{ color: styles.accent }} />
                    <span className="text-sm font-medium">{event.date}</span>
                  </div>

                  <div className="flex items-start gap-3 text-[#4A4A40]">
                    <Clock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: styles.accent }} />
                    <span className="text-sm font-medium">
                      {event.startTime} - {event.endTime}
                    </span>
                  </div>

                  {/* Location Details (Only shown if isUnlocked) */}
                  {isUnlocked && (
                    <div className="flex items-start gap-3 text-[#4A4A40]">
                      <MapPin className="w-4 h-4 mt-0.5 shrink-0" style={{ color: styles.accent }} />
                      <div>
                        <p className="text-sm font-bold text-[#4A4A40]">{event.venueName}</p>
                        <p className="text-xs text-[#78786A] mt-0.5 leading-relaxed">{event.address}</p>
                      </div>
                    </div>
                  )}

                  {event.dressCode && (
                    <div className="flex items-start gap-3 text-[#4A4A40]">
                      <Shirt className="w-4 h-4 mt-0.5 shrink-0" style={{ color: styles.accent }} />
                      <div className="text-xs text-[#78786A]">
                        <span className="font-semibold text-[#4A4A40]">Dress Code: </span>
                        {event.dressCode}
                      </div>
                    </div>
                  )}

                  {event.notes && (
                    <div className="p-3.5 rounded-xl text-xs bg-[#F0EEE6] border border-[#E9E4D9] text-[#4A4A40] italic">
                      ℹ️ {event.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons & Map Embed (Only shown if isUnlocked) */}
              {isUnlocked && (
                <div className="pt-4 border-t" style={{ borderColor: styles.borderAccent }}>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <a
                      href={event.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-3.5 px-4 rounded-xl font-sans text-xs uppercase tracking-[0.15em] font-bold text-white flex items-center justify-center gap-2 shadow-lg shadow-[#5A5A40]/15 transition-opacity hover:opacity-90 cursor-pointer"
                      style={{ backgroundColor: styles.accent }}
                    >
                      <Navigation className="w-4 h-4" />
                      <span>Petunjuk Google Maps</span>
                    </a>

                    {event.mapsEmbedUrl && (
                      <button
                        type="button"
                        onClick={() => toggleMap(event.id)}
                        className="py-3.5 px-4 rounded-xl font-sans text-xs uppercase tracking-wider font-semibold border flex items-center justify-center gap-1.5 transition-colors hover:bg-[#F0EEE6] cursor-pointer"
                        style={{
                          borderColor: styles.borderAccent,
                          color: styles.textPrimary,
                        }}
                      >
                        <MapIcon className="w-3.5 h-3.5" />
                        <span>{activeMapId === event.id ? 'Tutup Peta' : 'Lihat Peta'}</span>
                        {activeMapId === event.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>

                  {/* Interactive Map Embed */}
                  {activeMapId === event.id && event.mapsEmbedUrl && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 rounded-2xl overflow-hidden border shadow-inner"
                      style={{ borderColor: styles.borderAccent }}
                    >
                      <iframe
                        src={event.mapsEmbedUrl}
                        title={`Peta Lokasi ${event.venueName}`}
                        width="100%"
                        height="220"
                        style={{ border: 0 }}
                        allowFullScreen={false}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

