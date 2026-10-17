import React from 'react';
import { Lightbox } from '../ui/Lightbox.js';
import type { GalleryPhoto } from '@shared/types';

interface GalleryLightboxProps {
  items: GalleryPhoto[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
}

/** Full-screen viewer for gallery photos and videos, shared by every template. */
export const GalleryLightbox: React.FC<GalleryLightboxProps> = ({ items, index, onIndexChange }) => {
  const current = index !== null ? items[index] : null;
  return (
    <Lightbox
      open={current != null}
      label="Galeri foto"
      index={index ?? 0}
      count={items.length}
      itemKey={current?.id || ''}
      onClose={() => onIndexChange(null)}
      onIndexChange={onIndexChange}
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
  );
};
