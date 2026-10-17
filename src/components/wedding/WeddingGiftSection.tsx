import React, { useState } from 'react';
import { Modal } from '../ui/Modal.js';
import { Reveal } from '../ui/Reveal.js';
import { KawungMark } from '../ui/Kawung.js';
import { useCopy } from '../../hooks/useCopy.js';
import type { GiftAccount } from '@shared/types';

const qrOf = (gift: GiftAccount) => gift.qrisImageUrl || '';

export const WeddingGiftSection: React.FC<{ gifts: GiftAccount[] }> = ({ gifts }) => {
  const { copy, copied, failed } = useCopy();
  const [qrGift, setQrGift] = useState<GiftAccount | null>(null);

  if (gifts.length === 0) return null;

  return (
    <section id="gifts-section" aria-labelledby="gifts-heading" className="px-5 py-20 sm:py-28">
      <div className="mx-auto max-w-4xl">
        <Reveal className="mx-auto max-w-xl text-center">
          <h2 id="gifts-heading" className="font-display text-4xl sm:text-5xl">
            Tanda kasih
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-soft sm:text-base">
            Doa restu Anda adalah hadiah terindah bagi kami. Bila ingin mengirim tanda kasih, Anda dapat menggunakan rekening berikut.
          </p>
        </Reveal>

        <ul className="mt-12 grid gap-5 sm:grid-cols-2">
          {gifts.map((gift) => {
            const qr = qrOf(gift);
            return (
              <Reveal as="li" key={gift.id} className="relative rounded-md border border-line bg-card p-6">
                <KawungMark className="absolute top-5 right-5 h-6 w-6 text-prada" />
                <p className="text-sm font-semibold text-prada-ink">{gift.bankName}</p>
                {gift.isQris && !gift.accountNumber ? (
                  <p className="mt-3 font-display text-2xl">Pembayaran QRIS</p>
                ) : (
                  <p className="display-numeral mt-3 text-[1.75rem] leading-none tracking-wide break-all">{gift.accountNumber}</p>
                )}
                <p className="mt-2 text-[15px] text-ink-soft">
                  atas nama <span className="font-semibold text-ink">{gift.accountHolder}</span>
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {gift.accountNumber && (
                    <button
                      type="button"
                      onClick={() => copy(gift.accountNumber.replace(/\s/g, ''), gift.id)}
                      className="min-h-11 rounded-sm bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-hover"
                    >
                      {copied === gift.id ? 'Nomor tersalin' : 'Salin nomor rekening'}
                    </button>
                  )}
                  {qr && (
                    <button
                      type="button"
                      onClick={() => setQrGift(gift)}
                      className="min-h-11 rounded-sm border border-field px-4 text-sm font-semibold hover:bg-paper-2"
                    >
                      Tampilkan QR
                    </button>
                  )}
                </div>
              </Reveal>
            );
          })}
        </ul>
        <p role="status" className="mt-4 text-center text-sm text-ink-soft">
          {failed ? 'Peramban menolak menyalin otomatis. Silakan salin nomor secara manual.' : ''}
        </p>
      </div>

      <Modal
        open={qrGift !== null}
        onClose={() => setQrGift(null)}
        title={qrGift?.bankName || 'QR'}
        description="Pindai dengan aplikasi m-banking atau dompet digital."
        size="sm"
      >
        {qrGift && (
          <div className="flex flex-col items-center text-center">
            <img
              src={qrOf(qrGift)}
              alt={`Kode QR ${qrGift.bankName}`}
              className="h-64 w-64 rounded-sm border border-line bg-white object-contain p-2"
              referrerPolicy="no-referrer"
            />
            <p className="mt-3 font-semibold">{qrGift.accountHolder}</p>
          </div>
        )}
      </Modal>
    </section>
  );
};
