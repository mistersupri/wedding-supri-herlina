import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useDebounce } from '../../../hooks/useDebounce.js';
import { formatDateTime } from '../../../lib/format.js';
import { Input, Select } from '../../ui/Field.js';
import { StatusChip } from '../../ui/StatusChip.js';
import { EmptyState, ErrorState, LoadingState } from '../../ui/StateView.js';
import type { AttendanceStatus, GuestWish } from '../../../types.js';

const PAGE = 6;

interface WishListProps {
  wishes: GuestWish[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export const WishList: React.FC<WishListProps> = ({ wishes, isLoading, isError, onRetry }) => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AttendanceStatus | 'ALL'>('ALL');
  const [visible, setVisible] = useState(PAGE);
  const q = useDebounce(search, 250).trim().toLowerCase();

  const filtered = useMemo(
    () =>
      wishes.filter(
        (w) =>
          (status === 'ALL' || w.attendanceStatus === status) &&
          (!q || w.guestName.toLowerCase().includes(q) || w.message.toLowerCase().includes(q)),
      ),
    [wishes, status, q],
  );

  if (isLoading) return <LoadingState label="Memuat ucapan..." />;
  if (isError) return <ErrorState title="Ucapan belum bisa dimuat." onRetry={onRetry} />;

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Cari ucapan</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisible(PAGE);
            }}
            placeholder="Cari nama atau isi ucapan"
            className="pl-9"
          />
        </label>
        <label className="sm:w-44">
          <span className="sr-only">Saring kehadiran</span>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as AttendanceStatus | 'ALL');
              setVisible(PAGE);
            }}
          >
            <option value="ALL">Semua</option>
            <option value="HADIR">Hadir</option>
            <option value="TIDAK_HADIR">Tidak hadir</option>
            <option value="RAGU">Masih ragu</option>
          </Select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={wishes.length === 0 ? 'Belum ada ucapan' : 'Tidak ada ucapan yang cocok'}
          detail={wishes.length === 0 ? 'Doa dan ucapan dari para tamu akan tampil di sini.' : 'Coba kata kunci atau saringan lain.'}
        />
      ) : (
        <ul className="mt-6 divide-y divide-line">
          {filtered.slice(0, visible).map((w) => (
            <li key={w.id} className="py-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold break-words">{w.guestName}</p>
                  <p className="text-sm text-ink-soft">{w.relationship}</p>
                </div>
                <StatusChip
                  status={w.attendanceStatus}
                  suffix={w.attendanceStatus === 'HADIR' && w.numberOfGuests > 1 ? `${w.numberOfGuests} orang` : undefined}
                />
              </div>
              <p className="mt-3 text-[15px] leading-relaxed break-words">{w.message}</p>
              {w.voiceUrl && (
                <audio
                  src={w.voiceUrl}
                  controls
                  preload="none"
                  className="mt-3 h-10 w-full max-w-sm"
                  aria-label={`Pesan suara dari ${w.guestName}`}
                />
              )}
              {w.reply && (
                <div className="mt-3 border-l-2 border-prada pl-3">
                  <p className="text-sm font-semibold text-prada-ink">Balasan mempelai</p>
                  <p className="text-[15px] leading-relaxed">{w.reply}</p>
                </div>
              )}
              <p className="mt-2 text-xs text-ink-soft">{formatDateTime(w.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}

      {visible < filtered.length && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + PAGE)}
          className="mt-2 min-h-11 w-full rounded-sm border border-field text-sm font-semibold hover:bg-paper"
        >
          Tampilkan ucapan lain ({filtered.length - visible})
        </button>
      )}
    </div>
  );
};
