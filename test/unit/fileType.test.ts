import { describe, expect, it } from 'vitest';
import { detectType } from '../../server/http/fileType.js';

const bytes = (...b: number[]) => Buffer.from([...b, ...new Array(Math.max(0, 16 - b.length)).fill(0)]);
const ascii = (text: string, at = 0) => {
  const b = Buffer.alloc(16);
  b.write(text, at, 'latin1');
  return b;
};

describe('detectType', () => {
  it('recognises common images', () => {
    expect(detectType(bytes(0xff, 0xd8, 0xff, 0xe0))).toMatchObject({ kind: 'image', ext: 'jpg' });
    expect(detectType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toMatchObject({ kind: 'image', ext: 'png' });
    expect(detectType(ascii('GIF89a'))).toMatchObject({ kind: 'image', ext: 'gif' });
    const webp = ascii('RIFF');
    webp.write('WEBP', 8, 'latin1');
    expect(detectType(webp)).toMatchObject({ kind: 'image', ext: 'webp' });
  });

  it('recognises audio and video containers', () => {
    expect(detectType(bytes(0x1a, 0x45, 0xdf, 0xa3))).toMatchObject({ ext: 'webm' });
    expect(detectType(ascii('ID3'))).toMatchObject({ kind: 'audio', ext: 'mp3' });
    expect(detectType(ascii('OggS'))).toMatchObject({ kind: 'audio', ext: 'ogg' });
    const mp4 = Buffer.alloc(16);
    mp4.write('ftyp', 4, 'latin1');
    mp4.write('isom', 8, 'latin1');
    expect(detectType(mp4)).toMatchObject({ kind: 'video', ext: 'mp4' });
  });

  it('rejects pages, scripts, SVG and unknown data, whatever they claim to be', () => {
    expect(detectType(Buffer.from('<html><script>alert(1)</script>'))).toBeNull();
    expect(detectType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(detectType(Buffer.from('#!/bin/sh\necho hi\n          '))).toBeNull();
    expect(detectType(Buffer.from('short'))).toBeNull();
  });
});
