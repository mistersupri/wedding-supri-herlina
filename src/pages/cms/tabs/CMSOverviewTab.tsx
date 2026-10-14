import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Armchair,
  Calendar,
  Images,
  Sparkles,
  Gift,
  Heart,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { fetchCMSStats } from '../../../lib/api.js';

export const CMSOverviewTab: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useOutletContext<{ showToast: (msg: string, type?: 'success' | 'error') => void }>();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['cms-stats'],
    queryFn: fetchCMSStats,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-stone-500">
        <div className="w-8 h-8 rounded-full border-3 border-[#5A5A40]/30 border-t-[#5A5A40] animate-spin mb-3" />
        <p className="text-xs">Memuat ringkasan data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center">
        <p className="text-xs font-semibold text-rose-700 mb-2">Gagal memuat statistik CMS</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  const stats = data?.stats || {
    totalWishes: 0,
    attendingCount: 0,
    declinedCount: 0,
    tentativeCount: 0,
    totalGuestSeats: 0,
  };
  const counts = data?.counts || {
    eventsCount: 0,
    galleryCount: 0,
    storiesCount: 0,
    giftsCount: 0,
  };
  const recentGuests = data?.recentGuests || [];

  const statCards = [
    {
      title: 'Total Ucapan Masuk',
      value: stats.totalWishes,
      subtitle: 'Dari para tamu undangan',
      icon: Users,
      color: 'bg-stone-900 text-white',
      accent: 'text-amber-300',
    },
    {
      title: 'Konfirmasi Hadir',
      value: stats.attendingCount,
      subtitle: `${stats.totalGuestSeats} Kursi / Orang`,
      icon: CheckCircle2,
      color: 'bg-emerald-800 text-white',
      accent: 'text-emerald-300',
    },
    {
      title: 'Tidak Bisa Hadir',
      value: stats.declinedCount,
      subtitle: 'Menyampaikan doa restu',
      icon: XCircle,
      color: 'bg-rose-900 text-white',
      accent: 'text-rose-300',
    },
    {
      title: 'Masih Ragu / Belum Pasti',
      value: stats.tentativeCount,
      subtitle: 'Menunggu konfirmasi final',
      icon: HelpCircle,
      color: 'bg-amber-800 text-white',
      accent: 'text-amber-200',
    },
  ];

  const quickLinks = [
    {
      label: 'Data Mempelai',
      desc: 'Nama, foto, orang tua & ayat',
      icon: Heart,
      url: '/cms/mempelai',
      badge: 'Utama',
    },
    {
      label: 'Sesi Acara',
      desc: `${counts.eventsCount} sesi acara aktif`,
      icon: Calendar,
      url: '/cms/acara',
      badge: `${counts.eventsCount} Acara`,
    },
    {
      label: 'Galeri Foto',
      desc: `${counts.galleryCount} foto prewedding & momen`,
      icon: Images,
      url: '/cms/galeri',
      badge: `${counts.galleryCount} Foto`,
    },
    {
      label: 'Kisah Cinta',
      desc: `${counts.storiesCount} cerita linimasa`,
      icon: Sparkles,
      url: '/cms/cerita',
      badge: `${counts.storiesCount} Kisah`,
    },
    {
      label: 'Rekening & Kado',
      desc: `${counts.giftsCount} rekening bank / QRIS`,
      icon: Gift,
      url: '/cms/kado',
      badge: `${counts.giftsCount} Rekening`,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-['Playfair_Display'] text-2xl md:text-3xl font-bold text-stone-900">
            Ringkasan & Statistik Undangan
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Pantau ringkasan konfirmasi kehadiran (RSVP), ucapan masuk, dan statistik konten website
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/cms/tamu')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#5A5A40] hover:bg-[#494934] text-white text-xs font-semibold rounded-xl transition-colors shadow-md shadow-[#5A5A40]/20 cursor-pointer self-start sm:self-auto"
        >
          <span>Buka Buku Tamu & RSVP</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* RSVP Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`${card.color} rounded-2xl p-5 shadow-md flex flex-col justify-between relative overflow-hidden`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold opacity-90">{card.title}</span>
                <div className={`p-2 rounded-xl bg-white/10 ${card.accent}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight mb-1">{card.value}</p>
                <p className="text-[11px] opacity-80">{card.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Access Modules */}
      <div>
        <h2 className="text-sm font-bold text-stone-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#5A5A40]" />
          <span>Kelola Modul Undangan</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((ql, idx) => {
            const Icon = ql.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => navigate(ql.url)}
                className="bg-white hover:bg-stone-50 border border-stone-200/80 hover:border-stone-300 rounded-2xl p-5 text-left transition-all shadow-xs hover:shadow-md flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-[#5A5A40]/10 text-[#5A5A40] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-stone-900 group-hover:text-[#5A5A40] transition-colors">
                      {ql.label}
                    </h3>
                    <p className="text-[11px] text-stone-500">{ql.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                    {ql.badge}
                  </span>
                  <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700 group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent RSVP & Wishes Table preview */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-stone-900">Ucapan & Doa Restu Terbaru</h2>
            <p className="text-[11px] text-stone-500">Daftar ucapan terkini dari para tamu</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/cms/tamu')}
            className="text-xs font-bold text-[#5A5A40] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Lihat Semua</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentGuests.length === 0 ? (
          <p className="text-xs text-stone-500 py-6 text-center">Belum ada ucapan masuk.</p>
        ) : (
          <div className="divide-y divide-stone-100">
            {recentGuests.map((wish) => (
              <div key={wish.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-900">{wish.guestName}</span>
                    <span className="text-[10px] text-stone-500">({wish.relationship})</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        wish.attendanceStatus === 'HADIR'
                          ? 'bg-emerald-100 text-emerald-800'
                          : wish.attendanceStatus === 'TIDAK_HADIR'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {wish.attendanceStatus === 'HADIR'
                        ? `Hadir (${wish.numberOfGuests} org)`
                        : wish.attendanceStatus === 'TIDAK_HADIR'
                        ? 'Tidak Hadir'
                        : 'Masih Ragu'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-1 italic line-clamp-1">"{wish.message}"</p>
                </div>
                <span className="text-[10px] text-stone-400 shrink-0">
                  {new Date(wish.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
