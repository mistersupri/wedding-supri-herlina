import { useCallback, useEffect, useRef, useState } from 'react';

/** Copy text to the clipboard; `copied` holds the key of the last copied item for 2.5s. */
export function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async (text: string, key = text) => {
    try {
      await navigator.clipboard.writeText(text);
      setFailed(false);
      setCopied(key);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(null), 2500);
      return true;
    } catch {
      setFailed(true);
      return false;
    }
  }, []);

  return { copy, copied, failed };
}
