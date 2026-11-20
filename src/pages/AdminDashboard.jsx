import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, BarChart2, Activity, Target, Crown, Shield, TrendingUp,
  Search, ChevronRight, Award, Zap, Flame, Star, CheckCircle,
  XCircle, MessageSquare, Heart, Eye, RefreshCw, DollarSign,
  Dumbbell, Utensils, LogOut, User as UserIcon, ArrowUp, ArrowDown,
  LayoutDashboard, Settings, Sword,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar';
import { signOut } from '../utils/auth';
import { getUserScopedKey } from '../utils/userDataManager';
import { getEvents } from '../utils/analytics';

/* ══════════════════════════════════════════════════════════════════
   DATA HELPERS — reads from localStorage
══════════════════════════════════════════════════════════════════ */

const readUsers = () => {
  try {
    return JSON.parse(localStorage.getItem('fittrack_auth_users') || '[]');
  } catch { return []; }
};

const readUserHistory = (userId) => {
  try {
    const key = getUserScopedKey(userId, 'history');
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch { return []; }
};

const readUserGoals = (userId) => {
  try {
    const key = getUserScopedKey(userId, 'goals');
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch { return []; }
};

const readUserPoints = (userId) => {
  try {
    const key = getUserScopedKey(userId, 'points');
    return parseInt(localStorage.getItem(key) || '0', 10);
  } catch { return 0; }
};

const isUserPro = (userId) => {
  try {
    const key = getUserScopedKey(userId, 'pro');
    const data = JSON.parse(localStorage.getItem(key) || 'null');
    return data?.status === 'pro';
  } catch { return false; }
};

/* Build enriched user stats array */
const buildStats = () => {
  const all = readUsers();
  return all.map((u) => {
    const history = readUserHistory(u.id);
    const goals = readUserGoals(u.id);
    const points = readUserPoints(u.id);
    const pro = u.isPro || isUserPro(u.id);

    const exerciseCounts = {};
    let totalCals = 0;
    history.forEach((s) => {
      const ex = s.exerciseType || 'Unknown';
      exerciseCounts[ex] = (exerciseCounts[ex] || 0) + 1;
      totalCals += s.caloriesBurned || 0;
    });

    return {
      ...u,
      password: undefined,
      workoutCount: history.length,
      goalCount: goals.length,
      completedGoals: goals.filter(g => g.status === 'completed').length,
      totalReps: history.reduce((s, h) => s + (h.reps || 0), 0),
      totalCalories: Math.round(totalCals),
      points,
      isPro: pro,
      exerciseCounts,
      lastActive: history[0]?.date || null,
    };
  });
};

/* ── Analytics aggregation helper ────────────────────────────────────────── */
const buildAnalyticsStats = () => {
  const events = getEvents();
  const count = (type) => events.filter(e => e.type === type).length;
  return {
    signups: count('user_signup'),
    logins: count('user_login'),
    workoutsStarted: count('workout_started'),
    exercisesCompleted: count('exercise_completed'),
    repsAdded: count('reps_added'),
    postsCreated: count('post_created'),
    postsLiked: count('post_liked'),
    friendsAdded: count('friend_added'),
    goalsCreated: count('goal_created'),
    goalsCompleted: count('goal_completed'),
    proPurchaseAttempts: count('pro_purchase_attempt'),
    proPurchases: count('pro_purchase_success'),
    nutritionPlans: count('nutrition_plan_generated'),
    caloriesLogged: count('calorie_logged'),
    challengesJoined: count('challenge_joined'),
    challengesCompleted: count('challenge_completed'),
  };
};

/* Exercise popularity across all users */
const buildExerciseStats = (enrichedUsers) => {
  const map = {};
  enrichedUsers.forEach((u) => {
    Object.entries(u.exerciseCounts).forEach(([ex, cnt]) => {
      map[ex] = (map[ex] || 0) + cnt;
    });
  });
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));
};

