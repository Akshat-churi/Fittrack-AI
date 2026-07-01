import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Calendar, Clock, Activity, Target, Flame, Trophy } from 'lucide-react';
import { getWorkoutHistory, clearWorkoutHistory } from '../utils/storage';

export default function History() {
  const [history,     setHistory]     = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => { setHistory(getWorkoutHistory()); }, []);

  const handleClear = () => {
    if (showConfirm) { clearWorkoutHistory(); setHistory([]); setShowConfirm(false); }
    else { setShowConfirm(true); setTimeout(() => setShowConfirm(false), 3000); }
  };

  return (
    <div className="page pb-24 md:pb-8">
      <div className="content-width space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="section-title">Activity <span className="text-gradient">History</span></h1>
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mt-1">All your recorded workout sessions</p>
          </div>
          {history.length > 0 && (
            <button onClick={handleClear}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                showConfirm ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-red-400 hover:border-red-500/30'}`}>
              <Trash2 className="w-4 h-4"/>
              {showConfirm ? 'Confirm Clear All' : 'Clear History'}
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="glass rounded-3xl p-12 md:p-16 text-center border border-zinc-800/40">
            <p className="text-6xl mb-4">🏃</p>
            <h3 className="text-xl font-black text-white mb-2">No workouts yet</h3>
            <p className="text-zinc-500 text-sm max-w-xs mx-auto leading-relaxed mb-6">
              Your workout history will appear here after you complete your first session.
            </p>
            <Link to="/" className="btn-primary inline-flex px-6 py-3">Start First Workout</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {history.map((session) => (
              <div key={session.id} className="glass rounded-2xl p-5 border border-zinc-800/40 hover:border-brand-orange/20 group transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Activity className="w-5 h-5 text-brand-orange"/>
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">{session.exerciseType}</p>
                      <p className="text-[10px] text-zinc-500 font-semibold">{session.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-brand-orange">{session.reps}</p>
                    <p className="text-[9px] text-zinc-600 uppercase tracking-wider font-bold">reps</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-900/60 rounded-xl px-3 py-2">
                    <Clock className="w-3.5 h-3.5 text-brand-orange/50 shrink-0"/>
                    <span>{session.duration}</span>
                    <span className="ml-auto text-zinc-600">{session.time}</span>
                  </div>
                  {session.caloriesBurned != null && (
                    <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-900/60 rounded-xl px-3 py-2">
                      <Flame className="w-3.5 h-3.5 text-red-400/70 shrink-0"/>
                      <span className="text-red-400 font-bold">{session.caloriesBurned} kcal</span>
                    </div>
                  )}
                  {session.pointsEarned != null && (
                    <div className="flex items-center gap-2 text-xs bg-zinc-900/60 rounded-xl px-3 py-2">
                      <Trophy className="w-3.5 h-3.5 text-amber-400/70 shrink-0"/>
                      <span className="text-amber-400 font-black">+{session.pointsEarned} pts</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
