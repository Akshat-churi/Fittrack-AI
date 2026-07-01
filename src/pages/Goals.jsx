import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Target, Plus, Trash2, CheckCircle, RotateCcw, X } from 'lucide-react';
import { useGoals } from '../hooks/useGoals';

/* ── Exercise config ──────────────────────────────────────────────────── */
const EXERCISE_OPTIONS = [
  { value: 'pushups',       label: 'Push-ups',      emoji: '💪', unit: 'reps' },
  { value: 'squats',        label: 'Squats',         emoji: '🦵', unit: 'reps' },
  { value: 'jumping-jacks', label: 'Jumping Jacks',  emoji: '⭐', unit: 'reps' },
  { value: 'high-knees',    label: 'High Knees',     emoji: '🏃', unit: 'reps' },
  { value: 'plank',         label: 'Plank',          emoji: '🧘', unit: 'seconds' },
];

const exerciseByValue = Object.fromEntries(EXERCISE_OPTIONS.map((e) => [e.value, e]));

/* ── Sub-components ───────────────────────────────────────────────────── */
const ProgressBar = ({ pct }) => (
  <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden">
    <div
      className="h-full rounded-full transition-all duration-700"
      style={{
        width: `${pct}%`,
        background: pct >= 100
          ? 'linear-gradient(90deg,#22c55e,#16a34a)'
          : 'linear-gradient(90deg,#f97316,#ea580c)',
      }}
    />
  </div>
);

function GoalCard({ goal, onDelete }) {
  const ex  = exerciseByValue[goal.type] ?? { emoji: '🎯', label: goal.type, unit: 'reps' };
  const pct = Math.min(Math.round((goal.progress / goal.target) * 100), 100);
  const done = goal.status === 'completed';

  return (
    <div className={`glass rounded-2xl p-5 border transition-all ${done ? 'border-green-500/30' : 'border-zinc-800/60'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{ex.emoji}</span>
          <div>
            <p className="text-sm font-black text-white leading-tight">{goal.name}</p>
            <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">{ex.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {done ? (
            <span className="badge badge-green">Completed ✅</span>
          ) : (
            <span className="badge badge-orange">Active 🔄</span>
          )}
          <button
            onClick={() => onDelete(goal.id)}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
            aria-label="Delete goal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <ProgressBar pct={pct} />

      {/* Stats row */}
      <div className="flex items-center justify-between mt-2.5">
        <span className="text-xs text-zinc-400 font-semibold">
          {goal.progress} <span className="text-zinc-600">/</span> {goal.target} {ex.unit}
        </span>
        <span className={`text-xs font-black ${done ? 'text-green-400' : 'text-brand-orange'}`}>
          {pct}%
        </span>
      </div>

      {/* Completion message */}
      {done && (
        <p className="mt-3 text-center text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl py-2">
          🎉 Goal Completed!
        </p>
      )}
    </div>
  );
}

function CreateGoalForm({ onAdd, onClose }) {
  const [type,   setType]   = useState('pushups');
  const [target, setTarget] = useState('');
  const [name,   setName]   = useState('');
  const [error,  setError]  = useState('');

  const ex = exerciseByValue[type];

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const t = parseInt(target, 10);
    if (!name.trim())       return setError('Please enter a goal name.');
    if (!t || t < 1)        return setError('Target must be at least 1.');
    if (t > 99999)          return setError('Target seems too large.');

    onAdd({ name, type, target: t });

    // Reset form
    setName(''); setTarget(''); setType('pushups');
  };

  return (
    <div className="glass rounded-2xl border border-brand-orange/30 p-5 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-brand-orange" />
          <h3 className="text-sm font-black text-white">New Goal</h3>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Goal name */}
        <div>
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">
            Goal Name
          </label>
          <input
            type="text"
            className="input-field"
            placeholder={`e.g. 100 ${ex.label}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
          />
        </div>

        {/* Exercise type */}
        <div>
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">
            Exercise Type
          </label>
          <select
            className="input-field"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {EXERCISE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.emoji} {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Target */}
        <div>
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">
            Target ({ex.unit})
          </label>
          <input
            type="number"
            className="input-field"
            placeholder={`e.g. ${ex.unit === 'seconds' ? '60' : '100'}`}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            min="1"
            max="99999"
          />
        </div>

        {error && (
          <p className="text-xs text-red-400 font-semibold bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full">
          <Target className="w-4 h-4" /> Create Goal
        </button>
      </form>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────────────── */
export default function Goals() {
  const { goals, addGoal, removeGoal, newlyCompleted, clearCompleted } = useGoals();
  const [showForm, setShowForm] = useState(false);

  const activeGoals    = goals.filter((g) => g.status === 'active');
  const completedGoals = goals.filter((g) => g.status === 'completed');

  const handleAdd = (payload) => {
    addGoal(payload);
    setShowForm(false);
  };

  return (
    <div className="page pb-24 md:pb-8">
      <div className="content-width max-w-2xl space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="section-title">
              Goal <span className="text-gradient">Tracker</span>
            </h1>
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mt-1">
              Set targets · track progress automatically
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary text-xs px-4 py-2.5 shrink-0"
            >
              <Plus className="w-4 h-4" /> New Goal
            </button>
          )}
        </div>

        {/* Newly completed toast */}
        {newlyCompleted.length > 0 && (
          <div className="glass border border-green-500/30 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 animate-slide-up">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
              <div>
                <p className="text-sm font-black text-white">🎉 Goal Completed!</p>
                <p className="text-xs text-zinc-400">You've reached your target. Keep going!</p>
              </div>
            </div>
            <button onClick={clearCompleted} className="text-zinc-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <CreateGoalForm onAdd={handleAdd} onClose={() => setShowForm(false)} />
        )}

        {/* Active goals */}
        {activeGoals.length > 0 && (
          <section>
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">
              Active Goals ({activeGoals.length})
            </h2>
            <div className="space-y-3">
              {activeGoals.map((g) => (
                <GoalCard key={g.id} goal={g} onDelete={removeGoal} />
              ))}
            </div>
          </section>
        )}

        {/* Completed goals */}
        {completedGoals.length > 0 && (
          <section>
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">
              Completed Goals ({completedGoals.length})
            </h2>
            <div className="space-y-3">
              {completedGoals.map((g) => (
                <GoalCard key={g.id} goal={g} onDelete={removeGoal} />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {goals.length === 0 && !showForm && (
          <div className="glass rounded-3xl p-10 border border-zinc-800/60 text-center">
            <p className="text-5xl mb-4">🎯</p>
            <h3 className="text-white font-black mb-2">No goals yet</h3>
            <p className="text-zinc-500 text-sm mb-6 max-w-xs mx-auto">
              Create a goal and your workout reps will count toward it automatically.
            </p>
            <button onClick={() => setShowForm(true)} className="btn-primary mx-auto">
              <Plus className="w-4 h-4" /> Create Your First Goal
            </button>
          </div>
        )}

        {/* Hint when goals exist */}
        {goals.length > 0 && (
          <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/60">
            <RotateCcw className="w-4 h-4 text-brand-orange shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-400 leading-relaxed">
              Progress updates automatically after every{' '}
              <Link to="/" className="text-brand-orange font-bold hover:underline">
                workout session
              </Link>
              . Push-ups and Squats are tracked in real-time by the AI.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
