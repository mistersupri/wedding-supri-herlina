import { useEffect, useRef } from 'react';

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** Film that is visible before the guest scrolls: the leader tip peeking out of the roll. */
const LEADER = 24;

/**
 * Drives the film reel from the page scroll. The reel section is several screens tall and holds a
 * sticky stage; scroll progress through it is written as CSS variables that gulungan.css reads:
 *   --p     0..1 progress through the reel
 *   --o     px of film unrolled (the film hangs below the roll and slides down)
 *   --lift  px the names and the roll rise to make room for the film
 *   --fade  0..1 how far the names have faded
 *   --spin  px offset of the roll's ridges, so the roll appears to turn
 *   --max   px height of the projector window the film runs through
 * Writes go straight to the DOM in one rAF per frame, so scrolling never re-renders React.
 */
export function useReelScroll(enabled: boolean) {
  const reel = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLElement>(null);
  const rig = useRef<HTMLDivElement>(null);
  const win = useRef<HTMLDivElement>(null);
  const film = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = { reel: reel.current, stage: stage.current, head: head.current, rig: rig.current, win: win.current, film: film.current };
    if (!enabled || Object.values(els).some((e) => !e)) return;
    const {
      reel: reelEl,
      stage: stageEl,
      head: headEl,
      rig: rigEl,
      win: winEl,
      film: filmEl,
    } = els as Required<{ [K in keyof typeof els]: HTMLElement }>;

    let frame = 0;
    let size = { vh: 0, range: 1, filmH: 0, liftMax: 0, max: 0 };

    const measure = () => {
      const vh = stageEl.clientHeight;
      const liftMax = headEl.offsetHeight * 0.9;
      // Room left under the roll once the names have lifted away, minus a margin for the hint.
      const max = Math.max(180, Math.round(vh - (rigEl.offsetTop - liftMax) - 46 - vh * 0.08));
      size = { vh, range: Math.max(1, reelEl.offsetHeight - vh), filmH: filmEl.scrollHeight, liftMax, max };
      stageEl.style.setProperty('--max', `${max}px`);
    };

    const update = () => {
      frame = 0;
      const p = clamp(-reelEl.getBoundingClientRect().top / size.range);
      // The film finishes a little before the end of the reel, so the last frame rests in the window.
      const o = LEADER + clamp(p / 0.92) * (size.filmH - LEADER);
      const lift = size.liftMax * easeOut(clamp(p / 0.22));
      stageEl.style.setProperty('--p', p.toFixed(4));
      stageEl.style.setProperty('--lift', lift.toFixed(1));
      stageEl.style.setProperty('--fade', clamp(p / 0.16).toFixed(3));
      stageEl.style.setProperty('--spin', `${(o * 0.1).toFixed(2)}px`);
      winEl.style.setProperty('--o', `${o.toFixed(1)}px`);
      winEl.classList.toggle('is-full', o >= size.max);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onResize = () => {
      measure();
      schedule();
    };

    measure();
    update();
    // The names are set in a web font; measure again once it has replaced the fallback.
    document.fonts?.ready.then(onResize);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', onResize);
    };
  }, [enabled]);

  return { reel, stage, head, rig, win, film };
}
