import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Lock, User, KeyRound, Sparkles, ArrowLeft, ShieldCheck, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { loginAdmin } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.js';

export const CMSLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // If already authenticated, redirect to /cms/overview
  if (isAuthenticated) {
    const from = (location.state as any)?.from?.pathname || '/cms/overview';
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await loginAdmin(username, password);
      login(res.accessToken || res.token, res.user, res.refreshToken);
      const from = (location.state as any)?.from?.pathname || '/cms/overview';
      navigate(from, { replace: true });
    } catch (err: any) {
      setErrorMsg(err.message || 'Username atau password salah');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-['Plus_Jakarta_Sans']">
      {/* Background Ambience */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#5A5A40]/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#C48B7F]/20 rounded-full blur-3xl pointer-events-none" />

      {/* Back to Public Site */}
      <div className="absolute top-6 left-6 z-20">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-300 hover:text-white bg-stone-800/80 hover:bg-stone-800 px-4 py-2 rounded-xl border border-stone-700/80 transition-colors backdrop-blur-md cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Undangan</span>
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-stone-800/90 border border-stone-700/80 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10"
      >
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#5A5A40]/40 border border-[#5A5A40]/60 flex items-center justify-center text-amber-200/90 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="font-['Playfair_Display'] text-2xl font-bold text-stone-100">
            CMS Admin Undangan
          </h1>
          <p className="text-xs text-stone-400">
            Masuk untuk mengelola data mempelai, jadwal acara, galeri foto, kado, dan RSVP
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800/60 text-rose-200 text-xs flex items-center gap-2.5"
          >
            <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <p className="flex-1">{errorMsg}</p>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              Username Admin
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full pl-10 pr-4 py-3 bg-stone-900/80 border border-stone-700 rounded-xl text-xs text-stone-100 placeholder-stone-500 focus:outline-hidden focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/80 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              Kata Sandi
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full pl-10 pr-4 py-3 bg-stone-900/80 border border-stone-700 rounded-xl text-xs text-stone-100 placeholder-stone-500 focus:outline-hidden focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/80 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-[#5A5A40] to-[#787858] hover:from-[#4E4E37] hover:to-[#69694D] text-white rounded-xl text-xs font-semibold transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-6"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>Memverifikasi Akun...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Masuk ke Panel Admin</span>
              </>
            )}
          </button>
        </form>

        {/* Security Info */}
        <div className="mt-8 pt-6 border-t border-stone-700/60 flex items-center justify-between text-[11px] text-stone-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Kredensial Aman Terproteksi</span>
          </span>
          <span className="text-stone-500">v2.0 CMS</span>
        </div>
      </motion.div>
    </div>
  );
};
