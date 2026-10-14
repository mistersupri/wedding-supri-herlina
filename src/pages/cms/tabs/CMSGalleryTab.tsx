import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { Link } from 'react-router-dom';
import {
  Images,
  Plus,
  Trash2,
  Edit2,
  UploadCloud,
  Layers,
  Filter,
  Eye,
  Save,
  X,
  Sparkles,
  Camera,
} from 'lucide-react';
import {
  fetchCMSGallery,
  createCMSGalleryPhoto,
  createCMSBatchGalleryPhotos,
  updateCMSGalleryPhoto,
  deleteCMSGalleryPhoto,
} from '../../../lib/api.js';
import { GalleryPhoto, GalleryCategory } from '../../../types.js';
import { ImageUploadInput } from '../../../components/common/ImageUploadInput.js';
import { BatchGalleryUploadModal } from '../../../components/common/BatchGalleryUploadModal.js';
import { ConfirmModal } from '../../../components/common/ConfirmModal.js';

export const CMSGalleryTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useOutletContext<{ showToast: (msg: string, type?: 'success' | 'error') => void }>();

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState<Partial<GalleryPhoto> | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string; title: string } | null>(null);

  const { data: gallery, isLoading, error } = useQuery({
    queryKey: ['cms-gallery'],
    queryFn: fetchCMSGallery,
  });

  const createMutation = useMutation({
    mutationFn: createCMSGalleryPhoto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-gallery'] });
      queryClient.invalidateQueries({ queryKey: ['invitation'] });
      showToast('Foto berhasil ditambahkan ke galeri!', 'success');
      setIsSingleModalOpen(false);
      setCurrentPhoto(null);
    },
    onError: (err: any) => {
      showToast(err.message || 'Gagal menambahkan foto', 'error');
    },
  });

  const batchMutation = useMutation({
    mutationFn: createCMSBatchGalleryPhotos,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['cms-gallery'] });
      queryClient.invalidateQueries({ queryKey: ['invitation'] });
      showToast(`${created.length} foto berhasil diunggah!`, 'success');
      setIsBatchModalOpen(false);
    },
    onError: (err: any) => {
      showToast(err.message || 'Gagal mengunggah foto batch', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<GalleryPhoto> }) =>
      updateCMSGalleryPhoto(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-gallery'] });
      queryClient.invalidateQueries({ queryKey: ['invitation'] });
      showToast('Foto galeri berhasil diperbarui!', 'success');
      setIsSingleModalOpen(false);
      setCurrentPhoto(null);
    },
    onError: (err: any) => {
      showToast(err.message || 'Gagal memperbarui foto', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCMSGalleryPhoto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-gallery'] });
      queryClient.invalidateQueries({ queryKey: ['invitation'] });
      showToast('Foto berhasil dihapus dari galeri!', 'success');
    },
    onError: (err: any) => {
      showToast(err.message || 'Gagal menghapus foto', 'error');
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-stone-500">
        <div className="w-8 h-8 rounded-full border-3 border-[#5A5A40]/30 border-t-[#5A5A40] animate-spin mb-3" />
        <p className="text-xs">Memuat galeri foto...</p>
      </div>
    );
  }

  if (error || !gallery) {
    return (
      <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center">
        <p className="text-xs font-semibold text-rose-700">Gagal memuat galeri foto</p>
      </div>
    );
  }

  const filteredPhotos =
    selectedCategory === 'ALL'
      ? gallery
      : gallery.filter((p) => p.category === selectedCategory);

  const handleAddNew = () => {
    setCurrentPhoto({
      title: '',
      caption: '',
      category: 'PREWEDDING',
      url: '',
      orderIndex: gallery.length + 1,
    });
    setIsSingleModalOpen(true);
  };

  const handleEdit = (photo: GalleryPhoto) => {
    setCurrentPhoto({ ...photo });
    setIsSingleModalOpen(true);
  };

  const handleDelete = (id: string, title: string) => {
    setDeleteConfirmTarget({ id, title: title || 'foto galeri' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPhoto || !currentPhoto.url) {
      showToast('Foto wajib diunggah!', 'error');
      return;
    }

    if (currentPhoto.id) {
      updateMutation.mutate({
        id: currentPhoto.id,
        payload: currentPhoto,
      });
    } else {
      createMutation.mutate(currentPhoto as Omit<GalleryPhoto, 'id'>);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-['Playfair_Display'] text-2xl md:text-3xl font-bold text-stone-900">
            Galeri Foto Pernikahan
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Unggah foto prewedding, momen lamaran, dan foto kenangan dengan fitur drag-and-drop & batch upload
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Link
            to="/cms/photo-moments"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-900 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Camera className="w-4 h-4 text-amber-600" />
            <span>Lihat Photo Moments Tamu</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsBatchModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-stone-800 hover:bg-stone-900 text-stone-100 text-xs font-semibold rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <Layers className="w-4 h-4 text-amber-300" />
            <span>Unggah Banyak Sekaligus</span>
          </button>
          <button
            type="button"
            onClick={handleAddNew}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#5A5A40] hover:bg-[#494934] text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-[#5A5A40]/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Satu Foto</span>
          </button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { id: 'ALL', label: `Semua Foto (${gallery.length})` },
          { id: 'PREWEDDING', label: 'Prewedding' },
          { id: 'ENGAGEMENT', label: 'Lamaran' },
          { id: 'MOMENTS', label: 'Momen Bahagia' },
          { id: 'CEREMONY', label: 'Akad & Resepsi' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedCategory(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === tab.id
                ? 'bg-[#5A5A40] text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Photo Grid */}
      {filteredPhotos.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200/80 p-12 text-center">
          <Images className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <p className="text-xs font-bold text-stone-700">Belum ada foto dalam kategori ini</p>
          <p className="text-[11px] text-stone-400 mt-1">
            Klik tombol "Tambah Satu Foto" atau "Unggah Banyak Sekaligus" di atas
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPhotos.map((photo) => {
            const isVideo = photo.mediaType === 'VIDEO';

            return (
              <div
                key={photo.id}
                className="group bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="relative aspect-4/3 bg-stone-100 overflow-hidden">
                  {isVideo ? (
                    <video
                      src={photo.url}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 bg-stone-900"
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                  ) : (
                    <img
                      src={photo.url}
                      alt={photo.title || 'Foto Galeri'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-stone-900/80 text-white backdrop-blur-xs">
                      {photo.category}
                    </span>
                    {isVideo && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-amber-500 text-white shadow-xs">
                        VIDEO
                      </span>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(photo)}
                      className="p-2 rounded-xl bg-white text-stone-800 hover:bg-stone-100 transition-colors shadow-md cursor-pointer"
                      title="Edit Media"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(photo.id, photo.title)}
                      className="p-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-md cursor-pointer"
                      title="Hapus Media"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-3">
                  <h4 className="text-xs font-bold text-stone-900 truncate">
                    {photo.title || 'Media Galeri'}
                  </h4>
                  {photo.caption && (
                    <p className="text-[10px] text-stone-500 line-clamp-1 mt-0.5">
                      {photo.caption}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Single Photo Modal */}
      {isSingleModalOpen && currentPhoto && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-stone-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-100">
              <h3 className="text-base font-bold text-stone-900">
                {currentPhoto.id ? 'Edit Foto Galeri' : 'Tambah Foto ke Galeri'}
              </h3>
              <button
                type="button"
                onClick={() => setIsSingleModalOpen(false)}
                className="p-1 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Judul Foto
                </label>
                <input
                  type="text"
                  required
                  value={currentPhoto.title || ''}
                  onChange={(e) => setCurrentPhoto({ ...currentPhoto, title: e.target.value })}
                  placeholder="misal: Romansa Senja"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Kategori
                </label>
                <select
                  value={currentPhoto.category || 'PREWEDDING'}
                  onChange={(e) =>
                    setCurrentPhoto({
                      ...currentPhoto,
                      category: e.target.value as GalleryCategory,
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden"
                >
                  <option value="PREWEDDING">Prewedding</option>
                  <option value="ENGAGEMENT">Lamaran (Engagement)</option>
                  <option value="MOMENTS">Momen Bahagia (Moments)</option>
                  <option value="CEREMONY">Akad & Resepsi (Ceremony)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Keterangan / Caption (Opsional)
                </label>
                <input
                  type="text"
                  value={currentPhoto.caption || ''}
                  onChange={(e) =>
                    setCurrentPhoto({ ...currentPhoto, caption: e.target.value })
                  }
                  placeholder="misal: Senja terindah saat menatap masa depan bersama"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Tipe Media
                </label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setCurrentPhoto({ ...currentPhoto, mediaType: 'IMAGE' })}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      currentPhoto.mediaType !== 'VIDEO'
                        ? 'bg-[#5A5A40] text-white border-[#5A5A40]'
                        : 'bg-stone-50 text-stone-600 border-stone-200'
                    }`}
                  >
                    Foto (Gambar)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPhoto({ ...currentPhoto, mediaType: 'VIDEO' })}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      currentPhoto.mediaType === 'VIDEO'
                        ? 'bg-[#5A5A40] text-white border-[#5A5A40]'
                        : 'bg-stone-50 text-stone-600 border-stone-200'
                    }`}
                  >
                    Video
                  </button>
                </div>
              </div>

              <div>
                <ImageUploadInput
                  value={currentPhoto.url || ''}
                  onChange={(url) => {
                    const isVideoUrl = url.startsWith('data:video/') || url.endsWith('.mp4') || url.endsWith('.webm') || url.includes('/video/') || url.includes('/gallery/');
                    setCurrentPhoto({
                      ...currentPhoto,
                      url,
                      mediaType: isVideoUrl ? 'VIDEO' : currentPhoto.mediaType || 'IMAGE',
                    });
                  }}
                  label="Upload / Link Media (Foto & Video)"
                  allowVideo={true}
                  category="gallery"
                  aspectRatio="auto"
                  maxDimension={1600}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsSingleModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-[#5A5A40] hover:bg-[#494934] text-white text-xs font-semibold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Menyimpan...'
                    : 'Simpan Foto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Upload Modal */}
      {isBatchModalOpen && (
        <BatchGalleryUploadModal
          isOpen={isBatchModalOpen}
          onClose={() => setIsBatchModalOpen(false)}
          onUploadBatch={(photos) => batchMutation.mutate(photos)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirmTarget)}
        title="Hapus Foto Galeri"
        message={`Apakah Anda yakin ingin menghapus "${deleteConfirmTarget?.title || 'foto ini'}" dari galeri?`}
        confirmText="Hapus Foto"
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
