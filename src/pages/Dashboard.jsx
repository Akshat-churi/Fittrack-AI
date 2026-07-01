import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Clock, Flame, Trophy, Calendar, Layers, ChevronRight } from 'lucide-react';
import { getWorkoutHistory } from '../utils/storage';
import { getDashboardStats }  from '../utils/dashboardStats';
import { calculateStreaks }   from '../utils/streakTracker';

const PERIODS = [
  { id: 'day',   label: 'Day' },
  { id: 'week',  label: 'Week' },
  { id: 'month', label: 'Month' },
];

const StatTile = ({ title, value, icon: Icon, accent, sub }) => (
  <div className={`glass rounded-2xl p-4 md:p-5 flex flex-col gap-2 border ${accent}`}>
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-tight">{title}</span>
      <Icon className="w-4 h-4 text-zinc-600"/>
    </div>
    <p className="text-2xl md:text-3xl font-black text-white tracking-tight">{value}</p>
    {sub && <p className="text-[10px] text-zinc-600 font-semibold">{sub}</p>}
  </div>
);

const BarChart = ({ data, dataKey, color }) => {
  const max = Math.max(...data.map(d => d[dataKey]), 1);
  return (
    <div className="flex items-end gap-1.5 h-32 w-full">
      {data.map((d, i) => {
        const pct = (d[dataKey] / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
            <span className="text-[8px] text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold">{d[dataKey]}</span>
            <div className="w-full rounded-t-lg transition-all duration-500 hover:brightness-125"
              style={{ height: `${Math.max(pct, 3)}%`, background: color, opacity: pct > 5 ? 0.85 : 0.3 }}/>
            <span className="text-[8px] text-zinc-600 font-semibold">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
};

const LineChart = ({ data }) => {
  const vals = data.map(d => d.points);
  const max  = Math.max(...vals, 1);
  const W = 500, H = 120, px = 30, py = 15;
  const pts = data.map((d, i) => ({
    x: px + (i * (W - 2 * px)) / Math.max(data.length - 1, 1),
    y: H - py - (d.points / max) * (H - 2 * py),
    v: d.points, l: d.label,
  }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = pts.length > 1 ? `${line} L ${pts.at(-1).x} ${H - py} L ${pts[0].x} ${H - py} Z` : '';
  return (
    <svg className="w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#f97316" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {area && <path d={area} fill="url(#lg)"/>}
      {line && <path d={line} fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
      {pts.map((p, i) => (
        <g key={i} className="group">
          <circle cx={p.x} cy={p.y} r="4" fill="#f97316" stroke="#09090b" strokeWidth="2"/>
          <text x={p.x} y={H - 2} textAnchor="middle" fontSize="8" fill="#52525b">{p.l}</text>
        </g>
      ))}
    </svg>
  );
};

export default function Dashboard() {
  const [period,  setPeriod]  = useState('week');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const load = () => setHistory(getWorkoutHistory());
    load();
    window.addEventListener('fittrack_points_updated', load);
    window.addEventListener('storage', load);
    return () => { window.removeEventListener('fittrack_points_updated', load); window.removeEventListener('storage', load); };
  }, []);

  const stats   = useMemo(() => getDashboardStats(history, period), [history, period]);
  const streaks = useMemo(() => calculateStreaks(history), [history]);

  const pushPct  = stats.pushupsReps + stats.squatsReps > 0 ? Math.round((stats.pushupsReps / (stats.pushupsReps + stats.squatsReps)) * 100) : 50;
  const sqPct    = 100 - pushPct;
  const R = 44, C = 2 * Math.PI * R;

  const tiles = [
    { title: 'Workouts', value: stats.totalWorkouts,    icon: Layers,   accent: 'border-accent-blue/20',    sub: `in this ${period}` },
    { title: 'Reps',     value: stats.totalReps,        icon: Activity, accent: 'border-brand-orange/20',   sub: 'total repetitions' },
    { title: 'Calories', value: `${stats.totalCalories}`, icon: Flame, accent: 'border-red-500/20',        sub: 'kcal burned' },
    { title: 'Duration', value: stats.totalDurationStr, icon: Clock,    accent: 'border-emerald-500/20',    sub: 'active time' },
    { title: 'Points',   value: `${stats.totalPoints}`, icon: Trophy,   accent: 'border-amber-500/20',      sub: 'PTS earned' },
    { title: 'Streak',   value: `${streaks.currentStreak}d`, icon: Flame, accent: 'border-orange-500/20', sub: `best: ${streaks.longestStreak}d` },
  ];

  return (
    <div className="page pb-24 md:pb-8">
      <div className="content-width space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="section-title">Progress <span className="text-gradient">Dashboard</span></h1>
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mt-1">Your performance analytics</p>
          </div>
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 self-start sm:self-auto">
            {PERIODS.map(p => (
              <button key={p.id} onClick={() => setPeriod(p.id)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${period === p.id ? 'bg-brand-orange text-white shadow' : 'text-zinc-400 hover:text-white'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {tiles.map(t => <StatTile key={t.title} {...t}/>)}
        </div>

        {/* Charts row 1 */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 glass rounded-3xl p-5 border border-zinc-800/60">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-xl bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center">
                <Activity className="w-4 h-4 text-brand-orange"/>
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Reps Volume</h3>
                <p className="text-[10px] text-zinc-500">Repetitions over period</p>
              </div>
            </div>
            {stats.totalReps > 0 ? (
              <BarChart data={stats.chartData} dataKey="reps" color="#f97316"/>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <p className="text-3xl mb-2">🏋️</p>
                <p className="text-zinc-600 text-xs font-semibold">No reps recorded yet</p>
              </div>
            )}
          </div>

          <div className="glass rounded-3xl p-5 border border-zinc-800/60">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center">
                <Layers className="w-4 h-4 text-accent-blue"/>
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Exercise Split</h3>
                <p className="text-[10px] text-zinc-500">Push-ups vs Squats</p>
              </div>
            </div>
            {stats.pushupsReps + stats.squatsReps > 0 ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-28 h-28">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r={R} fill="none" stroke="#6366f1" strokeWidth="10"/>
                    <circle cx="50" cy="50" r={R} fill="none" stroke="#f97316" strokeWidth="10"
                      strokeDasharray={C} strokeDashoffset={C - (pushPct/100)*C} strokeLinecap="round"
                      className="transition-all duration-1000"/>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-black text-white">{stats.pushupsReps + stats.squatsReps}</span>
                    <span className="text-[8px] text-zinc-500 uppercase">total</span>
                  </div>
                </div>
                <div className="space-y-2 w-full">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded bg-brand-orange"/><span className="text-zinc-400">Push-ups</span></div>
                    <span className="font-bold text-white">{pushPct}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded bg-accent-purple"/><span className="text-zinc-400">Squats</span></div>
                    <span className="font-bold text-white">{sqPct}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <p className="text-3xl mb-2">📊</p>
                <p className="text-zinc-600 text-xs font-semibold">No data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Charts row 2 */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="glass rounded-3xl p-5 border border-zinc-800/60">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <Flame className="w-4 h-4 text-red-400"/>
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Calories</h3>
                <p className="text-[10px] text-zinc-500">kcal per session</p>
              </div>
            </div>
            {stats.totalCalories > 0 ? (
              <BarChart data={stats.chartData} dataKey="calories" color="#ef4444"/>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <p className="text-3xl mb-2">🔥</p>
                <p className="text-zinc-600 text-xs font-semibold">No calories yet</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 glass rounded-3xl p-5 border border-zinc-800/60">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-amber-400"/>
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Points Growth</h3>
                <p className="text-[10px] text-zinc-500">Reward point accumulation</p>
              </div>
            </div>
            {stats.totalPoints > 0 ? (
              <LineChart data={stats.chartData}/>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <p className="text-3xl mb-2">🏆</p>
                <p className="text-zinc-600 text-xs font-semibold">Complete workouts to earn points</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent sessions table */}
        <div className="glass rounded-3xl p-5 border border-zinc-800/60">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-emerald-400"/>
              </div>
              <h3 className="text-sm font-black text-white">Recent Sessions</h3>
            </div>
            <Link to="/history" className="flex items-center gap-1 text-xs font-bold text-brand-orange hover:text-brand-orange-light transition-colors">
              All History <ChevronRight className="w-4 h-4"/>
            </Link>
          </div>

          {history.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-zinc-800/40">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-800/60 bg-zinc-900/40">
                    {['Exercise', 'Reps', 'Duration', 'Calories', 'Points'].map(h => (
                      <th key={h} className="py-3 px-4 text-[9px] font-black text-zinc-600 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/30">
                  {history.slice(0, 5).map((s, i) => (
                    <tr key={i} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="py-3 px-4 text-xs font-bold text-white">{s.exerciseType}</td>
                      <td className="py-3 px-4 text-xs text-zinc-400">{s.reps}</td>
                      <td className="py-3 px-4 text-xs text-zinc-400">{s.duration}</td>
                      <td className="py-3 px-4 text-xs text-red-400 font-semibold">{s.caloriesBurned != null ? `${s.caloriesBurned} kcal` : '—'}</td>
                      <td className="py-3 px-4 text-xs text-brand-orange font-black">+{s.pointsEarned ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-5xl mb-3">📋</p>
              <p className="text-white font-bold mb-1">No sessions yet</p>
              <p className="text-zinc-500 text-xs max-w-xs">Complete your first workout to start tracking your progress.</p>
              <Link to="/" className="btn-primary mt-4 text-xs px-5 py-2.5">Start Workout</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
