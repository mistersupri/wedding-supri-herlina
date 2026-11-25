import fs from 'fs/promises';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiInstance && process.env.GEMINI_API_KEY) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiInstance;
}

const TRANSCRIBE_TIMEOUT_MS = 20_000;
const MIME_BY_EXT: Record<string, string> = {
  '.webm': 'audio/webm',
  '.mp4': 'audio/mp4',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
};

/**
 * Transcribes an uploaded voice note into Indonesian text with Gemini.
 * Resolves to null when no API key is set, the call fails, or it takes longer than the timeout,
 * so a slow or broken transcription never blocks a guest's wish.
 */
export async function transcribeAudioWithGemini(filePath: string): Promise<string | null> {
  try {
    const ai = getGeminiClient();
    if (!ai) return null;

    const mimeType = MIME_BY_EXT[path.extname(filePath).toLowerCase()];
    if (!mimeType) return null;
    const data = (await fs.readFile(filePath)).toString('base64');

    const request = ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        { inlineData: { mimeType, data } },
        'Dengarkan rekaman audio ucapan doa restu pernikahan ini. Transkripsikan seluruh isi perkataan lisan yang diucapkan ke dalam teks Bahasa Indonesia secara tepat dan akurat. Tuliskan HANYA hasil transkripsi ucapan tersebut secara langsung tanpa penambahan kata-kata pembuka, tanpa tanda kurung, dan tanpa penjelasan.',
      ],
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), TRANSCRIBE_TIMEOUT_MS);
    });
    const response = await Promise.race([request, timeout]).finally(() => clearTimeout(timer));
    return response?.text?.trim() || null;
  } catch (err) {
    console.error('Failed to transcribe audio with Gemini:', err);
    return null;
  }
}
