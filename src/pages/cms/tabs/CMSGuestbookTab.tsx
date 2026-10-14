import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import {
  MessageSquareHeart,
  Search,
  Filter,
  Eye,
  EyeOff,
  Trash2,
  Reply,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Save,
  X,
  Users,
  UserCheck,
  Volume2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  fetchCMSGuests,
  replyToGuest,
  toggleGuestVisibility,
  deleteGuestWish,
} from '../../../lib/api.js';
import { GuestWish } from '../../../types.js';
import { CMSInvitedGuestsSubTab } from './CMSInvitedGuestsSubTab.js';
import { ConfirmModal } from '../../../components/common/ConfirmModal.js';
import { useDebounce } from '../../../hooks/useDebounce.js';

export const CMSGuestbookTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useOutletContext<{ showToast: (msg: string, type?: 'success' | 'error') => void }>();

  const [activeMainSubTab, setActiveMainSubTab] = useState<'INVITED' | 'WISHES'>('INVITED');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [replyingGuest, setReplyingGuest] = useState<GuestWish | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string; name: string } | null>(null);

  // Pagination for Moderasi Ucapan Doa
  const [wishesCurrentPage, setWishesCurrentPage] = useState<number>(1);
  const [wishesPageSize, setWishesPageSize] = useState<number>(10);

  const { data, isLoading, error } = useQuery({
    queryKey: ['cms-guests', statusFilter, debouncedSearchQuery],
    queryFn: () => fetchCMSGuests(statusFilter, debouncedSearchQuery),
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, reply }: { id: string; reply: string }) => replyToGuest(id, reply),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-guests'] });
      queryClient.invalidateQueries({ queryKey: ['guestbook'] });
      showToast('Balasan ucapan berhasil disimpan!', 'success');
      setReplyingGuest(null);
      setReplyText('');
    },
    onError: (err: any) => {
      showToast(err.message || 'Gagal membalas ucapan', 'error');
    },
  });

  const visibilityMutation = useMutation({
    mutationFn: toggleGuestVisibility,
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['cms-guests'] });
      queryClient.invalidateQueries({ queryKey: ['guestbook'] });
      showToast(
        updated.isHidden ? 'Ucapan disembunyikan dari publik.' : 'Ucapan kini ditampilkan ke publik.',
        'success'
      );
    },
    onError: (err: any) => {
      showToast(err.message || 'Gagal mengubah visibilitas', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGuestWish,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-guests'] });
      queryClient.invalidateQueries({ queryKey: ['guestbook'] });
      showToast('Ucapan berhasil dihapus!', 'success');
    },
    onError: (err: any) => {
      showToast(err.message || 'Gagal menghapus ucapan', 'error');
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-stone-500">
        <div className="w-8 h-8 rounded-full border-3 border-[#5A5A40]/30 border-t-[#5A5A40] animate-spin mb-3" />
        <p className="text-xs">Memuat data buku tamu & RSVP...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center">
        <p className="text-xs font-semibold text-rose-700">Gagal memuat buku tamu</p>
      </div>
    );
  }

  const guests = data?.data || (Array.isArray(data) ? data : []);
  const stats = data?.stats || {
    totalWishes: 0,
    attendingCount: 0,
    declinedCount: 0,
    tentativeCount: 0,
    totalGuestSeats: 0,
  };

  // Compute wishes pagination
  const totalWishesItems = guests.length;
  const totalWishesPages = Math.max(1, Math.ceil(totalWishesItems / wishesPageSize));
  const safeWishesPage = Math.min(Math.max(wishesCurrentPage, 1), totalWishesPages);
  const startWishesIndex = (safeWishesPage - 1) * wishesPageSize;
  const paginatedWishes = guests.slice(startWishesIndex, startWishesIndex + wishesPageSize);

  const handleOpenReply = (guest: GuestWish) => {
    setReplyingGuest(guest);
    setReplyText(guest.reply || '');
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingGuest) return;
    replyMutation.mutate({ id: replyingGuest.id, reply: replyText });
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteConfirmTarget({ id, name });
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Sub-tab Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h1 className="font-['Playfair_Display'] text-2xl md:text-3xl font-bold text-stone-900">
            Manajemen Tamu & Presensi
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Kelola daftar tamu resmi (slug 4-char), desk presensi check-in, serta moderasi ucapan RSVP.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-stone-200/80 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveMainSubTab('INVITED')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeMainSubTab === 'INVITED'
                ? 'bg-[#5A5A40] text-white shadow-md'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Tamu Undangan & Presensi</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMainSubTab('WISHES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeMainSubTab === 'WISHES'
                ? 'bg-[#5A5A40] text-white shadow-md'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <MessageSquareHeart className="w-4 h-4" />
            <span>Moderasi Ucapan Doa</span>
          </button>
        </div>
      </div>

      {activeMainSubTab === 'INVITED' ? (
        <CMSInvitedGuestsSubTab showToast={showToast} />
      ) : (
        <>
          {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-stone-500">Total Ucapan</span>
          <p className="text-2xl font-bold text-stone-900 mt-0.5">{stats.totalWishes}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700">Hadir</span>
          <p className="text-2xl font-bold text-emerald-800 mt-0.5">
            {stats.attendingCount}{' '}
            <span className="text-xs font-normal text-stone-400">({stats.totalGuestSeats} org)</span>
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-rose-700">Tidak Hadir</span>
          <p className="text-2xl font-bold text-rose-800 mt-0.5">{stats.declinedCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-700">Masih Ragu</span>
          <p className="text-2xl font-bold text-amber-800 mt-0.5">{stats.tentativeCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'Semua Status' },
            { id: 'HADIR', label: 'Hadir' },
            { id: 'TIDAK_HADIR', label: 'Tidak Hadir' },
            { id: 'RAGU', label: 'Ragu' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setStatusFilter(tab.id);
                setWishesCurrentPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[#5A5A40] text-white shadow-xs'
                  : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Field & Page Size Selector */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setWishesCurrentPage(1);
              }}
              placeholder="Cari nama atau ucapan..."
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden transition-colors"
            />
          </div>

          <select
            value={wishesPageSize}
            onChange={(e) => {
              setWishesPageSize(Number(e.target.value));
              setWishesCurrentPage(1);
            }}
            className="px-2.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 outline-hidden shrink-0 cursor-pointer"
            title="Jumlah Tampilan per Halaman"
          >
            <option value={5}>5 / hal</option>
            <option value={10}>10 / hal</option>
            <option value={20}>20 / hal</option>
            <option value={50}>50 / hal</option>
          </select>
        </div>
      </div>

      {/* Guest Wishes List */}
      {guests.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200/80 p-12 text-center">
          <MessageSquareHeart className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <p className="text-xs font-bold text-stone-700">Tidak ada ucapan yang sesuai filter</p>
          <p className="text-[11px] text-stone-400 mt-1">Coba sesuaikan kata kunci pencarian atau status</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-4">
            {paginatedWishes.map((guest) => (
            <div
              key={guest.id}
              className={`bg-white rounded-3xl border p-6 shadow-xs flex flex-col md:flex-row items-start justify-between gap-6 transition-all ${
                guest.isHidden ? 'border-stone-200 bg-stone-50/70 opacity-60' : 'border-stone-200/80'
              }`}
            >
              <div className="space-y-3 flex-1 min-w-0">
                {/* Guest Info Header */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-bold text-sm text-stone-900">{guest.guestName}</span>
                  <span className="text-xs text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-md">
                    {guest.relationship}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                      guest.attendanceStatus === 'HADIR'
                        ? 'bg-emerald-100 text-emerald-800'
                        : guest.attendanceStatus === 'TIDAK_HADIR'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {guest.attendanceStatus === 'HADIR'
                      ? `Hadir (${guest.numberOfGuests} orang)`
                      : guest.attendanceStatus === 'TIDAK_HADIR'
                      ? 'Tidak Hadir'
                      : 'Masih Ragu'}
                  </span>
                  {guest.isHidden && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-stone-200 text-stone-700 rounded-md">
                      Disembunyikan dari Publik
                    </span>
                  )}
                </div>

                {/* Message Body */}
                <p className="text-xs text-stone-700 leading-relaxed italic bg-stone-50/80 p-3.5 rounded-2xl border border-stone-100">
                  "{guest.message}"
                </p>

                {guest.voiceUrl && (
                  <div className="mt-2.5 flex items-center gap-2 bg-stone-100 border border-stone-200 rounded-xl p-2 max-w-xs">
                    <Volume2 className="w-4 h-4 text-[#5A5A40] shrink-0" />
                    <audio src={guest.voiceUrl} controls className="h-7 w-full text-xs" />
                  </div>
                )}

                {/* Reply by Bride/Groom */}
                {guest.reply && (
                  <div className="pl-4 border-l-2 border-[#5A5A40] space-y-1">
                    <p className="text-[11px] font-bold text-[#5A5A40]">
                      Balasan Mempelai:
                    </p>
                    <p className="text-xs text-stone-600">{guest.reply}</p>
                  </div>
                )}

                <p className="text-[10px] text-stone-400">
                  Dikirim pada{' '}
                  {new Date(guest.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end md:self-start shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenReply(guest)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold transition-colors cursor-pointer"
                  title="Balas Ucapan"
                >
                  <Reply className="w-3.5 h-3.5" />
                  <span>{guest.reply ? 'Edit Balasan' : 'Balas'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => visibilityMutation.mutate(guest.id)}
                  className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                    guest.isHidden
                      ? 'bg-stone-200 border-stone-300 text-stone-800 hover:bg-stone-300'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                  title={guest.isHidden ? 'Tampilkan ke Publik' : 'Sembunyikan dari Publik'}
                >
                  {guest.isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(guest.id, guest.guestName)}
                  className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                  title="Hapus Ucapan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Wishes Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-stone-200/80 text-xs text-stone-600 bg-white p-4 rounded-2xl shadow-xs">
          <div>
            Menampilkan{' '}
            <strong>
              {totalWishesItems > 0 ? startWishesIndex + 1 : 0} -{' '}
              {Math.min(startWishesIndex + wishesPageSize, totalWishesItems)}
            </strong>{' '}
            dari <strong>{totalWishesItems}</strong> ucapan doa
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setWishesCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={safeWishesPage <= 1}
              className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalWishesPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                type="button"
                onClick={() => setWishesCurrentPage(pg)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  safeWishesPage === pg
                    ? 'bg-[#5A5A40] text-white shadow-xs'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {pg}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setWishesCurrentPage((p) => Math.min(p + 1, totalWishesPages))}
              disabled={safeWishesPage >= totalWishesPages}
              className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              title="Halaman Selanjutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Reply Modal */}
      {replyingGuest && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-100">
              <h3 className="text-base font-bold text-stone-900">
                Balas Ucapan: {replyingGuest.guestName}
              </h3>
              <button
                type="button"
                onClick={() => setReplyingGuest(null)}
                className="p-1 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendReply} className="space-y-4">
              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-100 text-xs text-stone-600 italic">
                "{replyingGuest.message}"
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Tulis Balasan Doa dari Mempelai
                </label>
                <textarea
                  rows={4}
                  required
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Terima kasih banyak atas doa dan restunya..."
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setReplyingGuest(null)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={replyMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-[#5A5A40] hover:bg-[#494934] text-white text-xs font-semibold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {replyMutation.isPending ? 'Menyimpan...' : 'Kirim Balasan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirmTarget)}
        title="Hapus Ucapan Buku Tamu"
        message={`Apakah Anda yakin ingin menghapus ucapan dari "${deleteConfirmTarget?.name || ''}"?`}
        confirmText="Hapus Ucapan"
        cancelText="Batal"
        onConfirm={() => {
          if (deleteConfirmTarget) {
            deleteMutation.mutate(deleteConfirmTarget.id);
            setDeleteConfirmTarget(null);
          }
        }}
        onCancel={() => setDeleteConfirmTarget(null)}
      />
    </div>
  );
};
