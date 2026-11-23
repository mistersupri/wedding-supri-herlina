import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, cmsApi } from '../../../lib/api.js';
import { useAuth } from '../../../context/AuthContext.js';
import { PageHeader, Panel } from '../../../components/cms/CmsPage.js';
import { useToast } from '../../../components/cms/Toast.js';
import { Button } from '../../../components/ui/Button.js';
import { PasswordField } from '../../../components/ui/fields.js';
import { ConfirmDialog } from '../../../components/ui/Modal.js';

export const CMSSettingsTab: React.FC = () => {
  const client = useQueryClient();
  const notify = useToast();
  const { user } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mismatch, setMismatch] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const isEnvAdmin = user?.id === 'adm_env_01';

  const password = useMutation({
    mutationFn: () => authApi.changePassword(current, next),
    onSuccess: (msg) => {
      notify(msg || 'Kata sandi diperbarui.');
      setCurrent('');
      setNext('');
      setConfirm('');
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const reset = useMutation({
    mutationFn: cmsApi.resetDemo,
    onSuccess: () => {
      client.invalidateQueries();
      notify('Semua data kembali ke isi demo.');
      setResetOpen(false);
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  return (
    <>
      <PageHeader title="Pengaturan" description="Akun admin dan pemulihan data." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Akun">
          <dl className="space-y-3 text-[15px]">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Nama</dt>
              <dd className="font-semibold">{user?.name}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Username</dt>
              <dd className="font-semibold">{user?.username}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Peran</dt>
              <dd className="font-semibold">{user?.role === 'SUPERADMIN' ? 'Admin utama' : 'Admin'}</dd>
            </div>
          </dl>
        </Panel>

        <Panel title="Ganti kata sandi">
          {isEnvAdmin ? (
            <p className="text-[15px] leading-relaxed text-ink-soft">
              Akun ini memakai kata sandi dari variabel <code className="rounded-xs bg-paper-2 px-1">ADMIN_PASSWORD</code> di server. Ubah
              nilainya di file environment, lalu jalankan ulang server.
            </p>
          ) : (
            <form
              className="space-y-4"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                if (!current) return setProblem('Isi kata sandi saat ini.');
                if (next.length < 6) return setProblem('Kata sandi baru minimal 6 karakter.');
                if (next === current) return setProblem('Kata sandi baru harus berbeda dari yang lama.');
                if (next !== confirm) return setMismatch('Konfirmasi tidak sama dengan kata sandi baru.');
                setProblem(null);
                setMismatch(null);
                password.mutate();
              }}
            >
              <PasswordField label="Kata sandi saat ini" autoComplete="current-password" value={current} onChange={(v) => { setCurrent(v); setProblem(null); }} error={problem === 'Isi kata sandi saat ini.' ? problem : null} />
              <PasswordField
                label="Kata sandi baru"
                autoComplete="new-password"
                strength
                minLength={6}
                value={next}
                onChange={(v) => { setNext(v); setProblem(null); }}
                hint="Minimal 6 karakter. Campur huruf besar, kecil, dan angka agar lebih kuat."
                error={problem && problem !== 'Isi kata sandi saat ini.' ? problem : null}
              />
              <PasswordField
                label="Ulangi kata sandi baru"
                autoComplete="new-password"
                value={confirm}
                onChange={(v) => { setConfirm(v); setMismatch(null); }}
                error={mismatch ?? (confirm && next && confirm !== next ? 'Belum sama dengan kata sandi baru.' : null)}
              />
              <Button type="submit" loading={password.isPending}>
                Simpan kata sandi
              </Button>
            </form>
          )}
        </Panel>

        <Panel
          title="Kembalikan isi demo"
          description="Menghapus semua data undangan, tamu, ucapan, dan foto tamu, lalu mengisi ulang dengan contoh."
          className="lg:col-span-2"
        >
          <Button variant="danger" onClick={() => setResetOpen(true)}>
            Kembalikan ke isi demo
          </Button>
        </Panel>
      </div>

      <ConfirmDialog
        open={resetOpen}
        title="Kembalikan semua data ke isi demo?"
        message="Seluruh data mempelai, acara, galeri, daftar tamu, ucapan, dan foto tamu akan diganti contoh. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Ya, kembalikan"
        busy={reset.isPending}
        onCancel={() => setResetOpen(false)}
        onConfirm={() => reset.mutate()}
      />
    </>
  );
};
