import React, { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Square, RotateCcw, Activity, Clock, ArrowUpCircle, ArrowDownCircle,
  Trophy, Flame, Award, Zap, Layers, Video } from 'lucide-react';
import { usePoseDetection }   from '../hooks/usePoseDetection';
import { useExerciseTracker } from '../hooks/useExerciseTracker';
import { useTimer }           from '../hooks/useTimer';
import { saveWorkoutSession, addUserPoints, getUserPoints, getWorkoutHistory } from '../utils/storage';
import { getCurrentUser }     from '../utils/auth';
import { estimateCalories }   from '../utils/calorieCalculator';
import { calculatePoints }    from '../utils/pointsCalculator';
import { getNextStreakStats, getStreakBonus } from '../utils/streakTracker';
import { checkAndUnlockBadges } from '../utils/badgeTracker';
import { syncProfile }        from '../utils/supabaseBridge';
import { logEvent }           from '../utils/analytics';

const BADGE_ICONS = { Award, Layers, Activity, Zap, Trophy, Flame };

const MiniStat = ({ label, value, color = 'text-white', big = false }) => (
  <div className="glass rounded-2xl p-4 text-center border border-zinc-800/40">
    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
    <p className={`font-black tracking-tight ${big ? 'text-4xl md:text-5xl' : 'text-xl md:text-2xl'} ${color}`}>{value}</p>
  </div>
);

