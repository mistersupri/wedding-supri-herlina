import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  RotateCcw,
  Sparkles,
  Heart,
  X,
  Maximize2,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Send,
  SwitchCamera,
  Volume2,
  Smile,
  Film,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  User,
  Share2,
  Instagram,
  MessageCircle,
  Download,
  Copy,
  ExternalLink,
  Frame,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.js';
import { InvitedGuest, PhotoMoment, PhotoFrameConfig } from '../../types.js';
import {
  fetchPhotoMoments,
  submitPhotoMoment,
  reactPhotoMomentApi,
  fetchPhotoFrameConfig,
  uploadFileToServer,
} from '../../lib/api.js';

export const EMOJI_OPTIONS = ['❤️', '😍', '🎉', '🔥', '👏', '😊'];

export interface PhotoFilterPreset {
  id: string;
  name: string;
  css: string;
  canvasFilter: string;
}

/**
 * Overlay PNG frame image on top of base photo canvas
 */
export const applyFrameOverlayToDataUrl = (
  photoDataUrl: string,
  frameOverlayUrl: string
): Promise<string> => {
  return new Promise((resolve) => {
    if (!frameOverlayUrl) {
      resolve(photoDataUrl);
      return;
    }
    const baseImg = new Image();
    baseImg.crossOrigin = 'anonymous';
    baseImg.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = baseImg.naturalWidth || baseImg.width || 800;
      canvas.height = baseImg.naturalHeight || baseImg.height || 1000;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(photoDataUrl);
        return;
      }

      // Draw base photo
      ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);

      // Load & Draw overlay frame PNG
      const frameImg = new Image();
      frameImg.crossOrigin = 'anonymous';
      frameImg.onload = () => {
        ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      };
      frameImg.onerror = () => {
        resolve(photoDataUrl);
      };
      frameImg.src = frameOverlayUrl;
    };
    baseImg.onerror = () => resolve(photoDataUrl);
    baseImg.src = photoDataUrl;
  });
};

export const PHOTO_FILTER_PRESETS: PhotoFilterPreset[] = [
  { id: 'normal', name: 'Normal', css: 'none', canvasFilter: 'none' },
  { id: 'bw', name: 'B&W Mono', css: 'grayscale(100%) contrast(110%)', canvasFilter: 'grayscale(100%) contrast(110%)' },
  { id: 'vintage', name: 'Vintage', css: 'sepia(45%) contrast(110%) brightness(105%) saturate(120%)', canvasFilter: 'sepia(45%) contrast(110%) brightness(105%) saturate(120%)' },
  { id: 'warm', name: 'Warm Love', css: 'sepia(25%) saturate(145%) hue-rotate(-10deg) brightness(105%)', canvasFilter: 'sepia(25%) saturate(145%) hue-rotate(-10deg) brightness(105%)' },
  { id: 'sepia', name: 'Classic Sepia', css: 'sepia(100%) contrast(100%)', canvasFilter: 'sepia(100%) contrast(100%)' },
  { id: 'cool', name: 'Cool Tone', css: 'saturate(85%) hue-rotate(15deg) contrast(105%)', canvasFilter: 'saturate(85%) hue-rotate(15deg) contrast(105%)' },
  { id: 'noir', name: 'Dramatic Noir', css: 'grayscale(100%) contrast(160%) brightness(90%)', canvasFilter: 'grayscale(100%) contrast(160%) brightness(90%)' },
];

export const applyFilterToCanvasDataUrl = (
  rawDataUrl: string,
  filterCss: string
): Promise<string> => {
  return new Promise((resolve) => {
    if (!filterCss || filterCss === 'none') {
      resolve(rawDataUrl);
      return;
    }
    const img = new Image();
    img.src = rawDataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.filter = filterCss;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } else {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
  });
};

/**
 * Sub-component for Lazy Loaded Image with Blur Effect and Smooth Fade-In.
 */
const LazyBlurImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}> = ({ src, alt, className = '', onClick }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="relative w-full h-full bg-stone-900 overflow-hidden" onClick={onClick}>
      {/* Blurred Skeleton Placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-stone-800/80 backdrop-blur-md animate-pulse flex items-center justify-center z-0">
          <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        className={`${className} transition-all duration-500 ${
          isLoaded
            ? 'opacity-100 blur-0 scale-100'
            : 'opacity-0 blur-md scale-105'
        }`}
      />
    </div>
  );
};

/**
 * Automatically compress image Data URL on client-side before sending to server.
 * Resizes image if dimensions exceed max 1080px and applies JPEG quality 0.75.
 * Saves up to 90% bandwidth (~150KB vs ~2-3MB).
 */
export function compressImageDataUrl(
  dataUrl: string,
  maxWidth = 1080,
  maxHeight = 1080,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => {
      resolve(dataUrl);
    };
  });
}

/**
 * Sub-component for interactive card emoji reaction popup bar.
 */
