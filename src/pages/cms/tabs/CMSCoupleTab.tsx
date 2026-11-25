import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cmsApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { PageHeader, Panel } from '../../../components/cms/CmsPage.js';
import { HeroSlidesField } from '../../../components/cms/HeroSlidesField.js';
import { MediaField } from '../../../components/cms/MediaField.js';
import { TemplateNote } from '../../../components/cms/TemplateNote.js';
import { useActiveTemplate } from '../../../components/cms/useActiveTemplate.js';
import { useToast } from '../../../components/cms/Toast.js';
import { Button } from '../../../components/ui/Button.js';
import { Field, Input, Segmented, Textarea } from '../../../components/ui/Field.js';
import { InstagramField } from '../../../components/ui/fields.js';
import { checkInstagram } from '../../../lib/inputs.js';
import { required, useFormErrors } from '../../../components/cms/useFormErrors.js';
import { ErrorState, LoadingState } from '../../../components/ui/StateView.js';
import type { CoupleProfile, MediaType, TemplateTexts, TextKey } from '@shared/types';

type Side = 'groom' | 'bride';

export const CMSCoupleTab: React.FC = () => {
  const client = useQueryClient();
  const notify = useToast();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: queryKeys.cms.couple, queryFn: cmsApi.couple.get });
  const template = useActiveTemplate();
  const [form, setForm] = useState<CoupleProfile | null>(null);
  const { errors, clear, validate, formRef } = useFormErrors<'groomName' | 'groomShortName' | 'groomInstagram' | 'brideName' | 'brideShortName' | 'brideInstagram' | 'quoteText'>();

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

  const set = <K extends keyof CoupleProfile>(key: K, value: CoupleProfile[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    clear(key as 'groomName');
  };

  const person = (side: Side) => {
    const k = (suffix: string) => `${side}${suffix}` as keyof CoupleProfile;
    const title = side === 'groom' ? 'Mempelai pria' : 'Mempelai wanita';
    return (
      <Panel title={title}>
        <div className="space-y-4">
          <Field label="Nama lengkap & gelar" error={errors[`${side}Name` as 'groomName']} hint="Seperti di undangan cetak, contoh: Arya Pradipta, S.T.">
            {(p) => (
              <Input {...p} required maxLength={100} autoComplete="off" autoCapitalize="words" value={form[k('Name')] as string} onChange={(e) => set(k('Name'), e.target.value)} />
            )}
          </Field>
          <Field label="Nama panggilan" error={errors[`${side}ShortName` as 'groomShortName']} hint="Dipakai di sampul dan judul besar.">
            {(p) => (
              <Input {...p} required maxLength={30} autoComplete="off" autoCapitalize="words" value={form[k('ShortName')] as string} onChange={(e) => set(k('ShortName'), e.target.value)} />
            )}
          </Field>
          <Field label="Keterangan orang tua" counter={{ value: (form[k('Parents')] as string).length, max: 160 }} hint="Contoh: Putra pertama dari Bpk. Bambang & Ibu Sri">
            {(p) => <Textarea {...p} rows={2} maxLength={160} value={form[k('Parents')] as string} onChange={(e) => set(k('Parents'), e.target.value)} />}
          </Field>
          <InstagramField
            value={(form[k('Instagram')] as string) || ''}
            onChange={(v) => set(k('Instagram'), v)}
            error={errors[`${side}Instagram` as 'groomInstagram']}
          />
          <MediaField
            label="Foto"
            aspect="portrait"
            category="couples"
            maxDimension={1200}
            value={form[k('Photo')] as string}
            onChange={(url) => set(k('Photo'), url)}
            minWidth={600}
            hint="Potret tegak 3:4, minimal 600 px lebar. Tampil dalam bingkai gunungan."
          />
        </div>
      </Panel>
    );
  };

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const ok = validate({
          groomName: required(form.groomName, 'Nama mempelai pria'),
          groomShortName: required(form.groomShortName, 'Nama panggilan'),
          groomInstagram: checkInstagram(form.groomInstagram || ''),
          brideName: required(form.brideName, 'Nama mempelai wanita'),
          brideShortName: required(form.brideShortName, 'Nama panggilan'),
          brideInstagram: checkInstagram(form.brideInstagram || ''),
        });
        if (!ok) return;
        const empty = (form.heroSlides ?? []).findIndex((slide) => !slide.url);
        if (template.content.hero === 'multi' && empty >= 0) {
          notify(`Adegan ${empty + 1} belum ada foto atau videonya. Unggah, atau hapus adegan itu.`, 'error');
          return;
        }
        save.mutate(form);
      }}
    >
      <PageHeader
        title="Mempelai & sampul"
        stickyActions
        description="Nama, orang tua, foto, gambar sampul, dan ayat pembuka."
        actions={
          <Button type="submit" loading={save.isPending}>
            Simpan perubahan
          </Button>
        }
      />

      <TemplateNote>
        {template.content.hero === 'multi'
          ? 'Template ini memutar urutan foto dan video di layar pembuka, jadi sampul diisi sebagai beberapa adegan.'
          : template.content.hero === 'single'
            ? 'Template ini membuka dengan satu foto atau video layar penuh.'
            : 'Template ini tidak memakai sampul layar penuh. Foto mempelai dan teks di bawah yang tampil.'}
      </TemplateNote>

      <div className="grid gap-6 lg:grid-cols-2">
        {person('groom')}
        {person('bride')}

        {template.content.hero === 'multi' && (
          <Panel
            title="Layar pembuka"
            description="Foto dan video diputar berurutan di layar pertama setelah tamu membuka undangan. Atur urutannya sesuai alur cerita."
            className="lg:col-span-2"
          >
            <HeroSlidesField value={form.heroSlides ?? []} onChange={(slides) => set('heroSlides', slides)} max={5} />
          </Panel>
        )}

        {template.content.hero !== 'none' && (
          <Panel
            title={template.content.hero === 'multi' ? 'Foto cadangan' : 'Sampul (hero)'}
            description={
              template.content.hero === 'multi'
                ? 'Dipakai bila urutan layar pembuka kosong, dan sebagai gambar pratinjau saat tautan dibagikan.'
                : 'Tampil penuh layar setelah tamu membuka undangan.'
            }
          >
            <div className="space-y-4">
              {template.content.hero === 'single' && (
                <Segmented<MediaType>
                  name="Jenis sampul"
                  value={form.heroMediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE'}
                  onChange={(v) => set('heroMediaType', v)}
                  options={[
                    { value: 'IMAGE', label: 'Foto' },
                    { value: 'VIDEO', label: 'Video' },
                  ]}
                />
              )}
              {template.content.hero === 'single' && form.heroMediaType === 'VIDEO' && (
                <MediaField
                  label="Video sampul"
                  category="hero"
                  kinds={['video']}
                  value={form.heroVideoUrl || ''}
                  onChange={(url) => set('heroVideoUrl', url)}
                  hint="MP4 atau WEBM, maksimal 100 MB; di bawah 25 MB lebih cepat dimuat di HP. Diputar tanpa suara."
                />
              )}
              <MediaField
                label={template.content.hero === 'single' && form.heroMediaType === 'VIDEO' ? 'Gambar cadangan video' : 'Foto sampul'}
                category="hero"
                maxDimension={1920}
                minWidth={1600}
                value={form.heroImage}
                onChange={(url) => set('heroImage', url)}
                hint="Lanskap, minimal 1600 px lebar. Bagian bawah foto tertutup nama mempelai."
              />
            </div>
          </Panel>
        )}

        {template.content.hero === 'none' && (
          <Panel title="Foto pratinjau tautan" description="Template ini tidak menampilkan sampul. Foto ini hanya muncul sebagai gambar saat tautan undangan dibagikan di WhatsApp.">
            <MediaField
              label="Foto pratinjau"
              category="hero"
              maxDimension={1600}
              minWidth={1200}
              value={form.heroImage}
              onChange={(url) => set('heroImage', url)}
              hint="Lanskap, minimal 1200 px lebar. Sebaiknya kurang dari 300 KB agar pratinjau muncul cepat."
            />
          </Panel>
        )}

        <Panel title="Ayat atau kutipan pembuka">
          <div className="space-y-4">
            <Field label="Teks" counter={{ value: form.quoteText.length, max: 500 }}>
              {(p) => <Textarea {...p} rows={5} maxLength={500} value={form.quoteText} onChange={(e) => set('quoteText', e.target.value)} />}
            </Field>
            <Field label="Sumber" hint="Contoh: QS. Ar-Rum: 21">
              {(p) => <Input {...p} maxLength={80} autoComplete="off" value={form.quoteSource} onChange={(e) => set('quoteSource', e.target.value)} />}
            </Field>
          </div>
        </Panel>

        {template.content.texts.length > 0 && (
          <Panel
            title="Teks template"
            description="Kalimat yang ditulis template sendiri. Kosongkan kolom untuk memakai kalimat bawaan template."
            className="lg:col-span-2"
          >
            <div className="space-y-4">
              {template.content.texts.map((t) => {
                const value = form.texts?.[t.key] ?? '';
                const max = t.multiline ? 600 : 160;
                const setText = (v: string) => set('texts', { ...(form.texts ?? {}), [t.key]: v } as TemplateTexts);
                return (
                  <Field key={t.key as TextKey} label={t.label} hint={t.hint} counter={{ value: value.length, max }}>
                    {(p) =>
                      t.multiline ? (
                        <Textarea {...p} rows={4} maxLength={max} value={value} onChange={(e) => setText(e.target.value)} placeholder="Memakai kalimat bawaan template" />
                      ) : (
                        <Input {...p} maxLength={max} autoComplete="off" value={value} onChange={(e) => setText(e.target.value)} placeholder="Memakai kalimat bawaan template" />
                      )
                    }
                  </Field>
                );
              })}
            </div>
          </Panel>
        )}
      </div>
    </form>
  );
};
