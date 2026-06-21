/**
 * Privacy-preserving KYC commitment utilities.
 * All processing runs entirely in the browser — no raw biometric or document data
 * is ever sent to any server or stored on-chain.
 */

import type { FaceDescriptor } from '../hooks/useFaceApi';

// ─── Verification hash ────────────────────────────────────────────────────────

/**
 * Quantize a Float32Array face descriptor to Uint8 (0–255).
 * face-api descriptors are roughly in the range [-1, 1].
 */
function quantizeDescriptor(descriptor: FaceDescriptor): Uint8Array {
  return new Uint8Array(
    Array.from(descriptor).map((v) => Math.max(0, Math.min(255, Math.round((v + 1) * 127.5))))
  );
}

/**
 * Compute the on-chain KYC commitment:
 *   SHA-256( quantized_descriptor[128] || doc_type_byte || wallet_pubkey[32] )
 *
 * The raw face distance is never stored anywhere outside the browser.
 * Anyone can verify the commitment by re-running the same computation,
 * but cannot reverse it to recover the descriptor.
 */
export async function computeVerificationHash(
  faceDescriptor: FaceDescriptor,
  docType: 'national_id' | 'passport' | 'drivers_license',
  walletPubkeyBytes: Uint8Array,
): Promise<Uint8Array> {
  const quantized = quantizeDescriptor(faceDescriptor);
  const docTypeByte = docType === 'passport' ? 1 : docType === 'drivers_license' ? 2 : 0;

  // 128 (descriptor) + 1 (doc type) + 32 (pubkey) = 161 bytes
  const combined = new Uint8Array(161);
  combined.set(quantized, 0);
  combined[128] = docTypeByte;
  combined.set(walletPubkeyBytes, 129);

  const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
  return new Uint8Array(hashBuffer);
}

// ─── Document quality validation ──────────────────────────────────────────────

export interface DocumentQualityResult {
  ok: boolean;
  score: number;      // 0–100
  issues: string[];
  warnings: string[]; // non-blocking hints
  screenLikelihood: number; // 0–1, probability of being a screen/printed capture
}

// ─── Screen / fake document detection ────────────────────────────────────────

/**
 * Detect moire patterns and screen-capture artifacts using row-level autocorrelation.
 *
 * When a document is photographed off a screen (LCD/OLED) or is a halftone print:
 *   - Adjacent rows have highly periodic intensity differences (pixel pitch = 2–6px)
 *   - Row-to-row variance at lag-2 and lag-3 is unusually high vs lag-1
 *
 * Returns a likelihood score 0–1 (> 0.5 = suspicious).
 */
function detectScreenCapture(gray: Float32Array, w: number, h: number): number {
  const sampleRows = Math.min(60, Math.floor(h / 2));
  const rowStep = Math.max(1, Math.floor(h / sampleRows));
  const colSample = Math.min(w, 320);
  const colStep = Math.max(1, Math.floor(w / colSample));

  let sumLag1 = 0, sumLag2 = 0, sumLag3 = 0;
  let count = 0;

  for (let y = 4; y < h - 4; y += rowStep) {
    for (let x = 0; x < w - 6; x += colStep) {
      const p0 = gray[y * w + x];
      const p1 = gray[y * w + x + 1];
      const p2 = gray[y * w + x + 2];
      const p3 = gray[y * w + x + 3];
      sumLag1 += Math.abs(p0 - p1);
      sumLag2 += Math.abs(p0 - p2);
      sumLag3 += Math.abs(p0 - p3);
      count++;
    }
  }

  if (count === 0) return 0;

  const avgLag1 = sumLag1 / count;
  const avgLag2 = sumLag2 / count;
  const avgLag3 = sumLag3 / count;

  // Screen pixel grids create a pattern where lag-2 or lag-3 > lag-1 significantly
  const periodicityRatio = Math.max(avgLag2, avgLag3) / Math.max(avgLag1, 0.01);

  // Also detect horizontal line scan patterns (CRT / bad LCD)
  let rowAlternationSum = 0;
  let rowCount2 = 0;
  for (let y = 4; y < h - 4; y += rowStep * 2) {
    let rowA = 0, rowB = 0;
    for (let x = 0; x < w; x += colStep) {
      rowA += gray[y * w + x];
      rowB += gray[(y + 1) * w + x];
    }
    rowAlternationSum += Math.abs(rowA - rowB) / colSample;
    rowCount2++;
  }
  const rowAlternation = rowCount2 > 0 ? (rowAlternationSum / rowCount2) / Math.max(avgBrightnessFromGray(gray), 1) : 0;

  // Combine: periodicity > 1.4 is suspicious, alternation > 0.02 is suspicious
  const periodicityScore = Math.min(1, Math.max(0, (periodicityRatio - 1.0) / 1.5));
  const alternationScore = Math.min(1, rowAlternation / 0.05);
  return Math.min(1, 0.6 * periodicityScore + 0.4 * alternationScore);
}

