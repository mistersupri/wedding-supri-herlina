import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { IconButton } from './Button.js';
import { useDialogBehaviour } from './Modal.js';

interface LightboxProps {
  open: boolean;
  label: string;
  index: number;
  count: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  /** Re-keys the media so each item animates in. */
  itemKey: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Full-screen viewer: arrows, Escape, Tab trap and horizontal swipe. */
export const Lightbox: React.FC<LightboxProps> = ({ open, label, index, count, onClose, onIndexChange, itemKey, children, footer }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  useDialogBehaviour(open, onClose, panelRef);

  const step = (delta: number) => count > 0 && onIndexChange((index + delta + count) % count);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          tabIndex={-1}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="on-deep fixed inset-0 z-50 flex flex-col outline-none"
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1);
            touchX.current = null;
          }}
        >
          <div className="flex items-center justify-between px-3 py-2">
            <p className="px-2 text-sm text-on-deep-soft" aria-live="polite">
              {index + 1} dari {count}
            </p>
            <IconButton tone="deep" label="Tutup" onClick={onClose}>
              <X className="h-6 w-6" />
            </IconButton>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16">
            <AnimatePresence mode="wait">
              <motion.div
                key={itemKey}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex h-full w-full items-center justify-center"
              >
                {children}
              </motion.div>
            </AnimatePresence>
            {count > 1 && (
              <>
                <IconButton tone="deep" label="Sebelumnya" onClick={() => step(-1)} className="absolute left-1 bg-deep/60 sm:left-4">
                  <ChevronLeft className="h-6 w-6" />
                </IconButton>
                <IconButton tone="deep" label="Berikutnya" onClick={() => step(1)} className="absolute right-1 bg-deep/60 sm:right-4">
                  <ChevronRight className="h-6 w-6" />
                </IconButton>
              </>
            )}
          </div>

          {footer && <div className="px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
