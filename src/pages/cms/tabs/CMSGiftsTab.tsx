import React, { useState } from 'react';
import { cmsApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { PageHeader } from '../../../components/cms/CmsPage.js';
import { MediaField } from '../../../components/cms/MediaField.js';
import { useCollection } from '../../../components/cms/useCollection.js';
import { Button } from '../../../components/ui/Button.js';
import { Checkbox, Field, Input } from '../../../components/ui/Field.js';
import { ACCOUNT_PATTERN, checkAccountNumber } from '../../../lib/inputs.js';
import { required, useFormErrors } from '../../../components/cms/useFormErrors.js';
import { ConfirmDialog, Modal } from '../../../components/ui/Modal.js';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/StateView.js';
import type { GiftAccount } from '@shared/types';

/** Suggestions for the bank field; any name can still be typed. */
const BANKS = ['BCA', 'BNI', 'BRI', 'Mandiri', 'BSI', 'CIMB Niaga', 'Permata', 'Danamon', 'BTN', 'Jago', 'SeaBank', 'Jenius (BTPN)', 'GoPay', 'OVO', 'DANA', 'ShopeePay', 'LinkAja'];

const BLANK: Partial<GiftAccount> = { bankName: '', accountNumber: '', accountHolder: '', isQris: false, qrisImageUrl: '' };

export const CMSGiftsTab: React.FC = () => {
  const { query, items, save, remove } = useCollection(queryKeys.cms.gifts, cmsApi.gifts, 'Rekening');
  const [draft, setDraft] = useState<Partial<GiftAccount> | null>(null);
  const [toDelete, setToDelete] = useState<GiftAccount | null>(null);
  const { errors, clear, validate, formRef } = useFormErrors<'bankName' | 'accountNumber' | 'accountHolder' | 'qrisImageUrl'>();
  const set = <K extends keyof GiftAccount>(key: K, value: GiftAccount[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    clear(key as 'bankName');
  };

  return (
    <>
      <PageHeader
        title="Rekening & QRIS"
        description="Tampil di bagian Tanda Kasih, hanya untuk tamu yang membuka undangan dengan kode."
        actions={<Button onClick={() => setDraft({ ...BLANK })}>Tambah rekening</Button>}
      />

      {query.isLoading ? (
        <LoadingState label="Memuat rekening..." />
      ) : query.isError ? (
        <ErrorState title="Rekening belum bisa dimuat." onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title="Belum ada rekening" detail="Bagian Tanda Kasih disembunyikan sampai ada rekening." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((g) => {
            const qr = g.qrisImageUrl;
            return (
              <li key={g.id} className="flex flex-col gap-4 rounded-md border border-line bg-card p-5 min-[480px]:flex-row">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-prada-ink">{g.bankName}</p>
                  <p className="display-numeral mt-1 text-2xl break-all">{g.accountNumber || 'QRIS'}</p>
                  <p className="text-sm text-ink-soft">a.n. {g.accountHolder}</p>
                  <div className="mt-3 flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setDraft({ ...g, qrisImageUrl: g.qrisImageUrl || '' })}>
                      Ubah
                    </Button>
                    <Button variant="ghost" size="sm" className="text-no" onClick={() => setToDelete(g)}>
                      Hapus
                    </Button>
                  </div>
                </div>
                {qr && (
                  <img
                    src={qr}
                    alt={`QR ${g.bankName}`}
                    referrerPolicy="no-referrer"
                    className="h-32 w-32 shrink-0 self-start rounded-xs border border-line bg-white object-contain p-1 min-[480px]:h-24 min-[480px]:w-24"
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Ubah rekening' : 'Tambah rekening'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Batal
            </Button>
            <Button type="submit" form="gift-form" loading={save.isPending}>
              Simpan
            </Button>
          </>
        }
      >
        {draft && (
          <form
            id="gift-form"
            ref={formRef}
            noValidate
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const ok = validate({
                bankName: required(draft.bankName, 'Nama bank atau dompet digital'),
                accountNumber: checkAccountNumber(draft.accountNumber || '', !draft.isQris),
                accountHolder: required(draft.accountHolder, 'Nama pemilik rekening'),
                qrisImageUrl: draft.isQris && !draft.qrisImageUrl && !(draft.accountNumber || '').trim() ? 'Unggah gambar QR, atau isi nomor rekening.' : null,
              });
              if (ok) save.mutate({ ...draft, qrisImageUrl: draft.isQris ? draft.qrisImageUrl : '' }, { onSuccess: () => setDraft(null) });
            }}
          >
            <Field label="Bank atau dompet digital" error={errors.bankName}>
              {(p) => (
                <>
                  <Input
                    {...p}
                    required
                    list="bank-names"
                    maxLength={40}
                    autoComplete="off"
                    autoCapitalize="words"
                    value={draft.bankName || ''}
                    onChange={(e) => set('bankName', e.target.value)}
                    placeholder="BCA"
                  />
                  <datalist id="bank-names">
                    {BANKS.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </>
              )}
            </Field>
            <Field
              label="Nomor rekening"
              aside={draft.isQris ? 'opsional untuk QRIS' : undefined}
              error={errors.accountNumber}
              hint="Angka saja; spasi atau strip boleh. Tamu menyalinnya tanpa spasi."
            >
              {(p) => (
                <Input
                  {...p}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  spellCheck={false}
                  pattern={ACCOUNT_PATTERN}
                  maxLength={30}
                  required={!draft.isQris}
                  value={draft.accountNumber || ''}
                  onChange={(e) => set('accountNumber', e.target.value.replace(/[^0-9 .-]/g, ''))}
                  placeholder="1234 5678 90"
                />
              )}
            </Field>
            <Field label="Atas nama" error={errors.accountHolder} hint="Persis seperti di buku tabungan.">
              {(p) => (
                <Input {...p} required maxLength={80} autoComplete="off" autoCapitalize="words" value={draft.accountHolder || ''} onChange={(e) => set('accountHolder', e.target.value)} />
              )}
            </Field>
            <Checkbox label="Sertakan gambar QR / QRIS" checked={Boolean(draft.isQris)} onChange={(e) => set('isQris', e.target.checked)} />
            {draft.isQris && (
              <div>
                <MediaField
                  label="Gambar QR"
                  aspect="square"
                  category="general"
                  maxMB={{ image: 10 }}
                  minWidth={400}
                  value={draft.qrisImageUrl || ''}
                  onChange={(url) => set('qrisImageUrl', url)}
                  hint="Unduh QRIS dari aplikasi bank Anda. Kotak QR harus utuh dan tajam agar terbaca pemindai."
                />
                {errors.qrisImageUrl && (
                  <p role="alert" className="mt-1.5 text-xs font-medium text-no">
                    {errors.qrisImageUrl}
                  </p>
                )}
              </div>
            )}
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Hapus rekening?"
        message={`${toDelete?.bankName} a.n. ${toDelete?.accountHolder} akan hilang dari undangan.`}
        confirmLabel="Hapus rekening"
        busy={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      />
    </>
  );
};