export default function Workout() {
  const { type }   = useParams();
  const navigate   = useNavigate();
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const fileRef    = useRef(null);

  const [state,          setState]          = useState('IDLE'); // IDLE | RUNNING | FINISHED
  const [mirrored,       setMirrored]       = useState(true);
  const [calories,       setCalories]       = useState(0);
  const [breakdown,      setBreakdown]      = useState(null);
  const [streakDetail,   setStreakDetail]   = useState(null);
  const [newBadges,      setNewBadges]      = useState([]);

  const { reps, status, processLandmarks, resetReps } = useExerciseTracker(type);
  const { time, formattedTime, startTimer, stopTimer, resetTimer } = useTimer();
  const { isLoaded, errorMsg, startCamera, startVideoFile, stopCamera } = usePoseDetection({
    videoRef, canvasRef, onResults: processLandmarks,
  });

  const isPush = type === 'pushups';
  const label  = isPush ? 'Push-ups' : 'Squats';

  const handleStart = async () => {
    setState('RUNNING'); setMirrored(true); startTimer();
    logEvent('workout_started', { exerciseType: label, source: 'camera' });
    if (videoRef.current) videoRef.current.src = '';
    await startCamera();
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMirrored(false);
    const url = URL.createObjectURL(file);
    if (videoRef.current) { videoRef.current.srcObject = null; videoRef.current.src = url; }
    setState('RUNNING'); startTimer();
    logEvent('workout_started', { exerciseType: label, source: 'video_file' });
    await startVideoFile(videoRef.current);
  };

  const handleStop = () => {
    setState('FINISHED'); stopTimer(); stopCamera();
    if (time > 0) {
      const user    = getCurrentUser();
      const weight  = user?.weight ? parseFloat(user.weight) : 70;
      const kcal    = estimateCalories({ exerciseType: type, reps, durationSeconds: time, weightKg: weight });
      setCalories(kcal);

      const history    = getWorkoutHistory();
      const streakInfo = getNextStreakStats(history);
      const bonus      = getStreakBonus(streakInfo.nextStreak);
      setStreakDetail({ count: streakInfo.nextStreak, bonus, isNew: streakInfo.isNewStreakDay });

      const pts = calculatePoints({ exerciseType: type, reps, durationSeconds: time, caloriesBurned: kcal, streakBonus: bonus });
      setBreakdown(pts);
      addUserPoints(pts.total);

      saveWorkoutSession({ exerciseType: label, reps, duration: formattedTime, pointsEarned: pts.total, caloriesBurned: kcal });

      // Check for active challenge completion
      const activeChallengeRaw = localStorage.getItem('fittrack_active_challenge');
      if (activeChallengeRaw) {
        try {
          const activeChallenge = JSON.parse(activeChallengeRaw);
          if (label.toLowerCase() === activeChallenge.exercise.toLowerCase() && reps >= activeChallenge.target) {
            logEvent('challenge_completed', { exercise: activeChallenge.exercise, target: activeChallenge.target, reps });
            localStorage.removeItem('fittrack_active_challenge');
          }
        } catch (err) {
          console.error('Failed to parse active challenge', err);
        }
      }

      const newBdg = checkAndUnlockBadges(getWorkoutHistory(), getUserPoints());
      if (newBdg.length > 0) setNewBadges(newBdg);

      const u = getCurrentUser();
      if (u) syncProfile(u);
    }
  };

  const handleReset = () => {
    resetReps(); resetTimer(); setCalories(0); setBreakdown(null);
    setStreakDetail(null); setNewBadges([]); setState('IDLE');
  };

  useEffect(() => () => { stopCamera(); stopTimer(); }, []);

  return (
    <div className="page pb-24 md:pb-8">
      <div className="content-width">

        {/* ── Page header ─── */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-orange/15 border border-brand-orange/25 flex items-center justify-center">
            <Activity className="w-5 h-5 text-brand-orange"/>
          </div>
          <div>
            <h1 className="text-xl font-black text-white">{label} <span className="text-gradient">Tracker</span></h1>
            <p className="text-xs text-zinc-500 font-medium">AI-powered real-time rep counting</p>
          </div>
          {state === 'RUNNING' && (
            <div className="ml-auto live-badge">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"/>LIVE
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-4 md:gap-6">

          {/* ── Camera panel ─────────────────────────────────────────── */}
          <div className="lg:col-span-2 flex flex-col">
            <div className="relative flex-1 glass rounded-3xl overflow-hidden border border-zinc-800/60 min-h-[320px] md:min-h-[480px] bg-zinc-950">

              {/* IDLE overlay */}
              {state === 'IDLE' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-zinc-950/90 backdrop-blur-sm p-6 text-center animate-fade-in">
                  <div className="w-20 h-20 rounded-3xl bg-brand-orange/10 border border-brand-orange/25 flex items-center justify-center mb-5 glow-orange-sm">
                    <Activity className="w-10 h-10 text-brand-orange"/>
                  </div>
                  <h3 className="text-2xl font-black text-white mb-2">Ready to Train?</h3>
                  <p className="text-zinc-400 text-sm mb-8 max-w-xs">Position your full body profile in frame so the AI can track your movement.</p>
                  <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                    <button onClick={handleStart} className="btn-primary flex-1">
                      <Play className="w-4 h-4 fill-white"/> Start Live
                    </button>
                    <button onClick={() => fileRef.current?.click()} className="btn-secondary flex-1">
                      <Video className="w-4 h-4"/> Upload Video
                    </button>
                  </div>
                  <input type="file" ref={fileRef} onChange={handleFile} accept="video/mp4,video/quicktime,video/webm" className="hidden"/>
                </div>
              )}

              {/* FINISHED overlay */}
              {state === 'FINISHED' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-zinc-950/95 backdrop-blur-md p-5 text-center overflow-y-auto animate-scale-in">
                  <div className="text-5xl mb-3">🎉</div>
                  <h3 className="text-2xl font-black text-white mb-1">Session Complete!</h3>
                  <p className="text-zinc-400 text-sm mb-5">{reps} {label} in {formattedTime}</p>

                  {streakDetail?.isNew && (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-4 animate-slide-up">
                      <Flame className="w-4 h-4 text-amber-400 fill-amber-400"/>
                      <span className="text-xs font-black text-white">{streakDetail.count} Day Streak!{streakDetail.bonus > 0 ? ` +${streakDetail.bonus} Bonus PTS` : ''}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-4">
                    <div className="glass rounded-2xl p-3 text-center border border-red-500/20">
                      <Flame className="w-4 h-4 text-red-400 mx-auto mb-1"/>
                      <p className="text-xl font-black text-white">{calories}</p>
                      <p className="text-[9px] text-red-400 font-bold uppercase tracking-wider">kcal</p>
                    </div>
                    <div className="glass rounded-2xl p-3 text-center border border-brand-orange/20">
                      <Trophy className="w-4 h-4 text-brand-orange mx-auto mb-1"/>
                      <p className="text-xl font-black text-white">+{breakdown?.total ?? 0}</p>
                      <p className="text-[9px] text-brand-orange font-bold uppercase tracking-wider">pts</p>
                    </div>
                  </div>

                  {breakdown && (
                    <div className="w-full max-w-xs glass rounded-2xl p-4 mb-5 text-left space-y-2 border border-zinc-800/40">
                      <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2">Points Breakdown</p>
                      {[
                        ['Reps bonus', breakdown.repBonus],
                        ['Duration bonus', breakdown.durationBonus],
                        ['Calorie bonus', breakdown.calorieBonus],
                        ['Completion', breakdown.completionBonus, 'text-green-400'],
                        ...(breakdown.streakBonus > 0 ? [['🔥 Streak', breakdown.streakBonus, 'text-amber-400']] : []),
                      ].map(([k, v, c = 'text-white']) => (
                        <div key={k} className="flex justify-between text-xs">
                          <span className="text-zinc-400">{k}</span>
                          <span className={`font-bold ${c}`}>+{v}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3 w-full max-w-xs">
                    <button onClick={handleReset} className="btn-secondary flex-1 text-xs py-2.5">Try Again</button>
                    <button onClick={() => navigate('/history')} className="btn-primary flex-1 text-xs py-2.5">View Records</button>
                  </div>
                </div>
              )}

              {/* Video / Canvas */}
              <video ref={videoRef} onEnded={() => state === 'RUNNING' && handleStop()}
                className={`absolute top-3 left-3 w-28 h-20 sm:w-36 sm:h-24 object-cover rounded-xl z-30 border border-brand-orange/30 shadow-xl ${mirrored ? 'scale-x-[-1]' : ''}`}
                playsInline autoPlay muted/>
              <canvas ref={canvasRef}
                className={`w-full h-full object-cover ${mirrored ? 'scale-x-[-1]' : ''}`}
                width={1280} height={720}/>

              {/* Loading spinner */}
              {state === 'RUNNING' && !isLoaded && !errorMsg && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-zinc-950/60 backdrop-blur-sm">
                  <div className="w-12 h-12 rounded-full border-2 border-zinc-700 border-t-brand-orange animate-spin mb-3"/>
                  <p className="text-xs text-zinc-400 font-semibold">Initializing AI model…</p>
                </div>
              )}

              {/* Error */}
              {errorMsg && (
                <div className="absolute inset-0 flex items-center justify-center z-20 bg-zinc-950/90 p-6">
                  <div className="glass rounded-2xl p-6 text-center border border-red-500/20 max-w-sm">
                    <p className="text-red-400 font-black mb-2">Camera Error</p>
                    <p className="text-zinc-400 text-xs">{errorMsg}</p>
                  </div>
                </div>
              )}

              {/* Live floating stats */}
              {state === 'RUNNING' && isLoaded && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-10 px-3">
                  <div className="glass rounded-2xl px-4 py-2 flex items-center gap-3 border border-zinc-700/50 backdrop-blur">
                    <div className="text-center">
                      <p className="text-2xl font-black text-white">{reps}</p>
                      <p className="text-[8px] text-zinc-500 uppercase tracking-wider">Reps</p>
                    </div>
                    <div className="w-px h-8 bg-zinc-700"/>
                    <div className="text-center">
                      <p className="text-sm font-black text-zinc-300">{formattedTime}</p>
                      <p className="text-[8px] text-zinc-500 uppercase tracking-wider">Time</p>
                    </div>
                    <div className="w-px h-8 bg-zinc-700"/>
                    <div className="text-center">
                      <p className={`text-sm font-black ${status === 'UP' ? 'text-accent-blue' : 'text-brand-orange'}`}>{status}</p>
                      <p className="text-[8px] text-zinc-500 uppercase tracking-wider">Stage</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Right panel ──────────────────────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* Live stats */}
            <div className="glass rounded-3xl p-5 border border-zinc-800/60 space-y-3">
              <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Live Metrics</h2>
              <MiniStat label="Repetitions" value={reps} color="text-brand-orange" big/>
              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="Time" value={formattedTime} color="text-zinc-300"/>
                <MiniStat label="Stage" value={status} color={status === 'UP' ? 'text-accent-blue' : 'text-brand-orange'}/>
              </div>
            </div>

            {/* Controls */}
            <div className="glass rounded-3xl p-5 border border-zinc-800/60 space-y-3">
              <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Controls</h2>
              {state === 'RUNNING' ? (
                <button onClick={handleStop} className="btn-danger w-full">
                  <Square className="w-4 h-4 fill-white"/> End Session
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleStart} disabled={state === 'FINISHED'} className="btn-primary text-xs py-3">
                    <Play className="w-4 h-4 fill-white"/> Live
                  </button>
                  <button onClick={() => fileRef.current?.click()} disabled={state === 'FINISHED'} className="btn-secondary text-xs py-3">
                    <Video className="w-4 h-4"/> Upload
                  </button>
                  <input type="file" ref={fileRef} onChange={handleFile} accept="video/*" className="hidden"/>
                </div>
              )}
              <button onClick={handleReset} className="btn-secondary w-full text-xs py-2.5">
                <RotateCcw className="w-4 h-4"/> Reset
              </button>
            </div>

            {/* Tips */}
            <div className="glass rounded-3xl p-5 border border-zinc-800/60">
              <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3">Tips</h2>
              <ul className="space-y-2">
                {(isPush
                  ? ['Show full side profile', 'Keep back straight', 'Full range of motion']
                  : ['Show full side profile', 'Feet shoulder-width apart', 'Go below parallel']
                ).map(t => (
                  <li key={t} className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-orange/60 shrink-0"/>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ── Badge unlock popup ───────────────────────────────────────────── */}
      {newBadges.length > 0 && (() => {
        const b = newBadges[0];
        const Icon = BADGE_ICONS[b.icon] || Award;
        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="glass max-w-sm w-full rounded-3xl p-7 text-center border border-brand-orange/30 shadow-glow-orange animate-bounce-short">
              <div className="relative w-20 h-20 mx-auto mb-5">
                <div className="w-full h-full rounded-2xl bg-brand-orange/10 border border-brand-orange/25 flex items-center justify-center">
                  <Icon className="w-10 h-10 text-brand-orange"/>
                </div>
                <div className="absolute inset-0 bg-brand-orange/20 rounded-2xl blur-xl animate-pulse"/>
              </div>
              <p className="badge-orange mb-2 mx-auto w-fit">Achievement Unlocked</p>
              <h4 className="text-xl font-black text-white mb-2">{b.name}</h4>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">{b.description}</p>
              <button onClick={() => setNewBadges(p => p.slice(1))} className="btn-primary w-full">
                {newBadges.length > 1 ? `Next (${newBadges.length - 1} more)` : 'Awesome! 🎉'}
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
