import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type Tone = 'success' | 'error';
type Notify = (message: string, tone?: Tone) => void;

const ToastContext = createContext<Notify>(() => undefined);

/** One status line at the bottom of the CMS; announced politely, errors assertively. */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<{ message: string; tone: Tone; id: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const notify = useCallback<Notify>((message, tone = 'success') => {
    clearTimeout(timer.current);
    setToast({ message, tone, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), tone === 'error' ? 6000 : 3500);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
        <div role={toast?.tone === 'error' ? 'alert' : 'status'} aria-live={toast?.tone === 'error' ? 'assertive' : 'polite'}>
          {toast && (
            <p
              key={toast.id}
              className={`pointer-events-auto max-w-md rounded-sm px-4 py-3 text-sm font-semibold shadow-[0_12px_32px_-12px_rgba(20,12,6,0.5)] ${
                toast.tone === 'error' ? 'bg-no text-white' : 'bg-deep text-on-deep'
              }`}
            >
              {toast.message}
            </p>
          )}
        </div>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
