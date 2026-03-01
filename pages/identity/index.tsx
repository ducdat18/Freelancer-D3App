import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Container, Typography, Box, Button, Chip, Alert,
  IconButton, List, ListItem, ListItemText, ListItemSecondaryAction,
  Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Card, CardContent, Stepper, Step, StepLabel, LinearProgress, Collapse,
  CircularProgress,
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
  WarningAmberOutlined,
} from '@mui/icons-material';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { web3 } from '@coral-xyz/anchor';
import Layout from '../../src/components/Layout';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import VerifiedBadge from '../../src/components/VerifiedBadge';
import { useSolanaProgram } from '../../src/hooks/useSolanaProgram';
import { useDID } from '../../src/hooks/useDID';
import { useIdentityVerification } from '../../src/hooks/useIdentityVerification';
import { useFaceApi } from '../../src/hooks/useFaceApi';
import { detectFaceDescriptor, faceDistance } from '../../src/hooks/useFaceApi';
import type { FaceDescriptor } from '../../src/hooks/useFaceApi';
import {
  ServiceType,
  VerificationMethodType,
} from '../../src/types';

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

const ID_TYPES = [
  { value: 'national_id' as const, label: 'National ID Card', desc: 'Government citizen ID', Icon: BadgeOutlined, color: '#00ffc3' },
  { value: 'passport' as const, label: 'Passport', desc: 'International travel document', Icon: AirplaneTicketOutlined, color: '#9945ff' },
  { value: 'drivers_license' as const, label: "Driver's License", desc: 'Government driving permit', Icon: CreditCardOutlined, color: '#2196f3' },
];

const KYC_STEPS = ['Document Type', 'ID Photo', 'Selfie', 'Result'];

// ─── UploadBox ────────────────────────────────────────────────────────────────

function UploadBox({ label, file, preview, onFile, status }: {
  label: string; file: File | null; preview: string | null;
  onFile: (f: File) => void;
  status?: 'detecting' | 'found' | 'notfound' | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <Box
      onClick={() => inputRef.current?.click()}
      sx={{
        flex: 1, minHeight: 160,
        position: 'relative',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
        border: status === 'found'
          ? '1px solid rgba(76,175,80,0.5)'
          : status === 'notfound'
            ? '1px solid rgba(244,67,54,0.4)'
            : '1.5px dashed rgba(0,255,195,0.25)',
        borderRadius: 2,
        bgcolor: status === 'found' ? 'rgba(76,175,80,0.05)' : 'rgba(0,255,195,0.02)',
        cursor: 'pointer', transition: 'all 0.2s', overflow: 'hidden',
        '&:hover': { borderColor: 'rgba(0,255,195,0.5)', bgcolor: 'rgba(0,255,195,0.04)' },
      }}
    >
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); }} />

      {preview ? (
        <img src={preview} alt="ID preview" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, opacity: 0.55 }} />
      ) : null}

      <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', px: 2 }}>
        {status === 'detecting' ? (
          <><CircularProgress size={24} sx={{ color: '#00ffc3', mb: 0.5 }} /><Typography variant="caption" color="text.secondary">Detecting face...</Typography></>
        ) : status === 'found' ? (
          <><CheckCircle sx={{ fontSize: 28, color: '#4caf50' }} /><Typography variant="caption" sx={{ color: '#4caf50' }}>Face detected ✓</Typography></>
        ) : status === 'notfound' ? (
          <><ErrorOutline sx={{ fontSize: 28, color: '#f44336' }} /><Typography variant="caption" sx={{ color: '#f44336' }}>No face found — try a clearer photo</Typography></>
        ) : file ? (
          <><CheckCircle sx={{ fontSize: 24, color: '#00ffc3' }} /><Typography variant="caption" color="text.secondary">{file.name}</Typography></>
        ) : (
          <><CloudUploadOutlined sx={{ fontSize: 28, color: 'rgba(0,255,195,0.4)' }} /><Typography variant="caption" color="text.secondary">{label}</Typography></>
        )}
      </Box>
    </Box>
  );
}

// ─── Webcam selfie component ──────────────────────────────────────────────────

