import { PassThrough } from 'stream';
import { crc32 } from 'zlib';
import { describe, expect, it } from 'vitest';
import { safeSegment, writeZip } from '../../server/http/zip.js';

async function build(entries: Parameters<typeof writeZip>[1]) {
  const sink = new PassThrough();
  const chunks: Buffer[] = [];
  sink.on('data', (c: Buffer) => chunks.push(c));
  await writeZip(sink, entries);
  return Buffer.concat(chunks);
}

/** Reads the archive back through its central directory, the way unzip tools do. */
function readZip(zip: Buffer) {
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = zip.readUInt16LE(end + 10);
  let p = zip.readUInt32LE(end + 16);
  const files: Record<string, { data: Buffer; crcOk: boolean }> = {};
  for (let i = 0; i < count; i++) {
    expect(zip.readUInt32LE(p)).toBe(0x02014b50);
    const crc = zip.readUInt32LE(p + 16);
    const size = zip.readUInt32LE(p + 24);
    const nameLen = zip.readUInt16LE(p + 28);
    const local = zip.readUInt32LE(p + 42);
    const name = zip.toString('utf8', p + 46, p + 46 + nameLen);
    const dataStart = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const data = zip.subarray(dataStart, dataStart + size);
    files[name] = { data, crcOk: crc32(data) === crc };
    p += 46 + nameLen;
  }
  return files;
}

describe('writeZip', () => {
  it('round-trips in-memory entries with correct checksums and UTF-8 names', async () => {
    const zip = await build([
      { name: 'daftar.csv', data: Buffer.from('a,b\r\n1,2\r\n') },
      { name: 'Siti Aminah/01.jpg', data: Buffer.from([1, 2, 3, 4, 5]) },
      { name: 'Ñandú/é.txt', data: Buffer.from('héllo') },
    ]);
    const files = readZip(zip);
    expect(Object.keys(files)).toEqual(['daftar.csv', 'Siti Aminah/01.jpg', 'Ñandú/é.txt']);
    expect(files['daftar.csv'].data.toString()).toBe('a,b\r\n1,2\r\n');
    expect(files['Ñandú/é.txt'].data.toString()).toBe('héllo');
    expect(Object.values(files).every((f) => f.crcOk)).toBe(true);
  });

  it('writes a valid empty archive', async () => {
    const zip = await build([]);
    expect(zip.length).toBe(22);
    expect(zip.readUInt16LE(10)).toBe(0);
  });
});

describe('safeSegment', () => {
  it('removes characters that break paths', () => {
    expect(safeSegment('Bu: Siti/Ayu')).toBe('Bu Siti Ayu');
    expect(safeSegment('..')).toBe('tamu');
    expect(safeSegment('a\\b*c?')).toBe('a b c');
  });
});
