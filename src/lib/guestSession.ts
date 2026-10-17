import type { PublicGuest } from '@shared/types';

const STORAGE_KEY = 'wedding_verified_guest';

/** Reads ?to= (display name) and ?c= (4-char code) from the invitation link. */
export function readInvitationParams() {
  const params = new URLSearchParams(window.location.search);
  const name = params.get('to') || params.get('guest') || params.get('nama') || '';
  const code = (params.get('c') || params.get('code') || params.get('slug') || params.get('u') || '').trim().toUpperCase();
  return { name: name.trim(), code: code.length === 4 ? code : '' };
}

export function loadStoredGuest(): PublicGuest | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return parsed?.slug ? (parsed as PublicGuest) : null;
  } catch {
    return null;
  }
}

export function storeGuest(guest: PublicGuest) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(guest));
  } catch {
    // Without storage the guest re-enters the code next visit; the link still carries it.
  }
}

/** Puts the verified guest into the address bar so a refresh or shared link keeps the access. */
export function writeInvitationParams(guest: PublicGuest) {
  const url = new URL(window.location.href);
  url.searchParams.set('to', guest.name);
  url.searchParams.set('c', guest.slug);
  window.history.replaceState({}, '', url.toString());
}

/** Small JSON-in-localStorage helpers for per-device memory (reactions, own photos, RSVP sent). */
export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Per-device convenience only.
  }
}
