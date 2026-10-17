import React from 'react';
import { motion } from 'motion/react';
import { KawungDivider } from '../ui/Kawung.js';
import { useInvitation } from '../../features/invitation/InvitationContext.js';
import { dateParts } from '../../lib/format.js';

/** Full-screen cover addressed to the guest. Lifts away like a cloth when opened. */
export const CoverEnvelope: React.FC = () => {
  const { invitation, displayName: recipientName, guest, open: onOpen } = useInvitation();
  const date = dateParts(invitation.weddingDate);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Sampul undangan"
      className="on-deep kawung-field fixed inset-0 z-50 overflow-y-auto"
      exit={{ y: '-100%', transition: { duration: 0.9, ease: [0.65, 0, 0.35, 1] } }}
    >
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-between px-6 py-10 text-center">
        <p className="text-sm text-on-deep-soft">Undangan Pernikahan</p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="my-10"
        >
          <h1 className="font-display text-[clamp(3rem,15vw,4.75rem)] leading-[0.95] italic">
            <span className="block">{invitation.groomShortName}</span>
            <span className="my-1 block text-[0.55em] text-prada-on-deep not-italic" aria-label="dan">
              &amp;
            </span>
            <span className="block">{invitation.brideShortName}</span>
          </h1>
          <p className="display-numeral mt-6 text-lg tracking-wide text-on-deep-soft">
            {date.weekday}, {date.day} · {date.month} · {date.year}
          </p>
        </motion.div>

        <div className="w-full">
          <KawungDivider tone="deep" className="mb-6" />
          <p className="text-sm text-on-deep-soft">Kepada Yth. Bapak/Ibu/Saudara/i</p>
          <p className="mt-1 font-display text-2xl leading-snug break-words">{recipientName}</p>
          {guest ? (
            <p className="mt-2 text-sm text-on-deep-soft">
              Kode undangan <span className="font-semibold tracking-wider text-prada-on-deep">{guest.slug}</span> · {guest.pax} kursi
            </p>
          ) : (
            <p className="mt-2 text-xs text-on-deep-soft">Mohon maaf apabila ada kesalahan penulisan nama atau gelar.</p>
          )}

          <button
            type="button"
            onClick={onOpen}
            className="mt-8 min-h-12 w-full rounded-sm bg-on-deep px-6 font-semibold text-deep transition-colors hover:bg-white"
          >
            Buka undangan
          </button>
        </div>
      </div>
    </motion.div>
  );
};
