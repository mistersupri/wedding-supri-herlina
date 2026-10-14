import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Copy, Check, QrCode, CreditCard, Sparkles, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.js';
import { GiftAccount } from '../../types.js';

interface WeddingGiftSectionProps {
  gifts: GiftAccount[];
  isUnlocked?: boolean;
}

export const WeddingGiftSection: React.FC<WeddingGiftSectionProps> = ({
  gifts,
  isUnlocked = true,
}) => {
  const { styles } = useTheme();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeQrModal, setActiveQrModal] = useState<GiftAccount | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  if (!isUnlocked || !gifts || gifts.length === 0) return null;

  return (
    <section id="gifts-section" className="py-20 px-4" style={{ backgroundColor: styles.bgSecondary }}>
      <div className="max-w-4xl mx-auto text-center">
        {/* Section Heading */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Gift className="w-3.5 h-3.5" style={{ color: styles.accent }} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] font-sans" style={{ color: styles.textSecondary }}>
              Tanda Kasih
            </span>
          </div>
          <h2 className="font-['Playfair_Display'] text-3xl sm:text-4xl md:text-5xl font-semibold" style={{ color: styles.textPrimary }}>
            Amplop Digital & Kado
          </h2>
          <p className="text-sm sm:text-base text-[#78786A] mt-2 max-w-xl mx-auto">
            Doa restu Anda merupakan karunia terindah bagi kami. Namun jika Anda ingin memberikan tanda kasih secara digital, Anda dapat menggunakan layanan transfer berikut:
          </p>
        </motion.div>

        {/* Bank Gift Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {gifts.map((gift) => (
            <motion.div
              key={gift.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="p-6 rounded-3xl border shadow-sm flex flex-col justify-between text-left relative overflow-hidden"
              style={{
                backgroundColor: styles.bgCard,
                borderColor: styles.borderAccent,
              }}
            >
              {/* Card top bar */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" style={{ color: styles.accent }} />
                  <span className="font-bold text-sm" style={{ color: styles.textPrimary }}>
                    {gift.bankName}
                  </span>
                </div>
                {gift.qrCodeUrl && (
                  <button
                    type="button"
                    onClick={() => setActiveQrModal(gift)}
                    className="p-1.5 rounded-lg border hover:bg-[#F0EEE6] transition-colors text-[#4A4A40] cursor-pointer"
                    style={{ borderColor: styles.borderAccent }}
                    title="Tampilkan QR Code"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Account Number & Holder */}
              <div className="my-2 bg-[#F7F5F0] p-4 rounded-2xl border" style={{ borderColor: styles.borderAccent }}>
                <p className="text-[10px] font-sans font-bold text-[#78786A] uppercase tracking-widest">
                  Nomor Rekening
                </p>
                <p className="font-mono text-lg font-bold text-[#4A4A40] tracking-wider mt-0.5">
                  {gift.accountNumber}
                </p>
                <p className="text-xs text-[#78786A] mt-1 font-medium">
                  a.n. <span className="font-semibold text-[#4A4A40]">{gift.accountHolder}</span>
                </p>
              </div>

              {/* Copy Button */}
              <button
                type="button"
                onClick={() => handleCopy(gift.id, gift.accountNumber)}
                className="mt-4 w-full py-3 px-4 rounded-xl font-sans text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer"
                style={{
                  backgroundColor: copiedId === gift.id ? '#2D6A4F' : styles.accentLight,
                  borderColor: copiedId === gift.id ? '#2D6A4F' : styles.borderAccent,
                  color: copiedId === gift.id ? '#FFFFFF' : styles.accent,
                }}
              >
                {copiedId === gift.id ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Nomor Rekening Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Nomor Rekening</span>
                  </>
                )}
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* QR Code Modal */}
      <AnimatePresence>
        {activeQrModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveQrModal(null)}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs rounded-3xl p-6 bg-white text-center shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setActiveQrModal(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-stone-100 text-stone-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="font-bold text-sm mb-1 text-stone-900">
                QRIS / QR Transfer
              </h3>
              <p className="text-xs text-stone-500 mb-4">{activeQrModal.bankName}</p>

              {activeQrModal.qrCodeUrl && (
                <div className="p-3 border rounded-2xl bg-white mx-auto inline-block shadow-inner">
                  <img
                    src={activeQrModal.qrCodeUrl}
                    alt={`QR Code ${activeQrModal.bankName}`}
                    className="w-48 h-48 object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              <p className="text-xs font-semibold text-stone-700 mt-3">
                {activeQrModal.accountHolder}
              </p>
              <p className="text-xs text-stone-500 mt-1">
                Scan QR di atas melalui aplikasi m-banking atau e-wallet pilihan Anda.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
