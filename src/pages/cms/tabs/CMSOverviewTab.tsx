import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { cmsApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { formatDateTime } from '../../../lib/format.js';
import { PageHeader, Panel, Stat } from '../../../components/cms/CmsPage.js';
import { StatusChip } from '../../../components/ui/StatusChip.js';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/StateView.js';
import { buttonClass } from '../../../components/ui/Button.js';

export const CMSOverviewTab: React.FC = () => {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: queryKeys.cms.stats, queryFn: cmsApi.stats });

  if (isLoading) return <LoadingState label="Memuat ringkasan..." />;
  if (isError || !data) return <ErrorState title="Ringkasan belum bisa dimuat." onRetry={() => refetch()} />;

  const { stats, counts, recentGuests } = data;
  const content = [
    { to: '/cms/acara', label: 'Sesi acara', count: counts.eventsCount },
    { to: '/cms/galeri', label: 'Foto & video galeri', count: counts.galleryCount },
    { to: '/cms/cerita', label: 'Kisah', count: counts.storiesCount },
    { to: '/cms/kado', label: 'Rekening & QRIS', count: counts.giftsCount },
  ];

  return (
    <>
      <PageHeader
        title="Ringkasan"
        description="Konfirmasi kehadiran yang masuk dan isi undangan saat ini."
        actions={
          <Link to="/cms/tamu" className={buttonClass('primary')}>
            Buka daftar tamu
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ucapan masuk" value={stats.totalWishes} />
        <Stat label="Akan hadir" value={stats.attendingCount} detail={`${stats.totalGuestSeats} orang`} />
        <Stat label="Tidak hadir" value={stats.declinedCount} />
        <Stat label="Masih ragu" value={stats.tentativeCount} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Panel
          title="Ucapan terbaru"
          actions={
            <Link
              to="/cms/tamu"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-4"
            >
              Semua ucapan
            </Link>
          }
        >
          {recentGuests.length === 0 ? (
            <EmptyState title="Belum ada ucapan" detail="Ucapan tamu akan muncul di sini." className="py-6" />
          ) : (
            <ul className="divide-y divide-line">
              {recentGuests.map((w) => (
                <li key={w.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{w.guestName}</p>
                    <StatusChip
                      status={w.attendanceStatus}
                      suffix={w.attendanceStatus === 'HADIR' ? `${w.numberOfGuests} orang` : undefined}
                    />
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{w.message}</p>
                  <p className="mt-1 text-xs text-ink-soft">{formatDateTime(w.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Isi undangan">
          <ul className="divide-y divide-line">
            {content.map((c) => (
              <li key={c.to}>
                <Link to={c.to} className="flex min-h-12 items-center justify-between gap-3 text-[15px] hover:text-primary">
                  <span>{c.label}</span>
                  <span className="display-numeral text-xl">{c.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
};
