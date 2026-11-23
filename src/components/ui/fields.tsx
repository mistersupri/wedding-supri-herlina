import React, { useState } from 'react';
import { Check, Eye, EyeOff } from 'lucide-react';
import { parsePhone, PHONE_PATTERN } from '@shared/phone';
import { cleanInstagram, INSTAGRAM_PATTERN } from '@shared/handles';
import { checkInstagram, composeEventTime, formatIdDate, isAfter, parseEventTime, parseIdDate, TIME_ZONES, type TimeZoneName } from '../../lib/inputs.js';
import { Field, Input, Select } from './Field.js';

/** Characters a phone number may contain while it is being typed. */
const PHONE_TYPING = /[^0-9+\s().-]/g;

interface PhoneFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  /** "local" keeps 0812-3456-7890; "international" keeps 6281234567890, the form wa.me links use. */
  format?: 'local' | 'international';
  optional?: boolean;
  hint?: string;
  /** An error from the form's own check; it wins over the field's. */
  error?: string | null;
  className?: string;
  autoComplete?: string;
}

/**
 * A mobile number: phone keypad on phones, only phone characters accepted, tidied to one format when the
 * field is left, and an immediate "read as" line so a mistyped digit is noticed before saving.
 */
export const PhoneField: React.FC<PhoneFieldProps> = ({ label = 'Nomor WhatsApp', value, onChange, format = 'local', optional, hint, error, className, autoComplete = 'off' }) => {
  const [touched, setTouched] = useState(false);
  const parsed = parsePhone(value);
  const own = touched && value.trim() && !parsed ? 'Nomor belum benar. Contoh: 0812-3456-7890 atau +62 812 3456 7890.' : null;
  const reading = parsed && value.trim() ? (parsed.indonesian ? `Terbaca sebagai +62 ${parsed.display.slice(1)}` : `Terbaca sebagai ${parsed.display}`) : null;

  return (
    <Field
      label={label}
      aside={optional ? 'opsional' : undefined}
      error={error ?? own}
      hint={hint ?? (format === 'international' ? 'Boleh ditulis 0812..., tersimpan sebagai 62812... untuk tautan WhatsApp.' : 'Contoh: 0812-3456-7890. Nomor luar negeri diawali +.')}
      className={className}
    >
      {(p) => (
        <>
          <Input
            {...p}
            type="tel"
            inputMode="tel"
            autoComplete={autoComplete}
            pattern={PHONE_PATTERN}
            maxLength={24}
            value={value}
            placeholder="0812-3456-7890"
            onChange={(e) => onChange(e.target.value.replace(PHONE_TYPING, ''))}
            onBlur={() => {
              setTouched(true);
              if (parsed) onChange(format === 'international' ? parsed.international : parsed.display);
            }}
          />
          {reading && !(error ?? own) && (
            <span className="-mt-0.5 flex items-center gap-1 text-xs font-medium text-ok" aria-live="polite">
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> {reading}
            </span>
          )}
        </>
      )}
    </Field>
  );
};

/** Instagram name with a fixed "@": pasted links and @names are reduced to the bare handle. */
export const InstagramField: React.FC<{ label?: string; value: string; onChange: (value: string) => void; optional?: boolean; error?: string | null; className?: string }> = ({
  label = 'Instagram',
  value,
  onChange,
  optional = true,
  error,
  className,
}) => {
  const [touched, setTouched] = useState(false);
  const own = touched ? checkInstagram(value) : null;
  return (
    <Field label={label} aside={optional ? 'opsional' : undefined} hint="Nama pengguna saja. Tautan profil yang ditempel dirapikan otomatis." error={error ?? own} className={className}>
      {(p) => (
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[15px] text-ink-soft" aria-hidden="true">
            @
          </span>
          <Input
            {...p}
            className="pl-8"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={80}
            pattern={INSTAGRAM_PATTERN}
            value={value}
            placeholder="nama.pengguna"
            onChange={(e) => onChange(cleanInstagram(e.target.value))}
            onBlur={() => setTouched(true)}
          />
        </div>
      )}
    </Field>
  );
};

/** How hard a password is to guess, 0 to 4, from length and variety. A hint for the person typing, not a guarantee. */
export function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  const labels = ['Terlalu pendek', 'Lemah', 'Cukup', 'Kuat', 'Sangat kuat'];
  if (pw.length < 6) return { score: 0, label: pw ? labels[0] : '' };
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(pw)).length;
  const score = Math.min(4, 1 * Number(pw.length >= 8) + Number(pw.length >= 12) + Number(variety >= 3) + Number(variety === 4 || pw.length >= 16)) as 0 | 1 | 2 | 3 | 4;
  const s = (score === 0 ? 1 : score) as 1 | 2 | 3 | 4;
  return { score: s, label: labels[s] };
}

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  hint?: string;
  error?: string | null;
  /** Show the strength meter (for choosing a new password). */
  strength?: boolean;
  required?: boolean;
  minLength?: number;
  className?: string;
  autoFocus?: boolean;
}

