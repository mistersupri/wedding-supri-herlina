import React, { useMemo, useState } from 'react';
import { Lightbox } from '../ui/Lightbox.js';
import { Reveal } from '../ui/Reveal.js';
import type { GalleryCategory, GalleryPhoto } from '../../types.js';

const CATEGORY_LABEL: Record<GalleryCategory, string> = {
  PREWEDDING: 'Pra-nikah',
  ENGAGEMENT: 'Lamaran',
  MOMENTS: 'Momen',
  CEREMONY: 'Akad & resepsi',
};

export const GallerySection: React.FC<{ gallery: GalleryPhoto[] }> = ({ gallery }) => {
  const [category, setCategory] = useState<GalleryCategory | 'ALL'>('ALL');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Only offer the categories that actually have media.
  const categories = useMemo(
    () => (Object.keys(CATEGORY_LABEL) as GalleryCategory[]).filter((c) => gallery.some((p) => p.category === c)),
    [gallery],
  );
  const items = category === 'ALL' ? gallery : gallery.filter((p) => p.category === category);
  const current = openIndex !== null ? items[openIndex] : null;

  if (gallery.length === 0) return null;

  return (
    <section id="gallery-section" aria-labelledby="gallery-heading" className="px-5 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <h2 id="gallery-heading" className="font-display text-4xl sm:text-5xl">
            Galeri
          </h2>
          {categories.length > 1 && (
            <div role="group" aria-label="Kategori galeri" className="no-scrollbar -mx-5 flex gap-1 overflow-x-auto px-5 sm:mx-0 sm:px-0">
              {(['ALL', ...categories] as const).map((c) => {
                const active = c === category;
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCategory(c)}
                    className={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-semibold transition-colors ${
                      active ? 'border-primary text-ink' : 'border-transparent text-ink-soft hover:text-ink'
                    }`}
                  >
                    {c === 'ALL' ? 'Semua' : CATEGORY_LABEL[c]}
                  </button>
                );
              })}
            </div>
          )}
        </Reveal>

        <ul className="mt-10 columns-2 gap-3 sm:columns-3 sm:gap-4">
          {items.map((item, i) => (
            <li key={item.id} className="mb-3 break-inside-avoid sm:mb-4">
              <button
                type="button"
                onClick={() => setOpenIndex(i)}
                className="group relative block min-h-32 w-full overflow-hidden rounded-xs bg-paper-2 text-left"
                aria-label={`Buka ${item.mediaType === 'VIDEO' ? 'video' : 'foto'}: ${item.title}`}
              >
                {item.mediaType === 'VIDEO' ? (
                  <>
                    <video src={item.url} muted playsInline preload="metadata" className="block h-auto w-full" />
                    <span className="absolute top-2 left-2 rounded-xs bg-deep/80 px-2 py-0.5 text-xs font-semibold text-on-deep">
                      Video
                    </span>
                  </>
                ) : (
                  <img
                    src={item.url}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="block h-auto w-full transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <Lightbox
        open={current !== null}
        label="Galeri foto"
        index={openIndex ?? 0}
        count={items.length}
        itemKey={current?.id || ''}
        onClose={() => setOpenIndex(null)}
        onIndexChange={setOpenIndex}
        footer={
          current && (
            <div className="mx-auto max-w-2xl text-center">
              <p className="font-display text-xl">{current.title}</p>
              {current.caption && <p className="mt-1 text-sm text-on-deep-soft">{current.caption}</p>}
            </div>
          )
        }
      >
        {current &&
          (current.mediaType === 'VIDEO' ? (
            <video src={current.url} controls autoPlay playsInline className="max-h-full max-w-full" />
          ) : (
            <img src={current.url} alt={current.title} referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain" />
          ))}
      </Lightbox>
    </section>
  );
};
