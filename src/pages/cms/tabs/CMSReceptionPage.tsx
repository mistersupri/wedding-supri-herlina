import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, RefreshCcw, Search } from 'lucide-react';
import { cmsApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { formatTime } from '../../../lib/format.js';
import { playCheckInSuccessSound, playErrorSound } from '../../../lib/sound.js';
import { useDebounce } from '../../../hooks/useDebounce.js';
import { PageHeader, Pagination, Panel, Stat, usePagination } from '../../../components/cms/CmsPage.js';
import { useToast } from '../../../components/cms/Toast.js';
import { useQrScanner } from '../../../components/cms/reception/useQrScanner.js';
import { Button, IconButton } from '../../../components/ui/Button.js';
import { Checkbox, Field, Input, Segmented } from '../../../components/ui/Field.js';
import { Chip } from '../../../components/ui/StatusChip.js';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/StateView.js';
import type { InvitedGuest } from '../../../types.js';

type ListFilter = 'ALL' | 'IN' | 'OUT';

/** Reception desk: scan the guest's QR card or search by name, confirm seats, check in. */
export const CMSReceptionPage: React.FC = () => {
  const client = useQueryClient();
  const notify = useToast();
  const query = useQuery({ queryKey: queryKeys.cms.invitedGuests, queryFn: () => cmsApi.invitedGuests.list() });
  const guests = query.data?.data || [];
  const stats = query.data?.stats;

  const [selected, setSelected] = useState<InvitedGuest | null>(null);
  const [pax, setPax] = useState(1);
  const [souvenir, setSouvenir] = useState(true);
  const [sound, setSound] = useState(true);
  const [autoCheckIn, setAutoCheckIn] = useState(false);
  const [lookup, setLookup] = useState('');
  const [listSearch, setListSearch] = useState('');
  const [listFilter, setListFilter] = useState<ListFilter>('ALL');
  const lookupQ = useDebounce(lookup, 150).trim().toLowerCase();
  const listQ = useDebounce(listSearch, 250).trim().toLowerCase();

  const cue = (ok: boolean) => sound && (ok ? playCheckInSuccessSound() : playErrorSound());
  const refresh = () => {
    client.invalidateQueries({ queryKey: queryKeys.cms.invitedGuests });
    client.invalidateQueries({ queryKey: queryKeys.cms.stats });
  };

  const checkIn = useMutation({
    mutationFn: (input: { guest: InvitedGuest; pax: number; souvenir: boolean; method: 'QR_SCAN' | 'MANUAL' }) =>
      cmsApi.invitedGuests.checkIn({ guestId: input.guest.id, actualPax: input.pax, souvenirGiven: input.souvenir, method: input.method }),
    onSuccess: (res) => {
      refresh();
      cue(true);
      notify(res.message);
      setSelected(res.guest);
    },
    onError: (err: Error) => {
      cue(false);
      notify(err.message, 'error');
    },
  });

  const undo = useMutation({
    mutationFn: cmsApi.invitedGuests.undoCheckIn,
    onSuccess: (res) => {
      refresh();
      notify(res.message);
      setSelected((s) => (s?.id === res.guest.id ? res.guest : s));
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const choose = (guest: InvitedGuest, method: 'QR_SCAN' | 'MANUAL') => {
    setSelected(guest);
    setPax(guest.actualPax || guest.pax);
    setLookup('');
    if (method === 'QR_SCAN' && autoCheckIn && !guest.isCheckedIn) {
      checkIn.mutate({ guest, pax: guest.pax, souvenir, method });
    } else {
      cue(true);
    }
  };

  const scanner = useQrScanner((code) => {
    const guest = guests.find((g) => g.slug.toUpperCase() === code);
    if (guest) choose(guest, 'QR_SCAN');
    else {
      cue(false);
      notify(`Kode "${code}" tidak ada di daftar tamu.`, 'error');
    }
  });

  const suggestions = useMemo(
    () =>
      lookupQ
        ? guests
            .filter(
              (g) =>
                g.slug.toLowerCase() === lookupQ ||
                g.name.toLowerCase().includes(lookupQ) ||
                (g.tableNumber || '').toLowerCase().includes(lookupQ),
            )
            .slice(0, 6)
        : [],
    [guests, lookupQ],
  );

  const list = useMemo(
    () =>
      guests.filter(
        (g) =>
          (listFilter === 'ALL' || (listFilter === 'IN') === g.isCheckedIn) &&
          (!listQ ||
            g.name.toLowerCase().includes(listQ) ||
            g.slug.toLowerCase().includes(listQ) ||
            (g.tableNumber || '').toLowerCase().includes(listQ)),
      ),
    [guests, listFilter, listQ],
  );
  const pager = usePagination(list, 12);

  if (query.isLoading) return <LoadingState label="Memuat daftar tamu..." />;
  if (query.isError) return <ErrorState title="Daftar tamu belum bisa dimuat." onRetry={() => query.refetch()} />;

  return (
    <>
      <PageHeader
        title="Meja penerima tamu"
        description="Pindai kartu tamu atau cari nama, periksa jumlah orang yang datang, lalu catat kehadirannya."
      />

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Sudah hadir" value={`${stats.totalCheckedIn} / ${stats.totalInvited}`} />
          <Stat label="Orang datang" value={stats.totalActualPax} detail={`dari ${stats.totalPaxAllocated} kursi`} />
          <Stat label="Suvenir diberikan" value={stats.totalSouvenirsGiven} />
          <Stat label="Belum datang" value={stats.totalRemaining} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Pindai kartu tamu"
          actions={
            scanner.active && (
              <IconButton label="Ganti kamera" onClick={scanner.flip}>
                <RefreshCcw className="h-5 w-5" />
              </IconButton>
            )
          }
        >
          <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-deep">
            <video
              ref={scanner.videoRef}
              muted
              playsInline
              className={`h-full w-full object-cover ${scanner.facing === 'user' ? '-scale-x-100' : ''} ${scanner.active ? '' : 'hidden'}`}
            />
            {scanner.active ? (
              <div aria-hidden="true" className="pointer-events-none absolute inset-[18%] rounded-sm border-2 border-prada-on-deep" />
            ) : (
              <div className="on-deep absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="text-sm text-on-deep-soft">{scanner.error || 'Kamera mati. Nyalakan untuk memindai QR di kartu tamu.'}</p>
                <Button variant="deep" onClick={() => scanner.start()} loading={scanner.starting}>
                  <Camera className="h-4 w-4" aria-hidden="true" />
                  Nyalakan kamera
                </Button>
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-x-5">
              <Checkbox label="Bunyi" checked={sound} onChange={(e) => setSound(e.target.checked)} />
              <Checkbox label="Catat otomatis saat QR terbaca" checked={autoCheckIn} onChange={(e) => setAutoCheckIn(e.target.checked)} />
            </div>
            {scanner.active && (
              <Button variant="ghost" size="sm" onClick={scanner.stop}>
                Matikan kamera
              </Button>
            )}
          </div>

          <div className="relative mt-4">
            <Field label="Atau cari nama, kode, atau meja">
              {(p) => (
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-soft"
                    aria-hidden="true"
                  />
                  <Input
                    {...p}
                    value={lookup}
                    onChange={(e) => setLookup(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && suggestions[0]) {
                        e.preventDefault();
                        choose(suggestions[0], 'MANUAL');
                      }
                    }}
                    autoComplete="off"
                    className="pl-9"
                  />
                </div>
              )}
            </Field>
            {lookupQ && (
              <ul className="absolute inset-x-0 z-10 mt-1 max-h-72 overflow-y-auto rounded-sm border border-line bg-card shadow-[0_12px_32px_-12px_rgba(20,12,6,0.35)]">
                {suggestions.length === 0 ? (
                  <li className="p-3 text-sm text-ink-soft">Tidak ada tamu yang cocok.</li>
                ) : (
                  suggestions.map((g) => (
                    <li key={g.id}>
                      <button
                        type="button"
                        onClick={() => choose(g, 'MANUAL')}
                        className="flex min-h-12 w-full items-center justify-between gap-2 px-3 text-left hover:bg-paper-2"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{g.name}</span>
                          <span className="text-xs text-ink-soft">
                            {g.slug} · {g.category}
                            {g.tableNumber ? ` · ${g.tableNumber}` : ''}
                          </span>
                        </span>
                        {g.isCheckedIn && <Chip tone="ok">Hadir</Chip>}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </Panel>

        <Panel title="Tamu terpilih" className="lg:self-start">
          {!selected ? (
            <EmptyState title="Belum ada tamu dipilih" detail="Pindai QR atau cari nama di sebelah." className="py-8" />
          ) : (
            <div aria-live="polite">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-display text-2xl leading-tight">{selected.name}</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {selected.category} · {selected.pax} kursi{selected.tableNumber ? ` · ${selected.tableNumber}` : ''}
                  </p>
                  {selected.customNote && <p className="mt-1 text-sm text-ink-soft italic">{selected.customNote}</p>}
                </div>
                <span className="display-numeral rounded-xs bg-paper-2 px-2 py-1 text-xl tracking-widest">{selected.slug}</span>
              </div>

              {selected.isCheckedIn ? (
                <div className="mt-5 rounded-sm bg-ok-bg p-4 text-ok">
                  <p className="font-semibold">Tercatat hadir {selected.checkInTime ? `pukul ${formatTime(selected.checkInTime)}` : ''}</p>
                  <p className="text-sm">
                    {selected.actualPax || selected.pax} orang ·{' '}
                    {selected.souvenirGiven ? 'suvenir sudah diberikan' : 'suvenir belum diberikan'}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-no"
                    onClick={() => undo.mutate(selected.id)}
                    loading={undo.isPending}
                  >
                    Batalkan kehadiran
                  </Button>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <Field label="Jumlah orang yang datang">
                    {(p) => (
                      <Input
                        {...p}
                        type="number"
                        min={1}
                        max={20}
                        value={pax}
                        onChange={(e) => setPax(Math.max(1, Number(e.target.value) || 1))}
                      />
                    )}
                  </Field>
                  <Checkbox label="Suvenir diberikan" checked={souvenir} onChange={(e) => setSouvenir(e.target.checked)} />
                  <Button
                    className="w-full"
                    loading={checkIn.isPending}
                    onClick={() => checkIn.mutate({ guest: selected, pax, souvenir, method: 'MANUAL' })}
                  >
                    Catat hadir
                  </Button>
                </div>
              )}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Daftar kehadiran" className="mt-6">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Cari di daftar kehadiran</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
            <Input
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              placeholder="Cari nama, kode, meja"
              className="pl-9"
            />
          </label>
          <Segmented<ListFilter>
            name="Status kehadiran"
            value={listFilter}
            onChange={setListFilter}
            className="sm:w-80"
            options={[
              { value: 'ALL', label: 'Semua' },
              { value: 'IN', label: 'Hadir' },
              { value: 'OUT', label: 'Belum' },
            ]}
          />
        </div>
        {list.length === 0 ? (
          <EmptyState title="Tidak ada tamu yang cocok" className="py-8" />
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {pager.slice.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <button type="button" onClick={() => choose(g, 'MANUAL')} className="min-h-11 min-w-0 flex-1 text-left">
                  <span className="block truncate font-semibold">{g.name}</span>
                  <span className="text-xs text-ink-soft">
                    {g.slug} · {g.pax} kursi{g.tableNumber ? ` · ${g.tableNumber}` : ''}
                  </span>
                </button>
                {g.isCheckedIn ? (
                  <Chip tone="ok">
                    Hadir {g.actualPax || g.pax} org{g.checkInTime ? ` · ${formatTime(g.checkInTime)}` : ''}
                  </Chip>
                ) : (
                  <Chip tone="neutral">Belum</Chip>
                )}
              </li>
            ))}
          </ul>
        )}
        <Pagination {...pager} onPage={pager.setPage} noun="tamu" />
      </Panel>
    </>
  );
};