/** Password with a show/hide button, a Caps Lock warning, and optionally a strength meter. */
export const PasswordField: React.FC<PasswordFieldProps> = ({ label, value, onChange, autoComplete, hint, error, strength, required = true, minLength, className, autoFocus }) => {
  const [shown, setShown] = useState(false);
  const [caps, setCaps] = useState(false);
  const s = strength ? passwordStrength(value) : null;
  const tone = ['bg-no', 'bg-no', 'bg-prada', 'bg-ok', 'bg-ok'];
  return (
    <Field label={label} hint={caps ? 'Caps Lock sedang aktif.' : hint} error={error} className={className}>
      {(p) => (
        <>
          <div className="relative">
            <Input
              {...p}
              type={shown ? 'text' : 'password'}
              autoComplete={autoComplete}
              autoCapitalize="none"
              spellCheck={false}
              required={required}
              minLength={minLength}
              autoFocus={autoFocus}
              className="pr-12"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyUp={(e) => setCaps(e.getModifierState?.('CapsLock') ?? false)}
              onBlur={() => setCaps(false)}
            />
            <button
              type="button"
              onClick={() => setShown((v) => !v)}
              aria-pressed={shown}
              aria-label={shown ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              className="absolute inset-y-0 right-0 grid w-11 place-items-center text-ink-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
            >
              {shown ? <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" /> : <Eye className="h-[18px] w-[18px]" aria-hidden="true" />}
            </button>
          </div>
          {s && value && (
            <div className="flex items-center gap-2" aria-live="polite">
              <div className="flex flex-1 gap-1" aria-hidden="true">
                {[1, 2, 3, 4].map((n) => (
                  <span key={n} className={`h-1 flex-1 rounded-full ${s.score >= n ? tone[s.score] : 'bg-paper-2'}`} />
                ))}
              </div>
              <span className="text-xs text-ink-soft">{s.label}</span>
            </div>
          )}
        </>
      )}
    </Field>
  );
};

/** A calendar date picked from the native date control; the event keeps it as the long Indonesian text templates print. */
export const DateField: React.FC<{ label?: string; value: string; onChange: (text: string) => void; error?: string | null; className?: string }> = ({
  label = 'Tanggal',
  value,
  onChange,
  error,
  className,
}) => {
  const iso = parseIdDate(value) ?? '';
  const legacy = value.trim() && !iso;
  return (
    <Field
      label={label}
      error={error}
      hint={iso ? `Tampil di undangan: ${formatIdDate(iso)}` : legacy ? `Tanggal lama "${value}" belum terbaca. Pilih tanggal untuk menggantinya.` : 'Pilih dari kalender.'}
      className={className}
    >
      {(p) => <Input {...p} type="date" required value={iso} min="2000-01-01" max="2100-12-31" onChange={(e) => onChange(formatIdDate(e.target.value))} />}
    </Field>
  );
};

/** Start and end time with one time-zone choice. Stored as "08:00 WIB" so templates print it as is. */
export const TimeRangeFields: React.FC<{ start: string; end: string; onChange: (start: string, end: string) => void; error?: string | null }> = ({ start, end, onChange, error }) => {
  const a = parseEventTime(start);
  const b = parseEventTime(end);
  const zone: TimeZoneName = start.trim() ? a.zone : b.zone;
  const bad = a.time && b.time && !isAfter(b.time, a.time) ? 'Jam selesai harus setelah jam mulai.' : null;
  const legacy = (start.trim() && !a.time) || (end.trim() && !b.time);
  const emit = (t1: string, t2: string, z: TimeZoneName) => onChange(composeEventTime(t1, z), composeEventTime(t2, z));
  return (
    <>
      <Field label="Mulai" error={error}>
        {(p) => <Input {...p} type="time" required value={a.time} onChange={(e) => emit(e.target.value, b.time, zone)} />}
      </Field>
      <Field label="Selesai" error={bad}>
        {(p) => <Input {...p} type="time" required value={b.time} onChange={(e) => emit(a.time, e.target.value, zone)} />}
      </Field>
      <Field label="Zona waktu" className="sm:col-span-2" hint={legacy ? 'Jam lama belum terbaca. Pilih jam untuk menggantinya.' : undefined}>
        {(p) => (
          <Select {...p} value={zone} onChange={(e) => emit(a.time, b.time, e.target.value as TimeZoneName)}>
            {TIME_ZONES.map((z) => (
              <option key={z} value={z}>
                {z === 'WIB' ? 'WIB (Jakarta)' : z === 'WITA' ? 'WITA (Makassar)' : 'WIT (Jayapura)'}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </>
  );
};
