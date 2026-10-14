import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquareHeart,
  Send,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Users,
  MessageCircle,
  Sparkles,
  Search,
  Filter,
  HeartHandshake,
  CornerDownRight,
  QrCode,
  Mic,
  MicOff,
  Volume2,
  Trash2,
  Edit3,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useTheme } from '../../context/ThemeContext.js';
import { AttendanceStatus, GuestWish, InvitationData, InvitedGuest } from '../../types.js';
import { fetchGuestWishes, submitGuestWish, submitWhatsappRSVP } from '../../lib/api.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { RSVPConfirmationPassModal } from './RSVPConfirmationPassModal.js';

interface GuestbookSectionProps {
  invitation: InvitationData;
  isUnlocked?: boolean;
  verifiedGuest?: InvitedGuest | null;
}

export const GuestbookSection: React.FC<GuestbookSectionProps> = ({
  invitation,
  isUnlocked = true,
  onUnlockCode,
  verifiedGuest,
}) => {
  const { styles } = useTheme();
  const queryClient = useQueryClient();

  const [guestName, setGuestName] = useState(verifiedGuest?.name || '');
  const [relationship, setRelationship] = useState(verifiedGuest?.category || 'Sahabat');
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>('HADIR');
  const [numberOfGuests, setNumberOfGuests] = useState<number>(verifiedGuest?.pax || 1);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [showRSVPass, setShowRSVPass] = useState<boolean>(false);
  const [submittedRSVData, setSubmittedRSVData] = useState<{ id?: string; name: string; attendance: AttendanceStatus; pax: number; relationship: string; code?: string } | null>(null);

  // Voice Note and Speech-to-Text states
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [voiceBase64, setVoiceBase64] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recognition, setRecognition] = useState<any>(null);

  const chunksRef = useRef<Blob[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const startRecording = async () => {
    try {
      chunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          setVoiceBase64(reader.result as string);
        };
      };

      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        const recog = new SpeechRecognitionClass();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = 'id-ID';

        recog.onresult = (event: any) => {
          let currentFullTranscript = '';
          for (let i = 0; i < event.results.length; ++i) {
            currentFullTranscript += event.results[i][0].transcript;
          }

          if (currentFullTranscript.trim()) {
            setMessage(currentFullTranscript.trim());
          }
        };

        recog.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
        };

        recog.onend = () => {
          setIsTranscribing(false);
        };

        recog.start();
        setRecognition(recog);
        setIsTranscribing(true);
      }

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setSuccessToast('⚠️ Gagal mengakses mikrofon. Silakan berikan izin mikrofon.');
      setTimeout(() => setSuccessToast(null), 4000);
    }
  };

  const stopRecordingAndGetBase64 = (): Promise<string | null> => {
    return new Promise((resolve) => {
      const activeRecorder = recorderRef.current || mediaRecorder;
      if (!activeRecorder || activeRecorder.state === 'inactive') {
        resolve(voiceBase64);
        return;
      }

      activeRecorder.onstop = () => {
        const mimeType = activeRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const b64 = reader.result as string;
          setVoiceBase64(b64);
          resolve(b64);
        };
        reader.onerror = () => resolve(null);
      };

      activeRecorder.stop();
      activeRecorder.stream.getTracks().forEach((track) => track.stop());
      if (recognition) {
        try { recognition.stop(); } catch (e) {}
      }
      setIsRecording(false);
      setIsTranscribing(false);
    });
  };

  const stopRecording = () => {
    stopRecordingAndGetBase64();
  };

  const clearVoiceNote = () => {
    if (isRecording) {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try { recorderRef.current.stop(); } catch (e) {}
        try { recorderRef.current.stream.getTracks().forEach((track) => track.stop()); } catch (e) {}
      }
      if (recognition) {
        try { recognition.stop(); } catch (e) {}
      }
      setIsRecording(false);
      setIsTranscribing(false);
    }
    setAudioUrl(null);
    setVoiceBase64(null);
    setMessage('');
    setSuccessToast('Rekaman suara dihapus & dibatalkan. Input ucapan telah dibuka kembali.');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Sync if verifiedGuest changes
  React.useEffect(() => {
    if (verifiedGuest) {
      if (verifiedGuest.name) setGuestName(verifiedGuest.name);
      if (verifiedGuest.category) setRelationship(verifiedGuest.category);
      if (verifiedGuest.pax) setNumberOfGuests(verifiedGuest.pax);
    }
  }, [verifiedGuest]);

  // Track 1 RSVP per guest & 1-time edit limit
  const [isEditingRSVP, setIsEditingRSVP] = useState<boolean>(false);
  const [hasAlreadySubmitted, setHasAlreadySubmitted] = useState<boolean>(() => {
    const initialName = verifiedGuest?.name || '';
    if (!initialName) return false;
    return localStorage.getItem(`wedding_rsvp_${initialName.toLowerCase().trim()}`) === 'true';
  });

  const [hasAlreadyEdited, setHasAlreadyEdited] = useState<boolean>(() => {
    const initialName = verifiedGuest?.name || '';
    if (!initialName) return false;
    return localStorage.getItem(`wedding_rsvp_edited_${initialName.toLowerCase().trim()}`) === 'true';
  });

  React.useEffect(() => {
    if (guestName.trim()) {
      const stored = localStorage.getItem(`wedding_rsvp_${guestName.toLowerCase().trim()}`);
      if (stored === 'true') {
        setHasAlreadySubmitted(true);
      }
      const storedEdited = localStorage.getItem(`wedding_rsvp_edited_${guestName.toLowerCase().trim()}`);
      if (storedEdited === 'true') {
        setHasAlreadyEdited(true);
      }
    }
  }, [guestName]);

  // TanStack Query for Guestbook Wishes
  const { data: wishesData, isLoading } = useQuery({
    queryKey: ['guestWishes'],
    queryFn: fetchGuestWishes,
  });

  const wishes = wishesData?.data || [];
  const stats = wishesData?.stats || {
    totalWishes: 0,
    attendingCount: 0,
    declinedCount: 0,
    tentativeCount: 0,
    totalGuestSeats: 0,
  };

  // Find guest's existing wish if submitted
  const existingWish = React.useMemo(() => {
    if (!guestName.trim()) return null;
    return wishes.find((w) => w.guestName.toLowerCase().trim() === guestName.toLowerCase().trim()) || null;
  }, [wishes, guestName]);

  // Sync existing wish data to form fields when editing starts
  React.useEffect(() => {
    if (existingWish) {
      if (!hasAlreadySubmitted) setHasAlreadySubmitted(true);
      if (isEditingRSVP) {
        setAttendanceStatus(existingWish.attendanceStatus);
        setNumberOfGuests(existingWish.numberOfGuests);
      }
    }
  }, [existingWish, isEditingRSVP, hasAlreadySubmitted]);

  // Form is locked if submitted/existing wish exists, UNLESS user actively enters edit mode
  const isFormLockedForDuplicate = (hasAlreadySubmitted || Boolean(existingWish)) && !isEditingRSVP;

  // TanStack Mutation for Submitting Guestbook
  const guestbookMutation = useMutation({
    mutationFn: submitGuestWish,
    onSuccess: (data: GuestWish) => {
      queryClient.invalidateQueries({ queryKey: ['guestWishes'] });
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#C48B7F', '#E8D4CE', '#FFD700', '#7D967B'],
      });

      if (isEditingRSVP) {
        setSuccessToast('Konfirmasi kehadiran Anda telah diperbarui (Batas 1 kali perubahan telah digunakan).');
        if (data.guestName) {
          localStorage.setItem(`wedding_rsvp_edited_${data.guestName.toLowerCase().trim()}`, 'true');
          setHasAlreadyEdited(true);
        }
        setIsEditingRSVP(false);
      } else {
        setSuccessToast('Doa restu & ucapan Anda berhasil dikirimkan. Terima kasih!');
        if (data.guestName) {
          localStorage.setItem(`wedding_rsvp_${data.guestName.toLowerCase().trim()}`, 'true');
          setHasAlreadySubmitted(true);
        }
        // Store the submitted details to display in the QR Pass modal
        setSubmittedRSVData({
          id: data.id,
          name: data.guestName,
          attendance: data.attendanceStatus,
          pax: data.numberOfGuests,
          relationship: data.relationship,
          code: verifiedGuest?.slug || `RSVP-${data.id.substring(0, 4).toUpperCase()}`
        });
        setShowRSVPass(true);
      }

      setMessage('');
      setAudioUrl(null);
      setVoiceBase64(null);
      setTimeout(() => setSuccessToast(null), 5000);
    },
  });

  // TanStack Mutation for Direct WhatsApp RSVP
  const whatsappMutation = useMutation({
    mutationFn: submitWhatsappRSVP,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['guestWishes'] });
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 },
      });
      window.open(res.whatsappUrl, '_blank');
      setSuccessToast('Membuka WhatsApp untuk konfirmasi langsung...');
      setTimeout(() => setSuccessToast(null), 4000);
    },
  });

  const handlePreviewQR = () => {
    if (!guestName.trim()) {
      setSuccessToast('⚠️ Mohon isi nama Anda terlebih dahulu untuk membuat QR Code.');
      setTimeout(() => setSuccessToast(null), 4000);
      return;
    }
    setSubmittedRSVData({
      name: guestName,
      attendance: attendanceStatus,
      pax: numberOfGuests,
      relationship: relationship,
      code: verifiedGuest?.slug || 'RSVP-PREVIEW'
    });
    setShowRSVPass(true);
  };

  const handleSubmitNormal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      setSuccessToast('⚠️ Mohon lengkapi nama Anda terlebih dahulu.');
      setTimeout(() => setSuccessToast(null), 4000);
      return;
    }

    if (isEditingRSVP) {
      // In edit mode: ONLY change attendance and pax; keep existing message and voice
      guestbookMutation.mutate({
        guestName,
        relationship,
        attendanceStatus,
        numberOfGuests,
        message: existingWish?.message || message.trim() || 'Selamat untuk kedua mempelai!',
        voiceUrl: existingWish?.voiceUrl || voiceBase64,
      });
      return;
    }

    let currentVoiceB64 = voiceBase64;
    if (isRecording || (recorderRef.current && recorderRef.current.state !== 'inactive')) {
      currentVoiceB64 = await stopRecordingAndGetBase64();
    }

    const hasVoiceNote = Boolean(currentVoiceB64 || voiceBase64 || audioUrl);
    const trimmedMessage = message.trim();

    if (!trimmedMessage && !hasVoiceNote) {
      setSuccessToast('⚠️ Mohon tuliskan ucapan & doa restu atau rekam voice note terlebih dahulu.');
      setTimeout(() => setSuccessToast(null), 4000);
      return;
    }

    guestbookMutation.mutate({
      guestName,
      relationship,
      attendanceStatus,
      numberOfGuests,
      message: trimmedMessage,
      voiceUrl: currentVoiceB64 || voiceBase64,
    });
  };

  const handleDirectWhatsApp = () => {
    if (!guestName.trim()) {
      setSuccessToast('⚠️ Mohon isi nama Anda terlebih dahulu sebelum konfirmasi ke WhatsApp.');
      setTimeout(() => setSuccessToast(null), 4000);
      return;
    }

    whatsappMutation.mutate({
      guestName,
      attendanceStatus,
      numberOfGuests,
      message: message.trim() || 'Semoga pernikahan Arya & Nadhira senantiasa dilimpahi keberkahan dan kebahagiaan.',
    });
  };

  const filteredWishes = wishes.filter((w) => {
    const matchSearch =
      w.guestName.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      w.message.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
    const matchFilter = filterStatus === 'ALL' || w.attendanceStatus === filterStatus;
    return matchSearch && matchFilter;
  });

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'HADIR':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Hadir
          </span>
        );
      case 'TIDAK_HADIR':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            Tidak Hadir
          </span>
        );
      case 'RAGU':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <HelpCircle className="w-3 h-3 text-amber-600" />
            Masih Ragu
          </span>
        );
    }
  };

  return (
    <section id="guestbook-section" className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Section Heading */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <MessageSquareHeart className="w-3.5 h-3.5" style={{ color: styles.accent }} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] font-sans" style={{ color: styles.textSecondary }}>
              Buku Tamu Digital & RSVP
            </span>
          </div>
          <h2 className="font-['Playfair_Display'] text-3xl sm:text-4xl md:text-5xl font-semibold" style={{ color: styles.textPrimary }}>
            Untaian Doa & Ucapan
          </h2>
          <p className="text-sm text-[#78786A] mt-2">
            Sampaikan doa terbaik dan konfirmasi kehadiran Anda untuk hari bahagia kami
          </p>
        </motion.div>

        {/* Live Attendance Stats Counter */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          <div className="rounded-2xl p-4 text-center border shadow-xs" style={{ backgroundColor: styles.bgCard, borderColor: styles.borderAccent }}>
            <p className="text-[11px] font-sans font-semibold uppercase tracking-wider text-[#78786A]">Total Ucapan</p>
            <p className="text-xl sm:text-2xl font-bold font-['Playfair_Display'] mt-0.5" style={{ color: styles.textPrimary }}>
              {stats.totalWishes}
            </p>
          </div>
          <div className="rounded-2xl p-4 text-center border shadow-xs bg-emerald-50/70 border-emerald-200">
            <p className="text-[11px] font-sans font-semibold uppercase tracking-wider text-emerald-800">Tamu Hadir</p>
            <p className="text-xl sm:text-2xl font-bold font-['Playfair_Display'] text-emerald-900 mt-0.5">
              {stats.attendingCount}
            </p>
          </div>
          <div className="rounded-2xl p-4 text-center border shadow-xs bg-rose-50/70 border-rose-200">
            <p className="text-[11px] font-sans font-semibold uppercase tracking-wider text-rose-800">Tidak Hadir</p>
            <p className="text-xl sm:text-2xl font-bold font-['Playfair_Display'] text-rose-900 mt-0.5">
              {stats.declinedCount}
            </p>
          </div>
          <div className="rounded-2xl p-4 text-center border shadow-xs bg-amber-50/70 border-amber-200">
            <p className="text-[11px] font-sans font-semibold uppercase tracking-wider text-amber-800">Masih Ragu</p>
            <p className="text-xl sm:text-2xl font-bold font-['Playfair_Display'] text-amber-900 mt-0.5">
              {stats.tentativeCount}
            </p>
          </div>
        </div>

        {/* Submission Form Card (Only shown if guest has unique slug / isUnlocked) */}
        {isUnlocked && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl p-6 sm:p-8 border shadow-sm mb-12"
            style={{
              backgroundColor: styles.bgCard,
              borderColor: styles.borderAccent,
            }}
          >
            {verifiedGuest && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-emerald-900">
                    Tamu Terverifikasi: {verifiedGuest.name}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-800 font-bold uppercase">
                    {verifiedGuest.category}
                  </span>
                </div>
                <span className="text-emerald-800 font-medium hidden sm:inline">
                  Alokasi: {verifiedGuest.pax} Kursi
                </span>
              </div>
            )}

            {isFormLockedForDuplicate ? (
              <div className="rounded-2xl p-6 bg-emerald-50/90 border border-emerald-300/90 shadow-xs text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-300 mx-auto flex items-center justify-center text-emerald-700">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="inline-block px-3 py-1 rounded-full bg-emerald-200/80 text-emerald-900 text-xs font-bold uppercase tracking-wider mb-1">
                    RSVP Terkonfirmasi (1 Tamu = 1 Konfirmasi)
                  </span>
                  <h3 className="font-['Playfair_Display'] text-2xl font-bold text-stone-900">
                    Terima Kasih, {guestName}!
                  </h3>
                  <p className="text-xs text-stone-600 mt-1 max-w-md mx-auto">
                    Anda telah mengirimkan konfirmasi kehadiran & doa restu untuk pernikahan kami.
                  </p>
                </div>

                {existingWish && (
                  <div className="p-4 bg-white/90 rounded-2xl border border-emerald-200 text-left text-xs space-y-2.5 max-w-md mx-auto shadow-2xs">
                    <div className="flex justify-between items-center border-b border-stone-200 pb-2">
                      <span className="font-bold text-stone-700">Status Kehadiran:</span>
                      {getStatusBadge(existingWish.attendanceStatus)}
                    </div>
                    <div className="flex justify-between items-center border-b border-stone-200 pb-2">
                      <span className="font-bold text-stone-700">Jumlah Tamu:</span>
                      <span className="font-semibold text-stone-900">{existingWish.numberOfGuests} Orang</span>
                    </div>
                    {existingWish.message && (
                      <div>
                        <span className="font-bold text-stone-700 block mb-1">Ucapan & Doa Restu:</span>
                        <p className="italic text-stone-700 bg-stone-50 p-2.5 rounded-xl border border-stone-200 leading-relaxed">
                          "{existingWish.message}"
                        </p>
                      </div>
                    )}
                    {existingWish.voiceUrl && (
                      <div className="pt-1">
                        <span className="font-bold text-stone-700 block mb-1">Voice Note Terkirim:</span>
                        <audio src={existingWish.voiceUrl} controls className="h-8 w-full" />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedRSVData({
                        name: guestName,
                        attendance: existingWish?.attendanceStatus || attendanceStatus,
                        pax: existingWish?.numberOfGuests || numberOfGuests,
                        relationship: existingWish?.relationship || relationship,
                        code: verifiedGuest?.slug || 'RSVP-PASS',
                      });
                      setShowRSVPass(true);
                    }}
                    className="py-2.5 px-5 rounded-xl bg-[#5A5A40] text-white text-xs font-bold hover:bg-[#484833] transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Lihat Digital Ticket Pass / QR Code</span>
                  </button>

                  {hasAlreadyEdited ? (
                    <div className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-100 border border-stone-200 text-stone-600 text-xs font-semibold">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Perubahan Konfirmasi Telah Digunakan (Maks. 1x)</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingRSVP(true);
                        if (existingWish) {
                          setAttendanceStatus(existingWish.attendanceStatus);
                          setNumberOfGuests(existingWish.numberOfGuests);
                        }
                      }}
                      className="py-2.5 px-4 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Ubah Konfirmasi RSVP Saya</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
            <form onSubmit={handleSubmitNormal} className="space-y-4">
            {isEditingRSVP && (
              <div className="p-3.5 bg-amber-50 border border-amber-300/80 rounded-xl text-amber-900 text-xs font-medium flex items-start gap-2.5 shadow-2xs">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-amber-950 mb-0.5">
                    Mengubah Konfirmasi Kehadiran (Batas Maksimal 1x Perubahan)
                  </span>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Anda hanya dapat memperbarui status kehadiran dan jumlah tamu. Ucapan serta doa restu yang telah dikirimkan sebelumnya tidak dapat diubah.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-sans font-bold text-[#4A4A40] uppercase tracking-wider mb-1.5">
                  Nama Lengkap {verifiedGuest || isEditingRSVP ? '(Terkunci)' : '*'}
                </label>
                <input
                  type="text"
                  required
                  disabled={!!verifiedGuest || isEditingRSVP}
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Contoh: Dimas Wicaksono"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 bg-[#FDFCF9] text-[#4A4A40] disabled:bg-[#F4F3ED] disabled:text-[#78786A] disabled:cursor-not-allowed"
                  style={{ borderColor: styles.borderAccent }}
                />
              </div>

              <div>
                <label className="block text-[11px] font-sans font-bold text-[#4A4A40] uppercase tracking-wider mb-1.5">
                  Hubungan / Relasi {verifiedGuest || isEditingRSVP ? '(Terkunci)' : ''}
                </label>
                <select
                  disabled={!!verifiedGuest || isEditingRSVP}
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 bg-[#FDFCF9] text-[#4A4A40] disabled:bg-[#F4F3ED] disabled:text-[#78786A] disabled:cursor-not-allowed"
                  style={{ borderColor: styles.borderAccent }}
                >
                  <option value="Keluarga Besar">Keluarga Besar</option>
                  <option value="Sahabat Dekat">Sahabat Dekat</option>
                  <option value="Teman Sekolah / Kuliah">Teman Sekolah / Kuliah</option>
                  <option value="Rekan Kerja">Rekan Kerja</option>
                  <option value="Tetangga">Tetangga</option>
                  <option value="Tamu Undangan">Tamu Undangan</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-sans font-bold text-[#4A4A40] uppercase tracking-wider mb-1.5">
                  Konfirmasi Kehadiran *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAttendanceStatus('HADIR')}
                    className={`py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      attendanceStatus === 'HADIR'
                        ? 'bg-[#2D6A4F] text-white border-[#2D6A4F] shadow-xs'
                        : 'bg-[#FDFCF9] text-[#4A4A40] hover:bg-[#F0EEE6] border-[#E9E4D9]'
                    }`}
                  >
                    Hadir
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendanceStatus('TIDAK_HADIR')}
                    className={`py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      attendanceStatus === 'TIDAK_HADIR'
                        ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                        : 'bg-[#FDFCF9] text-[#4A4A40] hover:bg-[#F0EEE6] border-[#E9E4D9]'
                    }`}
                  >
                    Tidak Hadir
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendanceStatus('RAGU')}
                    className={`py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      attendanceStatus === 'RAGU'
                        ? 'bg-amber-700 text-white border-amber-700 shadow-xs'
                        : 'bg-[#FDFCF9] text-[#4A4A40] hover:bg-[#F0EEE6] border-[#E9E4D9]'
                    }`}
                  >
                    Ragu
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-sans font-bold text-[#4A4A40] uppercase tracking-wider mb-1.5">
                  Jumlah Tamu Hadir {verifiedGuest ? '(Sesuai Kuota)' : ''}
                </label>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#78786A]" />
                  <select
                    disabled={!!verifiedGuest || attendanceStatus === 'TIDAK_HADIR'}
                    value={numberOfGuests}
                    onChange={(e) => setNumberOfGuests(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 bg-[#FDFCF9] text-[#4A4A40] disabled:bg-[#F4F3ED] disabled:text-[#78786A] disabled:opacity-80 disabled:cursor-not-allowed"
                    style={{ borderColor: styles.borderAccent }}
                  >
                    <option value={1}>1 Orang</option>
                    <option value={2}>2 Orang (Bersama Pasangan)</option>
                    <option value={3}>3 Orang</option>
                    <option value={4}>4 Orang (Keluarga)</option>
                    <option value={5}>5+ Orang</option>
                  </select>
                </div>
              </div>
            </div>

            {isEditingRSVP ? (
              <div className="p-3.5 rounded-xl bg-stone-100/90 border border-stone-200 text-xs space-y-2">
                <span className="font-bold text-stone-700 block">Ucapan & Doa Restu Anda (Terkunci):</span>
                <p className="italic text-stone-800 bg-white p-3 rounded-lg border border-stone-200 leading-relaxed">
                  "{existingWish?.message || message || 'Selamat untuk kedua mempelai!'}"
                </p>
                <p className="text-[10px] text-stone-500 font-medium">
                  * Ucapan & doa restu tidak dapat diubah saat memperbarui kehadiran.
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-sans font-bold text-[#4A4A40] uppercase tracking-wider mb-1.5">
                  Ucapan & Doa Restu (Teks atau Voice Note)
                </label>
                <textarea
                  disabled={Boolean(audioUrl || voiceBase64 || isRecording)}
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    Boolean(audioUrl || voiceBase64 || isRecording)
                      ? "Input ucapan dikunci otomatis karena menggunakan Rekaman Suara / Speech-to-Text..."
                      : "Tuliskan ucapan atau rekam suara dengan tombol di bawah (transkripsi teks otomatis)..."
                  }
                  className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 resize-none transition-all ${
                    Boolean(audioUrl || voiceBase64 || isRecording)
                      ? "bg-amber-50/70 text-stone-800 border-amber-300 font-medium cursor-not-allowed shadow-inner opacity-90"
                      : "bg-[#FDFCF9] text-[#4A4A40]"
                  }`}
                  style={{ borderColor: Boolean(audioUrl || voiceBase64 || isRecording) ? undefined : styles.borderAccent }}
                />

                {Boolean(audioUrl || voiceBase64 || isRecording) && (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs bg-amber-100/90 border border-amber-300 px-3.5 py-2.5 rounded-xl text-amber-950 font-semibold shadow-2xs">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Input ucapan dikunci & terisi otomatis dari transkripsi rekaman suara.</span>
                    </div>
                    <button
                      type="button"
                      onClick={clearVoiceNote}
                      className="py-1 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1 transition-colors cursor-pointer text-[11px] ml-auto shadow-2xs"
                      title="Hapus rekaman suara & buka kunci input teks"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus & Urungkan Rekaman</span>
                    </button>
                  </div>
                )}

                {/* Voice Note & Speech to Text Recognition */}
                <div className="mt-2.5 p-3 rounded-xl bg-stone-50 border border-stone-200/80 flex flex-col gap-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-700 flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-[#5A5A40]" />
                      <span>Kirim Ucapan dengan Suara?</span>
                    </span>
                    
                    {isRecording && (
                      <span className="flex items-center gap-1 text-rose-600 font-bold animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping mr-1" />
                        Merekam & Mentranskrip...
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="py-1.5 px-3 rounded-lg bg-stone-900 text-white font-medium hover:bg-stone-800 transition-colors flex items-center gap-1.5 cursor-pointer text-[11px]"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>Rekam Suara (Speech-to-Text)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="py-1.5 px-3 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors flex items-center gap-1.5 cursor-pointer text-[11px]"
                      >
                        <MicOff className="w-3.5 h-3.5" />
                        <span>Selesai Rekam</span>
                      </button>
                    )}

                    {audioUrl && (
                      <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-stone-200 w-full sm:w-auto justify-between sm:justify-start shadow-2xs">
                        <audio src={audioUrl} controls className="h-7 max-w-[180px] sm:max-w-[200px]" />
                        <button
                          type="button"
                          onClick={clearVoiceNote}
                          className="py-1 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer border border-rose-200"
                          title="Hapus Rekaman Suara"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-[10px] text-stone-500 leading-normal">
                    * Klik tombol mikrofon untuk berbicara. Suara Anda akan otomatis diubah menjadi teks di kotak ucapan di atas dan terekam sebagai Voice Note yang dapat didengar oleh pengantin & tamu lainnya.
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={guestbookMutation.isPending}
                className="flex-1 py-3.5 px-5 rounded-xl font-sans text-xs uppercase tracking-[0.12em] font-bold text-white flex items-center justify-center gap-1.5 shadow-lg shadow-[#5A5A40]/15 transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
                style={{ backgroundColor: styles.accent }}
              >
                <Send className="w-4 h-4" />
                <span>
                  {guestbookMutation.isPending
                    ? 'Memproses...'
                    : isEditingRSVP
                    ? 'Simpan Perubahan Kehadiran (1x)'
                    : 'Kirim Doa Restu & Dapatkan Tiket'}
                </span>
              </button>

              {isEditingRSVP && (
                <button
                  type="button"
                  onClick={() => setIsEditingRSVP(false)}
                  className="py-3.5 px-4 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
              )}
            </div>
          </form>
          )}

          {/* Success Toast */}
          <AnimatePresence>
            {successToast && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium text-center flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>{successToast}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        )}

        {/* Wishes List Header with Search & Filter */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
          <h3 className="font-['Playfair_Display'] text-xl font-bold" style={{ color: styles.textPrimary }}>
            Daftar Doa Restu ({filteredWishes.length})
          </h3>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#78786A]" />
              <input
                type="text"
                placeholder="Cari nama ucapan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border bg-[#FDFCF9] focus:outline-none"
                style={{ borderColor: styles.borderAccent }}
              />
            </div>

            {/* Filter Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="py-2 px-3 text-xs rounded-xl border bg-[#FDFCF9] focus:outline-none"
              style={{ borderColor: styles.borderAccent }}
            >
              <option value="ALL">Semua</option>
              <option value="HADIR">Hadir</option>
              <option value="TIDAK_HADIR">Tidak Hadir</option>
              <option value="RAGU">Ragu</option>
            </select>
          </div>
        </div>

        {/* Wishes Feed Stream */}
        {isLoading ? (
          <div className="text-center py-12 text-[#78786A] text-sm">
            Memuat doa restu...
          </div>
        ) : filteredWishes.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed text-[#78786A] text-sm" style={{ borderColor: styles.borderAccent }}>
            Belum ada ucapan yang sesuai filter. Jadilah yang pertama memberikan ucapan!
          </div>
        ) : (
          <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
            {filteredWishes.map((w) => (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl border shadow-xs transition-colors"
                style={{
                  backgroundColor: styles.bgCard,
                  borderColor: styles.borderAccent,
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs uppercase"
                      style={{ backgroundColor: styles.accentLight, color: styles.accent }}
                    >
                      {w.guestName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm" style={{ color: styles.textPrimary }}>
                        {w.guestName}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#78786A]">
                        <span>{w.relationship}</span>
                        {w.attendanceStatus === 'HADIR' && w.numberOfGuests > 1 && (
                          <span>• {w.numberOfGuests} Orang</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {getStatusBadge(w.attendanceStatus)}
                </div>

                <p className="text-xs sm:text-sm text-[#4A4A40] mt-2 leading-relaxed bg-[#F7F5F0] border-l-2 p-3 rounded-r-xl" style={{ borderLeftColor: styles.accent }}>
                  "{w.message}"
                </p>

                {w.voiceUrl && (
                  <div className="mt-2.5 flex items-center gap-2 bg-[#F6F5F0] border border-[#EBE8DF] rounded-xl p-2 max-w-xs">
                    <Volume2 className="w-4 h-4 shrink-0" style={{ color: styles.accent }} />
                    <audio src={w.voiceUrl} controls className="h-7 w-full text-xs" />
                  </div>
                )}

                {/* Couple / Admin Reply */}
                {w.reply && (
                  <div
                    className="mt-3 ml-4 p-3 rounded-xl border flex items-start gap-2 text-xs"
                    style={{
                      backgroundColor: styles.accentLight,
                      borderColor: styles.borderAccent,
                    }}
                  >
                    <CornerDownRight className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: styles.accent }} />
                    <div>
                      <span className="font-bold block" style={{ color: styles.accent }}>
                        Balasan Mempelai:
                      </span>
                      <span className="text-[#4A4A40] leading-relaxed">{w.reply}</span>
                    </div>
                  </div>
                )}

                <div className="text-right text-[10px] text-[#78786A] mt-2 font-sans">
                  {new Date(w.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* RSVP Confirmation Pass Ticket Modal */}
      <AnimatePresence>
        {showRSVPass && submittedRSVData && (
          <RSVPConfirmationPassModal
            guestData={submittedRSVData}
            weddingDate={invitation.weddingDate}
            coupleNames={`${invitation.groomShortName} & ${invitation.brideShortName}`}
            onClose={() => setShowRSVPass(false)}
          />
        )}
      </AnimatePresence>
    </section>
  );
};
