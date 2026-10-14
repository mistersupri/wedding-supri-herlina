import React, { useState } from 'react';
import { cmsApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { PageHeader } from '../../../components/cms/CmsPage.js';
import { MediaField } from '../../../components/cms/MediaField.js';
import { useCollection } from '../../../components/cms/useCollection.js';
import { Button } from '../../../components/ui/Button.js';
import { Checkbox, Field, Input } from '../../../components/ui/Field.js';
import { ConfirmDialog, Modal } from '../../../components/ui/Modal.js';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/StateView.js';
import type { GiftAccount } from '../../../types.js';

const BLANK: Partial<GiftAccount> = { bankName: '', accountNumber: '', accountHolder: '', isQris: false, qrisImageUrl: '' };

export const CMSGiftsTab: React.FC = () => {
  const { query, items, save, remove } = useCollection(queryKeys.cms.gifts, cmsApi.gifts, 'Rekening');
  const [draft, setDraft] = useState<Partial<GiftAccount> | null>(null);
  const [toDelete, setToDelete] = useState<GiftAccount | null>(null);
  const set = <K extends keyof GiftAccount>(key: K, value: GiftAccount[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));

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
            const qr = g.qrisImageUrl || g.qrCodeUrl;
            return (
              <li key={g.id} className="flex gap-4 rounded-md border border-line bg-card p-5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-prada-ink">{g.bankName}</p>
                  <p className="display-numeral mt-1 text-2xl break-all">{g.accountNumber || 'QRIS'}</p>
                  <p className="text-sm text-ink-soft">a.n. {g.accountHolder}</p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setDraft({ ...g, qrisImageUrl: g.qrisImageUrl || g.qrCodeUrl || '', isQris: g.isQris || Boolean(g.qrCodeUrl) })
                      }
                    >
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
                    className="h-24 w-24 shrink-0 rounded-xs border border-line bg-white object-contain p-1"
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
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              // qrCodeUrl is the legacy field: the editor moved its value into qrisImageUrl, so clear it.
              save.mutate(
                { ...draft, qrCodeUrl: '', qrisImageUrl: draft.isQris ? draft.qrisImageUrl : '' },
                { onSuccess: () => setDraft(null) },
              );
            }}
          >
            <Field label="Bank atau dompet digital">
              {(p) => (
                <Input {...p} required value={draft.bankName || ''} onChange={(e) => set('bankName', e.target.value)} placeholder="BCA" />
              )}
            </Field>
            <Field label="Nomor rekening" aside={draft.isQris ? 'opsional untuk QRIS' : undefined}>
              {(p) => (
                <Input
                  {...p}
                  inputMode="numeric"
                  required={!draft.isQris}
                  value={draft.accountNumber || ''}
                  onChange={(e) => set('accountNumber', e.target.value)}
                />
              )}
            </Field>
            <Field label="Atas nama">
              {(p) => <Input {...p} required value={draft.accountHolder || ''} onChange={(e) => set('accountHolder', e.target.value)} />}
            </Field>
            <Checkbox label="Sertakan gambar QR / QRIS" checked={Boolean(draft.isQris)} onChange={(e) => set('isQris', e.target.checked)} />
            {draft.isQris && (
              <MediaField
                label="Gambar QR"
                aspect="square"
                category="general"
                value={draft.qrisImageUrl || ''}
                onChange={(url) => set('qrisImageUrl', url)}
              />
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
