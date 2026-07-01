import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Flame, Layers, User, TrendingUp, Users, Crown } from 'lucide-react';
import { getCurrentUser } from '../utils/auth';
import { getLeaderboardData, getFriendsLeaderboard } from '../utils/supabaseBridge';
import { supabase } from '../utils/supabaseClient';
import SkeletonLoader from '../components/SkeletonLoader';

const METRICS = [
  { id: 'points',   label: 'Points',   icon: Trophy, color: 'text-amber-400' },
  { id: 'calories', label: 'Calories', icon: Flame,  color: 'text-red-400'   },
  { id: 'workouts', label: 'Workouts', icon: Layers, color: 'text-accent-blue'},
  { id: 'streak',   label: 'Streak',   icon: Flame,  color: 'text-orange-400' },
];
const PERIODS = ['global', 'friends', 'weekly', 'monthly'];

const metricVal = (u, m) => {
  if (m === 'points')   return `${(u.reward_points||0).toLocaleString()} pts`;
  if (m === 'calories') return `${(u.calories_burned||0).toLocaleString()} kcal`;
  if (m === 'workouts') return u.total_workouts || 0;
  if (m === 'streak')   return `${u.current_streak||0}d`;
  return '—';
};

const MEDALS = ['🥇','🥈','🥉'];

const PodiumCard = ({ user, rank, metric, isMe, onClick }) => (
  <div onClick={onClick} className={`glass rounded-3xl p-5 text-center cursor-pointer border transition-all hover:-translate-y-1 ${isMe ? 'border-brand-orange/40 bg-brand-orange/5 shadow-glow-orange-sm' : 'border-zinc-800/40 hover:border-brand-orange/20'}`}>
    <div className="text-3xl mb-3">{MEDALS[rank-1]}</div>
    <div className="w-14 h-14 rounded-2xl overflow-hidden mx-auto border-2 border-zinc-700 mb-3">
      {user.photo ? <img src={user.photo} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><User className="w-7 h-7 text-zinc-600"/></div>}
    </div>
    <p className={`text-sm font-black truncate ${isMe ? 'text-brand-orange' : 'text-white'}`}>{user.display_name}{isMe && ' (You)'}</p>
    <p className="text-[10px] text-zinc-500 font-semibold mb-2">@{user.username}</p>
    <p className="text-lg font-black text-brand-orange">{metricVal(user, metric)}</p>
  </div>
);

