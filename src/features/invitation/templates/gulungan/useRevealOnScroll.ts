import { useEffect, type RefObject } from 'react';

/**
 * Adds `is-in` to every `.gk-rv` inside `root` the first time it scrolls into view; the CSS fades it
 * up 22px. Elements mounted later (after unlocking, after an RSVP) are picked up through a MutationObserver.
 * `.gk-credits` gets the same class, which starts the end-credit roll.
 */
export function useRevealOnScroll(root: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const el = root.current;
    if (!el || !enabled) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    const watch = () => el.querySelectorAll('.gk-rv:not(.is-in), .gk-credits:not(.is-in)').forEach((node) => io.observe(node));
    watch();
    const mo = new MutationObserver(watch);
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [root, enabled]);
}
