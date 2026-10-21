import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { cmsApi, publicApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { formatDateTime } from '../../../lib/format.js';
import { useToast } from '../Toast.js';
import { Modal } from '../../ui/Modal.js';
import { EmptyState, LoadingState } from '../../ui/StateView.js';
import type { PhotoMoment } from '@shared/types';

/** Read and remove the comments under one guest photo. */
export const CommentsDialog: React.FC<{ photo: PhotoMoment | null; onClose: () => void }> = ({ photo, onClose }) => {
  const client = useQueryClient();
  const notify = useToast();
  const id = photo?.id || '';
  const comments = useQuery({ queryKey: queryKeys.photoComments(id), queryFn: () => publicApi.photoComments(id), enabled: Boolean(photo) });
  const remove = useMutation({
    mutationFn: cmsApi.photoMoments.removeComment,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.photoComments(id) });
      client.invalidateQueries({ queryKey: queryKeys.cms.photoMoments });
      notify('Komentar dihapus.');
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  return (
    <Modal open={photo !== null} onClose={onClose} title={`Komentar di foto ${photo?.guestName || ''}`} size="md">
      {comments.isLoading ? (
        <LoadingState label="Memuat komentar..." />
      ) : !comments.data?.length ? (
        <EmptyState title="Belum ada komentar" />
      ) : (
        <ul className="divide-y divide-line">
          {comments.data.map((c) => (
            <li key={c.id} className="flex items-start gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-semibold">{c.guestName}</span> <span className="text-ink-soft">{formatDateTime(c.createdAt)}</span>
                </p>
                <p className="mt-0.5 break-words">{c.text}</p>
              </div>
              <button
                type="button"
                onClick={() => remove.mutate(c.id)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-no hover:bg-no-bg"
                aria-label={`Hapus komentar dari ${c.guestName}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
};