export default function Leaderboard() {
  const navigate    = useNavigate();
  const currentUser = getCurrentUser();
  const [metric,   setMetric]   = useState('points');
  const [period,   setPeriod]   = useState('global');
  const [rankings, setRankings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [myRank,   setMyRank]   = useState(null);

  const load = async () => {
    setLoading(true);
    const data = period === 'friends' && currentUser
      ? await getFriendsLeaderboard(currentUser.id, metric)
      : await getLeaderboardData(metric, period);
    setRankings(data);
    if (currentUser) { const r = data.findIndex(u => u.id === currentUser.id); setMyRank(r >= 0 ? r+1 : null); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [metric, period]);
  useEffect(() => {
    const ch = supabase.channel('lb_rt').on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles'},() => load()).subscribe();
    return () => supabase.removeChannel(ch);
  }, [metric, period]);

  const top3 = rankings.slice(0, 3);
  const rest = rankings.slice(3);

  return (
    <div className="page pb-24 md:pb-8">
      <div className="content-width space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="section-title">Global <span className="text-gradient">Rankings</span></h1>
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mt-1">Real-time athlete leaderboard</p>
          </div>
          {myRank && (
            <div className="flex items-center gap-2 px-4 py-2.5 glass rounded-xl border border-brand-orange/20 self-start sm:self-auto">
              <TrendingUp className="w-4 h-4 text-brand-orange"/>
              <span className="text-sm font-black text-white">Your rank: <span className="text-brand-orange">#{myRank}</span></span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 overflow-x-auto scrollbar-hide w-fit">
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5 transition-all ${period===p ? 'bg-brand-orange text-white shadow' : 'text-zinc-400 hover:text-white'}`}>
              {p === 'friends' && <Users className="w-3.5 h-3.5"/>}{p}
            </button>
          ))}
        </div>

        {/* Metric filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
          {METRICS.map(m => {
            const Icon = m.icon;
            return (
              <button key={m.id} onClick={() => setMetric(m.id)}
                className={`glass rounded-xl p-3 flex items-center justify-center gap-2 border transition-all text-xs font-bold uppercase tracking-wider ${metric===m.id ? 'border-brand-orange/40 text-brand-orange bg-brand-orange/10' : 'border-zinc-800/40 text-zinc-400 hover:text-white'}`}>
                <Icon className={`w-4 h-4 ${m.color}`}/>{m.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="glass rounded-3xl p-4 border border-zinc-800/40">
            <table className="w-full"><tbody><SkeletonLoader type="leaderboardRow" count={8}/></tbody></table>
          </div>
        ) : rankings.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center border border-zinc-800/40">
            <p className="text-5xl mb-3">🏆</p>
            <p className="text-white font-bold mb-1">{period==='friends' ? 'No friends added yet' : 'No data for this period'}</p>
            <p className="text-zinc-500 text-xs">{period==='friends' ? 'Add friends on the Search page to compare rankings.' : 'Complete workouts to appear on the leaderboard.'}</p>
          </div>
        ) : (
          <>
            {/* Podium top 3 */}
            {top3.length >= 3 && (
              <div className="grid grid-cols-3 gap-3 md:gap-4">
                {top3.map((u, i) => (
                  <PodiumCard key={u.id} user={u} rank={i+1} metric={metric} isMe={u.id===currentUser?.id} onClick={() => navigate(`/user/${u.id}`)}/>
                ))}
              </div>
            )}

            {/* Rest of leaderboard */}
            <div className="glass rounded-3xl overflow-hidden border border-zinc-800/40">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-zinc-800/60 bg-zinc-900/40">
                      <th className="py-3.5 px-5 text-[9px] font-black text-zinc-600 uppercase tracking-widest w-14 text-center">Rank</th>
                      <th className="py-3.5 px-4 text-[9px] font-black text-zinc-600 uppercase tracking-widest">Athlete</th>
                      <th className="py-3.5 px-4 text-[9px] font-black text-zinc-600 uppercase tracking-widest text-center hidden sm:table-cell">Streak</th>
                      <th className="py-3.5 px-4 text-[9px] font-black text-zinc-600 uppercase tracking-widest text-center hidden md:table-cell">Workouts</th>
                      <th className="py-3.5 px-5 text-[9px] font-black text-zinc-600 uppercase tracking-widest text-right">{METRICS.find(m=>m.id===metric)?.label}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/30">
                    {(top3.length >= 3 ? rest : rankings).map((u, idx) => {
                      const rank = (top3.length >= 3 ? idx + 4 : idx + 1);
                      const isMe = u.id === currentUser?.id;
                      return (
                        <tr key={u.id} onClick={() => navigate(`/user/${u.id}`)}
                          className={`cursor-pointer transition-colors text-xs ${isMe ? 'bg-brand-orange/8 hover:bg-brand-orange/12' : 'hover:bg-zinc-800/20'}`}>
                          <td className="py-3.5 px-5 text-center">
                            {rank <= 3 ? <span className="text-base">{MEDALS[rank-1]}</span> : <span className="text-zinc-500 font-bold">#{rank}</span>}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl overflow-hidden border shrink-0 ${isMe ? 'border-brand-orange/30':'border-zinc-800'}`}>
                                {u.photo ? <img src={u.photo} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><User className="w-4 h-4 text-zinc-600"/></div>}
                              </div>
                              <div>
                                <p className={`text-sm font-bold ${isMe ? 'text-brand-orange':'text-white'}`}>{u.display_name}{isMe && ' (You)'}</p>
                                <p className="text-[10px] text-zinc-600">@{u.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center hidden sm:table-cell">
                            {u.current_streak > 0 ? <span className="inline-flex items-center gap-0.5 text-red-400 font-bold"><Flame className="w-3 h-3 fill-red-400"/>{u.current_streak}</span> : <span className="text-zinc-700">—</span>}
                          </td>
                          <td className="py-3.5 px-4 text-center text-accent-blue font-bold hidden md:table-cell">{u.total_workouts||0}</td>
                          <td className="py-3.5 px-5 text-right text-brand-orange font-black">{metricVal(u, metric)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
