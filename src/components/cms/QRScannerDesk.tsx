import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import {
  QrCode,
  Search,
  Camera,
  CameraOff,
  UserCheck,
  CheckCircle2,
  Volume2,
  VolumeX,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Gift,
  Users,
  Zap,
  X,
  FlipHorizontal,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { InvitedGuest } from '../../types.js';
import { playCheckInSuccessSound, playErrorSound } from '../../lib/sound.js';
import { fetchCMSInvitedGuests } from '../../lib/api.js';
import { useDebounce } from '../../hooks/useDebounce.js';

interface QRScannerDeskProps {
  guests: InvitedGuest[];
  onCheckIn: (payload: { guestId: string; actualPax: number; souvenirGiven: boolean }) => Promise<any>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const QRScannerDesk: React.FC<QRScannerDeskProps> = ({
  guests,
  onCheckIn,
  showToast,
}) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<'success' | 'error' | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [presensiQuery, setPresensiQuery] = useState('');
  const debouncedPresensiQuery = useDebounce(presensiQuery, 300);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeGuest, setActiveGuest] = useState<InvitedGuest | null>(null);
  const [checkInPax, setCheckInPax] = useState<number>(2);
  const [giveSouvenir, setGiveSouvenir] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoCheckIn, setAutoCheckIn] = useState(false);
  const [lastScannedSlug, setLastScannedSlug] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Desk Presensi Table Search, Filter & Pagination State
  const [deskSearch, setDeskSearch] = useState('');
  const debouncedDeskSearch = useDebounce(deskSearch, 300);
  const [deskStatusFilter, setDeskStatusFilter] = useState<'ALL' | 'HADIR' | 'BELUM'>('ALL');
  const [deskCategoryFilter, setDeskCategoryFilter] = useState<string>('ALL');
  const [deskCurrentPage, setDeskCurrentPage] = useState<number>(1);
  const [deskPageSize, setDeskPageSize] = useState<number>(10);

  // Filtered and Paginated Desk Presensi List
  const filteredDeskGuests = guests.filter((g) => {
    const q = debouncedDeskSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      g.name.toLowerCase().includes(q) ||
      g.slug.toLowerCase().includes(q) ||
      (g.tableNumber && g.tableNumber.toLowerCase().includes(q)) ||
      (g.category && g.category.toLowerCase().includes(q));

    const matchesStatus =
      deskStatusFilter === 'ALL' ||
      (deskStatusFilter === 'HADIR' && g.isCheckedIn) ||
      (deskStatusFilter === 'BELUM' && !g.isCheckedIn);

    const matchesCategory =
      deskCategoryFilter === 'ALL' || g.category === deskCategoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const totalDeskItems = filteredDeskGuests.length;
  const totalDeskPages = Math.max(1, Math.ceil(totalDeskItems / deskPageSize));
  const safeDeskPage = Math.min(Math.max(deskCurrentPage, 1), totalDeskPages);
  const startDeskIndex = (safeDeskPage - 1) * deskPageSize;
  const paginatedDeskGuests = filteredDeskGuests.slice(
    startDeskIndex,
    startDeskIndex + deskPageSize
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Compute live search suggestions with debounced query
  const matchingGuests = React.useMemo(() => {
    const q = debouncedPresensiQuery.trim().toLowerCase();
    if (!q) return [];
    return guests
      .filter((g) => {
        return (
          g.slug.toLowerCase().includes(q) ||
          g.name.toLowerCase().includes(q) ||
          (g.tableNumber && g.tableNumber.toLowerCase().includes(q)) ||
          (g.category && g.category.toLowerCase().includes(q))
        );
      })
      .slice(0, 8);
  }, [guests, debouncedPresensiQuery]);

  // Instant Auto-select if query is exact 4-char code
  useEffect(() => {
    const q = debouncedPresensiQuery.trim().toUpperCase();
    if (q.length === 4) {
      const exact = guests.find((g) => g.slug.toUpperCase() === q);
      if (exact && exact.id !== activeGuest?.id) {
        setActiveGuest(exact);
        setCheckInPax(exact.pax);
        setShowSuggestions(false);
        if (soundEnabled) playCheckInSuccessSound();
        showToast(`Tamu Ditemukan (Kode 4-Karakter): ${exact.name}`, 'success');
      }
    }
  }, [debouncedPresensiQuery, guests, soundEnabled, activeGuest?.id]);

  // Helper to extract 4-char slug from QR text (handles URLs or plain text)
  const extractSlugFromQR = (text: string): string => {
    try {
      if (text.includes('?c=')) {
        const urlParams = new URLSearchParams(text.split('?')[1]);
        const c = urlParams.get('c');
        if (c) return c.trim().toUpperCase();
      }
      if (text.includes('c=')) {
        const match = text.match(/c=([A-Za-z0-9]{4})/);
        if (match && match[1]) return match[1].toUpperCase();
      }
      // If code is 4 chars directly
      const clean = text.trim().toUpperCase();
      if (clean.length === 4) return clean;
      return clean;
    } catch {
      return text.trim().toUpperCase();
    }
  };

  // Find guest by slug or name
  const findGuest = (queryStr: string): InvitedGuest | null => {
    const q = queryStr.trim().toUpperCase();
    if (!q) return null;

    // First try exact slug match
    const bySlug = guests.find((g) => g.slug.toUpperCase() === q);
    if (bySlug) return bySlug;

    // Next try substring name match
    const byName = guests.find((g) => g.name.toLowerCase().includes(queryStr.toLowerCase()));
    return byName || null;
  };

  // Process scanned QR code content
  const handleScannedCode = async (rawCode: string) => {
    const slug = extractSlugFromQR(rawCode);
    if (slug === lastScannedSlug) return; // prevent duplicate trigger loop

    setLastScannedSlug(slug);

    const found = findGuest(slug);
    if (found) {
      setScanFeedback('success');
      setTimeout(() => setScanFeedback(null), 1800);
      setActiveGuest(found);
      setCheckInPax(found.pax);

      if (autoCheckIn && !found.isCheckedIn) {
        // Instant Auto-Check-in
        try {
          setIsSubmitting(true);
          await onCheckIn({
            guestId: found.id,
            actualPax: found.pax,
            souvenirGiven: giveSouvenir,
          });
          if (soundEnabled) playCheckInSuccessSound();
          showToast(`✅ Auto Check-In Berhasil: ${found.name} (${found.slug})`, 'success');
        } catch (err: any) {
          if (soundEnabled) playErrorSound();
          showToast(err.message || 'Gagal check-in otomatis', 'error');
        } finally {
          setIsSubmitting(false);
        }
      } else {
        if (soundEnabled) playCheckInSuccessSound();
        showToast(`Tamu ditemukan: ${found.name} (${found.slug})`, 'success');
      }
    } else {
      setScanFeedback('error');
      setTimeout(() => setScanFeedback(null), 1800);
      if (soundEnabled) playErrorSound();
      showToast(`QR Code tidak cocok dengan tamu manapun: "${slug}"`, 'error');
    }

    // Reset cooldown after 3 seconds so the same QR can be rescanned if needed
    setTimeout(() => {
      setLastScannedSlug(null);
    }, 3000);
  };

  // Camera Scanning Loop
  const scanLoop = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        handleScannedCode(code.data);
      }
    }

    animFrameRef.current = requestAnimationFrame(scanLoop);
  };

  // Start Camera Stream
  const startCamera = async (targetFacingMode?: 'environment' | 'user') => {
    const modeToUse = targetFacingMode || facingMode;
    setCameraError(null);
    setIsRequestingPermission(true);
    try {
      // Stop existing tracks if any before requesting new mode
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: modeToUse,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      setIsCameraActive(true);
      setIsRequestingPermission(false);
      if (!animFrameRef.current) {
        animFrameRef.current = requestAnimationFrame(scanLoop);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setIsCameraActive(false);
      setIsRequestingPermission(false);
      setCameraError(
        'Akses kamera ditolak atau tidak tersedia. Pastikan memberikan izin kamera pada browser Anda.'
      );
    }
  };

  const toggleFacingMode = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (isCameraActive) {
      await startCamera(nextMode);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Select guest from live suggestion dropdown
  const selectGuestFromSuggestion = (guest: InvitedGuest) => {
    setActiveGuest(guest);
    setCheckInPax(guest.pax);
    setShowSuggestions(false);
    if (soundEnabled) playCheckInSuccessSound();
    showToast(`Tamu Dipilih: ${guest.name} (${guest.slug})`, 'success');
  };

  // Handle Manual Search Submission
  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    const query = presensiQuery.trim();
    if (!query) return;

    // First try in-memory guest match
    let found = findGuest(query);

    // If not found in memory, perform active API fetch search
    if (!found) {
      try {
        const res = await fetchCMSInvitedGuests('ALL', query);
        if (res.data && res.data.length > 0) {
          found = res.data.find((g) => g.slug.toUpperCase() === query.toUpperCase()) ||
                  res.data.find((g) => g.name.toLowerCase().includes(query.toLowerCase())) ||
                  res.data[0];
        }
      } catch (err) {
        console.error('Error fetching guest search:', err);
      }
    }

    if (found) {
      setActiveGuest(found);
      setCheckInPax(found.pax);
      if (soundEnabled) playCheckInSuccessSound();
      showToast(`Tamu Ditemukan: ${found.name}`, 'success');
    } else {
      if (soundEnabled) playErrorSound();
      showToast(`Tidak ditemukan tamu dengan kata kunci "${query}"`, 'error');
    }
  };

  // Handle Confirm Check-In
  const handleConfirmCheckIn = async () => {
    if (!activeGuest) return;
    setIsSubmitting(true);
    try {
      await onCheckIn({
        guestId: activeGuest.id,
        actualPax: Number(checkInPax) || 1,
        souvenirGiven: giveSouvenir,
      });

      if (soundEnabled) playCheckInSuccessSound();
      showToast(`Presensi Berhasil: ${activeGuest.name} telah check-in!`, 'success');

      // Update active guest view locally
      setActiveGuest({
        ...activeGuest,
        isCheckedIn: true,
        checkInTime: new Date().toISOString(),
        actualPax: Number(checkInPax) || 1,
        souvenirGiven: giveSouvenir,
      });
    } catch (err: any) {
      if (soundEnabled) playErrorSound();
      showToast(err.message || 'Gagal menyimpan check-in', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Control Toolbar */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-2">
            <QrCode className="w-3.5 h-3.5 text-[#5A5A40]" />
            <span>Desk Receptionist & QR Code Reader</span>
          </div>
          <h1 className="font-['Playfair_Display'] text-2xl font-bold text-stone-900">
            Penerimaan & Check-In Tamu
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Scan QR Code dari HP tamu undangan atau cari nama / kode 4 karakter unik secara langsung.
          </p>
        </div>

        {/* Audio & Scanner Options Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              playCheckInSuccessSound();
              showToast('Membunyikan nada tes check-in...', 'success');
            }}
            className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Tes nada chime"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Tes Suara</span>
          </button>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'bg-stone-100 text-stone-500 border border-stone-200'
            }`}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-700" />
                <span>Suara: ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-stone-400" />
                <span>Suara: OFF</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setAutoCheckIn(!autoCheckIn)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              autoCheckIn
                ? 'bg-purple-100 text-purple-900 border border-purple-300 shadow-xs'
                : 'bg-stone-100 text-stone-600 border border-stone-200'
            }`}
            title="Seketika check-in tanpa modal konfirmasi ketika QR valid terdeteksi"
          >
            <Zap className={`w-4 h-4 ${autoCheckIn ? 'text-purple-700' : 'text-stone-400'}`} />
            <span>Auto Check-In</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Camera QR Scanner Frame & Manual Search */}
        <div className="lg:col-span-6 space-y-6">
          {/* Camera Viewfinder Box */}
          <div className="bg-stone-900 text-white rounded-3xl p-5 border border-stone-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-stone-100">Kamera Scanner QR</h3>
              </div>

              <div className="flex items-center gap-2">
                {isCameraActive && (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    {facingMode === 'environment' ? 'Kamera Belakang' : 'Kamera Depan'}
                  </span>
                )}
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-stone-700 shadow-xs"
                  title="Ganti antara Kamera Depan & Kamera Belakang"
                >
                  <FlipHorizontal className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Ganti Kamera ({facingMode === 'environment' ? 'Belakang' : 'Depan'})</span>
                  <span className="sm:hidden">Ganti</span>
                </button>
              </div>
            </div>

            {/* Video Viewport Container */}
            <div className={`relative w-full aspect-4/3 bg-stone-950 rounded-2xl overflow-hidden flex items-center justify-center border transition-all duration-300 ${
              scanFeedback === 'success'
                ? 'border-emerald-400 ring-4 ring-emerald-400/40'
                : scanFeedback === 'error'
                ? 'border-rose-500 ring-4 ring-rose-500/40'
                : 'border-stone-800'
            }`}>
              <video
                ref={videoRef}
                className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Scan Feedback Pulse Flash Overlay */}
              {scanFeedback === 'success' && (
                <div className="absolute inset-0 bg-emerald-500/20 pointer-events-none flex items-center justify-center backdrop-blur-2xs transition-all">
                  <div className="px-4 py-2 bg-emerald-600 text-white rounded-full font-bold text-xs flex items-center gap-2 shadow-xl animate-bounce">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                    <span>QR Code Valid • Tamu Ditemukan!</span>
                  </div>
                </div>
              )}

              {scanFeedback === 'error' && (
                <div className="absolute inset-0 bg-rose-500/20 pointer-events-none flex items-center justify-center backdrop-blur-2xs transition-all">
                  <div className="px-4 py-2 bg-rose-600 text-white rounded-full font-bold text-xs flex items-center gap-2 shadow-xl animate-bounce">
                    <AlertCircle className="w-5 h-5 text-white" />
                    <span>QR Code Tidak Dikenali</span>
                  </div>
                </div>
              )}

              {/* Camera Permission Request Overlay */}
              {isRequestingPermission && (
                <div className="absolute inset-0 bg-stone-950/95 z-20 flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 animate-pulse">
                      <Camera className="w-8 h-8" />
                    </div>
                    <div className="absolute -inset-2 rounded-full border border-amber-400/40 animate-ping pointer-events-none" />
                  </div>
                  <h4 className="font-bold text-sm text-stone-100">Meminta Akses Kamera Browser</h4>
                  <p className="text-xs text-stone-300 max-w-xs leading-relaxed">
                    Silakan tekan <span className="text-amber-300 font-bold">"Izinkan / Allow"</span> pada notifikasi browser Anda untuk mengaktifkan pemindai.
                  </p>
                  <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-[10px] font-semibold text-amber-300">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span>Menunggu respon izin...</span>
                  </div>
                </div>
              )}

              {/* Viewfinder Target HUD Overlay when Camera Active */}
              {isCameraActive && !isRequestingPermission && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-56 h-56 border-2 border-amber-400/80 rounded-2xl relative shadow-2xl shadow-amber-400/20">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-amber-400 -mt-1 -ml-1 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-amber-400 -mt-1 -mr-1 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-amber-400 -mb-1 -ml-1 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-amber-400 -mb-1 -mr-1 rounded-br-lg" />

                    {/* Animated Scanning Sweep Beam */}
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent shadow-[0_0_12px_#fde047] animate-pulse mt-20" />
                  </div>
                  <div className="absolute bottom-3 px-3 py-1 bg-black/70 backdrop-blur-md rounded-full text-[10px] font-semibold text-stone-200 border border-stone-700/60 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Posisikan QR Code di dalam bingkai untuk memindai</span>
                  </div>
                </div>
              )}

              {/* Placeholder Camera Offline Screen */}
              {!isCameraActive && !isRequestingPermission && (
                <div className="text-center p-6 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-stone-900 border border-stone-800 mx-auto flex items-center justify-center text-stone-500">
                    <CameraOff className="w-8 h-8" />
                  </div>
                  <p className="text-xs text-stone-400 max-w-xs mx-auto">
                    Kamera dalam posisi nonaktif. Klik tombol di bawah untuk mengaktifkan pemindai kamera HP/Laptop.
                  </p>
                </div>
              )}
            </div>

            {/* Error Banner with Guided Solution */}
            {cameraError && !isRequestingPermission && (
              <div className="p-4 bg-rose-950/90 border border-rose-800 rounded-2xl text-rose-200 text-xs space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-rose-100 text-sm">Izin Kamera Ditolak / Gagal Akses</h4>
                    <p className="text-stone-300 text-[11px] mt-0.5">{cameraError}</p>
                  </div>
                </div>
                <div className="bg-rose-900/40 p-2.5 rounded-xl border border-rose-800/60 text-[11px] text-stone-300 space-y-1">
                  <p className="font-bold text-rose-300">Cara Mengaktifkan Kembali:</p>
                  <p>1. Klik ikon gembok / kamera di sebelah URL browser Anda.</p>
                  <p>2. Ubah izin Kamera menjadi <span className="font-bold text-emerald-300">"Izinkan / Allow"</span>.</p>
                  <p>3. Klik tombol di bawah untuk meminta ulang izin kamera.</p>
                </div>
                <button
                  type="button"
                  onClick={startCamera}
                  className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Coba Lagi & Minta Izin Kamera</span>
                </button>
              </div>
            )}

            {/* Camera Controls */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              {!isCameraActive ? (
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="w-full py-3 px-4 rounded-xl bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all"
                >
                  <Camera className="w-4 h-4" />
                  <span>Aktifkan Kamera Scanner</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="flex-1 py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <CameraOff className="w-4 h-4 text-rose-400" />
                    <span>Matikan Kamera</span>
                  </button>
                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    className="px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-95 shrink-0"
                    title="Ganti ke Kamera Depan / Kamera Belakang"
                  >
                    <FlipHorizontal className="w-4 h-4" />
                    <span>Ganti Kamera ({facingMode === 'environment' ? 'Belakang' : 'Depan'})</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Manual Input Search Box */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4 relative">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <Search className="w-4 h-4 text-[#5A5A40]" />
                <span>Input Manual Kode 4-Karakter / Nama Tamu</span>
              </h3>
              {presensiQuery.trim().length > 0 && (
                <span className="text-[10px] font-semibold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                  {matchingGuests.length} Hasil
                </span>
              )}
            </div>

            <form onSubmit={handleManualSearch} className="space-y-3 relative">
              <div className="relative">
                <input
                  type="text"
                  value={presensiQuery}
                  onChange={(e) => {
                    setPresensiQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Ketik kode 4 karakter (mis. R7K2) atau nama tamu..."
                  className="w-full pl-4 pr-24 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-bold text-stone-900 uppercase focus:bg-white focus:border-[#5A5A40] outline-hidden shadow-inner"
                />
                {presensiQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setPresensiQuery('');
                      setShowSuggestions(false);
                    }}
                    className="absolute right-14 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 rounded-md cursor-pointer"
                    title="Bersihkan input"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-[#5A5A40] text-white text-xs font-bold cursor-pointer hover:bg-[#484833]"
                >
                  Cari
                </button>
              </div>

              {/* Live Search Auto-Suggestions Dropdown */}
              {showSuggestions && presensiQuery.trim().length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-64 overflow-y-auto divide-y divide-stone-100 animate-fade-in">
                  {matchingGuests.length === 0 ? (
                    <div className="p-4 text-center text-xs text-stone-400">
                      Tidak ditemukan tamu dengan kata kunci "{presensiQuery}"
                    </div>
                  ) : (
                    matchingGuests.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => selectGuestFromSuggestion(g)}
                        className="w-full p-3 text-left hover:bg-stone-50 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900 text-xs truncate">{g.name}</span>
                            <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-950 border border-amber-300 shrink-0">
                              {g.slug}
                            </span>
                          </div>
                          <p className="text-[10px] text-stone-500 mt-0.5 truncate">
                            {g.category} {g.tableNumber ? `• Meja ${g.tableNumber}` : ''} • {g.pax} Pax
                          </p>
                        </div>

                        <div className="shrink-0">
                          {g.isCheckedIn ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Hadir
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-semibold">
                              Pilih
                            </span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Active Selected Guest Card & Confirmation Box */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-['Playfair_Display'] text-lg font-bold text-stone-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#5A5A40]" />
                <span>Kartu Konfirmasi Check-In</span>
              </h3>
              {activeGuest && (
                <button
                  type="button"
                  onClick={() => setActiveGuest(null)}
                  className="text-xs font-semibold text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  Bersihkan
                </button>
              )}
            </div>

            {activeGuest ? (
              <div className="space-y-5 animate-fade-in">
                {/* Guest Profile Details */}
                <div className="p-5 rounded-2xl bg-amber-50/70 border-2 border-amber-200/80 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-900">
                      Tamu Undangan Verifikasi
                    </span>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/?to=${encodeURIComponent(activeGuest.name)}&c=${activeGuest.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        title={`Buka Link Undangan ${activeGuest.name}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-amber-700" />
                        <span>Buka Link Undangan</span>
                      </a>
                      <span className="font-mono font-extrabold text-base px-3 py-1 bg-amber-200/80 rounded-lg text-amber-950 shadow-xs">
                        {activeGuest.slug}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-stone-900">{activeGuest.name}</h2>
                    <p className="text-xs text-stone-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>
                        Kategori: <strong>{activeGuest.category}</strong>
                      </span>
                      {activeGuest.tableNumber && (
                        <span>
                          • No. Meja: <strong className="text-amber-900">{activeGuest.tableNumber}</strong>
                        </span>
                      )}
                      {activeGuest.phone && <span>• No. HP: {activeGuest.phone}</span>}
                    </p>
                  </div>

                  {activeGuest.customNote && (
                    <p className="text-xs italic bg-white/80 p-2.5 rounded-xl border border-amber-200 text-stone-700">
                      "{activeGuest.customNote}"
                    </p>
                  )}
                </div>

                {/* Check-In Status & Action Controls */}
                {activeGuest.isCheckedIn ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>Tamu Telah Hadir & Check-In</span>
                    </div>
                    <p className="text-xs text-emerald-800">
                      Waktu Check-in:{' '}
                      <strong>
                        {activeGuest.checkInTime
                          ? new Date(activeGuest.checkInTime).toLocaleString('id-ID')
                          : 'Baru Saja'}
                      </strong>
                    </p>
                    <p className="text-xs text-emerald-800">
                      Jumlah Pax: <strong>{activeGuest.actualPax || activeGuest.pax} Orang</strong> • Souvenir:{' '}
                      <strong>{activeGuest.souvenirGiven ? 'Sudah Diberikan' : 'Belum'}</strong>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Pax Hadir (Jumlah Orang)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={checkInPax}
                          onChange={(e) => setCheckInPax(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-bold text-sm text-stone-900 focus:border-[#5A5A40] outline-hidden"
                        />
                      </div>

                      <div className="flex items-center pt-5">
                        <label className="inline-flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={giveSouvenir}
                            onChange={(e) => setGiveSouvenir(e.target.checked)}
                            className="w-4 h-4 rounded-md accent-[#5A5A40]"
                          />
                          <span className="text-xs font-bold text-stone-800 flex items-center gap-1">
                            <Gift className="w-3.5 h-3.5 text-purple-600" />
                            <span>Serahkan Souvenir</span>
                          </span>
                        </label>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmCheckIn}
                      disabled={isSubmitting}
                      className="w-full py-3.5 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-700/20 cursor-pointer disabled:opacity-50 transition-all"
                    >
                      <UserCheck className="w-5 h-5" />
                      <span>{isSubmitting ? 'Memproses Check-In...' : 'Konfirmasi Check-In Sekarang'}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-stone-400 space-y-2">
                <Users className="w-10 h-10 mx-auto text-stone-300" />
                <p className="text-xs font-medium">Belum ada tamu terpilih.</p>
                <p className="text-[11px] text-stone-400">
                  Arahkan QR Code tamu ke kamera scanner di sebelah kiri atau ketik kode/nama pada kolom cari.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FULL DESK PRESENSI TABLE & PAGINATION */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <h3 className="font-['Playfair_Display'] text-lg font-bold text-stone-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#5A5A40]" />
              <span>Daftar Desk Presensi Kehadiran</span>
            </h3>
            <p className="text-[11px] text-stone-500">
              {guests.filter((g) => g.isCheckedIn).length} dari {guests.length} tamu telah check-in
            </p>
          </div>
        </div>

        {/* Controls and Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={deskSearch}
              onChange={(e) => {
                setDeskSearch(e.target.value);
                setDeskCurrentPage(1);
              }}
              placeholder="Cari presensi nama, kode, meja..."
              className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-[#5A5A40] outline-hidden"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <select
              value={deskStatusFilter}
              onChange={(e) => {
                setDeskStatusFilter(e.target.value as any);
                setDeskCurrentPage(1);
              }}
              className="flex-1 sm:flex-initial px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 outline-hidden cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="HADIR">Sudah Hadir</option>
              <option value="BELUM">Belum Hadir</option>
            </select>

            <select
              value={deskCategoryFilter}
              onChange={(e) => {
                setDeskCategoryFilter(e.target.value);
                setDeskCurrentPage(1);
              }}
              className="flex-1 sm:flex-initial px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 outline-hidden cursor-pointer"
            >
              <option value="ALL">Kategori</option>
              <option value="Keluarga">Keluarga</option>
              <option value="Sahabat">Sahabat</option>
              <option value="VIP">VIP</option>
              <option value="Rekan Kerja">Rekan Kerja</option>
              <option value="Umum">Umum</option>
            </select>

            <select
              value={deskPageSize}
              onChange={(e) => {
                setDeskPageSize(Number(e.target.value));
                setDeskCurrentPage(1);
              }}
              className="px-2 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 outline-hidden shrink-0 cursor-pointer"
            >
              <option value={5}>5 / hal</option>
              <option value={10}>10 / hal</option>
              <option value={20}>20 / hal</option>
              <option value={50}>50 / hal</option>
            </select>
          </div>
        </div>

        {/* Table Data */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Kode</th>
                <th className="py-2.5 px-3">Nama Tamu</th>
                <th className="py-2.5 px-3">Kategori</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Aksi Desk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {paginatedDeskGuests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-stone-400">
                    Tidak ditemukan data presensi yang sesuai.
                  </td>
                </tr>
              ) : (
                paginatedDeskGuests.map((g) => (
                  <tr
                    key={g.id}
                    className={`hover:bg-stone-50/80 transition-colors ${
                      g.isCheckedIn ? 'bg-emerald-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-mono font-bold text-stone-900">{g.slug}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-stone-900">{g.name}</p>
                        <a
                          href={`/?to=${encodeURIComponent(g.name)}&c=${g.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 text-[10px] font-bold transition-colors cursor-pointer shrink-0"
                          title={`Buka Link Undangan ${g.name}`}
                        >
                          <ExternalLink className="w-3 h-3 text-amber-700" />
                          <span>Buka Link</span>
                        </a>
                      </div>
                      {g.tableNumber && (
                        <span className="text-[10px] text-stone-500">Meja: {g.tableNumber}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-stone-600 font-medium">{g.category}</td>
                    <td className="py-3 px-3 text-center">
                      {g.isCheckedIn ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Hadir ({g.actualPax || g.pax} pax)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-500 text-[10px] font-medium">
                          Belum Hadir
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveGuest(g);
                          setCheckInPax(g.pax);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#5A5A40] text-white text-[10px] font-bold hover:bg-[#484833] transition-colors cursor-pointer shadow-xs"
                      >
                        Pilih & Verifikasi
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Desk Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-stone-100 text-xs text-stone-600">
          <div>
            Menampilkan{' '}
            <strong>
              {totalDeskItems > 0 ? startDeskIndex + 1 : 0} -{' '}
              {Math.min(startDeskIndex + deskPageSize, totalDeskItems)}
            </strong>{' '}
            dari <strong>{totalDeskItems}</strong> data presensi desk
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDeskCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={safeDeskPage <= 1}
              className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalDeskPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                type="button"
                onClick={() => setDeskCurrentPage(pg)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  safeDeskPage === pg
                    ? 'bg-[#5A5A40] text-white shadow-xs'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {pg}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setDeskCurrentPage((p) => Math.min(p + 1, totalDeskPages))}
              disabled={safeDeskPage >= totalDeskPages}
              className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              title="Halaman Selanjutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
