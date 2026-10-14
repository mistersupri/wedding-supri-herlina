import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, Image as ImageIcon, Trash2, RefreshCw, Link as LinkIcon, Check, Eye, X, AlertCircle, Video, Film } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { uploadFileToServer } from '../../lib/api.js';

interface ImageUploadInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholderText?: string;
  hint?: string;
  aspectRatio?: 'square' | 'portrait' | 'landscape' | 'banner' | 'auto';
  maxDimension?: number;
  quality?: number;
  showUrlToggle?: boolean;
  allowVideo?: boolean;
  category?: 'hero' | 'gallery' | 'couples' | 'moments' | 'general';
}

export const ImageUploadInput: React.FC<ImageUploadInputProps> = ({
  value,
  onChange,
  label,
  placeholderText = 'Tarik & lepas foto/video di sini, atau klik untuk memilih file',
  hint = 'Mendukung format JPG, PNG, WEBP, MP4, WEBM.',
  aspectRatio = 'auto',
  maxDimension = 1600,
  quality = 0.85,
  showUrlToggle = true,
  allowVideo = false,
  category = 'general',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileStats, setFileStats] = useState<string | null>(null);
  const [mode, setMode] = useState<'upload' | 'url'>(value && value.startsWith('http') ? 'url' : 'upload');
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isValueVideo =
    allowVideo &&
    (value.startsWith('data:video/') ||
      value.endsWith('.mp4') ||
      value.endsWith('.webm') ||
      value.endsWith('.mov') ||
      value.includes('/video/') ||
      value.includes('/hero/'));

  // Direct server upload for images & video files (No Base64)
  const processImageFile = useCallback(async (file: File) => {
    setErrorMessage(null);

    // Handle Video files if enabled
    if (file.type.startsWith('video/')) {
      if (!allowVideo) {
        setErrorMessage('Format file video tidak diizinkan di bagian ini.');
        return;
      }

      if (file.size > 90 * 1024 * 1024) {
        setErrorMessage('Ukuran file video terlalu besar (Maksimal 90MB). Disarankan kompres video terlebih dahulu.');
        return;
      }

      setIsProcessing(true);
      const originalSizeMb = (file.size / (1024 * 1024)).toFixed(2);

      try {
        const uploadedUrl = await uploadFileToServer(file, category as 'hero' | 'gallery' | 'couples' | 'moments' | 'general');
        onChange(uploadedUrl);
        setFileStats(`Video (${file.type}) — ${originalSizeMb} MB [Tersimpan di server: ${category}]`);
      } catch (err: any) {
        setErrorMessage(err.message || 'Gagal mengunggah video ke server storage.');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrorMessage(
        allowVideo
          ? 'File harus berupa gambar (JPG, PNG, WEBP) atau video (MP4, WEBM).'
          : 'File harus berupa gambar (JPG, PNG, WEBP, atau GIF).'
      );
      return;
    }

    setIsProcessing(true);
    const originalSizeKb = Math.round(file.size / 1024);

    try {
      // 1. Process image on canvas to optimize dimensions
      const canvasBlob = await new Promise<Blob>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (ctx) {
              if (file.type === 'image/png' || file.type === 'image/jpeg') {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
              }
              ctx.drawImage(img, 0, 0, width, height);
              const outputFormat = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
              canvas.toBlob(
                (blob) => {
                  resolve(blob || file);
                },
                outputFormat,
                quality
              );
            } else {
              resolve(file);
            }
          };
          img.onerror = () => resolve(file);
          img.src = e.target?.result as string;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
      });

      const fileToUpload = new File([canvasBlob], file.name, {
        type: canvasBlob.type || file.type || 'image/jpeg',
      });

      // 2. Upload file directly to server storage
      const uploadedUrl = await uploadFileToServer(fileToUpload, category as 'hero' | 'gallery' | 'couples' | 'moments' | 'general');
      const compressedSizeKb = Math.round(fileToUpload.size / 1024);

      onChange(uploadedUrl);
      setFileStats(`${originalSizeKb} KB → ${compressedSizeKb} KB [Server: ${category}]`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengunggah foto ke server storage.');
    } finally {
      setIsProcessing(false);
    }
  }, [maxDimension, quality, onChange, allowVideo, category]);

  // Drag event handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processImageFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processImageFile(file);
    }
  };

  const handleRemove = () => {
    onChange('');
    setFileStats(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getAspectClass = () => {
    switch (aspectRatio) {
      case 'square':
        return 'aspect-square max-h-48';
      case 'portrait':
        return 'aspect-3/4 max-h-56';
      case 'landscape':
        return 'aspect-16/9 max-h-48';
      case 'banner':
        return 'aspect-21/9 max-h-40';
      default:
        return 'max-h-48';
    }
  };

  return (
    <div className="space-y-1.5 w-full">
      {/* Header with Label and Mode Switcher */}
      <div className="flex items-center justify-between">
        {label && (
          <label className="block text-xs font-semibold text-stone-700">
            {label}
          </label>
        )}
        {showUrlToggle && (
          <div className="flex items-center gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                mode === 'upload'
                  ? 'bg-stone-200 text-stone-900 font-semibold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Upload / Drag & Drop
            </button>
            <span className="text-stone-300">|</span>
            <button
              type="button"
              onClick={() => setMode('url')}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                mode === 'url'
                  ? 'bg-stone-200 text-stone-900 font-semibold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Input URL
            </button>
          </div>
        )}
      </div>

      {/* Mode: URL Direct Input */}
      {mode === 'url' ? (
        <div className="space-y-2">
          <div className="relative flex items-center">
            <LinkIcon className="w-3.5 h-3.5 absolute left-3 text-stone-400" />
            <input
              type="url"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full pl-8 pr-8 py-2 rounded-xl border border-stone-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
            />
            {value && (
              <button
                type="button"
                onClick={handleRemove}
                className="absolute right-2.5 p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {value && (
            <div className="flex items-center gap-3 p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs">
              <img
                src={value}
                alt="Preview"
                className="w-12 h-12 rounded-lg object-cover border border-stone-200 shrink-0 bg-stone-100"
                onError={() => setErrorMessage('URL gambar tidak valid atau tidak dapat dimuat.')}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-stone-700 truncate">{value}</p>
                <p className="text-[10px] text-stone-400">Pratinjau Tautan Eksternal</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                className="p-1.5 rounded-lg border text-stone-600 hover:bg-stone-100"
                title="Lihat Penuh"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Mode: Drag & Drop File Upload */
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={allowVideo ? 'image/*,video/*' : 'image/*'}
            onChange={handleFileSelect}
            className="hidden"
          />

          {value ? (
            /* Uploaded Media Preview & Action Controls */
            <div className="relative group rounded-2xl border-2 border-stone-200 bg-stone-50/70 p-2.5 overflow-hidden transition-all hover:border-[#5A5A40]/40">
              <div className="flex flex-col sm:flex-row items-center gap-3.5">
                {/* Thumbnail */}
                <div
                  className={`relative rounded-xl overflow-hidden bg-stone-200 border border-stone-300/80 shadow-xs shrink-0 ${getAspectClass()} w-full sm:w-28 flex items-center justify-center`}
                >
                  {isValueVideo ? (
                    <video src={value} className="w-full h-full object-cover" muted loop autoPlay />
                  ) : (
                    <img
                      src={value}
                      alt="Uploaded preview"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPreviewModal(true)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs gap-1 cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-[10px] font-semibold">Perbesar</span>
                  </button>
                </div>

                {/* Info & Action Buttons */}
                <div className="flex-1 w-full text-left space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-xs">
                    <Check className="w-3.5 h-3.5" />
                    <span>{isValueVideo ? 'Video Siap Digunakan' : 'Foto Siap Digunakan'}</span>
                  </div>

                  {fileStats && (
                    <p className="text-[11px] font-mono text-stone-500">{fileStats}</p>
                  )}

                  <p className="text-[10px] text-stone-400">
                    Tersimpan secara lokal & siap tampil di undangan
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-100 bg-white shadow-2xs transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3 text-stone-500" />
                      <span>Ganti Foto</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRemove}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-50 bg-white shadow-2xs transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Empty State: Drag and Drop Dropzone */
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-[#5A5A40] bg-[#5A5A40]/10 scale-[1.01]'
                  : 'border-stone-300 bg-stone-50/50 hover:bg-stone-100/70 hover:border-stone-400'
              }`}
            >
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center py-3">
                  <div className="w-7 h-7 rounded-full border-2 border-[#5A5A40]/30 border-t-[#5A5A40] animate-spin mb-2" />
                  <p className="text-xs font-semibold text-stone-700">Mengoptimalkan & memuat foto...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors ${
                      isDragging
                        ? 'bg-[#5A5A40] text-white'
                        : 'bg-stone-200/70 text-stone-600'
                    }`}
                  >
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-800">
                      {isDragging ? 'Lepaskan foto di sini...' : placeholderText}
                    </p>
                    <p className="text-[11px] text-stone-500 mt-0.5">{hint}</p>
                  </div>
                  <span className="inline-block text-[10px] font-semibold text-[#5A5A40] bg-stone-200/70 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Pilih Dari Galeri / Komputer
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error Notice */}
      {errorMessage && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-200">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Full Preview Lightbox Modal */}
      <AnimatePresence>
        {showPreviewModal && value && (
          <div className="fixed inset-0 z-70 bg-black/80 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-3xl max-h-[85vh] bg-white rounded-3xl overflow-hidden p-2 shadow-2xl flex flex-col"
            >
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="overflow-auto rounded-2xl flex items-center justify-center bg-stone-900 max-h-[75vh]">
                {isValueVideo ? (
                  <video
                    src={value}
                    controls
                    autoPlay
                    className="max-w-full max-h-[75vh] object-contain"
                  />
                ) : (
                  <img
                    src={value}
                    alt="Full preview"
                    className="max-w-full max-h-[75vh] object-contain"
                  />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
