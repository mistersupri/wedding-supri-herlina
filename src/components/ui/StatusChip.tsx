import React from 'react';
import { ATTENDANCE_LABEL } from '../../lib/format.js';
import type { AttendanceStatus } from '@shared/types';

const TONES: Record<AttendanceStatus, string> = {
  HADIR: 'bg-ok-bg text-ok',
  TIDAK_HADIR: 'bg-no-bg text-no',
  RAGU: 'bg-maybe-bg text-maybe',
};

export const StatusChip: React.FC<{ status: AttendanceStatus; suffix?: string }> = ({ status, suffix }) => (
  <span className={`inline-flex shrink-0 items-center rounded-xs px-2 py-0.5 text-xs font-semibold ${TONES[status]}`}>
    {ATTENDANCE_LABEL[status]}
    {suffix && <span className="font-normal">&nbsp;· {suffix}</span>}
  </span>
);

/** Generic tone chip for check-in and "sent" states in the CMS. */
export const Chip: React.FC<{ tone: 'ok' | 'no' | 'maybe' | 'neutral'; children: React.ReactNode }> = ({ tone, children }) => {
  const cls = {
    ok: 'bg-ok-bg text-ok',
    no: 'bg-no-bg text-no',
    maybe: 'bg-maybe-bg text-maybe',
    neutral: 'bg-paper-2 text-ink-soft',
  }[tone];
  return <span className={`inline-flex shrink-0 items-center rounded-xs px-2 py-0.5 text-xs font-semibold ${cls}`}>{children}</span>;
};
