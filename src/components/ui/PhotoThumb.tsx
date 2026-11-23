import React, { useState } from 'react';

/**
 * A photo that keeps its own shape. Guest photos are 4:5, or 9:16 when taken with a Story frame, so a fixed
 * 4:5 box would crop the Story ones. The box starts at 4:5 and settles to the real shape once the image has loaded.
 */
export const PhotoThumb: React.FC<{ src: string; alt?: string; className?: string; imgClassName?: string; fallbackRatio?: number }> = ({
  src,
  alt = '',
  className = '',
  imgClassName = '',
  fallbackRatio = 4 / 5,
}) => {
  const [ratio, setRatio] = useState<number | null>(null);
  return (
    <span className={`block overflow-hidden ${className}`} style={{ aspectRatio: String(ratio ?? fallbackRatio) }}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={(e) => {
          const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
          if (w && h) setRatio(w / h);
        }}
        className={`h-full w-full object-cover ${imgClassName}`}
      />
    </span>
  );
};
