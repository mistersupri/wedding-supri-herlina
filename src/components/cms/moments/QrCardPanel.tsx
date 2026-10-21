import React, { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { ExternalLink, Printer } from 'lucide-react';
import { publicApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { coupleNames } from '../../../lib/format.js';
import { Panel } from '../CmsPage.js';
import { Button, buttonClass } from '../../ui/Button.js';
import { Field, Input } from '../../ui/Field.js';

/**
 * A table card with the camera QR, in the invitation's colours. Printing opens the card alone
 * in a new window, two to an A4 sheet.
 */
export const QrCardPanel: React.FC = () => {
  const { data: invitation } = useQuery({ queryKey: queryKeys.invitation, queryFn: publicApi.invitation });
  const [title, setTitle] = useState('Abadikan momen bersama kami');
  const cardRef = useRef<HTMLDivElement>(null);
  const url = `${window.location.origin}/photo-moments`;
  const names = invitation ? coupleNames(invitation) : '';
  const theme = !invitation ? 'sogan' : invitation.templateId !== 'nusantara' ? invitation.templateId : invitation.themeColor;

  const print = () => {
    const card = cardRef.current;
    if (!card) return;
    // Read the invitation palette off the card itself (it carries the template's data-theme).
    const css = getComputedStyle(card);
    const v = (name: string) => css.getPropertyValue(name).trim();
    const win = window.open('', '_blank', 'width=820,height=1000');
    if (!win) return;
    win.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Kartu meja kamera tamu</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,500&family=Plus+Jakarta+Sans:wght@500;700&display=swap">
<style>
  @page { size: A4; margin: 12mm; }
  body { margin: 0; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; display: grid; gap: 10mm; }
  .qr-card { --paper: ${v('--paper')}; --ink: ${v('--ink')}; --primary: ${v('--primary')}; --deep: ${v('--deep')}; --on-deep: ${v('--on-deep')}; --accent: ${v('--prada-on-deep')}; }
  ${CARD_CSS}
</style></head><body>${card.outerHTML}${card.outerHTML}<script>document.fonts.ready.then(() => setTimeout(() => print(), 300));</script></body></html>`);
    win.document.close();
  };

  return (
    <Panel
      title="Kartu QR untuk meja"
      description="Satu QR untuk seluruh acara. Taruh di meja tamu, papan selamat datang, atau di belakang undangan cetak."
      actions={
        <div className="flex flex-wrap gap-2">
          <a href="/photo-moments/layar" target="_blank" rel="noreferrer" className={buttonClass('secondary', 'md')}>
            <ExternalLink className="h-4 w-4" aria-hidden="true" /> Buka layar besar
          </a>
          <Button onClick={print}>
            <Printer className="h-4 w-4" aria-hidden="true" /> Cetak kartu
          </Button>
        </div>
      }
      className="mb-6"
    >
      <style>{CARD_CSS}</style>
      <div className="grid items-start gap-6 md:grid-cols-[1fr_20rem]">
        <div className="space-y-3">
          <Field label="Judul kartu">
            {(p) => <Input {...p} value={title} maxLength={48} onChange={(e) => setTitle(e.target.value)} />}
          </Field>
          <p className="text-sm text-ink-soft">
            Siapa yang bisa masuk dengan QR ini mengikuti aturan kamera di atas. Untuk QR di meja, pilih <strong>Siapa saja</strong> agar
            tamu cukup menulis nama.
          </p>
          <p className="text-sm break-all text-ink-soft">Tautan: {url}</p>
        </div>
        <div ref={cardRef} className="qr-card" data-theme={theme}>
          <p className="qr-kicker">kamera tamu</p>
          <p className="qr-title">{title}</p>
          <div className="qr-code">
            <QRCodeSVG value={url} size={150} level="M" />
          </div>
          <ol className="qr-steps">
            <li>Pindai kode ini dengan kamera HP</li>
            <li>Pilih look film, lalu jepret</li>
            <li>Fotomu langsung masuk galeri dan layar besar</li>
          </ol>
          <p className="qr-names">{names}</p>
        </div>
      </div>
    </Panel>
  );
};

/** Shared by the preview and the print window, so both look the same. */
const CARD_CSS = `
.qr-card { background: var(--deep); border-radius: 10px; color: var(--on-deep); padding: 26px 24px 22px; text-align: center; max-width: 320px; margin: 0 auto; box-sizing: border-box; }
.qr-kicker { font-size: 11px; letter-spacing: 4px; text-transform: uppercase; opacity: .75; margin: 0; }
.qr-title { font-family: Fraunces, Georgia, serif; font-style: italic; font-size: 28px; line-height: 1.1; margin: 8px 0 16px; }
.qr-code { background: #fff; border-radius: 8px; display: inline-block; padding: 12px; line-height: 0; }
.qr-steps { font-size: 13px; line-height: 1.5; margin: 16px auto 0; max-width: 240px; padding-left: 18px; text-align: left; }
.qr-names { border-top: 1px solid color-mix(in srgb, var(--on-deep) 30%, transparent); color: var(--accent); font-family: Fraunces, Georgia, serif; font-style: italic; font-size: 20px; margin: 16px 0 0; padding-top: 12px; }
`;
