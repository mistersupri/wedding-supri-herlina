import React, { useEffect, useRef, useState } from 'react';
import { aspectOf, isStoryAspect, loadImage, newRecipe, renderPhoto, sampleScene } from '../../../features/moments/film/render.js';
import { composeCollage, cropToCell, type CollageLayout } from '../../../features/moments/film/collage.js';
import { resolveFrameLayout } from '../../../features/moments/film/frameLayout.js';
import { sheetFor } from '../../../features/moments/film/sheet.js';
import type { PhotoFrameConfig } from '@shared/types';

const SHOT_HUES = [208, 28, 142, 330];

/** A plain coloured sample shot, tall enough to be cropped like a real one. */
function sampleShot(hue: number) {
  const c = document.createElement('canvas');
  c.width = 900;
  c.height = 1200;
  const g = c.getContext('2d')!;
  const fill = g.createLinearGradient(0, 0, 900, 1200);
  fill.addColorStop(0, `hsl(${hue},55%,66%)`);
  fill.addColorStop(1, `hsl(${hue + 40},55%,38%)`);
  g.fillStyle = fill;
  g.fillRect(0, 0, 900, 1200);
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.beginPath();
  g.arc(450, 470, 150, 0, Math.PI * 2);
  g.fill();
  g.fillRect(250, 660, 400, 460);
  return c;
}

/**
 * The frame as a guest will see it, drawn by the same code as the camera: the photo's size and place, its border,
 * and the gap between collage photos. Switch between one photo and a collage of 2 or 4.
 */
export const FramePreview: React.FC<{ config: PhotoFrameConfig; shots: CollageLayout }> = ({ config, shots }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [frame, setFrame] = useState<HTMLImageElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setFailed(false);
    if (!config.frameOverlayUrl) return setFrame(null);
    loadImage(config.frameOverlayUrl)
      .then((img) => live && setFrame(img))
      .catch(() => live && (setFrame(null), setFailed(true)));
    return () => {
      live = false;
    };
  }, [config.frameOverlayUrl]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !frame) return;
    const layout = resolveFrameLayout(frame, config);
    const aspect = aspectOf('event', frame);
    const { spec, inArea } = sheetFor(shots, { frameOn: true, story: isStoryAspect(aspect), layout, frameAspect: aspect });
    const recipe = newRecipe();
    recipe.frame = 'event';
    let source: HTMLCanvasElement;
    if (shots === 1) {
      source = sampleScene(900);
    } else {
      source = composeCollage(spec, spec.cells.map((cell, i) => cropToCell(sampleShot(SHOT_HUES[i]), cell)));
      if (!inArea) recipe.aspect = spec.width / spec.height;
    }
    renderPhoto(source, recipe, { width: 360, eventFrame: frame, layout, collage: shots > 1 }, canvas);
  }, [frame, config, shots]);

  if (failed) return <p className="text-sm text-no">Gambar bingkai tidak dapat dibaca.</p>;
  if (!frame) return <p className="text-sm text-ink-soft">Pilih bingkai untuk melihat pratinjau.</p>;
  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={`Pratinjau bingkai dengan ${shots === 1 ? 'satu foto' : `kolase ${shots} foto`}`}
      className="h-auto w-full max-w-60 rounded-xs border border-line bg-paper-2"
    />
  );
};
