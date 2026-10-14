import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Images, X, ChevronLeft, ChevronRight, Sparkles, Maximize2, Play, Film } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.js';
import { GalleryPhoto, GalleryCategory } from '../../types.js';

interface GallerySectionProps {
  gallery: GalleryPhoto[];
}

export const GallerySection: React.FC<GallerySectionProps> = ({ gallery }) => {
  const { styles } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  const categories = [
    { key: 'ALL', label: 'Semua Foto' },
    { key: 'PREWEDDING', label: 'Pre-Wedding' },
    { key: 'ENGAGEMENT', label: 'Lamaran' },
    { key: 'MOMENTS', label: 'Momen Indah' },
    { key: 'CEREMONY', label: 'Akad & Resepsi' },
  ];

  const filteredPhotos = selectedCategory === 'ALL'
    ? gallery
    : gallery.filter((p) => p.category === selectedCategory);

  const openLightbox = (index: number) => {
    setActivePhotoIndex(index);
  };

  const closeLightbox = () => {
    setActivePhotoIndex(null);
  };

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activePhotoIndex === null) return;
    setActivePhotoIndex((activePhotoIndex + 1) % filteredPhotos.length);
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activePhotoIndex === null) return;
    setActivePhotoIndex((activePhotoIndex - 1 + filteredPhotos.length) % filteredPhotos.length);
  };

  return (
    <section id="gallery-section" className="py-20 px-4" style={{ backgroundColor: styles.bgSecondary }}>
      <div className="max-w-6xl mx-auto">
        {/* Section Heading */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Images className="w-3.5 h-3.5" style={{ color: styles.accent }} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] font-sans" style={{ color: styles.textSecondary }}>
              Galeri Kenangan
            </span>
          </div>
          <h2 className="font-['Playfair_Display'] text-3xl sm:text-4xl md:text-5xl font-semibold" style={{ color: styles.textPrimary }}>
            Potret Bahagia
          </h2>
          <p className="text-sm text-[#78786A] mt-2">
            Setiap jepretan mengabadikan ketulusan cinta kami
          </p>
        </motion.div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className="px-4 py-2 rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-all cursor-pointer border"
                style={{
                  backgroundColor: isActive ? styles.accent : styles.bgCard,
                  color: isActive ? '#FFFFFF' : styles.textPrimary,
                  borderColor: isActive ? styles.accent : styles.borderAccent,
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Responsive Masonry Photo Grid */}
        <div className="columns-1 sm:columns-2 md:columns-3 gap-4 md:gap-6 space-y-4 md:space-y-6">
          {filteredPhotos.map((photo, index) => {
            const isVideo = photo.mediaType === 'VIDEO';

            return (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                onClick={() => openLightbox(index)}
                className="break-inside-avoid inline-block w-full group relative rounded-3xl overflow-hidden border-2 border-white/80 shadow-md hover:shadow-2xl transition-all duration-500 cursor-pointer bg-[#F0EEE6]"
                style={{ ringColor: styles.borderAccent }}
              >
                {isVideo ? (
                  <div className="relative">
                    <video
                      src={photo.url}
                      muted
                      loop
                      autoPlay
                      playsInline
                      className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    {/* Video Indicator Badge */}
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1.5 shadow-md">
                      <Play className="w-3 h-3 fill-current text-amber-400" />
                      <span>VIDEO</span>
                    </div>
                  </div>
                ) : (
                  <img
                    src={photo.url}
                    alt={photo.title}
                    className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                )}

                {/* Hover overlay with title & zoom icon */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-['Playfair_Display'] text-sm sm:text-base font-bold drop-shadow-sm flex items-center gap-1.5">
                        {isVideo && <Film className="w-4 h-4 text-amber-300 shrink-0" />}
                        <span>{photo.title}</span>
                      </h4>
                      {photo.caption && (
                        <p className="text-xs text-stone-200 line-clamp-2 mt-0.5 font-sans">
                          {photo.caption}
                        </p>
                      )}
                    </div>
                    <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm shrink-0 ml-2">
                      {isVideo ? <Play className="w-3.5 h-3.5 fill-current" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {filteredPhotos.length === 0 && (
          <div className="text-center py-12 text-[#78786A] text-sm">
            Belum ada foto untuk kategori ini.
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {activePhotoIndex !== null && filteredPhotos[activePhotoIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeLightbox}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={closeLightbox}
              className="absolute top-6 right-6 z-50 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Prev Button */}
            <button
              type="button"
              onClick={prevPhoto}
              className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Next Button */}
            <button
              type="button"
              onClick={nextPhoto}
              className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Active Image / Video Box */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[85vh] flex flex-col items-center"
            >
              {filteredPhotos[activePhotoIndex].mediaType === 'VIDEO' ? (
                <video
                  src={filteredPhotos[activePhotoIndex].url}
                  controls
                  autoPlay
                  className="max-h-[72vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/20"
                />
              ) : (
                <img
                  src={filteredPhotos[activePhotoIndex].url}
                  alt={filteredPhotos[activePhotoIndex].title}
                  className="max-h-[72vh] max-w-full rounded-2xl object-contain shadow-2xl"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="text-center mt-3 text-white">
                <h4 className="font-['Playfair_Display'] text-lg sm:text-xl font-bold flex items-center justify-center gap-2">
                  {filteredPhotos[activePhotoIndex].mediaType === 'VIDEO' && <Film className="w-4 h-4 text-amber-400 shrink-0" />}
                  <span>{filteredPhotos[activePhotoIndex].title}</span>
                </h4>
                {filteredPhotos[activePhotoIndex].caption && (
                  <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-lg">
                    {filteredPhotos[activePhotoIndex].caption}
                  </p>
                )}
                <span className="text-[11px] text-stone-400 mt-1 inline-block">
                  {activePhotoIndex + 1} / {filteredPhotos.length}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
