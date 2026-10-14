import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { cmsApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { formatDateTime } from '../../../lib/format.js';
import { useDebounce } from '../../../hooks/useDebounce.js';
import { Pagination, usePagination } from '../CmsPage.js';
import { useToast } from '../Toast.js';
import { Button } from '../../ui/Button.js';
import { Field, Input, Segmented, Textarea } from '../../ui/Field.js';
import { ConfirmDialog, Modal } from '../../ui/Modal.js';
import { Chip, StatusChip } from '../../ui/StatusChip.js';
import { EmptyState, ErrorState, LoadingState } from '../../ui/StateView.js';
import type { GuestWish } from '../../../types.js';

type StatusFilter = 'ALL' | 'HADIR' | 'TIDAK_HADIR' | 'RAGU';

export const WishesModeration: React.FC = () => {
  const client = useQueryClient();
  const notify = useToast();
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [replying, setReplying] = useState<GuestWish | null>(null);
  const [replyText, setReplyText] = useState('');
  const [toDelete, setToDelete] = useState<GuestWish | null>(null);
  const q = useDebounce(search, 300);

  const query = useQuery({ queryKey: [...queryKeys.cms.wishes, status, q], queryFn: () => cmsApi.wishes.list(status, q) });
  const wishes = query.data?.data || [];
  const pager = usePagination(wishes, 10);

  const refresh = () => {
    client.invalidateQueries({ queryKey: queryKeys.cms.wishes });
    client.invalidateQueries({ queryKey: queryKeys.guestbook });
    client.invalidateQueries({ queryKey: queryKeys.cms.stats });
  };
  const onError = (err: Error) => notify(err.message, 'error');

  const reply = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => cmsApi.wishes.reply(id, text),
    onSuccess: () => {
      refresh();
      notify('Balasan tersimpan.');
      setReplying(null);
    },
    onError,
  });
  const toggle = useMutation({
    mutationFn: cmsApi.wishes.toggleVisibility,
    onSuccess: (w) => {
      refresh();
      notify(w.isHidden ? 'Ucapan disembunyikan dari tamu.' : 'Ucapan tampil lagi.');
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: cmsApi.wishes.remove,
    onSuccess: () => {
      refresh();
      notify('Ucapan dihapus.');
      setToDelete(null);
    },
    onError,
  });

  return (
    <div>
      <div className="flex flex-col gap-2 lg:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Cari ucapan</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama atau isi ucapan" className="pl-9" />
        </label>
        <Segmented<StatusFilter>
          name="Saring kehadiran"
          value={status}
          onChange={setStatus}
          className="lg:w-[28rem]"
          options={[
            { value: 'ALL', label: 'Semua' },
            { value: 'HADIR', label: 'Hadir' },
            { value: 'TIDAK_HADIR', label: 'Tidak' },
            { value: 'RAGU', label: 'Ragu' },
          ]}
        />
      </div>

      <div className="mt-4 rounded-md border border-line bg-card">
        {query.isLoading ? (
          <LoadingState label="Memuat ucapan..." />
        ) : query.isError ? (
          <ErrorState title="Ucapan belum bisa dimuat." onRetry={() => query.refetch()} />
        ) : wishes.length === 0 ? (
          <EmptyState title="Belum ada ucapan di sini" />
        ) : (
          <ul className="divide-y divide-line">
            {pager.slice.map((w) => (
              <li key={w.id} className={`p-4 sm:p-5 ${w.isHidden ? 'bg-paper-2' : ''}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{w.guestName}</p>
                  <span className="text-sm text-ink-soft">{w.relationship}</span>
                  <StatusChip
                    status={w.attendanceStatus}
                    suffix={w.attendanceStatus === 'HADIR' ? `${w.numberOfGuests} orang` : undefined}
                  />
                  {w.isHidden && <Chip tone="neutral">Disembunyikan</Chip>}
                </div>
                <p className="mt-2 text-[15px] leading-relaxed break-words">{w.message}</p>
                {w.voiceUrl && (
                  <audio
                    src={w.voiceUrl}
                    controls
                    preload="none"
                    className="mt-2 h-10 w-full max-w-sm"
                    aria-label={`Pesan suara ${w.guestName}`}
                  />
                )}
                {w.reply && (
                  <p className="mt-2 border-l-2 border-prada pl-3 text-sm">
                    <span className="font-semibold text-prada-ink">Balasan: </span>
                    {w.reply}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="mr-auto text-xs text-ink-soft">{formatDateTime(w.createdAt)}</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setReplying(w);
                      setReplyText(w.reply || '');
                    }}
                  >
                    {w.reply ? 'Ubah balasan' : 'Balas'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => toggle.mutate(w.id)}>
                    {w.isHidden ? 'Tampilkan' : 'Sembunyikan'}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-no" onClick={() => setToDelete(w)}>
                    Hapus
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Pagination {...pager} onPage={pager.setPage} noun="ucapan" />

      <Modal
        open={replying !== null}
        onClose={() => setReplying(null)}
        title={`Balas ${replying?.guestName ?? ''}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReplying(null)}>
              Batal
            </Button>
            <Button type="submit" form="reply-form" loading={reply.isPending}>
              Simpan balasan
            </Button>
          </>
        }
      >
        {replying && (
          <form
            id="reply-form"
            onSubmit={(e) => {
              e.preventDefault();
              reply.mutate({ id: replying.id, text: replyText.trim() });
            }}
          >
            <blockquote className="mb-4 border-l-2 border-line pl-3 text-sm text-ink-soft">{replying.message}</blockquote>
            <Field label="Balasan mempelai" hint="Tampil di bawah ucapan ini. Kosongkan untuk menghapus balasan.">
              {(p) => <Textarea {...p} rows={3} value={replyText} onChange={(e) => setReplyText(e.target.value)} />}
            </Field>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Hapus ucapan?"
        message={`Ucapan dari ${toDelete?.guestName} akan dihapus permanen, termasuk status kehadirannya.`}
        confirmLabel="Hapus ucapan"
        busy={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </div>
  );
};
