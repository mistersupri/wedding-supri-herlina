import React from 'react';
import { Mic, Square, Trash2 } from 'lucide-react';
import { useRsvpForm } from '../../../features/invitation/hooks/useRsvpForm.js';
import { Button, buttonClass } from '../../ui/Button.js';
import { Field, Segmented, Select, Textarea } from '../../ui/Field.js';
import { StatusChip } from '../../ui/StatusChip.js';
import type { AttendanceStatus } from '@shared/types';

const ATTENDANCE_OPTIONS: { value: AttendanceStatus; label: string; activeClass: string }[] = [
  { value: 'HADIR', label: 'Hadir', activeClass: 'border-ok bg-ok text-white' },
  { value: 'TIDAK_HADIR', label: 'Tidak hadir', activeClass: 'border-no bg-no text-white' },
  { value: 'RAGU', label: 'Ragu', activeClass: 'border-maybe bg-maybe text-white' },
];

/** Nusantara layout for the RSVP form; all state lives in useRsvpForm. */
export const RsvpPanel: React.FC = () => {
  const f = useRsvpForm();
  const { guest, existingWish, editing, voice } = f;

  // --- Sent: summary ---
  if (f.isSent && existingWish) {
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
          <Button onClick={f.showSentPass}>Lihat kartu tamu</Button>
          {f.whatsappHref && (
            <a href={f.whatsappHref} target="_blank" rel="noreferrer" className={buttonClass('secondary')}>
              Kabari mempelai lewat WhatsApp
            </a>
          )}
          {!f.canEdit ? (
            <p className="mt-1 text-sm text-ink-soft">Perubahan kehadiran sudah dipakai (hanya satu kali).</p>
          ) : (
            <Button variant="ghost" onClick={f.startEditing}>
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
  const paxOptions = Array.from({ length: f.maxPax }, (_, i) => i + 1);

  return (
    <form onSubmit={f.submit} noValidate>
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
        <Segmented<AttendanceStatus> name="Kehadiran" value={f.attendance} options={ATTENDANCE_OPTIONS} onChange={f.setAttendance} />
      </fieldset>

      {f.attendance === 'HADIR' && (
        <Field label="Jumlah tamu yang datang" hint={`Sesuai undangan, maksimal ${guest.pax} orang.`} className="mt-4">
          {(p) => (
            <Select {...p} value={f.pax} onChange={(e) => f.setPax(Number(e.target.value))}>
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
                value={f.message}
                readOnly={recording}
                onChange={(e) => f.setMessage(e.target.value)}
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

      {f.error && (
        <p role="alert" className="mt-4 text-sm font-medium text-no">
          {f.error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button type="submit" loading={f.isPending} className="flex-1">
          {editing ? 'Simpan perubahan' : 'Kirim konfirmasi'}
        </Button>
        {editing && (
          <Button variant="ghost" onClick={f.cancelEditing}>
            Batal
          </Button>
        )}
      </div>
    </form>
  );
};
