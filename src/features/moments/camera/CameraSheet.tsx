import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDialogBehaviour } from '../../../components/ui/Modal.js';
import { useTemplateFonts } from '../../invitation/templates/shared/kit.js';
import { availableLooks } from '../film/looks.js';
import { resolveFrameLayout } from '../film/frameLayout.js';
import { sheetFor } from '../film/sheet.js';
import { collageSpec, composeCollage, cropToCell, type CollageLayout } from '../film/collage.js';
import { aspectOf, isStoryAspect, loadImage, newRecipe, recipeAspect, renderPhoto, toBlob, type Recipe } from '../film/render.js';
import { enqueue } from '../upload/queue.js';
import { Darkroom } from './Darkroom.js';
import { Viewfinder } from './Viewfinder.js';
import type { CameraConfig, MomentIdentity } from '@shared/types';
import './camera.css';

interface CameraSheetProps {
  identity: MomentIdentity;
  config: CameraConfig;
  remaining: number;
  onClose: () => void;
  /** A shot went into the upload queue. */
  onQueued: () => void;
}

const ORIGINAL_MAX = 2400;
/** A Story is 1080 x 1920; a little extra width keeps the full-size copy sharp without an enormous file. */
const STORY_ORIGINAL_MAX = 1440;
const FEED_WIDTH = 1080;

/**
 * The disposable camera: shoot (or pick from the gallery), develop in the darkroom, send.
 * Sending only queues the photo; it uploads in the background, so the guest is back at the
 * viewfinder at once.
 */
