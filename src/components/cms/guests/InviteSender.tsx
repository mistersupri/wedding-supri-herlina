import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../../ui/Button.js';
import { Field, Select, Textarea } from '../../ui/Field.js';
import { Modal } from '../../ui/Modal.js';
import {
  DEFAULT_TEMPLATES,
  INVITE_PLACEHOLDERS,
  MESSAGE_KINDS,
  loadTemplate,
  renderInvite,
  saveTemplate,
  whatsappLink,
  whatsappNumber,
  type MessageKind,
} from '../../../lib/inviteMessage.js';
import type { InvitedGuest } from '@shared/types';

/** Wording of the WhatsApp messages (invitation and reminders), saved on this device, with a live preview for a sample guest. */
export const InviteTemplateModal: React.FC<{
  open: boolean;
  onClose: () => void;
  couple: string;
  sample?: InvitedGuest;
  /** Which message to edit first. */
  initialKind?: MessageKind;
  onSaved: (kind: MessageKind, text: string) => void;
}> = ({ open, onClose, couple, sample, initialKind = 'invite', onSaved }) => {
  const [kind, setKind] = useState<MessageKind>(initialKind);
  const [text, setText] = useState(() => loadTemplate(initialKind));
  useEffect(() => {
    if (!open) return;
    setKind(initialKind);
    setText(loadTemplate(initialKind));
  }, [open, initialKind]);
  const pick = (next: MessageKind) => {
    setKind(next);
    setText(loadTemplate(next));
  };
  const preview = renderInvite(text, sample ?? { name: 'Budi Santoso', slug: 'A7K9' }, couple);
  const meta = MESSAGE_KINDS.find((k) => k.id === kind)!;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pesan WhatsApp"
      description="Dipakai tombol Kirim WhatsApp dan Salin pesan. Tersimpan di perangkat ini."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={() => setText(DEFAULT_TEMPLATES[kind])}>
            Kembalikan bawaan
          </Button>
          <Button
            onClick={() => {
              saveTemplate(kind, text);
              onSaved(kind, text);
              onClose();
            }}
            disabled={!text.includes('{link}')}
          >
            Simpan pesan
          </Button>
        </>
      }
    >
      <Field label="Jenis pesan" hint={meta.detail}>
        {(p) => (
          <Select {...p} value={kind} onChange={(e) => pick(e.target.value as MessageKind)}>
            {MESSAGE_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div className="mt-4">
        <Field
          label="Isi pesan"
          hint={`Penanda yang diganti otomatis: ${INVITE_PLACEHOLDERS.join(' ')}. Penanda {link} wajib ada. Gunakan *tebal* untuk huruf tebal di WhatsApp.`}
        >
          {(p) => <Textarea {...p} rows={10} value={text} onChange={(e) => setText(e.target.value)} />}
        </Field>
      </div>
      <p className="mt-4 text-sm font-semibold">Contoh untuk {sample?.name ?? 'Budi Santoso'}</p>
      <pre className="mt-1.5 max-h-60 overflow-auto rounded-sm bg-paper-2 p-3 text-sm whitespace-pre-wrap break-words">{preview}</pre>
    </Modal>
  );
};

/** A reminder is skipped while the last one is this fresh, so a guest is never nudged twice in a row. */
export const REMINDER_COOLDOWN_MS = 12 * 60 * 60 * 1000;

export interface QueueJob {
  kind: MessageKind;
  title: string;
  guests: InvitedGuest[];
}

/**
 * Sends messages one after another. Browsers allow only one WhatsApp tab per tap, so the queue
 * walks through the guests: tap "Buka WhatsApp", press send there, come back and the next guest is ready.
 * An invitation queue skips guests already marked as sent; a reminder queue skips guests reminded in the last 12 hours.
 */
export const InviteQueueModal: React.FC<{
  open: boolean;
  onClose: () => void;
  job: QueueJob | null;
  couple: string;
  /** The message was opened in WhatsApp for this guest. */
  onSent: (kind: MessageKind, id: string) => void;
}> = ({ open, onClose, job, couple, onSent }) => {
  // Fixed when the dialog opens, so marking one guest as sent does not reshuffle the queue.
  const [queue, setQueue] = useState<InvitedGuest[]>([]);
  const [skipped, setSkipped] = useState({ noPhone: 0, recent: 0 });
  const [index, setIndex] = useState(0);
  const [template, setTemplate] = useState('');
  useEffect(() => {
    if (!open || !job) return;
    const now = Date.now();
    const isInvite = job.kind === 'invite';
    let noPhone = 0;
    let recent = 0;
    const ready = job.guests.filter((g) => {
      if (isInvite && g.invitationSent) return false;
      if (!whatsappNumber(g.phone)) return noPhone++, false;
      if (!isInvite && g.lastRemindedAt && now - new Date(g.lastRemindedAt).getTime() < REMINDER_COOLDOWN_MS) return recent++, false;
      return true;
    });
    setQueue(ready);
    setSkipped({ noPhone, recent });
    setIndex(0);
    setTemplate(loadTemplate(job.kind));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const current = queue[index];
  const link = useMemo(() => (current ? whatsappLink(current.phone, renderInvite(template, current, couple)) : null), [current, template, couple]);
  const next = () => setIndex((i) => i + 1);
  const isInvite = job?.kind === 'invite';
  const skippedNote = [
    skipped.noPhone ? `${skipped.noPhone} tamu tanpa nomor WhatsApp dilewati` : '',
    skipped.recent ? `${skipped.recent} tamu yang baru diingatkan (kurang dari 12 jam) dilewati` : '',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={job?.title ?? 'Kirim pesan berurutan'}
      description={queue.length ? `Tamu ${Math.min(index + 1, queue.length)} dari ${queue.length}.${skippedNote ? ` ${skippedNote}.` : ''}` : undefined}
      footer={
        <Button variant="ghost" onClick={onClose}>
          Selesai
        </Button>
      }
    >
      {queue.length === 0 ? (
        <p className="text-[15px] text-ink-soft">
          Tidak ada tamu yang bisa dikirimi sekarang.{skippedNote ? ` ${skippedNote}.` : ''}{' '}
          {isInvite ? 'Isi nomor di data tamu, atau ubah status Terkirim.' : 'Isi nomor WhatsApp di data tamu, atau tunggu sampai jeda 12 jam berlalu.'}
        </p>
      ) : !current ? (
        <p className="text-[15px]">Semua {queue.length} pesan sudah diproses. Terima kasih!</p>
      ) : (
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-paper-2" role="progressbar" aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={index}>
            <div className="h-full bg-primary transition-all" style={{ width: `${(index / queue.length) * 100}%` }} />
          </div>
          <p className="mt-5 text-lg font-semibold break-words">{current.name}</p>
          <p className="text-sm text-ink-soft">
            {current.phone} · kode {current.slug}
            {!isInvite && current.reminderCount ? ` · sudah diingatkan ${current.reminderCount}×` : ''}
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
                onSent(job!.kind, current.id);
                next();
              }}
              className="inline-flex min-h-11 items-center rounded-sm bg-primary px-4 text-[15px] font-semibold text-on-primary hover:bg-primary-hover"
            >
              {isInvite ? 'Buka WhatsApp dan tandai terkirim' : 'Buka WhatsApp dan tandai diingatkan'}
            </a>
            <Button variant="secondary" onClick={next}>
              Lewati tamu ini
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
