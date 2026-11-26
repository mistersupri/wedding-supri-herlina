import { collageSpec, type CollageLayout } from './collage.js';
import { placedInArea, type FrameLayout } from './frameLayout.js';

/**
 * The sheet a collage is laid out on, given the couple's frame settings. One place for this, so the camera
 * and the CMS preview lay shots out the same way.
 * - Photo placed in the couple's own area: the sheet takes the area's shape and the picture fills the area with it.
 * - Otherwise the sheet is the whole picture and the photos stay inside the frame's clear window.
 */
export function sheetFor(n: CollageLayout, opts: { frameOn: boolean; story: boolean; layout: FrameLayout; frameAspect: number }) {
  const { frameOn, story, layout, frameAspect } = opts;
  const inArea = frameOn && placedInArea(layout);
  const areaAspect = inArea ? (layout.area!.w / layout.area!.h) * frameAspect : undefined;
  const spec = collageSpec(n, story, undefined, {
    gap: frameOn ? layout.gap : undefined,
    border: frameOn ? layout.border : undefined,
    borderColor: layout.borderColor,
    ...(inArea ? { aspect: areaAspect, transparent: true } : { window: frameOn ? layout.area : null }),
  });
  return { spec, inArea, areaAspect };
}
