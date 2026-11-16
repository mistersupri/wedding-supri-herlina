/** Cells that spreadsheets would run as formulas; a leading apostrophe makes them plain text. */
const FORMULA_START = /^[=+\-@\t\r]/;

export type CsvCell = string | number | boolean | null | undefined;

function cell(value: CsvCell): string {
  if (value === null || value === undefined) return '';
  let text = typeof value === 'boolean' ? (value ? 'Ya' : 'Tidak') : String(value);
  // Guest-typed text must never become a formula (CSV injection). Plain numbers are left alone.
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** RFC 4180 CSV with a UTF-8 byte-order mark, so Excel opens accented names correctly. */
export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(cell).join(','));
  return `﻿${lines.join('\r\n')}\r\n`;
}

/** Phone numbers keep digits, spaces and dashes only, and lose a leading "+", so no cell starts with a formula character. */
export const phoneCell = (raw: string | undefined | null) => (raw || '').replace(/[^0-9 -]/g, '').trim();
