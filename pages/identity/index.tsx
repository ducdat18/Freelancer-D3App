import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Container, Typography, Box, Button, Chip, Alert,
  IconButton, List, ListItem, ListItemText, ListItemSecondaryAction,
  Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Card, CardContent, Stepper, Step, StepLabel, LinearProgress, Collapse,
  CircularProgress, useTheme, alpha,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import VerifiedIcon from '@mui/icons-material/Verified';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import LinkIcon from '@mui/icons-material/Link';
import KeyIcon from '@mui/icons-material/Key';
import {
  BadgeOutlined, AirplaneTicketOutlined, CreditCardOutlined,
  CloudUploadOutlined, CheckCircle, ErrorOutline,
  LockOutlined, VerifiedUser, ArrowForward, ArrowBack,
  CameraAltOutlined, ExpandMoreOutlined, ExpandLessOutlined,
  WarningAmberOutlined, DirectionsCarOutlined,
} from '@mui/icons-material';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { web3 } from '@coral-xyz/anchor';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import VerifiedBadge from '../../src/components/VerifiedBadge';
import { useSolanaProgram } from '../../src/hooks/useSolanaProgram';
import { useDID } from '../../src/hooks/useDID';
import { useIdentityVerification } from '../../src/hooks/useIdentityVerification';
import { useKyc } from '../../src/hooks/useKyc';
import { useFaceApi } from '../../src/hooks/useFaceApi';
import { detectFaceDescriptor, detectWithExpressions, faceDistance } from '../../src/hooks/useFaceApi';
import type { FaceDescriptor, FaceExpressions } from '../../src/hooks/useFaceApi';
import { computeVerificationHash, validateDocumentQuality, parseMrz, validateCccd } from '../../src/utils/kycCommitment';
import type { DocumentQualityResult, MrzParseResult, CccdValidationResult } from '../../src/utils/kycCommitment';
import { ocrIdCard } from '../../src/utils/idOcr';
import {
  ServiceType,
  VerificationMethodType,
} from '../../src/types';

// ─── Liveness challenges ──────────────────────────────────────────────────────

interface LivenessChallenge {
  type: 'smile' | 'openMouth';
  label: string;
  hint: string;
}

const LIVENESS_CHALLENGES: LivenessChallenge[] = [
  { type: 'smile',     label: 'SMILE',      hint: 'Give a big smile 😄' },
  { type: 'openMouth', label: 'OPEN MOUTH', hint: 'Open your mouth wide 😮' },
];

function pickChallenge(): LivenessChallenge {
  return LIVENESS_CHALLENGES[Math.floor(Math.random() * LIVENESS_CHALLENGES.length)];
}

function checkChallengeMet(expressions: FaceExpressions | null, challenge: LivenessChallenge): boolean {
  if (!expressions) return false;
  if (challenge.type === 'smile')     return expressions.happy > 0.65;
  if (challenge.type === 'openMouth') return expressions.surprised > 0.50 || expressions.fearful > 0.40;
  return false;
}

// ─── DID config ───────────────────────────────────────────────────────────────

const serviceTypeLabels: Record<number, string> = {
  [ServiceType.LinkedIn]: 'LinkedIn', [ServiceType.GitHub]: 'GitHub',
  [ServiceType.Twitter]: 'Twitter', [ServiceType.Website]: 'Website',
  [ServiceType.Email]: 'Email', [ServiceType.Portfolio]: 'Portfolio',
  [ServiceType.Telegram]: 'Telegram', [ServiceType.Discord]: 'Discord',
  [ServiceType.Medium]: 'Medium', [ServiceType.Other]: 'Other',
};
const vmTypeLabels: Record<number, string> = {
  [VerificationMethodType.Ed25519]: 'Ed25519',
  [VerificationMethodType.EcdsaSecp256k1]: 'ECDSA Secp256k1',
  [VerificationMethodType.JsonWebKey]: 'JSON Web Key',
  [VerificationMethodType.X25519]: 'X25519',
};

// ─── ID types ─────────────────────────────────────────────────────────────────

const ID_TYPES = (theme: any) => [
  { value: 'national_id' as const, label: 'National ID Card', desc: 'Government citizen ID', Icon: BadgeOutlined, color: theme.palette.primary.main },
  { value: 'passport' as const, label: 'Passport', desc: 'International travel document', Icon: AirplaneTicketOutlined, color: theme.palette.secondary.main },
  { value: 'drivers_license' as const, label: "Driver's License", desc: 'Government driving permit', Icon: DirectionsCarOutlined, color: theme.palette.info.main },
];

const KYC_STEPS = ['Document Type', 'ID Photo', 'Selfie', 'Result'];

// ─── UploadBox ────────────────────────────────────────────────────────────────

function UploadBox({ label, file, preview, onFile, status }: {
  label: string; file: File | null; preview: string | null;
  onFile: (f: File) => void;
  status?: 'detecting' | 'found' | 'notfound' | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryMain = theme.palette.primary.main;

  return (
    <Box
      onClick={() => inputRef.current?.click()}
      sx={{
        flex: 1, minHeight: 180,
        position: 'relative',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
        border: status === 'found'
          ? `2px solid ${theme.palette.success.main}`
          : status === 'notfound'
            ? `2px solid ${theme.palette.error.main}`
            : `2px dashed ${isDark ? alpha(primaryMain, 0.3) : alpha(primaryMain, 0.2)}`,
        borderRadius: 3,
        bgcolor: status === 'found' 
          ? alpha(theme.palette.success.main, 0.05) 
          : (isDark ? alpha(primaryMain, 0.02) : 'grey.50'),
        cursor: 'pointer', transition: 'all 0.2s', overflow: 'hidden',
        '&:hover': { 
          borderColor: primaryMain, 
          bgcolor: isDark ? alpha(primaryMain, 0.05) : alpha(primaryMain, 0.02),
          boxShadow: isDark ? `0 0 20px ${alpha(primaryMain, 0.1)}` : 'none',
        },
      }}
    >
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); }} />

      {preview ? (
        <img src={preview} alt="ID preview" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, opacity: isDark ? 0.55 : 0.85 }} />
      ) : null}

      <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', px: 2, bgcolor: preview ? 'rgba(0,0,0,0.4)' : 'transparent', py: preview ? 1 : 0, borderRadius: preview ? 1 : 0 }}>
        {status === 'detecting' ? (
          <><CircularProgress size={24} sx={{ color: primaryMain, mb: 0.5 }} /><Typography variant="caption" sx={{ color: preview ? '#fff' : 'text.secondary', fontWeight: 700 }}>Detecting face...</Typography></>
        ) : status === 'found' ? (
          <><CheckCircle sx={{ fontSize: 32, color: theme.palette.success.main }} /><Typography variant="caption" sx={{ color: theme.palette.success.main, fontWeight: 800 }}>Face detected ✓</Typography></>
        ) : status === 'notfound' ? (
          <><ErrorOutline sx={{ fontSize: 32, color: theme.palette.error.main }} /><Typography variant="caption" sx={{ color: theme.palette.error.main, fontWeight: 800 }}>No face found — try a clearer photo</Typography></>
        ) : file ? (
          <><CheckCircle sx={{ fontSize: 28, color: primaryMain }} /><Typography variant="caption" sx={{ color: preview ? '#fff' : 'text.secondary', fontWeight: 700 }}>{file.name}</Typography></>
        ) : (
          <><CloudUploadOutlined sx={{ fontSize: 36, color: alpha(primaryMain, 0.4), mb: 1 }} /><Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>{label}</Typography></>
        )}
      </Box>
    </Box>
  );
}

// ─── Webcam selfie component ──────────────────────────────────────────────────

