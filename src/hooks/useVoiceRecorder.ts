import { useCallback, useEffect, useRef, useState } from 'react';
import { uploadFile } from '../lib/api.js';

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

/**
 * Records a voice note and, where the browser supports it, transcribes it live in Indonesian.
 * The note is uploaded as a file when the wish is sent; the wish itself only carries its URL.
 */
export function useVoiceRecorder(onTranscript: (text: string) => void) {
  const [status, setStatus] = useState<'idle' | 'recording' | 'recorded'>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const uploadedRef = useRef<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const stoppedRef = useRef<Promise<Blob | null> | null>(null);
  const transcriptRef = useRef(onTranscript);
  transcriptRef.current = onTranscript;

  const supported = typeof window !== 'undefined' && 'MediaRecorder' in window && Boolean(navigator.mediaDevices?.getUserMedia);

  const releaseUrl = () => setAudioUrl((url) => (url && URL.revokeObjectURL(url), null));

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      stoppedRef.current = new Promise((resolve) => {
        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          setAudioUrl(URL.createObjectURL(blob));
          blobRef.current = blob.size > 0 ? blob : null;
          uploadedRef.current = null;
          setStatus('recorded');
          resolve(blobRef.current);
        };
      });
      recorderRef.current = recorder;
      recorder.start();
      setStatus('recording');

      const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (Recognition) {
        const recognition: SpeechRecognitionLike = new Recognition();
        recognition.lang = 'id-ID';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (e) => {
          const text = Array.from(e.results, (r) => r[0].transcript)
            .join('')
            .trim();
          if (text) transcriptRef.current(text);
        };
        recognition.start();
        recognitionRef.current = recognition;
      }
    } catch {
      setError('Mikrofon tidak bisa dipakai. Izinkan akses mikrofon di peramban, atau tulis ucapan Anda.');
      setStatus('idle');
    }
  }, []);

  /** Stops recording (if running) and resolves to the recorded audio, without sending it anywhere. */
  const recordedBlob = useCallback(async (): Promise<Blob | null> => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    return stoppedRef.current ? await stoppedRef.current : blobRef.current;
  }, []);

  /** Uploads the note and resolves to its URL. A retry after a failed wish reuses the file that already arrived. */
  const upload = useCallback(async (blob: Blob): Promise<string> => {
    uploadedRef.current ??= await uploadFile(new File([blob], 'pesan-suara', { type: blob.type || 'audio/webm' }), 'voice');
    return uploadedRef.current;
  }, []);

  const clear = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null;
      recorder.stop();
      recorder.stream.getTracks().forEach((t) => t.stop());
    }
    recorderRef.current = null;
    stoppedRef.current = null;
    blobRef.current = null;
    uploadedRef.current = null;
    releaseUrl();
    setStatus('idle');
  }, []);

  useEffect(() => clear, [clear]);

  return { status, audioUrl, error, supported, start, stop: recordedBlob, recordedBlob, upload, clear };
}
