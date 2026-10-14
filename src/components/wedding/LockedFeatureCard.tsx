import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, KeyRound, AlertCircle, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.js';

interface LockedFeatureCardProps {
  title: string;
  subtitle: string;
  description: string;
  onUnlock: (code: string) => Promise<{ success: boolean; message?: string }>;
  onRequestPassModal?: () => void;
}

export const LockedFeatureCard: React.FC<LockedFeatureCardProps> = ({
  title,
  subtitle,
  description,
  onUnlock,
  onRequestPassModal,
}) => {
  const { styles } = useTheme();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode || cleanCode.length !== 4) {
      setErrorMessage('Masukkan 4 karakter kode undangan (cth: R7K2, B4S8)');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await onUnlock(cleanCode);
      if (res.success) {
        setSuccessMessage(res.message || 'Kode valid! Membuka akses undangan...');
      } else {
        setErrorMessage(res.message || 'Kode undangan tidak cocok.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memverifikasi kode');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-xl mx-auto rounded-3xl p-6 sm:p-8 border shadow-sm text-center relative overflow-hidden"
      style={{
        backgroundColor: styles.bgCard,
        borderColor: styles.borderAccent,
      }}
    >
      {/* Top subtle lock emblem */}
      <div
        className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center border shadow-xs"
        style={{
          backgroundColor: styles.accentLight,
          borderColor: styles.borderAccent,
          color: styles.accent,
        }}
      >
        <Lock className="w-6 h-6" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold font-sans uppercase tracking-widest mb-3"
        style={{
          backgroundColor: styles.badgeBg,
          borderColor: styles.borderAccent,
          color: styles.badgeText,
        }}
      >
        <Sparkles className="w-3 h-3" />
        <span>{subtitle}</span>
      </div>

      <h3 className="font-['Playfair_Display'] text-2xl sm:text-3xl font-bold mb-2" style={{ color: styles.textPrimary }}>
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-[#78786A] leading-relaxed max-w-md mx-auto mb-6">
        {description}
      </p>

      {/* Unlock Input Form */}
      <form onSubmit={handleSubmit} className="max-w-sm mx-auto space-y-3">
        <div className="relative">
          <input
            type="text"
            maxLength={4}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setErrorMessage(null);
            }}
            placeholder="KODE 4 KARAKTER"
            className="w-full text-center font-mono text-xl font-bold tracking-[0.3em] uppercase py-3.5 px-4 rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all shadow-inner"
            style={{
              borderColor: errorMessage ? '#E11D48' : styles.borderAccent,
              color: styles.textPrimary,
            }}
          />
          <KeyRound className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#A8A29E] pointer-events-none" />
        </div>

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-1.5 text-xs text-rose-600 font-medium"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-1.5 text-xs text-emerald-700 font-medium"
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{successMessage}</span>
          </motion.div>
        )}

        <button
          type="submit"
          disabled={isLoading || code.length !== 4}
          className="w-full py-3.5 px-5 rounded-xl font-sans text-xs uppercase tracking-[0.15em] font-bold text-white flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: styles.accent }}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>Buka Akses Fitur</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>

      <p className="text-[11px] text-[#A8A29E] mt-4">
        *Buka undangan dari tautan resmi WhatsApp yang Anda terima untuk membuka otomatis.
      </p>
    </motion.div>
  );
};
