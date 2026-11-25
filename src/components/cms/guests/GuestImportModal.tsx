import React, { useMemo, useRef, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { buildXlsx, parseDelimited, readXlsx } from '../../../lib/xlsx.js';
import { Button } from '../../ui/Button.js';
import { Checkbox, Field, Textarea } from '../../ui/Field.js';
import { Modal } from '../../ui/Modal.js';
import { IMPORT_COLUMNS, parseGuestRows } from './GuestForm.js';
import type { InvitedGuestInput } from '@shared/types';

const MAX_FILE_MB = 5;
const PREVIEW_ROWS = 6;

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** The template: titles plus two sample rows. Cells are text, so phone numbers keep their leading zero. */
export function downloadGuestTemplate() {
  const rows = [
    IMPORT_COLUMNS.map((c) => c.title as string),
    ['Budi Santoso', 'Keluarga', '2', '0812-3456-7890', 'A1', 'Teman kuliah', 'budi.santoso'],
    ['Siti Aminah & Suami', 'Sahabat', '2', '+62 813 9876 5432', 'A2', '', ''],
  ];
  download(buildXlsx(rows, 'Tamu', [26, 14, 8, 20, 10, 28, 18]), 'template-daftar-tamu.xlsx');
}

/** Import from an Excel / CSV file, or from text pasted out of a spreadsheet. Shows what was read before anything is saved. */
export const GuestImportModal: React.FC<{
  open: boolean;
  onClose: () => void;
  busy: boolean;
  onImport: (guests: InvitedGuestInput[], skipDuplicates: boolean) => void;
}> = ({ open, onClose, busy, onImport }) => {
  const [rows, setRows] = useState<string[][]>([]);
  const [source, setSource] = useState('');
  const [pasted, setPasted] = useState('');
  const [fileError, setFileError] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const reset = () => {
    setRows([]);
    setSource('');
    setPasted('');
    setFileError('');
  };
  const close = () => {
    reset();
    onClose();
  };

  const take = async (file?: File) => {
    if (!file) return;
    setFileError('');
    if (file.size > MAX_FILE_MB * 1024 * 1024) return setFileError(`"${file.name}" lebih dari ${MAX_FILE_MB} MB.`);
    if (!/\.(xlsx|csv|tsv|txt)$/i.test(file.name)) {
      return setFileError(/\.xls$/i.test(file.name) ? 'Format .xls lama belum didukung. Simpan ulang sebagai .xlsx atau .csv.' : `"${file.name}" bukan file Excel (.xlsx), CSV, atau teks.`);
    }
    setReading(true);
    try {
      const parsed = /\.xlsx$/i.test(file.name) ? await readXlsx(await file.arrayBuffer()) : parseDelimited(await file.text());
      setRows(parsed);
      setSource(file.name);
      setPasted('');
    } catch (err) {
      setFileError((err as Error).message || 'File tidak bisa dibaca.');
    } finally {
      setReading(false);
    }
  };

  // Pasted text wins when it is typed after a file was read.
  const effective = useMemo(() => (pasted.trim() ? parseDelimited(pasted) : rows), [pasted, rows]);
  const { guests, issues, hasHeader } = useMemo(() => parseGuestRows(effective), [effective]);
  const skippedRows = Math.max(0, effective.length - (hasHeader ? 1 : 0) - guests.length);

  return (
    <Modal
      open={open}
      onClose={close}
      title="Impor daftar tamu"
      description="Dari file Excel (.xlsx), CSV, atau tempel langsung dari spreadsheet."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Batal
          </Button>
          <Button
            onClick={() => onImport(guests, skipDuplicates)}
            disabled={guests.length === 0}
            loading={busy}
          >
            Impor {guests.length || ''} tamu
          </Button>
        </>
      }
    >
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void take(e.dataTransfer.files[0]);
        }}
        className={`flex flex-col items-center gap-2 rounded-md border-2 border-dashed p-6 text-center transition-colors ${
          dragging ? 'border-primary bg-paper-2' : 'border-line'
        }`}
      >
        <FileSpreadsheet className="h-8 w-8 text-ink-soft" aria-hidden="true" />
        <p className="font-semibold">{source ? source : 'Tarik file Excel ke sini'}</p>
        <p className="text-sm text-ink-soft">
          {source ? `${effective.length} baris terbaca.` : `.xlsx, .csv · maksimal ${MAX_FILE_MB} MB · lembar pertama dipakai`}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="secondary" size="sm" loading={reading} onClick={() => input.current?.click()}>
            {source ? 'Pilih file lain' : 'Pilih file'}
          </Button>
          <Button variant="ghost" size="sm" onClick={downloadGuestTemplate}>
            <Download className="h-4 w-4" aria-hidden="true" /> Unduh template Excel
          </Button>
        </div>
        <input ref={input} type="file" hidden accept=".xlsx,.csv,.tsv,.txt" onChange={(e) => (void take(e.target.files?.[0]), (e.target.value = ''))} />
        {fileError && (
          <p role="alert" className="text-sm font-semibold text-no">
            {fileError}
          </p>
        )}
      </div>

      <div className="mt-4">
        <Field label="Atau tempel di sini" hint="Satu tamu per baris. Kolom: Nama, Kategori, Kursi, Telepon, Meja, Catatan, Instagram. Baris pertama boleh berisi judul kolom, urutannya bebas. Hanya nama yang wajib.">
          {(p) => (
            <Textarea
              {...p}
              rows={4}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              className="font-mono text-sm"
              placeholder={'Budi Santoso, VIP, 2, 0812-3456-7890, Meja A1\nSiti Aminah & Suami, Sahabat, 2'}
              spellCheck={false}
            />
          )}
        </Field>
      </div>

      {effective.length > 0 && (
        <div className="mt-4 text-sm" role="status" aria-live="polite">
          <p className={guests.length ? 'font-semibold text-ok' : 'font-semibold text-no'}>
            {guests.length ? `${guests.length} tamu terbaca` : 'Belum ada tamu yang terbaca. Pastikan kolom Nama terisi.'}
            {hasHeader ? ' · judul kolom dikenali' : ''}
            {skippedRows > 0 ? ` · ${skippedRows} baris tanpa nama dilewati` : ''}
          </p>
          {guests.length > 0 && (
            <div className="mt-2 overflow-x-auto rounded-sm border border-line">
              <table className="w-full min-w-[34rem] text-left text-[13px]">
                <thead className="bg-paper-2 text-ink-soft">
                  <tr>
                    {['Nama', 'Kategori', 'Kursi', 'Telepon', 'Meja'].map((h) => (
                      <th key={h} className="px-2.5 py-1.5 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {guests.slice(0, PREVIEW_ROWS).map((g, i) => (
                    <tr key={i}>
                      <td className="px-2.5 py-1.5">{g.name}</td>
                      <td className="px-2.5 py-1.5">{g.category}</td>
                      <td className="px-2.5 py-1.5">{g.pax}</td>
                      <td className="px-2.5 py-1.5">{g.phone || '–'}</td>
                      <td className="px-2.5 py-1.5">{g.tableNumber || '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {guests.length > PREVIEW_ROWS && <p className="border-t border-line px-2.5 py-1.5 text-ink-soft">dan {guests.length - PREVIEW_ROWS} tamu lain.</p>}
            </div>
          )}
          {issues.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-prada-ink">
              {issues.slice(0, 5).map((m) => (
                <li key={m}>{m}</li>
              ))}
              {issues.length > 5 && <li>dan {issues.length - 5} catatan lain.</li>}
            </ul>
          )}
        </div>
      )}

      <Checkbox
        className="mt-4"
        label="Lewati tamu yang sudah ada (nama dan nomor telepon sama)"
        checked={skipDuplicates}
        onChange={(e) => setSkipDuplicates(e.target.checked)}
      />
    </Modal>
  );
};
