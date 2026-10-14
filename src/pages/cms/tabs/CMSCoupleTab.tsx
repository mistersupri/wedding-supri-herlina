import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { Heart, Save, RefreshCw, User, Instagram, Quote, Sparkles, Image as ImageIcon, Video, Film } from 'lucide-react';
import { fetchCMSCouple, updateCMSCouple } from '../../../lib/api.js';
import { CMSCoupleData } from '../../../types.js';
import { ImageUploadInput } from '../../../components/common/ImageUploadInput.js';

export const CMSCoupleTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useOutletContext<{ showToast: (msg: string, type?: 'success' | 'error') => void }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['cms-couple'],
    queryFn: fetchCMSCouple,
  });

  const [formData, setFormData] = useState<CMSCoupleData | null>(null);

  useEffect(() => {
    if (data) {
      setFormData(data);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: updateCMSCouple,
    onSuccess: (updated) => {
      queryClient.setQueryData(['cms-couple'], updated);
      queryClient.invalidateQueries({ queryKey: ['invitation'] });
      showToast('Data mempelai dan kutipan berhasil disimpan!', 'success');
    },
    onError: (err: any) => {
      showToast(err.message || 'Gagal menyimpan data mempelai', 'error');
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-stone-500">
        <div className="w-8 h-8 rounded-full border-3 border-[#5A5A40]/30 border-t-[#5A5A40] animate-spin mb-3" />
        <p className="text-xs">Memuat data mempelai...</p>
      </div>
    );
  }

  if (error || !formData) {
    return (
      <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center">
        <p className="text-xs font-semibold text-rose-700">Gagal memuat data mempelai</p>
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSave} className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-['Playfair_Display'] text-2xl md:text-3xl font-bold text-stone-900">
            Data Mempelai & Kutipan
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Kelola profil lengkap mempelai pria, wanita, foto profil, hero cover, dan ayat suci / kutipan mutiara
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
              <span>Simpan Perubahan</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Mempelai Pria */}
        <div className="bg-white rounded-3xl border border-stone-200/80 p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
            <div className="w-10 h-10 rounded-2xl bg-amber-100/80 text-amber-800 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900">Mempelai Pria (Groom)</h2>
              <p className="text-[11px] text-stone-500">Informasi nama, orang tua & akun sosial</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Nama Lengkap & Gelar
              </label>
              <input
                type="text"
                required
                value={formData.groomName}
                onChange={(e) => setFormData({ ...formData, groomName: e.target.value })}
                placeholder="misal: Arya Pradipta, S.T."
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-hidden transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Nama Panggilan
              </label>
              <input
                type="text"
                required
                value={formData.groomShortName}
                onChange={(e) => setFormData({ ...formData, groomShortName: e.target.value })}
                placeholder="misal: Arya"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-hidden transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Nama Orang Tua
              </label>
              <textarea
                rows={2}
                value={formData.groomParents}
                onChange={(e) => setFormData({ ...formData, groomParents: e.target.value })}
                placeholder="misal: Putra Pertama dari Bpk. Bambang Sutrisno & Ibu Sri Rahayu"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-hidden transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Username Instagram (Opsional)
              </label>
              <div className="relative">
                <Instagram className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.groomInstagram || ''}
                  onChange={(e) => setFormData({ ...formData, groomInstagram: e.target.value })}
                  placeholder="aryapradipta (tanpa @)"
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden transition-colors"
                />
              </div>
            </div>

            {/* Foto Mempelai Pria */}
            <div className="pt-2">
              <ImageUploadInput
                value={formData.groomPhoto}
                onChange={(url) => setFormData({ ...formData, groomPhoto: url })}
                label="Foto Profil Mempelai Pria"
                aspectRatio="portrait"
                maxDimension={1200}
                category="couples"
                hint="Disarankan rasio 3:4 atau 1:1 potret jernih"
              />
            </div>
          </div>
        </div>

        {/* Mempelai Wanita */}
        <div className="bg-white rounded-3xl border border-stone-200/80 p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
            <div className="w-10 h-10 rounded-2xl bg-rose-100/80 text-rose-800 flex items-center justify-center font-bold">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900">Mempelai Wanita (Bride)</h2>
              <p className="text-[11px] text-stone-500">Informasi nama, orang tua & akun sosial</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Nama Lengkap & Gelar
              </label>
              <input
                type="text"
                required
                value={formData.brideName}
                onChange={(e) => setFormData({ ...formData, brideName: e.target.value })}
                placeholder="misal: Nadhira Kirana, S.Ds."
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-hidden transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Nama Panggilan
              </label>
              <input
                type="text"
                required
                value={formData.brideShortName}
                onChange={(e) => setFormData({ ...formData, brideShortName: e.target.value })}
                placeholder="misal: Nadhira"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-hidden transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Nama Orang Tua
              </label>
              <textarea
                rows={2}
                value={formData.brideParents}
                onChange={(e) => setFormData({ ...formData, brideParents: e.target.value })}
                placeholder="misal: Putri Kedua dari Bpk. H. Hendra Wijaya & Ibu Hj. Ratna Dewi"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-hidden transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Username Instagram (Opsional)
              </label>
              <div className="relative">
                <Instagram className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.brideInstagram || ''}
                  onChange={(e) => setFormData({ ...formData, brideInstagram: e.target.value })}
                  placeholder="nadhirakirana (tanpa @)"
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-[#5A5A40] outline-hidden transition-colors"
                />
              </div>
            </div>

            {/* Foto Mempelai Wanita */}
            <div className="pt-2">
              <ImageUploadInput
                value={formData.bridePhoto}
                onChange={(url) => setFormData({ ...formData, bridePhoto: url })}
                label="Foto Profil Mempelai Wanita"
                aspectRatio="portrait"
                maxDimension={1200}
                category="couples"
                hint="Disarankan rasio 3:4 atau 1:1 potret anggun"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cover & Quote Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cover Hero Banner (Image or Video) */}
        <div className="bg-white rounded-3xl border border-stone-200/80 p-6 md:p-8 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-amber-100/80 text-amber-800 flex items-center justify-center font-bold">
                {formData.heroMediaType === 'VIDEO' ? <Video className="w-4 h-4 text-amber-700" /> : <ImageIcon className="w-4 h-4 text-amber-700" />}
              </div>
              <div>
                <h2 className="text-sm font-bold text-stone-900">Sampul Utama (Hero Banner)</h2>
                <p className="text-[11px] text-stone-500">Pilih Tampilan Hero Banner: Foto (Gambar) atau Video Motion</p>
              </div>
            </div>
          </div>

          {/* Media Type Switcher Tabs */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-2">
              Pilihan Format Sampul Hero
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, heroMediaType: 'IMAGE' })}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                  formData.heroMediaType !== 'VIDEO'
                    ? 'bg-[#5A5A40] text-white border-[#5A5A40] shadow-md ring-2 ring-[#5A5A40]/20'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Foto (Gambar)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, heroMediaType: 'VIDEO' })}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                  formData.heroMediaType === 'VIDEO'
                    ? 'bg-[#5A5A40] text-white border-[#5A5A40] shadow-md ring-2 ring-[#5A5A40]/20'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>Video Motion Banner</span>
              </button>
            </div>
          </div>

          {/* If VIDEO mode selected */}
          {formData.heroMediaType === 'VIDEO' ? (
            <div className="space-y-4 pt-1">
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <Film className="w-4 h-4 text-amber-700" />
                  <span>Unggah atau Tempel Link Video Hero</span>
                </div>
                <p className="text-[11px] text-stone-600">
                  Anda bisa mengunggah file video (.mp4, .webm) dari komputer/HP Anda atau memasukkan link URL video.
                </p>

                <ImageUploadInput
                  value={formData.heroVideoUrl || ''}
                  onChange={(url) => setFormData({ ...formData, heroVideoUrl: url, heroMediaType: 'VIDEO' })}
                  label="File / URL Video Banner Hero"
                  placeholderText="Tarik & lepas file video di sini, atau klik untuk memilih file (.mp4, .webm)"
                  hint="Mendukung unggah file video langsung atau paste URL video. Otomatis diputar ulang (looping) di hero."
                  allowVideo={true}
                  aspectRatio="landscape"
                  category="hero"
                />
              </div>

              {/* Poster / Fallback Image */}
              <div className="pt-2">
                <ImageUploadInput
                  value={formData.heroImage}
                  onChange={(url) => setFormData({ ...formData, heroImage: url })}
                  label="Foto Poster / Fallback Gambar (Cadangan)"
                  aspectRatio="landscape"
                  maxDimension={1920}
                  category="hero"
                  hint="Gambar ini akan tampil saat video sedang memuat (poster video) atau jika perangkat koneksi lambat."
                />
              </div>
            </div>
          ) : (
            /* IMAGE mode selected */
            <div className="pt-1">
              <ImageUploadInput
                value={formData.heroImage}
                onChange={(url) => setFormData({ ...formData, heroImage: url })}
                label="Foto Sampul Utama (Hero Banner)"
                aspectRatio="landscape"
                maxDimension={1920}
                category="hero"
                hint="Rasio lanskap resolusi tinggi (1920x1080px disarankan)."
              />
            </div>
          )}
        </div>

        {/* Ayat Suci / Kutipan Romantis */}
        <div className="bg-white rounded-3xl border border-stone-200/80 p-6 md:p-8 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
            <div className="w-9 h-9 rounded-2xl bg-amber-100/80 text-amber-800 flex items-center justify-center font-bold">
              <Quote className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900">Kutipan / Ayat Suci Pernikahan</h2>
              <p className="text-[11px] text-stone-500">Kata-kata mutiara pengantar ikatan suci</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Teks Kutipan
            </label>
            <textarea
              rows={4}
              required
              value={formData.quoteText}
              onChange={(e) => setFormData({ ...formData, quoteText: e.target.value })}
              placeholder="Tuliskan ayat suci atau kata mutiara..."
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Sumber Kutipan / Surat
            </label>
            <input
              type="text"
              required
              value={formData.quoteSource}
              onChange={(e) => setFormData({ ...formData, quoteSource: e.target.value })}
              placeholder="misal: QS. Ar-Rum: 21"
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden"
            />
          </div>
        </div>
      </div>
    </form>
  );
};
