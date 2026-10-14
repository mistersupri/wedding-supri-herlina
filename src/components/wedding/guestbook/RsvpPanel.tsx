import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import { Mic, Square, Trash2 } from 'lucide-react';
import { publicApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { readLocal, writeLocal } from '../../../lib/guestSession.js';
import { ATTENDANCE_LABEL } from '../../../lib/format.js';
import { useVoiceRecorder } from '../../../hooks/useVoiceRecorder.js';
import { Button, buttonClass } from '../../ui/Button.js';
import { Field, Segmented, Select, Textarea } from '../../ui/Field.js';
import { StatusChip } from '../../ui/StatusChip.js';
import type { AttendanceStatus, GuestWish, InvitationData, PublicGuest } from '../../../types.js';

const ATTENDANCE_OPTIONS: { value: AttendanceStatus; label: string; activeClass: string }[] = [
  { value: 'HADIR', label: 'Hadir', activeClass: 'border-ok bg-ok text-white' },
  { value: 'TIDAK_HADIR', label: 'Tidak hadir', activeClass: 'border-no bg-no text-white' },
  { value: 'RAGU', label: 'Ragu', activeClass: 'border-maybe bg-maybe text-white' },
];

/** wa.me link filled from the couple's template ({nama_tamu}, {status_kehadiran}, {jumlah_tamu}, {ucapan}). */
function whatsappUrl(inv: InvitationData, wish: GuestWish) {
  const text = (inv.whatsappTemplate || 'Halo, saya {nama_tamu} mengonfirmasi {status_kehadiran}.')
    .replace(/{nama_tamu}/g, wish.guestName)
    .replace(/{status_kehadiran}/g, ATTENDANCE_LABEL[wish.attendanceStatus])
    .replace(/{jumlah_tamu}/g, String(wish.numberOfGuests))
    .replace(/{ucapan}/g, wish.message);
  return `https://wa.me/${inv.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
}

const editedKey = (name: string) => `wedding_rsvp_edited_${name.trim().toLowerCase()}`;

function celebrate() {
  confetti({
    particleCount: 70,
    spread: 70,
    origin: { y: 0.7 },
    colors: ['#B4862E', '#D6AD5B', '#F4ECDF', '#6E3B1E'],
    disableForReducedMotion: true,
  });
}

interface RsvpPanelProps {
  invitation: InvitationData;
  guest: PublicGuest;
  existingWish: GuestWish | null;
  onShowPass: (rsvp: { attendance: AttendanceStatus; pax: number }) => void;
}

/**
 * One RSVP per invited guest. After sending, the guest may change attendance and seats once;
 * the message itself stays as sent.
 */
export const RsvpPanel: React.FC<RsvpPanelProps> = ({ invitation, guest, existingWish, onShowPass }) => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [hasEdited, setHasEdited] = useState(() => readLocal(editedKey(guest.name), false));
  const [attendance, setAttendance] = useState<AttendanceStatus>(existingWish?.attendanceStatus || 'HADIR');
  const [pax, setPax] = useState(existingWish?.numberOfGuests || guest.pax || 1);
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const voice = useVoiceRecorder(setMessage);

  useEffect(() => {
    if (!existingWish) return;
    setAttendance(existingWish.attendanceStatus);
    setPax(existingWish.numberOfGuests);
  }, [existingWish]);

  const mutation = useMutation({
    mutationFn: publicApi.submitWish,
    onSuccess: (wish) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guestbook });
      celebrate();
      if (editing) {
        writeLocal(editedKey(guest.name), true);
        setHasEdited(true);
        setEditing(false);
      }
      setMessage('');
      voice.clear();
      onShowPass({ attendance: wish.attendanceStatus, pax: wish.numberOfGuests });
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const base = {
      guestName: guest.name,
      relationship: guest.category || 'Tamu Undangan',
      attendanceStatus: attendance,
      numberOfGuests: pax,
    };

    if (editing && existingWish) {
      mutation.mutate({ ...base, message: existingWish.message, voiceUrl: existingWish.voiceUrl ?? null });
      return;
    }
    const voiceUrl = voice.status === 'idle' ? null : await voice.stop();
    if (!message.trim() && !voiceUrl) {
      setFormError('Tuliskan ucapan atau rekam pesan suara terlebih dahulu.');
      return;
    }
    mutation.mutate({ ...base, message: message.trim(), voiceUrl });
  };

  // --- Sent: summary ---
  if (existingWish && !editing) {
    return (
      <div aria-live="polite">
        <p className="text-sm font-semibold text-ok">Konfirmasi Anda sudah kami terima</p>
        <h3 className="mt-1 font-display text-2xl leading-tight">Terima kasih, {guest.name}</h3>
        <dl className="mt-5 space-y-3 text-[15px]">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-soft">Kehadiran</dt>
            <dd>
              <StatusChip status={existingWish.attendanceStatus} />
            </dd>
          </div>
          {existingWish.attendanceStatus === 'HADIR' && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-soft">Jumlah tamu</dt>
              <dd className="font-semibold">{existingWish.numberOfGuests} orang</dd>
            </div>
          )}
          <div>
            <dt className="text-ink-soft">Ucapan</dt>
            <dd className="mt-1 leading-relaxed break-words">{existingWish.message}</dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={() => onShowPass({ attendance: existingWish.attendanceStatus, pax: existingWish.numberOfGuests })}>
            Lihat kartu tamu
          </Button>
          {invitation.whatsappNumber && (
            <a href={whatsappUrl(invitation, existingWish)} target="_blank" rel="noreferrer" className={buttonClass('secondary')}>
              Kabari mempelai lewat WhatsApp
            </a>
          )}
          {hasEdited ? (
            <p className="mt-1 text-sm text-ink-soft">Perubahan kehadiran sudah dipakai (hanya satu kali).</p>
          ) : (
            <Button variant="ghost" onClick={() => setEditing(true)}>
              Ubah kehadiran
            </Button>
          )}
        </div>
      </div>
    );
  }

  // --- Form ---
  const recording = voice.status === 'recording';
  const hasVoice = voice.status !== 'idle';
  const paxOptions = Array.from({ length: Math.max(guest.pax, 1) }, (_, i) => i + 1);

  return (
    <form onSubmit={submit} noValidate>
      <h3 className="font-display text-2xl leading-tight">{editing ? 'Ubah kehadiran' : 'Konfirmasi kehadiran'}</h3>
      <p className="mt-1 text-sm text-ink-soft">
        Atas nama <span className="font-semibold text-ink">{guest.name}</span> · {guest.pax} kursi
      </p>
      {editing && (
        <p className="mt-3 rounded-xs bg-maybe-bg px-3 py-2 text-sm text-maybe">
          Kehadiran dan jumlah tamu hanya bisa diubah satu kali. Ucapan yang sudah dikirim tetap sama.
        </p>
      )}

      <fieldset className="mt-5">
        <legend className="mb-1.5 text-sm font-semibold">Apakah Anda akan hadir?</legend>
        <Segmented<AttendanceStatus> name="Kehadiran" value={attendance} options={ATTENDANCE_OPTIONS} onChange={setAttendance} />
      </fieldset>

      {attendance === 'HADIR' && (
        <Field label="Jumlah tamu yang datang" hint={`Sesuai undangan, maksimal ${guest.pax} orang.`} className="mt-4">
          {(p) => (
            <Select {...p} value={pax} onChange={(e) => setPax(Number(e.target.value))}>
              {paxOptions.map((n) => (
                <option key={n} value={n}>
                  {n} orang
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}

      {!editing && (
        <>
          <Field
            label="Ucapan dan doa"
            hint={recording ? 'Sedang merekam. Ucapan Anda ditulis otomatis bila peramban mendukung.' : undefined}
            className="mt-4"
          >
            {(p) => (
              <Textarea
                {...p}
                rows={4}
                value={message}
                readOnly={recording}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setFormError(null);
                }}
                placeholder="Tuliskan doa terbaik untuk kedua mempelai"
              />
            )}
          </Field>

          {voice.supported && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {!hasVoice && (
                <Button variant="secondary" size="sm" onClick={voice.start}>
                  <Mic className="h-4 w-4" aria-hidden="true" />
                  Rekam pesan suara
                </Button>
              )}
              {recording && (
                <Button variant="danger" size="sm" onClick={() => voice.stop()}>
                  <Square className="h-3.5 w-3.5" aria-hidden="true" />
                  Selesai merekam
                </Button>
              )}
              {voice.audioUrl && <audio src={voice.audioUrl} controls className="h-10 max-w-full flex-1" aria-label="Pesan suara Anda" />}
              {hasVoice && !recording && (
                <Button variant="ghost" size="sm" onClick={voice.clear}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Hapus rekaman
                </Button>
              )}
            </div>
          )}
          {voice.error && <p className="mt-2 text-sm text-no">{voice.error}</p>}
        </>
      )}

      {formError && (
        <p role="alert" className="mt-4 text-sm font-medium text-no">
          {formError}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button type="submit" loading={mutation.isPending} className="flex-1">
          {editing ? 'Simpan perubahan' : 'Kirim konfirmasi'}
        </Button>
        {editing && (
          <Button variant="ghost" onClick={() => setEditing(false)}>
            Batal
          </Button>
        )}
      </div>
    </form>
  );
};
