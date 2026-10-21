import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { publicApi } from '../../lib/api.js';
import { queryKeys } from '../../lib/queryKeys.js';
import { formatTime } from '../../lib/format.js';
import type { MomentIdentity } from '@shared/types';

/** Comments under a photo in the lightbox. */
export const CommentThread: React.FC<{ momentId: string; identity: MomentIdentity; onCount?: () => void }> = ({
  momentId,
  identity,
  onCount,
}) => {
  const client = useQueryClient();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const comments = useQuery({ queryKey: queryKeys.photoComments(momentId), queryFn: () => publicApi.photoComments(momentId) });

  const send = useMutation({
    mutationFn: () => publicApi.addPhotoComment(momentId, { guestName: identity.name, guestSlug: identity.slug, text }),
    onSuccess: () => {
      setText('');
      setError(null);
      client.invalidateQueries({ queryKey: queryKeys.photoComments(momentId) });
      onCount?.();
    },
    onError: (err: Error) => setError(err.message),
  });

  const list = comments.data || [];
  return (
    <div>
      {list.length > 0 && (
        <ul className="max-h-36 space-y-1.5 overflow-y-auto pr-1 text-sm">
          {list.map((c) => (
            <li key={c.id}>
              <span className="font-semibold">{c.guestName}</span> <span className="text-on-deep-soft">{c.text}</span>{' '}
              <span className="text-xs text-on-deep-soft/70">{formatTime(c.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) send.mutate();
        }}
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">Tulis komentar</span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 300))}
            placeholder="Tulis komentar..."
            className="h-11 w-full rounded-full border border-on-deep/25 bg-deep-2 px-4 text-[15px] text-on-deep placeholder:text-on-deep-soft"
          />
        </label>
        <button
          type="submit"
          disabled={!text.trim() || send.isPending}
          className="min-h-11 rounded-full bg-on-deep px-4 text-sm font-semibold text-deep disabled:opacity-50"
        >
          Kirim
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-1 text-sm text-no-bg">
          {error}
        </p>
      )}
    </div>
  );
};
