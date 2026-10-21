import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cmsApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { PageHeader, Panel } from '../../../components/cms/CmsPage.js';
import { MediaField } from '../../../components/cms/MediaField.js';
import { useToast } from '../../../components/cms/Toast.js';
import { Button } from '../../../components/ui/Button.js';
import { Field, Input, Segmented, Textarea } from '../../../components/ui/Field.js';
import { ErrorState, LoadingState } from '../../../components/ui/StateView.js';
import type { CoupleProfile, MediaType } from '@shared/types';

type Side = 'groom' | 'bride';

export const CMSCoupleTab: React.FC = () => {
  const client = useQueryClient();
  const notify = useToast();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: queryKeys.cms.couple, queryFn: cmsApi.couple.get });
  const [form, setForm] = useState<CoupleProfile | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: cmsApi.couple.save,
    onSuccess: (saved) => {
      client.setQueryData(queryKeys.cms.couple, saved);
      client.invalidateQueries({ queryKey: queryKeys.invitation });
      notify('Data mempelai tersimpan.');
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  if (isLoading) return <LoadingState label="Memuat data mempelai..." />;
  if (isError || !form) return <ErrorState title="Data mempelai belum bisa dimuat." onRetry={() => refetch()} />;

  const set = <K extends keyof CoupleProfile>(key: K, value: CoupleProfile[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const person = (side: Side) => {
    const k = (suffix: string) => `${side}${suffix}` as keyof CoupleProfile;
    const title = side === 'groom' ? 'Mempelai pria' : 'Mempelai wanita';
    return (
      <Panel title={title}>
        <div className="space-y-4">
          <Field label="Nama lengkap & gelar">
            {(p) => <Input {...p} required value={form[k('Name')] as string} onChange={(e) => set(k('Name'), e.target.value)} />}
          </Field>
          <Field label="Nama panggilan" hint="Dipakai di sampul dan judul besar.">
            {(p) => <Input {...p} required value={form[k('ShortName')] as string} onChange={(e) => set(k('ShortName'), e.target.value)} />}
          </Field>
          <Field label="Keterangan orang tua">
            {(p) => <Textarea {...p} rows={2} value={form[k('Parents')] as string} onChange={(e) => set(k('Parents'), e.target.value)} />}
          </Field>
          <Field label="Instagram" aside="opsional" hint="Tanpa @">
            {(p) => (
              <Input
                {...p}
                value={(form[k('Instagram')] as string) || ''}
                onChange={(e) => set(k('Instagram'), e.target.value.replace(/^@/, ''))}
              />
            )}
          </Field>
          <MediaField
            label="Foto"
            aspect="portrait"
            category="couples"
            maxDimension={1200}
            value={form[k('Photo')] as string}
            onChange={(url) => set(k('Photo'), url)}
            hint="Potret tegak; tampil dalam bingkai gunungan."
          />
        </div>
      </Panel>
    );
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate(form);
      }}
    >
      <PageHeader
        title="Mempelai & sampul"
        description="Nama, orang tua, foto, gambar sampul, dan ayat pembuka."
        actions={
          <Button type="submit" loading={save.isPending}>
            Simpan perubahan
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {person('groom')}
        {person('bride')}

        <Panel title="Sampul (hero)" description="Tampil penuh layar setelah tamu membuka undangan.">
          <div className="space-y-4">
            <Segmented<MediaType>
              name="Jenis sampul"
              value={form.heroMediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE'}
              onChange={(v) => set('heroMediaType', v)}
              options={[
                { value: 'IMAGE', label: 'Foto' },
                { value: 'VIDEO', label: 'Video' },
              ]}
            />
            {form.heroMediaType === 'VIDEO' && (
              <MediaField
                label="Video sampul"
                category="hero"
                allowVideo
                value={form.heroVideoUrl || ''}
                onChange={(url) => set('heroVideoUrl', url)}
                hint="MP4 atau WEBM, maksimal 100 MB. Diputar tanpa suara. Di template Gulungan Kenangan, video ini tampil layar penuh sebagai film pembuka, disusul video dan foto dari Galeri (maksimal 3)."
              />
            )}
            <MediaField
              label={form.heroMediaType === 'VIDEO' ? 'Gambar cadangan video' : 'Foto sampul'}
              category="hero"
              maxDimension={1920}
              value={form.heroImage}
              onChange={(url) => set('heroImage', url)}
              hint="Lanskap, minimal 1600 px. Bagian bawah foto tertutup nama mempelai."
            />
          </div>
        </Panel>

        <Panel title="Ayat atau kutipan pembuka">
          <div className="space-y-4">
            <Field label="Teks">
              {(p) => <Textarea {...p} rows={5} value={form.quoteText} onChange={(e) => set('quoteText', e.target.value)} />}
            </Field>
            <Field label="Sumber" hint="Contoh: QS. Ar-Rum: 21">
              {(p) => <Input {...p} value={form.quoteSource} onChange={(e) => set('quoteSource', e.target.value)} />}
            </Field>
          </div>
        </Panel>
      </div>
    </form>
  );
};
