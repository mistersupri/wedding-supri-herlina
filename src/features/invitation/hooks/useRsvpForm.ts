import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import { publicApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { readLocal, writeLocal } from '../../../lib/guestSession.js';
import { ATTENDANCE_LABEL } from '../../../lib/format.js';
import { useVoiceRecorder } from '../../../hooks/useVoiceRecorder.js';
import { useInvitation, useVerifiedGuest } from '../InvitationContext.js';
import { useGuestbook } from './useGuestbook.js';
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
  const maxPax = Math.max(guest.pax, 1);

  useEffect(() => {
    if (!existingWish) return;
    setAttendance(existingWish.attendanceStatus);
    setPaxState(existingWish.numberOfGuests);
  }, [existingWish]);

  const mutation = useMutation({
    mutationFn: publicApi.submitWish,
    onSuccess: (wish) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guestbook });
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.7 },
        colors: options.confettiColors || ['#B4862E', '#D6AD5B', '#F4ECDF', '#6E3B1E'],
        disableForReducedMotion: true,
      });
      if (editing) {
        writeLocal(editedKey(guest.name), true);
        setHasEdited(true);
        setEditing(false);
      }
      setMessage('');
      voice.clear();
      showPass({ attendance: wish.attendanceStatus, pax: wish.numberOfGuests });
    },
    onError: (err: Error) => setError(err.message),
  });

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    const base = {
      guestName: guest.name,
      relationship: guest.category || 'Tamu Undangan',
      attendanceStatus: attendance,
      numberOfGuests: pax,
    };
    if (editing && existingWish) {
      mutation.mutate({ ...base, message: existingWish.message, voiceUrl: existingWish.voiceUrl ?? null });
      return;
    }
    const voiceUrl = voice.status === 'idle' ? null : await voice.stop();
    if (!message.trim() && !voiceUrl) {
      setError('Tuliskan ucapan atau rekam pesan suara terlebih dahulu.');
      return;
    }
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
    error,
    submit,
    isPending: mutation.isPending,
    whatsappHref: existingWish && invitation.whatsappNumber ? whatsappUrl(invitation, existingWish) : undefined,
    showSentPass: () => existingWish && showPass({ attendance: existingWish.attendanceStatus, pax: existingWish.numberOfGuests }),
  };
}

export type RsvpForm = ReturnType<typeof useRsvpForm>;
