import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Divider,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  useTheme,
  alpha,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Close,
  Chat,
  Warning,
  Psychology,
  Shield,
  Code,
  AccountBalance,
  Schedule,
  Article,
  FactCheck,
  Summarize,
  Lightbulb,
} from '@mui/icons-material';
import type { BidWithDetails } from '../../../hooks/useOptimizedBids';

interface RiskAssessmentDialogProps {
  open: boolean;
  onClose: () => void;
  riskDialogBid: BidWithDetails | null;
  riskLoading: boolean;
  riskResult: any;
  riskError: string;
  riskCached: boolean;
  onRerun: () => void;
  formatAddress: (addr: any) => string;
  jobBudgetSol?: number;
  jobTitle?: string;
}

export default function RiskAssessmentDialog({
  open,
  onClose,
  riskDialogBid,
  riskLoading,
  riskResult,
  riskError,
  riskCached,
  onRerun,
  formatAddress,
  jobBudgetSol,
  jobTitle,
}: RiskAssessmentDialogProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryMain = theme.palette.primary.main;
  const secondaryMain = theme.palette.secondary.main;

  const handleSendChat = async (overrideMsg?: string) => {
    const text = (overrideMsg ?? chatInput).trim();
    if (!text || chatLoading || !riskResult) return;
    const newMessages = [...chatMessages, { role: 'user' as const, content: text }];
    setChatMessages(newMessages);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await fetch('/api/ai/risk-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: {
            ...riskResult,
            jobTitle,
            bidBudgetSol: riskDialogBid?.budgetInSol,
            jobBudgetSol,
            bidTimelineDays: riskDialogBid?.account.timelineDays,
          },
          messages: newMessages,
        }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply || data.error || 'No response.' }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Network error. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleClose = () => {
    if (!riskLoading) {
      setChatOpen(false);
      setChatMessages([]);
      setChatInput('');
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ 
        sx: { 
          backgroundImage: 'none', 
          bgcolor: 'background.paper', 
          border: 1, 
          borderColor: isDark ? alpha(secondaryMain, 0.2) : 'divider' 
        } 
      }}
    >
      {/* Dynamic top bar */}
      <Box sx={{ height: 3, background: `linear-gradient(90deg, transparent, ${secondaryMain}, ${primaryMain}, transparent)` }} />

      <DialogTitle sx={{ pb: 1.5, pt: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Psychology sx={{ color: secondaryMain, fontSize: 24 }} />
            <Box>
              <Typography sx={{ fontFamily: '"Orbitron",sans-serif', fontWeight: 800, fontSize: '1rem', letterSpacing: '0.05em', color: 'text.primary' }}>
                AI RISK ASSESSMENT
              </Typography>
              {riskDialogBid && (
                <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontFamily: 'monospace', mt: 0.25, fontWeight: 600 }}>
                  &gt; EVALUATING: {formatAddress(riskDialogBid.account.freelancer)}
                </Typography>
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {riskCached && riskResult && !riskLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ px: 1, py: 0.35, borderRadius: 1, bgcolor: isDark ? alpha(primaryMain, 0.08) : alpha(primaryMain, 0.05), border: 1, borderColor: alpha(primaryMain, 0.3) }}>
                  <Typography sx={{ fontSize: '0.6rem', color: 'primary.main', fontFamily: 'monospace', letterSpacing: '0.06em', fontWeight: 800 }}>
                    CACHED
                  </Typography>
                </Box>
                <Button
                  size="small"
                  onClick={onRerun}
                  sx={{ fontSize: '0.7rem', color: 'text.secondary', minWidth: 0, px: 1, py: 0.5, fontWeight: 700, '&:hover': { color: 'primary.main' } }}
                >
                  RE-RUN
                </Button>
              </Box>
            )}
            <IconButton onClick={handleClose} disabled={riskLoading} size="small" sx={{ color: 'text.disabled', '&:hover': { color: 'text.primary' } }}>
              <Close fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 1, pb: 3 }}>
        {riskLoading && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CircularProgress sx={{ color: secondaryMain, mb: 3 }} size={44} />
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', fontFamily: 'monospace', mb: 2, fontWeight: 600 }}>
              &gt; Analyzing contractor profile &amp; history...
            </Typography>
            <LinearProgress sx={{ maxWidth: 300, mx: 'auto', borderRadius: 1, height: 6 }} />
          </Box>
        )}

        {riskError && !riskLoading && (
          <Alert severity="error" sx={{ mt: 1, fontWeight: 500 }}>{riskError}</Alert>
        )}

        {riskResult && !riskLoading && (() => {
          const rl = riskResult.riskLevel as 'LOW' | 'MEDIUM' | 'HIGH';
          const riskCfg = {
            LOW:    { color: theme.palette.success.main, bg: isDark ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.success.main, 0.05), border: alpha(theme.palette.success.main, 0.35), label: 'LOW RISK' },
            MEDIUM: { color: theme.palette.warning.main, bg: isDark ? alpha(theme.palette.warning.main, 0.1) : alpha(theme.palette.warning.main, 0.05), border: alpha(theme.palette.warning.main, 0.35), label: 'MED RISK' },
            HIGH:   { color: theme.palette.error.main,   bg: isDark ? alpha(theme.palette.error.main, 0.1) : alpha(theme.palette.error.main, 0.05), border: alpha(theme.palette.error.main, 0.35), label: 'HIGH RISK' },
          }[rl] ?? { color: theme.palette.warning.main, bg: alpha(theme.palette.warning.main, 0.1), border: alpha(theme.palette.warning.main, 0.35), label: 'UNKNOWN' };

          const GAUGES = [
            { value: riskResult.matchScore,        label: 'MATCH' },
            { value: riskResult.authenticityScore, label: 'QUALITY' },
            { value: riskResult.budgetScore,       label: 'BUDGET' },
            { value: riskResult.timelineScore,     label: 'TIMELINE' },
          ];

          const GROUPS: Array<{ key: string; label: string; icon: React.ReactNode }> = [
            { key: 'skills',      label: 'Skills & Profile', icon: <Code sx={{ fontSize: 16 }} /> },
            { key: 'budget',      label: 'Budget Suitability', icon: <AccountBalance sx={{ fontSize: 16 }} /> },
            { key: 'timeline',    label: 'Timeline Realism', icon: <Schedule sx={{ fontSize: 16 }} /> },
            { key: 'proposal',    label: 'Proposal Analysis', icon: <Article sx={{ fontSize: 16 }} /> },
            { key: 'credibility', label: 'Reputation', icon: <FactCheck sx={{ fontSize: 16 }} /> },
          ];
          
          type Finding = { type: string; category?: string; text: string };
          const findings: Finding[] = riskResult.findings || [];
          const grouped = GROUPS.map(g => ({ ...g, items: findings.filter(f => f.category === g.key) })).filter(g => g.items.length > 0);
          const uncategorised = findings.filter(f => !f.category || !GROUPS.find(g => g.key === f.category));

          const FINDING_STYLE = {
            positive: { color: theme.palette.success.main, bg: isDark ? alpha(theme.palette.success.main, 0.08) : alpha(theme.palette.success.main, 0.05), icon: <CheckCircle sx={{ fontSize: 16, color: 'success.main', mt: '2px' }} /> },
            warning:  { color: theme.palette.warning.main, bg: isDark ? alpha(theme.palette.warning.main, 0.08) : alpha(theme.palette.warning.main, 0.05), icon: <Warning    sx={{ fontSize: 16, color: 'warning.main', mt: '2px' }} /> },
            danger:   { color: theme.palette.error.main,   bg: isDark ? alpha(theme.palette.error.main, 0.08) : alpha(theme.palette.error.main, 0.05), icon: <Cancel     sx={{ fontSize: 16, color: 'error.main', mt: '2px' }} /> },
          } as const;

          const SectionLabel = ({ children, icon }: { children: string; icon?: React.ReactNode }) => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, mt: 1 }}>
              {icon && <Box sx={{ display: 'flex', alignItems: 'center', color: secondaryMain }}>{icon}</Box>}
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: secondaryMain, letterSpacing: '0.1em', fontFamily: '"Orbitron",sans-serif' }}>
                {children}
              </Typography>
              <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider', ml: 1 }} />
            </Box>
          );

          const FindingItem = ({ f }: { f: Finding }) => {
            const s = FINDING_STYLE[f.type as keyof typeof FINDING_STYLE] ?? FINDING_STYLE.warning;
            return (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1.5, borderRadius: 1.5, bgcolor: s.bg, borderLeft: 4, borderColor: s.color, mb: 1, border: 1, borderLeftWidth: 4, borderLeftColor: s.color, borderRightColor: 'divider', borderTopColor: 'divider', borderBottomColor: 'divider' }}>
                {s.icon}
                <Typography sx={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'text.primary', fontWeight: 500 }}>
                  {f.text}
                </Typography>
              </Box>
            );
          };

          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

              {/* ── Score gauges row ───────────────────────────────── */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, p: 2.5, borderRadius: 2, bgcolor: isDark ? alpha(primaryMain, 0.03) : 'grey.50', border: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
                  {GAUGES.map(({ value, label }) => {
                    const v = value ?? 50;
                    const c = v >= 70 ? theme.palette.success.main : v >= 40 ? theme.palette.warning.main : theme.palette.error.main;
                    return (
                      <Box key={label} sx={{ textAlign: 'center' }}>
                        <Box sx={{ position: 'relative', display: 'inline-flex', mb: 0.5 }}>
                          <CircularProgress variant="determinate" value={100} size={56} thickness={4}
                            sx={{ color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', position: 'absolute' }} />
                          <CircularProgress variant="determinate" value={v} size={56} thickness={4}
                            sx={{ color: c }} />
                          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography sx={{ fontFamily: '"Orbitron",sans-serif', fontWeight: 800, fontSize: '0.85rem', color: c, lineHeight: 1 }}>
                              {v}
                            </Typography>
                          </Box>
                        </Box>
                        <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', letterSpacing: 0.5, fontWeight: 700 }}>
                          {label}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
                
                {/* Risk badge */}
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 2, py: 1, border: 1, borderColor: riskCfg.border, borderRadius: 1.5, bgcolor: riskCfg.bg, mb: 0.5 }}>
                    <Shield sx={{ fontSize: 16, color: riskCfg.color }} />
                    <Typography sx={{ fontFamily: '"Orbitron",sans-serif', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.05em', color: riskCfg.color }}>
                      {riskCfg.label}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', fontFamily: 'monospace', fontWeight: 700 }}>
                    SCORE: {riskResult.riskScore}/100
                  </Typography>
                </Box>
              </Box>

              {/* ── Summary ────────────────────────────────────────── */}
              <Box>
                <SectionLabel icon={<Summarize sx={{ fontSize: 16 }} />}>ANALYSIS SUMMARY</SectionLabel>
                <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: isDark ? alpha(secondaryMain, 0.06) : 'grey.50', border: 1, borderColor: 'divider' }}>
                  <Typography sx={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'text.primary', fontWeight: 500 }}>
                    {riskResult.summary}
                  </Typography>
                </Box>
              </Box>

              {/* ── Findings ───────────────────────────────────────── */}
              {(grouped.length > 0 ? grouped : [{ key: '_', label: 'Detailed Findings', icon: <Psychology sx={{ fontSize: 16 }} />, items: uncategorised }]).map(group => (
                <Box key={group.key}>
                  <SectionLabel icon={group.icon}>{group.label.toUpperCase()}</SectionLabel>
                  {group.items.map((f, i) => <FindingItem key={i} f={f} />)}
                </Box>
              ))}

              {/* ── Recommendation ─────────────────────────────────── */}
              <Box>
                <SectionLabel icon={<Lightbulb sx={{ fontSize: 16 }} />}>RECRUITMENT ADVICE</SectionLabel>
                <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: alpha(riskCfg.color, 0.05), border: 1, borderColor: alpha(riskCfg.color, 0.3), borderLeftWidth: 4, borderLeftColor: riskCfg.color }}>
                  <Typography sx={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'text.primary', fontWeight: 700 }}>
                    {riskResult.recommendation}
                  </Typography>
                </Box>
              </Box>

              {/* ── AI Follow-up Chat ───────────────────────────────── */}
              <Box sx={{ borderRadius: 2, border: 1, borderColor: alpha(secondaryMain, 0.25), overflow: 'hidden', backgroundImage: 'none', bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'grey.50' }}>
                <Box
                  onClick={() => setChatOpen(o => !o)}
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, bgcolor: alpha(secondaryMain, 0.08), cursor: 'pointer', '&:hover': { bgcolor: alpha(secondaryMain, 0.12) }, transition: 'all 0.2s' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Chat sx={{ fontSize: 18, color: secondaryMain }} />
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: secondaryMain, fontFamily: '"Orbitron",sans-serif', letterSpacing: 0.5 }}>
                      ASK AI FOLLOW-UP
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.8rem', color: secondaryMain }}>{chatOpen ? '▲' : '▼'}</Typography>
                </Box>

                {chatOpen && (
                  <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Quick Questions */}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {[
                        'Is this budget realistic?',
                        'Verify technical skills',
                        'Check delivery timeline',
                      ].map(q => (
                        <Box
                          key={q}
                          onClick={() => handleSendChat(q)}
                          sx={{
                            px: 1.5, py: 0.6, borderRadius: 10, fontSize: '0.75rem', cursor: 'pointer',
                            border: 1, borderColor: alpha(secondaryMain, 0.3), color: secondaryMain,
                            bgcolor: isDark ? alpha(secondaryMain, 0.05) : '#fff',
                            fontWeight: 700,
                            '&:hover': { bgcolor: alpha(secondaryMain, 0.1), borderColor: secondaryMain },
                            transition: 'all 0.2s',
                          }}
                        >
                          {q}
                        </Box>
                      ))}
                    </Box>

                    {/* Messages Area */}
                    {chatMessages.length > 0 && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 300, overflowY: 'auto', px: 0.5, py: 1 }}>
                        {chatMessages.map((m, i) => (
                          <Box key={i} sx={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                            <Box sx={{
                              maxWidth: '90%', px: 2, py: 1.25, borderRadius: 2,
                              bgcolor: m.role === 'user' ? alpha(primaryMain, 0.1) : (isDark ? 'background.paper' : '#fff'),
                              border: 1, borderColor: m.role === 'user' ? alpha(primaryMain, 0.3) : 'divider',
                              boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.05)',
                            }}>
                              <Typography sx={{ fontSize: '0.875rem', lineHeight: 1.6, color: m.role === 'user' ? 'primary.main' : 'text.primary', fontWeight: 500 }}>
                                {m.content}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                        {chatLoading && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1 }}>
                            <CircularProgress size={16} sx={{ color: secondaryMain }} />
                            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', fontWeight: 600 }}>Gemini is thinking...</Typography>
                          </Box>
                        )}
                      </Box>
                    )}

                    {/* Chat Input */}
                    <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
                      <Box
                        component="input"
                        value={chatInput}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChatInput(e.target.value)}
                        onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && !e.shiftKey && handleSendChat()}
                        placeholder="Ask a question about this bid..."
                        disabled={chatLoading}
                        sx={{
                          flex: 1, px: 2, py: 1.25, borderRadius: 1.5, fontSize: '0.9rem',
                          bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#fff', border: 1, borderColor: 'divider',
                          color: 'text.primary', outline: 'none', fontFamily: 'inherit',
                          '&:focus': { borderColor: secondaryMain, boxShadow: `0 0 0 2px ${alpha(secondaryMain, 0.1)}` },
                        }}
                      />
                      <Button
                        variant="contained"
                        onClick={() => handleSendChat()}
                        disabled={!chatInput.trim() || chatLoading}
                        sx={{ minWidth: 50, borderRadius: 1.5, bgcolor: secondaryMain }}
                      >
                        SEND
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>

            </Box>
          );
        })()}
      </DialogContent>
      <DialogActions sx={{ p: 2.5, borderTop: 1, borderColor: 'divider' }}>
        <Button onClick={handleClose} disabled={riskLoading} variant="outlined" sx={{ fontWeight: 700, px: 4 }}>
          CLOSE
        </Button>
      </DialogActions>
    </Dialog>
  );
}
