import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDialogBehaviour } from '../../../components/ui/Modal.js';
import { useTemplateFonts } from '../../invitation/templates/shared/kit.js';
import { availableLooks } from '../film/looks.js';
import { loadImage, newRecipe, renderPhoto, toBlob, type Recipe } from '../film/render.js';
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
  const [note, setNote] = useState('');
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

  const retake = () => {
    setSource(null);
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
      // Full size: as sharp as the source allows for a 4:5 crop, capped for upload size.
      const cropWidth = Math.min(w, (h * 4) / 5);
      const width = Math.round(Math.max(FEED_WIDTH, Math.min(ORIGINAL_MAX, cropWidth / recipe.crop.zoom)));
      const original = await toBlob(renderPhoto(source, recipe, { width, eventFrame }), 0.92);
      const preview = await toBlob(renderPhoto(source, recipe, { width: FEED_WIDTH, eventFrame }), 0.85);
      await enqueue({ identity, caption: recipe.caption.trim(), look: recipe.look, original, preview });
      onQueued();
      setNote('Foto masuk antrean kirim. Lanjut jepret!');
      setTimeout(() => setNote(''), 2600);
      if (remaining - 1 <= 0) onClose();
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
          remaining={remaining}
          sending={sending}
          onRetake={retake}
          onSend={send}
          onClose={onClose}
        />
      ) : (
        <Viewfinder remaining={remaining} onShot={setSource} onClose={onClose} />
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
