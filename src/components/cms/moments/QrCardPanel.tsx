import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, ExternalLink, Printer } from 'lucide-react';
import { publicApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { coupleNames, formatLongDate } from '../../../lib/format.js';
import { TEMPLATES } from '@shared/templates';
import { useDebounce } from '../../../hooks/useDebounce.js';
import { Panel } from '../CmsPage.js';
import { useToast } from '../Toast.js';
import { Button, buttonClass } from '../../ui/Button.js';
import { Field, Input, Select } from '../../ui/Field.js';
import type { TemplateId } from '@shared/types';

// Loaded on demand: the QR and drawing code is only needed once the couple opens this panel.
const loadCard = () => import('../../../features/moments/qrCard/index.js');

const PAPERS = [
  { id: 'A5', label: 'A5 kartu meja (148 × 210 mm)' },
  { id: 'A4', label: 'A4 poster (210 × 297 mm)' },
  { id: 'A6', label: 'A6 kartu kecil (105 × 148 mm)' },
] as const;
type PaperId = (typeof PAPERS)[number]['id'];

/**
 * Print-ready QR card for the guest camera, drawn in the style of the invitation template (or any other one
 * the couple prefers) and delivered as a PDF. The preview is the same drawing the PDF is made from.
 */
export const QrCardPanel: React.FC = () => {
  const notify = useToast();
  const { data: invitation } = useQuery({ queryKey: queryKeys.invitation, queryFn: publicApi.invitation });
  const [title, setTitle] = useState('Abadikan momen bersama kami');
  const [paper, setPaper] = useState<PaperId>('A5');
  const [chosen, setChosen] = useState<TemplateId | null>(null);
  const [busy, setBusy] = useState<'download' | 'print' | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderId = useRef(0);

  const url = `${window.location.origin}/photo-moments`;
  const template: TemplateId = chosen ?? invitation?.templateId ?? 'nusantara';
  const templateName = TEMPLATES.find((t) => t.id === template)?.name ?? '';
  const debouncedTitle = useDebounce(title, 250);

  const options = useMemo(
    () =>
      invitation && {
        template,
        themePreset: invitation.themeColor,
        title: debouncedTitle,
        names: coupleNames(invitation),
        dateText: invitation.weddingDate ? formatLongDate(invitation.weddingDate) : '',
        url,
      },
    [invitation, template, debouncedTitle, url],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !options) return;
    const id = ++renderId.current;
    setPreviewing(true);
    loadCard()
      .then(({ renderCard }) => renderCard(canvas, options))
      .catch(() => notify('Pratinjau kartu gagal dibuat.', 'error'))
      .finally(() => id === renderId.current && setPreviewing(false));
  }, [options, notify]);

  const pdf = async (mode: 'download' | 'print') => {
    if (!options) return;
    setBusy(mode);
    try {
      const { makeCardPdf } = await loadCard();
      const blob = await makeCardPdf({ ...options, title }, paper);
      const href = URL.createObjectURL(blob);
      if (mode === 'download') {
        const link = Object.assign(document.createElement('a'), { href, download: `kartu-qr-photo-moments-${template}-${paper.toLowerCase()}.pdf` });
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else if (!window.open(href, '_blank')) {
        notify('Peramban menahan jendela baru. Izinkan pop-up, atau pakai Unduh PDF.', 'error');
      }
      setTimeout(() => URL.revokeObjectURL(href), 60_000);
    } catch (err) {
      notify((err as Error).message || 'PDF gagal dibuat.', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Panel
      title="Kartu QR untuk meja"
      description="Satu QR untuk seluruh acara, dalam tampilan template undangan. Unduh sebagai PDF siap cetak untuk meja tamu, papan selamat datang, atau bagian belakang undangan cetak."
      actions={
        <a href="/photo-moments/layar" target="_blank" rel="noreferrer" className={buttonClass('secondary', 'md')}>
          <ExternalLink className="h-4 w-4" aria-hidden="true" /> Buka layar besar
        </a>
      }
      className="mb-6"
    >
      <div className="grid items-start gap-6 md:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <Field label="Gaya kartu" hint={chosen ? 'Gaya dipilih manual.' : `Mengikuti template undangan yang aktif: ${templateName}.`}>
            {(p) => (
              <Select {...p} value={template} onChange={(e) => setChosen(e.target.value as TemplateId)}>
                {TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.id === invitation?.templateId ? ' (template aktif)' : ''}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Judul kartu">
            {(p) => <Input {...p} value={title} maxLength={48} onChange={(e) => setTitle(e.target.value)} />}
          </Field>
          <Field label="Ukuran kertas" hint="Resolusi 300 dpi. Ketiganya berproporsi sama, jadi A4 bisa dikecilkan saat mencetak tanpa terpotong.">
            {(p) => (
              <Select {...p} value={paper} onChange={(e) => setPaper(e.target.value as PaperId)}>
                {PAPERS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => pdf('download')} loading={busy === 'download'} disabled={!options}>
              <Download className="h-4 w-4" aria-hidden="true" /> Unduh PDF
            </Button>
            <Button variant="secondary" onClick={() => pdf('print')} loading={busy === 'print'} disabled={!options}>
              <Printer className="h-4 w-4" aria-hidden="true" /> Buka untuk cetak
            </Button>
          </div>
          <p className="text-sm text-ink-soft">
            Siapa yang bisa masuk dengan QR ini mengikuti aturan kamera di atas. Untuk QR di meja, pilih <strong>Siapa saja</strong> agar tamu cukup
            menulis nama. Di PDF, QR juga bisa diklik.
          </p>
          <p className="text-sm break-all text-ink-soft">Tautan: {url}</p>
        </div>

        <div className="mx-auto w-full max-w-[22rem]">
          <canvas
            ref={canvasRef}
            width={660}
            height={933}
            role="img"
            aria-label={`Pratinjau kartu QR gaya ${templateName}`}
            className={`block aspect-[1000/1414] w-full rounded-sm border border-line bg-paper-2 shadow-sm transition-opacity ${previewing ? 'opacity-60' : ''}`}
          />
        </div>
      </div>
    </Panel>
  );
};