function avgBrightnessFromGray(gray: Float32Array): number {
  let sum = 0;
  const step = Math.max(1, Math.floor(gray.length / 2000));
  let count = 0;
  for (let i = 0; i < gray.length; i += step) { sum += gray[i]; count++; }
  return count > 0 ? sum / count : 128;
}

/**
 * Check if the document image has a dark border > 8% on all sides,
 * which often indicates the document was photographed inside a screen window.
 */
function checkDarkBorder(gray: Float32Array, w: number, h: number): boolean {
  const borderW = Math.max(1, Math.floor(w * 0.08));
  const borderH = Math.max(1, Math.floor(h * 0.08));
  const threshold = 40;

  const sampleEdge = (xs: number[], ys: number[]) => {
    let dark = 0;
    for (const y of ys) for (const x of xs) if (gray[y * w + x] < threshold) dark++;
    return dark / (xs.length * ys.length);
  };

  const xFull = Array.from({ length: Math.min(w, 20) }, (_, i) => Math.floor(i * w / 20));
  const yFull = Array.from({ length: Math.min(h, 20) }, (_, i) => Math.floor(i * h / 20));
  const yTop = Array.from({ length: borderH }, (_, i) => i);
  const yBot = Array.from({ length: borderH }, (_, i) => h - 1 - i);
  const xLeft = Array.from({ length: borderW }, (_, i) => i);
  const xRight = Array.from({ length: borderW }, (_, i) => w - 1 - i);

  const topDark = sampleEdge(xFull, yTop);
  const botDark = sampleEdge(xFull, yBot);
  const leftDark = sampleEdge(xLeft, yFull);
  const rightDark = sampleEdge(xRight, yFull);

  // All 4 sides must be dark
  return topDark > 0.6 && botDark > 0.6 && leftDark > 0.6 && rightDark > 0.6;
}

/**
 * Validate document image quality using canvas analysis (no OCR, no server).
 * Checks: blur level (Laplacian variance), average brightness, and aspect ratio.
 */