function WebcamCapture({ onCapture, faceReady, challenge }: {
  onCapture: (canvas: HTMLCanvasElement) => void;
  faceReady: boolean;
  challenge: LivenessChallenge;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [liveDetecting, setLiveDetecting] = useState(false);
  const [liveFaceFound, setLiveFaceFound] = useState(false);
  const [challengeMet, setChallengeMet] = useState(false);
  const detectIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const theme = useTheme();
  const primaryMain = theme.palette.primary.main;
  const successColor = theme.palette.success.main;

  useEffect(() => {
    let stream: MediaStream | null = null;

    navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360, facingMode: 'user' } })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play();
          setStreaming(true);
        }
      })
      .catch(() => setCamError('Camera permission denied. Please allow camera access and reload.'));

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      if (detectIntervalRef.current) clearInterval(detectIntervalRef.current);
    };
  }, []);

  // Periodic live face detection + liveness challenge check
  useEffect(() => {
    if (!streaming || !faceReady) return;
    detectIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      setLiveDetecting(true);
      const { descriptor, expressions } = await detectWithExpressions(videoRef.current);
      setLiveDetecting(false);
      setLiveFaceFound(descriptor !== null);
      setChallengeMet(checkChallengeMet(expressions, challenge));
    }, 1500);
    return () => { if (detectIntervalRef.current) clearInterval(detectIntervalRef.current); };
  }, [streaming, faceReady, challenge]);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    onCapture(canvasRef.current);
  };

  if (camError) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <ErrorOutline sx={{ fontSize: 40, color: theme.palette.error.main, mb: 1 }} />
        <Typography variant="body2" color="error" sx={{ mb: 2, fontWeight: 600 }}>{camError}</Typography>
        <Typography variant="caption" color="text.secondary">You can also upload a selfie photo instead.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {/* Video frame */}
      <Box sx={{ position: 'relative', borderRadius: 3, overflow: 'hidden', border: 2, borderColor: liveFaceFound ? successColor : alpha(primaryMain, 0.3), boxShadow: liveFaceFound ? `0 0 24px ${alpha(successColor, 0.2)}` : 'none', transition: 'all 0.3s' }}>
        <video ref={videoRef} style={{ display: 'block', width: 320, height: 240, objectFit: 'cover', transform: 'scaleX(-1)' }} muted playsInline />

        {/* Corner brackets */}
        {[{ top: 8, left: 8 }, { top: 8, right: 8 }, { bottom: 8, left: 8 }, { bottom: 8, right: 8 }].map((pos, i) => (
          <Box key={i} sx={{ position: 'absolute', width: 20, height: 20, ...pos, borderTopWidth: i < 2 ? 2 : 0, borderBottomWidth: i >= 2 ? 2 : 0, borderLeftWidth: i % 2 === 0 ? 2 : 0, borderRightWidth: i % 2 === 1 ? 2 : 0, borderStyle: 'solid', borderColor: liveFaceFound ? successColor : primaryMain, opacity: 0.8 }} />
        ))}

        {/* Status overlay */}
        <Box sx={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
          {liveFaceFound && !challengeMet && (
            <Chip
              size="small"
              label={challenge.hint}
              sx={{ bgcolor: 'rgba(0,0,0,0.8)', color: theme.palette.warning.main, fontSize: '0.65rem', fontFamily: '"Rajdhani", sans-serif', fontWeight: 800, border: 1, borderColor: alpha(theme.palette.warning.main, 0.4) }}
            />
          )}
          <Chip
            size="small"
            label={
              !streaming ? 'Starting camera...'
              : liveDetecting ? 'Scanning...'
              : challengeMet ? `✓ Liveness verified — click Capture`
              : liveFaceFound ? `Challenge: ${challenge.label}`
              : 'Position your face in the frame'
            }
            sx={{
              bgcolor: 'rgba(0,0,0,0.7)',
              color: challengeMet ? successColor : liveFaceFound ? theme.palette.warning.main : primaryMain,
              fontSize: '0.65rem', fontFamily: '"Rajdhani", sans-serif', fontWeight: 700,
              border: 1, borderColor: alpha(challengeMet ? successColor : liveFaceFound ? theme.palette.warning.main : primaryMain, 0.3),
            }}
          />
        </Box>
      </Box>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <Button
        variant="contained"
        size="large"
        startIcon={<CameraAltOutlined />}
        onClick={capture}
        disabled={!challengeMet}
        sx={{ px: 5, py: 1.25, fontWeight: 800, fontFamily: '"Orbitron", sans-serif' }}
      >
        {challengeMet ? 'Capture Selfie' : `Show: ${challenge.label}`}
      </Button>
    </Box>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function IdentityPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryMain = theme.palette.primary.main;
  const secondaryMain = theme.palette.secondary.main;

  const { program } = useSolanaProgram();
  // @ts-ignore
  const isDeployed = typeof program?.methods?.createDidDocument === 'function';

  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const addressStr = publicKey?.toBase58() ?? null;

  const { status: kycStatus, isVerified, record, loaded: kycLoaded, startPending, finalise, reset: kycReset, syncFromChain } = useIdentityVerification(addressStr);
  const { submitKyc, finalizeKyc, resetKycOnChain, fetchKycRecord, loading: kycChainLoading } = useKyc();
  const { status: faceApiStatus, detect } = useFaceApi();

  // On-chain transaction state
  const [chainTxSig, setChainTxSig] = useState<string | null>(null);
  const [chainError, setChainError] = useState<string | null>(null);

  const {
    didDocument, credentials, loading: didLoading, error: didError,
    fetchDIDDocument, fetchUserCredentials,
    createDIDDocument, addVerificationMethod, removeVerificationMethod, addServiceEndpoint,
    anchorVC,
  } = useDID();

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [didExpanded, setDidExpanded] = useState(false);

  // KYC wizard state
  const [kycStep, setKycStep] = useState(0);
  const [idType, setIdType] = useState<any>(null);

  // Step 2: ID photo
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [idDetectStatus, setIdDetectStatus] = useState<'detecting' | 'found' | 'notfound' | null>(null);
  const [idDescriptor, setIdDescriptor] = useState<FaceDescriptor | null>(null);
  const [docQuality, setDocQuality] = useState<DocumentQualityResult | null>(null);
  const idImgRef = useRef<HTMLImageElement | null>(null);

  // Step 3: selfie + liveness
  const [livenessChallenge, setLivenessChallenge] = useState<LivenessChallenge>(() => pickChallenge());
  const [selfieCanvas, setSelfieCanvas] = useState<HTMLCanvasElement | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [selfieDescriptor, setSelfieDescriptor] = useState<FaceDescriptor | null>(null);
  const [selfieDetecting, setSelfieDetecting] = useState(false);
  const [selfieStatus, setSelfieStatus] = useState<'found' | 'notfound' | null>(null);

  // Step 4: comparison
  const [comparing, setComparing] = useState(false);
  const [compareResult, setCompareResult] = useState<{ distance: number; match: boolean } | null>(null);

  // MRZ (passport only)
  const [mrzLine1, setMrzLine1] = useState('');
  const [mrzLine2, setMrzLine2] = useState('');
  const [mrzResult, setMrzResult] = useState<MrzParseResult | null>(null);
  const [mrzExpanded, setMrzExpanded] = useState(false);

  // CCCD number check (national ID only) — OCR auto-fill + structural validation
  const [cccdInput, setCccdInput] = useState('');
  const [cccdResult, setCccdResult] = useState<CccdValidationResult | null>(null);
  const [cccdExpanded, setCccdExpanded] = useState(false);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  // DID anchoring sub-status during the final KYC step
  const [didAnchorStatus, setDidAnchorStatus] = useState<'idle' | 'anchoring' | 'done' | 'skipped'>('idle');
  const [didAnchorMsg, setDidAnchorMsg] = useState<string | null>(null);

  // Latest verification hash (set after comparison — for result display)
  const [verificationHashHex, setVerificationHashHex] = useState<string | null>(null);

  // DID dialogs
  const [vmDialogOpen, setVmDialogOpen] = useState(false);
  const [vmType, setVmType] = useState<number>(0);
  const [vmKeyInput, setVmKeyInput] = useState('');
  const [seDialogOpen, setSeDialogOpen] = useState(false);
  const [seType, setSeType] = useState<number>(0);
  const [seUri, setSeUri] = useState('');

  const idTypes = ID_TYPES(theme);

  useEffect(() => {
    if (connected && publicKey) {
      fetchDIDDocument();
      fetchUserCredentials(publicKey as any);
    }
  }, [connected, publicKey, fetchDIDDocument, fetchUserCredentials]);

  // Chain-sync: if localStorage shows 'none' but chain has a record, sync it
  useEffect(() => {
    if (!connected || !publicKey || !kycLoaded || kycStatus !== 'none') return;
    fetchKycRecord(publicKey as any).then((chainRec) => {
      if (!chainRec || chainRec.status === 'none' || chainRec.status === 'pending') return;
      syncFromChain(
        chainRec.status,
        chainRec.idType,
        chainRec.submittedAt,
        chainRec.verifiedAt,
      );
    }).catch(() => {/* ignore if chain read fails */});
  }, [connected, publicKey, kycLoaded, kycStatus, fetchKycRecord, syncFromChain]);

  // ─── Handle ID photo upload ─────────────────────────────────────────────────

  const handleIdFile = useCallback(async (file: File) => {
    setIdFile(file);
    setIdDescriptor(null);
    setIdDetectStatus(null);
    setDocQuality(null);
    setCccdInput('');
    setCccdResult(null);
    const url = URL.createObjectURL(file);
    setIdPreview(url);

    // Run face detection + quality check in parallel
    const img = new Image();
    img.src = url;
    img.onload = async () => {
      idImgRef.current = img;
      setIdDetectStatus('detecting');
      const [desc, quality] = await Promise.all([
        detectFaceDescriptor(img),
        validateDocumentQuality(file, idType ?? 'national_id'),
      ]);
      setIdDetectStatus(desc ? 'found' : 'notfound');
      setIdDescriptor(desc);
      setDocQuality(quality);
    };

    // For a national ID, OCR the card to auto-read & validate the CCCD number.
    if ((idType ?? 'national_id') === 'national_id') {
      setOcrRunning(true);
      setOcrProgress(0);
      setCccdExpanded(true);
      try {
        const ocr = await ocrIdCard(file, (p) => setOcrProgress(Math.round(p * 100)));
        if (ocr.cccd) {
          setCccdInput(ocr.cccd);
          setCccdResult(validateCccd(ocr.cccd));
        }
      } catch { /* user can still type it manually */ }
      finally { setOcrRunning(false); }
    }
  }, [idType]);

  const handleCccdChange = useCallback((value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 12);
    setCccdInput(digits);
    setCccdResult(digits.length === 0 ? null : validateCccd(digits));
  }, []);

  // ─── Handle selfie capture ──────────────────────────────────────────────────

  const handleSelfieCapture = useCallback(async (canvas: HTMLCanvasElement) => {
    setSelfieCanvas(canvas);
    setSelfiePreview(canvas.toDataURL());
    setSelfieDetecting(true);
    setSelfieStatus(null);
    setSelfieDescriptor(null);

    const desc = await detectFaceDescriptor(canvas);
    setSelfieDetecting(false);

    if (!desc) {
      setSelfieStatus('notfound');
      return;
    }
    setSelfieStatus('found');
    setSelfieDescriptor(desc);
  }, []);

  // ─── Final comparison ───────────────────────────────────────────────────────

  const handleCompare = useCallback(async () => {
    if (!idDescriptor || !selfieDescriptor || !idType || !publicKey) return;
    setComparing(true);
    setChainTxSig(null);
    setChainError(null);

    // Small delay for UX
    await new Promise((r) => setTimeout(r, 800));

    const dist = faceDistance(idDescriptor, selfieDescriptor);
    const match = dist < 0.50;
    setCompareResult({ distance: dist, match });
    finalise(idType, dist);
    setComparing(false);

    // Compute privacy-preserving commitment (no raw distance stored on-chain)
    let verificationHash: Uint8Array;
    try {
      verificationHash = await computeVerificationHash(
        selfieDescriptor,
        idType,
        publicKey.toBytes(),
      );
      setVerificationHashHex(Array.from(verificationHash).map((b) => b.toString(16).padStart(2, '0')).join(''));
    } catch {
      setChainError('Failed to compute verification hash');
      return;
    }

    // Write result on-chain (submit pending → finalize). Only the integer face
    // distance (basis points) and the match flag leave the browser.
    try {
      await submitKyc(idType);
      const sig = await finalizeKyc(idType, Math.round(dist * 10000), match);
      setChainTxSig(sig);

      // Anchor the verified KYC as a DID verifiable credential (best-effort:
      // only works once the DID instructions are live on-chain; never blocks KYC).
      if (match) {
        setDidAnchorStatus('anchoring');
        setDidAnchorMsg(null);
        try {
          if (!didDocument) {
            await createDIDDocument();
            await fetchDIDDocument();
          }
          // metadataUri references the same privacy-preserving commitment hash —
          // no raw biometric/document data is anchored.
          const credMeta = `kyc:${idType}:${verificationHashHex ?? Array.from(verificationHash).slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
          await anchorVC('KYC', credMeta);
          await fetchUserCredentials(publicKey as any);
          setDidAnchorStatus('done');
        } catch (didErr: any) {
          const m: string = didErr?.message ?? '';
          setDidAnchorStatus('skipped');
          setDidAnchorMsg(
            m.includes('not yet deployed')
              ? 'DID credential bỏ qua — instruction DID chưa deploy on-chain.'
              : `DID credential bỏ qua: ${m.slice(0, 100)}`,
          );
        }
      }
    } catch (err: any) {
      setChainError(err?.message ?? 'On-chain write failed');
    }
  }, [idDescriptor, selfieDescriptor, idType, publicKey, finalise, submitKyc, finalizeKyc,
      didDocument, createDIDDocument, fetchDIDDocument, anchorVC, fetchUserCredentials, verificationHashHex]);

  const resetKyc = () => {
    setKycStep(0);
    setIdType(null);
    setIdFile(null);
    setIdPreview(null);
    setIdDetectStatus(null);
    setIdDescriptor(null);
    setDocQuality(null);
    setSelfieCanvas(null);
    setSelfiePreview(null);
    setSelfieDescriptor(null);
    setSelfieStatus(null);
    setCompareResult(null);
    setChainTxSig(null);
    setChainError(null);
    setVerificationHashHex(null);
    setMrzLine1('');
    setMrzLine2('');
    setMrzResult(null);
    setMrzExpanded(false);
    setCccdInput('');
    setCccdResult(null);
    setCccdExpanded(false);
    setOcrRunning(false);
    setOcrProgress(0);
    setDidAnchorStatus('idle');
    setDidAnchorMsg(null);
    setLivenessChallenge(pickChallenge()); // fresh challenge on retry
    kycReset();
    resetKycOnChain().catch(() => {});
  };

  const handleMrzChange = useCallback((line1: string, line2: string) => {
    const l1 = line1.toUpperCase().replace(/[^A-Z0-9<]/g, '').slice(0, 44);
    const l2 = line2.toUpperCase().replace(/[^A-Z0-9<]/g, '').slice(0, 44);
    setMrzLine1(l1);
    setMrzLine2(l2);
    if (l1.length === 44 && l2.length === 44) {
      setMrzResult(parseMrz(l1, l2));
    } else {
      setMrzResult(null);
    }
  }, []);

  // ─── DID handlers ───────────────────────────────────────────────────────────

  const handleCreateDID = async () => {
    try { setCreating(true); await createDIDDocument(); setSuccessMessage('DID Document created.'); await fetchDIDDocument(); }
    catch { } finally { setCreating(false); }
  };
  const handleAddVM = async () => {
    try { await addVerificationMethod(vmType, new web3.PublicKey(vmKeyInput) as any); setSuccessMessage('Verification method added.'); setVmDialogOpen(false); setVmKeyInput(''); await fetchDIDDocument(); } catch { }
  };
  const handleRemoveVM = async (index: number) => {
    try { await removeVerificationMethod(index); setSuccessMessage('Verification method removed.'); await fetchDIDDocument(); } catch { }
  };
  const handleAddSE = async () => {
    try { await addServiceEndpoint(seType, seUri); setSuccessMessage('Service endpoint added.'); setSeDialogOpen(false); setSeUri(''); await fetchDIDDocument(); } catch { }
  };

  // ─── Can advance to next step? ──────────────────────────────────────────────

  const canNext =
    (kycStep === 0 && idType !== null) ||
    (kycStep === 1 && idDetectStatus === 'found') ||
    (kycStep === 2 && selfieStatus === 'found');

  const selectedType = idTypes.find((t) => t.value === idType);

  // ─── Page header ─────────────────────────────────────────────────────────────

  const PageHeader = () => (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', background: isDark ? 'linear-gradient(180deg, rgba(0,255,195,0.03) 0%, transparent 100%)' : `linear-gradient(180deg, ${alpha(primaryMain, 0.08)} 0%, transparent 100%)`, px: { xs: 2, md: 4 }, py: { xs: 3, md: 4 } }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.4, mb: 1.5, bgcolor: isDark ? 'rgba(0,255,195,0.06)' : alpha(primaryMain, 0.08), border: 1, borderColor: alpha(primaryMain, 0.2), borderRadius: 1 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: primaryMain, boxShadow: isDark ? `0 0 6px ${primaryMain}` : 'none' }} />
              <Typography sx={{ fontFamily: '"Orbitron", monospace', fontSize: '0.58rem', letterSpacing: '0.12em', color: primaryMain, fontWeight: 700 }}>{'// IDENTITY'}</Typography>
            </Box>
            <Typography variant="h4" fontWeight={800} sx={{ fontFamily: '"Orbitron", sans-serif', background: isDark ? `linear-gradient(135deg, #fff 40%, ${primaryMain} 100%)` : `linear-gradient(135deg, ${theme.palette.text.primary} 40%, ${primaryMain} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.2 }}>
              Identity & KYC
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, fontWeight: 500 }}>
              Real face-match verification · runs entirely in your browser · no data leaves your device
            </Typography>
          </Box>
          {isVerified && <VerifiedBadge size="md" tooltip={false} />}
        </Box>
      </Container>
    </Box>
  );

  // ─── Guards ──────────────────────────────────────────────────────────────────

  if (!connected) {
    return (
      <>
        <PageHeader />
        <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
          <LockOutlined sx={{ fontSize: 52, color: alpha(primaryMain, 0.3), mb: 2 }} />
          <Typography variant="h6" fontWeight={700} gutterBottom>Connect Your Wallet</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontWeight: 500 }}>
            Connect your Solana wallet to start identity verification.
          </Typography>
          <Button variant="contained" size="large" onClick={() => setVisible(true)} sx={{ fontWeight: 700, px: 4 }}>Connect Wallet</Button>
        </Container>
      </>
    );
  }

  if (didLoading && !didDocument) {
    return (
      <>
        <PageHeader />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <LoadingSpinner message="Loading identity data..." />
        </Container>
      </>
    );
  }

  // ─── Verified state ───────────────────────────────────────────────────────────

  const KycVerifiedPanel = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4, textAlign: 'center' }}>
      <Box sx={{ width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(theme.palette.success.main, 0.08), border: 2, borderColor: alpha(theme.palette.success.main, 0.35), boxShadow: isDark ? `0 0 32px ${alpha(theme.palette.success.main, 0.15)}` : 'none' }}>
        <VerifiedUser sx={{ fontSize: 42, color: theme.palette.success.main }} />
      </Box>
      <VerifiedBadge size="md" tooltip={false} />
      <Typography variant="h6" fontWeight={800}>Identity Verified</Typography>
      {record?.faceDistance !== undefined && (
        <Box sx={{ px: 2.5, py: 1, bgcolor: alpha(theme.palette.success.main, 0.06), border: 1, borderColor: alpha(theme.palette.success.main, 0.2), borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            Face match score: <strong style={{ color: theme.palette.success.main }}>{(1 - record.faceDistance).toFixed(3)}</strong>
            {' '}(distance: {record.faceDistance.toFixed(3)})
          </Typography>
        </Box>
      )}
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 380, lineHeight: 1.7, fontWeight: 500 }}>
        Your verified badge is now visible on your public profile and in the freelancer directory.
      </Typography>
      <Button variant="outlined" color="error" size="small" onClick={resetKyc} sx={{ mt: 1, fontSize: '0.75rem', fontWeight: 700 }}>
        Reset Verification
      </Button>
    </Box>
  );

  // ─── Rejected state ────────────────────────────────────────────────────────

  const KycRejectedPanel = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4, textAlign: 'center' }}>
      <Box sx={{ width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(theme.palette.error.main, 0.08), border: 2, borderColor: alpha(theme.palette.error.main, 0.35) }}>
        <ErrorOutline sx={{ fontSize: 42, color: theme.palette.error.main }} />
      </Box>
      <Chip label="FACE MISMATCH" sx={{ fontFamily: '"Orbitron", monospace', fontSize: '0.6rem', fontWeight: 800, letterSpacing: 2, bgcolor: alpha(theme.palette.error.main, 0.08), color: theme.palette.error.main, border: 1, borderColor: alpha(theme.palette.error.main, 0.3) }} />
      <Typography variant="h6" fontWeight={800}>Verification Failed</Typography>
      {record?.faceDistance !== undefined && (
        <Box sx={{ px: 2.5, py: 1, bgcolor: alpha(theme.palette.error.main, 0.05), border: 1, borderColor: alpha(theme.palette.error.main, 0.2), borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            Face distance: <strong style={{ color: theme.palette.error.main }}>{record.faceDistance.toFixed(3)}</strong> (threshold: 0.50)
          </Typography>
        </Box>
      )}
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 380, lineHeight: 1.7, fontWeight: 500 }}>
        The selfie did not match the face in your ID. Ensure good lighting, remove glasses if possible, and try again.
      </Typography>
      <Button variant="contained" color="primary" onClick={resetKyc} sx={{ mt: 1, fontWeight: 700 }}>Try Again</Button>
    </Box>
  );

  // ─── KYC wizard ───────────────────────────────────────────────────────────────

  const KycWizard = () => (
    <Box>
      {/* Model loading banner */}
      {faceApiStatus !== 'ready' && (
        <Box sx={{ mb: 3, px: 2, py: 1.5, bgcolor: isDark ? alpha(primaryMain, 0.03) : alpha(primaryMain, 0.02), border: 1, borderColor: alpha(primaryMain, 0.15), borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {faceApiStatus === 'loading' ? (
            <><CircularProgress size={14} sx={{ color: primaryMain, flexShrink: 0 }} /><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Loading face detection models (~6 MB, cached after first run)...</Typography></>
          ) : faceApiStatus === 'error' ? (
            <><WarningAmberOutlined sx={{ fontSize: 16, color: theme.palette.warning.main, flexShrink: 0 }} /><Typography variant="caption" color="error.main" sx={{ fontWeight: 700 }}>Failed to load face detection models. Try refreshing the page.</Typography></>
          ) : null}
        </Box>
      )}

      {/* Privacy notice */}
      <Box sx={{ mb: 3, px: 2, py: 1.25, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: 1, borderColor: 'divider', borderRadius: 2, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <LockOutlined sx={{ fontSize: 15, color: primaryMain, mt: 0.2, flexShrink: 0 }} />
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.65, fontWeight: 500 }}>
          <strong style={{ color: theme.palette.text.primary, fontWeight: 700 }}>Privacy: </strong>
          All processing happens in your browser using TensorFlow.js. No images or biometric data are ever uploaded to any server.
        </Typography>
      </Box>

      {/* Stepper */}
      <Stepper activeStep={kycStep} sx={{ mb: 4, '& .MuiStepLabel-label': { fontFamily: '"Rajdhani", sans-serif', fontSize: '0.8rem', fontWeight: 600 }, '& .MuiStepIcon-root.Mui-active': { color: primaryMain }, '& .MuiStepIcon-root.Mui-completed': { color: theme.palette.success.main }, '& .MuiStepConnector-line': { borderColor: 'divider' } }}>
        {KYC_STEPS.map((l) => <Step key={l}><StepLabel>{l}</StepLabel></Step>)}
      </Stepper>

      {/* ── Step 0: Document type ─── */}
      {kycStep === 0 && (
        <Box>
          <Typography variant="overline" sx={{ color: primaryMain, letterSpacing: 3, fontSize: '0.6rem', fontWeight: 800, display: 'block', mb: 2 }}>SELECT DOCUMENT TYPE</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)' }, gap: 2 }}>
            {idTypes.map(({ value, label, desc, Icon, color }) => (
              <Card key={value} onClick={() => setIdType(value)} sx={{ cursor: 'pointer', border: idType === value ? 2 : 1, borderColor: idType === value ? color : 'divider', bgcolor: idType === value ? alpha(color, 0.08) : 'background.paper', transition: 'all 0.2s', backgroundImage: 'none', '&:hover': { borderColor: color, bgcolor: alpha(color, 0.05), transform: 'translateY(-2px)' } }}>
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Box sx={{ width: 48, height: 48, borderRadius: '50%', mx: 'auto', mb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(color, 0.1), border: 1, borderColor: alpha(color, 0.2) }}>
                    <Icon sx={{ fontSize: 24, color }} />
                  </Box>
                  <Typography variant="body2" fontWeight={800} gutterBottom sx={{ fontSize: '0.85rem' }}>{label}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>{desc}</Typography>
                  {idType === value && <Box sx={{ mt: 1.5 }}><CheckCircle sx={{ fontSize: 18, color }} /></Box>}
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {/* ── Step 1: ID photo ─── */}
      {kycStep === 1 && (
        <Box>
          <Typography variant="overline" sx={{ color: primaryMain, letterSpacing: 3, fontSize: '0.6rem', fontWeight: 800, display: 'block', mb: 0.5 }}>UPLOAD ID PHOTO</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontWeight: 500 }}>
            Upload a clear photo of your <strong>{selectedType?.label}</strong>. The face must be visible and unobscured.
          </Typography>

          <UploadBox
            label="Click to upload ID photo"
            file={idFile}
            preview={idPreview}
            onFile={handleIdFile}
            status={idDetectStatus}
          />

          {idDetectStatus === 'found' && (
            <Box sx={{ mt: 2, px: 2, py: 1.25, bgcolor: alpha(theme.palette.success.main, 0.05), border: 1, borderColor: alpha(theme.palette.success.main, 0.2), borderRadius: 2 }}>
              <Typography variant="caption" sx={{ color: theme.palette.success.main, fontWeight: 700 }}>
                ✓ Face successfully detected in ID photo. Ready to proceed.
              </Typography>
            </Box>
          )}
          {idDetectStatus === 'notfound' && (
            <Box sx={{ mt: 2, px: 2, py: 1.25, bgcolor: alpha(theme.palette.error.main, 0.05), border: 1, borderColor: alpha(theme.palette.error.main, 0.2), borderRadius: 2 }}>
              <Typography variant="caption" sx={{ color: theme.palette.error.main, fontWeight: 700 }}>
                No face detected. Please upload a photo where your face is clearly visible, well-lit, and not obstructed.
              </Typography>
            </Box>
          )}

          {/* Document quality analysis */}
          {docQuality && (
            <Box sx={{ mt: 2, px: 2, py: 1.5, bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'grey.50', border: 1, borderColor: 'divider', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: docQuality.issues.length > 0 ? 1 : 0 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
                  Document Quality
                </Typography>
                <Chip
                  size="small"
                  label={`${docQuality.score}/100`}
                  sx={{
                    height: 20, fontSize: '0.65rem', fontWeight: 800,
                    bgcolor: docQuality.score >= 75 ? alpha(theme.palette.success.main, 0.1) : docQuality.score >= 50 ? alpha(theme.palette.warning.main, 0.1) : alpha(theme.palette.error.main, 0.1),
                    color: docQuality.score >= 75 ? theme.palette.success.main : docQuality.score >= 50 ? theme.palette.warning.main : theme.palette.error.main,
                  }}
                />
              </Box>
              {docQuality.issues.map((issue) => (
                <Box key={issue} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mt: 0.5 }}>
                  <WarningAmberOutlined sx={{ fontSize: 13, color: theme.palette.warning.main, mt: 0.1, flexShrink: 0 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, lineHeight: 1.5 }}>{issue}</Typography>
                </Box>
              ))}
              {docQuality.issues.length === 0 && (
                <Typography variant="caption" sx={{ color: theme.palette.success.main, fontWeight: 700 }}>
                  ✓ Image quality looks good
                </Typography>
              )}
              {docQuality.warnings.map((w) => (
                <Box key={w} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mt: 0.5 }}>
                  <WarningAmberOutlined sx={{ fontSize: 13, color: alpha(theme.palette.warning.main, 0.7), mt: 0.1, flexShrink: 0 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, lineHeight: 1.5 }}>{w}</Typography>
                </Box>
              ))}
              {docQuality.screenLikelihood > 0.3 && (
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Screen likelihood:</Typography>
                  <Box sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                    <Box sx={{ height: '100%', borderRadius: 2, width: `${(docQuality.screenLikelihood * 100).toFixed(0)}%`, bgcolor: docQuality.screenLikelihood > 0.65 ? theme.palette.error.main : theme.palette.warning.main }} />
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: docQuality.screenLikelihood > 0.65 ? theme.palette.error.main : theme.palette.warning.main }}>
                    {(docQuality.screenLikelihood * 100).toFixed(0)}%
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* MRZ entry — passport only */}
          {idType === 'passport' && idDetectStatus === 'found' && (
            <Box sx={{ mt: 2 }}>
              <Box
                onClick={() => setMrzExpanded(!mrzExpanded)}
                sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.25, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'grey.50', border: 1, borderColor: mrzResult?.valid ? alpha(theme.palette.success.main, 0.3) : 'divider', borderRadius: 2, cursor: 'pointer', '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'grey.100' } }}
              >
                <KeyIcon sx={{ fontSize: 15, color: mrzResult?.valid ? theme.palette.success.main : alpha(secondaryMain, 0.6), flexShrink: 0 }} />
                <Typography variant="caption" sx={{ flex: 1, fontWeight: 700, color: mrzResult?.valid ? theme.palette.success.main : 'text.secondary' }}>
                  {mrzResult?.valid ? '✓ MRZ Verified — Checksum Valid' : 'MRZ Verification (Optional — paste passport MRZ lines)'}
                </Typography>
                {mrzExpanded ? <ExpandLessOutlined sx={{ fontSize: 16, color: 'text.disabled' }} /> : <ExpandMoreOutlined sx={{ fontSize: 16, color: 'text.disabled' }} />}
              </Box>
              <Collapse in={mrzExpanded}>
                <Box sx={{ mt: 1.5, px: 0.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ px: 2, py: 1, bgcolor: alpha(primaryMain, 0.03), border: 1, borderColor: alpha(primaryMain, 0.1), borderRadius: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, lineHeight: 1.6 }}>
                      Open your passport to the photo page. At the very bottom are two rows of characters — the Machine Readable Zone (MRZ). Copy them exactly (use &lt;&lt;&lt; for filler).
                    </Typography>
                  </Box>
                  <TextField
                    label="MRZ Line 1 (44 chars)"
                    value={mrzLine1}
                    onChange={(e) => handleMrzChange(e.target.value, mrzLine2)}
                    fullWidth
                    size="small"
                    inputProps={{ maxLength: 44, style: { fontFamily: 'monospace', letterSpacing: '0.12em', fontSize: '0.8rem' } }}
                    placeholder="P<VNMnguyen<<VAN<<AN<<<<<<<<<<<<<<<<<<<<<<<"
                    helperText={`${mrzLine1.length}/44`}
                  />
                  <TextField
                    label="MRZ Line 2 (44 chars)"
                    value={mrzLine2}
                    onChange={(e) => handleMrzChange(mrzLine1, e.target.value)}
                    fullWidth
                    size="small"
                    inputProps={{ maxLength: 44, style: { fontFamily: 'monospace', letterSpacing: '0.12em', fontSize: '0.8rem' } }}
                    placeholder="AB1234567VNM8901012M2512318<<<<<<<<<<<<<<<4"
                    helperText={`${mrzLine2.length}/44`}
                  />
                  {mrzResult && (
                    <Box sx={{ px: 2, py: 1.25, bgcolor: mrzResult.valid ? alpha(theme.palette.success.main, 0.05) : alpha(theme.palette.error.main, 0.05), border: 1, borderColor: mrzResult.valid ? alpha(theme.palette.success.main, 0.25) : alpha(theme.palette.error.main, 0.25), borderRadius: 1.5 }}>
                      <Box sx={{ display: 'flex', gap: 2, mb: mrzResult.issues.length > 0 ? 1 : 0 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.25 }}>DOB checksum</Typography>
                          <Chip size="small" label={mrzResult.dobChecksumOk ? '✓ VALID' : '✗ INVALID'} sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, bgcolor: mrzResult.dobChecksumOk ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.error.main, 0.1), color: mrzResult.dobChecksumOk ? theme.palette.success.main : theme.palette.error.main }} />
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.25 }}>Expiry checksum</Typography>
                          <Chip size="small" label={mrzResult.expiryChecksumOk ? '✓ VALID' : '✗ INVALID'} sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, bgcolor: mrzResult.expiryChecksumOk ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.error.main, 0.1), color: mrzResult.expiryChecksumOk ? theme.palette.success.main : theme.palette.error.main }} />
                        </Box>
                        {mrzResult.nationality && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.25 }}>Nationality</Typography>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 800, color: primaryMain }}>{mrzResult.nationality}</Typography>
                          </Box>
                        )}
                      </Box>
                      {mrzResult.issues.map((iss) => (
                        <Typography key={iss} variant="caption" sx={{ color: theme.palette.error.main, display: 'block', fontWeight: 700 }}>⚠ {iss}</Typography>
                      ))}
                    </Box>
                  )}
                </Box>
              </Collapse>
            </Box>
          )}

          {/* CCCD number check — national ID only */}
          {idType === 'national_id' && (idDetectStatus === 'found' || ocrRunning || cccdInput) && (
            <Box sx={{ mt: 2 }}>
              <Box
                onClick={() => setCccdExpanded(!cccdExpanded)}
                sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.25, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'grey.50', border: 1, borderColor: cccdResult?.valid ? alpha(theme.palette.success.main, 0.3) : cccdResult && cccdResult.issues.length ? alpha(theme.palette.error.main, 0.3) : 'divider', borderRadius: 2, cursor: 'pointer', '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'grey.100' } }}
              >
                <BadgeOutlined sx={{ fontSize: 16, color: cccdResult?.valid ? theme.palette.success.main : alpha(primaryMain, 0.7), flexShrink: 0 }} />
                <Typography variant="caption" sx={{ flex: 1, fontWeight: 700, color: cccdResult?.valid ? theme.palette.success.main : cccdResult && cccdResult.issues.length ? theme.palette.error.main : 'text.secondary' }}>
                  {ocrRunning
                    ? `Đang quét số CCCD... ${ocrProgress}%`
                    : cccdResult?.valid
                      ? `✓ Số CCCD hợp lệ — ${cccdResult.province}`
                      : cccdResult && cccdResult.issues.length
                        ? '✗ Số CCCD nghi vấn'
                        : 'Kiểm tra số CCCD (12 số)'}
                </Typography>
                {cccdExpanded ? <ExpandLessOutlined sx={{ fontSize: 16, color: 'text.disabled' }} /> : <ExpandMoreOutlined sx={{ fontSize: 16, color: 'text.disabled' }} />}
              </Box>
              <Collapse in={cccdExpanded}>
                <Box sx={{ mt: 1.5, px: 0.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {ocrRunning && <LinearProgress variant="determinate" value={ocrProgress} sx={{ borderRadius: 1 }} />}
                  <Box sx={{ px: 2, py: 1, bgcolor: alpha(primaryMain, 0.03), border: 1, borderColor: alpha(primaryMain, 0.1), borderRadius: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, lineHeight: 1.6 }}>
                      Hệ thống tự đọc số CCCD từ ảnh thẻ. Kiểm tra lại và sửa nếu sai. Cấu trúc 12 số (mã tỉnh + giới tính/thế kỷ + năm sinh) được dùng để phát hiện số bịa.
                    </Typography>
                  </Box>
                  <TextField
                    label="Số CCCD (12 số)"
                    value={cccdInput}
                    onChange={(e) => handleCccdChange(e.target.value)}
                    fullWidth
                    size="small"
                    inputProps={{ inputMode: 'numeric', maxLength: 12, style: { fontFamily: 'monospace', letterSpacing: '0.18em', fontSize: '0.9rem' } }}
                    placeholder="079201012345"
                    helperText={`${cccdInput.length}/12`}
                  />
                  {cccdResult && cccdInput.length === 12 && (
                    <Box sx={{ px: 2, py: 1.25, bgcolor: cccdResult.valid ? alpha(theme.palette.success.main, 0.05) : alpha(theme.palette.error.main, 0.05), border: 1, borderColor: cccdResult.valid ? alpha(theme.palette.success.main, 0.25) : alpha(theme.palette.error.main, 0.25), borderRadius: 1.5 }}>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: (cccdResult.issues.length || cccdResult.warnings.length) ? 1 : 0 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.25 }}>Tỉnh/TP</Typography>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 800, color: cccdResult.province ? primaryMain : theme.palette.error.main }}>{cccdResult.province ?? `${cccdResult.provinceCode}?`}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.25 }}>Giới tính</Typography>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 800, color: primaryMain }}>{cccdResult.gender ?? '—'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.25 }}>Năm sinh</Typography>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 800, color: primaryMain }}>{cccdResult.birthYear ?? '—'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.25 }}>Độ tin cậy</Typography>
                          <Chip size="small" label={`${cccdResult.score}/100`} sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, bgcolor: cccdResult.valid ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.warning.main, 0.1), color: cccdResult.valid ? theme.palette.success.main : theme.palette.warning.main }} />
                        </Box>
                      </Box>
                      {cccdResult.issues.map((iss) => (
                        <Typography key={iss} variant="caption" sx={{ color: theme.palette.error.main, display: 'block', fontWeight: 700 }}>⚠ {iss}</Typography>
                      ))}
                      {cccdResult.warnings.map((w) => (
                        <Typography key={w} variant="caption" sx={{ color: theme.palette.warning.main, display: 'block', fontWeight: 600 }}>• {w}</Typography>
                      ))}
                    </Box>
                  )}
                </Box>
              </Collapse>
            </Box>
          )}
        </Box>
      )}

      {/* ── Step 2: Selfie (webcam) ─── */}
      {kycStep === 2 && (
        <Box>
          <Typography variant="overline" sx={{ color: primaryMain, letterSpacing: 3, fontSize: '0.6rem', fontWeight: 800, display: 'block', mb: 0.5 }}>CAPTURE SELFIE + LIVENESS CHECK</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontWeight: 500 }}>
            Your face will be compared against the ID photo. Complete the liveness challenge to prove you&apos;re live — not a printed photo.
          </Typography>
          {/* Liveness challenge badge */}
          <Box sx={{ mb: 3, px: 2, py: 1.25, bgcolor: alpha(theme.palette.warning.main, 0.05), border: 1, borderColor: alpha(theme.palette.warning.main, 0.2), borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <WarningAmberOutlined sx={{ fontSize: 16, color: theme.palette.warning.main, flexShrink: 0 }} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.warning.main }}>
              Liveness challenge: <strong>{livenessChallenge.hint}</strong>
            </Typography>
            <Button size="small" sx={{ ml: 'auto', fontSize: '0.65rem', fontWeight: 700, minWidth: 0, py: 0.25, px: 1 }}
              onClick={() => setLivenessChallenge(pickChallenge())}>
              New
            </Button>
          </Box>

          {selfiePreview ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Box sx={{ position: 'relative', borderRadius: 3, overflow: 'hidden', border: 2, borderColor: selfieStatus === 'found' ? theme.palette.success.main : theme.palette.error.main }}>
                <img src={selfiePreview} alt="selfie" style={{ display: 'block', width: 320, height: 240, objectFit: 'cover', transform: 'scaleX(-1)' }} />
                {selfieDetecting && (
                  <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.5)' }}>
                    <CircularProgress sx={{ color: primaryMain }} />
                  </Box>
                )}
              </Box>
              {selfieStatus === 'found' && (
                <Chip label="FACE DETECTED ✓" size="small" sx={{ fontFamily: '"Orbitron", monospace', fontSize: '0.6rem', fontWeight: 800, letterSpacing: 2, bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main, border: 1, borderColor: alpha(theme.palette.success.main, 0.3) }} />
              )}
              {selfieStatus === 'notfound' && (
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: theme.palette.error.main, display: 'block', mb: 1, fontWeight: 700 }}>No face detected in capture. Please try again with better lighting.</Typography>
                  <Button variant="outlined" color="error" size="small" onClick={() => { setSelfiePreview(null); setSelfieStatus(null); setSelfieDescriptor(null); }} sx={{ fontSize: '0.75rem', fontWeight: 700 }}>Retake</Button>
                </Box>
              )}
              {selfieStatus === 'found' && (
                <Button variant="outlined" size="small" onClick={() => { setSelfiePreview(null); setSelfieStatus(null); setSelfieDescriptor(null); }} sx={{ fontSize: '0.75rem', fontWeight: 700, borderColor: 'divider' }}>Retake</Button>
              )}
            </Box>
          ) : (
            <WebcamCapture onCapture={handleSelfieCapture} faceReady={faceApiStatus === 'ready'} challenge={livenessChallenge} />
          )}
        </Box>
      )}

      {/* ── Step 3: Comparison result ─── */}
      {kycStep === 3 && (
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="overline" sx={{ color: primaryMain, letterSpacing: 3, fontSize: '0.6rem', fontWeight: 800, display: 'block', mb: 3 }}>FACE COMPARISON</Typography>

          {comparing ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <CircularProgress sx={{ color: primaryMain }} />
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Comparing facial features...</Typography>
              <LinearProgress sx={{ width: 240, height: 4, borderRadius: 2, bgcolor: alpha(primaryMain, 0.1), '& .MuiLinearProgress-bar': { bgcolor: primaryMain } }} />
            </Box>
          ) : compareResult ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2.5 }}>
              <Box sx={{ width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: compareResult.match ? alpha(theme.palette.success.main, 0.08) : alpha(theme.palette.error.main, 0.08), border: 2, borderColor: compareResult.match ? alpha(theme.palette.success.main, 0.4) : alpha(theme.palette.error.main, 0.4), boxShadow: compareResult.match ? `0 0 28px ${alpha(theme.palette.success.main, 0.2)}` : 'none' }}>
                {compareResult.match ? <CheckCircle sx={{ fontSize: 44, color: theme.palette.success.main }} /> : <ErrorOutline sx={{ fontSize: 44, color: theme.palette.error.main }} />}
              </Box>

              <Typography variant="h6" fontWeight={800} sx={{ color: compareResult.match ? theme.palette.success.main : theme.palette.error.main }}>
                {compareResult.match ? 'Face Match Confirmed' : 'Face Mismatch Detected'}
              </Typography>

              {/* Score details */}
              <Box sx={{ px: 3, py: 2.5, bgcolor: isDark ? 'rgba(0,0,0,0.3)' : 'grey.50', border: 1, borderColor: 'divider', borderRadius: 2, minWidth: 280 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Biometric Analysis</Typography>
                {[
                  { label: 'Euclidean Distance', value: compareResult.distance.toFixed(4), ok: compareResult.distance < 0.50 },
                  { label: 'Similarity Score', value: `${((1 - compareResult.distance) * 100).toFixed(1)}%`, ok: compareResult.match },
                  { label: 'Threshold', value: '0.50 (verified if below)' },
                  { label: 'Result', value: compareResult.match ? 'MATCH' : 'MISMATCH', ok: compareResult.match },
                ].map(({ label, value, ok }) => (
                  <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{label}</Typography>
                    <Typography variant="caption" fontWeight={800} sx={{ fontFamily: 'monospace', color: ok === undefined ? 'text.secondary' : ok ? theme.palette.success.main : theme.palette.error.main }}>{value}</Typography>
                  </Box>
                ))}
              </Box>

              {/* Document checks summary */}
              <Box sx={{ px: 3, py: 2.5, bgcolor: isDark ? 'rgba(0,0,0,0.3)' : 'grey.50', border: 1, borderColor: 'divider', borderRadius: 2, minWidth: 280, textAlign: 'left' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Document Checks</Typography>
                {[
                  { label: 'Face detected in ID', ok: idDetectStatus === 'found' },
                  { label: `Image quality`, ok: docQuality ? docQuality.ok : null, extra: docQuality ? `${docQuality.score}/100` : undefined },
                  { label: 'Screen artifact', ok: docQuality ? docQuality.screenLikelihood < 0.4 : null, extra: docQuality ? `${(docQuality.screenLikelihood * 100).toFixed(0)}% likelihood` : undefined, invertOk: true },
                  { label: 'Liveness challenge', ok: true, extra: livenessChallenge.label },
                  ...(idType === 'passport' && mrzResult ? [{ label: 'MRZ checksum', ok: mrzResult.valid, extra: mrzResult.valid ? `${mrzResult.nationality}` : 'INVALID' }] : []),
                  ...(idType === 'national_id' && cccdResult ? [{ label: 'CCCD number', ok: cccdResult.valid, extra: cccdResult.valid ? `${cccdResult.province}` : 'INVALID' }] : []),
                ].map(({ label, ok, extra }) => (
                  <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, bgcolor: ok === null ? 'text.disabled' : ok ? theme.palette.success.main : theme.palette.error.main }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{label}</Typography>
                    </Box>
                    <Typography variant="caption" fontWeight={800} sx={{ fontFamily: 'monospace', fontSize: '0.65rem', color: ok === null ? 'text.disabled' : ok ? theme.palette.success.main : theme.palette.error.main }}>
                      {ok === null ? 'N/A' : ok ? `✓${extra ? ' ' + extra : ''}` : `✗${extra ? ' ' + extra : ''}`}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Verification hash (on-chain commitment) */}
              {verificationHashHex && (
                <Box sx={{ px: 2.5, py: 2, bgcolor: isDark ? 'rgba(0,0,0,0.25)' : 'grey.50', border: 1, borderColor: 'divider', borderRadius: 2, minWidth: 280, textAlign: 'left' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <LockOutlined sx={{ fontSize: 13, color: alpha(primaryMain, 0.7) }} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, fontSize: '0.6rem' }}>On-Chain Commitment (SHA-256)</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.6rem', color: alpha(primaryMain, 0.8), wordBreak: 'break-all', lineHeight: 1.8, display: 'block' }}>
                    {verificationHashHex.slice(0, 32)}<br />{verificationHashHex.slice(32)}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1, fontWeight: 500, fontSize: '0.58rem', lineHeight: 1.5 }}>
                    SHA-256(quantized_face_descriptor ‖ doc_type ‖ wallet_pubkey) — raw biometrics are never stored.
                  </Typography>
                </Box>
              )}

              {/* On-chain status */}
              {kycChainLoading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.25, bgcolor: alpha(primaryMain, 0.04), border: 1, borderColor: alpha(primaryMain, 0.15), borderRadius: 2, minWidth: 280 }}>
                  <CircularProgress size={14} sx={{ color: primaryMain, flexShrink: 0 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Writing result to Solana...</Typography>
                </Box>
              )}
              {chainTxSig && (
                <Box sx={{ px: 2.5, py: 1.25, bgcolor: alpha(theme.palette.success.main, 0.04), border: 1, borderColor: alpha(theme.palette.success.main, 0.2), borderRadius: 2, minWidth: 280 }}>
                  <Typography variant="caption" sx={{ color: theme.palette.success.main, display: 'block', mb: 0.5, fontWeight: 700 }}>✓ Recorded on Solana</Typography>
                  <Typography
                    component="a"
                    href={`https://explorer.solana.com/tx/${chainTxSig}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="caption"
                    sx={{ fontFamily: 'monospace', color: primaryMain, wordBreak: 'break-all', textDecoration: 'none', fontWeight: 700, '&:hover': { textDecoration: 'underline' } }}
                  >
                    {chainTxSig.slice(0, 32)}…
                  </Typography>
                </Box>
              )}
              {chainTxSig && didAnchorStatus !== 'idle' && (
                <Box sx={{ px: 2.5, py: 1.25, bgcolor: alpha(didAnchorStatus === 'done' ? theme.palette.success.main : secondaryMain, 0.04), border: 1, borderColor: alpha(didAnchorStatus === 'done' ? theme.palette.success.main : secondaryMain, 0.2), borderRadius: 2, minWidth: 280 }}>
                  <Typography variant="caption" sx={{ color: didAnchorStatus === 'done' ? theme.palette.success.main : secondaryMain, display: 'block', fontWeight: 700 }}>
                    {didAnchorStatus === 'anchoring' && '⏳ Đang ghi DID credential...'}
                    {didAnchorStatus === 'done' && '✓ KYC đã anchor làm Verifiable Credential (DID)'}
                    {didAnchorStatus === 'skipped' && 'ℹ DID credential bỏ qua'}
                  </Typography>
                  {didAnchorMsg && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25, fontWeight: 500 }}>{didAnchorMsg}</Typography>
                  )}
                </Box>
              )}
              {chainError && (
                <Box sx={{ px: 2.5, py: 1.25, bgcolor: alpha(theme.palette.warning.main, 0.05), border: 1, borderColor: alpha(theme.palette.warning.main, 0.2), borderRadius: 2, minWidth: 280 }}>
                  <Typography variant="caption" sx={{ color: theme.palette.warning.main, display: 'block', fontWeight: 600 }}>
                    On-chain write skipped: {chainError}
                  </Typography>
                </Box>
              )}

              {!compareResult.match && (
                <Button variant="contained" onClick={resetKyc} startIcon={<ArrowBack />} sx={{ fontWeight: 700 }}>Try Again</Button>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <CircularProgress sx={{ color: primaryMain }} />
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Initializing face comparison...</Typography>
              <Button variant="text" size="small" startIcon={<FingerprintIcon />} onClick={handleCompare} disabled={!idDescriptor || !selfieDescriptor || faceApiStatus !== 'ready'} sx={{ fontWeight: 700, opacity: 0.6 }}>
                Run manually
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* Nav buttons */}
      <Box sx={{ display: 'flex', justifyContent: kycStep > 0 ? 'space-between' : 'flex-end', mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
        {kycStep > 0 && (kycStep < 3 || (!comparing && !compareResult)) && (
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => setKycStep((s) => s - 1)} sx={{ borderColor: 'divider', color: 'text.secondary', fontWeight: 700 }}>Back</Button>
        )}
        {kycStep < 3 && (
          <Button
            variant="contained"
            endIcon={<ArrowForward />}
            onClick={() => {
              if (kycStep === 0 && idType) startPending(idType);
              const next = kycStep + 1;
              setKycStep(next);
              if (next === 3) handleCompare();
            }}
            disabled={!canNext || faceApiStatus !== 'ready'}
            sx={{ fontWeight: 700, px: 4 }}
          >
            {kycStep === 2 ? 'Compare Faces' : 'Continue'}
          </Button>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      <PageHeader />
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>

          {successMessage && (
            <Alert severity="success" sx={{ mb: 3, fontWeight: 600 }} onClose={() => setSuccessMessage(null)}>{successMessage}</Alert>
          )}

          {/* ── KYC Section ── */}
          <Box sx={{ border: 1, borderColor: isDark ? alpha(primaryMain, 0.15) : 'divider', borderRadius: 3, overflow: 'hidden', mb: 5, bgcolor: 'background.paper' }}>
            <Box sx={{ px: 3, py: 2.5, borderBottom: 1, borderColor: 'divider', bgcolor: isDark ? 'rgba(0,0,0,0.2)' : '#f8fafc', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <FingerprintIcon sx={{ fontSize: 20, color: primaryMain }} />
              <Typography variant="overline" sx={{ color: primaryMain, letterSpacing: 3, fontSize: '0.65rem', flex: 1, fontWeight: 800 }}>
                CITIZEN IDENTITY VERIFICATION (KYC)
              </Typography>
              {isVerified && <VerifiedBadge size="sm" />}
            </Box>

            <Box sx={{ p: { xs: 2.5, md: 4 } }}>
              {kycStatus === 'verified' ? (
                <KycVerifiedPanel />
              ) : kycStatus === 'rejected' ? (
                <KycRejectedPanel />
              ) : (
                <KycWizard />
              )}
            </Box>
          </Box>

          {/* ── DID Section (collapsible) ── */}
          <Box sx={{ border: 1, borderColor: isDark ? alpha(secondaryMain, 0.15) : 'divider', borderRadius: 3, overflow: 'hidden', bgcolor: 'background.paper' }}>
            <Box onClick={() => setDidExpanded(!didExpanded)} sx={{ px: 3, py: 2.5, bgcolor: isDark ? 'rgba(0,0,0,0.2)' : '#f8fafc', display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', '&:hover': { bgcolor: isDark ? 'rgba(0,0,0,0.3)' : 'grey.100' } }}>
              <KeyIcon sx={{ fontSize: 18, color: alpha(secondaryMain, 0.8) }} />
              <Typography variant="overline" sx={{ color: alpha(secondaryMain, 0.8), letterSpacing: 3, fontSize: '0.65rem', flex: 1, fontWeight: 800 }}>DECENTRALIZED IDENTITY (DID)</Typography>
              <Chip label="Coming Soon" size="small" sx={{ fontSize: '0.6rem', height: 20, fontWeight: 800, bgcolor: alpha(secondaryMain, 0.1), color: secondaryMain, border: 1, borderColor: alpha(secondaryMain, 0.2) }} />
              {didExpanded ? <ExpandLessOutlined sx={{ fontSize: 18, color: 'text.disabled' }} /> : <ExpandMoreOutlined sx={{ fontSize: 18, color: 'text.disabled' }} />}
            </Box>

            <Collapse in={didExpanded}>
              <Box sx={{ p: { xs: 2.5, md: 4 } }}>
                {!isDeployed ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <FingerprintIcon sx={{ fontSize: 56, color: alpha(secondaryMain, 0.2), mb: 2 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>On-chain DID documents with verifiable credentials. Available after mainnet deployment.</Typography>
                  </Box>
                ) : !didDocument ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontWeight: 500 }}>Create your Decentralized Identity to link credentials and social accounts on-chain.</Typography>
                    <Button variant="outlined" startIcon={<FingerprintIcon />} onClick={handleCreateDID} disabled={creating || didLoading} sx={{ borderColor: alpha(secondaryMain, 0.4), color: secondaryMain, fontWeight: 700, '&:hover': { borderColor: secondaryMain, bgcolor: alpha(secondaryMain, 0.05) } }}>
                      {creating ? 'Creating...' : 'Create DID Document'}
                    </Button>
                  </Box>
                ) : (
                  <>
                    <Box sx={{ mb: 4, p: 2.5, bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'grey.50', border: 1, borderColor: 'divider', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="overline" sx={{ color: alpha(secondaryMain, 0.8), letterSpacing: 2, fontSize: '0.6rem', fontWeight: 800 }}>DID DOCUMENT</Typography>
                        <Chip label={didDocument.active ? 'Active' : 'Deactivated'} color={didDocument.active ? 'success' : 'error'} size="small" sx={{ fontWeight: 700 }} />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>DID URI</Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', color: secondaryMain, fontWeight: 700, wordBreak: 'break-all', mt: 0.5, mb: 2 }}>{String(didDocument.didUri)}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Owner</Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', mt: 0.5, fontWeight: 600 }}>{String(didDocument.owner)}</Typography>
                    </Box>

                    <Box sx={{ mb: 4 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <KeyIcon sx={{ fontSize: 18, color: secondaryMain }} />
                          <Typography variant="subtitle2" fontWeight={800}>Verification Methods</Typography>
                          <Chip label={didDocument.verificationMethodCount} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
                        </Box>
                        <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setVmDialogOpen(true)} sx={{ fontSize: '0.75rem', borderColor: alpha(secondaryMain, 0.4), color: secondaryMain, fontWeight: 700 }}>Add</Button>
                      </Box>
                      {didDocument.verificationMethodCount === 0 ? (
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>No verification methods added yet.</Typography>
                      ) : (
                        <List disablePadding dense>
                          {didDocument.vmTypes.slice(0, didDocument.verificationMethodCount).map((type: number, index: number) => (
                            <Box key={index}>
                              {index > 0 && <Divider sx={{ my: 1 }} />}
                              <ListItem sx={{ px: 0 }}>
                                <ListItemText primary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}><Typography variant="body2" fontWeight={700}>{vmTypeLabels[type] || `Type ${type}`}</Typography><Chip label={`#${index}`} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }} /></Box>} secondary={<Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 500, display: 'block', mt: 0.5 }}>Controller: {String(didDocument.vmControllers[index] ?? '')?.slice(0, 24)}...</Typography>} />
                                <ListItemSecondaryAction><IconButton edge="end" size="small" color="error" onClick={() => handleRemoveVM(index)} disabled={didLoading}><DeleteIcon sx={{ fontSize: 18 }} /></IconButton></ListItemSecondaryAction>
                              </ListItem>
                            </Box>
                          ))}
                        </List>
                      )}
                    </Box>

                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <LinkIcon sx={{ fontSize: 18, color: secondaryMain }} />
                          <Typography variant="subtitle2" fontWeight={800}>Service Endpoints</Typography>
                          <Chip label={didDocument.serviceEndpointCount} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
                        </Box>
                        <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setSeDialogOpen(true)} sx={{ fontSize: '0.75rem', borderColor: alpha(secondaryMain, 0.4), color: secondaryMain, fontWeight: 700 }}>Add</Button>
                      </Box>
                      {didDocument.serviceEndpointCount === 0 ? (
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>No service endpoints linked yet.</Typography>
                      ) : (
                        <List disablePadding dense>
                          {didDocument.seTypes.slice(0, didDocument.serviceEndpointCount).map((type: number, index: number) => (
                            <Box key={index}>
                              {index > 0 && <Divider sx={{ my: 1 }} />}
                              <ListItem sx={{ px: 0 }}>
                                <ListItemText primary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}><Typography variant="body2" fontWeight={700}>{serviceTypeLabels[type] || `Service ${type}`}</Typography>{didDocument.seVerified[index] && <Chip icon={<VerifiedIcon sx={{ fontSize: '0.9rem !important' }} />} label="Verified" size="small" color="success" variant="outlined" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }} />}</Box>} secondary={<Typography variant="caption" sx={{ fontFamily: 'monospace', color: secondaryMain, wordBreak: 'break-all', fontWeight: 600, display: 'block', mt: 0.5 }}>{String(didDocument.seUris[index] ?? '')}</Typography>} />
                              </ListItem>
                            </Box>
                          ))}
                        </List>
                      )}
                    </Box>
                  </>
                )}
              </Box>
            </Collapse>
          </Box>

        </Box>
      </Container>

      {/* DID Dialogs */}
      <Dialog open={vmDialogOpen} onClose={() => setVmDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundImage: 'none' } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Verification Method</DialogTitle>
        <DialogContent dividers={!isDark}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Method Type</InputLabel>
              <Select value={vmType} label="Method Type" onChange={(e) => setVmType(Number(e.target.value))}>
                {Object.entries(vmTypeLabels).map(([value, label]) => <MenuItem key={value} value={Number(value)} sx={{ fontWeight: 500 }}>{label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Public Key (Base58)" value={vmKeyInput} onChange={(e) => setVmKeyInput(e.target.value)} fullWidth placeholder="Enter the public key" />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setVmDialogOpen(false)} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" onClick={handleAddVM} disabled={!vmKeyInput || didLoading} sx={{ fontWeight: 700, px: 3 }}>{didLoading ? 'Adding...' : 'Add Method'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={seDialogOpen} onClose={() => setSeDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundImage: 'none' } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Service Endpoint</DialogTitle>
        <DialogContent dividers={!isDark}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Service Type</InputLabel>
              <Select value={seType} label="Service Type" onChange={(e) => setSeType(Number(e.target.value))}>
                {Object.entries(serviceTypeLabels).map(([value, label]) => <MenuItem key={value} value={Number(value)} sx={{ fontWeight: 500 }}>{label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Endpoint URI" value={seUri} onChange={(e) => setSeUri(e.target.value)} fullWidth placeholder="https://github.com/your-username" />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setSeDialogOpen(false)} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" onClick={handleAddSE} disabled={!seUri || didLoading} sx={{ fontWeight: 700, px: 3 }}>{didLoading ? 'Adding...' : 'Add Endpoint'}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
