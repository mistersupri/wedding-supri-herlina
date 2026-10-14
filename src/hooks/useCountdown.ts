import { useEffect, useState } from 'react';

function remaining(target: number) {
  const diff = target - Date.now();
  if (!Number.isFinite(diff) || diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor(diff / 3_600_000) % 24,
    minutes: Math.floor(diff / 60_000) % 60,
    seconds: Math.floor(diff / 1000) % 60,
    isPast: false,
  };
}

export function useCountdown(targetIso: string) {
  const target = new Date(targetIso).getTime();
  const [left, setLeft] = useState(() => remaining(target));
  useEffect(() => {
    setLeft(remaining(target));
    const timer = setInterval(() => setLeft(remaining(target)), 1000);
    return () => clearInterval(timer);
  }, [target]);
  return left;
}
