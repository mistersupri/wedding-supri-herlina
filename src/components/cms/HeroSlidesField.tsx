import React from 'react';
import { ArrowDown, ArrowUp, Film, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button.js';
import { Segmented } from '../ui/Field.js';
import { EmptyState } from '../ui/StateView.js';
import { MediaField } from './MediaField.js';
import type { HeroSlide } from '@shared/types';

interface Props {
  value: HeroSlide[];
  onChange: (slides: HeroSlide[]) => void;
  max: number;
}

/**
 * The opening screen of a template that plays a sequence: add up to `max` photos or videos and put them in order.
 * Each item is one scene; a video can have a still image shown while it loads.
 */
export const HeroSlidesField: React.FC<Props> = ({ value, onChange, max }) => {
  const update = (index: number, patch: Partial<HeroSlide>) => onChange(value.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  const move = (index: number, by: -1 | 1) => {
    const next = [...value];
    [next[index], next[index + by]] = [next[index + by], next[index]];
    onChange(next);
  };
  const add = (type: HeroSlide['type']) => onChange([...value, { type, url: '' }]);
  const full = value.length >= max;

  return (
    <div>
      {value.length === 0 ? (
        <EmptyState title="Belum ada foto atau video" detail="Tambahkan adegan pembuka. Bila dikosongkan, template memakai foto sampul dan isi galeri." />
      ) : (
        <ol className="space-y-4">
          {value.map((slide, i) => (
            <li key={i} className="rounded-md border border-line p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  Adegan {i + 1} <span className="font-normal text-ink-soft">dari {value.length}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp className="h-4 w-4" aria-hidden="true" /> Naik
                  </Button>
                  <Button variant="secondary" size="sm" disabled={i === value.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown className="h-4 w-4" aria-hidden="true" /> Turun
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => onChange(value.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" /> Hapus<span className="sr-only"> adegan {i + 1}</span>
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                <Segmented<HeroSlide['type']>
                  name={`Jenis adegan ${i + 1}`}
                  value={slide.type}
                  onChange={(type) => update(i, { type, url: '', poster: undefined })}
                  options={[
                    { value: 'IMAGE', label: 'Foto' },
                    { value: 'VIDEO', label: 'Video' },
                  ]}
                />
                <MediaField
                  key={`${i}-${slide.type}`}
                  label={slide.type === 'VIDEO' ? 'Video' : 'Foto'}
                  category="hero"
                  kinds={slide.type === 'VIDEO' ? ['video'] : ['image']}
                  aspect="landscape"
                  maxDimension={1920}
                  minWidth={1280}
                  value={slide.url}
                  onChange={(url) => update(i, { url })}
                  hint={slide.type === 'VIDEO' ? 'MP4 atau WEBM, maksimal 100 MB; di bawah 25 MB lebih cepat dimuat di HP. Diputar tanpa suara.' : 'Lanskap, minimal 1280 px lebar.'}
                />
                {slide.type === 'VIDEO' && (
                  <MediaField
                    label="Gambar sementara video (opsional)"
                    category="hero"
                    kinds={['image']}
                    aspect="landscape"
                    maxDimension={1600}
                    value={slide.poster || ''}
                    onChange={(poster) => update(i, { poster: poster || undefined })}
                    hint="Tampil selama video dimuat, terutama di sinyal lambat."
                  />
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="secondary" disabled={full} onClick={() => add('IMAGE')}>
          <ImageIcon className="h-4 w-4" aria-hidden="true" /> Tambah foto
        </Button>
        <Button variant="secondary" disabled={full} onClick={() => add('VIDEO')}>
          <Film className="h-4 w-4" aria-hidden="true" /> Tambah video
        </Button>
        <p className="text-sm text-ink-soft" role="status">
          {value.length} dari {max} adegan{full ? '. Batas tercapai.' : '.'}
        </p>
      </div>
    </div>
  );
};
