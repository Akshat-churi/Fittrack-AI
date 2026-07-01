import React, { useState, useEffect } from 'react';
import { Trophy, Zap, Flame, Clock, TrendingUp, RefreshCw, Loader2 } from 'lucide-react';
import { fetchUserPersonalRecords } from '../utils/supabaseBridge';
import { getWorkoutHistory } from '../utils/storage';

const RECORD_META = {
  push_ups_max_reps:  { label: 'Push-ups PB',   icon: Zap,       color: 'text-brand-orange', bg: 'bg-brand-orange/10',  unit: 'reps' },
  squats_max_reps:    { label: 'Squats PB',      icon: TrendingUp, color: 'text-indigo-400',  bg: 'bg-indigo-400/10',    unit: 'reps' },
  plank_max_reps:     { label: 'Plank PB',       icon: Clock,      color: 'text-sky-400',     bg: 'bg-sky-400/10',       unit: 'reps' },
  best_session_calories: { label: 'Best Session', icon: Flame,     color: 'text-red-400',     bg: 'bg-red-400/10',       unit: 'kcal' },
  longest_session_seconds: { label: 'Longest Session', icon: Clock, color: 'text-emerald-400', bg: 'bg-emerald-400/10', unit: 'sec', format: (v) => `${Math.floor(v/60)}m ${v%60}s` },
};

/**
 * Displays personal records for the current user.
 * Loads from Supabase profile personal_records JSONB and local workout history.
 *
 * Props:
 *   userId   - The user whose records to display
 *   compact  - If true, renders a compact horizontal row (for Profile page sidebar)
 */
const PersonalRecords = ({ userId, compact = false }) => {
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      setLoading(true);
      try {
        const dbRecords = await fetchUserPersonalRecords(userId);

        // Also derive records from local workout history (for current user)
        const history = getWorkoutHistory();
        const localRecords = { ...dbRecords };

        history.forEach(session => {
          if (session.exerciseType) {
            const key = session.exerciseType.toLowerCase().replace(/[\s-]+/g, '_') + '_max_reps';
            if ((session.reps || 0) > (localRecords[key] || 0)) {
              localRecords[key] = session.reps;
            }
          }
          if ((session.caloriesBurned || 0) > (localRecords.best_session_calories || 0)) {
            localRecords.best_session_calories = Math.round(session.caloriesBurned * 10) / 10;
          }
          if ((session.duration || 0) > (localRecords.longest_session_seconds || 0)) {
            localRecords.longest_session_seconds = session.duration;
          }
        });

        setRecords(localRecords);
      } catch (err) {
        console.error('[PersonalRecords]', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId, lastRefresh]);

  const entries = Object.entries(records).filter(([, v]) => v && v > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-brand-orange animate-spin" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="p-3 rounded-2xl bg-brand-orange/10 border border-brand-orange/20">
          <Trophy className="w-6 h-6 text-brand-orange" />
        </div>
        <p className="text-slate-400 text-sm font-semibold">No personal records yet</p>
        <p className="text-slate-600 text-xs">Complete workouts to set your PRs!</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex gap-3 flex-wrap">
        {entries.map(([key, value]) => {
          const meta = RECORD_META[key] || {
            label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            icon: Trophy,
            color: 'text-amber-400',
            bg: 'bg-amber-400/10',
            unit: '',
          };
          const Icon = meta.icon;
          const display = meta.format ? meta.format(value) : `${value} ${meta.unit}`;

          return (
            <div
              key={key}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-white/5 ${meta.bg}`}
            >
              <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
              <div>
                <p className={`text-xs font-black ${meta.color}`}>{display}</p>
                <p className="text-[9px] text-slate-500 font-semibold">{meta.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          Personal Records
        </h3>
        <button
          onClick={() => setLastRefresh(Date.now())}
          className="p-1.5 rounded-lg text-slate-500 hover:text-white transition-colors"
          title="Refresh records"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {entries.map(([key, value]) => {
          const meta = RECORD_META[key] || {
            label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            icon: Trophy,
            color: 'text-amber-400',
            bg: 'bg-amber-400/10',
            unit: '',
          };
          const Icon = meta.icon;
          const display = meta.format ? meta.format(value) : `${value} ${meta.unit}`;

          return (
            <div
              key={key}
              className="premium-glass-card rounded-2xl p-4 border border-brand-border/60 flex items-center gap-3"
            >
              <div className={`p-2.5 rounded-xl ${meta.bg} shrink-0`}>
                <Icon className={`w-5 h-5 ${meta.color}`} />
              </div>
              <div>
                <p className={`text-lg font-black tracking-tight ${meta.color}`}>{display}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{meta.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PersonalRecords;
