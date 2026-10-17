import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { IconButton } from './Button.js';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Open dialogs, innermost last. Only the innermost one answers Escape and traps Tab.
const dialogStack: object[] = [];

/**
 * Escape closes, Tab stays inside, focus returns to the opener, page scroll is locked.
 * Shared by every dialog, lightbox and full-screen sheet.
 */
export function useDialogBehaviour(open: boolean, onClose: () => void, panelRef: React.RefObject<HTMLElement | null>) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    // Explicit autofocus first, then the first control in the body, then anything (e.g. the close button).
    const first =
      panel?.querySelector<HTMLElement>('[data-autofocus]') ||
      panel?.querySelector<HTMLElement>(`[data-dialog-body] :is(${FOCUSABLE})`) ||
      panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first || panel)?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const token = {};
    dialogStack.push(token);

    const onKey = (e: KeyboardEvent) => {
      if (dialogStack[dialogStack.length - 1] !== token) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const [head, tail] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === head) {
        e.preventDefault();
        tail.focus();
      } else if (!e.shiftKey && document.activeElement === tail) {
        e.preventDefault();
        head.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      dialogStack.splice(dialogStack.indexOf(token), 1);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [open, panelRef]);
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Visually hide the title (still announced). */
  hideTitle?: boolean;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const WIDTHS = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl' };

/** Paper dialog. On phones it rises as a bottom sheet; from sm up it is centred. */
export const Modal: React.FC<ModalProps> = ({ open, onClose, title, hideTitle, description, size = 'md', children, footer }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  useDialogBehaviour(open, onClose, panelRef);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={`flex max-h-[92dvh] w-full ${WIDTHS[size]} flex-col rounded-t-md bg-card text-ink shadow-[0_24px_60px_-20px_rgba(20,12,6,0.45)] outline-none sm:rounded-md`}
          >
            <header className="flex items-start justify-between gap-4 border-b border-line px-5 pt-4 pb-3">
              <div className={hideTitle ? 'sr-only' : ''}>
                <h2 id={titleId} className="font-display text-xl leading-tight">
                  {title}
                </h2>
                {description && (
                  <p id={descId} className="mt-1 text-sm text-ink-soft">
                    {description}
                  </p>
                )}
              </div>
              <IconButton label="Tutup" onClick={onClose} className="-mr-2 -mt-1 ml-auto">
                <X className="h-5 w-5" />
              </IconButton>
            </header>
            <div data-dialog-body className="overflow-y-auto px-5 py-4">
              {children}
            </div>
            {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

interface ConfirmProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmProps> = ({
  open,
  title,
  message,
  confirmLabel,
  tone = 'danger',
  busy,
  onConfirm,
  onCancel,
}) => (
  <Modal
    open={open}
    onClose={onCancel}
    title={title}
    size="sm"
    footer={
      <>
        <button type="button" onClick={onCancel} data-autofocus className="min-h-11 rounded-sm px-4 text-sm font-semibold hover:bg-paper-2">
          Batal
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={`min-h-11 rounded-sm px-4 text-sm font-semibold text-white disabled:opacity-60 ${tone === 'danger' ? 'bg-no' : 'bg-primary'}`}
        >
          {confirmLabel}
        </button>
      </>
    }
  >
    <p className="text-sm leading-relaxed text-ink-soft">{message}</p>
  </Modal>
);
