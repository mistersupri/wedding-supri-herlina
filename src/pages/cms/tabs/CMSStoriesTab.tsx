import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { Sparkles, Plus, Trash2, Edit2, Calendar, Save, X, Image as ImageIcon } from 'lucide-react';
import {
  fetchCMSStories,
  createCMSStory,
  updateCMSStory,
  deleteCMSStory,
} from '../../../lib/api.js';
import { LoveStoryItem } from '../../../types.js';
import { ImageUploadInput } from '../../../components/common/ImageUploadInput.js';
import { ConfirmModal } from '../../../components/common/ConfirmModal.js';

export const CMSStoriesTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useOutletContext<{ showToast: (msg: string, type?: 'success' | 'error') => void }>();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStory, setCurrentStory] = useState<Partial<LoveStoryItem> | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string; title: string } | null>(null);

  const { data: stories, isLoading, error } = useQuery({
    queryKey: ['cms-stories'],
    queryFn: fetchCMSStories,
  });

  const createMutation = useMutation({
    mutationFn: createCMSStory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-stories'] });
      queryClient.invalidateQueries({ queryKey: ['invitation'] });
      showToast('Kisah cinta berhasil ditambahkan!', 'success');
      setIsModalOpen(false);
      setCurrentStory(null);
    },
    onError: (err: any) => {
      showToast(err.message || 'Gagal menambahkan kisah', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<LoveStoryItem> }) =>
      updateCMSStory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-stories'] });
      queryClient.invalidateQueries({ queryKey: ['invitation'] });
      showToast('Kisah cinta berhasil diperbarui!', 'success');
      setIsModalOpen(false);
      setCurrentStory(null);
    },
    onError: (err: any) => {
      showToast(err.message || 'Gagal memperbarui kisah', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCMSStory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-stories'] });
      queryClient.invalidateQueries({ queryKey: ['invitation'] });
      showToast('Kisah cinta berhasil dihapus!', 'success');
    },
    onError: (err: any) => {
      showToast(err.message || 'Gagal menghapus kisah', 'error');
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-stone-500">
        <div className="w-8 h-8 rounded-full border-3 border-[#5A5A40]/30 border-t-[#5A5A40] animate-spin mb-3" />
        <p className="text-xs">Memuat kisah cinta...</p>
      </div>
    );
  }

  if (error || !stories) {
    return (
      <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center">
        <p className="text-xs font-semibold text-rose-700">Gagal memuat linimasa kisah cinta</p>
      </div>
    );
  }

  const handleAddNew = () => {
    setCurrentStory({
      year: new Date().getFullYear().toString(),
      title: '',
      description: '',
      photoUrl: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (item: LoveStoryItem) => {
    setCurrentStory({ ...item });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, title: string) => {
    setDeleteConfirmTarget({ id, title });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStory) return;

    if (currentStory.id) {
      updateMutation.mutate({
        id: currentStory.id,
        payload: currentStory,
      });
    } else {
      createMutation.mutate(currentStory as Omit<LoveStoryItem, 'id'>);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-['Playfair_Display'] text-2xl md:text-3xl font-bold text-stone-900">
            Linimasa Kisah Cinta (Love Story)
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Ceritakan perjalanan cinta Anda berdua dari awal perkenalan, komitmen, hingga hari bahagia
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddNew}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#5A5A40] hover:bg-[#494934] text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-[#5A5A40]/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kisah Cinta</span>
        </button>
      </div>

      {/* Stories Timeline */}
      <div className="space-y-4">
        {stories.map((story, index) => (
          <div
            key={story.id}
            className="bg-white rounded-3xl border border-stone-200/80 p-6 shadow-xs flex flex-col md:flex-row items-start gap-6 hover:shadow-md transition-shadow"
          >
            {/* Story Photo */}
            <div className="w-full md:w-44 h-40 rounded-2xl bg-stone-100 overflow-hidden shrink-0 border border-stone-200/60 relative">
              {story.photoUrl ? (
                <img
                  src={story.photoUrl}
                  alt={story.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 p-4 text-center">
                  <ImageIcon className="w-8 h-8 mb-1 opacity-50" />
                  <span className="text-[10px]">Tanpa Foto</span>
                </div>
              )}
              <span className="absolute top-2 left-2 bg-[#5A5A40] text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                {story.year}
              </span>
            </div>

            {/* Story Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <span className="text-[10px] font-bold text-[#5A5A40] uppercase tracking-wider">
                    Milestone #{index + 1} • {story.year}
                  </span>
                  <h3 className="text-base font-bold text-stone-900 mt-0.5">{story.title}</h3>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleEdit(story)}
                    className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer"
                    title="Edit Kisah"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(story.id, story.title)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
                    title="Hapus Kisah"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-line">
                {story.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Edit / Add */}
      {isModalOpen && currentStory && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-stone-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-100">
              <h3 className="text-base font-bold text-stone-900">
                {currentStory.id ? 'Edit Milestone Kisah Cinta' : 'Tambah Milestone Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Tahun / Waktu
                  </label>
                  <input
                    type="text"
                    required
                    value={currentStory.year || ''}
                    onChange={(e) => setCurrentStory({ ...currentStory, year: e.target.value })}
                    placeholder="2021"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Judul Milestone
                  </label>
                  <input
                    type="text"
                    required
                    value={currentStory.title || ''}
                    onChange={(e) => setCurrentStory({ ...currentStory, title: e.target.value })}
                    placeholder="misal: Pertemuan Pertama di Kampus"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Cerita & Kenangan
                </label>
                <textarea
                  rows={4}
                  required
                  value={currentStory.description || ''}
                  onChange={(e) =>
                    setCurrentStory({ ...currentStory, description: e.target.value })
                  }
                  placeholder="Ceritakan momen indah dan berkesan yang terjadi pada tahun tersebut..."
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden leading-relaxed"
                />
              </div>

              <div>
                <ImageUploadInput
                  value={currentStory.photoUrl || ''}
                  onChange={(url) => setCurrentStory({ ...currentStory, photoUrl: url })}
                  label="Foto Momen / Kenangan (Opsional)"
                  aspectRatio="landscape"
                  maxDimension={1200}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                    : 'Simpan Kisah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirmTarget)}
        title="Hapus Milestone Kisah Cinta"
        message={`Apakah Anda yakin ingin menghapus milestone kisah "${deleteConfirmTarget?.title || ''}"?`}
        confirmText="Hapus Milestone"
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
