import React from 'react';
import { useInvitation } from '../../InvitationContext.js';
import { useRsvpForm } from '../../hooks/useRsvpForm.js';
import { useUnlockForm } from '../../hooks/useUnlockForm.js';
import { ATTENDANCE_LABEL } from '../../../../lib/format.js';
import { ATTENDANCE_CHOICES } from './kit.js';

/**
 * RSVP markup shared by the illustrated templates. Each template styles it through a class
 * prefix (`gk`, `bf`, `ch`): `${p}-form`, `${p}-field`, `${p}-label`, `${p}-input`, `${p}-pills`,
 * `${p}-pill`, `${p}-stepper`, `${p}-submit`, `${p}-link`, `${p}-error`, `${p}-summary`.
 */
interface TemplateRsvpProps {
  prefix: string;
  submitLabel: string;
  confettiColors?: string[];
}

export const TemplateRsvp: React.FC<TemplateRsvpProps> = (props) => {
  const { guest } = useInvitation();
  return guest ? <RsvpForm {...props} /> : <UnlockForm prefix={props.prefix} />;
};

const UnlockForm: React.FC<{ prefix: string }> = ({ prefix: p }) => {
  const { unlock } = useInvitation();
  const f = useUnlockForm(unlock);
  return (
    <form id="buka-undangan" className={`${p}-form`} onSubmit={f.submit} noValidate>
      <p className={`${p}-note`}>
        Konfirmasi kehadiran, alamat lengkap, dan amplop digital terbuka untuk tamu terdaftar. Kodenya ada di pesan undangan yang kamu
        terima.
      </p>
      <label className={`${p}-field`}>
        <span className={`${p}-label`}>Kode undangan</span>
        <input
          className={`${p}-input ${p}-code`}
          value={f.code}
          onChange={(e) => f.setCode(e.target.value)}
          maxLength={4}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="R7K2"
          aria-invalid={Boolean(f.error)}
          aria-describedby={f.error ? `${p}-unlock-error` : undefined}
        />
      </label>
      {f.error && (
        <p id={`${p}-unlock-error`} role="alert" className={`${p}-error`}>
          {f.error}
        </p>
      )}
      <button type="submit" className={`${p}-submit`} disabled={f.busy}>
        {f.busy ? 'Memeriksa...' : 'Buka undangan saya'}
      </button>
    </form>
  );
};

const RsvpForm: React.FC<TemplateRsvpProps> = ({ prefix: p, submitLabel, confettiColors }) => {
  const f = useRsvpForm({ confettiColors });
  const { voice, existingWish } = f;

  if (f.isSent && existingWish) {
    return (
      <div className={`${p}-form ${p}-summary`} aria-live="polite">
        <p className={`${p}-label`}>Konfirmasimu sudah kami terima</p>
        <p className={`${p}-summary-name`}>Terima kasih, {f.guest.name}</p>
        <p className={`${p}-summary-line`}>
          {ATTENDANCE_LABEL[existingWish.attendanceStatus]}
          {existingWish.attendanceStatus === 'HADIR' ? ` · ${existingWish.numberOfGuests} orang` : ''}
        </p>
        <p className={`${p}-summary-msg`}>“{existingWish.message}”</p>
        <button type="button" className={`${p}-submit`} onClick={f.showSentPass}>
          Lihat kartu tamu
        </button>
        {f.whatsappHref && (
          <a className={`${p}-link`} href={f.whatsappHref} target="_blank" rel="noreferrer">
            Kabari mempelai lewat WhatsApp
          </a>
        )}
        {f.canEdit ? (
          <button type="button" className={`${p}-link`} onClick={f.startEditing}>
            Ubah kehadiran
          </button>
        ) : (
          <p className={`${p}-note`}>Perubahan kehadiran sudah dipakai (hanya satu kali).</p>
        )}
      </div>
    );
  }

  const recording = voice.status === 'recording';
  const hasVoice = voice.status !== 'idle';

  return (
    <form className={`${p}-form`} onSubmit={f.submit} noValidate>
      {f.editing && (
        <p className={`${p}-note`}>Kehadiran dan jumlah tamu hanya bisa diubah satu kali. Ucapan yang sudah dikirim tetap sama.</p>
      )}
      <div className={`${p}-field`}>
        <span className={`${p}-label`}>Nama</span>
        <p className={`${p}-input ${p}-static`}>
          {f.guest.name} <small>· {f.guest.pax} kursi</small>
        </p>
      </div>

      <fieldset className={`${p}-pills`}>
        <legend className={`${p}-label`}>Kehadiran</legend>
        {ATTENDANCE_CHOICES.map((c) => (
          <button
            key={c.value}
            type="button"
            className={`${p}-pill`}
            aria-pressed={f.attendance === c.value}
            onClick={() => f.setAttendance(c.value)}
          >
            {c.label}
          </button>
        ))}
      </fieldset>

      {f.attendance === 'HADIR' && (
        <div className={`${p}-stepper`}>
          <span className={`${p}-label`} id={`${p}-pax-label`}>
            Jumlah tamu
          </span>
          <div role="group" aria-labelledby={`${p}-pax-label`}>
            <button type="button" onClick={() => f.setPax(f.pax - 1)} disabled={f.pax <= 1} aria-label="Kurangi tamu">
              −
            </button>
            <output aria-live="polite">{f.pax}</output>
            <button type="button" onClick={() => f.setPax(f.pax + 1)} disabled={f.pax >= f.maxPax} aria-label="Tambah tamu">
              +
            </button>
          </div>
        </div>
      )}

      {!f.editing && (
        <>
          <label className={`${p}-field`}>
            <span className={`${p}-label`}>Ucapan</span>
            <textarea
              className={`${p}-input`}
              rows={3}
              value={f.message}
              readOnly={recording}
              onChange={(e) => f.setMessage(e.target.value)}
              placeholder={recording ? 'Sedang merekam...' : 'tulis doa & ucapan...'}
            />
          </label>
          {voice.supported && (
            <div className={`${p}-voice`}>
              {!hasVoice && (
                <button type="button" className={`${p}-link`} onClick={voice.start}>
                  Rekam pesan suara
                </button>
              )}
              {recording && (
                <button type="button" className={`${p}-link`} onClick={() => voice.stop()}>
                  ● Selesai merekam
                </button>
              )}
              {voice.audioUrl && <audio src={voice.audioUrl} controls aria-label="Pesan suaramu" />}
              {hasVoice && !recording && (
                <button type="button" className={`${p}-link`} onClick={voice.clear}>
                  Hapus rekaman
                </button>
              )}
            </div>
          )}
          {voice.error && <p className={`${p}-error`}>{voice.error}</p>}
        </>
      )}

      {f.error && (
        <p role="alert" className={`${p}-error`}>
          {f.error}
        </p>
      )}
      <button type="submit" className={`${p}-submit`} disabled={f.isPending}>
        {f.isPending ? 'Mengirim...' : f.editing ? 'Simpan perubahan' : submitLabel}
      </button>
      {f.editing && (
        <button type="button" className={`${p}-link`} onClick={f.cancelEditing}>
          Batal
        </button>
      )}
    </form>
  );
};
