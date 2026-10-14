import React from 'react';
import { motion } from 'motion/react';
import { Heart, Sparkles, Calendar } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.js';
import { LoveStoryItem } from '../../types.js';

interface LoveStorySectionProps {
  stories: LoveStoryItem[];
}

export const LoveStorySection: React.FC<LoveStorySectionProps> = ({ stories }) => {
  const { styles } = useTheme();

  if (!stories || stories.length === 0) return null;

  return (
    <section id="story-section" className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Section Heading */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5" style={{ color: styles.accent }} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] font-sans" style={{ color: styles.textSecondary }}>
              Our Journey
            </span>
          </div>
          <h2 className="font-['Playfair_Display'] text-3xl sm:text-4xl md:text-5xl font-semibold" style={{ color: styles.textPrimary }}>
            Kisah Cinta Kami
          </h2>
          <p className="text-sm text-[#78786A] mt-2">
            Setiap detik yang terukir adalah awal dari perjalanan abadi kami
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative border-l-2 ml-4 sm:ml-32 space-y-12" style={{ borderColor: styles.borderAccent }}>
          {stories.map((story, idx) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
              className="relative pl-6 sm:pl-8"
            >
              {/* Timeline Marker Dot */}
              <div
                className="absolute -left-[17px] top-1.5 w-8 h-8 rounded-full border-4 flex items-center justify-center bg-[#FDFCF9] shadow-sm"
                style={{ borderColor: styles.accent }}
              >
                <Heart className="w-3 h-3 fill-current" style={{ color: styles.accent }} />
              </div>

              {/* Year label for desktop */}
              <div
                className="hidden sm:block absolute -left-32 top-2 w-24 text-right font-['Playfair_Display'] font-bold text-lg"
                style={{ color: styles.accent }}
              >
                {story.year}
              </div>

              {/* Card Content */}
              <div
                className="p-5 sm:p-6 rounded-2xl border shadow-sm flex flex-col md:flex-row gap-5 items-start"
                style={{
                  backgroundColor: styles.bgSecondary,
                  borderColor: styles.borderAccent,
                }}
              >
                {story.photoUrl && (
                  <div className="w-full md:w-36 h-36 rounded-xl overflow-hidden shrink-0 border" style={{ borderColor: styles.borderAccent }}>
                    <img
                      src={story.photoUrl}
                      alt={story.title}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                <div className="flex-1">
                  {/* Mobile Year Tag */}
                  <div
                    className="sm:hidden inline-flex items-center gap-1 text-[10px] font-sans font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-2"
                    style={{ backgroundColor: styles.accentLight, color: styles.accent }}
                  >
                    <Calendar className="w-3 h-3" />
                    <span>{story.year}</span>
                  </div>

                  <h3 className="font-['Playfair_Display'] text-xl font-bold mb-2" style={{ color: styles.textPrimary }}>
                    {story.title}
                  </h3>
                  <p className="text-sm text-[#78786A] leading-relaxed">
                    {story.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
