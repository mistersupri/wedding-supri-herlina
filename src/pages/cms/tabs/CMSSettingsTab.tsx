import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import {
  Settings,
  KeyRound,
  ShieldCheck,
  RotateCcw,
  User,
  Info,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import {
  fetchCMSGeneral,
  changeAdminPassword,
  resetToDefaultData,
} from '../../../lib/api.js';
import { useAuth } from '../../../context/AuthContext.js';
import { ConfirmModal } from '../../../components/common/ConfirmModal.js';

export const CMSSettingsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useOutletContext<{ showToast: (msg: string, type?: 'success' | 'error') => void }>();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const { data: generalData, isLoading } = useQuery({
    queryKey: ['cms-general'],
    queryFn: fetchCMSGeneral,
  });

  const passwordMutation = useMutation({
    mutationFn: changeAdminPassword,
    onSuccess: (res) => {
      showToast(res.message || 'Kata sandi admin berhasil diperbarui!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err: any) => {
      showToast(err.message || 'Gagal mengubah kata sandi', 'error');
    },
  });

  const resetMutation = useMutation({
    mutationFn: resetToDefaultData,
    onSuccess: () => {
      queryClient.invalidateQueries();
      showToast('Semua data berhasil direset ke pengaturan bawaan (default)!', 'success');
    },
    onError: (err: any) => {
      showToast(err.message || 'Gagal mereset data', 'error');
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('Konfirmasi kata sandi baru tidak cocok!', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Kata sandi baru minimal harus 6 karakter!', 'error');
      return;
    }
    passwordMutation.mutate({ currentPassword, newPassword });
  };

  const handleResetData = () => {
    setIsResetModalOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-['Playfair_Display'] text-2xl md:text-3xl font-bold text-stone-900">
          Pengaturan Akun & Keamanan
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Kelola profil pengguna admin, ubah kata sandi, dan manajemen pemulihan data sistem
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Admin Profile Info */}
        <div className="bg-white rounded-3xl border border-stone-200/80 p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
            <div className="w-10 h-10 rounded-2xl bg-amber-100/80 text-amber-800 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900">Profil Administrator</h2>
              <p className="text-[11px] text-stone-500">Informasi akun yang sedang aktif</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 flex items-center justify-between">
              <span className="text-stone-500">Username Login</span>
              <span className="font-bold text-stone-900">{user?.username || 'admin'}</span>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 flex items-center justify-between">
              <span className="text-stone-500">Nama Tampilan</span>
              <span className="font-bold text-stone-900">{user?.name || 'Admin Pengelola'}</span>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 flex items-center justify-between">
              <span className="text-stone-500">Hak Akses (Role)</span>
              <span className="font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full text-[10px]">
                {user?.role || 'SUPERADMIN'}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-blue-900 text-xs flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <p className="font-semibold text-blue-950">Penyimpanan Kredensial Aman</p>
              <p className="text-blue-800/90 mt-0.5">
                Kredensial disimpan secara aman di environment backend (`ADMIN_USERNAME` & `ADMIN_PASSWORD`)
                tanpa bocor ke frontend.
              </p>
            </div>
          </div>
        </div>

        {/* Change Password Form */}
        <div className="bg-white rounded-3xl border border-stone-200/80 p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
            <div className="w-10 h-10 rounded-2xl bg-amber-100/80 text-amber-800 flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900">Ubah Kata Sandi</h2>
              <p className="text-[11px] text-stone-500">Perbarui kata sandi login admin Anda</p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Kata Sandi Saat Ini
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Masukkan kata sandi lama"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Kata Sandi Baru
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Ulangi Kata Sandi Baru
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi baru"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={passwordMutation.isPending}
              className="w-full py-2.5 bg-[#5A5A40] hover:bg-[#494934] text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-[#5A5A40]/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {passwordMutation.isPending ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Menyimpan Sandi...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Perbarui Kata Sandi</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Danger Zone: Reset Default Data */}
      <div className="bg-rose-50/70 rounded-3xl border border-rose-200/80 p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-rose-950 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-rose-600" />
              <span>Reset Data ke Pengaturan Awal (Default)</span>
            </h3>
            <p className="text-xs text-rose-800/80 mt-1 max-w-xl">
              Kembalikan semua data mempelai, jadwal acara, galeri, buku tamu, dan rekening ke data demo default.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetData}
            disabled={resetMutation.isPending}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer self-start sm:self-auto disabled:opacity-50"
          >
            {resetMutation.isPending ? 'Mereset Data...' : 'Reset ke Default'}
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={isResetModalOpen}
        title="Reset Data ke Default"
        message="PERINGATAN: Apakah Anda yakin ingin mereset seluruh data undangan ke default? Semua perubahan mempelai, acara, foto, dan ucapan akan dikembalikan ke data awal."
        confirmText="Ya, Reset Seluruh Data"
        cancelText="Batal"
        variant="danger"
        onConfirm={() => {
          resetMutation.mutate();
          setIsResetModalOpen(false);
        }}
        onCancel={() => setIsResetModalOpen(false)}
      />
    </div>
  );
};
