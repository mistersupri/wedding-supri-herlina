import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../../ui/Button.js';
import { Field, Textarea } from '../../ui/Field.js';
import { Modal } from '../../ui/Modal.js';
import {
  DEFAULT_INVITE_TEMPLATE,
  INVITE_PLACEHOLDERS,
  loadInviteTemplate,
  renderInvite,
  saveInviteTemplate,
  whatsappLink,
  whatsappNumber,
} from '../../../lib/inviteMessage.js';
import type { InvitedGuest } from '@shared/types';

/** Wording of the invitation message, saved on this device. Shows a live preview for a sample guest. */
export const InviteTemplateModal: React.FC<{ open: boolean; onClose: () => void; couple: string; sample?: InvitedGuest; onSaved: (t: string) => void }> = ({
  open,
  onClose,
  couple,
  sample,
  onSaved,
}) => {
  const [text, setText] = useState(loadInviteTemplate);
  useEffect(() => {
    if (open) setText(loadInviteTemplate());
  }, [open]);
  const preview = renderInvite(text, sample ?? { name: 'Budi Santoso', slug: 'A7K9' }, couple);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pesan undangan"
      description="Dipakai tombol Kirim WA dan Salin pesan. Tersimpan di perangkat ini."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={() => setText(DEFAULT_INVITE_TEMPLATE)}>
            Kembalikan bawaan
          </Button>
          <Button
            onClick={() => {
              saveInviteTemplate(text);
              onSaved(text);
              onClose();
            }}
            disabled={!text.includes('{link}')}
          >
            Simpan
          </Button>
        </>
      }
    >
      <Field
        label="Isi pesan"
        hint={`Penanda yang diganti otomatis: ${INVITE_PLACEHOLDERS.join(' ')}. Penanda {link} wajib ada. Gunakan *tebal* untuk huruf tebal di WhatsApp.`}
      >
        {(p) => <Textarea {...p} rows={10} value={text} onChange={(e) => setText(e.target.value)} />}
      </Field>
      <p className="mt-4 text-sm font-semibold">Contoh untuk {sample?.name ?? 'Budi Santoso'}</p>
      <pre className="mt-1.5 max-h-60 overflow-auto rounded-sm bg-paper-2 p-3 text-sm whitespace-pre-wrap break-words">{preview}</pre>
    </Modal>
  );
};

/**
 * Sends invitations one after another. Browsers allow only one WhatsApp tab per tap, so the queue
 * walks through the guests: tap "Buka WhatsApp", press send there, come back and the next guest is ready.
 */
export const InviteQueueModal: React.FC<{
  open: boolean;
  onClose: () => void;
  guests: InvitedGuest[];
  template: string;
  couple: string;
  onSent: (id: string) => void;
}> = ({ open, onClose, guests, template, couple, onSent }) => {
  // Fixed when the dialog opens, so marking one guest as sent does not reshuffle the queue.
  const [queue, setQueue] = useState<InvitedGuest[]>([]);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!open) return;
    setQueue(guests.filter((g) => !g.invitationSent && whatsappNumber(g.phone)));
    setIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const current = queue[index];
  const link = useMemo(() => (current ? whatsappLink(current.phone, renderInvite(template, current, couple)) : null), [current, template, couple]);
  const next = () => setIndex((i) => i + 1);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Kirim undangan berurutan"
      description={queue.length ? `Tamu ${Math.min(index + 1, queue.length)} dari ${queue.length}, hanya yang punya nomor WhatsApp dan belum terkirim.` : undefined}
      footer={
        <Button variant="ghost" onClick={onClose}>
          Selesai
        </Button>
      }
    >
      {queue.length === 0 ? (
        <p className="text-[15px] text-ink-soft">Tidak ada tamu yang belum dikirimi dan punya nomor WhatsApp. Isi nomor di data tamu, atau ubah status Terkirim.</p>
      ) : !current ? (
        <p className="text-[15px]">Semua {queue.length} undangan sudah diproses. Terima kasih!</p>
      ) : (
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-paper-2" role="progressbar" aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={index}>
            <div className="h-full bg-primary transition-all" style={{ width: `${(index / queue.length) * 100}%` }} />
          </div>
          <p className="mt-5 text-lg font-semibold break-words">{current.name}</p>
          <p className="text-sm text-ink-soft">
            {current.phone} · kode {current.slug}
          </p>
          <pre className="mt-3 max-h-52 overflow-auto rounded-sm bg-paper-2 p-3 text-sm whitespace-pre-wrap break-words">
            {renderInvite(template, current, couple)}
          </pre>
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href={link ?? '#'}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                onSent(current.id);
                next();
              }}
              className="inline-flex min-h-11 items-center rounded-sm bg-primary px-4 text-[15px] font-semibold text-on-primary hover:bg-primary-hover"
            >
              Buka WhatsApp &amp; tandai terkirim
            </a>
            <Button variant="secondary" onClick={next}>
              Lewati
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
