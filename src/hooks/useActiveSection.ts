import { useEffect, useState } from 'react';

/** Id of the section currently crossing the upper third of the viewport. */
export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0] || '');
  const key = ids.join('|');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) setActive(visible[visible.length - 1].target.id);
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return active;
}
