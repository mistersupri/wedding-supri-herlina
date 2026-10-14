import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Save,
  X,
  Sparkles,
  Shirt,
} from 'lucide-react';
import {
  fetchCMSEvents,
  createCMSEvent,
  updateCMSEvent,
  deleteCMSEvent,
} from '../../../lib/api.js';
import { WeddingEvent } from '../../../types.js';
import { ConfirmModal } from '../../../components/common/ConfirmModal.js';

export const CMSEventsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useOutletContext<{ showToast: (msg: string, type?: 'success' | 'error') => void }>();

  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [currentEditEvent, setCurrentEditEvent] = useState<Partial<WeddingEvent> | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string; title: string } | null>(null);

  const { data: events, isLoading, error } = useQuery({
    queryKey: ['cms-events'],
    queryFn: fetchCMSEvents,
  });

  const createMutation = useMutation({
    mutationFn: createCMSEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-events'] });
      queryClient.invalidateQueries({ queryKey: ['invitation'] });
      showToast('Sesi acara berhasil ditambahkan!', 'success');
      setIsEditingModalOpen(false);
      setCurrentEditEvent(null);
    },
    onError: (err: any) => {
      showToast(err.message || 'Gagal menambahkan acara', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<WeddingEvent> }) =>
      updateCMSEvent(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-events'] });
      queryClient.invalidateQueries({ queryKey: ['invitation'] });
      showToast('Sesi acara berhasil diperbarui!', 'success');
      setIsEditingModalOpen(false);
      setCurrentEditEvent(null);
    },
    onError: (err: any) => {
      showToast(err.message || 'Gagal memperbarui acara', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCMSEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-events'] });
      queryClient.invalidateQueries({ queryKey: ['invitation'] });
      showToast('Sesi acara berhasil dihapus!', 'success');
    },
    onError: (err: any) => {
      showToast(err.message || 'Gagal menghapus acara', 'error');
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-stone-500">
        <div className="w-8 h-8 rounded-full border-3 border-[#5A5A40]/30 border-t-[#5A5A40] animate-spin mb-3" />
        <p className="text-xs">Memuat jadwal acara...</p>
      </div>
    );
  }

  if (error || !events) {
    return (
      <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center">
        <p className="text-xs font-semibold text-rose-700">Gagal memuat jadwal acara</p>
      </div>
    );
  }

  const handleAddNew = () => {
    setCurrentEditEvent({
      title: '',
      date: 'Sabtu, 20 November 2026',
      startTime: '08:00 WIB',
      endTime: '11:00 WIB',
      venueName: '',
      address: '',
      mapsUrl: 'https://maps.google.com',
      dressCode: 'Batik / Formal',
      notes: '',
      orderIndex: events.length + 1,
    });
    setIsEditingModalOpen(true);
  };

  const handleEdit = (event: WeddingEvent) => {
    setCurrentEditEvent({ ...event });
    setIsEditingModalOpen(true);
  };

  const handleDelete = (id: string, title: string) => {
    setDeleteConfirmTarget({ id, title });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEditEvent) return;

    if (currentEditEvent.id) {
      updateMutation.mutate({
        id: currentEditEvent.id,
        payload: currentEditEvent,
      });
    } else {
      createMutation.mutate(currentEditEvent as Omit<WeddingEvent, 'id'>);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-['Playfair_Display'] text-2xl md:text-3xl font-bold text-stone-900">
            Jadwal Acara Pernikahan
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Kelola sesi akad nikah, resepsi, lokasi Google Maps, waktu pelaksanaan, dan dress code
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddNew}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#5A5A40] hover:bg-[#494934] text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-[#5A5A40]/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Sesi Acara</span>
        </button>
      </div>

      {/* Events List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {events.map((event) => (
          <div
            key={event.id}
            className="bg-white rounded-3xl border border-stone-200/80 p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100/70 text-amber-900 flex items-center justify-center font-bold">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">{event.title}</h3>
                    <p className="text-[11px] text-stone-500">{event.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleEdit(event)}
                    className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer"
                    title="Edit Acara"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(event.id, event.title)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
                    title="Hapus Acara"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-stone-600">
                <div className="flex items-center gap-2 text-stone-700 font-medium">
                  <Clock className="w-3.5 h-3.5 text-[#5A5A40] shrink-0" />
                  <span>
                    {event.startTime} - {event.endTime}
                  </span>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#5A5A40] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-stone-900">{event.venueName}</p>
                    <p className="text-[11px] text-stone-500 line-clamp-2">{event.address}</p>
                  </div>
                </div>

                {event.dressCode && (
                  <div className="flex items-center gap-2 text-[11px] text-stone-500 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-100">
                    <Shirt className="w-3.5 h-3.5 text-[#5A5A40]" />
                    <span>Dress Code: {event.dressCode}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px]">
              <span className="text-stone-400">Urutan: #{event.orderIndex}</span>
              <a
                href={event.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#5A5A40] font-semibold hover:underline flex items-center gap-1"
              >
                <span>Buka Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Create Modal */}
      {isEditingModalOpen && currentEditEvent && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-stone-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-100">
              <h3 className="text-base font-bold text-stone-900">
                {currentEditEvent.id ? 'Edit Sesi Acara' : 'Tambah Sesi Acara Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingModalOpen(false)}
                className="p-1 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nama Acara
                </label>
                <input
                  type="text"
                  required
                  value={currentEditEvent.title || ''}
                  onChange={(e) =>
                    setCurrentEditEvent({ ...currentEditEvent, title: e.target.value })
                  }
                  placeholder="misal: Akad Nikah / Resepsi Pernikahan"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Tanggal Acara
                </label>
                <input
                  type="text"
                  required
                  value={currentEditEvent.date || ''}
                  onChange={(e) =>
                    setCurrentEditEvent({ ...currentEditEvent, date: e.target.value })
                  }
                  placeholder="misal: Sabtu, 21 November 2026"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Waktu Mulai
                  </label>
                  <input
                    type="text"
                    required
                    value={currentEditEvent.startTime || ''}
                    onChange={(e) =>
                      setCurrentEditEvent({ ...currentEditEvent, startTime: e.target.value })
                    }
                    placeholder="08:00 WIB"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Waktu Selesai
                  </label>
                  <input
                    type="text"
                    required
                    value={currentEditEvent.endTime || ''}
                    onChange={(e) =>
                      setCurrentEditEvent({ ...currentEditEvent, endTime: e.target.value })
                    }
                    placeholder="11:00 WIB / Selesai"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nama Gedung / Tempat
                </label>
                <input
                  type="text"
                  required
                  value={currentEditEvent.venueName || ''}
                  onChange={(e) =>
                    setCurrentEditEvent({ ...currentEditEvent, venueName: e.target.value })
                  }
                  placeholder="misal: Grand Ballroom Hotel Mulia"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Alamat Lengkap
                </label>
                <textarea
                  rows={2}
                  required
                  value={currentEditEvent.address || ''}
                  onChange={(e) =>
                    setCurrentEditEvent({ ...currentEditEvent, address: e.target.value })
                  }
                  placeholder="Alamat lengkap lokasi acara..."
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Link Google Maps
                </label>
                <input
                  type="url"
                  required
                  value={currentEditEvent.mapsUrl || ''}
                  onChange={(e) =>
                    setCurrentEditEvent({ ...currentEditEvent, mapsUrl: e.target.value })
                  }
                  placeholder="https://maps.google.com/..."
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Dress Code (Opsional)
                </label>
                <input
                  type="text"
                  value={currentEditEvent.dressCode || ''}
                  onChange={(e) =>
                    setCurrentEditEvent({ ...currentEditEvent, dressCode: e.target.value })
                  }
                  placeholder="misal: Formal Batik / Pastel Tone"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsEditingModalOpen(false)}
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
                    : 'Simpan Acara'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirmTarget)}
        title="Hapus Sesi Acara"
        message={`Apakah Anda yakin ingin menghapus sesi acara "${deleteConfirmTarget?.title || ''}"?`}
        confirmText="Hapus Acara"
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
