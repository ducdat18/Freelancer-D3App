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
      PaperProps={{ sx: { backgroundImage: 'none', bgcolor: '#0d0f14', border: '1px solid rgba(128,132,238,0.2)' } }}
    >
      {/* Glowing top bar */}
      <Box sx={{ height: 3, background: 'linear-gradient(90deg, transparent, #8084ee, #00ffc3, transparent)' }} />

      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Psychology sx={{ color: '#8084ee', fontSize: 22 }} />
            <Box>
              <Typography sx={{ fontFamily: '"Orbitron",sans-serif', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.05em', color: '#fff' }}>
                AI RISK ASSESSMENT
              </Typography>
              {riskDialogBid && (
                <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace', mt: 0.25 }}>
                  &gt; evaluating {formatAddress(riskDialogBid.account.freelancer)}
                </Typography>
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {riskCached && riskResult && !riskLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ px: 1, py: 0.35, borderRadius: 1, bgcolor: 'rgba(0,255,195,0.08)', border: '1px solid rgba(0,255,195,0.2)' }}>
                  <Typography sx={{ fontSize: '0.62rem', color: '#00ffc3', fontFamily: 'monospace', letterSpacing: '0.06em' }}>
                    CACHED
                  </Typography>
                </Box>
                <Button
                  size="small"
                  onClick={onRerun}
                  sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', minWidth: 0, px: 1, py: 0.5, '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.06)' } }}
                >
                  Re-run
                </Button>
              </Box>
            )}
            <IconButton onClick={handleClose} disabled={riskLoading} size="small" sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#fff' } }}>
              <Close fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 0.5, pb: 2 }}>
        {riskLoading && (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <CircularProgress sx={{ color: '#8084ee', mb: 2 }} size={40} />
            <Typography sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', mb: 1 }}>
              &gt; Analyzing CV, budget &amp; timeline…
            </Typography>
            <LinearProgress sx={{ maxWidth: 280, mx: 'auto', borderRadius: 1, bgcolor: 'rgba(128,132,238,0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#8084ee' } }} />
          </Box>
        )}

        {riskError && !riskLoading && (
          <Alert severity="error" sx={{ mt: 1 }}>{riskError}</Alert>
        )}

        {riskResult && !riskLoading && (() => {
          const rl = riskResult.riskLevel as 'LOW' | 'MEDIUM' | 'HIGH';
          const riskCfg = {
            LOW:    { color: '#4caf50', bg: 'rgba(76,175,80,0.1)',   border: 'rgba(76,175,80,0.35)',  label: 'LOW RISK',  glow: '#4caf5040' },
            MEDIUM: { color: '#ff9800', bg: 'rgba(255,152,0,0.1)',   border: 'rgba(255,152,0,0.35)',  label: 'MED RISK',  glow: '#ff980040' },
            HIGH:   { color: '#f44336', bg: 'rgba(244,67,54,0.1)',   border: 'rgba(244,67,54,0.35)',  label: 'HIGH RISK', glow: '#f4433640' },
          }[rl] ?? { color: '#ff9800', bg: 'rgba(255,152,0,0.1)', border: 'rgba(255,152,0,0.35)', label: 'UNKNOWN', glow: '#ff980040' };

          const GAUGES = [
            { value: riskResult.matchScore,        label: 'JOB MATCH' },
            { value: riskResult.authenticityScore, label: 'CV QUALITY' },
            { value: riskResult.budgetScore,       label: 'BUDGET' },
            { value: riskResult.timelineScore,     label: 'TIMELINE' },
          ];

          const GROUPS: Array<{ key: string; label: string; icon: React.ReactNode }> = [
            { key: 'skills',      label: 'Skills & Experience', icon: <Code sx={{ fontSize: 15 }} /> },
            { key: 'budget',      label: 'Budget Analysis',     icon: <AccountBalance sx={{ fontSize: 15 }} /> },
            { key: 'timeline',    label: 'Timeline',            icon: <Schedule sx={{ fontSize: 15 }} /> },
            { key: 'proposal',    label: 'Proposal Quality',    icon: <Article sx={{ fontSize: 15 }} /> },
            { key: 'credibility', label: 'Credibility',         icon: <FactCheck sx={{ fontSize: 15 }} /> },
          ];
          type Finding = { type: string; category?: string; text: string };
          const findings: Finding[] = riskResult.findings || [];
          const grouped = GROUPS.map(g => ({ ...g, items: findings.filter(f => f.category === g.key) })).filter(g => g.items.length > 0);
          const uncategorised = findings.filter(f => !f.category || !GROUPS.find(g => g.key === f.category));

          const FINDING_STYLE = {
            positive: { leftBar: '#4caf50', bg: 'rgba(76,175,80,0.06)',  icon: <CheckCircle sx={{ fontSize: 15, color: '#4caf50', flexShrink: 0, mt: '3px' }} /> },
            warning:  { leftBar: '#ff9800', bg: 'rgba(255,152,0,0.06)',  icon: <Warning    sx={{ fontSize: 15, color: '#ff9800', flexShrink: 0, mt: '3px' }} /> },
            danger:   { leftBar: '#f44336', bg: 'rgba(244,67,54,0.06)', icon: <Cancel     sx={{ fontSize: 15, color: '#f44336', flexShrink: 0, mt: '3px' }} /> },
          } as const;

          const SectionLabel = ({ children, icon }: { children: string; icon?: React.ReactNode }) => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {icon && <Box sx={{ display: 'flex', alignItems: 'center', color: '#8084ee', fontSize: 15 }}>{icon}</Box>}
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#8084ee', letterSpacing: '0.12em', fontFamily: '"Orbitron",sans-serif', whiteSpace: 'nowrap' }}>
                {children}
              </Typography>
              <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(128,132,238,0.2)' }} />
            </Box>
          );

          const FindingItem = ({ f }: { f: Finding }) => {
            const s = FINDING_STYLE[f.type as keyof typeof FINDING_STYLE] ?? FINDING_STYLE.warning;
            return (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, p: '10px 14px', borderRadius: 1, bgcolor: s.bg, borderLeft: `3px solid ${s.leftBar}`, mb: 0.75 }}>
                {s.icon}
                <Typography sx={{ fontSize: '0.875rem', lineHeight: 1.65, color: 'rgba(255,255,255,0.82)' }}>
                  {f.text}
                </Typography>
              </Box>
            );
          };

          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

              {/* ── Score gauges ───────────────────────────────────── */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, p: 2, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
                  {GAUGES.map(({ value, label }) => {
                    const v = value ?? 50;
                    const c = v >= 70 ? '#4caf50' : v >= 40 ? '#ff9800' : '#f44336';
                    return (
                      <Box key={label} sx={{ textAlign: 'center' }}>
                        <Box sx={{ position: 'relative', display: 'inline-flex', mb: 0.5 }}>
                          <CircularProgress variant="determinate" value={100} size={62} thickness={4}
                            sx={{ color: 'rgba(255,255,255,0.05)', position: 'absolute' }} />
                          <CircularProgress variant="determinate" value={v} size={62} thickness={4}
                            sx={{ color: c, filter: `drop-shadow(0 0 4px ${c}88)` }} />
                          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography sx={{ fontFamily: '"Orbitron",sans-serif', fontWeight: 800, fontSize: '0.9rem', color: c, lineHeight: 1 }}>
                              {v}
                            </Typography>
                          </Box>
                        </Box>
                        <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', fontWeight: 600 }}>
                          {label}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
                {/* Risk badge */}
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.75, border: `1px solid ${riskCfg.border}`, borderRadius: 1, bgcolor: riskCfg.bg, mb: 0.5, boxShadow: `0 0 12px ${riskCfg.glow}` }}>
                    <Shield sx={{ fontSize: 15, color: riskCfg.color }} />
                    <Typography sx={{ fontFamily: '"Orbitron",sans-serif', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: riskCfg.color }}>
                      {riskCfg.label}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', display: 'block', fontFamily: 'monospace' }}>
                    score {riskResult.riskScore}/100
                  </Typography>
                </Box>
              </Box>

              {/* ── Summary ────────────────────────────────────────── */}
              <Box>
                <SectionLabel icon={<Summarize sx={{ fontSize: 15 }} />}>SUMMARY</SectionLabel>
                <Box sx={{ p: '12px 16px', borderRadius: 1, bgcolor: 'rgba(128,132,238,0.07)', borderLeft: '3px solid rgba(128,132,238,0.5)' }}>
                  <Typography sx={{ fontSize: '0.9rem', lineHeight: 1.75, color: 'rgba(255,255,255,0.8)' }}>
                    {riskResult.summary}
                  </Typography>
                </Box>
              </Box>

              {/* ── Grouped findings ───────────────────────────────── */}
              {(grouped.length > 0 ? grouped : [{ key: '_', label: 'Analysis', icon: <Psychology sx={{ fontSize: 15 }} />, items: uncategorised }]).map(group => (
                <Box key={group.key}>
                  <SectionLabel icon={group.icon}>{group.label.toUpperCase()}</SectionLabel>
                  {group.items.map((f, i) => <FindingItem key={i} f={f} />)}
                </Box>
              ))}
              {uncategorised.length > 0 && grouped.length > 0 && (
                <Box>
                  {uncategorised.map((f, i) => <FindingItem key={i} f={f} />)}
                </Box>
              )}

              {/* ── Recommendation ─────────────────────────────────── */}
              <Box>
                <SectionLabel icon={<Lightbulb sx={{ fontSize: 15 }} />}>RECOMMENDATION</SectionLabel>
                <Box sx={{ p: '12px 16px', borderRadius: 1, bgcolor: `${riskCfg.color}0f`, borderLeft: `3px solid ${riskCfg.color}` }}>
                  <Typography sx={{ fontSize: '0.9rem', lineHeight: 1.75, color: 'rgba(255,255,255,0.85)' }}>
                    {riskResult.recommendation}
                  </Typography>
                </Box>
              </Box>

              {/* ── Ask AI chat ─────────────────────────────────────── */}
              <Box sx={{ borderRadius: 1.5, border: '1px solid rgba(128,132,238,0.25)', overflow: 'hidden' }}>
                <Box
                  onClick={() => setChatOpen(o => !o)}
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.25, bgcolor: 'rgba(128,132,238,0.08)', cursor: 'pointer', userSelect: 'none', '&:hover': { bgcolor: 'rgba(128,132,238,0.13)' }, transition: 'background 0.15s' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chat sx={{ fontSize: 16, color: '#8084ee' }} />
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#8084ee', fontFamily: '"Orbitron",sans-serif', letterSpacing: '0.06em' }}>
                      ASK AI FOLLOW-UP
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>{chatOpen ? '▲' : '▼'}</Typography>
                </Box>

                {chatOpen && (
                  <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {/* Quick chips */}
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                      {[
                        'What should I verify before hiring?',
                        'Suggest 3 interview questions',
                        'Is the timeline realistic?',
                        'Should I negotiate the budget?',
                      ].map(q => (
                        <Box
                          key={q}
                          onClick={() => handleSendChat(q)}
                          sx={{
                            px: 1.25, py: 0.5, borderRadius: 10, fontSize: '0.75rem', cursor: 'pointer',
                            border: '1px solid rgba(128,132,238,0.35)', color: '#8084ee',
                            bgcolor: 'rgba(128,132,238,0.07)',
                            '&:hover': { bgcolor: 'rgba(128,132,238,0.16)', borderColor: '#8084ee' },
                            transition: 'all 0.15s',
                          }}
                        >
                          {q}
                        </Box>
                      ))}
                    </Box>

                    {/* Messages */}
                    {chatMessages.length > 0 && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 260, overflowY: 'auto', pr: 0.5 }}>
                        {chatMessages.map((m, i) => (
                          <Box key={i} sx={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                            <Box sx={{
                              maxWidth: '88%', px: 1.5, py: 1, borderRadius: m.role === 'user' ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                              bgcolor: m.role === 'user' ? 'rgba(0,255,195,0.1)' : 'rgba(128,132,238,0.1)',
                              border: m.role === 'user' ? '1px solid rgba(0,255,195,0.25)' : '1px solid rgba(128,132,238,0.25)',
                            }}>
                              <Typography sx={{ fontSize: '0.85rem', lineHeight: 1.65, color: m.role === 'user' ? '#00ffc3' : 'rgba(255,255,255,0.8)', whiteSpace: 'pre-wrap' }}>
                                {m.content}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                        {chatLoading && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 0.5 }}>
                            <CircularProgress size={14} sx={{ color: '#8084ee' }} />
                            <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>thinking…</Typography>
                          </Box>
                        )}
                      </Box>
                    )}

                    {/* Input row */}
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Box
                        component="input"
                        value={chatInput}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChatInput(e.target.value)}
                        onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && !e.shiftKey && handleSendChat()}
                        placeholder="Ask anything about this bid…"
                        disabled={chatLoading}
                        sx={{
                          flex: 1, px: 1.5, py: 1, borderRadius: 1, fontSize: '0.875rem',
                          bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                          color: '#fff', outline: 'none', fontFamily: 'inherit',
                          '&:focus': { borderColor: 'rgba(128,132,238,0.5)', boxShadow: '0 0 0 2px rgba(128,132,238,0.1)' },
                          '&::placeholder': { color: 'rgba(255,255,255,0.25)' },
                          transition: 'border-color 0.15s, box-shadow 0.15s',
                        }}
                      />
                      <Button
                        size="small"
                        onClick={() => handleSendChat()}
                        disabled={!chatInput.trim() || chatLoading}
                        sx={{ minWidth: 0, px: 2, py: 1, bgcolor: 'rgba(128,132,238,0.15)', color: '#8084ee', border: '1px solid rgba(128,132,238,0.35)', borderRadius: 1, fontSize: '1rem', fontWeight: 700, '&:hover': { bgcolor: 'rgba(128,132,238,0.28)', borderColor: '#8084ee' }, '&:disabled': { opacity: 0.35 }, transition: 'all 0.15s' }}
                      >
                        →
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>

            </Box>
          );
        })()}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={riskLoading}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
