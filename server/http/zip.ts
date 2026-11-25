import fs from 'fs';
import type { Writable } from 'stream';
import { once } from 'events';

/** A file on disk, or an in-memory file, to place in the archive under `name`. */
export type ZipEntry = { name: string; path: string } | { name: string; data: Buffer };

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

const crcUpdate = (crc: number, chunk: Uint8Array) => {
  let c = crc;
  for (let i = 0; i < chunk.length; i++) c = CRC_TABLE[(c ^ chunk[i]) & 0xff] ^ (c >>> 8);
  return c >>> 0;
};

async function crcOfFile(path: string) {
  let crc = 0xffffffff;
  for await (const chunk of fs.createReadStream(path)) crc = crcUpdate(crc, chunk as Buffer);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const day = ((Math.max(date.getFullYear(), 1980) - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

interface Prepared {
  name: Buffer;
  size: number;
  crc: number;
  offset: number;
  source: { path: string } | { data: Buffer };
}

export class ZipTooLargeError extends Error {}

/**
 * Streams a ZIP (no compression: photos are already compressed) without holding the files in memory.
 * Sizes and checksums are computed first, so every entry carries its real header and any unzip tool can read it.
 * Plain ZIP only: more than 65,535 files or 4 GB throws ZipTooLargeError before anything is sent.
 */
export async function writeZip(out: Writable, entries: ZipEntry[], modified = new Date()) {
  const { time, day } = dosDateTime(modified);
  const prepared: Prepared[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const isFile = 'path' in entry;
    const size = isFile ? (await fs.promises.stat(entry.path)).size : entry.data.length;
    const crc = isFile ? await crcOfFile(entry.path) : (crcUpdate(0xffffffff, entry.data) ^ 0xffffffff) >>> 0;
    prepared.push({ name, size, crc, offset, source: isFile ? { path: entry.path } : { data: entry.data } });
    offset += 30 + name.length + size;
  }
  if (prepared.length > 65_535 || offset > 0xffff_ffff - 1_000_000) throw new ZipTooLargeError('Arsip terlalu besar untuk satu ZIP.');

  const write = async (chunk: Buffer) => {
    if (!out.write(chunk)) await once(out, 'drain');
  };

  for (const p of prepared) {
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x0800, 6); // UTF-8 names
    header.writeUInt16LE(0, 8); // stored
    header.writeUInt16LE(time, 10);
    header.writeUInt16LE(day, 12);
    header.writeUInt32LE(p.crc, 14);
    header.writeUInt32LE(p.size, 18);
    header.writeUInt32LE(p.size, 22);
    header.writeUInt16LE(p.name.length, 26);
    await write(header);
    await write(p.name);
    if ('data' in p.source) await write(p.source.data);
    else for await (const chunk of fs.createReadStream(p.source.path)) await write(chunk as Buffer);
  }

  const centralStart = offset;
  let centralSize = 0;
  for (const p of prepared) {
    const rec = Buffer.alloc(46);
    rec.writeUInt32LE(0x02014b50, 0);
    rec.writeUInt16LE(20, 4);
    rec.writeUInt16LE(20, 6);
    rec.writeUInt16LE(0x0800, 8);
    rec.writeUInt16LE(0, 10);
    rec.writeUInt16LE(time, 12);
    rec.writeUInt16LE(day, 14);
    rec.writeUInt32LE(p.crc, 16);
    rec.writeUInt32LE(p.size, 20);
    rec.writeUInt32LE(p.size, 24);
    rec.writeUInt16LE(p.name.length, 28);
    rec.writeUInt32LE(p.offset, 42);
    await write(rec);
    await write(p.name);
    centralSize += 46 + p.name.length;
  }

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(prepared.length, 8);
  end.writeUInt16LE(prepared.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralStart, 16);
  await write(end);
  out.end();
}

/** A name safe as one path segment in an archive, on every operating system. */
export const safeSegment = (text: string, max = 60) =>
  text
    .normalize('NFC')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[. ]+|[. ]+$/g, '')
    .slice(0, max) || 'tamu';
