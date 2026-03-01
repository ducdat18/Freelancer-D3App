import { useState, useEffect, useCallback } from 'react';

export type FaceDescriptor = Float32Array;

export type FaceApiStatus = 'idle' | 'loading' | 'ready' | 'error';

const MODEL_URL = '/models';

/** Singleton — load models once per page session */
let _faceapi: typeof import('@vladmandic/face-api') | null = null;
let _loadPromise: Promise<void> | null = null;

async function ensureModelsLoaded(): Promise<typeof import('@vladmandic/face-api')> {
  if (_faceapi) return _faceapi;

  if (!_loadPromise) {
    _loadPromise = (async () => {
      const faceapi = await import('@vladmandic/face-api');
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      _faceapi = faceapi;
    })();
  }

  await _loadPromise;
  return _faceapi!;
}

/**
 * Detect a single face and return its 128-D descriptor.
 * Returns null if no face is found.
 */
export async function detectFaceDescriptor(
  el: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<FaceDescriptor | null> {
  const faceapi = await ensureModelsLoaded();
  const result = await faceapi
    .detectSingleFace(el as any, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.35 }))
    .withFaceLandmarks(true)
    .withFaceDescriptor();
  return result?.descriptor ?? null;
}

/**
 * Returns Euclidean distance between two face descriptors.
 * Rule of thumb: < 0.45 = same person, 0.45–0.6 = likely same, > 0.6 = different
 */
export function faceDistance(d1: FaceDescriptor, d2: FaceDescriptor): number {
  let sum = 0;
  for (let i = 0; i < d1.length; i++) sum += (d1[i] - d2[i]) ** 2;
  return Math.sqrt(sum);
}

/** React hook — loads models in background, exposes status */
export function useFaceApi() {
  const [status, setStatus] = useState<FaceApiStatus>('idle');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setStatus('loading');
    ensureModelsLoaded()
      .then(() => setStatus('ready'))
      .catch(() => setStatus('error'));
  }, []);

  const detect = useCallback(
    (el: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) =>
      detectFaceDescriptor(el),
    []
  );

  return { status, detect, faceDistance };
}
