/**
 * Browser-side OCR for ID cards. Runs entirely client-side via tesseract.js —
 * the card image never leaves the device. Best-effort: it auto-extracts the
 * 12-digit CCCD number and a date of birth so the user can confirm/correct them
 * before structural validation.
 */

export interface IdOcrResult {
  rawText: string;
  cccd: string | null;       // 12-digit citizen ID, if found
  dob: string | null;        // dd/mm/yyyy, if found
}

/**
 * Pull the most CCCD-like 12-digit run out of OCR text.
 * Prefers a standalone 12-digit token; falls back to the first 12 consecutive
 * digits after stripping spaces (OCR often splits "079 0123 45678").
 */
function extractCccd(text: string): string | null {
  const tokens = text.match(/\b\d[\d\s.]{10,16}\b/g) || [];
  for (const t of tokens) {
    const d = t.replace(/\D/g, '');
    if (d.length === 12) return d;
  }
  // Fallback: first 12 consecutive digits anywhere
  const all = text.replace(/\D/g, '');
  const m = all.match(/\d{12}/);
  return m ? m[0] : null;
}

function extractDob(text: string): string | null {
  // dd/mm/yyyy or dd-mm-yyyy or dd.mm.yyyy
  const m = text.match(/\b(0?[1-9]|[12]\d|3[01])[\/\-.](0?[1-9]|1[0-2])[\/\-.](19|20)\d{2}\b/);
  if (!m) return null;
  return m[0].replace(/[-.]/g, '/');
}

/**
 * OCR an ID-card image file. `onProgress` (0–1) reports recognition progress.
 * Never throws — returns empty fields on failure so the UI can fall back to
 * manual entry.
 */
export async function ocrIdCard(
  file: File,
  onProgress?: (p: number) => void,
): Promise<IdOcrResult> {
  try {
    const Tesseract = (await import('tesseract.js')).default;
    const { data } = await Tesseract.recognize(file, 'eng', {
      logger: (m: { status?: string; progress?: number }) => {
        if (m.status === 'recognizing text' && typeof m.progress === 'number') {
          onProgress?.(m.progress);
        }
      },
    });
    const rawText = data?.text || '';
    return {
      rawText,
      cccd: extractCccd(rawText),
      dob: extractDob(rawText),
    };
  } catch {
    return { rawText: '', cccd: null, dob: null };
  }
}
