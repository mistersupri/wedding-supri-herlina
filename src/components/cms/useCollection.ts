import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys.js';
import { useToast } from './Toast.js';

interface CollectionApi<T extends { id: string }> {
  list: () => Promise<T[]>;
  create: (input: Omit<T, 'id'>) => Promise<T>;
  update: (id: string, patch: Partial<T>) => Promise<T>;
  remove: (id: string) => Promise<void>;
}

/**
 * Query + create/update/remove for one CMS collection. Every change also refreshes the public
 * invitation cache, so "Pratinjau" shows it at once.
 */
export function useCollection<T extends { id: string }>(key: readonly string[], api: CollectionApi<T>, noun: string) {
  const client = useQueryClient();
  const notify = useToast();
  const query = useQuery({ queryKey: key, queryFn: api.list });

  const refresh = () => {
    client.invalidateQueries({ queryKey: key });
    client.invalidateQueries({ queryKey: queryKeys.invitation });
    client.invalidateQueries({ queryKey: queryKeys.cms.stats });
  };
  const onError = (err: Error) => notify(err.message, 'error');

  const save = useMutation({
    mutationFn: (item: Partial<T>) => (item.id ? api.update(item.id, item) : api.create(item as Omit<T, 'id'>)),
    onSuccess: (_d, item) => {
      refresh();
      notify(item.id ? `${noun} diperbarui.` : `${noun} ditambahkan.`);
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: api.remove,
    onSuccess: () => {
      refresh();
      notify(`${noun} dihapus.`);
    },
    onError,
  });

  return { query, items: query.data || [], save, remove };
}
