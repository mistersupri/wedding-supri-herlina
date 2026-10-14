import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import {
  Camera,
  Search,
  Trash2,
  Eye,
  Download,
  Users,
  Heart,
  MessageCircle,
  RefreshCw,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Frame,
  Check,
  Upload,
  Image as ImageIcon,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import {
  fetchCMSPhotoMoments,
  deleteCMSPhotoMoment,
  fetchCMSPhotoFrameConfig,
  updateCMSPhotoFrameConfig,
} from '../../../lib/api.js';
import { PhotoMoment, PhotoFrameConfig } from '../../../types.js';
import { FRAME_PRESETS } from '../../../lib/photoFramePresets.js';
import { ConfirmModal } from '../../../components/common/ConfirmModal.js';

export const CMSPhotoMomentsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useOutletContext<{
    showToast: (msg: string, type?: 'success' | 'error') => void;
  }>();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'with_caption' | 'with_reactions'>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoMoment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PhotoMoment | null>(null);

  // Frame Config State
  const [showFrameConfigPanel, setShowFrameConfigPanel] = useState(false);
  const [frameEnabled, setFrameEnabled] = useState(true);
  const [frameOverlayUrl, setFrameOverlayUrl] = useState('');
  const [frameName, setFrameName] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState('gold_elegance');

  const { data: frameConfigData } = useQuery({
    queryKey: ['cms-photo-frame-config'],
    queryFn: fetchCMSPhotoFrameConfig,
  });

  React.useEffect(() => {
    if (frameConfigData) {
      setFrameEnabled(frameConfigData.enabled);
      setFrameOverlayUrl(frameConfigData.frameOverlayUrl || FRAME_PRESETS[0].dataUrl);
      setFrameName(frameConfigData.frameName || FRAME_PRESETS[0].name);
      
      const matched = FRAME_PRESETS.find((p) => p.dataUrl === frameConfigData.frameOverlayUrl);
      if (matched) {
        setSelectedPresetId(matched.id);
      } else {
        setSelectedPresetId('custom');
      }
    }
  }, [frameConfigData]);

  const updateFrameMutation = useMutation({
    mutationFn: updateCMSPhotoFrameConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-photo-frame-config'] });
      queryClient.invalidateQueries({ queryKey: ['public-photo-frame-config'] });
      showToast('Konfigurasi template frame foto berhasil disimpan!', 'success');
    },
    onError: (err: any) => {
      showToast(err.message || 'Gagal menyimpan konfigurasi frame.', 'error');
    },
  });

  const handleSelectPreset = (preset: typeof FRAME_PRESETS[0]) => {
    setSelectedPresetId(preset.id);
    setFrameOverlayUrl(preset.dataUrl);
    setFrameName(preset.name);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran file frame maksimal 5MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFrameOverlayUrl(result);
      setFrameName(file.name || 'Custom Overlay Frame');
      setSelectedPresetId('custom');
      showToast('Gambar frame overlay kustom berhasil diunggah!', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveFrameConfig = () => {
    updateFrameMutation.mutate({
      enabled: frameEnabled,
      frameOverlayUrl: frameOverlayUrl || FRAME_PRESETS[0].dataUrl,
      frameName: frameName || 'Custom Frame',
    });
  };

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['cms-photo-moments'],
    queryFn: fetchCMSPhotoMoments,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCMSPhotoMoment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-photo-moments'] });
      showToast('Foto tamu berhasil dihapus.', 'success');
      setDeleteTarget(null);
      if (selectedPhoto?.id === deleteTarget?.id) {
        setSelectedPhoto(null);
      }
    },
    onError: (err: any) => {
      showToast(err.message || 'Gagal menghapus foto.', 'error');
    },
  });

  const moments = data?.data || [];

  // Stats
  const totalPhotos = moments.length;
  const uniqueGuests = new Set(moments.map((m) => m.guestName)).size;
  const totalLikes = moments.reduce((acc, m) => acc + (m.likesCount || 0), 0);

  // Filter & Search Logic
  const filteredMoments = moments.filter((m) => {
    const matchesSearch =
      m.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.guestSlug && m.guestSlug.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.caption && m.caption.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === 'with_caption') {
      return Boolean(m.caption && m.caption.trim().length > 0);
    }
    if (filterType === 'with_reactions') {
      return (m.likesCount || 0) > 0 || (m.reactions && Object.keys(m.reactions).length > 0);
    }
    return true;
  });

  // Handle Download Photo
  const handleDownload = (photo: PhotoMoment) => {
    const link = document.createElement('a');
    link.href = photo.photoUrl;
    link.download = `photo-moment-${photo.guestName.replace(/\s+/g, '-')}-${photo.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Foto berhasil diunduh.', 'success');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-stone-500">
        <div className="w-10 h-10 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-stone-400">Memuat foto jepretan tamu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-rose-950/20 border border-rose-800/40 rounded-3xl text-rose-300 my-6">
        <ShieldAlert className="w-10 h-10 mx-auto mb-3 text-rose-500" />
        <p className="text-sm font-semibold">Gagal memuat galeri Photo Moments tamu.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-rose-900/60 hover:bg-rose-800 text-rose-100 text-xs font-bold rounded-xl transition-all"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-900 border border-stone-800 p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl shrink-0">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-wide">
              Photo Moments (Jepretan Tamu)
            </h1>
            <p className="text-xs text-stone-400 mt-0.5">
              Kelola dan pantau seluruh foto yang diunggah para tamu melalui fitur Kamera Disposable.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setShowFrameConfigPanel((prev) => !prev)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
              showFrameConfigPanel
                ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-lg'
                : 'bg-stone-800 hover:bg-stone-750 text-amber-400 border-amber-500/30'
            }`}
          >
            <Frame className="w-4 h-4" />
            <span>{showFrameConfigPanel ? 'Tutup Pengaturan Frame' : 'Atur Template Frame PNG'}</span>
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-2xl flex items-center gap-2 border border-stone-700/80 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin text-amber-400' : ''}`} />
            <span>Refresh Galeri</span>
          </button>
        </div>
      </div>

      {/* Frame Configuration Card (Accordion / Toggleable Panel) */}
      {showFrameConfigPanel && (
        <div className="bg-stone-900 border border-amber-500/40 rounded-3xl p-6 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
            <div>
              <div className="flex items-center gap-2">
                <Frame className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-extrabold text-white">
                  Konfigurasi Template Frame Foto (PNG Overlay)
                </h2>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                Atur bingkai/frame overlay yang akan otomatis ditempelkan di atas foto jepretan tamu sebelum diunggah.
              </p>
            </div>

            {/* Toggle Active Switch */}
            <label className="flex items-center gap-3 bg-stone-850 px-4 py-2.5 rounded-2xl border border-stone-750 cursor-pointer shrink-0">
              <span className="text-xs font-bold text-stone-200">
                {frameEnabled ? 'Status Frame: AKTIF' : 'Status Frame: NONAKTIF'}
              </span>
              <input
                type="checkbox"
                checked={frameEnabled}
                onChange={(e) => setFrameEnabled(e.target.checked)}
                className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
              />
            </label>
          </div>

          {/* Preset Frame Options Grid */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Pilih Template Frame Bawaan:</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {FRAME_PRESETS.map((preset) => {
                const isSelected = selectedPresetId === preset.id && frameOverlayUrl === preset.dataUrl;
                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`relative p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-950/20 border-amber-500 ring-2 ring-amber-500/30'
                        : 'bg-stone-850 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="relative aspect-3/4 bg-stone-950 rounded-xl overflow-hidden border border-stone-800 flex items-center justify-center p-2">
                        {/* Sample Photo Background */}
                        <img
                          src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=400&q=80"
                          alt="Sample Preview"
                          className="w-full h-full object-cover rounded-lg"
                        />
                        {/* Overlay Frame */}
                        <img
                          src={preset.dataUrl}
                          alt={preset.name}
                          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                        />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center justify-between">
                          <span>{preset.name}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
                        </h4>
                        <p className="text-[10px] text-stone-400 line-clamp-2 mt-0.5">
                          {preset.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Upload or Image URL Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-stone-800">
            {/* Custom PNG Upload */}
            <div className="bg-stone-850 p-4 rounded-2xl border border-stone-800 space-y-2">
              <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-amber-400" />
                <span>Unggah Gambar Frame PNG Kustom:</span>
              </label>
              <p className="text-[11px] text-stone-400">
                Gunakan gambar format PNG dengan area tengah transparan (misal rasio 4:5 atau 3:4).
              </p>
              <input
                type="file"
                accept="image/png,image/webp"
                onChange={handleFileUpload}
                className="block w-full text-xs text-stone-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-stone-950 hover:file:bg-amber-400 cursor-pointer"
              />
            </div>

            {/* Custom URL Input */}
            <div className="bg-stone-850 p-4 rounded-2xl border border-stone-800 space-y-2">
              <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <span>Atau Tempelkan URL Gambar Frame PNG:</span>
              </label>
              <input
                type="text"
                value={frameOverlayUrl}
                onChange={(e) => {
                  setFrameOverlayUrl(e.target.value);
                  setSelectedPresetId('custom');
                }}
                placeholder="https://example.com/frame-wedding.png"
                className="w-full bg-stone-900 border border-stone-750 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          {/* Save Action Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleSaveFrameConfig}
              disabled={updateFrameMutation.isPending}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-extrabold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {updateFrameMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Simpan Konfigurasi Frame</span>
            </button>
          </div>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl shadow-md flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <span className="text-2xl font-black text-white">{totalPhotos}</span>
            <p className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">
              Total Foto Terunggah
            </p>
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl shadow-md flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-2xl font-black text-white">{uniqueGuests}</span>
            <p className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">
              Tamu Berkontribusi
            </p>
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl shadow-md flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <span className="text-2xl font-black text-white">{totalLikes}</span>
            <p className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">
              Total Likes & Reaksi
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-900 border border-stone-800 p-4 rounded-2xl">
        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama tamu, kode, ucapan..."
            className="w-full bg-stone-850 border border-stone-750 text-white placeholder-stone-400 text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-hidden focus:border-amber-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-stone-400 shrink-0">Filter:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="bg-stone-850 border border-stone-750 text-stone-200 text-xs rounded-xl px-3 py-2.5 focus:outline-hidden focus:border-amber-500 transition-all cursor-pointer w-full sm:w-auto"
          >
            <option value="all">Semua Foto ({moments.length})</option>
            <option value="with_caption">Dengan Pesan/Ucapan</option>
            <option value="with_reactions">Dengan Reaksi/Likes</option>
          </select>
        </div>
      </div>

      {/* Photo Gallery Grid */}
      {filteredMoments.length === 0 ? (
        <div className="p-12 text-center bg-stone-900 border border-stone-800 rounded-3xl text-stone-400">
          <Camera className="w-12 h-12 mx-auto mb-3 text-stone-600" />
          <p className="text-sm font-semibold">Tidak ada foto yang cocok dengan pencarian.</p>
          <p className="text-xs text-stone-500 mt-1">Coba ubah kata kunci atau reset filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMoments.map((photo) => (
            <div
              key={photo.id}
              className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-lg group hover:border-stone-700 transition-all flex flex-col justify-between"
            >
              {/* Photo Image Container */}
              <div
                className="relative aspect-4/5 bg-stone-950 overflow-hidden cursor-pointer group"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img
                  src={photo.photoUrl}
                  alt={`Moment by ${photo.guestName}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />

                {/* Top Overlay Badges */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 z-10">
                  <span className="px-2.5 py-1 bg-black/75 backdrop-blur-md rounded-full text-[10px] font-bold text-white tracking-wide truncate max-w-[140px]">
                    {photo.guestName}
                  </span>
                  {photo.guestSlug && (
                    <span className="px-2 py-0.5 bg-amber-500 text-stone-950 font-mono font-black text-[9px] rounded-md tracking-wider">
                      {photo.guestSlug}
                    </span>
                  )}
                </div>

                {/* Hover Overlay Actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPhoto(photo);
                    }}
                    className="p-2.5 bg-white/20 hover:bg-white/40 text-white backdrop-blur-md rounded-full transition-all cursor-pointer shadow-lg active:scale-90"
                    title="Pratinjau Foto"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(photo);
                    }}
                    className="p-2.5 bg-white/20 hover:bg-white/40 text-white backdrop-blur-md rounded-full transition-all cursor-pointer shadow-lg active:scale-90"
                    title="Unduh Foto"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(photo);
                    }}
                    className="p-2.5 bg-rose-600/80 hover:bg-rose-600 text-white backdrop-blur-md rounded-full transition-all cursor-pointer shadow-lg active:scale-90"
                    title="Hapus Foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Photo Metadata Footer */}
              <div className="p-3 space-y-2 border-t border-stone-800/80 bg-stone-900/90">
                {photo.caption ? (
                  <p className="text-xs text-stone-300 italic line-clamp-2 leading-tight">
                    "{photo.caption}"
                  </p>
                ) : (
                  <p className="text-[11px] text-stone-500 italic">Tidak ada pesan.</p>
                )}

                <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono pt-1">
                  <span>
                    {new Date(photo.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>

                  <div className="flex items-center gap-1 font-bold text-amber-400">
                    <Heart className="w-3 h-3 fill-amber-400/20 text-amber-400" />
                    <span>{photo.likesCount || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image Preview Stage */}
            <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px] md:min-h-[450px]">
              <img
                src={selectedPhoto.photoUrl}
                alt={selectedPhoto.guestName}
                className="max-h-[70vh] md:max-h-[85vh] w-auto max-w-full object-contain"
              />
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full border border-white/20 transition-all cursor-pointer md:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sidebar Details Panel */}
            <div className="w-full md:w-80 p-6 bg-stone-900 border-t md:border-t-0 md:border-l border-stone-800 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <h3 className="font-extrabold text-white text-base">
                      {selectedPhoto.guestName}
                    </h3>
                    <span className="text-[11px] text-stone-400 font-mono">
                      {new Date(selectedPhoto.createdAt).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPhoto(null)}
                    className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-full transition-all cursor-pointer hidden md:block"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {selectedPhoto.guestSlug && (
                  <div className="inline-block px-2.5 py-1 bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold rounded-lg">
                    Kode Tamu: {selectedPhoto.guestSlug}
                  </div>
                )}

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Pesan Ucapan
                  </span>
                  <p className="text-xs text-stone-200 bg-stone-850 p-3 rounded-xl border border-stone-800 italic leading-relaxed">
                    {selectedPhoto.caption || 'Tidak ada ucapan ditulis oleh tamu.'}
                  </p>
                </div>

                {/* Reaction Summary */}
                {selectedPhoto.reactions && Object.keys(selectedPhoto.reactions).length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                      Reaksi Tamu ({selectedPhoto.likesCount})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(selectedPhoto.reactions).map(([emoji, count]) => (
                        <span
                          key={emoji}
                          className="px-2.5 py-1 bg-stone-800 border border-stone-700/80 rounded-xl text-xs font-bold text-stone-200 flex items-center gap-1"
                        >
                          <span>{emoji}</span>
                          <span className="text-amber-400 font-mono">{count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-stone-800 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(selectedPhoto)}
                  className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Foto</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(selectedPhoto)}
                  className="px-3.5 py-2.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 rounded-xl transition-all cursor-pointer"
                  title="Hapus Foto Ini"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Hapus Foto Moment Tamu"
        message={`Apakah Anda yakin ingin menghapus foto yang diunggah oleh "${deleteTarget?.guestName}"? Foto ini akan terhapus secara permanen dari galeri publik.`}
        confirmText="Hapus Foto"
        type="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
