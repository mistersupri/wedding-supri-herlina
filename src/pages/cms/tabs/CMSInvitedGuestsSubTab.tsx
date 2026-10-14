import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  UserCheck,
  QrCode,
  Share2,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  Gift,
  Phone,
  Table,
  Copy,
  Sparkles,
  RotateCcw,
  Upload,
  FileText,
  X,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
  Instagram,
  Send,
  Check,
  AtSign,
  MessageCircle,
} from 'lucide-react';
import {
  fetchCMSInvitedGuests,
  createCMSInvitedGuest,
  createBatchCMSInvitedGuests,
  updateCMSInvitedGuest,
  deleteCMSInvitedGuest,
  batchUpdateCMSInvitationSent,
  submitCMSPresensiCheckIn,
  undoCMSPresensiCheckIn,
} from '../../../lib/api.js';
import { InvitedGuest, PresensiStats } from '../../../types.js';
import { ConfirmModal } from '../../../components/common/ConfirmModal.js';
import { useDebounce } from '../../../hooks/useDebounce.js';

interface CMSInvitedGuestsSubTabProps {
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const CMSInvitedGuestsSubTab: React.FC<CMSInvitedGuestsSubTabProps> = ({ showToast }) => {
  const queryClient = useQueryClient();

  const [activeView, setActiveView] = useState<'MANAGEMENT' | 'PRESENSI'>('PRESENSI');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Add guest modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<InvitedGuest | null>(null);

  // Form states for single guest
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formInstagram, setFormInstagram] = useState('');
  const [formCategory, setFormCategory] = useState('Keluarga');
  const [formPax, setFormPax] = useState(2);
  const [formTable, setFormTable] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formInvitationSent, setFormInvitationSent] = useState(false);

  // Sent Invitation Filter in Management View
  const [sentFilter, setSentFilter] = useState<'ALL' | 'SENT' | 'UNSENT'>('ALL');

  // Batch input text area
  const [batchRawText, setBatchRawText] = useState('');

  // Presensi search & check-in state
  const [presensiQuery, setPresensiQuery] = useState('');
  const [checkInPax, setCheckInPax] = useState<number>(2);
  const [giveSouvenir, setGiveSouvenir] = useState<boolean>(true);
  const [activeCheckInGuest, setActiveCheckInGuest] = useState<InvitedGuest | null>(null);

  // Presensi Table Search, Filter & Pagination State
  const [presensiTableSearch, setPresensiTableSearch] = useState('');
  const debouncedPresensiTableSearch = useDebounce(presensiTableSearch, 300);
  const [presensiStatusFilter, setPresensiStatusFilter] = useState<'ALL' | 'HADIR' | 'BELUM'>('ALL');
  const [presensiCategoryFilter, setPresensiCategoryFilter] = useState<string>('ALL');
  const [presensiCurrentPage, setPresensiCurrentPage] = useState<number>(1);
  const [presensiPageSize, setPresensiPageSize] = useState<number>(10);

  // Management (Daftar Tamu) Pagination State
  const [managementCurrentPage, setManagementCurrentPage] = useState<number>(1);
  const [managementPageSize, setManagementPageSize] = useState<number>(10);

  // Copy indicator
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Fetch invited guests & presensi stats using debounced searchQuery
  const { data, isLoading, error } = useQuery({
    queryKey: ['cms-invited-guests', filterCategory, debouncedSearchQuery],
    queryFn: () => fetchCMSInvitedGuests(filterCategory, debouncedSearchQuery),
  });

  const guests = data?.data || [];
  const stats: PresensiStats = data?.stats || {
    totalInvited: 0,
    totalPaxAllocated: 0,
    totalCheckedIn: 0,
    totalActualPax: 0,
    totalRemaining: 0,
    totalSouvenirsGiven: 0,
  };

  // Filtered and Paginated Presensi List using debouncedPresensiTableSearch
  const filteredPresensiGuests = guests.filter((g) => {
    const q = debouncedPresensiTableSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      g.name.toLowerCase().includes(q) ||
      g.slug.toLowerCase().includes(q) ||
      (g.tableNumber && g.tableNumber.toLowerCase().includes(q)) ||
      (g.category && g.category.toLowerCase().includes(q));

    const matchesStatus =
      presensiStatusFilter === 'ALL' ||
      (presensiStatusFilter === 'HADIR' && g.isCheckedIn) ||
      (presensiStatusFilter === 'BELUM' && !g.isCheckedIn);

    const matchesCategory =
      presensiCategoryFilter === 'ALL' || g.category === presensiCategoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const totalPresensiItems = filteredPresensiGuests.length;
  const totalPresensiPages = Math.max(1, Math.ceil(totalPresensiItems / presensiPageSize));
  const safePresensiPage = Math.min(Math.max(presensiCurrentPage, 1), totalPresensiPages);
  const startPresensiIndex = (safePresensiPage - 1) * presensiPageSize;
  const paginatedPresensiGuests = filteredPresensiGuests.slice(
    startPresensiIndex,
    startPresensiIndex + presensiPageSize
  );

  // Filtered and Paginated Management (Daftar Tamu) List
  const filteredManagementGuests = guests.filter((g) => {
    if (sentFilter === 'SENT') return g.invitationSent;
    if (sentFilter === 'UNSENT') return !g.invitationSent;
    return true;
  });

  const totalManagementItems = filteredManagementGuests.length;
  const totalManagementPages = Math.max(1, Math.ceil(totalManagementItems / managementPageSize));
  const safeManagementPage = Math.min(Math.max(managementCurrentPage, 1), totalManagementPages);
  const startManagementIndex = (safeManagementPage - 1) * managementPageSize;
  const paginatedManagementGuests = filteredManagementGuests.slice(
    startManagementIndex,
    startManagementIndex + managementPageSize
  );

  // Mutations
  const createMutation = useMutation({
    mutationFn: createCMSInvitedGuest,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['cms-invited-guests'] });
      showToast(`Tamu "${res.name}" (Kode: ${res.slug}) berhasil ditambahkan!`, 'success');
      resetForm();
      setShowAddModal(false);
    },
    onError: (err: any) => showToast(err.message || 'Gagal menambah tamu', 'error'),
  });

  const batchMutation = useMutation({
    mutationFn: createBatchCMSInvitedGuests,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['cms-invited-guests'] });
      showToast(`${res.length} tamu berhasil ditambahkan secara batch!`, 'success');
      setBatchRawText('');
      setShowBatchModal(false);
    },
    onError: (err: any) => showToast(err.message || 'Gagal impor batch tamu', 'error'),
  });

  const batchSentMutation = useMutation({
    mutationFn: ({ ids, sentStatus }: { ids: string[]; sentStatus: boolean }) =>
      batchUpdateCMSInvitationSent(ids, sentStatus),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['cms-invited-guests'] });
      showToast(`${res.updatedCount} tamu berhasil ditandai status undangannya!`, 'success');
    },
    onError: (err: any) => showToast(err.message || 'Gagal memperbarui status pengiriman', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<InvitedGuest> }) =>
      updateCMSInvitedGuest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-invited-guests'] });
      showToast('Data tamu berhasil diperbarui!', 'success');
      resetForm();
      setEditingGuest(null);
    },
    onError: (err: any) => showToast(err.message || 'Gagal memperbarui data tamu', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCMSInvitedGuest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-invited-guests'] });
      showToast('Tamu berhasil dihapus!', 'success');
    },
    onError: (err: any) => showToast(err.message || 'Gagal menghapus tamu', 'error'),
  });

  const checkInMutation = useMutation({
    mutationFn: submitCMSPresensiCheckIn,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['cms-invited-guests'] });
      queryClient.invalidateQueries({ queryKey: ['cms-guests'] });
      queryClient.invalidateQueries({ queryKey: ['cms-stats'] });
      showToast(res.message, 'success');
      setActiveCheckInGuest(null);
      setPresensiQuery('');
    },
    onError: (err: any) => showToast(err.message || 'Gagal melakukan check-in', 'error'),
  });

  const undoCheckInMutation = useMutation({
    mutationFn: undoCMSPresensiCheckIn,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['cms-invited-guests'] });
      queryClient.invalidateQueries({ queryKey: ['cms-guests'] });
      queryClient.invalidateQueries({ queryKey: ['cms-stats'] });
      showToast(res.message, 'success');
    },
    onError: (err: any) => showToast(err.message || 'Gagal membatalkan check-in', 'error'),
  });

  const resetForm = () => {
    setFormName('');
    setFormPhone('');
    setFormInstagram('');
    setFormCategory('Keluarga');
    setFormPax(2);
    setFormTable('');
    setFormNote('');
    setFormInvitationSent(false);
  };

  const handleEditClick = (g: InvitedGuest) => {
    setEditingGuest(g);
    setFormName(g.name);
    setFormPhone(g.phone || '');
    setFormInstagram(g.instagram || '');
    setFormCategory(g.category || 'Keluarga');
    setFormPax(g.pax);
    setFormTable(g.tableNumber || '');
    setFormNote(g.customNote || '');
    setFormInvitationSent(Boolean(g.invitationSent));
  };

  const handleSubmitSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingGuest) {
      updateMutation.mutate({
        id: editingGuest.id,
        payload: {
          name: formName.trim(),
          phone: formPhone.trim(),
          instagram: formInstagram.trim(),
          category: formCategory,
          pax: Number(formPax) || 2,
          tableNumber: formTable.trim(),
          customNote: formNote.trim(),
          invitationSent: formInvitationSent,
        },
      });
    } else {
      createMutation.mutate({
        name: formName.trim(),
        phone: formPhone.trim(),
        instagram: formInstagram.trim(),
        category: formCategory,
        pax: Number(formPax) || 2,
        tableNumber: formTable.trim(),
        customNote: formNote.trim(),
        invitationSent: formInvitationSent,
      });
    }
  };

  const handleSubmitBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = batchRawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      showToast('Masukkan minimal 1 nama tamu', 'error');
      return;
    }

    const parsedGuests = lines.map((line) => {
      // Split by comma or tab if present
      const parts = line.split(/,|\t/);
      let instagram = '';
      if (parts[6]) {
        instagram = parts[6].trim();
      } else {
        const igPart = parts.find((p) => p.trim().startsWith('@') || p.toLowerCase().includes('instagram.com'));
        if (igPart) instagram = igPart.trim();
      }
      return {
        name: parts[0].trim(),
        category: parts[1] ? parts[1].trim() : 'Umum',
        pax: parts[2] && !isNaN(Number(parts[2].trim())) ? Number(parts[2].trim()) : 2,
        phone: parts[3] ? parts[3].trim() : '',
        tableNumber: parts[4] ? parts[4].trim() : '',
        customNote: parts[5] ? parts[5].trim() : '',
        instagram,
      };
    });

    batchMutation.mutate(parsedGuests);
  };

  const handleSearchCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!presensiQuery.trim()) return;

    const q = presensiQuery.trim().toUpperCase();
    // Try to find exact match by slug or name match
    const found = guests.find(
      (g) => g.slug.toUpperCase() === q || g.name.toLowerCase().includes(presensiQuery.toLowerCase())
    );

    if (found) {
      setActiveCheckInGuest(found);
      setCheckInPax(found.pax);
    } else {
      showToast(`Tamu dengan kode/nama "${presensiQuery}" tidak ditemukan dalam sistem.`, 'error');
    }
  };

  const handleConfirmCheckIn = () => {
    if (!activeCheckInGuest) return;
    checkInMutation.mutate({
      guestId: activeCheckInGuest.id,
      actualPax: Number(checkInPax) || 1,
      souvenirGiven: giveSouvenir,
      method: 'MANUAL',
    });
  };

  const handleCopyWaLink = (g: InvitedGuest) => {
    const origin = window.location.origin;
    const url = `${origin}/?to=${encodeURIComponent(g.name)}&c=${g.slug}`;
    const text = `Kepada Yth. Bapak/Ibu/Saudara/i *${g.name}*\n\nTanpa mengurangi rasa hormat, kami mengundang Anda untuk hadir di acara pernikahan kami.\n\nKlik tautan resmi undangan digital Anda di bawah ini:\n${url}\n\nKode Akses Undangan Anda: *${g.slug}*\n\nTerima kasih atas doa & kehadiran Anda!`;

    navigator.clipboard.writeText(text);
    setCopiedSlug(g.slug);
    showToast(`Pesan WhatsApp & link undangan untuk ${g.name} tersalin!`, 'success');
    setTimeout(() => setCopiedSlug(null), 2500);

    if (!g.invitationSent) {
      updateMutation.mutate({
        id: g.id,
        payload: { invitationSent: true },
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Toggle Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-2 rounded-2xl border border-stone-200/80 shadow-xs">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveView('PRESENSI')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeView === 'PRESENSI'
                ? 'bg-[#5A5A40] text-white shadow-md'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Desk Presensi & QR Reader</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('MANAGEMENT')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeView === 'MANAGEMENT'
                ? 'bg-[#5A5A40] text-white shadow-md'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Daftar Tamu (4-Char Slug)</span>
          </button>
        </div>

        {activeView === 'MANAGEMENT' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowBatchModal(true)}
              className="px-3.5 py-2 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Impor Banyak Tamu</span>
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setEditingGuest(null);
                setShowAddModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Tamu Baru</span>
            </button>
          </div>
        )}
      </div>

      {/* Live Presensi Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-stone-500">Total Tamu Diundang</span>
          <p className="text-xl font-extrabold text-stone-900 mt-0.5">{stats.totalInvited} Nama</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-emerald-200 bg-emerald-50/50 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-800">Undangan Terkirim</span>
          <p className="text-xl font-extrabold text-emerald-900 mt-0.5">
            {guests.filter((g) => g.invitationSent).length}{' '}
            <span className="text-xs font-normal text-emerald-700">
              ({guests.length ? Math.round((guests.filter((g) => g.invitationSent).length / guests.length) * 100) : 0}%)
            </span>
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-stone-500">Alokasi Kursi (Pax)</span>
          <p className="text-xl font-extrabold text-stone-900 mt-0.5">{stats.totalPaxAllocated} Kursi</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-emerald-200 bg-emerald-50/50 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-800">Telah Check-in (Hadir)</span>
          <p className="text-xl font-extrabold text-emerald-900 mt-0.5">
            {stats.totalCheckedIn}{' '}
            <span className="text-xs font-normal text-emerald-700">({stats.totalActualPax} pax)</span>
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-amber-200 bg-amber-50/50 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-800">Sisa Belum Hadir</span>
          <p className="text-xl font-extrabold text-amber-900 mt-0.5">{stats.totalRemaining} Tamu</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-purple-700">Souvenir Diserahkan</span>
          <p className="text-xl font-extrabold text-purple-900 mt-0.5">{stats.totalSouvenirsGiven} Paket</p>
        </div>
      </div>

      {/* ========================================== */}
      {/* VIEW 1: RECEPTION DESK / PRESENSI CHECK-IN */}
      {/* ========================================== */}
      {activeView === 'PRESENSI' && (
        <div className="space-y-6">
          {/* Banner link to dedicated Receptionist page */}
          <div className="bg-amber-50/90 border border-amber-200/80 p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 text-xs text-amber-900 font-medium">
              <QrCode className="w-5 h-5 text-amber-800 shrink-0" />
              <span>
                Ingin menggunakan <strong>Kamera Scanner QR Code</strong> secara penuh di HP atau Laptop petugas penerima tamu?
              </span>
            </div>
            <Link
              to="/cms/penerimaan-tamu"
              className="px-3.5 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <span>Buka Halaman Receptionist & QR</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Live Check-In Guest Table with Search Filter & Pagination */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-['Playfair_Display'] text-lg font-bold text-stone-900">
                  Daftar Presensi Kehadiran
                </h3>
                <p className="text-[11px] text-stone-500">
                  {guests.filter((g) => g.isCheckedIn).length} dari {guests.length} tamu telah check-in
                </p>
              </div>
            </div>

              {/* Presensi Table Controls & Filters */}
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative flex-1 w-full">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={presensiTableSearch}
                    onChange={(e) => {
                      setPresensiTableSearch(e.target.value);
                      setPresensiCurrentPage(1);
                    }}
                    placeholder="Cari presensi nama, kode, meja..."
                    className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden"
                  />
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <select
                    value={presensiStatusFilter}
                    onChange={(e) => {
                      setPresensiStatusFilter(e.target.value as any);
                      setPresensiCurrentPage(1);
                    }}
                    className="flex-1 sm:flex-initial px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 outline-hidden"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="HADIR">Sudah Hadir</option>
                    <option value="BELUM">Belum Hadir</option>
                  </select>

                  <select
                    value={presensiCategoryFilter}
                    onChange={(e) => {
                      setPresensiCategoryFilter(e.target.value);
                      setPresensiCurrentPage(1);
                    }}
                    className="flex-1 sm:flex-initial px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 outline-hidden"
                  >
                    <option value="ALL">Kategori</option>
                    <option value="Keluarga">Keluarga</option>
                    <option value="Sahabat">Sahabat</option>
                    <option value="VIP">VIP</option>
                    <option value="Rekan Kerja">Rekan Kerja</option>
                    <option value="Umum">Umum</option>
                  </select>

                  <select
                    value={presensiPageSize}
                    onChange={(e) => {
                      setPresensiPageSize(Number(e.target.value));
                      setPresensiCurrentPage(1);
                    }}
                    className="px-2 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 outline-hidden shrink-0"
                  >
                    <option value={5}>5 / hal</option>
                    <option value={10}>10 / hal</option>
                    <option value={20}>20 / hal</option>
                    <option value={50}>50 / hal</option>
                  </select>
                </div>
              </div>

              {/* Table Data */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Kode</th>
                      <th className="py-2.5 px-3">Nama Tamu</th>
                      <th className="py-2.5 px-3">Kategori</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {paginatedPresensiGuests.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-stone-400">
                          Tidak ditemukan data presensi yang sesuai.
                        </td>
                      </tr>
                    ) : (
                      paginatedPresensiGuests.map((g) => (
                        <tr
                          key={g.id}
                          className={`hover:bg-stone-50/80 transition-colors ${
                            g.isCheckedIn ? 'bg-emerald-50/30' : ''
                          }`}
                        >
                          <td className="py-3 px-3 font-mono font-bold text-stone-900">{g.slug}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-stone-900">{g.name}</p>
                              <a
                                href={`/?to=${encodeURIComponent(g.name)}&c=${g.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 text-[10px] font-bold transition-colors cursor-pointer shrink-0"
                                title={`Buka Halaman Undangan ${g.name}`}
                              >
                                <ExternalLink className="w-3 h-3 text-amber-700" />
                                <span>Buka Link</span>
                              </a>
                            </div>
                            {g.tableNumber && (
                              <span className="text-[10px] text-stone-500">Meja: {g.tableNumber}</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-stone-600 font-medium">{g.category}</td>
                          <td className="py-3 px-3 text-center">
                            {g.isCheckedIn ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Hadir ({g.actualPax || g.pax} pax)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-500 text-[10px] font-medium">
                                Belum Hadir
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {g.isCheckedIn ? (
                              <button
                                type="button"
                                onClick={() => undoCheckInMutation.mutate(g.id)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                                title="Batalkan Check-In"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveCheckInGuest(g);
                                  setCheckInPax(g.pax);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-[10px] font-bold hover:bg-emerald-800 transition-colors cursor-pointer shadow-xs"
                              >
                                Check-In
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Presensi Pagination Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-stone-100 text-xs text-stone-600">
                <div>
                  Menampilkan{' '}
                  <strong>
                    {totalPresensiItems > 0 ? startPresensiIndex + 1 : 0} -{' '}
                    {Math.min(startPresensiIndex + presensiPageSize, totalPresensiItems)}
                  </strong>{' '}
                  dari <strong>{totalPresensiItems}</strong> data presensi
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPresensiCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={safePresensiPage <= 1}
                    className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                    title="Halaman Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: totalPresensiPages }, (_, i) => i + 1).map((pg) => (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => setPresensiCurrentPage(pg)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        safePresensiPage === pg
                          ? 'bg-[#5A5A40] text-white shadow-xs'
                          : 'text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      {pg}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setPresensiCurrentPage((p) => Math.min(p + 1, totalPresensiPages))}
                    disabled={safePresensiPage >= totalPresensiPages}
                    className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                    title="Halaman Selanjutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
        </div>
      )}

      {/* ========================================== */}
      {/* VIEW 2: GUEST MANAGEMENT (4-CHAR SLUG) */}
      {/* ========================================== */}
      {activeView === 'MANAGEMENT' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Category Filter */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {['ALL', 'Keluarga', 'Sahabat', 'VIP', 'Rekan Kerja', 'Umum'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setFilterCategory(cat);
                      setManagementCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      filterCategory === cat
                        ? 'bg-[#5A5A40] text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {cat === 'ALL' ? 'Semua Kategori' : cat}
                  </button>
                ))}
              </div>

              {/* Sent Status Filter */}
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setSentFilter('ALL');
                    setManagementCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    sentFilter === 'ALL' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSentFilter('SENT');
                    setManagementCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    sentFilter === 'SENT' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Terkirim ({guests.filter((g) => g.invitationSent).length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSentFilter('UNSENT');
                    setManagementCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    sentFilter === 'UNSENT' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>Belum ({guests.filter((g) => !g.invitationSent).length})</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              {paginatedManagementGuests.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const idsToMark = paginatedManagementGuests.map((g) => g.id);
                    batchSentMutation.mutate({ ids: idsToMark, sentStatus: true });
                  }}
                  disabled={batchSentMutation.isPending}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  title="Tandai semua tamu yang tampil pada halaman ini sebagai sudah dikirim"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Tandai Halaman Ini Terkirim ({paginatedManagementGuests.length})</span>
                </button>
              )}

              <div className="relative w-full sm:w-56">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setManagementCurrentPage(1);
                  }}
                  placeholder="Cari nama, kode, IG..."
                  className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden"
                />
              </div>

              <select
                value={managementPageSize}
                onChange={(e) => {
                  setManagementPageSize(Number(e.target.value));
                  setManagementCurrentPage(1);
                }}
                className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 outline-hidden shrink-0 cursor-pointer"
                title="Jumlah Tampilan per Halaman"
              >
                <option value={5}>5 / hal</option>
                <option value={10}>10 / hal</option>
                <option value={20}>20 / hal</option>
                <option value={50}>50 / hal</option>
              </select>
            </div>
          </div>

          {/* Guest Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Kode 4-Char</th>
                  <th className="py-3 px-3">Nama Tamu & Kontak</th>
                  <th className="py-3 px-3">Kategori</th>
                  <th className="py-3 px-3 text-center">Kuota & Meja</th>
                  <th className="py-3 px-3 text-center">Status Undangan</th>
                  <th className="py-3 px-3 text-center">WhatsApp & Tautan Unik</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginatedManagementGuests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-stone-400">
                      Tidak ditemukan data tamu undangan sesuai filter.
                    </td>
                  </tr>
                ) : (
                  paginatedManagementGuests.map((g) => {
                    const cleanIg = g.instagram
                      ? g.instagram.replace(/^@/, '').replace(/https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '').trim()
                      : '';
                    const igUrl = cleanIg ? `https://instagram.com/${cleanIg}` : '';

                    return (
                      <tr key={g.id} className="hover:bg-stone-50 transition-colors">
                        <td className="py-3 px-3 font-mono font-extrabold text-stone-900 text-sm">
                          <span className="px-2 py-1 bg-stone-100 rounded-md border border-stone-200">
                            {g.slug}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-stone-900">{g.name}</p>
                            <a
                              href={`/?to=${encodeURIComponent(g.name)}&c=${g.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded-md text-amber-700 hover:text-amber-900 hover:bg-amber-100/80 transition-colors"
                              title={`Buka Link Undangan ${g.name}`}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[10px] text-stone-500">
                            {g.phone && (
                              <span className="flex items-center gap-1 text-stone-600">
                                <Phone className="w-3 h-3 text-stone-400" />
                                <span>{g.phone}</span>
                              </span>
                            )}

                            {cleanIg && (
                              <a
                                href={igUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-pink-50 hover:bg-pink-100 text-pink-700 font-medium transition-colors border border-pink-200/80"
                                title={`Buka Profil Instagram @${cleanIg}`}
                              >
                                <Instagram className="w-3 h-3 text-pink-600" />
                                <span>@{cleanIg}</span>
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[10px] font-semibold">
                            {g.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <p className="font-semibold text-stone-800">{g.pax} Org</p>
                          {g.tableNumber && (
                            <span className="text-[10px] text-stone-500">{g.tableNumber}</span>
                          )}
                        </td>

                        {/* Status Pengiriman Undangan Toggle */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              updateMutation.mutate({
                                id: g.id,
                                payload: { invitationSent: !g.invitationSent },
                              });
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border ${
                              g.invitationSent
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-stone-50 text-stone-500 border-stone-300 hover:bg-stone-100'
                            }`}
                            title="Klik untuk mengubah status pengiriman undangan"
                          >
                            {g.invitationSent ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Terkirim</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                <span>Belum Dikirim</span>
                              </>
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <a
                              href={`/?to=${encodeURIComponent(g.name)}&c=${g.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/90 text-[11px] font-bold transition-colors cursor-pointer"
                              title={`Buka Halaman Undangan ${g.name} di tab baru`}
                            >
                              <ExternalLink className="w-3 h-3 text-amber-700" />
                              <span>Undangan</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopyWaLink(g)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              {copiedSlug === g.slug ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Tersalin!</span>
                                </>
                              ) : (
                                <>
                                  <Share2 className="w-3 h-3 text-emerald-700" />
                                  <span>Salin WA</span>
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                handleEditClick(g);
                                setShowAddModal(true);
                              }}
                              className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                              title="Edit Data Tamu"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteConfirmTarget({ id: g.id, name: g.name });
                              }}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Hapus Tamu"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Management Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-stone-100 text-xs text-stone-600">
            <div>
              Menampilkan{' '}
              <strong>
                {totalManagementItems > 0 ? startManagementIndex + 1 : 0} -{' '}
                {Math.min(startManagementIndex + managementPageSize, totalManagementItems)}
              </strong>{' '}
              dari <strong>{totalManagementItems}</strong> tamu undangan
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setManagementCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={safeManagementPage <= 1}
                className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalManagementPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  type="button"
                  onClick={() => setManagementCurrentPage(pg)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    safeManagementPage === pg
                      ? 'bg-[#5A5A40] text-white shadow-xs'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {pg}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setManagementCurrentPage((p) => Math.min(p + 1, totalManagementPages))}
                disabled={safeManagementPage >= totalManagementPages}
                className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                title="Halaman Selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT GUEST MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
              <h3 className="text-base font-bold text-stone-900">
                {editingGuest ? 'Edit Data Tamu Undangan' : 'Tambah Tamu Undangan Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSingle} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Nama Tamu Undangan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Budi Santoso, S.T. & Istri"
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-[#5A5A40] outline-hidden font-semibold text-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Kategori</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-[#5A5A40] outline-hidden"
                  >
                    <option value="Keluarga">Keluarga</option>
                    <option value="Sahabat">Sahabat</option>
                    <option value="VIP">VIP</option>
                    <option value="Rekan Kerja">Rekan Kerja</option>
                    <option value="Umum">Umum</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Kuota Kursi (Pax)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={formPax}
                    onChange={(e) => setFormPax(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-[#5A5A40] outline-hidden font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">No. WhatsApp / HP</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="08123456789"
                    className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-[#5A5A40] outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Nomor Meja</label>
                  <input
                    type="text"
                    value={formTable}
                    onChange={(e) => setFormTable(e.target.value)}
                    placeholder="Contoh: Meja A2"
                    className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-[#5A5A40] outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <Instagram className="w-3.5 h-3.5 text-pink-600" />
                  <span>Kontak Instagram (Handle / Link)</span>
                </label>
                <input
                  type="text"
                  value={formInstagram}
                  onChange={(e) => setFormInstagram(e.target.value)}
                  placeholder="Contoh: @budi.santoso atau instagram.com/budi.santoso"
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-[#5A5A40] outline-hidden"
                />
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-50 border border-stone-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formInvitationSent}
                  onChange={(e) => setFormInvitationSent(e.target.checked)}
                  className="w-4 h-4 rounded-md accent-[#5A5A40] cursor-pointer"
                />
                <div>
                  <span className="font-bold text-stone-800 text-xs">Undangan Sudah Dikirimkan</span>
                  <p className="text-[10px] text-stone-500">Tandai bahwa tautan undangan telah disampaikan ke tamu ini</p>
                </div>
              </label>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-[#5A5A40] hover:bg-[#484833] text-white font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {editingGuest ? 'Simpan Perubahan' : 'Tambah Tamu & Generate Slug'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BATCH IMPORT MODAL */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#5A5A40]" />
                <span>Impor Banyak Tamu Sekaligus</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="p-1 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitBatch} className="space-y-4 text-xs">
              <p className="text-stone-500 leading-relaxed">
                Ketik atau tempel (paste) daftar nama tamu undangan, 1 nama per baris.
                <br />
                <span className="text-[10px] font-semibold text-stone-700">
                  Format Opsional: Nama, Kategori, Pax, Telepon, Meja, Note, Instagram (contoh: <code>Budi Santoso, VIP, 2, 081234567, Meja A1, Catatan, @budi.ig</code>)
                </span>
              </p>

              <textarea
                rows={8}
                value={batchRawText}
                onChange={(e) => setBatchRawText(e.target.value)}
                placeholder={`Drs. Ahmad Dahlan, Keluarga, 2, 08123456780, Meja VIP, @ahmad.dahlan\nSiti Aminah & Suami, Sahabat, 2, 08123456781, Meja 02, , @siti.aminah\nRudi Hermawan, VIP, 1`}
                className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono focus:bg-white focus:border-[#5A5A40] outline-hidden leading-relaxed"
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={batchMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-[#5A5A40] hover:bg-[#484833] text-white font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {batchMutation.isPending ? 'Mengimpor...' : 'Proses Impor Banyak Tamu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHECK-IN CONFIRMATION MODAL */}
      {activeCheckInGuest && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2 text-[#5A5A40]">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-stone-900">Konfirmasi Check-In Tamu</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveCheckInGuest(null)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Kode Tamu</span>
                <span className="font-mono font-bold text-stone-900 bg-white px-2 py-0.5 rounded-md border border-stone-200 text-xs">
                  {activeCheckInGuest.slug}
                </span>
              </div>
              <div>
                <h4 className="font-bold text-stone-900 text-base">{activeCheckInGuest.name}</h4>
                <p className="text-xs text-stone-500">
                  Kategori: <span className="font-semibold text-stone-700">{activeCheckInGuest.category}</span>
                  {activeCheckInGuest.tableNumber && ` • Meja: ${activeCheckInGuest.tableNumber}`}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Jumlah Kehadiran Nyata (Actual Pax)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={checkInPax}
                    onChange={(e) => setCheckInPax(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl font-bold text-stone-900 text-sm focus:bg-white focus:border-[#5A5A40] outline-hidden"
                  />
                  <span className="text-stone-500 font-semibold shrink-0">Pax / Orang</span>
                </div>
                <p className="text-[10px] text-stone-400 mt-1">Alokasi awal: {activeCheckInGuest.pax} pax</p>
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={giveSouvenir}
                  onChange={(e) => setGiveSouvenir(e.target.checked)}
                  className="w-4 h-4 rounded-md accent-[#5A5A40] cursor-pointer"
                />
                <div>
                  <span className="font-bold text-stone-800 text-xs">Serahkan Souvenir / Kado Fisik</span>
                  <p className="text-[10px] text-stone-500">Tandai bahwa souvenir telah diberikan</p>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setActiveCheckInGuest(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 font-semibold hover:bg-stone-50 cursor-pointer text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmCheckIn}
                disabled={checkInMutation.isPending}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {checkInMutation.isPending ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Konfirmasi Check-In</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirmTarget)}
        title="Hapus Tamu Undangan"
        message={`Apakah Anda yakin ingin menghapus "${deleteConfirmTarget?.name || ''}" dari daftar tamu undangan?`}
        confirmText="Hapus Tamu"
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
