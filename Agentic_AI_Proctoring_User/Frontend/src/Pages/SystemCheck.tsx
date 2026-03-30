import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAgoraProctoring } from '../Components/AgoraProctoringWrapper';

type CheckStatus = 'idle' | 'checking' | 'passed' | 'failed' | 'warning';

interface CheckItem {
  id: string;
  icon: string;
  label: string;
  sublabel: string;
  status: CheckStatus;
  detail?: string;
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// ─── Sub-components ───────────────────────────────────────────────────────────

const CheckBadge: React.FC<{ status: CheckStatus }> = ({ status }) => {
  if (status === 'checking')
    return (
      <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center bg-blue-50 flex-shrink-0">
        <div className="w-3.5 h-3.5 rounded-full border-[1.5px] border-blue-200 border-t-blue-500 animate-spin" />
      </div>
    );
  if (status === 'passed')
    return (
      <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center bg-green-600 text-white text-[0.65rem] font-bold flex-shrink-0">
        ✓
      </div>
    );
  if (status === 'failed')
    return (
      <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center bg-red-600 text-white text-[0.65rem] font-bold flex-shrink-0">
        ✗
      </div>
    );
  if (status === 'warning')
    return (
      <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center bg-amber-600 text-white text-[0.65rem] font-bold flex-shrink-0">
        !
      </div>
    );
  return <div className="w-[22px] h-[22px] rounded-full bg-slate-100 flex-shrink-0" />;
};

const rowIcon = (status: CheckStatus, icon: string) => {
  if (status === 'passed') return '✓';
  if (status === 'failed') return '✗';
  if (status === 'warning') return '⚠';
  return icon;
};

const iconBoxClass = (status: CheckStatus) => {
  const base = 'w-[34px] h-[34px] rounded-[9px] flex-shrink-0 flex items-center justify-center text-[0.9rem] border-[1.5px] transition-all duration-300';
  switch (status) {
    case 'passed':   return `${base} bg-green-50 border-green-200`;
    case 'failed':   return `${base} bg-red-50 border-red-200`;
    case 'warning':  return `${base} bg-amber-50 border-amber-200`;
    case 'checking': return `${base} bg-blue-50 border-blue-200`;
    default:         return `${base} bg-slate-50 border-slate-200`;
  }
};

const detailClass = (status: CheckStatus) => {
  const base = 'text-[0.68rem] font-medium mt-0.5 truncate';
  switch (status) {
    case 'passed':   return `${base} text-green-600`;
    case 'failed':   return `${base} text-red-600`;
    case 'warning':  return `${base} text-amber-600`;
    case 'checking': return `${base} text-blue-500`;
    default:         return `${base} text-slate-400`;
  }
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const SystemCheck: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const videoRef = useRef<HTMLVideoElement>(null);
  const animRef = useRef<number>(0);
  const { localVideoTrack, localAudioTrack, initTracks } = useAgoraProctoring();

  const [checks, setChecks] = useState<CheckItem[]>([
    { id: 'camera',     icon: '📷', label: 'Camera',        sublabel: 'Live video feed required',      status: 'idle' },
    { id: 'microphone', icon: '🎤', label: 'Microphone',    sublabel: 'Audio input required',           status: 'idle' },
    { id: 'fullscreen', icon: '⛶', label: 'Fullscreen Mode', sublabel: 'Required for secure exam',     status: 'idle' },
    { id: 'browser',    icon: '🌐', label: 'Browser Support', sublabel: 'API compatibility check',     status: 'idle' },
  ]);

  const [audioLevel, setAudioLevel] = useState(0);
  const [phase, setPhase] = useState<'checking' | 'done'>('checking');
  const [allPassed, setAllPassed] = useState(false);
  const [deviceLabel, setDeviceLabel] = useState({ camera: '', mic: '', browser: '', screens: '' });

  const [showFsPrompt, setShowFsPrompt] = useState(false);
  const [showExitWarn, setShowExitWarn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [checksRunning, setChecksRunning] = useState(true);

  const updateCheck = useCallback((id: string, up: Partial<CheckItem>) => {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, ...up } : c));
  }, []);

  // ── Fullscreen change listener ────────────────────────────────────────────
  useEffect(() => {
    const onFsChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element };
      const active = !!(document.fullscreenElement || doc.webkitFullscreenElement);
      setIsFullscreen(active);
      if (!active && checksRunning && !showFsPrompt) {
        setShowExitWarn(true);
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, [checksRunning, showFsPrompt]);

  // ── Enter fullscreen ──────────────────────────────────────────────────────
  const doRequestFullscreen = async (el: Element) => {
    const ext = el as Element & {
      webkitRequestFullscreen?: () => Promise<void>;
      mozRequestFullScreen?: () => Promise<void>;
    };
    if (el.requestFullscreen) {
      await el.requestFullscreen({ navigationUI: 'hide' } as FullscreenOptions);
    } else if (ext.webkitRequestFullscreen) {
      await ext.webkitRequestFullscreen();
    } else if (ext.mozRequestFullScreen) {
      await ext.mozRequestFullScreen();
    }
  };

  const enterFullscreen = async () => {
    try {
      await doRequestFullscreen(document.documentElement);
      setIsFullscreen(true);
      setShowFsPrompt(false);
      updateCheck('fullscreen', { status: 'passed', detail: 'Fullscreen mode is active' });
    } catch {
      setIsFullscreen(false);
      updateCheck('fullscreen', { status: 'warning', detail: 'Fullscreen could not be enabled' });
      setShowFsPrompt(false);
    }
    setPhase('done');
  };

  const reenterFullscreen = async () => {
    try {
      await doRequestFullscreen(document.documentElement);
      setIsFullscreen(true);
    } catch { /* ignore */ }
    setShowExitWarn(false);
  };

  // ── Audio meter ───────────────────────────────────────────────────────────
  const startAudioMeter = useCallback((track: any) => {
    try {
      const stream = new MediaStream([track]);
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      src.connect(analyser);
      const tick = () => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAudioLevel(Math.min(100, avg * 3));
        animRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch { /* ignore */ }
  }, []);

  // ── Checks flow ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!checksRunning) return;

    const run = async () => {
      // 1. Browser check
      updateCheck('browser', { status: 'checking', detail: 'Checking API compatibility…' });
      await delay(300);
      const hasApis = ('AudioContext' in window || 'webkitAudioContext' in window) && !!navigator.mediaDevices?.getUserMedia;
      const match = navigator.userAgent.match(/Chrome\/([\d]+)/);
      const bName = match ? `Chrome v${match[1]}` : navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Browser';
      setDeviceLabel(p => ({ ...p, browser: bName }));
      updateCheck('browser', {
        status: hasApis ? 'passed' : 'failed',
        detail: hasApis ? 'All required APIs available' : 'Use Chrome or Edge',
      });

      // 2. Camera + Mic
      updateCheck('camera',     { status: 'checking', detail: 'Requesting camera permission…' });
      updateCheck('microphone', { status: 'checking', detail: 'Requesting microphone permission…' });
      await delay(350);

      try {
        await initTracks();
      } catch (err: any) {
        updateCheck('camera', { status: 'failed', detail: err.message });
        updateCheck('microphone', { status: 'failed', detail: 'Permission denied' });
      }
    };

    run();

    return () => {
      cancelAnimationFrame(animRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checksRunning, initTracks]);

  // Effect to react to tracks being ready
  useEffect(() => {
    if (localVideoTrack && videoRef.current) {
      localVideoTrack.play(videoRef.current);
      setDeviceLabel(p => ({ ...p, camera: localVideoTrack.getTrackLabel() || 'Camera' }));
      updateCheck('camera', { status: 'passed', detail: localVideoTrack.getTrackLabel() || 'Camera active' });
    }
    if (localAudioTrack) {
      setDeviceLabel(p => ({ ...p, mic: localAudioTrack.getTrackLabel() || 'Microphone' }));
      updateCheck('microphone', { status: 'passed', detail: localAudioTrack.getTrackLabel() || 'Microphone active' });
      const mediaStreamTrack = localAudioTrack.getMediaStreamTrack();
      startAudioMeter(mediaStreamTrack);
    }
  }, [localVideoTrack, localAudioTrack, startAudioMeter, updateCheck]);

  // 3. Fullscreen check trigger
  useEffect(() => {
    const cameraPassed = checks.find(c => c.id === 'camera')?.status === 'passed';
    const micPassed = checks.find(c => c.id === 'microphone')?.status === 'passed';
    const fsCheck = checks.find(c => c.id === 'fullscreen');

    if (cameraPassed && micPassed && fsCheck?.status === 'idle') {
        const isCurrentlyFs = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
        if (isCurrentlyFs) {
          updateCheck('fullscreen', { status: 'passed', detail: 'Fullscreen mode is active' });
          setPhase('done');
        } else {
          updateCheck('fullscreen', { status: 'idle', detail: 'Click below to enter fullscreen' });
          setShowFsPrompt(true);
        }
    }
  }, [checks, updateCheck]);

  // ── Overall result ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'done') return;
    setAllPassed(checks.every(c => c.status === 'passed' || c.status === 'warning'));
  }, [checks, phase]);

  // ── Proceed ───────────────────────────────────────────────────────────────
    const handleProceed = () => {
        if (animRef.current) {
            cancelAnimationFrame(animRef.current);
        }
        
        sessionStorage.setItem('system_check_passed', 'true');
        // Pass the entire location.state forward exactly as received
        navigate('/id-verification', { state: location.state });
    };

  // ── Retry ─────────────────────────────────────────────────────────────────
  const handleRetry = () => {
    cancelAnimationFrame(animRef.current);
    // Note: We don't stop tracks globally here, we just call init again
    setChecks(prev => prev.map(c => ({ ...c, status: 'idle', detail: undefined })));
    setAudioLevel(0);
    setPhase('checking');
    setAllPassed(false);
    setShowFsPrompt(false);
    setIsFullscreen(false);
    setChecksRunning(false);
    setTimeout(() => setChecksRunning(true), 100);
  };

  const BAR_COUNT = 28;
  const cameraStatus = checks.find(c => c.id === 'camera')?.status;

  return (
    <div className="min-h-screen bg-[#f5f7fa] font-sans flex flex-col items-center justify-center px-6 pb-8 pt-6">

      {/* Exit warning overlay */}
      {showExitWarn && (
        <div className="fixed inset-0 bg-[rgba(245,247,250,0.97)] z-[9998] flex flex-col items-center justify-center gap-4 animate-[fadein_0.18s_ease]">
          <div className="bg-white border border-slate-200 rounded-[20px] p-10 max-w-md w-full text-center flex flex-col items-center gap-4 shadow-[0_8px_40px_rgba(0,0,0,0.08)]">
            <div className="w-[60px] h-[60px] bg-amber-50 border-[1.5px] border-amber-200 rounded-[14px] flex items-center justify-center text-[1.6rem]">
              ⚠️
            </div>
            <h3 className="text-[1.15rem] font-extrabold text-slate-900 tracking-tight">Fullscreen Exited</h3>
            <p className="text-[0.78rem] text-slate-500 leading-relaxed">
              You have left fullscreen mode. This event has been recorded.
              Please re-enter fullscreen to continue your assessment.
            </p>
            <button
              className="w-full mt-2 py-3 px-10 bg-slate-900 text-white text-[0.88rem] font-bold rounded-[10px] border-none cursor-pointer transition-all hover:-translate-y-px hover:bg-slate-950 hover:shadow-[0_4px_20px_rgba(15,23,42,0.2)]"
              onClick={reenterFullscreen}
            >
              Re-enter Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* Top nav */}
      <div className="fixed top-0 left-0 right-0 h-[54px] bg-white border-b border-slate-200 flex items-center px-8 gap-3 z-50 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <img src="/virtusa-logo.svg" alt="Virtusa" className="h-8 block" />
      </div>

      {/* Shell */}
      <div className="w-full max-w-[1060px] mt-[54px] flex flex-col gap-5">

        {/* Heading */}
        <div className="pt-7 pb-1">
          <div className="text-[0.68rem] font-bold tracking-[0.12em] uppercase text-blue-500 mb-2">
            Pre-Assessment Check
          </div>
          <h1 className="text-[1.65rem] font-extrabold text-slate-900 tracking-tight">
            Environment Validation
          </h1>
          <p className="text-[0.8rem] text-slate-500 mt-1">
            Verify your hardware and environment before the assessment begins.
          </p>
        </div>

        {/* Grid */}
        <div className="grid gap-5" style={{ gridTemplateColumns: '1.05fr 0.95fr' }}>

          {/* Camera panel */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)] flex flex-col">

            {/* Video wrap */}
            <div className="relative bg-slate-900" style={{ aspectRatio: '16/10' }}>
              <video
                ref={videoRef}
                className="w-full h-full object-cover [transform:scaleX(-1)] block"
                autoPlay
                muted
                playsInline
                style={{ opacity: cameraStatus === 'passed' ? 1 : 0 }}
              />

              {/* Placeholder */}
              {cameraStatus !== 'passed' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/20 text-[0.78rem]">
                  <div className="w-[52px] h-[52px] rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-[1.4rem]">
                    📷
                  </div>
                  <span>
                    {!checksRunning
                      ? 'Enter fullscreen to begin'
                      : cameraStatus === 'checking'
                        ? 'Initializing camera…'
                        : cameraStatus === 'failed'
                          ? 'Camera access denied'
                          : 'Awaiting camera…'}
                  </span>
                </div>
              )}

              {/* LIVE badge + scan line */}
              {cameraStatus === 'passed' && (
                <>
                  <div className="absolute top-3 left-3 bg-red-600/90 text-white text-[0.6rem] font-bold tracking-[0.1em] px-[0.55rem] py-[0.2rem] rounded-[4px] flex items-center gap-[0.35rem]">
                    <span className="w-[5px] h-[5px] rounded-full bg-white animate-[blink_1.1s_ease-in-out_infinite]" />
                    LIVE
                  </div>
                  <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-400/50 to-transparent animate-[scan_2.8s_linear_infinite] pointer-events-none" />
                </>
              )}
            </div>

            {/* Audio meter */}
            <div className="px-5 py-3.5 border-t border-slate-100 bg-[#fafbfc]">
              <div className="flex justify-between items-center mb-[0.55rem]">
                <span className="text-[0.68rem] font-bold text-slate-500 uppercase tracking-[0.08em]">
                  Microphone Level
                </span>
                <span className={`text-[0.68rem] font-semibold ${audioLevel > 5 ? 'text-green-600' : 'text-slate-400'}`}>
                  {audioLevel > 5 ? '● Detecting input' : '○ Speak to test'}
                </span>
              </div>
              <div className="flex items-end gap-0.5 h-[30px]">
                {Array.from({ length: BAR_COUNT }, (_, i) => {
                  const threshold = Math.round((audioLevel / 100) * BAR_COUNT);
                  const isActive = i < threshold;
                  const h = isActive
                    ? Math.max(5, Math.min(28, 7 + (audioLevel / 100) * 18 + Math.sin(i * 0.85) * 4))
                    : 3;
                  const bg = isActive
                    ? i < BAR_COUNT * 0.55 ? '#22c55e' : i < BAR_COUNT * 0.78 ? '#eab308' : '#ef4444'
                    : '#e2e8f0';
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-[2px] transition-[height_0.07s_ease] min-h-[3px]"
                      style={{ height: `${h}px`, background: bg }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="flex flex-col gap-4">

            {/* Checklist */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <div className="px-5 py-3.5 border-b border-slate-100 text-[0.68rem] font-bold tracking-[0.08em] uppercase text-slate-400">
                Validation Checks
              </div>
              {checks.map((check, idx) => (
                <div
                  key={check.id}
                  className={`flex items-center gap-[0.9rem] px-5 py-[0.85rem] transition-colors hover:bg-slate-50 ${idx < checks.length - 1 ? 'border-b border-[#f8fafc]' : ''}`}
                >
                  <div className={iconBoxClass(check.status)}>
                    {rowIcon(check.status, check.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.82rem] font-semibold text-slate-800">{check.label}</div>
                    <div className="text-[0.7rem] text-slate-400 mt-[0.05rem]">{check.sublabel}</div>
                    {check.detail && (
                      <div className={detailClass(check.status)}>{check.detail}</div>
                    )}
                  </div>
                  <CheckBadge status={check.status} />
                </div>
              ))}
            </div>

            {/* Device info */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)] flex-1">
              <div className="px-5 py-3.5 border-b border-slate-100 text-[0.68rem] font-bold tracking-[0.08em] uppercase text-slate-400">
                System Information
              </div>
              {[
                { key: 'Camera',     val: deviceLabel.camera || '—' },
                { key: 'Microphone', val: deviceLabel.mic    || '—' },
                { key: 'Browser',    val: deviceLabel.browser || '—' },
                { key: 'Platform',   val: navigator.platform  || '—' },
                {
                  key: 'Fullscreen',
                  val: isFullscreen ? 'Active' : 'Inactive',
                  color: isFullscreen ? '#16a34a' : '#dc2626',
                },
                { key: 'Display', val: deviceLabel.screens || `${window.screen.width}×${window.screen.height}` },
              ].map(({ key, val, color }) => (
                <div key={key} className="flex justify-between items-center px-5 py-[0.55rem] border-b border-[#f8fafc] last:border-b-0">
                  <span className="text-[0.72rem] text-slate-500 font-medium">{key}</span>
                  <span
                    className="text-[0.72rem] font-semibold text-slate-800 text-right max-w-[55%] overflow-hidden text-ellipsis whitespace-nowrap"
                    style={color ? { color } : undefined}
                    title={val}
                  >
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border border-slate-200 rounded-[14px] px-6 py-4 flex items-center gap-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)] justify-end">
          {showFsPrompt ? (
            <div className="flex items-center gap-4 flex-1 justify-end">
              <div className="text-right">
                <p className="text-[0.78rem] font-bold text-slate-900 m-0">
                  ⛶ &nbsp; Camera &amp; Mic ready — enter fullscreen to continue
                </p>
                <p className="text-[0.7rem] text-slate-500 mt-0.5">
                  Assessment integrity requires fullscreen mode
                </p>
              </div>
              <button
                className="flex-shrink-0 px-7 py-[0.68rem] bg-slate-900 text-white text-[0.82rem] font-bold rounded-[9px] border-none cursor-pointer transition-all hover:-translate-y-px hover:bg-slate-950 hover:shadow-[0_4px_16px_rgba(15,23,42,0.25)] whitespace-nowrap"
                onClick={enterFullscreen}
              >
                Enter Fullscreen →
              </button>
            </div>
          ) : (
            <>
              {phase === 'done' && !allPassed && (
                <button
                  className="px-5 py-[0.68rem] bg-transparent text-slate-500 text-[0.8rem] font-semibold border-[1.5px] border-slate-300 rounded-[9px] cursor-pointer transition-all hover:bg-slate-50 hover:border-slate-400 hover:text-slate-900"
                  onClick={handleRetry}
                >
                  Retry
                </button>
              )}
              <button
                className="px-7 py-[0.68rem] bg-slate-900 text-white text-[0.82rem] font-bold rounded-[9px] border-none cursor-pointer transition-all whitespace-nowrap tracking-tight disabled:opacity-35 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none enabled:hover:-translate-y-px enabled:hover:bg-slate-950 enabled:hover:shadow-[0_4px_16px_rgba(15,23,42,0.25)]"
                disabled={!allPassed || phase === 'checking' || !isFullscreen}
                onClick={handleProceed}
              >
                {phase === 'checking' ? 'Validating…' : allPassed && isFullscreen ? 'Proceed to Test →' : 'Resolve Issues First'}
              </button>
            </>
          )}
        </div>

      </div>

      {/* Keyframe animations — minimal global styles for custom animations only */}
      <style>{`
        @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:0.15} }
        @keyframes scan    { 0%{top:0%} 100%{top:100%} }
        @keyframes fadein  { from{opacity:0;transform:scale(0.98)} to{opacity:1;transform:scale(1)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
};

export default SystemCheck;