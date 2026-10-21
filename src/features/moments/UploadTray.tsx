import React, { useEffect, useState } from 'react';
import { CloudUpload, CheckCircle2, RotateCw, X } from 'lucide-react';
import type { JobState } from './upload/queue.js';

/** Progress for photos still on their way to the feed; follows the guest around the page. */
export const UploadTray: React.FC<{ jobs: JobState[]; onRetry: () => void; onDiscard: (id: string) => void }> = ({
  jobs,
  onRetry,
  onDiscard,
}) => {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  if (!jobs.length) return null;
  return (
    <ul className="fixed inset-x-3 top-3 z-40 mx-auto max-w-md space-y-2" aria-live="polite">
      {jobs.map((job) => (
        <li key={job.id} className="flex items-center gap-3 rounded-md border border-on-deep/15 bg-deep-2/95 p-2.5 shadow-lg backdrop-blur">
          <img src={job.thumb} alt="" className="h-12 w-10 shrink-0 rounded-xs object-cover" />
          <div className="min-w-0 flex-1">
            {job.status === 'done' ? (
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ok-bg">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Sudah masuk galeri
              </p>
            ) : job.status === 'rejected' ? (
              <p className="text-sm text-on-deep">{job.error}</p>
            ) : (
              <>
                <p className="flex items-center justify-between gap-2 text-sm font-semibold">
                  <span className="flex items-center gap-1.5">
                    <CloudUpload className="h-4 w-4" aria-hidden="true" />
                    {!online
                      ? 'Tanpa sinyal, foto aman tersimpan'
                      : job.status === 'retrying'
                        ? 'Sinyal lemah, mencoba lagi...'
                        : job.status === 'waiting'
                          ? 'Menunggu giliran'
                          : 'Sedang dikirim'}
                  </span>
                  <span className="tabular-nums text-on-deep-soft">{Math.round(job.progress * 100)}%</span>
                </p>
                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-on-deep/15" aria-hidden="true">
                  <span
                    className="block h-full rounded-full bg-prada-on-deep transition-[width] duration-300"
                    style={{ width: `${Math.max(4, job.progress * 100)}%` }}
                  />
                </span>
              </>
            )}
          </div>
          {job.status === 'retrying' && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-white/10"
              aria-label="Coba kirim sekarang"
            >
              <RotateCw className="h-4 w-4" />
            </button>
          )}
          {job.status === 'rejected' && (
            <button
              type="button"
              onClick={() => onDiscard(job.id)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-white/10"
              aria-label="Buang foto ini"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
};