export const CameraSheet: React.FC<CameraSheetProps> = ({ identity, config, remaining, onClose, onQueued }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const looks = availableLooks(config.settings.enabledLooks);
  const defaultLook = looks.some((l) => l.id === config.settings.defaultLook) ? config.settings.defaultLook : 'none';
  const [source, setSource] = useState<HTMLCanvasElement | HTMLImageElement | null>(null);
  const [recipe, setRecipe] = useState<Recipe>(() => newRecipe(defaultLook));
  const [eventFrame, setEventFrame] = useState<HTMLImageElement | null>(null);
  const [sending, setSending] = useState(false);
  // The couple's event frame is on by default; the guest can switch it off.
  const [useFrame, setUseFrame] = useState(true);
  const [shotFrames, setShotFrames] = useState(1);
  const [note, setNote] = useState('');
  const [layout, setLayout] = useState<CollageLayout>(1);
  const [shots, setShots] = useState<{ canvas: HTMLCanvasElement; thumb: string }[]>([]);
  useDialogBehaviour(true, onClose, panelRef);
  // The date stamp uses the same LCD face as the film theme.
  useTemplateFonts('family=VT323');

  useEffect(() => {
    const url = config.frame.enabled ? config.frame.frameOverlayUrl : '';
    if (!url) return;
    loadImage(url)
      .then(setEventFrame)
      .catch(() => setEventFrame(null));
  }, [config.frame]);

  const frameOn = useFrame && Boolean(eventFrame);
  // A Story-shaped event frame makes the viewfinder 9:16 and the photo Story-sized.
  const story = frameOn && isStoryAspect(aspectOf('event', eventFrame));
  // Over the photo, or under it: the frame decides where shots may land.
  const frameLayout = useMemo(() => resolveFrameLayout(eventFrame, config.frame), [eventFrame, config.frame]);
  // Frame settings decide where shots may land: in the couple's own photo area, or inside the frame's clear window.
  const frameAspect = aspectOf('event', eventFrame);
  // A collage uses one frame of the quota per shot, so a layout never offers more shots than the guest has left.
  const { spec: sheet, inArea: photoInArea, areaAspect } = sheetFor(layout, { frameOn, story, layout: frameLayout, frameAspect });
  useEffect(() => {
    if (layout > Math.max(1, remaining)) {
      setLayout(Math.max(1, Math.min(4, remaining)) as CollageLayout);
      setShots([]);
    }
  }, [layout, remaining]);
  const changeLayout = (next: CollageLayout) => {
    setLayout(next);
    setShots([]);
  };
  const changeFrame = (on: boolean) => {
    setUseFrame(on);
    setShots([]);
  };
  const takeShot = (shot: HTMLCanvasElement | HTMLImageElement) => {
    setSource(shot);
    setShotFrames(layout);
    setRecipe((r) => ({ ...r, frame: frameOn ? 'event' : 'none', aspect: layout > 1 && !photoInArea ? sheet.width / sheet.height : undefined }));
  };
  const collect = (shot: HTMLCanvasElement | HTMLImageElement) => {
    if (layout === 1) return takeShot(shot);
    const cropped = cropToCell(shot, sheet.cells[shots.length]);
    const thumb = document.createElement('canvas');
    thumb.width = 72;
    thumb.height = Math.round(72 / sheet.cellRatio);
    thumb.getContext('2d')!.drawImage(cropped, 0, 0, thumb.width, thumb.height);
    const next = [...shots, { canvas: cropped, thumb: thumb.toDataURL('image/jpeg', 0.6) }];
    if (next.length < layout) return setShots(next);
    setShots([]);
    takeShot(composeCollage(sheet, next.map((s) => s.canvas)));
  };

  const retake = () => {
    setSource(null);
    setShots([]);
    // Keep the look and effects for the next shot, like film loaded in a camera; reset framing only.
    setRecipe((r) => ({ ...r, crop: { zoom: 1, x: 0, y: 0, rotation: 0 }, caption: '' }));
  };

  const send = async () => {
    if (!source) return;
    setSending(true);
    try {
      await document.fonts?.load('40px VT323').catch(() => undefined);
      const w = 'naturalWidth' in source ? source.naturalWidth : source.width;
      const h = 'naturalHeight' in source ? source.naturalHeight : source.height;
      // Full size: as sharp as the source allows for this shape (4:5, or 9:16 for a Story frame), capped for upload size.
      const aspect = recipeAspect(recipe, eventFrame);
      const cropWidth = Math.min(w, h * aspect);
      const cap = isStoryAspect(aspect) ? STORY_ORIGINAL_MAX : ORIGINAL_MAX;
      const width = Math.round(Math.max(FEED_WIDTH, Math.min(cap, cropWidth / recipe.crop.zoom)));
      const original = await toBlob(renderPhoto(source, recipe, { width, eventFrame, layout: frameLayout, collage: shotFrames > 1 }), 0.92);
      const preview = await toBlob(renderPhoto(source, recipe, { width: FEED_WIDTH, eventFrame, layout: frameLayout, collage: shotFrames > 1 }), 0.85);
      await enqueue({ identity, caption: recipe.caption.trim(), look: recipe.look, frames: shotFrames, original, preview });
      onQueued();
      setNote('Foto masuk antrean kirim. Lanjut jepret!');
      setTimeout(() => setNote(''), 2600);
      if (remaining - shotFrames <= 0) onClose();
      else retake();
    } catch (err) {
      setNote((err as Error).message || 'Foto gagal diproses. Coba lagi.');
    } finally {
      setSending(false);
    }
  };

  return createPortal(
    <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Kamera tamu" tabIndex={-1} className="cam-root">
      {source ? (
        <Darkroom
          source={source}
          recipe={recipe}
          onChange={setRecipe}
          looks={looks}
          eventFrame={eventFrame}
          frameLayout={frameLayout}
          frameLocked={photoInArea && shotFrames > 1}
          remaining={remaining}
          cost={shotFrames}
          sending={sending}
          onRetake={retake}
          onSend={send}
          onClose={onClose}
        />
      ) : (
        <Viewfinder
          remaining={remaining}
          onShot={collect}
          onClose={onClose}
          story={story}
          frame={eventFrame ? { on: frameOn, onChange: changeFrame } : undefined}
          collage={{ layout, onLayout: changeLayout, cellRatio: sheet.cellRatio, singleRatio: areaAspect, taken: shots.map((s) => s.thumb), onUndo: () => setShots((s) => s.slice(0, -1)) }}
        />
      )}
      {note && (
        <p role="status" className="cam-toast">
          {note}
        </p>
      )}
    </div>,
    document.body,
  );
};
