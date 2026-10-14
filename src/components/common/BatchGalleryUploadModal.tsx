import React, { useState, useRef } from 'react';
import { UploadCloud, X, CheckCircle2, Image as ImageIcon, Trash2, Plus, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GalleryCategory, GalleryPhoto } from '../../types.js';
import { uploadBatchFilesToServer } from '../../lib/api.js';

interface BatchGalleryUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadPhotos: (photos: Omit<GalleryPhoto, 'id'>[]) => Promise<void>;
  existingCount: number;
}

interface QueuedPhoto {
  id: string;
  dataUrl: string;
  title: string;
  caption: string;
  category: GalleryCategory;
  mediaType: 'IMAGE' | 'VIDEO';
  sizeKb: number;
}

export const BatchGalleryUploadModal: React.FC<BatchGalleryUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadPhotos,
  existingCount,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [defaultCategory, setDefaultCategory] = useState<GalleryCategory>('PREWEDDING');
  const [queue, setQueue] = useState<QueuedPhoto[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const processFiles = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(
      (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
    );

    if (validFiles.length === 0) return;

    setIsProcessing(true);
    try {
      // Direct server upload for batch files into 'gallery' folder
      const uploadedResults = await uploadBatchFilesToServer(validFiles, 'gallery');

      const newItems: QueuedPhoto[] = validFiles.map((file, index) => {
        const originalName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        const title = originalName.charAt(0).toUpperCase() + originalName.slice(1);
        const isVideo = file.type.startsWith('video/');
        const uploadedItem = uploadedResults[index];
        const serverUrl = uploadedItem ? uploadedItem.url : '';

        return {
          id: `batch-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
          dataUrl: serverUrl,
          title,
          caption: '',
          category: defaultCategory,
          mediaType: isVideo ? 'VIDEO' : 'IMAGE',
          sizeKb: Math.round(file.size / 1024),
        };
      });

      setQueue((prev) => [...prev, ...newItems]);
    } catch (err: any) {
      alert(err.message || 'Gagal mengunggah beberapa file galeri ke server.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleRemoveItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<QueuedPhoto>) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleSaveAll = async () => {
    if (queue.length === 0) return;
    setIsSubmitting(true);
    try {
      const photosToUpload: Omit<GalleryPhoto, 'id'>[] = queue.map((item, idx) => ({
        title: item.title || `Galeri Media ${existingCount + idx + 1}`,
        url: item.dataUrl,
        caption: item.caption || undefined,
        category: item.category,
        mediaType: item.mediaType,
        orderIndex: existingCount + idx + 1,
      }));

      await onUploadPhotos(photosToUpload);
      setQueue([]);
      onClose();
    } catch (err) {
      console.error('Batch upload error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl bg-white rounded-3xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-200">
          <div>
            <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-[#5A5A40]" />
              <span>Unggah Banyak Foto Sekaligus (Drag & Drop)</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Tarik beberapa file foto bersamaan untuk dimasukkan ke galeri pernikahan
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-100 text-stone-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category selector & Dropzone */}
        <div className="py-4 space-y-4 overflow-y-auto flex-1">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-stone-700">Kategori Default:</label>
            <select
              value={defaultCategory}
              onChange={(e) => {
                const cat = e.target.value as GalleryCategory;
                setDefaultCategory(cat);
                // Also update existing items that haven't been edited
                setQueue((prev) => prev.map((item) => ({ ...item, category: cat })));
              }}
              className="text-xs px-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 font-medium"
            >
              <option value="PREWEDDING">Pre-Wedding</option>
              <option value="ENGAGEMENT">Lamaran / Pertunangan</option>
              <option value="MOMENTS">Momen Indah</option>
              <option value="CEREMONY">Akad & Resepsi</option>
            </select>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div
            onDragEnter={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (!isDragging) setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#5A5A40] bg-[#5A5A40]/10'
                : 'border-stone-300 bg-stone-50/60 hover:bg-stone-100/70 hover:border-stone-400'
            }`}
          >
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center py-2">
                <div className="w-6 h-6 rounded-full border-2 border-[#5A5A40]/30 border-t-[#5A5A40] animate-spin mb-2" />
                <p className="text-xs font-semibold text-stone-700">Memproses & mengoptimalkan media...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-1.5">
                <div className="w-10 h-10 rounded-2xl bg-stone-200/70 flex items-center justify-center text-stone-700">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-stone-800">
                  {isDragging ? 'Lepaskan semua file di sini!' : 'Tarik & lepas banyak foto/video ke sini, atau klik untuk memilih file'}
                </p>
                <p className="text-[11px] text-stone-500">
                  Bisa memilih banyak foto & video sekaligus (JPG, PNG, WEBP, MP4, WEBM)
                </p>
              </div>
            )}
          </div>

          {/* Queued Photos List */}
          {queue.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800">
                  File Media Siap Diunggah ({queue.length} Item)
                </span>
                <button
                  type="button"
                  onClick={() => setQueue([])}
                  className="text-xs text-rose-600 hover:underline"
                >
                  Kosongkan Semua
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl border border-stone-200 bg-stone-50/50 flex items-start gap-3 relative group"
                  >
                    {item.mediaType === 'VIDEO' ? (
                      <video
                        src={item.dataUrl}
                        className="w-16 h-16 rounded-xl object-cover border border-stone-200 shrink-0 bg-stone-900"
                        muted
                        loop
                        autoPlay
                      />
                    ) : (
                      <img
                        src={item.dataUrl}
                        alt={item.title}
                        className="w-16 h-16 rounded-xl object-cover border border-stone-200 shrink-0 bg-stone-200"
                      />
                    )}
                    <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => handleUpdateItem(item.id, { title: e.target.value })}
                        placeholder="Judul foto"
                        className="w-full px-2 py-1 rounded-lg border border-stone-200 font-semibold bg-white"
                      />
                      <div className="flex items-center gap-2">
                        <select
                          value={item.category}
                          onChange={(e) =>
                            handleUpdateItem(item.id, { category: e.target.value as GalleryCategory })
                          }
                          className="px-2 py-0.5 rounded-lg border border-stone-200 bg-white text-[11px]"
                        >
                          <option value="PREWEDDING">Pre-Wedding</option>
                          <option value="ENGAGEMENT">Lamaran</option>
                          <option value="MOMENTS">Momen Indah</option>
                          <option value="CEREMONY">Akad & Resepsi</option>
                        </select>
                        <span className="text-[10px] text-stone-400 font-mono">
                          {item.sizeKb} KB
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={queue.length === 0 || isSubmitting}
            className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#5A5A40] hover:bg-[#484833] disabled:opacity-50 flex items-center gap-2 shadow-sm cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                <span>Menyimpan Foto...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan {queue.length} Foto ke Galeri</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
