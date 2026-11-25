/**
 * Just enough of .xlsx for guest lists, without a library: read the first sheet as text cells, and write a
 * one-sheet workbook. An .xlsx is a zip of XML files; inflating uses the browser's DecompressionStream.
 */

const td = new TextDecoder();
const te = new TextEncoder();

const u16 = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const u32 = (b: Uint8Array, o: number) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Files of a zip by name. Supports stored and deflated entries, which is what spreadsheet programs write. */
async function unzip(bytes: Uint8Array): Promise<Map<string, Uint8Array>> {
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i--) {
    if (u32(bytes, i) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error('Berkas ini bukan file Excel (.xlsx) yang valid.');
  const count = u16(bytes, end + 10);
  let p = u32(bytes, end + 16);
  const files = new Map<string, Uint8Array>();
  for (let n = 0; n < count; n++) {
    if (u32(bytes, p) !== 0x02014b50) break;
    const method = u16(bytes, p + 10);
    const size = u32(bytes, p + 20);
    const nameLen = u16(bytes, p + 28);
    const extraLen = u16(bytes, p + 30);
    const commentLen = u16(bytes, p + 32);
    const local = u32(bytes, p + 42);
    const name = td.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (!/\.(xml|rels)$/.test(name)) continue;
    const start = local + 30 + u16(bytes, local + 26) + u16(bytes, local + 28);
    const raw = bytes.subarray(start, start + size);
    files.set(name, method === 0 ? raw : await inflateRaw(raw));
  }
  return files;
}

const xml = (data: Uint8Array | undefined) => (data ? new DOMParser().parseFromString(td.decode(data), 'application/xml') : null);
const colIndex = (ref: string) => {
  let n = 0;
  for (const ch of ref.replace(/[^A-Z]/gi, '').toUpperCase()) n = n * 26 + ch.charCodeAt(0) - 64;
  return n - 1;
};

/** Rows of the first worksheet as strings. Empty cells are empty strings; trailing empty rows are dropped. */
export async function readXlsx(buffer: ArrayBuffer): Promise<string[][]> {
  const files = await unzip(new Uint8Array(buffer));
  const shared: string[] = [];
  const sst = xml(files.get('xl/sharedStrings.xml'));
  sst?.querySelectorAll('si').forEach((si) => {
    shared.push([...si.querySelectorAll('t')].map((t) => t.textContent ?? '').join(''));
  });

  // The first sheet in workbook order; sheet1.xml when the workbook cannot be read.
  let sheetPath = 'xl/worksheets/sheet1.xml';
  const workbook = xml(files.get('xl/workbook.xml'));
  const rels = xml(files.get('xl/_rels/workbook.xml.rels'));
  const first = workbook?.querySelector('sheets > sheet');
  const rid = first?.getAttribute('r:id') ?? first?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
  const target = rid && [...(rels?.querySelectorAll('Relationship') ?? [])].find((r) => r.getAttribute('Id') === rid)?.getAttribute('Target');
  if (target) sheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
  const sheet = xml(files.get(sheetPath));
  if (!sheet) throw new Error('Lembar kerja pertama tidak ditemukan di file ini.');

  const rows: string[][] = [];
  sheet.querySelectorAll('sheetData > row').forEach((row) => {
    const out: string[] = [];
    let next = 0;
    row.querySelectorAll(':scope > c').forEach((c) => {
      const at = c.getAttribute('r') ? colIndex(c.getAttribute('r')!) : next;
      const type = c.getAttribute('t');
      const v = c.querySelector(':scope > v')?.textContent ?? '';
      let value = v;
      if (type === 's') value = shared[Number(v)] ?? '';
      else if (type === 'inlineStr') value = [...c.querySelectorAll('t')].map((t) => t.textContent ?? '').join('');
      else if (type === 'b') value = v === '1' ? 'ya' : 'tidak';
      while (out.length < at) out.push('');
      out[at] = value.trim();
      next = at + 1;
    });
    rows[Number(row.getAttribute('r') ?? rows.length + 1) - 1] = out;
  });
  const dense = Array.from(rows, (r) => r ?? []);
  while (dense.length && dense[dense.length - 1].every((c) => !c)) dense.pop();
  return dense;
}

/** Cells of a CSV / tab-separated text (quotes and doubled quotes supported). The delimiter is detected from the first line. */
export function parseDelimited(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');
  const head = clean.split('\n', 1)[0] ?? '';
  const delimiter = head.includes('\t') ? '\t' : (head.match(/;/g)?.length ?? 0) > (head.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  row.push(cell.trim());
  if (row.some(Boolean) || cell) rows.push(row);
  return rows.filter((r) => r.some(Boolean));
}

// --- Writing ---

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (b: Uint8Array) => {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function zipStore(files: [string, string][]): Uint8Array {
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const w = (n: number, bytes: number) => Uint8Array.from({ length: bytes }, (_, i) => (n >>> (8 * i)) & 0xff);
  const cat = (...a: Uint8Array[]) => {
    const out = new Uint8Array(a.reduce((s, x) => s + x.length, 0));
    let o = 0;
    for (const x of a) {
      out.set(x, o);
      o += x.length;
    }
    return out;
  };
  for (const [name, content] of files) {
    const n = te.encode(name);
    const data = te.encode(content);
    const crc = crc32(data);
    const local = cat(w(0x04034b50, 4), w(20, 2), w(0x0800, 2), w(0, 2), w(0, 2), w(0x21, 2), w(crc, 4), w(data.length, 4), w(data.length, 4), w(n.length, 2), w(0, 2), n, data);
    central.push(cat(w(0x02014b50, 4), w(20, 2), w(20, 2), w(0x0800, 2), w(0, 2), w(0, 2), w(0x21, 2), w(crc, 4), w(data.length, 4), w(data.length, 4), w(n.length, 2), w(0, 2), w(0, 2), w(0, 2), w(0, 2), w(0, 4), w(offset, 4), n));
    parts.push(local);
    offset += local.length;
  }
  const dir = cat(...central);
  return cat(...parts, dir, w(0x06054b50, 4), w(0, 2), w(0, 2), w(files.length, 2), w(files.length, 2), w(dir.length, 4), w(offset, 4), w(0, 2));
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const colName = (i: number) => (i >= 26 ? colName(Math.floor(i / 26) - 1) : '') + String.fromCharCode(65 + (i % 26));

/** A one-sheet workbook. Every cell is text (phone numbers keep their leading zero); the first row is bold. */
export function buildXlsx(rows: string[][], sheetName = 'Tamu', widths: number[] = []): Blob {
  const sheetRows = rows
    .map(
      (r, ri) =>
        `<row r="${ri + 1}">${r
          .map((v, ci) => `<c r="${colName(ci)}${ri + 1}" t="inlineStr"${ri === 0 ? ' s="1"' : ''}><is><t xml:space="preserve">${esc(v)}</t></is></c>`)
          .join('')}</row>`,
    )
    .join('');
  const cols = widths.length ? `<cols>${widths.map((wd, i) => `<col min="${i + 1}" max="${i + 1}" width="${wd}" customWidth="1"/>`).join('')}</cols>` : '';
  const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const bytes = zipStore([
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
    ['xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${NS}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="49" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`],
    ['xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${NS}">${cols}<sheetData>${sheetRows}</sheetData></worksheet>`],
  ]);
  return new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