function WebcamCapture({ onCapture, faceReady }: {
  onCapture: (canvas: HTMLCanvasElement) => void;
  faceReady: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [liveDetecting, setLiveDetecting] = useState(false);
  const [liveFaceFound, setLiveFaceFound] = useState(false);
  const detectIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Periodic live face detection to give user feedback
  useEffect(() => {
    if (!streaming || !faceReady) return;
    detectIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      setLiveDetecting(true);
      const desc = await detectFaceDescriptor(videoRef.current);
      setLiveDetecting(false);
      setLiveFaceFound(desc !== null);
    }, 1500);
    return () => { if (detectIntervalRef.current) clearInterval(detectIntervalRef.current); };
  }, [streaming, faceReady]);

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
        <ErrorOutline sx={{ fontSize: 40, color: '#f44336', mb: 1 }} />
        <Typography variant="body2" color="error" sx={{ mb: 2 }}>{camError}</Typography>
        <Typography variant="caption" color="text.secondary">You can also upload a selfie photo instead.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {/* Video frame */}
      <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: liveFaceFound ? '2px solid #4caf50' : '2px solid rgba(0,255,195,0.3)', boxShadow: liveFaceFound ? '0 0 24px rgba(76,175,80,0.2)' : 'none', transition: 'all 0.3s' }}>
        <video ref={videoRef} style={{ display: 'block', width: 320, height: 240, objectFit: 'cover', transform: 'scaleX(-1)' }} muted playsInline />

        {/* Corner brackets */}
        {[{ top: 8, left: 8 }, { top: 8, right: 8 }, { bottom: 8, left: 8 }, { bottom: 8, right: 8 }].map((pos, i) => (
          <Box key={i} sx={{ position: 'absolute', width: 20, height: 20, ...pos, borderTopWidth: i < 2 ? 2 : 0, borderBottomWidth: i >= 2 ? 2 : 0, borderLeftWidth: i % 2 === 0 ? 2 : 0, borderRightWidth: i % 2 === 1 ? 2 : 0, borderStyle: 'solid', borderColor: liveFaceFound ? '#4caf50' : '#00ffc3', opacity: 0.8 }} />
        ))}

        {/* Status overlay */}
        <Box sx={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center' }}>
          <Chip
            size="small"
            label={!streaming ? 'Starting camera...' : liveDetecting ? 'Scanning...' : liveFaceFound ? 'Face detected — click Capture' : 'Position your face in the frame'}
            sx={{
              bgcolor: 'rgba(0,0,0,0.6)', color: liveFaceFound ? '#4caf50' : '#00ffc3',
              fontSize: '0.65rem', fontFamily: '"Rajdhani", sans-serif',
              border: `1px solid ${liveFaceFound ? 'rgba(76,175,80,0.4)' : 'rgba(0,255,195,0.2)'}`,
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
        disabled={!liveFaceFound}
        sx={{ px: 4 }}
      >
        Capture Selfie
      </Button>
    </Box>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function IdentityPage() {
  const { program } = useSolanaProgram();
  // @ts-ignore
  const isDeployed = typeof program?.methods?.createDidDocument === 'function';

  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const addressStr = publicKey?.toBase58() ?? null;

  const { status: kycStatus, isVerified, record, startPending, finalise, reset: kycReset } = useIdentityVerification(addressStr);
  const { status: faceApiStatus, detect } = useFaceApi();

  const {
    didDocument, credentials, loading: didLoading, error: didError,
    fetchDIDDocument, fetchUserCredentials,
    createDIDDocument, addVerificationMethod, removeVerificationMethod, addServiceEndpoint,
  } = useDID();

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [didExpanded, setDidExpanded] = useState(false);

  // KYC wizard state
  const [kycStep, setKycStep] = useState(0);
  const [idType, setIdType] = useState<typeof ID_TYPES[number]['value'] | null>(null);

  // Step 2: ID photo
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [idDetectStatus, setIdDetectStatus] = useState<'detecting' | 'found' | 'notfound' | null>(null);
  const [idDescriptor, setIdDescriptor] = useState<FaceDescriptor | null>(null);
  const idImgRef = useRef<HTMLImageElement | null>(null);

  // Step 3: selfie
  const [selfieCanvas, setSelfieCanvas] = useState<HTMLCanvasElement | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [selfieDescriptor, setSelfieDescriptor] = useState<FaceDescriptor | null>(null);
  const [selfieDetecting, setSelfieDetecting] = useState(false);
  const [selfieStatus, setSelfieStatus] = useState<'found' | 'notfound' | null>(null);

  // Step 4: comparison
  const [comparing, setComparing] = useState(false);
  const [compareResult, setCompareResult] = useState<{ distance: number; match: boolean } | null>(null);

  // DID dialogs
  const [vmDialogOpen, setVmDialogOpen] = useState(false);
  const [vmType, setVmType] = useState<number>(0);
  const [vmKeyInput, setVmKeyInput] = useState('');
  const [seDialogOpen, setSeDialogOpen] = useState(false);
  const [seType, setSeType] = useState<number>(0);
  const [seUri, setSeUri] = useState('');

  useEffect(() => {
    if (connected && publicKey) {
      fetchDIDDocument();
      fetchUserCredentials(publicKey as any);
    }
  }, [connected, publicKey, fetchDIDDocument, fetchUserCredentials]);

  // ─── Handle ID photo upload ─────────────────────────────────────────────────

  const handleIdFile = useCallback(async (file: File) => {
    setIdFile(file);
    setIdDescriptor(null);
    setIdDetectStatus(null);
    const url = URL.createObjectURL(file);
    setIdPreview(url);

    // Load image element for face detection
    const img = new Image();
    img.src = url;
    img.onload = async () => {
      idImgRef.current = img;
      setIdDetectStatus('detecting');
      const desc = await detectFaceDescriptor(img);
      setIdDetectStatus(desc ? 'found' : 'notfound');
      setIdDescriptor(desc);
    };
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
    if (!idDescriptor || !selfieDescriptor || !idType) return;
    setComparing(true);

    // Small delay for UX
    await new Promise((r) => setTimeout(r, 800));

    const dist = faceDistance(idDescriptor, selfieDescriptor);
    const match = dist < 0.50;
    setCompareResult({ distance: dist, match });
    finalise(idType, dist);
    setComparing(false);
  }, [idDescriptor, selfieDescriptor, idType, finalise]);

  const resetKyc = () => {
    setKycStep(0);
    setIdType(null);
    setIdFile(null);
    setIdPreview(null);
    setIdDetectStatus(null);
    setIdDescriptor(null);
    setSelfieCanvas(null);
    setSelfiePreview(null);
    setSelfieDescriptor(null);
    setSelfieStatus(null);
    setCompareResult(null);
    kycReset();
  };

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

  const selectedType = ID_TYPES.find((t) => t.value === idType);

  // ─── Page header ─────────────────────────────────────────────────────────────

  const PageHeader = () => (
    <Box sx={{ borderBottom: '1px solid rgba(0,255,195,0.08)', background: 'linear-gradient(180deg, rgba(0,255,195,0.03) 0%, transparent 100%)', px: { xs: 2, md: 4 }, py: { xs: 3, md: 4 } }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.4, mb: 1.5, bgcolor: 'rgba(0,255,195,0.06)', border: '1px solid rgba(0,255,195,0.15)', borderRadius: 1 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#00ffc3', boxShadow: '0 0 6px #00ffc3' }} />
              <Typography sx={{ fontFamily: '"Orbitron", monospace', fontSize: '0.58rem', letterSpacing: '0.12em', color: '#00ffc3' }}>// IDENTITY</Typography>
            </Box>
            <Typography variant="h4" fontWeight={800} sx={{ fontFamily: '"Orbitron", sans-serif', background: 'linear-gradient(135deg, #fff 40%, #00ffc3 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.2 }}>
              Identity & KYC
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
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
      <Layout>
        <PageHeader />
        <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
          <LockOutlined sx={{ fontSize: 52, color: 'rgba(0,255,195,0.3)', mb: 2 }} />
          <Typography variant="h6" fontWeight={700} gutterBottom>Connect Your Wallet</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Connect your Solana wallet to start identity verification.
          </Typography>
          <Button variant="contained" size="large" onClick={() => setVisible(true)}>Connect Wallet</Button>
        </Container>
      </Layout>
    );
  }

  if (didLoading && !didDocument) {
    return (
      <Layout>
        <PageHeader />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <LoadingSpinner message="Loading identity data..." />
        </Container>
      </Layout>
    );
  }

  // ─── Verified state ───────────────────────────────────────────────────────────

  const KycVerifiedPanel = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4, textAlign: 'center' }}>
      <Box sx={{ width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(76,175,80,0.08)', border: '2px solid rgba(76,175,80,0.3)', boxShadow: '0 0 32px rgba(76,175,80,0.15)' }}>
        <VerifiedUser sx={{ fontSize: 42, color: '#4caf50' }} />
      </Box>
      <VerifiedBadge size="md" tooltip={false} />
      <Typography variant="h6" fontWeight={700}>Identity Verified</Typography>
      {record?.faceDistance !== undefined && (
        <Box sx={{ px: 2.5, py: 1, bgcolor: 'rgba(76,175,80,0.06)', border: '1px solid rgba(76,175,80,0.2)', borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Face match score: <strong style={{ color: '#4caf50' }}>{(1 - record.faceDistance).toFixed(3)}</strong>
            {' '}(distance: {record.faceDistance.toFixed(3)})
          </Typography>
        </Box>
      )}
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 380, lineHeight: 1.7 }}>
        Your verified badge is now visible on your public profile and in the freelancer directory.
      </Typography>
      <Button variant="outlined" color="error" size="small" onClick={resetKyc} sx={{ mt: 1, fontSize: '0.72rem' }}>
        Reset Verification
      </Button>
    </Box>
  );

  // ─── Rejected state ────────────────────────────────────────────────────────

  const KycRejectedPanel = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4, textAlign: 'center' }}>
      <Box sx={{ width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(244,67,54,0.08)', border: '2px solid rgba(244,67,54,0.3)' }}>
        <ErrorOutline sx={{ fontSize: 42, color: '#f44336' }} />
      </Box>
      <Chip label="FACE MISMATCH" sx={{ fontFamily: '"Orbitron", monospace', fontSize: '0.58rem', letterSpacing: 2, bgcolor: 'rgba(244,67,54,0.08)', color: '#f44336', border: '1px solid rgba(244,67,54,0.25)' }} />
      <Typography variant="h6" fontWeight={700}>Verification Failed</Typography>
      {record?.faceDistance !== undefined && (
        <Box sx={{ px: 2.5, py: 1, bgcolor: 'rgba(244,67,54,0.05)', border: '1px solid rgba(244,67,54,0.15)', borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Face distance: <strong style={{ color: '#f44336' }}>{record.faceDistance.toFixed(3)}</strong> (threshold: 0.50)
          </Typography>
        </Box>
      )}
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 380, lineHeight: 1.7 }}>
        The selfie did not match the face in your ID. Ensure good lighting, remove glasses if possible, and try again.
      </Typography>
      <Button variant="contained" onClick={resetKyc} sx={{ mt: 1 }}>Try Again</Button>
    </Box>
  );

  // ─── KYC wizard ───────────────────────────────────────────────────────────────

  const KycWizard = () => (
    <Box>
      {/* Model loading banner */}
      {faceApiStatus !== 'ready' && (
        <Box sx={{ mb: 3, px: 2, py: 1.5, bgcolor: 'rgba(0,255,195,0.03)', border: '1px solid rgba(0,255,195,0.12)', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {faceApiStatus === 'loading' ? (
            <><CircularProgress size={14} sx={{ color: '#00ffc3', flexShrink: 0 }} /><Typography variant="caption" color="text.secondary">Loading face detection models (~6 MB, cached after first run)...</Typography></>
          ) : faceApiStatus === 'error' ? (
            <><WarningAmberOutlined sx={{ fontSize: 16, color: '#ff9800', flexShrink: 0 }} /><Typography variant="caption" color="error.light">Failed to load face detection models. Try refreshing the page.</Typography></>
          ) : null}
        </Box>
      )}

      {/* Privacy notice */}
      <Box sx={{ mb: 3, px: 2, py: 1.25, bgcolor: 'rgba(0,255,195,0.02)', border: '1px solid rgba(0,255,195,0.08)', borderRadius: 2, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <LockOutlined sx={{ fontSize: 15, color: '#00ffc3', mt: 0.2, flexShrink: 0 }} />
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.65 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Privacy: </strong>
          All processing happens in your browser using TensorFlow.js. No images or biometric data are ever uploaded to any server.
        </Typography>
      </Box>

      {/* Stepper */}
      <Stepper activeStep={kycStep} sx={{ mb: 4, '& .MuiStepLabel-label': { fontFamily: '"Rajdhani", sans-serif', fontSize: '0.78rem' }, '& .MuiStepIcon-root.Mui-active': { color: '#00ffc3' }, '& .MuiStepIcon-root.Mui-completed': { color: '#4caf50' }, '& .MuiStepConnector-line': { borderColor: 'rgba(0,255,195,0.12)' } }}>
        {KYC_STEPS.map((l) => <Step key={l}><StepLabel>{l}</StepLabel></Step>)}
      </Stepper>

      {/* ── Step 0: Document type ─── */}
      {kycStep === 0 && (
        <Box>
          <Typography variant="overline" sx={{ color: '#00ffc3', letterSpacing: 3, fontSize: '0.6rem', display: 'block', mb: 2 }}>SELECT DOCUMENT TYPE</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)' }, gap: 1.5 }}>
            {ID_TYPES.map(({ value, label, desc, Icon, color }) => (
              <Card key={value} onClick={() => setIdType(value)} sx={{ cursor: 'pointer', border: idType === value ? `1px solid ${color}` : '1px solid rgba(255,255,255,0.06)', bgcolor: idType === value ? `${color}0d` : 'rgba(0,0,0,0.2)', transition: 'all 0.2s', '&:hover': { borderColor: color, bgcolor: `${color}08` } }}>
                <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
                  <Box sx={{ width: 44, height: 44, borderRadius: '50%', mx: 'auto', mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${color}15`, border: `1px solid ${color}35` }}>
                    <Icon sx={{ fontSize: 22, color }} />
                  </Box>
                  <Typography variant="body2" fontWeight={700} gutterBottom sx={{ fontSize: '0.8rem' }}>{label}</Typography>
                  <Typography variant="caption" color="text.secondary">{desc}</Typography>
                  {idType === value && <Box sx={{ mt: 1 }}><CheckCircle sx={{ fontSize: 16, color }} /></Box>}
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {/* ── Step 1: ID photo ─── */}
      {kycStep === 1 && (
        <Box>
          <Typography variant="overline" sx={{ color: '#00ffc3', letterSpacing: 3, fontSize: '0.6rem', display: 'block', mb: 0.5 }}>UPLOAD ID PHOTO</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
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
            <Box sx={{ mt: 2, px: 2, py: 1.25, bgcolor: 'rgba(76,175,80,0.05)', border: '1px solid rgba(76,175,80,0.2)', borderRadius: 2 }}>
              <Typography variant="caption" sx={{ color: '#4caf50' }}>
                ✓ Face successfully detected in ID photo. Ready to proceed.
              </Typography>
            </Box>
          )}
          {idDetectStatus === 'notfound' && (
            <Box sx={{ mt: 2, px: 2, py: 1.25, bgcolor: 'rgba(244,67,54,0.05)', border: '1px solid rgba(244,67,54,0.2)', borderRadius: 2 }}>
              <Typography variant="caption" sx={{ color: '#f44336' }}>
                No face detected. Please upload a photo where your face is clearly visible, well-lit, and not obstructed.
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* ── Step 2: Selfie (webcam) ─── */}
      {kycStep === 2 && (
        <Box>
          <Typography variant="overline" sx={{ color: '#00ffc3', letterSpacing: 3, fontSize: '0.6rem', display: 'block', mb: 0.5 }}>CAPTURE SELFIE</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Your face will be compared against the ID photo in real time. No images are uploaded.
          </Typography>

          {selfiePreview ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: selfieStatus === 'found' ? '2px solid #4caf50' : '2px solid rgba(244,67,54,0.5)' }}>
                <img src={selfiePreview} alt="selfie" style={{ display: 'block', width: 320, height: 240, objectFit: 'cover', transform: 'scaleX(-1)' }} />
                {selfieDetecting && (
                  <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.5)' }}>
                    <CircularProgress sx={{ color: '#00ffc3' }} />
                  </Box>
                )}
              </Box>
              {selfieStatus === 'found' && (
                <Chip label="FACE DETECTED ✓" size="small" sx={{ fontFamily: '"Orbitron", monospace', fontSize: '0.58rem', letterSpacing: 2, bgcolor: 'rgba(76,175,80,0.1)', color: '#4caf50', border: '1px solid rgba(76,175,80,0.3)' }} />
              )}
              {selfieStatus === 'notfound' && (
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#f44336', display: 'block', mb: 1 }}>No face detected in capture. Please try again with better lighting.</Typography>
                  <Button variant="outlined" size="small" onClick={() => { setSelfiePreview(null); setSelfieStatus(null); setSelfieDescriptor(null); }} sx={{ fontSize: '0.72rem' }}>Retake</Button>
                </Box>
              )}
              {selfieStatus === 'found' && (
                <Button variant="outlined" size="small" onClick={() => { setSelfiePreview(null); setSelfieStatus(null); setSelfieDescriptor(null); }} sx={{ fontSize: '0.72rem', borderColor: 'rgba(255,255,255,0.15)' }}>Retake</Button>
              )}
            </Box>
          ) : (
            <WebcamCapture onCapture={handleSelfieCapture} faceReady={faceApiStatus === 'ready'} />
          )}
        </Box>
      )}

      {/* ── Step 3: Comparison result ─── */}
      {kycStep === 3 && (
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="overline" sx={{ color: '#00ffc3', letterSpacing: 3, fontSize: '0.6rem', display: 'block', mb: 3 }}>FACE COMPARISON</Typography>

          {comparing ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <CircularProgress sx={{ color: '#00ffc3' }} />
              <Typography variant="body2" color="text.secondary">Comparing facial features...</Typography>
              <LinearProgress sx={{ width: 240, height: 3, borderRadius: 2, bgcolor: 'rgba(0,255,195,0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#00ffc3' } }} />
            </Box>
          ) : compareResult ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2.5 }}>
              <Box sx={{ width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: compareResult.match ? 'rgba(76,175,80,0.08)' : 'rgba(244,67,54,0.08)', border: `2px solid ${compareResult.match ? 'rgba(76,175,80,0.4)' : 'rgba(244,67,54,0.4)'}`, boxShadow: compareResult.match ? '0 0 28px rgba(76,175,80,0.2)' : 'none' }}>
                {compareResult.match ? <CheckCircle sx={{ fontSize: 44, color: '#4caf50' }} /> : <ErrorOutline sx={{ fontSize: 44, color: '#f44336' }} />}
              </Box>

              <Typography variant="h6" fontWeight={700} sx={{ color: compareResult.match ? '#4caf50' : '#f44336' }}>
                {compareResult.match ? 'Face Match Confirmed' : 'Face Mismatch Detected'}
              </Typography>

              {/* Score details */}
              <Box sx={{ px: 3, py: 2, bgcolor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 2, minWidth: 280 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>Biometric Analysis</Typography>
                {[
                  { label: 'Euclidean Distance', value: compareResult.distance.toFixed(4), ok: compareResult.distance < 0.50 },
                  { label: 'Similarity Score', value: `${((1 - compareResult.distance) * 100).toFixed(1)}%`, ok: compareResult.match },
                  { label: 'Threshold', value: '0.50 (verified if below)' },
                  { label: 'Result', value: compareResult.match ? 'MATCH' : 'MISMATCH', ok: compareResult.match },
                ].map(({ label, value, ok }) => (
                  <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                    <Typography variant="caption" fontWeight={700} sx={{ fontFamily: 'monospace', color: ok === undefined ? 'text.secondary' : ok ? '#4caf50' : '#f44336' }}>{value}</Typography>
                  </Box>
                ))}
              </Box>

              {!compareResult.match && (
                <Button variant="contained" onClick={resetKyc} startIcon={<ArrowBack />}>Try Again</Button>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">Click below to run the face comparison analysis.</Typography>
              <Button variant="contained" size="large" startIcon={<FingerprintIcon />} onClick={handleCompare} disabled={!idDescriptor || !selfieDescriptor || faceApiStatus !== 'ready'} sx={{ px: 5 }}>
                Run Face Comparison
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* Nav buttons */}
      <Box sx={{ display: 'flex', justifyContent: kycStep > 0 ? 'space-between' : 'flex-end', mt: 4, pt: 3, borderTop: '1px solid rgba(0,255,195,0.08)' }}>
        {kycStep > 0 && kycStep < 3 && (
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => setKycStep((s) => s - 1)} sx={{ borderColor: 'rgba(255,255,255,0.1)', color: 'text.secondary' }}>Back</Button>
        )}
        {kycStep < 3 && (
          <Button variant="contained" endIcon={<ArrowForward />} onClick={() => setKycStep((s) => s + 1)} disabled={!canNext || faceApiStatus !== 'ready'}>Continue</Button>
        )}
      </Box>
    </Box>
  );

  return (
    <Layout>
      <PageHeader />
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>

          {successMessage && (
            <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>{successMessage}</Alert>
          )}

          {/* ── KYC Section ── */}
          <Box sx={{ border: '1px solid rgba(0,255,195,0.08)', borderRadius: 2, overflow: 'hidden', mb: 4 }}>
            <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid rgba(0,255,195,0.08)', bgcolor: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <FingerprintIcon sx={{ fontSize: 18, color: '#00ffc3' }} />
              <Typography variant="overline" sx={{ color: '#00ffc3', letterSpacing: 3, fontSize: '0.6rem', flex: 1 }}>
                CITIZEN IDENTITY VERIFICATION (KYC)
              </Typography>
              {isVerified && <VerifiedBadge size="sm" />}
            </Box>

            <Box sx={{ p: { xs: 2.5, md: 3 } }}>
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
          <Box sx={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
            <Box onClick={() => setDidExpanded(!didExpanded)} sx={{ px: 3, py: 2.5, bgcolor: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'rgba(0,0,0,0.3)' } }}>
              <KeyIcon sx={{ fontSize: 16, color: 'rgba(128,132,238,0.7)' }} />
              <Typography variant="overline" sx={{ color: 'rgba(128,132,238,0.7)', letterSpacing: 3, fontSize: '0.6rem', flex: 1 }}>DECENTRALIZED IDENTITY (DID)</Typography>
              <Chip label="Coming Soon" size="small" sx={{ fontSize: '0.6rem', height: 18, bgcolor: 'rgba(128,132,238,0.08)', color: 'rgba(128,132,238,0.5)', border: '1px solid rgba(128,132,238,0.15)' }} />
              {didExpanded ? <ExpandLessOutlined sx={{ fontSize: 16, color: 'text.disabled' }} /> : <ExpandMoreOutlined sx={{ fontSize: 16, color: 'text.disabled' }} />}
            </Box>

            <Collapse in={didExpanded}>
              <Box sx={{ p: { xs: 2.5, md: 3 } }}>
                {!isDeployed ? (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <FingerprintIcon sx={{ fontSize: 48, color: 'rgba(128,132,238,0.2)', mb: 2 }} />
                    <Typography variant="body2" color="text.secondary">On-chain DID documents with verifiable credentials. Available after mainnet deployment.</Typography>
                  </Box>
                ) : !didDocument ? (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Create your Decentralized Identity to link credentials and social accounts on-chain.</Typography>
                    <Button variant="outlined" startIcon={<FingerprintIcon />} onClick={handleCreateDID} disabled={creating || didLoading} sx={{ borderColor: 'rgba(128,132,238,0.3)', color: '#8084ee' }}>
                      {creating ? 'Creating...' : 'Create DID Document'}
                    </Button>
                  </Box>
                ) : (
                  <>
                    <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(128,132,238,0.1)', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="overline" sx={{ color: 'rgba(128,132,238,0.7)', letterSpacing: 2, fontSize: '0.6rem' }}>DID DOCUMENT</Typography>
                        <Chip label={didDocument.active ? 'Active' : 'Deactivated'} color={didDocument.active ? 'success' : 'error'} size="small" />
                      </Box>
                      <Typography variant="caption" color="text.secondary">DID URI</Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#8084ee', wordBreak: 'break-all', mt: 0.25, mb: 1.5 }}>{didDocument.didUri}</Typography>
                      <Typography variant="caption" color="text.secondary">Owner</Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', mt: 0.25 }}>{didDocument.owner}</Typography>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <KeyIcon sx={{ fontSize: 15, color: '#8084ee' }} />
                          <Typography variant="body2" fontWeight={600}>Verification Methods</Typography>
                          <Chip label={didDocument.verificationMethodCount} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                        </Box>
                        <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setVmDialogOpen(true)} sx={{ fontSize: '0.72rem', borderColor: 'rgba(128,132,238,0.3)', color: '#8084ee' }}>Add</Button>
                      </Box>
                      {didDocument.verificationMethodCount === 0 ? (
                        <Typography variant="caption" color="text.secondary">No verification methods added yet.</Typography>
                      ) : (
                        <List disablePadding dense>
                          {didDocument.vmTypes.slice(0, didDocument.verificationMethodCount).map((type: number, index: number) => (
                            <Box key={index}>
                              {index > 0 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.04)' }} />}
                              <ListItem sx={{ px: 0 }}>
                                <ListItemText primary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Typography variant="body2" fontWeight={500}>{vmTypeLabels[type] || `Type ${type}`}</Typography><Chip label={`#${index}`} size="small" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} /></Box>} secondary={<Typography variant="caption" sx={{ fontFamily: 'monospace' }}>Controller: {didDocument.vmControllers[index]?.slice(0, 20)}...</Typography>} />
                                <ListItemSecondaryAction><IconButton edge="end" size="small" color="error" onClick={() => handleRemoveVM(index)} disabled={didLoading}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton></ListItemSecondaryAction>
                              </ListItem>
                            </Box>
                          ))}
                        </List>
                      )}
                    </Box>

                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinkIcon sx={{ fontSize: 15, color: '#8084ee' }} />
                          <Typography variant="body2" fontWeight={600}>Service Endpoints</Typography>
                          <Chip label={didDocument.serviceEndpointCount} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                        </Box>
                        <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setSeDialogOpen(true)} sx={{ fontSize: '0.72rem', borderColor: 'rgba(128,132,238,0.3)', color: '#8084ee' }}>Add</Button>
                      </Box>
                      {didDocument.serviceEndpointCount === 0 ? (
                        <Typography variant="caption" color="text.secondary">No service endpoints linked yet.</Typography>
                      ) : (
                        <List disablePadding dense>
                          {didDocument.seTypes.slice(0, didDocument.serviceEndpointCount).map((type: number, index: number) => (
                            <Box key={index}>
                              {index > 0 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.04)' }} />}
                              <ListItem sx={{ px: 0 }}>
                                <ListItemText primary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Typography variant="body2" fontWeight={500}>{serviceTypeLabels[type] || `Service ${type}`}</Typography>{didDocument.seVerified[index] && <Chip icon={<VerifiedIcon />} label="Verified" size="small" color="success" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />}</Box>} secondary={<Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#8084ee', wordBreak: 'break-all' }}>{didDocument.seUris[index]}</Typography>} />
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
      <Dialog open={vmDialogOpen} onClose={() => setVmDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Verification Method</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Method Type</InputLabel>
              <Select value={vmType} label="Method Type" onChange={(e) => setVmType(Number(e.target.value))}>
                {Object.entries(vmTypeLabels).map(([value, label]) => <MenuItem key={value} value={Number(value)}>{label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Public Key (Base58)" value={vmKeyInput} onChange={(e) => setVmKeyInput(e.target.value)} fullWidth placeholder="Enter the public key" />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVmDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddVM} disabled={!vmKeyInput || didLoading}>{didLoading ? 'Adding...' : 'Add Method'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={seDialogOpen} onClose={() => setSeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Service Endpoint</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Service Type</InputLabel>
              <Select value={seType} label="Service Type" onChange={(e) => setSeType(Number(e.target.value))}>
                {Object.entries(serviceTypeLabels).map(([value, label]) => <MenuItem key={value} value={Number(value)}>{label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Endpoint URI" value={seUri} onChange={(e) => setSeUri(e.target.value)} fullWidth placeholder="https://github.com/your-username" />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSeDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddSE} disabled={!seUri || didLoading}>{didLoading ? 'Adding...' : 'Add Endpoint'}</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
