import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { Gift, Plus, Trash2, Edit2, CreditCard, QrCode, Save, X, Sparkles } from 'lucide-react';
import {
  fetchCMSGifts,
  createCMSGift,
  updateCMSGift,
  deleteCMSGift,
} from '../../../lib/api.js';
import { GiftAccount } from '../../../types.js';
import { ImageUploadInput } from '../../../components/common/ImageUploadInput.js';
import { ConfirmModal } from '../../../components/common/ConfirmModal.js';

export const CMSGiftsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useOutletContext<{ showToast: (msg: string, type?: 'success' | 'error') => void }>();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentGift, setCurrentGift] = useState<Partial<GiftAccount> | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string; bank: string } | null>(null);

  const { data: gifts, isLoading, error } = useQuery({
    queryKey: ['cms-gifts'],
    queryFn: fetchCMSGifts,
  });

  const createMutation = useMutation({
    mutationFn: createCMSGift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-gifts'] });
      queryClient.invalidateQueries({ queryKey: ['invitation'] });
      showToast('Rekening / QRIS berhasil ditambahkan!', 'success');
      setIsModalOpen(false);
      setCurrentGift(null);
    },
    onError: (err: any) => {
      showToast(err.message || 'Gagal menambahkan rekening', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<GiftAccount> }) =>
      updateCMSGift(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-gifts'] });
      queryClient.invalidateQueries({ queryKey: ['invitation'] });
      showToast('Rekening / QRIS berhasil diperbarui!', 'success');
      setIsModalOpen(false);
      setCurrentGift(null);
    },
    onError: (err: any) => {
      showToast(err.message || 'Gagal memperbarui rekening', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCMSGift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-gifts'] });
      queryClient.invalidateQueries({ queryKey: ['invitation'] });
      showToast('Rekening / QRIS berhasil dihapus!', 'success');
    },
    onError: (err: any) => {
      showToast(err.message || 'Gagal menghapus rekening', 'error');
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-stone-500">
        <div className="w-8 h-8 rounded-full border-3 border-[#5A5A40]/30 border-t-[#5A5A40] animate-spin mb-3" />
        <p className="text-xs">Memuat data rekening & kado...</p>
      </div>
    );
  }

  if (error || !gifts) {
    return (
      <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center">
        <p className="text-xs font-semibold text-rose-700">Gagal memuat data rekening</p>
      </div>
    );
  }

  const handleAddNew = () => {
    setCurrentGift({
      bankName: 'BCA',
      accountNumber: '',
      accountHolder: '',
      isQris: false,
      qrisImageUrl: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (gift: GiftAccount) => {
    setCurrentGift({ ...gift });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, bank: string) => {
    setDeleteConfirmTarget({ id, bank });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGift) return;

    if (currentGift.id) {
      updateMutation.mutate({
        id: currentGift.id,
        payload: currentGift,
      });
    } else {
      createMutation.mutate(currentGift as Omit<GiftAccount, 'id'>);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-['Playfair_Display'] text-2xl md:text-3xl font-bold text-stone-900">
            Rekening & Hadiah Pernikahan (Wedding Gift)
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Kelola nomor rekening bank transfer dan kode barcode QRIS untuk kado pernikahan secara cashless
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddNew}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#5A5A40] hover:bg-[#494934] text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-[#5A5A40]/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Rekening / QRIS</span>
        </button>
      </div>

      {/* Gifts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gifts.map((gift) => (
          <div
            key={gift.id}
            className="bg-white rounded-3xl border border-stone-200/80 p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
          >
            <div>
              <div className="flex items-start justify-between gap-3 pb-3 mb-4 border-b border-stone-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100/80 text-amber-800 flex items-center justify-center font-bold">
                    {gift.isQris ? <QrCode className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">{gift.bankName}</h3>
                    <span className="text-[10px] text-stone-500">
                      {gift.isQris ? 'Metode Barcode QRIS' : 'Transfer Antar Bank'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleEdit(gift)}
                    className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer"
                    title="Edit Rekening"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(gift.id, gift.bankName)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
                    title="Hapus Rekening"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-stone-400 font-semibold block uppercase">
                    Nomor Rekening / ID
                  </span>
                  <p className="text-base font-mono font-bold text-stone-900 tracking-wider">
                    {gift.accountNumber || '-'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] text-stone-400 font-semibold block uppercase">
                    Atas Nama (Penerima)
                  </span>
                  <p className="text-xs font-semibold text-stone-700">{gift.accountHolder}</p>
                </div>

                {gift.isQris && gift.qrisImageUrl && (
                  <div className="mt-3 p-3 bg-stone-50 rounded-2xl border border-stone-100 flex items-center gap-3">
                    <img
                      src={gift.qrisImageUrl}
                      alt="QRIS Preview"
                      className="w-14 h-14 object-contain rounded-lg bg-white border border-stone-200 p-1"
                    />
                    <span className="text-[11px] text-stone-500 font-medium">
                      Barcode QRIS aktif terpasang
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add / Edit */}
      {isModalOpen && currentGift && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-stone-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-100">
              <h3 className="text-base font-bold text-stone-900">
                {currentGift.id ? 'Edit Rekening / QRIS' : 'Tambah Rekening Baru'}
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
              <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200/60">
                <input
                  type="checkbox"
                  id="isQrisCheck"
                  checked={currentGift.isQris || false}
                  onChange={(e) =>
                    setCurrentGift({ ...currentGift, isQris: e.target.checked })
                  }
                  className="w-4 h-4 text-[#5A5A40] rounded-sm focus:ring-[#5A5A40]"
                />
                <label htmlFor="isQrisCheck" className="text-xs font-semibold text-stone-800 cursor-pointer">
                  Ini adalah Pembayaran QRIS (Scan Barcode)
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nama Bank / E-Wallet
                </label>
                <input
                  type="text"
                  required
                  value={currentGift.bankName || ''}
                  onChange={(e) =>
                    setCurrentGift({ ...currentGift, bankName: e.target.value })
                  }
                  placeholder="misal: Bank Central Asia (BCA) / Mandiri / QRIS All Payment"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nomor Rekening
                </label>
                <input
                  type="text"
                  required={!currentGift.isQris}
                  value={currentGift.accountNumber || ''}
                  onChange={(e) =>
                    setCurrentGift({ ...currentGift, accountNumber: e.target.value })
                  }
                  placeholder="misal: 1234567890"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Atas Nama Pemilik Rekening
                </label>
                <input
                  type="text"
                  required
                  value={currentGift.accountHolder || ''}
                  onChange={(e) =>
                    setCurrentGift({ ...currentGift, accountHolder: e.target.value })
                  }
                  placeholder="misal: Arya Pradipta"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden"
                />
              </div>

              {currentGift.isQris && (
                <div>
                  <ImageUploadInput
                    value={currentGift.qrisImageUrl || ''}
                    onChange={(url) => setCurrentGift({ ...currentGift, qrisImageUrl: url })}
                    label="Unggah Gambar Barcode QRIS"
                    aspectRatio="square"
                    maxDimension={1000}
                    hint="Unggah gambar screenshot QRIS resmi Anda"
                  />
                </div>
              )}

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
                    : 'Simpan Rekening'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirmTarget)}
        title="Hapus Rekening / Hadiah"
        message={`Apakah Anda yakin ingin menghapus rekening "${deleteConfirmTarget?.bank || ''}"?`}
        confirmText="Hapus Rekening"
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
