import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiInstance && process.env.GEMINI_API_KEY) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiInstance;
}

/**
 * Transcribes audio base64 data into Indonesian text using Gemini 2.5 Flash
 */
export async function transcribeAudioWithGemini(base64AudioData: string): Promise<string | null> {
  try {
    const ai = getGeminiClient();
    if (!ai) return null;

    let mimeType = 'audio/webm';
    let data = base64AudioData;

    if (base64AudioData.startsWith('data:')) {
      const commaIndex = base64AudioData.indexOf(',');
      if (commaIndex !== -1) {
        const header = base64AudioData.substring(5, commaIndex); // e.g., "audio/webm;codecs=opus;base64"
        const parts = header.split(';');
        if (parts.length > 0 && parts[0].includes('/')) {
          mimeType = parts[0].trim();
        }
        data = base64AudioData.substring(commaIndex + 1).trim();
      }
    }

    if (!data) return null;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        {
          inlineData: {
            mimeType,
            data,
          },
        },
        'Dengarkan rekaman audio ucapan doa restu pernikahan ini. Transkripsikan seluruh isi perkataan lisan yang diucapkan ke dalam teks Bahasa Indonesia secara tepat dan akurat. Tuliskan HANYA hasil transkripsi ucapan tersebut secara langsung tanpa penambahan kata-kata pembuka, tanpa tanda kurung, dan tanpa penjelasan.',
      ],
    });

    const text = response.text?.trim();
    if (text && text.length > 0) {
      return text;
    }
    return null;
  } catch (err) {
    console.error('Failed to transcribe audio with Gemini:', err);
    return null;
  }
}
