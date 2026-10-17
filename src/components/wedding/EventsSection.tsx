import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Clock, MapPin, Shirt } from 'lucide-react';
import { Reveal } from '../ui/Reveal.js';
import type { WeddingEvent } from '@shared/types';

interface EventsSectionProps {
  events: WeddingEvent[];
  /** Venue address and maps are for verified guests only. */
  isUnlocked: boolean;
}

const EventRow: React.FC<{ event: WeddingEvent; index: number; isUnlocked: boolean }> = ({ event, index, isUnlocked }) => {
  const [showMap, setShowMap] = useState(false);
  const mapId = `map-${event.id}`;

  return (
    <Reveal as="li" className="grid gap-4 border-t border-line py-10 sm:grid-cols-[7rem_1fr] sm:gap-8">
      <p className="display-numeral text-6xl leading-none text-prada-ink sm:text-7xl" aria-hidden="true">
        {String(index + 1).padStart(2, '0')}
      </p>
      <div>
        <h3 className="font-display text-3xl leading-tight">{event.title}</h3>
        <p className="mt-2 text-lg font-semibold">{event.date}</p>

        <ul className="mt-4 space-y-2.5 text-[15px]">
          <li className="flex gap-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-prada-ink" aria-hidden="true" />
            <span>
              {event.startTime} sampai {event.endTime}
            </span>
          </li>
          {isUnlocked ? (
            <li className="flex gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-prada-ink" aria-hidden="true" />
              <span>
                <span className="font-semibold">{event.venueName}</span>
                <span className="block text-ink-soft">{event.address}</span>
              </span>
            </li>
          ) : (
            <li className="flex gap-3 text-ink-soft">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-prada-ink" aria-hidden="true" />
              <span>
                Lokasi lengkap tampil setelah{' '}
                <a href="#buka-undangan" className="font-semibold text-primary underline decoration-prada underline-offset-4">
                  kode undangan dimasukkan
                </a>
                .
              </span>
            </li>
          )}
          {event.dressCode && (
            <li className="flex gap-3">
              <Shirt className="mt-0.5 h-4 w-4 shrink-0 text-prada-ink" aria-hidden="true" />
              <span>
                <span className="text-ink-soft">Busana: </span>
                {event.dressCode}
              </span>
            </li>
          )}
        </ul>

        {event.notes && <p className="mt-4 border-l-2 border-prada pl-3 text-[15px] text-ink-soft italic">{event.notes}</p>}

        {isUnlocked && (
          <div className="mt-6 flex flex-wrap gap-2">
            <a
              href={event.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center rounded-sm bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-hover"
            >
              Petunjuk arah di Google Maps
            </a>
            {event.mapsEmbedUrl && (
              <button
                type="button"
                aria-expanded={showMap}
                aria-controls={mapId}
                onClick={() => setShowMap((v) => !v)}
                className="inline-flex min-h-11 items-center rounded-sm border border-field px-5 text-sm font-semibold hover:bg-paper-2"
              >
                {showMap ? 'Sembunyikan peta' : 'Lihat peta'}
              </button>
            )}
          </div>
        )}

        <AnimatePresence initial={false}>
          {isUnlocked && showMap && event.mapsEmbedUrl && (
            <motion.div
              id={mapId}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 overflow-hidden rounded-sm border border-line"
            >
              <iframe
                src={event.mapsEmbedUrl}
                title={`Peta lokasi ${event.venueName}`}
                className="block h-64 w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reveal>
  );
};

export const EventsSection: React.FC<EventsSectionProps> = ({ events, isUnlocked }) => (
  <section id="events-section" aria-labelledby="events-heading" className="px-5 py-20 sm:py-28">
    <div className="mx-auto max-w-4xl">
      <Reveal className="max-w-xl">
        <h2 id="events-heading" className="font-display text-4xl sm:text-5xl">
          Rangkaian acara
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-soft sm:text-base">
          Kehadiran dan doa restu Bapak/Ibu/Saudara/i merupakan kehormatan dan kebahagiaan bagi kami.
        </p>
      </Reveal>
      {events.length > 0 ? (
        <ol className="mt-10 border-b border-line">
          {events.map((event, i) => (
            <EventRow key={event.id} event={event} index={i} isUnlocked={isUnlocked} />
          ))}
        </ol>
      ) : (
        <p className="mt-10 text-ink-soft">Jadwal acara akan diumumkan segera.</p>
      )}
    </div>
  </section>
);