/* ══════════════════════════════════════════════════════════════════
   TINY CHART — horizontal bar
══════════════════════════════════════════════════════════════════ */
const HBar = ({ label, value, max, color = 'bg-brand-orange' }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs text-zinc-300 font-semibold">{label}</span>
      <span className="text-xs text-zinc-500 font-bold">{value}</span>
    </div>
    <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
      <div
        className={`h-full rounded-full ${color} transition-all duration-700`}
        style={{ width: max > 0 ? `${Math.round((value / max) * 100)}%` : '0%' }}
      />
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════════
   STAT CARD
══════════════════════════════════════════════════════════════════ */
const StatCard = ({ icon: Icon, label, value, sub, color = 'text-brand-orange', bg = 'bg-brand-orange/10', border = 'border-brand-orange/20' }) => (
  <div className={`glass rounded-2xl border ${border} p-5 flex flex-col gap-3`}>
    <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center`}>
      <Icon className={`w-5 h-5 ${color}`} />
    </div>
    <div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-xs text-zinc-500 font-semibold mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-zinc-600 mt-1">{sub}</p>}
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════════
   SIDEBAR NAV
══════════════════════════════════════════════════════════════════ */
const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'subscriptions', label: 'Subscriptions', icon: Crown },
  { id: 'workouts', label: 'Workout Analytics', icon: Dumbbell },
  { id: 'social', label: 'Social Analytics', icon: Heart },
  { id: 'features', label: 'Feature Usage', icon: Zap },
];

const Sidebar = ({ active, onSelect }) => {
  const navigate = useNavigate();
  const handleSignOut = () => { signOut(); navigate('/auth'); };

  return (
    <aside className="w-64 shrink-0 hidden lg:flex flex-col bg-zinc-950/60 border-r border-zinc-800/60 min-h-[calc(100vh-64px)]">
      <nav className="flex-1 p-4 space-y-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${active === id
              ? 'bg-brand-orange/15 text-brand-orange border border-brand-orange/20'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-zinc-800/60">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

/* ══════════════════════════════════════════════════════════════════
   OVERVIEW TAB
══════════════════════════════════════════════════════════════════ */
const OverviewTab = ({ users }) => {
  const regular = users.filter(u => u.role !== 'ADMIN');
  const proUsers = regular.filter(u => u.isPro);
  const activeUsers = regular.filter(u => u.workoutCount > 0);
  const totalWorkouts = regular.reduce((s, u) => s + u.workoutCount, 0);
  const totalGoals = regular.reduce((s, u) => s + u.goalCount, 0);
  const totalReps = regular.reduce((s, u) => s + u.totalReps, 0);
  const totalCals = regular.reduce((s, u) => s + u.totalCalories, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-white mb-1">Platform Overview</h2>
        <p className="text-sm text-zinc-500">Real-time stats derived from all user accounts.</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Total Users" value={regular.length} sub="Registered accounts" color="text-sky-400" bg="bg-sky-500/10" border="border-sky-500/20" />
        <StatCard icon={Activity} label="Active Users" value={activeUsers.length} sub="At least 1 workout logged" color="text-green-400" bg="bg-green-500/10" border="border-green-500/20" />
        <StatCard icon={Dumbbell} label="Total Workouts" value={totalWorkouts} sub="Completed sessions" color="text-brand-orange" />
        <StatCard icon={Crown} label="PRO Subscribers" value={proUsers.length} sub={`of ${regular.length} users`} color="text-amber-400" bg="bg-amber-500/10" border="border-amber-500/20" />
        <StatCard icon={Target} label="Goals Created" value={totalGoals} sub="Across all accounts" color="text-purple-400" bg="bg-purple-500/10" border="border-purple-500/20" />
        <StatCard icon={Flame} label="Total Reps" value={totalReps.toLocaleString()} sub="Push-ups, squats & more" color="text-red-400" bg="bg-red-500/10" border="border-red-500/20" />
      </div>

      {/* Quick metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass rounded-2xl border border-zinc-800/60 p-5">
          <h3 className="text-sm font-black text-white mb-4">Top Users by Workouts</h3>
          <div className="space-y-3">
            {[...regular].sort((a, b) => b.workoutCount - a.workoutCount).slice(0, 5).map((u, i) => (
              <div key={u.id} className="flex items-center gap-3">
                <span className="text-xs font-black text-zinc-600 w-5">#{i + 1}</span>
                <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                  {u.photo ? <img src={u.photo} alt="" className="w-7 h-7 rounded-lg object-cover" /> : <UserIcon className="w-3.5 h-3.5 text-zinc-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{u.name}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{u.email}</p>
                </div>
                <span className="text-xs font-black text-brand-orange shrink-0">{u.workoutCount} sessions</span>
              </div>
            ))}
            {regular.length === 0 && <p className="text-xs text-zinc-600">No user data yet.</p>}
          </div>
        </div>

        <div className="glass rounded-2xl border border-zinc-800/60 p-5">
          <h3 className="text-sm font-black text-white mb-4">Platform Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-semibold">Activation Rate</span>
              <span className="text-xs font-black text-white">
                {regular.length > 0 ? Math.round((activeUsers.length / regular.length) * 100) : 0}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-green-500 transition-all duration-700"
                style={{ width: regular.length > 0 ? `${Math.round((activeUsers.length / regular.length) * 100)}%` : '0%' }} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-semibold">PRO Conversion</span>
              <span className="text-xs font-black text-white">
                {regular.length > 0 ? Math.round((proUsers.length / regular.length) * 100) : 0}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-amber-500 transition-all duration-700"
                style={{ width: regular.length > 0 ? `${Math.round((proUsers.length / regular.length) * 100)}%` : '0%' }} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-semibold">Goal Completion</span>
              <span className="text-xs font-black text-white">
                {(() => {
                  const total = regular.reduce((s, u) => s + u.goalCount, 0);
                  const done = regular.reduce((s, u) => s + u.completedGoals, 0);
                  return total > 0 ? Math.round((done / total) * 100) : 0;
                })()}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-purple-500 transition-all duration-700"
                style={{
                  width: (() => {
                    const total = regular.reduce((s, u) => s + u.goalCount, 0);
                    const done = regular.reduce((s, u) => s + u.completedGoals, 0);
                    return total > 0 ? `${Math.round((done / total) * 100)}%` : '0%';
                  })()
                }} />
            </div>

            <div className="pt-2 border-t border-zinc-800/60">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-semibold">Calories Burned (Total)</span>
                <span className="text-xs font-black text-red-400">{totalCals.toLocaleString()} kcal</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   USER MANAGEMENT TAB
══════════════════════════════════════════════════════════════════ */
const UsersTab = ({ users }) => {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);

  const regular = users.filter(u => u.role !== 'ADMIN');
  const filtered = regular.filter(u =>
    u.name?.toLowerCase().includes(q.toLowerCase()) ||
    u.email?.toLowerCase().includes(q.toLowerCase())
  );

  if (selected) {
    const u = selected;
    return (
      <div className="space-y-5">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-semibold transition-colors">
          ← Back to Users
        </button>
        <div className="glass rounded-2xl border border-zinc-800/60 p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
              {u.photo ? <img src={u.photo} alt="" className="w-16 h-16 rounded-2xl object-cover" /> : <UserIcon className="w-8 h-8 text-zinc-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-white">{u.name}</h2>
                {u.isPro && <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] font-black text-amber-400 uppercase">PRO</span>}
                <span className="px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[10px] font-black text-sky-400 uppercase">{u.role}</span>
              </div>
              <p className="text-sm text-zinc-400 mt-0.5">{u.email}</p>
              <p className="text-xs text-zinc-600 mt-1">Member since {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Workouts', value: u.workoutCount, icon: Dumbbell, color: 'text-brand-orange' },
              { label: 'Total Reps', value: u.totalReps.toLocaleString(), icon: Activity, color: 'text-green-400' },
              { label: 'Goals', value: `${u.completedGoals}/${u.goalCount}`, icon: Target, color: 'text-purple-400' },
              { label: 'Points', value: u.points.toLocaleString(), icon: Star, color: 'text-amber-400' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="glass rounded-xl border border-zinc-800/60 p-4 text-center">
                <Icon className={`w-5 h-5 ${color} mx-auto mb-2`} />
                <p className="text-lg font-black text-white">{value}</p>
                <p className="text-[10px] text-zinc-500 font-semibold">{label}</p>
              </div>
            ))}
          </div>

          {Object.keys(u.exerciseCounts).length > 0 && (
            <div>
              <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3">Exercise Breakdown</h3>
              <div className="space-y-2.5">
                {Object.entries(u.exerciseCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([ex, cnt]) => (
                    <HBar key={ex} label={ex} value={cnt} max={Math.max(...Object.values(u.exerciseCounts))} />
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black text-white">User Management</h2>
          <p className="text-sm text-zinc-500">{regular.length} registered users</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800/60 w-64">
          <Search className="w-4 h-4 text-zinc-500 shrink-0" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search name or email…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none" />
        </div>
      </div>

      <div className="glass rounded-2xl border border-zinc-800/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800/60">
                {['User', 'Email', 'Role', 'PRO', 'Workouts', 'Joined', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-600">No users found.</td></tr>
              )}
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                        {u.photo ? <img src={u.photo} alt="" className="w-8 h-8 rounded-lg object-cover" /> : <UserIcon className="w-4 h-4 text-zinc-500" />}
                      </div>
                      <span className="text-sm font-bold text-white whitespace-nowrap">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400 max-w-[160px] truncate">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[10px] font-black text-sky-400 uppercase">{u.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    {u.isPro
                      ? <span className="flex items-center gap-1 text-amber-400 text-xs font-bold"><Crown className="w-3.5 h-3.5" />PRO</span>
                      : <span className="text-xs text-zinc-600 font-semibold">Free</span>}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-white">{u.workoutCount}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelected(u)}
                      className="flex items-center gap-1 text-xs font-bold text-brand-orange hover:text-amber-400 transition-colors">
                      View <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   SUBSCRIPTIONS TAB
══════════════════════════════════════════════════════════════════ */
const SubscriptionsTab = ({ users }) => {
  const regular = users.filter(u => u.role !== 'ADMIN');
  const proCount = regular.filter(u => u.isPro).length;
  const freeCount = regular.length - proCount;
  const convRate = regular.length > 0 ? Math.round((proCount / regular.length) * 100) : 0;
  const mockMRR = proCount * 499;

  const proUsers = regular.filter(u => u.isPro);
  const freeUsers = regular.filter(u => !u.isPro);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-white mb-1">Subscription Analytics</h2>
        <p className="text-sm text-zinc-500">PRO vs FREE breakdown and revenue estimates.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Crown} label="PRO Users" value={proCount} color="text-amber-400" bg="bg-amber-500/10" border="border-amber-500/20" />
        <StatCard icon={Users} label="FREE Users" value={freeCount} color="text-sky-400" bg="bg-sky-500/10" border="border-sky-500/20" />
        <StatCard icon={TrendingUp} label="Conversion Rate" value={`${convRate}%`} color="text-green-400" bg="bg-green-500/10" border="border-green-500/20" sub="Free → PRO" />
        <StatCard icon={DollarSign} label="Est. MRR (Mock)" value={`₹${mockMRR.toLocaleString()}`} color="text-purple-400" bg="bg-purple-500/10" border="border-purple-500/20" sub="₹499 × PRO users" />
      </div>

      {/* Ratio visual */}
      <div className="glass rounded-2xl border border-zinc-800/60 p-6">
        <h3 className="text-sm font-black text-white mb-5">PRO vs FREE Distribution</h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 h-4 rounded-full bg-zinc-800 overflow-hidden flex">
            <div className="h-full bg-amber-500 transition-all duration-700" style={{ width: `${convRate}%` }} />
            <div className="h-full bg-sky-700 transition-all duration-700" style={{ width: `${100 - convRate}%` }} />
          </div>
          <span className="text-sm font-black text-white whitespace-nowrap">{convRate}% PRO</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /><span className="text-xs text-zinc-400 font-semibold">PRO ({proCount})</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-sky-700" /><span className="text-xs text-zinc-400 font-semibold">FREE ({freeCount})</span></div>
        </div>
      </div>

      {/* PRO user list */}
      {proUsers.length > 0 && (
        <div className="glass rounded-2xl border border-amber-500/20 p-5">
          <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2"><Crown className="w-4 h-4 text-amber-400" /> PRO Subscribers</h3>
          <div className="space-y-2.5">
            {proUsers.map(u => (
              <div key={u.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  {u.photo ? <img src={u.photo} alt="" className="w-8 h-8 rounded-lg object-cover" /> : <Crown className="w-4 h-4 text-amber-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{u.name}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{u.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-amber-400">₹499/mo</p>
                  <p className="text-[10px] text-zinc-600">{u.proMethod || 'mock'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   WORKOUT ANALYTICS TAB
══════════════════════════════════════════════════════════════════ */
const WorkoutsTab = ({ users }) => {
  const regular = users.filter(u => u.role !== 'ADMIN');
  const exerciseStats = buildExerciseStats(regular);
  const maxEx = exerciseStats[0]?.count || 1;

  const totalWorkouts = regular.reduce((s, u) => s + u.workoutCount, 0);
  const totalReps = regular.reduce((s, u) => s + u.totalReps, 0);
  const totalCals = regular.reduce((s, u) => s + u.totalCalories, 0);
  const avgPerUser = regular.length > 0 ? (totalWorkouts / regular.length).toFixed(1) : 0;

  const COLORS = [
    'bg-brand-orange', 'bg-amber-500', 'bg-red-500',
    'bg-purple-500', 'bg-sky-500', 'bg-green-500',
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-white mb-1">Workout Analytics</h2>
        <p className="text-sm text-zinc-500">Exercise trends and session statistics.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Dumbbell} label="Total Sessions" value={totalWorkouts} color="text-brand-orange" />
        <StatCard icon={Activity} label="Avg Sessions/User" value={avgPerUser} color="text-sky-400" bg="bg-sky-500/10" border="border-sky-500/20" />
        <StatCard icon={Zap} label="Total Reps" value={totalReps.toLocaleString()} color="text-green-400" bg="bg-green-500/10" border="border-green-500/20" />
        <StatCard icon={Flame} label="Calories Burned" value={`${totalCals.toLocaleString()} kcal`} color="text-red-400" bg="bg-red-500/10" border="border-red-500/20" />
      </div>

      <div className="glass rounded-2xl border border-zinc-800/60 p-6">
        <h3 className="text-sm font-black text-white mb-5">Most Popular Exercises</h3>
        {exerciseStats.length === 0
          ? <p className="text-sm text-zinc-600">No workout data yet.</p>
          : (
            <div className="space-y-4">
              {exerciseStats.map(({ name, count }, i) => (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${COLORS[i % COLORS.length]}`} />
                      <span className="text-sm font-semibold text-zinc-300">{name}</span>
                    </div>
                    <span className="text-sm font-black text-white">{count} sessions</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div className={`h-full rounded-full ${COLORS[i % COLORS.length]} transition-all duration-700`}
                      style={{ width: `${Math.round((count / maxEx) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>

      {/* Top performers */}
      <div className="glass rounded-2xl border border-zinc-800/60 p-5">
        <h3 className="text-sm font-black text-white mb-4">Top Performers (by reps)</h3>
        <div className="space-y-3">
          {[...regular].sort((a, b) => b.totalReps - a.totalReps).slice(0, 5).map((u, i) => (
            <div key={u.id} className="flex items-center gap-3">
              <span className={`text-sm font-black w-5 ${i === 0 ? 'text-amber-400' : 'text-zinc-600'}`}>#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{u.name}</p>
              </div>
              <span className="text-sm font-black text-brand-orange">{u.totalReps.toLocaleString()} reps</span>
            </div>
          ))}
          {regular.length === 0 && <p className="text-xs text-zinc-600">No workout data yet.</p>}
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   SOCIAL ANALYTICS TAB
══════════════════════════════════════════════════════════════════ */
const SocialTab = ({ users, analytics }) => {
  const regular = users.filter(u => u.role !== 'ADMIN');
  const totalPoints = regular.reduce((s, u) => s + u.points, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-white mb-1">Social Analytics</h2>
        <p className="text-sm text-zinc-500">Community engagement and activity metrics — live from event log.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={MessageSquare} label="Posts Created" value={analytics.postsCreated} color="text-sky-400" bg="bg-sky-500/10" border="border-sky-500/20" sub="Via PostCreator" />
        <StatCard icon={Heart} label="Post Likes" value={analytics.postsLiked} color="text-red-400" bg="bg-red-500/10" border="border-red-500/20" sub="Toggled likes" />
        <StatCard icon={Users} label="Friends Added" value={analytics.friendsAdded} color="text-green-400" bg="bg-green-500/10" border="border-green-500/20" sub="Bidirectional connections" />
        <StatCard icon={Sword} label="Challenges Joined" value={analytics.challengesJoined} color="text-purple-400" bg="bg-purple-500/10" border="border-purple-500/20" sub="Accepted in Messages" />
        <StatCard icon={CheckCircle} label="Challenges Done" value={analytics.challengesCompleted} color="text-amber-400" bg="bg-amber-500/10" border="border-amber-500/20" sub="Beaten in Workout" />
        <StatCard icon={Star} label="Total Points" value={totalPoints.toLocaleString()} color="text-brand-orange" sub="Across all users" />
      </div>

      <div className="glass rounded-2xl border border-zinc-800/60 p-6">
        {/* Most active users by points */}
        <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3">Most Active by Points</h4>
        <div className="space-y-2.5">
          {[...regular].sort((a, b) => b.points - a.points).slice(0, 5).map((u, i) => (
            <div key={u.id} className="flex items-center gap-3">
              <span className={`text-xs font-black w-5 ${i === 0 ? 'text-amber-400' : 'text-zinc-600'}`}>#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{u.name}</p>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-400" />
                <span className="text-xs font-black text-amber-400">{u.points.toLocaleString()}</span>
              </div>
            </div>
          ))}
          {regular.length === 0 && <p className="text-xs text-zinc-600">No data yet.</p>}
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   FEATURE USAGE TAB
══════════════════════════════════════════════════════════════════ */
const FeaturesTab = ({ users, analytics }) => {
  const regular = users.filter(u => u.role !== 'ADMIN');
  const proCount = regular.filter(u => u.isPro).length;
  const totalGoals = analytics.goalsCreated;
  const completedGoals = analytics.goalsCompleted;
  const goalCompRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  const features = [
    { label: 'AI Workout Tracker (Camera)', count: analytics.workoutsStarted, icon: Activity, color: 'bg-brand-orange', unit: 'sessions started' },
    { label: 'Nutrition Planner (PRO)', count: analytics.nutritionPlans, icon: Utensils, color: 'bg-amber-500', unit: 'plans generated' },
    { label: 'Goal Tracker', count: analytics.goalsCreated, icon: Target, color: 'bg-purple-500', unit: 'goals created' },
    { label: 'Social / Posts', count: analytics.postsCreated, icon: MessageSquare, color: 'bg-sky-500', unit: 'posts shared' },
    { label: 'PRO Upgrade Attempts', count: analytics.proPurchaseAttempts, icon: Crown, color: 'bg-yellow-500', unit: 'upgrade clicks' },
    { label: 'Challenge Participation', count: analytics.challengesJoined, icon: Zap, color: 'bg-red-500', unit: 'challenges joined' },
  ];
  const maxCount = Math.max(...features.map(f => f.count), 1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-white mb-1">Feature Usage</h2>
        <p className="text-sm text-zinc-500">Which features your users are actually using — live from event log.</p>
      </div>

      <div className="glass rounded-2xl border border-zinc-800/60 p-6 space-y-5">
        {features.map(({ label, count, color, icon: Icon, unit }) => {
          const pct = Math.round((count / maxCount) * 100);
          return (
            <div key={label}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm font-semibold text-zinc-300">{label}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-white">{count}</span>
                  <span className="text-xs text-zinc-500 ml-1">{unit}</span>
                </div>
              </div>
              <div className="h-2.5 rounded-full bg-zinc-800 overflow-hidden">
                <div className={`h-full rounded-full ${color} transition-all duration-700`}
                  style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass rounded-2xl border border-purple-500/20 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Target className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="text-sm font-black text-white">Goal Completion</h3>
          </div>
          <p className="text-3xl font-black text-white mb-1">{goalCompRate}<span className="text-lg text-zinc-500">%</span></p>
          <p className="text-xs text-zinc-500 mb-3">{completedGoals} of {totalGoals} goals completed</p>
          <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
            <div className="h-full rounded-full bg-purple-500" style={{ width: `${goalCompRate}%` }} />
          </div>
        </div>

        <div className="glass rounded-2xl border border-amber-500/20 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Crown className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="text-sm font-black text-white">PRO Feature Adoption</h3>
          </div>
          <p className="text-3xl font-black text-white mb-1">{regular.length > 0 ? Math.round((proCount / regular.length) * 100) : 0}<span className="text-lg text-zinc-500">%</span></p>
          <p className="text-xs text-zinc-500 mb-3">{proCount} users on PRO plan · {analytics.proPurchases} purchases via event log</p>
          <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
            <div className="h-full rounded-full bg-amber-500"
              style={{ width: `${regular.length > 0 ? Math.round((proCount / regular.length) * 100) : 0}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   ROOT COMPONENT
══════════════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(() => buildAnalyticsStats());
  const [loading, setLoading] = useState(true);
  const [mobileTab, setMobileTab] = useState(false);

  const refresh = () => {
    setLoading(true);
    setTimeout(() => {
      setUsers(buildStats());
      setAnalytics(buildAnalyticsStats());
      setLoading(false);
    }, 200);
  };

  useEffect(() => {
    refresh();
    // Live-refresh whenever any analytics event fires
    const onEvent = () => {
      setUsers(buildStats());
      setAnalytics(buildAnalyticsStats());
    };
    window.addEventListener('fittrack_analytics_event', onEvent);
    return () => window.removeEventListener('fittrack_analytics_event', onEvent);
  }, []);

  const ActiveTab = useMemo(() => ({
    overview: OverviewTab,
    users: UsersTab,
    subscriptions: SubscriptionsTab,
    workouts: WorkoutsTab,
    social: SocialTab,
    features: FeaturesTab,
  })[tab] || OverviewTab, [tab]);

  return (
    <div className="min-h-screen bg-brand-dark text-zinc-100 font-sans">
      <AdminNavbar />

      <div className="flex">
        <Sidebar active={tab} onSelect={(t) => { setTab(t); setMobileTab(false); }} />

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Mobile tab selector */}
          <div className="lg:hidden p-4 border-b border-zinc-800/60 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 min-w-max">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setTab(id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${tab === id ? 'bg-brand-orange text-white' : 'bg-zinc-900 text-zinc-400 border border-zinc-800/60'
                    }`}>
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* Header row */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Admin Dashboard</p>
                <h1 className="text-2xl font-black text-white">{TABS.find(t => t.id === tab)?.label}</h1>
              </div>
              <button onClick={refresh}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800/60 text-sm font-semibold text-zinc-400 hover:text-white transition-all">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {loading
              ? (
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="glass rounded-2xl border border-zinc-800/60 p-5 h-28 animate-pulse" />
                  ))}
                </div>
              )
              : <ActiveTab users={users} analytics={analytics} />
            }
          </div>
        </main>
      </div>
    </div>
  );
}