const CardEmojiReaction: React.FC<{
  photoId: string;
  reactions?: Record<string, number>;
  likesCount?: number;
  myReaction?: string;
  onReact: (emoji: string, e: React.MouseEvent) => void;
  onOpenChange?: (isOpen: boolean) => void;
}> = ({ photoId, reactions, likesCount, myReaction, onReact, onOpenChange }) => {
  const [showPicker, setShowPicker] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number; placeBelow: boolean } | null>(null);

  const updatePopoverPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = Math.min(230, window.innerWidth - 24);
    const popoverHeight = 48; // height of reaction bar

    // Center popover horizontally relative to trigger button, clamp inside viewport [12px, innerWidth - popoverWidth - 12px]
    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - popoverWidth - 12));

    // Calculate vertical position: prefer above trigger button, fallback to below if close to top edge
    let placeBelow = false;
    let top = rect.top - popoverHeight - 8;
    if (top < 12) {
      top = rect.bottom + 8;
      placeBelow = true;
    }

    setPopoverPos({ top, left, placeBelow });
  }, []);

  const togglePicker = (val: boolean | ((prev: boolean) => boolean)) => {
    setShowPicker((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (onOpenChange) onOpenChange(next);
      return next;
    });
  };

  useEffect(() => {
    if (!showPicker) return;
    updatePopoverPosition();

    const handleScrollOrResize = () => {
      updatePopoverPosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [showPicker, updatePopoverPosition]);

  // Total reaction count
  const totalCount = reactions
    ? Object.values(reactions).reduce((acc: number, curr: number) => acc + (Number(curr) || 0), 0)
    : likesCount || 0;

  return (
    <div className="relative shrink-0 z-20">
      {/* Floating Mini Emoji Selector Popup */}
      <AnimatePresence>
        {showPicker && (
          <>
            {/* Click backdrop to close picker */}
            <div
              className="fixed inset-0 z-40"
              onClick={(e) => {
                e.stopPropagation();
                togglePicker(false);
              }}
            />

            {popoverPos && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: popoverPos.placeBelow ? -8 : 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: popoverPos.placeBelow ? -8 : 8 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'fixed',
                  top: `${popoverPos.top}px`,
                  left: `${popoverPos.left}px`,
                }}
                className="z-50 bg-stone-900/95 backdrop-blur-md border border-stone-700/90 p-1.5 rounded-full shadow-2xl flex items-center gap-1 min-w-max"
              >
                {EMOJI_OPTIONS.map((emoji) => {
                  const isSelected = myReaction === emoji;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReact(emoji, e);
                        togglePicker(false);
                      }}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm sm:text-base hover:scale-125 transition-transform cursor-pointer ${
                        isSelected ? 'bg-amber-500/30 ring-1 ring-amber-400' : 'hover:bg-white/10'
                      }`}
                      title={`React ${emoji}`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* Card Reaction Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          togglePicker((prev) => !prev);
        }}
        className={`px-2.5 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5 transition-all active:scale-90 cursor-pointer border shadow-sm ${
          myReaction
            ? 'bg-amber-500/25 border-amber-400/60 text-white'
            : 'bg-black/50 border-white/20 hover:bg-black/70 text-white/90'
        }`}
        title="Pilih Emoji Reaction"
      >
        <span className="text-xs sm:text-sm leading-none">{myReaction || '❤️'}</span>
        {totalCount > 0 && (
          <span className="text-[10px] sm:text-xs font-bold text-stone-200 leading-none">
            {totalCount}
          </span>
        )}
      </button>
    </div>
  );
};

interface PhotoMomentsSectionProps {
  verifiedGuest?: InvitedGuest | null;
  defaultGuestName?: string;
  isUnlocked?: boolean;
  onBack?: () => void;
}

export const PhotoMomentsSection: React.FC<PhotoMomentsSectionProps> = ({
  verifiedGuest,
  defaultGuestName = 'Tamu Undangan',
  isUnlocked = true,
  onBack,
}) => {
  const { styles } = useTheme();

  // Effective guest from prop or localStorage fallback
  const effectiveGuest = useMemo(() => {
    if (verifiedGuest) return verifiedGuest;
    try {
      const saved = localStorage.getItem('wedding_verified_guest');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, [verifiedGuest]);

  // Guest Identification & Limits
  const [guestName, setGuestName] = useState<string>(
    effectiveGuest?.name || defaultGuestName || ''
  );
  const [photoMoments, setPhotoMoments] = useState<PhotoMoment[]>([]);
  const [userPhotoCount, setUserPhotoCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pagination & Infinite Scroll State (Limit 10 Photos per page)
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState<boolean>(false);
  const pageRef = useRef<number>(1);
  const isFetchingRef = useRef<boolean>(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // My Reactions state: { [photoId: string]: string (emoji) }
  const [myReactions, setMyReactions] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('wedding_photo_moments_reactions');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        'wedding_photo_moments_reactions',
        JSON.stringify(myReactions)
      );
    } catch (e) {
      console.error('Failed to save reactions state:', e);
    }
  }, [myReactions]);

  // My Uploaded Photo IDs state
  const [myUploadedPhotoIds, setMyUploadedPhotoIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('wedding_my_photo_moment_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        'wedding_my_photo_moment_ids',
        JSON.stringify(myUploadedPhotoIds)
      );
    } catch (e) {
      console.error('Failed to save my photo IDs:', e);
    }
  }, [myUploadedPhotoIds]);

  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('normal');
  const [caption, setCaption] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);

  // Frame Overlay Configuration State
  const [frameConfig, setFrameConfig] = useState<PhotoFrameConfig | null>(null);
  const [useFrameOverlay, setUseFrameOverlay] = useState<boolean>(true);

  useEffect(() => {
    fetchPhotoFrameConfig()
      .then((cfg) => {
        if (cfg) setFrameConfig(cfg);
      })
      .catch((err) => console.log('Frame config load info:', err));
  }, []);

  // Lightbox Modal & Social Share
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoMoment | null>(null);
  const [filterGuest, setFilterGuest] = useState<string>('all');
  const [openPickerPhotoId, setOpenPickerPhotoId] = useState<string | null>(null);
  const [showIGModal, setShowIGModal] = useState<boolean>(false);
  const [igSharePhoto, setIgSharePhoto] = useState<PhotoMoment | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Floating Emoji Reaction Animation Particles State
  interface FloatingParticle {
    id: string;
    emoji: string;
    x: number;
    y: number;
    rotation: number;
    scale: number;
  }
  const [floatingParticles, setFloatingParticles] = useState<FloatingParticle[]>([]);

  const triggerFloatingEmoji = useCallback((emoji: string, e?: React.MouseEvent) => {
    const originX = e && e.clientX ? e.clientX : window.innerWidth / 2;
    const originY = e && e.clientY ? e.clientY : window.innerHeight / 2;

    const newParticles: FloatingParticle[] = Array.from({ length: 6 }).map((_, i) => ({
      id: `${Date.now()}-${Math.random()}-${i}`,
      emoji,
      x: originX + (Math.random() * 80 - 40),
      y: originY + (Math.random() * 30 - 15),
      rotation: Math.random() * 50 - 25,
      scale: 0.8 + Math.random() * 0.6,
    }));

    setFloatingParticles((prev) => [...prev, ...newParticles]);

    setTimeout(() => {
      setFloatingParticles((prev) =>
        prev.filter((p) => !newParticles.some((np) => np.id === p.id))
      );
    }, 1500);
  }, []);

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Sync camera stream to video element whenever camera is active
  useEffect(() => {
    if (isCameraOpen && !capturedDataUrl && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch((e) => console.log('Camera play error:', e));
      }
    }
  }, [isCameraOpen, capturedDataUrl, facingMode]);

  // Sync guest name when prop updates
  useEffect(() => {
    if (effectiveGuest?.name) {
      setGuestName(effectiveGuest.name);
    } else if (defaultGuestName && defaultGuestName !== 'Tamu Undangan') {
      setGuestName(defaultGuestName);
    }
  }, [effectiveGuest, defaultGuestName]);

  // Check if a photo belongs to the current guest (matched by URL guest name & code)
  const isPhotoMine = useCallback(
    (photo: PhotoMoment) => {
      if (!photo) return false;

      const urlParams = new URLSearchParams(window.location.search);
      const rawCode = (
        urlParams.get('c') ||
        urlParams.get('code') ||
        urlParams.get('slug') ||
        urlParams.get('u') ||
        effectiveGuest?.slug ||
        ''
      ).trim().toLowerCase();

      const rawName = (
        urlParams.get('to') ||
        urlParams.get('guest') ||
        urlParams.get('nama') ||
        effectiveGuest?.name ||
        guestName ||
        ''
      ).trim().toLowerCase();

      const isGenericName = !rawName || rawName === 'tamu undangan';

      const photoSlug = (photo.guestSlug || '').trim().toLowerCase();
      const photoName = (photo.guestName || '').trim().toLowerCase();

      // 1. Both guest code and non-generic guest name exist in URL context
      if (rawCode && !isGenericName) {
        if (photoSlug) {
          return photoSlug === rawCode && photoName === rawName;
        }
        return photoName === rawName;
      }

      // 2. Only guest code exists in URL context
      if (rawCode) {
        return photoSlug === rawCode;
      }

      // 3. Only non-generic guest name exists in URL context
      if (!isGenericName) {
        return photoName === rawName;
      }

      // Fallback for session upload if no URL context exists
      return myUploadedPhotoIds.includes(photo.id);
    },
    [effectiveGuest, guestName, myUploadedPhotoIds]
  );

  // Load photo moments list from server (paginated by limit 10)
  const loadMoments = useCallback(
    async (isReset = true) => {
      if (isFetchingRef.current && !isReset) return;
      try {
        isFetchingRef.current = true;
        if (isReset) {
          setIsLoading(true);
          pageRef.current = 1;
          setPage(1);
        } else {
          setIsFetchingNextPage(true);
        }

        const targetPage = isReset ? 1 : pageRef.current + 1;
        const res = await fetchPhotoMoments(guestName, effectiveGuest?.slug, targetPage, 10);

        setPhotoMoments((prev) => {
          if (isReset) return res.data;
          const existingIds = new Set(prev.map((p) => p.id));
          const newUnique = res.data.filter((p) => !existingIds.has(p.id));
          return [...prev, ...newUnique];
        });

        setUserPhotoCount(res.userCount);
        setHasMore(res.hasMore);
        pageRef.current = targetPage;
        setPage(targetPage);
        setErrorMsg(null);
      } catch (err: any) {
        console.error('Failed to load photo moments:', err);
        if (isReset) {
          setErrorMsg('Gagal memuat galeri foto tamu.');
        }
      } finally {
        setIsLoading(false);
        setIsFetchingNextPage(false);
        isFetchingRef.current = false;
      }
    },
    [guestName, effectiveGuest]
  );

  useEffect(() => {
    loadMoments(true);
  }, [guestName, effectiveGuest]);

  // Infinite Scroll IntersectionObserver trigger
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !isFetchingRef.current && !isLoading) {
        loadMoments(false);
      }
    },
    [hasMore, isLoading, loadMoments]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '250px',
      threshold: 0.1,
    });
    const currentRef = loadMoreRef.current;
    if (currentRef) observer.observe(currentRef);

    return () => {
      if (currentRef) observer.unobserve(currentRef);
      observer.disconnect();
    };
  }, [handleObserver]);

  // Clean up camera stream on component unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Start Camera Stream
  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    try {
      setCameraError(null);
      stopCamera(); // Stop existing stream first

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setFacingMode(mode);
      setIsCameraOpen(true);
    } catch (err: any) {
      console.error('Error starting camera:', err);
      setCameraError(
        'Tidak dapat mengaktifkan kamera. Pastikan Anda telah memberikan izin akses kamera di peramban web.'
      );
      setIsCameraOpen(true);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Close Camera Viewfinder
  const handleCloseCamera = () => {
    stopCamera();
    setIsCameraOpen(false);
    setCapturedDataUrl(null);
    setActiveFilter('normal');
    setCaption('');
    setCameraError(null);
  };

  // Switch Camera Facing Mode
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    startCamera(nextMode);
  };

  // Snap Photo
  const handleSnapPhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    // Trigger flash animation
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Constrain capture dimensions to max 1280px for performance
    let targetW = video.videoWidth || 640;
    let targetH = video.videoHeight || 480;
    const maxDim = 1280;
    if (targetW > maxDim || targetH > maxDim) {
      if (targetW > targetH) {
        targetH = Math.round((targetH * maxDim) / targetW);
        targetW = maxDim;
      } else {
        targetW = Math.round((targetW * maxDim) / targetH);
        targetH = maxDim;
      }
    }

    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Flip horizontally if front camera for natural selfie orientation
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const rawDataUrl = canvas.toDataURL('image/jpeg', 0.85);

      // Client-side auto compression for optimal bandwidth savings
      const compressedDataUrl = await compressImageDataUrl(rawDataUrl, 1080, 1080, 0.75);
      setCapturedDataUrl(compressedDataUrl);
      stopCamera();
    }
  };

  // Re-take Photo
  const handleRetake = () => {
    setCapturedDataUrl(null);
    setActiveFilter('normal');
    startCamera(facingMode);
  };

  // Submit Captured Photo with Filter Application & Client-side Compression
  const handleSubmitPhoto = async () => {
    if (!capturedDataUrl) return;

    if (!guestName.trim()) {
      alert('Mohon isi nama Anda terlebih dahulu.');
      return;
    }

    if (userPhotoCount >= 3) {
      alert('Anda telah mencapai batas maksimal 3 foto.');
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Apply selected photo filter directly onto canvas dataUrl
      const selectedPreset = PHOTO_FILTER_PRESETS.find((p) => p.id === activeFilter);
      let processedPhoto = capturedDataUrl;
      if (selectedPreset && selectedPreset.canvasFilter !== 'none') {
        processedPhoto = await applyFilterToCanvasDataUrl(capturedDataUrl, selectedPreset.canvasFilter);
      }

      // 2. Automatically apply PNG frame overlay if enabled by host and turned on by guest
      if (frameConfig?.enabled && frameConfig?.frameOverlayUrl && useFrameOverlay) {
        processedPhoto = await applyFrameOverlayToDataUrl(processedPhoto, frameConfig.frameOverlayUrl);
      }

      // 3. Final automatic compression check
      const compressedPhoto = await compressImageDataUrl(processedPhoto, 1080, 1080, 0.78);

      // 4. Convert Data URL to binary File object and upload to server storage under 'moments' folder
      const arr = compressedPhoto.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const fileToUpload = new File([u8arr], `moment-${Date.now()}.jpg`, { type: mime });
      const uploadedServerUrl = await uploadFileToServer(fileToUpload, 'moments');

      const createdPhoto = await submitPhotoMoment({
        guestName: guestName.trim(),
        guestSlug: effectiveGuest?.slug,
        photoUrl: uploadedServerUrl,
        caption: caption.trim(),
      });

      if (createdPhoto && createdPhoto.id) {
        setMyUploadedPhotoIds((prev) => [...prev, createdPhoto.id]);
      }

      handleCloseCamera();
      await loadMoments();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan foto moment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Social Share Handlers
  const handleShareWhatsApp = (photo: PhotoMoment) => {
    const shareUrl = window.location.href;
    const captionText = photo.caption ? `"${photo.caption}" - ` : '';
    const text = `Lihat foto momen pernikahan Arya & Nadhira oleh ${photo.guestName}: ${captionText}\n\n${shareUrl}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShareInstagram = async (photo: PhotoMoment) => {
    setIgSharePhoto(photo);

    // Try native file sharing via Web Share API if supported (Android / iOS)
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.share) {
      try {
        const response = await fetch(photo.photoUrl);
        const blob = await response.blob();
        const file = new File([blob], `wedding-story-${photo.guestName.replace(/\s+/g, '-')}.jpg`, {
          type: blob.type || 'image/jpeg',
        });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Photo Moment - ${photo.guestName}`,
            text: photo.caption || `Foto momen pernikahan Arya & Nadhira oleh ${photo.guestName}`,
          });
          return;
        }
      } catch (err: any) {
        // If user canceled the share dialog, do not show fallback modal
        if (err.name === 'AbortError') {
          return;
        }
        console.log('Native file share skipped or unsupported:', err);
      }
    }

    // Fallback for desktop or unsupported browsers
    setShowIGModal(true);
  };

  const handleShareGeneral = async (photo: PhotoMoment) => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Momen Pernikahan - ${photo.guestName}`,
          text: `Lihat foto momen pernikahan Arya & Nadhira oleh ${photo.guestName}`,
          url: shareUrl,
        });
        return;
      } catch (e) {
        console.log('Share canceled or unsupported', e);
      }
    }

    // Fallback: Copy URL to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setToastMsg('Tautan foto berhasil disalin!');
      setTimeout(() => setToastMsg(null), 3000);
    } catch {
      setToastMsg('Gagal menyalin tautan.');
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  // Handle Emoji React (with Undo support)
  const handleEmojiReact = async (photoId: string, emoji: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const currentEmoji = myReactions[photoId];

    if (currentEmoji === emoji) {
      // UNDO REACT!
      try {
        setMyReactions((prev) => {
          const copy = { ...prev };
          delete copy[photoId];
          return copy;
        });

        setPhotoMoments((prev) =>
          prev.map((p) => {
            if (p.id !== photoId) return p;
            const newReactions = { ...(p.reactions || {}) };
            newReactions[emoji] = Math.max(0, (newReactions[emoji] || 1) - 1);
            if (newReactions[emoji] === 0) delete newReactions[emoji];
            const newLikes = Math.max(0, (p.likesCount || 1) - 1);
            return { ...p, likesCount: newLikes, reactions: newReactions };
          })
        );

        if (selectedPhoto && selectedPhoto.id === photoId) {
          setSelectedPhoto((prev) => {
            if (!prev) return null;
            const newReactions = { ...(prev.reactions || {}) };
            newReactions[emoji] = Math.max(0, (newReactions[emoji] || 1) - 1);
            if (newReactions[emoji] === 0) delete newReactions[emoji];
            return {
              ...prev,
              likesCount: Math.max(0, (prev.likesCount || 1) - 1),
              reactions: newReactions,
            };
          });
        }

        await reactPhotoMomentApi(photoId, emoji, 'remove');
      } catch (err) {
        console.error('Failed to undo reaction:', err);
      }
    } else if (currentEmoji) {
      // SWAP EMOJI: UNDO currentEmoji, ADD target emoji
      triggerFloatingEmoji(emoji, e);
      try {
        setMyReactions((prev) => ({ ...prev, [photoId]: emoji }));

        setPhotoMoments((prev) =>
          prev.map((p) => {
            if (p.id !== photoId) return p;
            const newReactions = { ...(p.reactions || {}) };
            newReactions[currentEmoji] = Math.max(0, (newReactions[currentEmoji] || 1) - 1);
            if (newReactions[currentEmoji] === 0) delete newReactions[currentEmoji];
            newReactions[emoji] = (newReactions[emoji] || 0) + 1;
            return { ...p, reactions: newReactions };
          })
        );

        await reactPhotoMomentApi(photoId, currentEmoji, 'remove');
        const res = await reactPhotoMomentApi(photoId, emoji, 'add');

        setPhotoMoments((prev) =>
          prev.map((p) =>
            p.id === photoId ? { ...p, likesCount: res.likesCount, reactions: res.reactions } : p
          )
        );
        if (selectedPhoto && selectedPhoto.id === photoId) {
          setSelectedPhoto((prev) =>
            prev ? { ...prev, likesCount: res.likesCount, reactions: res.reactions } : null
          );
        }
      } catch (err) {
        console.error('Failed to swap reaction:', err);
      }
    } else {
      // ADD NEW REACTION
      triggerFloatingEmoji(emoji, e);
      try {
        setMyReactions((prev) => ({ ...prev, [photoId]: emoji }));

        setPhotoMoments((prev) =>
          prev.map((p) => {
            if (p.id !== photoId) return p;
            const newReactions = { ...(p.reactions || {}) };
            newReactions[emoji] = (newReactions[emoji] || 0) + 1;
            return { ...p, likesCount: (p.likesCount || 0) + 1, reactions: newReactions };
          })
        );

        const res = await reactPhotoMomentApi(photoId, emoji, 'add');

        setPhotoMoments((prev) =>
          prev.map((p) =>
            p.id === photoId ? { ...p, likesCount: res.likesCount, reactions: res.reactions } : p
          )
        );
        if (selectedPhoto && selectedPhoto.id === photoId) {
          setSelectedPhoto((prev) =>
            prev ? { ...prev, likesCount: res.likesCount, reactions: res.reactions } : null
          );
        }
      } catch (err) {
        console.error('Failed to add reaction:', err);
      }
    }
  };

  // Guest photos
  const myPhotos = photoMoments.filter((m) => isPhotoMine(m));
  const lastMyPhoto = myPhotos.length > 0 ? myPhotos[0] : null;

  // Filter moments
  const filteredMoments = photoMoments.filter((m) => {
    if (filterGuest === 'mine') {
      return isPhotoMine(m);
    }
    return true;
  });

  const maxReached = userPhotoCount >= 3;

  // Lightbox Navigation & Swipe State
  const currentPhotoIndex = filteredMoments.findIndex((m) => m.id === selectedPhoto?.id);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const handlePrevPhoto = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (filteredMoments.length === 0) return;
      const prevIdx =
        (currentPhotoIndex - 1 + filteredMoments.length) % filteredMoments.length;
      setSelectedPhoto(filteredMoments[prevIdx]);
    },
    [currentPhotoIndex, filteredMoments]
  );

  const handleNextPhoto = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (filteredMoments.length === 0) return;
      const nextIdx = (currentPhotoIndex + 1) % filteredMoments.length;
      setSelectedPhoto(filteredMoments[nextIdx]);
    },
    [currentPhotoIndex, filteredMoments]
  );

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!selectedPhoto) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevPhoto();
      } else if (e.key === 'ArrowRight') {
        handleNextPhoto();
      } else if (e.key === 'Escape') {
        setSelectedPhoto(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhoto, handlePrevPhoto, handleNextPhoto]);

  // Touch Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    if (diff > 40) {
      handleNextPhoto(); // Swiped left -> next photo
    } else if (diff < -40) {
      handlePrevPhoto(); // Swiped right -> prev photo
    }
    setTouchStartX(null);
  };

  return (
    <section id="photo-moments" className="py-6 px-3 sm:px-6 min-h-screen bg-black text-white relative pb-32">
      <div className="max-w-xl mx-auto">
        {/* Top Header matching mockup */}
        <div className="flex items-center justify-between mb-5 pt-2 pr-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-full bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-white transition-all cursor-pointer shrink-0"
                title="Kembali ke Undangan"
              >
                <ArrowLeft className="w-4.5 h-4.5" />
              </button>
            )}
            <h1 className="text-xl sm:text-2xl font-black tracking-wider text-white font-sans uppercase">
              PHOTO MOMENTS
            </h1>
          </div>
        </div>

        {/* Navigation Tabs Bar: All Photos vs My Photos */}
        <div className="flex items-center gap-1.5 mb-5 p-1 bg-stone-900/90 rounded-2xl border border-stone-800/80 shadow-inner">
          <button
            type="button"
            onClick={() => setFilterGuest('all')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              filterGuest === 'all'
                ? 'bg-amber-500 text-stone-950 shadow-md font-extrabold scale-[1.01]'
                : 'text-stone-400 hover:text-white hover:bg-stone-800/60'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Semua Foto</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                filterGuest === 'all'
                  ? 'bg-stone-950/20 text-stone-950'
                  : 'bg-stone-800 text-stone-400'
              }`}
            >
              {photoMoments.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterGuest('mine')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              filterGuest === 'mine'
                ? 'bg-amber-500 text-stone-950 shadow-md font-extrabold scale-[1.01]'
                : 'text-stone-400 hover:text-white hover:bg-stone-800/60'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Foto Saya</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                filterGuest === 'mine'
                  ? 'bg-stone-950/20 text-stone-950'
                  : 'bg-stone-800 text-stone-400'
              }`}
            >
              {myPhotos.length}
            </span>
          </button>
        </div>

        {/* Gallery Content Grid (2 Columns like Mockup) */}
        {isLoading ? (
          <div className="py-24 text-center">
            <div className="inline-block w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-stone-400 text-xs font-medium">Memuat galeri foto...</p>
          </div>
        ) : errorMsg ? (
          <div className="bg-rose-950/60 border border-rose-800 rounded-2xl p-6 text-center text-rose-300 text-xs">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-rose-400" />
            <p>{errorMsg}</p>
          </div>
        ) : filteredMoments.length === 0 ? (
          <div className="bg-stone-900/80 rounded-3xl p-10 text-center border border-stone-800 shadow-2xl max-w-sm mx-auto my-8">
            <div className="w-14 h-14 rounded-2xl bg-stone-800 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-stone-700">
              <Camera className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-white text-base mb-1">
              {filterGuest === 'mine' ? 'Belum Ada Foto Anda' : 'Belum Ada Foto Terpotret'}
            </h4>
            <p className="text-xs text-stone-400 mb-6 leading-relaxed">
              Abadikan momen resepsi indah ini langsung dengan kamera ponsel Anda!
            </p>
            <button
              type="button"
              onClick={() => startCamera('user')}
              disabled={maxReached}
              className="px-6 py-3 bg-white text-black rounded-full text-xs font-bold hover:bg-stone-200 transition-all cursor-pointer shadow-lg active:scale-95"
            >
              Ambil Foto Pertama
            </button>
          </div>
        ) : (
          /* 2-Column Grid matching Mockup */
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {filteredMoments.map((photo, index) => {
                const isPickerOpen = openPickerPhotoId === photo.id;
                return (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
                    onClick={() => setSelectedPhoto(photo)}
                    className={`relative aspect-4/5 rounded-2xl sm:rounded-3xl bg-stone-900 group cursor-pointer border border-stone-800/80 shadow-lg hover:border-stone-700 transition-all ${
                      isPickerOpen ? 'z-30' : 'z-10 hover:z-20'
                    }`}
                  >
                    {/* Photo Image & Gradient Wrapper with Rounded Corners and Overflow Hidden */}
                    <div className="absolute inset-0 rounded-2xl sm:rounded-3xl overflow-hidden">
                      <LazyBlurImage
                        src={photo.photoUrl}
                        alt={photo.guestName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      {/* Bottom Dark Gradient Overlay */}
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-10" />
                    </div>

                    {/* Card Bottom Controls */}
                    <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3.5 flex items-center justify-between z-20 gap-1">
                      {/* Guest Name */}
                      <div className="flex items-center gap-1.5 min-w-0 pr-1">
                        <span className="font-bold text-white text-xs sm:text-sm tracking-wide truncate drop-shadow-md">
                          {photo.guestName || 'Ahmad'}
                        </span>
                      </div>

                      {/* Interactive Emoji Reaction Component */}
                      <CardEmojiReaction
                        photoId={photo.id}
                        reactions={photo.reactions}
                        likesCount={photo.likesCount}
                        myReaction={myReactions[photo.id]}
                        onReact={(emoji, e) => handleEmojiReact(photo.id, emoji, e)}
                        onOpenChange={(isOpen) => setOpenPickerPhotoId(isOpen ? photo.id : null)}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Infinite Scroll Load More Indicator & Observer Sentinel */}
            <div ref={loadMoreRef} className="py-6 text-center w-full my-2">
              {isFetchingNextPage && (
                <div className="flex items-center justify-center gap-2 text-amber-400 text-xs font-semibold py-2 bg-stone-900/60 rounded-xl border border-stone-800/80 max-w-xs mx-auto">
                  <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <span>Memuat 10 foto selanjutnya...</span>
                </div>
              )}
              {!hasMore && filteredMoments.length > 0 && (
                <div className="text-stone-500 text-[11px] font-mono py-3">
                  • semua {filteredMoments.length} foto telah dimuat •
                </div>
              )}
            </div>
          </>
        )}

        {/* Floating Bottom Action Bar (Capture Button) */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <button
            type="button"
            onClick={() => startCamera('user')}
            disabled={maxReached}
            className="px-8 py-3.5 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 transition-all duration-200 border border-white/30 backdrop-blur-xl text-white font-bold text-sm sm:text-base flex items-center gap-2.5 shadow-2xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group"
          >
            <Camera className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
            <span className="tracking-wide">Capture</span>
          </button>
        </div>
      </div>

      {/* Hidden Canvas element for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera Viewfinder Modal - Fullscreen Disposable Camera View */}
      <AnimatePresence>
        {isCameraOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden select-none"
          >
            {/* Flash overlay */}
            {isFlashing && (
              <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-200" />
            )}

            {/* FULLSCREEN DISPLAY (VIDEO STREAM OR CAPTURED PHOTO) */}
            <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center overflow-hidden">
              {cameraError ? (
                <div className="p-6 text-center text-rose-400 max-w-sm z-10 bg-stone-900/90 rounded-3xl border border-stone-800 shadow-2xl">
                  <AlertCircle className="w-10 h-10 mx-auto mb-3 text-rose-500" />
                  <p className="text-xs leading-relaxed">{cameraError}</p>
                  <button
                    type="button"
                    onClick={handleCloseCamera}
                    className="mt-4 px-4 py-2 bg-stone-800 text-white text-xs font-bold rounded-xl"
                  >
                    Tutup Kamera
                  </button>
                </div>
              ) : capturedDataUrl ? (
                <img
                  src={capturedDataUrl}
                  alt="Captured photo preview"
                  style={{
                    filter:
                      PHOTO_FILTER_PRESETS.find((p) => p.id === activeFilter)?.css || 'none',
                  }}
                  className="w-full h-full object-cover transition-all duration-300"
                />
              ) : (
                <>
                  <video
                    ref={(el) => {
                      videoRef.current = el;
                      if (el && streamRef.current && el.srcObject !== streamRef.current) {
                        el.srcObject = streamRef.current;
                        el.play().catch((err) => console.log('Camera play catch:', err));
                      }
                    }}
                    playsInline
                    autoPlay
                    muted
                    className={`w-full h-full object-cover ${
                      facingMode === 'user' ? '-scale-x-100' : ''
                    }`}
                  />

                  {/* Camera rule-of-thirds grid overlay lines */}
                  <div className="absolute inset-0 border border-white/10 pointer-events-none grid grid-cols-3 grid-rows-3 z-10">
                    <div className="border-r border-b border-white/10" />
                    <div className="border-r border-b border-white/10" />
                    <div className="border-b border-white/10" />
                    <div className="border-r border-b border-white/10" />
                    <div className="border-r border-b border-white/10" />
                    <div className="border-b border-white/10" />
                  </div>
                </>
              )}

              {/* Live PNG Frame Overlay Layer */}
              {frameConfig?.enabled && frameConfig?.frameOverlayUrl && useFrameOverlay && (
                <img
                  src={frameConfig.frameOverlayUrl}
                  alt="Frame Overlay Template"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none z-15 select-none"
                />
              )}
            </div>

            {/* TOP OVERLAY HEADER */}
            <div className="relative z-20 pt-6 pb-12 px-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between text-white">
              <button
                type="button"
                onClick={handleCloseCamera}
                className="p-3 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-all cursor-pointer active:scale-90"
                title="Tutup Kamera"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex flex-col items-center text-center">
                <span className="font-['Playfair_Display'] font-bold text-base tracking-wide text-white drop-shadow-md">
                  {capturedDataUrl ? 'Preview Hasil Foto' : 'Photo Moments'}
                </span>
                <span className="text-[10px] text-amber-300 font-semibold tracking-widest uppercase drop-shadow-xs flex items-center gap-1">
                  <span>Disposable Camera</span>
                  {frameConfig?.enabled && useFrameOverlay && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-400/30">
                      + Frame PNG
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {frameConfig?.enabled && (
                  <button
                    type="button"
                    onClick={() => setUseFrameOverlay((prev) => !prev)}
                    className={`p-2.5 rounded-full backdrop-blur-md transition-all cursor-pointer active:scale-90 border ${
                      useFrameOverlay
                        ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md font-bold'
                        : 'bg-black/40 text-stone-400 border-white/20'
                    }`}
                    title={useFrameOverlay ? 'Matikan Frame PNG' : 'Gunakan Frame PNG'}
                  >
                    <Frame className="w-5 h-5" />
                  </button>
                )}

                {!capturedDataUrl && (
                  <button
                    type="button"
                    onClick={handleToggleFacingMode}
                    className="p-3 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-all cursor-pointer active:scale-90"
                    title="Tukar Kamera Depan/Belakang"
                  >
                    <SwitchCamera className="w-6 h-6" />
                  </button>
                )}
              </div>
            </div>

            {/* BOTTOM OVERLAY CONTROLS */}
            {!capturedDataUrl ? (
              <div className="relative z-20 pb-8 pt-16 px-6 sm:px-12 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between">
                {/* BOTTOM LEFT: REMAINING COUNT */}
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-black/50 border border-white/20 backdrop-blur-md shadow-xl shrink-0">
                  <Film className="w-4 h-4 text-amber-400" />
                  <div className="flex flex-col">
                    <span className="font-mono font-black text-lg text-white leading-none">
                      {Math.max(0, 3 - userPhotoCount)}
                    </span>
                    <span className="text-[8px] font-bold text-stone-300 tracking-wider uppercase leading-none mt-0.5">
                      Sisa Foto
                    </span>
                  </div>
                </div>

                {/* BOTTOM CENTER: SHUTTER BUTTON */}
                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={handleSnapPhoto}
                    disabled={Boolean(cameraError) || maxReached}
                    className="relative w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1.5 shadow-2xl active:scale-90 transition-transform cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group"
                    title={maxReached ? 'Batas maksimal 3 foto tercapai' : 'Ambil Foto'}
                  >
                    <div className="w-full h-full rounded-full bg-white group-hover:bg-amber-100 transition-colors shadow-inner" />
                  </button>
                </div>

                {/* BOTTOM RIGHT: PREVIEW THUMBNAIL */}
                {(() => {
                  const lastUserPhoto = photoMoments.find((m) => isPhotoMine(m));
                  return lastUserPhoto ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseCamera();
                        setSelectedPhoto(lastUserPhoto);
                      }}
                      className="w-12 h-12 rounded-xl border-2 border-white/90 overflow-hidden shadow-2xl active:scale-90 transition-transform cursor-pointer relative group shrink-0"
                      title="Lihat Foto Terakhir"
                    >
                      <img
                        src={lastUserPhoto.photoUrl}
                        alt="Foto terakhir"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                    </button>
                  ) : (
                    <div
                      className="w-12 h-12 rounded-xl border-2 border-white/30 bg-black/40 backdrop-blur-md flex items-center justify-center text-white/50 shrink-0"
                      title="Belum ada foto yang diunggah"
                    >
                      <ImageIcon className="w-5 h-5 text-white/70" />
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* CAPTURED PREVIEW ACTIONS, FILTER SELECTION & CAPTION FORM */
              <div className="relative z-20 pb-8 pt-6 px-5 sm:px-8 bg-gradient-to-t from-black/95 via-black/85 to-transparent space-y-3">
                {/* Photo Filter Selection Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-stone-300 px-1">
                    <span className="flex items-center gap-1.5 text-amber-300">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Pilih Filter Foto</span>
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {PHOTO_FILTER_PRESETS.find((p) => p.id === activeFilter)?.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar scrollbar-none">
                    {PHOTO_FILTER_PRESETS.map((preset) => {
                      const isActive = activeFilter === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setActiveFilter(preset.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1 border ${
                            isActive
                              ? 'bg-amber-400 text-stone-950 border-amber-300 font-extrabold shadow-lg scale-105'
                              : 'bg-white/10 text-stone-300 border-white/20 hover:bg-white/20'
                          }`}
                        >
                          <span>{preset.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Tulis pesan atau ucapan singkat untuk foto ini (opsional)..."
                  className="w-full bg-white/10 border border-white/20 backdrop-blur-md rounded-2xl px-4 py-3 text-xs text-white placeholder-stone-400 focus:outline-hidden focus:border-amber-400 focus:bg-black/50 transition-all"
                />

                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleRetake}
                    disabled={isSubmitting}
                    className="px-4 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center gap-2 backdrop-blur-md transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Foto Ulang</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmitPhoto}
                    disabled={isSubmitting}
                    className="flex-1 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Mengunggah...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Kirim ke Galeri Tamu</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Immersive Fullscreen Lightbox Photo Viewer Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden select-none"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* TOP FLOATING OVERLAY HEADER */}
            <div className="absolute top-0 inset-x-0 z-30 pt-5 pb-12 px-4 sm:px-8 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between pointer-events-auto">
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="p-2.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer active:scale-90"
                title="Tutup (Esc)"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Photo Index Counter Badge */}
              <div className="px-3.5 py-1 bg-black/60 backdrop-blur-md border border-white/20 rounded-full text-xs font-mono font-black text-amber-300 shadow-xl tracking-wider">
                {currentPhotoIndex >= 0 ? currentPhotoIndex + 1 : 1} / {filteredMoments.length}
              </div>

              {/* Spacer for header layout symmetry */}
              <div className="w-10 h-10" />
            </div>

            {/* FULLSCREEN IMAGE STAGE */}
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black">
              {/* Previous Photo Floating Navigation Arrow */}
              {filteredMoments.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrevPhoto}
                  className="absolute left-3 sm:left-6 z-30 p-3 sm:p-4 rounded-full bg-black/40 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer active:scale-90 shadow-2xl group"
                  title="Foto Sebelumnya (Panah Kiri)"
                >
                  <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7 group-hover:-translate-x-0.5 transition-transform" />
                </button>
              )}

              {/* Main Photo with smooth key animation */}
              <AnimatePresence mode="wait">
                <motion.img
                  key={selectedPhoto.id}
                  src={selectedPhoto.photoUrl}
                  alt={`Moment by ${selectedPhoto.guestName}`}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  className="w-full h-full object-contain max-h-screen max-w-full select-none"
                />
              </AnimatePresence>

              {/* Next Photo Floating Navigation Arrow */}
              {filteredMoments.length > 1 && (
                <button
                  type="button"
                  onClick={handleNextPhoto}
                  className="absolute right-3 sm:right-6 z-30 p-3 sm:p-4 rounded-full bg-black/40 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer active:scale-90 shadow-2xl group"
                  title="Foto Selanjutnya (Panah Kanan)"
                >
                  <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>

            {/* BOTTOM FLOATING OVERLAY PANEL */}
            <div className="absolute bottom-0 inset-x-0 z-30 pb-6 pt-16 px-5 sm:px-8 bg-gradient-to-t from-black/95 via-black/75 to-transparent flex flex-col gap-3 text-white pointer-events-auto max-w-2xl mx-auto">
              {/* Guest Info & Caption */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-white text-base sm:text-lg tracking-wide drop-shadow-md">
                      {selectedPhoto.guestName || 'Ahmad'}
                    </h3>
                    {isPhotoMine(selectedPhoto) && (
                      <span className="bg-amber-400 text-stone-950 font-black text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                        Saya
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] sm:text-xs text-stone-300 font-mono drop-shadow-xs">
                    {new Date(selectedPhoto.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {selectedPhoto.caption && (
                  <p className="text-xs sm:text-sm text-stone-200 italic leading-snug drop-shadow-sm line-clamp-3">
                    "{selectedPhoto.caption}"
                  </p>
                )}
              </div>

              {/* Interactive Emoji Reactions Floating Bar Overlay */}
              <div className="pt-1 flex items-center justify-center">
                <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-xl p-2 rounded-2xl border border-white/20 shadow-2xl max-w-full overflow-x-auto no-scrollbar">
                  {EMOJI_OPTIONS.map((emoji) => {
                    const count = selectedPhoto.reactions?.[emoji] || 0;
                    const isSelectedByMe = myReactions[selectedPhoto.id] === emoji;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={(e) => handleEmojiReact(selectedPhoto.id, emoji, e)}
                        title={isSelectedByMe ? `Batalkan ${emoji}` : `Berikan ${emoji}`}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-90 shrink-0 ${
                          isSelectedByMe
                            ? 'bg-amber-400 text-stone-950 font-black shadow-lg ring-2 ring-amber-300 scale-105'
                            : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                        }`}
                      >
                        <span className="text-base">{emoji}</span>
                        {count > 0 && (
                          <span className="text-[11px] font-extrabold">{count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Social Sharing Action Bar */}
              <div className="pt-1 flex items-center justify-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(selectedPhoto)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-xl transition-all active:scale-95 cursor-pointer border border-emerald-400/30"
                  title="Bagikan Foto ke WhatsApp"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShareInstagram(selectedPhoto)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:brightness-110 text-white font-bold text-xs flex items-center gap-2 shadow-xl transition-all active:scale-95 cursor-pointer border border-pink-400/30"
                  title="Bagikan ke Instagram Stories"
                >
                  <Instagram className="w-4 h-4 text-white" />
                  <span>IG Stories</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShareGeneral(selectedPhoto)}
                  className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-stone-200 font-semibold text-xs flex items-center gap-1.5 backdrop-blur-md transition-all active:scale-95 cursor-pointer border border-white/20"
                  title="Bagikan / Salin Tautan Foto"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Bagikan</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instagram Story Helper Modal */}
      <AnimatePresence>
        {showIGModal && igSharePhoto && (
          <div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowIGModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-md w-full bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-2xl text-white space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 text-white">
                    <Instagram className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base">Bagikan ke Instagram Story</h3>
                    <p className="text-[11px] text-stone-400">Ikuti 2 langkah mudah berikut:</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIGModal(false)}
                  className="p-2 rounded-full bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Photo Preview Thumbnail */}
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-stone-800 bg-black">
                <img
                  src={igSharePhoto.photoUrl}
                  alt="IG Story Share Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                  <span className="text-xs font-bold text-amber-300">
                    Foto oleh {igSharePhoto.guestName}
                  </span>
                </div>
              </div>

              {/* Steps List */}
              <div className="space-y-3 bg-stone-850 p-4 rounded-2xl border border-stone-800 text-xs text-stone-300">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </span>
                  <p>
                    Klik <strong>"Unduh Foto"</strong> di bawah untuk menyimpan gambar ke galeri HP Anda.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </span>
                  <p>
                    Buka aplikasi <strong>Instagram</strong>, buat Story baru, lalu pilih foto dari galeri HP Anda.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = igSharePhoto.photoUrl;
                    link.download = `wedding-story-${igSharePhoto.id}.jpg`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="flex-1 px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Foto</span>
                </button>

                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg hover:brightness-110 transition-all active:scale-95 cursor-pointer"
                >
                  <Instagram className="w-4 h-4" />
                  <span>Buka Instagram</span>
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-stone-900 border border-amber-500/40 text-amber-300 font-bold text-xs rounded-2xl shadow-2xl flex items-center gap-2 backdrop-blur-md"
          >
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Floating Emoji Reaction Animation Particles Layer */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        <AnimatePresence>
          {floatingParticles.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{
                opacity: 1,
                scale: 0.5,
                x: particle.x,
                y: particle.y,
                rotate: particle.rotation,
              }}
              animate={{
                opacity: 0,
                scale: particle.scale * 1.6,
                y: particle.y - 140 - Math.random() * 60,
                x: particle.x + (Math.random() * 80 - 40),
                rotate: particle.rotation + (Math.random() * 60 - 30),
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.3, ease: 'easeOut' }}
              className="fixed top-0 left-0 text-2xl sm:text-3xl select-none filter drop-shadow-md"
            >
              {particle.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
};