export function validateDocumentQuality(
  file: File,
  docType: 'national_id' | 'passport' | 'drivers_license',
): Promise<DocumentQualityResult> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;

    img.onload = () => {
      URL.revokeObjectURL(url);

      const MAX = 640;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);

      const issues: string[] = [];
      let score = 100;

      // ── 1. Aspect ratio ────────────────────────────────────────────────────
      const ratio = img.width / img.height;
      // Passport TD3: 125×88mm → ~1.42  |  ID-1 (credit card): 85.6×54mm → ~1.585
      const expectedRatio = docType === 'passport' ? 1.42 : 1.585;
      if (Math.abs(ratio - expectedRatio) > 0.45) {
        issues.push('Unusual aspect ratio — ensure the full document is visible and not cropped');
        score -= 20;
      }

      // ── 2. Blur (Laplacian variance on greyscale) ──────────────────────────
      const gray = new Float32Array(w * h);
      for (let i = 0; i < gray.length; i++) {
        const r = imageData.data[i * 4];
        const g = imageData.data[i * 4 + 1];
        const b = imageData.data[i * 4 + 2];
        gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
      }

      let lapSum = 0;
      let lapCount = 0;
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const lap = Math.abs(
            4 * gray[y * w + x]
            - gray[(y - 1) * w + x]
            - gray[(y + 1) * w + x]
            - gray[y * w + (x - 1)]
            - gray[y * w + (x + 1)],
          );
          lapSum += lap;
          lapCount++;
        }
      }
      const sharpness = lapCount > 0 ? lapSum / lapCount : 0;
      if (sharpness < 3.5) {
        issues.push('Image is blurry — use a sharper, well-focused photo');
        score -= 35;
      } else if (sharpness < 6) {
        issues.push('Image could be sharper — try better focus or lighting');
        score -= 15;
      }

      // ── 3. Brightness ──────────────────────────────────────────────────────
      let totalBrightness = 0;
      for (let i = 0; i < gray.length; i++) totalBrightness += gray[i];
      const avgBrightness = totalBrightness / gray.length;

      if (avgBrightness < 45) {
        issues.push('Image is too dark — improve lighting or use flash');
        score -= 25;
      } else if (avgBrightness > 215) {
        issues.push('Image is overexposed — avoid direct light reflecting off document');
        score -= 15;
      }

      // ── 4. Screen / fake-print detection ───────────────────────────────────
      const screenLikelihood = detectScreenCapture(gray, w, h);
      const warnings: string[] = [];

      if (screenLikelihood > 0.65) {
        issues.push('Document appears to be photographed from a screen or printer — use your original physical document');
        score -= 40;
      } else if (screenLikelihood > 0.40) {
        warnings.push('Possible screen or print artifact detected — ensure you are photographing the original physical document');
        score -= 15;
      }

      // ── 5. Dark border check (document inside a screen frame) ─────────────
      const borderDark = checkDarkBorder(gray, w, h);
      if (borderDark) {
        warnings.push('Document seems to have a dark background border — photograph the document directly on a plain surface');
      }

      resolve({ ok: score >= 50, score: Math.max(0, score), issues, warnings, screenLikelihood });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ ok: false, score: 0, issues: ['Cannot read image file'], warnings: [], screenLikelihood: 0 });
    };
  });
}

// ─── MRZ checksum (ICAO Doc 9303) ────────────────────────────────────────────

/** Validate a single MRZ field ending with its check digit (weights: 7, 3, 1). */
export function validateMrzChecksum(field: string): boolean {
  const WEIGHTS = [7, 3, 1];
  const chars = field.split('');
  const checkDigit = Number(chars.pop());
  if (isNaN(checkDigit)) return false;

  let total = 0;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    let val: number;
    if (c === '<') val = 0;
    else if (c >= '0' && c <= '9') val = Number(c);
    else val = c.charCodeAt(0) - 55; // A=10, B=11, …, Z=35
    total += val * WEIGHTS[i % 3];
  }
  return (total % 10) === checkDigit;
}

export interface MrzParseResult {
  valid: boolean;
  docType: string;
  nationality: string;
  dobChecksumOk: boolean;
  expiryChecksumOk: boolean;
  issues: string[];
}

/**
 * Parse and validate a passport MRZ (2 lines × 44 characters, ICAO TD3 format).
 * Call this after the user manually enters or pastes the MRZ text.
 */
export function parseMrz(line1: string, line2: string): MrzParseResult {
  const issues: string[] = [];

  if (line1.length !== 44 || line2.length !== 44) {
    return {
      valid: false, docType: '', nationality: '',
      dobChecksumOk: false, expiryChecksumOk: false,
      issues: ['MRZ must be exactly 2 lines of 44 characters each'],
    };
  }

  const docType = line1.slice(0, 2).replace('<', '').trim();
  const nationality = line1.slice(10, 13).replace(/</g, '');
  const dobField = line2.slice(0, 7);       // 6 digits + check digit
  const expiryField = line2.slice(13, 20);  // 6 digits + check digit

  const dobChecksumOk = validateMrzChecksum(dobField);
  const expiryChecksumOk = validateMrzChecksum(expiryField);

  if (!dobChecksumOk) issues.push('Date-of-birth checksum invalid — document may be altered');
  if (!expiryChecksumOk) issues.push('Expiry date checksum invalid — document may be altered');

  return {
    valid: dobChecksumOk && expiryChecksumOk,
    docType, nationality, dobChecksumOk, expiryChecksumOk, issues,
  };
}
