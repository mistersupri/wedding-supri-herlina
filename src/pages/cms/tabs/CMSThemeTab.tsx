import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import {
  Palette,
  Music,
  MessageCircle,
  Clock,
  Save,
  Sparkles,
  Volume2,
  Mail,
  Check,
} from 'lucide-react';
import { fetchCMSTheme, updateCMSTheme } from '../../../lib/api.js';
import { CMSThemeData } from '../../../types.js';

export const CMSThemeTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useOutletContext<{ showToast: (msg: string, type?: 'success' | 'error') => void }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['cms-theme'],
    queryFn: fetchCMSTheme,
  });

  const [formData, setFormData] = useState<CMSThemeData | null>(null);

  useEffect(() => {
    if (data) {
      setFormData(data);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: updateCMSTheme,
    onSuccess: (updated) => {
      queryClient.setQueryData(['cms-theme'], updated);
      queryClient.invalidateQueries({ queryKey: ['invitation'] });
      showToast('Pengaturan tema & visual berhasil disimpan!', 'success');
    },
    onError: (err: any) => {
      showToast(err.message || 'Gagal menyimpan pengaturan tema', 'error');
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-stone-500">
        <div className="w-8 h-8 rounded-full border-3 border-[#5A5A40]/30 border-t-[#5A5A40] animate-spin mb-3" />
        <p className="text-xs">Memuat pengaturan tema...</p>
      </div>
    );
  }

  if (error || !formData) {
    return (
      <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center">
        <p className="text-xs font-semibold text-rose-700">Gagal memuat pengaturan tema</p>
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const presetThemes = [
    { name: 'Sage & Olive Gold', primary: '#5A5A40', accent: '#D4AF37' },
    { name: 'Earthy Terracotta & Rose', primary: '#7D4F44', accent: '#C48B7F' },
    { name: 'Royal Emerald & Gold', primary: '#2D5A43', accent: '#E5C158' },
    { name: 'Midnight Classic Navy', primary: '#2C3E50', accent: '#C5A880' },
  ];

  return (
    <form onSubmit={handleSave} className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-['Playfair_Display'] text-2xl md:text-3xl font-bold text-stone-900">
            Tema, Audio & Format Undangan
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Kustomisasi warna tema visual, musik latar instrumen, target countdown waktu, dan nomor WhatsApp RSVP
          </p>
        </div>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#5A5A40] hover:bg-[#494934] text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-[#5A5A40]/20 disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          {mutation.isPending ? (
            <>
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              <span>Menyimpan...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Simpan Pengaturan</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Visual Color Schemes */}
        <div className="bg-white rounded-3xl border border-stone-200/80 p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
            <div className="w-10 h-10 rounded-2xl bg-amber-100/80 text-amber-800 flex items-center justify-center font-bold">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900">Palet Warna Tema</h2>
              <p className="text-[11px] text-stone-500">Pilih palet elegan atau tentukan warna kustom</p>
            </div>
          </div>

          {/* Presets */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-2">
              Preset Palet Populer
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {presetThemes.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      primaryColor: preset.primary,
                      accentColor: preset.accent,
                    })
                  }
                  className="p-3 rounded-2xl border border-stone-200 hover:border-stone-400 bg-stone-50 flex items-center justify-between text-left transition-all cursor-pointer"
                >
                  <div>
                    <p className="text-xs font-bold text-stone-800">{preset.name}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div
                        className="w-4 h-4 rounded-full border border-black/10 shadow-xs"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <div
                        className="w-4 h-4 rounded-full border border-black/10 shadow-xs"
                        style={{ backgroundColor: preset.accent }}
                      />
                    </div>
                  </div>
                  {formData.primaryColor === preset.primary && (
                    <Check className="w-4 h-4 text-[#5A5A40]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Warna Utama (Primary)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.primaryColor || '#5A5A40'}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-stone-200 p-0.5"
                />
                <input
                  type="text"
                  value={formData.primaryColor || '#5A5A40'}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Warna Aksen (Accent)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.accentColor || '#C48B7F'}
                  onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-stone-200 p-0.5"
                />
                <input
                  type="text"
                  value={formData.accentColor || '#C48B7F'}
                  onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Music & Audio Settings */}
        <div className="bg-white rounded-3xl border border-stone-200/80 p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
            <div className="w-10 h-10 rounded-2xl bg-amber-100/80 text-amber-800 flex items-center justify-center font-bold">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900">Musik Latar (Background Audio)</h2>
              <p className="text-[11px] text-stone-500">Audio romantis yang diputar saat amplop dibuka</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Judul Lagu / Musik
              </label>
              <input
                type="text"
                required
                value={formData.musicTitle || ''}
                onChange={(e) => setFormData({ ...formData, musicTitle: e.target.value })}
                placeholder="misal: Shane Filan - Beautiful in White (Instrumental)"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                URL File Audio (MP3 Direct Link)
              </label>
              <input
                type="url"
                required
                value={formData.musicUrl || ''}
                onChange={(e) => setFormData({ ...formData, musicUrl: e.target.value })}
                placeholder="https://.../music.mp3"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden font-mono"
              />
              <p className="text-[10px] text-stone-400 mt-1">
                Pastikan direct link berakhiran .mp3 yang dapat diakses publik
              </p>
            </div>

            <div className="flex items-center gap-3 p-3.5 bg-stone-50 rounded-2xl border border-stone-100">
              <input
                type="checkbox"
                id="autoplayToggle"
                checked={formData.musicAutoplay ?? true}
                onChange={(e) =>
                  setFormData({ ...formData, musicAutoplay: e.target.checked })
                }
                className="w-4 h-4 text-[#5A5A40] rounded-sm focus:ring-[#5A5A40]"
              />
              <label htmlFor="autoplayToggle" className="text-xs font-semibold text-stone-700 cursor-pointer">
                Otomatis putar lagu saat tamu menekan tombol "Buka Undangan"
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Countdown & WhatsApp RSVP Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Target Countdown */}
        <div className="bg-white rounded-3xl border border-stone-200/80 p-6 md:p-8 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
            <div className="w-9 h-9 rounded-2xl bg-stone-100 text-stone-700 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900">Hitung Mundur (Countdown Target)</h2>
              <p className="text-[11px] text-stone-500">Target waktu hari H untuk timer hitung mundur</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Waktu Target (ISO Format / DateTime)
            </label>
            <input
              type="text"
              required
              value={formData.countdownTarget || ''}
              onChange={(e) => setFormData({ ...formData, countdownTarget: e.target.value })}
              placeholder="2026-11-20T08:00:00"
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden font-mono"
            />
            <p className="text-[10px] text-stone-400 mt-1">
              Contoh format: 2026-11-20T08:00:00 (Tahun-Bulan-TanggalTHari:Menit:Detik)
            </p>
          </div>
        </div>

        {/* WhatsApp RSVP */}
        <div className="bg-white rounded-3xl border border-stone-200/80 p-6 md:p-8 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900">WhatsApp RSVP Gateway</h2>
              <p className="text-[11px] text-stone-500">Nomor kontak konfirmasi kehadiran langsung via WhatsApp</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Nomor WhatsApp Penerima Konfirmasi
            </label>
            <input
              type="text"
              required
              value={formData.rsvpPhoneNumber || ''}
              onChange={(e) =>
                setFormData({ ...formData, rsvpPhoneNumber: e.target.value })
              }
              placeholder="6281234567890 (dengan kode negara 62)"
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden font-mono"
            />
          </div>
        </div>
      </div>
    </form>
  );
};
