import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { registerServiceWorker } from '../../offline/register.js';

/** Tells guests when they are offline (the invitation still works) and when a newer version is ready. */
export const OfflineNotice: React.FC = () => {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [apply, setApply] = useState<(() => void) | null>(null);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    registerServiceWorker((fn) => setApply(() => fn));
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  if (online && !apply) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 p-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
      {!online && (
        <p role="status" className="pointer-events-auto flex max-w-md items-start gap-2 rounded-md bg-deep px-4 py-2.5 text-sm text-on-deep shadow-lg">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Anda sedang offline. Undangan ditampilkan dari data tersimpan. Ucapan dan foto menunggu sinyal.</span>
        </p>
      )}
      {apply && (
        <p role="status" className="pointer-events-auto flex max-w-md items-center gap-3 rounded-md bg-deep px-4 py-2.5 text-sm text-on-deep shadow-lg">
          <span>Versi baru undangan tersedia.</span>
          <button type="button" onClick={apply} className="min-h-9 rounded-sm bg-on-deep px-3 font-semibold text-deep">
            Muat ulang
          </button>
        </p>
      )}
    </div>
  );
};
