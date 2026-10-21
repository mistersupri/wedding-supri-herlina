import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { coupleNames } from '../../lib/format.js';
import { useAuth } from '../../context/AuthContext.js';
import { GuestPassModal } from '../../components/wedding/GuestPassModal.js';
import { useGuestAccess } from './hooks/useGuestAccess.js';
import type { AttendanceStatus, GuestAccessVerification, InvitationData, PublicGuest } from '@shared/types';

export type RsvpSummary = { attendance: AttendanceStatus; pax: number };

interface InvitationContextValue {
  invitation: InvitationData;
  /** "Arya & Nadhira" */
  names: string;
  guest: PublicGuest | null;
  isCheckingGuest: boolean;
  displayName: string;
  unlock: (code: string) => Promise<GuestAccessVerification>;
  /** The cover has been opened. Templates show their body (and music starts) after this. */
  isOpen: boolean;
  open: () => void;
  showPass: (rsvp?: RsvpSummary | null) => void;
  /** The guest camera page, when the couple's rule lets this visitor in. */
  photoMomentsHref?: string;
  isAdmin: boolean;
  music: { available: boolean; playing: boolean; title: string; toggle: () => void };
}

/** The camera link, shown only to guests the couple's rule lets in (checked in, invited, or anyone). */
function cameraHref(invitation: InvitationData, guest: PublicGuest | null) {
  const rule = invitation.photoMoments;
  if (rule && !rule.cameraOpen) return undefined;
  const access = rule?.access ?? 'CHECKED_IN';
  if (guest && (access !== 'CHECKED_IN' || guest.isCheckedIn)) return `/photo-moments?c=${guest.slug}&to=${encodeURIComponent(guest.name)}`;
  return access === 'ANYONE' ? '/photo-moments' : undefined;
}

const InvitationContext = createContext<InvitationContextValue | null>(null);

export function useInvitation() {
  const ctx = useContext(InvitationContext);
  if (!ctx) throw new Error('useInvitation must be used inside <InvitationProvider>.');
  return ctx;
}

/** Same as useInvitation, for parts that only render once a guest is verified. */
export function useVerifiedGuest() {
  const { guest } = useInvitation();
  if (!guest) throw new Error('useVerifiedGuest needs a verified guest.');
  return guest;
}

/**
 * Everything a template needs to render one invitation: the data, who is reading,
 * the cover state, the guest pass and background music. Templates only read from here.
 */
export const InvitationProvider: React.FC<{ invitation: InvitationData; children: React.ReactNode }> = ({ invitation, children }) => {
  const { isAuthenticated } = useAuth();
  const access = useGuestAccess();
  const [isOpen, setIsOpen] = useState(false);
  const [pass, setPass] = useState<{ open: boolean; rsvp: RsvpSummary | null }>({ open: false, rsvp: null });
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const names = coupleNames(invitation);

  useEffect(() => {
    document.title = `Pernikahan ${names}`;
  }, [names]);

  // Opening the cover is the user gesture browsers require before audio may play.
  const open = useCallback(() => {
    setIsOpen(true);
    audioRef.current?.play().catch(() => undefined);
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => undefined);
    else audio.pause();
  }, []);

  const { guest } = access;
  const value = useMemo<InvitationContextValue>(
    () => ({
      invitation,
      names,
      guest,
      isCheckingGuest: access.isChecking,
      displayName: access.displayName,
      unlock: access.unlock,
      isOpen,
      open,
      showPass: (rsvp = null) => setPass({ open: true, rsvp }),
      photoMomentsHref: cameraHref(invitation, guest),
      isAdmin: isAuthenticated,
      music: { available: Boolean(invitation.musicUrl), playing, title: invitation.musicTitle, toggle },
    }),
    [invitation, names, guest, access.isChecking, access.displayName, access.unlock, isOpen, open, isAuthenticated, playing, toggle],
  );

  return (
    <InvitationContext.Provider value={value}>
      {children}
      {invitation.musicUrl && (
        <audio
          ref={audioRef}
          src={invitation.musicUrl}
          loop
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
      )}
      {guest && (
        <GuestPassModal
          open={pass.open}
          onClose={() => setPass((p) => ({ ...p, open: false }))}
          guest={guest}
          coupleNames={names}
          rsvp={pass.rsvp}
        />
      )}
    </InvitationContext.Provider>
  );
};
