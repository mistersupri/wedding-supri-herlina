import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import { publicApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { readLocal, writeLocal } from '../../../lib/guestSession.js';
import { ATTENDANCE_LABEL } from '../../../lib/format.js';
import { useVoiceRecorder } from '../../../hooks/useVoiceRecorder.js';
import { useInvitation, useVerifiedGuest } from '../InvitationContext.js';
import { useGuestbook } from './useGuestbook.js';
import { isTransient, useWishQueue, wishQueue } from '../../../offline/wishQueue.instance.js';
import type { WishPayload } from '../../../offline/wishQueue.js';
import type { AttendanceStatus, GuestWish, InvitationData } from '@shared/types';

/** wa.me link filled from the couple's template ({nama_tamu}, {status_kehadiran}, {jumlah_tamu}, {ucapan}). */
function whatsappUrl(inv: InvitationData, wish: GuestWish) {
  const text = (inv.whatsappTemplate || 'Halo, saya {nama_tamu} mengonfirmasi {status_kehadiran}.')
    .replace(/{nama_tamu}/g, wish.guestName)
    .replace(/{status_kehadiran}/g, ATTENDANCE_LABEL[wish.attendanceStatus])
    .replace(/{jumlah_tamu}/g, String(wish.numberOfGuests))
    .replace(/{ucapan}/g, wish.message);
  return `https://wa.me/${inv.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
}

const editedKey = (name: string) => `wedding_rsvp_edited_${name.trim().toLowerCase()}`;

/**
 * One RSVP per invited guest. After sending, the guest may change attendance and seats once;
 * the message itself stays as sent. Templates render this state however they like.
 */
export function useRsvpForm(options: { confettiColors?: string[] } = {}) {
  const { invitation, showPass } = useInvitation();
  const guest = useVerifiedGuest();
  const { existingWish } = useGuestbook();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [hasEdited, setHasEdited] = useState(() => readLocal(editedKey(guest.name), false));
  const [attendance, setAttendance] = useState<AttendanceStatus>(existingWish?.attendanceStatus || 'HADIR');
  const [pax, setPaxState] = useState(existingWish?.numberOfGuests || guest.pax || 1);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const voice = useVoiceRecorder(setMessage);
  const queue = useWishQueue(guest.slug);
  // What the last attempt was carrying, so a lost connection can park it in the queue instead of losing it.
  const attempt = useRef<{ blob: Blob | null; editing: boolean } | null>(null);
  const maxPax = Math.max(guest.pax, 1);

  useEffect(() => {
    if (!existingWish) return;
    setAttendance(existingWish.attendanceStatus);
    setPaxState(existingWish.numberOfGuests);
  }, [existingWish]);

  const celebrate = () =>
    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.7 },
      colors: options.confettiColors || ['#B4862E', '#D6AD5B', '#F4ECDF', '#6E3B1E'],
      disableForReducedMotion: true,
    });

  /** The wish reached the server: either straight away, or later from the queue. */
  const markSent = (wish: GuestWish, wasEditing: boolean) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.guestbook });
    celebrate();
    if (wasEditing) {
      writeLocal(editedKey(guest.name), true);
      setHasEdited(true);
      setEditing(false);
    }
    setMessage('');
    voice.clear();
    showPass({ attendance: wish.attendanceStatus, pax: wish.numberOfGuests });
  };

  // A wish saved while offline goes out later; when it does, the guest gets the same finish as an immediate send.
  useEffect(
    () =>
      wishQueue.onSent((item, wish) => {
        if (item.slug === guest.slug) markSent(wish, item.editing);
      }),
    // markSent only reads state setters and stable refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [guest.slug],
  );

  /** Keeps a wish that could not be sent for lack of signal; it is sent when the connection returns. */
  const park = (wish: WishPayload, blob: Blob | null, wasEditing: boolean) => {
    void wishQueue.enqueue({ slug: guest.slug, wish, voice: blob ?? undefined, editing: wasEditing });
    setEditing(false);
    setMessage('');
    voice.clear();
    setError(null);
    void wishQueue.flush();
  };

  const mutation = useMutation({
    mutationFn: publicApi.submitWish,
    onSuccess: (wish) => markSent(wish, Boolean(attempt.current?.editing)),
    onError: (err: Error, wish) => {
      if (isTransient(err)) park(wish, attempt.current?.blob ?? null, Boolean(attempt.current?.editing));
      else setError(err.message);
    },
  });

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    const base = {
      guestSlug: guest.slug,
      guestName: guest.name,
      relationship: guest.category || 'Tamu Undangan',
      attendanceStatus: attendance,
      numberOfGuests: pax,
    };
    if (editing && existingWish) {
      attempt.current = { blob: null, editing: true };
      mutation.mutate({ ...base, message: existingWish.message, voiceUrl: existingWish.voiceUrl ?? null });
      return;
    }
    let voiceUrl: string | null = null;
    let blob: Blob | null = null;
    if (voice.status !== 'idle') {
      blob = await voice.recordedBlob();
      if (blob) {
        try {
          voiceUrl = await voice.upload(blob);
        } catch (err) {
          // No signal for the upload: keep the wish and the recording, and send both later.
          if (isTransient(err) && (message.trim() || blob)) return park({ ...base, message: message.trim(), voiceUrl: null }, blob, false);
          setError((err as Error).message || 'Pesan suara belum terunggah. Periksa sinyal, lalu coba kirim lagi.');
          return;
        }
      }
    }
    if (!message.trim() && !voiceUrl) {
      setError('Tuliskan ucapan atau rekam pesan suara terlebih dahulu.');
      return;
    }
    attempt.current = { blob, editing: false };
    mutation.mutate({ ...base, message: message.trim(), voiceUrl });
  };

  return {
    guest,
    existingWish,
    /** The summary shows when a wish exists and the guest is not changing it. */
    isSent: Boolean(existingWish) && !editing,
    editing,
    canEdit: !hasEdited,
    startEditing: () => setEditing(true),
    cancelEditing: () => setEditing(false),
    attendance,
    setAttendance,
    pax,
    maxPax,
    setPax: (n: number) => setPaxState(Math.min(maxPax, Math.max(1, n))),
    message,
    setMessage: (text: string) => {
      setMessage(text);
      setError(null);
    },
    voice,
    error: error ?? queue.failed,
    /** Saved on this phone while there is no signal; it is sent on its own when the connection returns. */
    queued: queue.pending,
    sendQueuedNow: queue.sendNow,
    cancelQueued: queue.cancel,
    isSending: queue.flushing,
    submit,
    isPending: mutation.isPending,
    whatsappHref: existingWish && invitation.whatsappNumber ? whatsappUrl(invitation, existingWish) : undefined,
    showSentPass: () => existingWish && showPass({ attendance: existingWish.attendanceStatus, pax: existingWish.numberOfGuests }),
  };
}

export type RsvpForm = ReturnType<typeof useRsvpForm>;
