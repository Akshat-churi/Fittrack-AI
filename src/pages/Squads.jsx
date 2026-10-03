import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, Users, Trophy, Target, Zap, Crown, Lock, CreditCard,
  Smartphone, CheckCircle, Plus, X, Copy, ChevronLeft, ChevronRight,
  Flame, Activity, Star, Swords, BarChart2, User as UserIcon,
  LogIn, Award, RefreshCw, Loader2, ArrowUp, Hash, Calendar,
  Search, Send, Bell, Check, UserPlus, Mail,
} from 'lucide-react';
import { isProUser, grantProAccess } from '../utils/proAccess';
import { getCurrentUser, getAllUsers } from '../utils/auth';
import {
  createSquad, joinSquadByCode, leaveSquad, addSquadGoal,
  addSquadChallenge, getUserSquads, getAllSquads, getSquadById,
  getSquadStats, addMemberDirectly, refreshSquadsFromSupabase,
} from '../utils/squadStorage';
import { getFriendsList } from '../utils/userDataManager';
import {
  searchUsers as searchSupabaseUsers,
  fetchTrendingAthletes,
  sendSquadInvite,
  fetchSquadInvitations,
  respondSquadInvitation,
  getPendingInvitesForSquad,
} from '../utils/supabaseBridge';
import { isSupabaseConfigured } from '../utils/supabaseClient';
import { supabase } from '../utils/supabaseClient';
import { logEvent } from '../utils/analytics';

/* ══════════════════════════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════════════════════════ */

const SQUAD_EMOJIS = [
  '💪','🔥','⚡','🏆','🥊','🎯','🦁','🐯','🦊','🚀',
  '⚔️','🛡️','💎','🌟','🏋️','🤸','🏃','🥋','🏅','🔱',
];

const EXERCISES = ['Push-ups','Squats','Plank','Lunges','Burpees','Pull-ups','Sit-ups'];
const METRICS   = ['Total Reps','Total Workouts','Consistency Streak'];
const DURATIONS = ['3 days','7 days','14 days','30 days'];

/* ══════════════════════════════════════════════════════════════════════════════
   SMALL REUSABLE PIECES
══════════════════════════════════════════════════════════════════════════════ */

const RankBadge = ({ rank }) => {
  const map = { 1: '🥇', 2: '🥈', 3: '🥉' };
  if (map[rank]) return <span className="text-xl">{map[rank]}</span>;
  return <span className="text-xs font-black text-zinc-500 w-6 text-center">#{rank}</span>;
};

const StatPill = ({ icon: Icon, value, label, color = 'text-brand-orange' }) => (
  <div className="flex flex-col items-center gap-0.5">
    <Icon className={`w-3.5 h-3.5 ${color}`} />
    <p className={`text-sm font-black ${color}`}>{value}</p>
    <p className="text-[9px] text-zinc-600 font-semibold uppercase tracking-wider">{label}</p>
  </div>
);

const ProgressBar = ({ pct, color = 'bg-brand-orange' }) => (
  <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
    <div
      className={`h-full rounded-full ${color} transition-all duration-700`}
      style={{ width: `${Math.min(100, pct)}%` }}
    />
  </div>
);

const CopyChip = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-brand-orange/40 transition-all group"
    >
      <span className="font-mono text-xs font-black text-brand-orange tracking-widest">{text}</span>
      {copied
        ? <CheckCircle className="w-3 h-3 text-green-400" />
        : <Copy className="w-3 h-3 text-zinc-500 group-hover:text-brand-orange transition-colors" />}
    </button>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   PAYWALL
══════════════════════════════════════════════════════════════════════════════ */

function SquadPaywall({ onUpgrade }) {
  const BENEFITS = [
    { icon: Shield,    text: 'Create your own fitness squad (up to 20 members)' },
    { icon: Swords,    text: 'Team vs Team workout challenges' },
    { icon: Target,    text: 'Shared squad goals with live progress tracking' },
    { icon: Trophy,    text: 'Squad leaderboard & global rankings' },
    { icon: BarChart2, text: 'Weekly performance stats for your whole team' },
    { icon: Crown,     text: 'All existing PRO features (Nutrition, Analytics)' },
  ];
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-2xl shadow-orange-500/40 mb-5">
            <Shield className="w-10 h-10 text-white" />
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center shadow-lg">
              <Lock className="w-3 h-3 text-amber-900" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Unlock Squad Fitness Mode</h1>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-sm mx-auto">
            Transform your solo workouts into team battles. Compete, motivate, and win together.
          </p>
        </div>
        <div className="glass rounded-2xl border border-orange-500/20 p-5 mb-5 space-y-3.5">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5 text-brand-orange" />
              </div>
              <p className="text-sm text-zinc-300 font-medium">{text}</p>
            </div>
          ))}
        </div>
        <div className="glass rounded-2xl border border-amber-500/20 p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 font-semibold">PRO MONTHLY</p>
            <p className="text-2xl font-black text-white">₹499 <span className="text-sm text-zinc-500 font-normal">/month</span></p>
          </div>
          <div className="flex gap-1.5">
            <span className="px-2 py-0.5 rounded-lg bg-green-500/10 border border-green-500/20 text-[10px] font-black text-green-400 uppercase">All Features</span>
            <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] font-black text-amber-400 uppercase">No Real Charge</span>
          </div>
        </div>
        <button
          onClick={onUpgrade}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-black text-base shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          ⚡ Upgrade to PRO — Unlock Squads
        </button>
        <p className="text-center text-[10px] text-zinc-600 mt-3">
          Demo only · No real payment processed · For showcase purposes
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MOCK PAYMENT
══════════════════════════════════════════════════════════════════════════════ */

function MockPayment({ onSuccess, onBack }) {
  const [tab,     setTab]     = useState('upi');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [card,    setCard]    = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [upiDone, setUpiDone] = useState(false);

  const handlePay = useCallback((method) => {
    setLoading(true);
    setTimeout(() => { setLoading(false); setSuccess(true); }, 2200);
    setTimeout(() => onSuccess(method), 3800);
  }, [onSuccess]);

  if (success) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-5 max-w-xs">
        <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500 flex items-center justify-center mx-auto animate-bounce">
          <CheckCircle className="w-10 h-10 text-green-400" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white">Payment Successful!</h2>
          <p className="text-zinc-400 text-sm mt-1">PRO activated. Unlocking Squad Mode…</p>
        </div>
        <div className="flex gap-1 justify-center">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-brand-orange animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );

  const formatCard = (v) => v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();
  const formatExp  = (v) => { const d=v.replace(/\D/g,'').slice(0,4); return d.length>2?`${d.slice(0,2)}/${d.slice(2)}`:d; };
  const cardValid  = card.number.replace(/\s/g,'').length === 16 && card.expiry.length === 5 && card.cvv.length >= 3 && card.name.trim().length >= 2;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-semibold mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to upgrade
        </button>
        <div className="glass rounded-2xl border border-zinc-800/60 overflow-hidden">
          <div className="flex border-b border-zinc-800/60">
            {[['upi', <Smartphone className="w-4 h-4"/>, 'UPI (Demo)'], ['card', <CreditCard className="w-4 h-4"/>, 'Debit Card']].map(([id, ic, label]) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold transition-all ${tab===id ? 'text-brand-orange border-b-2 border-brand-orange bg-brand-orange/5' : 'text-zinc-500 hover:text-zinc-300'}`}>
                {ic}{label}
              </button>
            ))}
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800/60">
              <div><p className="text-xs text-zinc-500 font-semibold">Amount Due</p><p className="text-2xl font-black text-white">₹499</p></div>
              <span className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-black text-amber-400 uppercase">Demo Only</span>
            </div>
            {tab === 'upi' ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="relative p-3 bg-white rounded-2xl shadow-xl">
                    <svg width="160" height="160" viewBox="0 0 7 7" style={{ imageRendering: 'pixelated' }}>
                      {[[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[1,0],[1,6],[2,0],[2,2],[2,3],[2,4],[2,6],[3,0],[3,2],[3,4],[3,6],[4,0],[4,2],[4,3],[4,4],[4,6],[5,0],[5,6],[6,0],[6,1],[6,2],[6,3],[6,4],[6,5],[6,6],[1,2],[1,3],[1,4],[2,2],[4,2],[3,3]].map(([r,c]) => (
                        <rect key={`${r}${c}`} x={c} y={r} width="1" height="1" fill="#111" />
                      ))}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-white rounded-lg px-2 py-0.5 shadow"><span className="text-[9px] font-black text-orange-500">FitTrack</span></div>
                    </div>
                  </div>
                  <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">⚠ Demo Only – Not a Real QR</p>
                  <p className="text-xs text-zinc-500 text-center">Scan with any UPI app, then confirm below</p>
                  <p className="text-sm font-mono font-bold text-zinc-400">fittrack@upi</p>
                </div>
                {!upiDone
                  ? <button onClick={() => setUpiDone(true)} className="w-full py-3.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm font-bold text-zinc-300 hover:text-white hover:border-green-500/50 transition-all">✅ I've completed the payment</button>
                  : <button onClick={() => handlePay('upi')} disabled={loading} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-sm shadow-lg shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60">
                      {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/>Verifying…</span> : 'Confirm & Activate PRO'}
                    </button>}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1.5">Card Number</label>
                  <input value={card.number} onChange={e => setCard(p => ({ ...p, number: formatCard(e.target.value) }))} placeholder="0000 0000 0000 0000"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white font-mono text-sm focus:border-brand-orange/50 transition-colors placeholder:text-zinc-600"/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1.5">Expiry</label>
                    <input value={card.expiry} onChange={e => setCard(p => ({ ...p, expiry: formatExp(e.target.value) }))} placeholder="MM/YY"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white font-mono text-sm focus:border-brand-orange/50 placeholder:text-zinc-600"/>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1.5">CVV</label>
                    <input value={card.cvv} onChange={e => setCard(p => ({ ...p, cvv: e.target.value.replace(/\D/g,'').slice(0,4) }))} placeholder="•••" type="password"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white font-mono text-sm focus:border-brand-orange/50 placeholder:text-zinc-600"/>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1.5">Cardholder Name</label>
                  <input value={card.name} onChange={e => setCard(p => ({ ...p, name: e.target.value }))} placeholder="Name on card"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-orange/50 placeholder:text-zinc-600"/>
                </div>
                <button onClick={() => handlePay('card')} disabled={!cardValid || loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-black text-sm shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100">
                  {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/>Processing…</span> : '💳 Pay ₹499 & Activate PRO'}
                </button>
              </div>
            )}
          </div>
        </div>
        <p className="text-center text-[10px] text-zinc-700 mt-3">🔒 Demo only · No real transaction · Showcase purposes</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   INVITE MEMBERS MODAL — full Supabase user search + proper invite system
══════════════════════════════════════════════════════════════════════════════ */

function InviteModal({ squad, currentUserId, onClose }) {
  const [query,        setQuery]        = useState('');
  const [results,      setResults]      = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [pending,      setPending]      = useState(new Set()); // pending invite receiver IDs
  const [sentNow,      setSentNow]      = useState(new Set()); // just invited this session
  const [addedNow,     setAddedNow]     = useState(new Set()); // just added directly
  const [toast,        setToast]        = useState('');
  const debounceRef = useRef(null);
  const useSupabase = isSupabaseConfigured();

  // Load initial results and pending invites
  useEffect(() => {
    loadInitial();
  }, []);

  const loadInitial = async () => {
    setLoading(true);
    try {
      if (useSupabase) {
        // Load trending athletes as initial list
        const users = await fetchTrendingAthletes(20);
        const ids = users.map(u => u.id);
        const alreadyPending = await getPendingInvitesForSquad(squad.id, ids);
        setPending(alreadyPending);
        setResults(users.filter(u => u.id !== currentUserId));
      } else {
        // Fallback to local users
        const localUsers = getAllUsers().filter(u => u.id !== currentUserId && u.role !== 'ADMIN');
        setResults(localUsers);
      }
    } catch (err) {
      console.error('[InviteModal] loadInitial', err);
    }
    setLoading(false);
  };

  const handleSearch = (q) => {
    setQuery(q);
    clearTimeout(debounceRef.current);
    if (!q.trim()) { loadInitial(); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        if (useSupabase) {
          const users = await searchSupabaseUsers(q.trim());
          const ids = users.map(u => u.id);
          const alreadyPending = await getPendingInvitesForSquad(squad.id, ids);
          setPending(alreadyPending);
          setResults(users.filter(u => u.id !== currentUserId));
        } else {
          const q2 = q.toLowerCase();
          const local = getAllUsers().filter(u =>
            u.id !== currentUserId &&
            u.role !== 'ADMIN' &&
            ((u.name||'').toLowerCase().includes(q2) || (u.email||'').toLowerCase().includes(q2))
          );
          setResults(local);
        }
      } catch (err) {
        console.error('[InviteModal] search', err);
      }
      setLoading(false);
    }, 350);
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  // Invite via Supabase notification
  const handleInvite = async (user) => {
    const userId = user.id;
    if (sentNow.has(userId) || pending.has(userId)) return;

    try {
      if (useSupabase) {
        const ok = await sendSquadInvite({
          squadId:    squad.id,
          squadName:  squad.name,
          squadEmoji: squad.emoji,
          senderId:   currentUserId,
          receiverId: userId,
        });
        if (ok) {
          setSentNow(prev => new Set([...prev, userId]));
          showToast(`📩 Invite sent to ${user.display_name || user.name}!`);
          logEvent('squad_invite_sent', { squadId: squad.id, receiverId: userId });
        } else {
          showToast('⚠️ Already invited or an error occurred.');
        }
      } else {
        // Supabase not configured — fall back to direct add
        const res = await addMemberDirectly(squad.id, userId, user.name || user.display_name);
        if (res.success) {
          setAddedNow(prev => new Set([...prev, userId]));
          showToast(`✅ ${user.name || user.display_name} added to squad!`);
        } else {
          showToast(`❌ ${res.error}`);
        }
      }
    } catch (err) {
      console.error('[InviteModal] handleInvite', err);
      showToast('❌ Failed to send invite.');
    }
  };

  // Quick direct-add (always available for local users)
  const handleDirectAdd = async (user) => {
    const res = await addMemberDirectly(squad.id, user.id, user.name || user.display_name || 'Athlete');
    if (res.success) {
      setAddedNow(prev => new Set([...prev, user.id]));
      showToast(`✅ ${user.name || user.display_name} added directly!`);
      logEvent('squad_member_added_direct', { squadId: squad.id, addedUserId: user.id });
    } else {
      showToast(`❌ ${res.error}`);
    }
  };

  const getButtonState = (user) => {
    const uid = user.id;
    const isAlreadyMember = squad.members.some(m => m.userId === uid);
    if (uid === currentUserId)  return { label: 'You',        disabled: true,  color: 'bg-zinc-700 text-zinc-500' };
    if (isAlreadyMember)        return { label: 'In Squad ✓', disabled: true,  color: 'bg-zinc-700 text-zinc-500' };
    if (addedNow.has(uid))      return { label: 'Added ✓',    disabled: true,  color: 'bg-green-600/80 text-white' };
    if (sentNow.has(uid))       return { label: 'Invited ✓',  disabled: true,  color: 'bg-sky-600/80 text-white' };
    if (pending.has(uid))       return { label: 'Pending…',   disabled: true,  color: 'bg-zinc-700 text-zinc-400' };
    return null; // render normal buttons
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-2xl bg-zinc-900 border border-zinc-700 text-sm font-bold text-white shadow-2xl animate-slide-down whitespace-nowrap">
          {toast}
        </div>
      )}

      <div className="glass rounded-2xl border border-orange-500/20 w-full max-w-md max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60 shrink-0">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-brand-orange" />
            <h3 className="font-black text-white">Invite Members</h3>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-zinc-500 hover:text-white transition-colors"/></button>
        </div>

        {/* Squad code share strip */}
        <div className="px-5 py-3 bg-zinc-900/60 border-b border-zinc-800/60 shrink-0">
          <p className="text-[10px] text-zinc-500 font-semibold mb-1.5">Share this code so teammates can join directly:</p>
          <div className="flex items-center gap-3">
            <CopyChip text={squad.code} />
            <p className="text-[10px] text-zinc-600">or invite users below ↓</p>
          </div>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-zinc-800/60 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              value={query}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search by name or username…"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-brand-orange/50 transition-colors"
            />
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2 scrollbar-thin min-h-0">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-brand-orange" /></div>
          ) : results.length === 0 ? (
            <div className="text-center py-10">
              <Users className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">No users found{query ? ` for "${query}"` : ''}.</p>
            </div>
          ) : results.map(user => {
            const uid         = user.id;
            const displayName = user.display_name || user.name || 'Athlete';
            const username    = user.username ? `@${user.username}` : user.email || '';
            const btnState    = getButtonState(user);

            return (
              <div key={uid} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/40 hover:border-zinc-700 transition-all">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center shrink-0">
                  {(user.photo || user.photo_url)
                    ? <img src={user.photo || user.photo_url} alt="" className="w-full h-full object-cover" />
                    : <UserIcon className="w-5 h-5 text-zinc-500" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-bold text-white truncate">{displayName}</p>
                    {user.current_streak > 0 && (
                      <span className="flex items-center gap-0.5 text-[9px] font-black text-amber-400">
                        <Flame className="w-2.5 h-2.5" />{user.current_streak}d
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500 truncate">{username}</p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {btnState ? (
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${btnState.color}`}>{btnState.label}</span>
                  ) : (
                    <>
                      {useSupabase && (
                        <button
                          onClick={() => handleInvite(user)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand-orange hover:bg-orange-600 text-white text-[10px] font-black uppercase transition-all active:scale-95"
                          title="Send invite notification"
                        >
                          <Send className="w-3 h-3" /> Invite
                        </button>
                      )}
                      <button
                        onClick={() => handleDirectAdd(user)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-[10px] font-black uppercase transition-all active:scale-95"
                        title="Add directly to squad"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800/60 shrink-0">
          {useSupabase
            ? <p className="text-[10px] text-zinc-600 text-center">
                <Send className="w-2.5 h-2.5 inline mr-1"/>Invite sends an in-app notification · 
                <Plus className="w-2.5 h-2.5 inline mx-1"/>Add directly adds them instantly
              </p>
            : <p className="text-[10px] text-zinc-600 text-center">Showing local accounts only · Configure Supabase for full invite system</p>
          }
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   PENDING INVITES PANEL (shown in My Squads when you have open invites)
══════════════════════════════════════════════════════════════════════════════ */

function PendingInvitesBanner({ userId, onAccepted }) {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(new Set()); // ids being processed

  useEffect(() => {
    load();
    if (!isSupabaseConfigured()) return;
    // Real-time: new invite notification comes in → re-fetch
    const ch = supabase
      .channel(`squad_invites_${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'squad_invitations',
        filter: `receiver_id=eq.${userId}`,
      }, () => load())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [userId]);

  const load = async () => {
    if (!isSupabaseConfigured()) return;
    setLoading(true);
    const data = await fetchSquadInvitations(userId);
    setInvites(data.filter(i => i.status === 'pending'));
    setLoading(false);
  };

  const handleRespond = async (invite, accept) => {
    if (working.has(invite.id)) return;
    setWorking(prev => new Set([...prev, invite.id]));

    const status = accept ? 'accepted' : 'declined';
    const ok = await respondSquadInvitation(invite.id, status);

    if (ok && accept) {
      const currentUser = getCurrentUser();
      const result = await joinSquadByCode(invite.squad_id, userId, currentUser?.name || 'Athlete');
      if (result.success) {
        onAccepted(result.squad.id);
      }
    }

    setInvites(prev => prev.filter(i => i.id !== invite.id));
    setWorking(prev => { const s = new Set(prev); s.delete(invite.id); return s; });
  };

  if (!isSupabaseConfigured() || (!loading && invites.length === 0)) return null;

  return (
    <div className="glass rounded-2xl border border-sky-500/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-sky-400" />
        <h3 className="text-sm font-black text-white">Squad Invitations</h3>
        {invites.length > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 text-[10px] font-black">{invites.length}</span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-sky-400" /></div>
      ) : invites.map(invite => (
        <div key={invite.id} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/40">
          <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-xl shrink-0">
            {invite.squad_emoji || '💪'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-white">
              <span className="text-brand-orange">{invite.sender?.display_name || 'Someone'}</span> invited you to join
            </p>
            <p className="text-sm font-black text-white truncate">{invite.squad_name}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleRespond(invite, false)}
              disabled={working.has(invite.id)}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all disabled:opacity-40"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleRespond(invite, true)}
              disabled={working.has(invite.id)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-[10px] font-black transition-all disabled:opacity-40"
            >
              {working.has(invite.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3" /> Join</>}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   SQUAD DETAIL VIEW
══════════════════════════════════════════════════════════════════════════════ */

function SquadDetail({ squadId, userId, onBack, onRefresh }) {
  const [squad,      setSquad]      = useState(null);
  const [stats,      setStats]      = useState(null);
  const [goalModal,  setGoalModal]  = useState(false);
  const [chalModal,  setChalModal]  = useState(false);
  const [leaveConf,  setLeaveConf]  = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [toast,      setToast]      = useState('');

  const [gTitle,    setGTitle]    = useState('');
  const [gExercise, setGExercise] = useState(EXERCISES[0]);
  const [gTarget,   setGTarget]   = useState(1000);
  const [gDeadline, setGDeadline] = useState('');

  const [cTitle,    setCTitle]    = useState('');
  const [cOpponent, setCOpponent] = useState('');
  const [cMetric,   setCMetric]   = useState(METRICS[0]);
  const [cDuration, setCDuration] = useState(DURATIONS[1]);

  const load = useCallback(async () => {
    // Refresh from Supabase so we always see the latest members/goals
    await refreshSquadsFromSupabase();
    const s = getSquadById(squadId);
    if (!s) { onBack(); return; }
    setSquad(s);
    setStats(getSquadStats(s));
  }, [squadId, onBack]);

  useEffect(() => {
    load();
    const h = () => load();
    window.addEventListener('fittrack_squads_updated', h);
    return () => window.removeEventListener('fittrack_squads_updated', h);
  }, [load]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const handleAddGoal = async () => {
    if (!gTitle.trim()) return;
    await addSquadGoal(squadId, { title: gTitle, exercise: gExercise, target: Number(gTarget), deadline: gDeadline, unit: 'reps' });
    setGoalModal(false); setGTitle(''); setGTarget(1000); setGDeadline('');
    showToast('🎯 Goal added to squad!');
    load();
  };

  const handleChallenge = async () => {
    if (!cTitle.trim() || !cOpponent.trim()) return;
    const opponent = getAllSquads().find(s => s.code.toUpperCase() === cOpponent.toUpperCase().trim());
    if (!opponent) { showToast('❌ No squad found with that code.'); return; }
    if (opponent.id === squadId) { showToast('❌ Cannot challenge your own squad.'); return; }
    await addSquadChallenge(squadId, {
      title: cTitle, opponentSquadId: opponent.id,
      opponentName: opponent.name, opponentEmoji: opponent.emoji,
      metric: cMetric, duration: cDuration,
      endsAt: new Date(Date.now() + parseInt(cDuration) * 24 * 60 * 60 * 1000).toISOString(),
    });
    setChalModal(false); setCTitle(''); setCOpponent('');
    showToast('⚔️ Challenge issued!'); load();
  };

  const handleLeave = async () => { await leaveSquad(squadId, userId); onBack(); onRefresh(); };

  if (!squad || !stats) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
    </div>
  );

  const isLeader = squad.leaderId === userId;
  const GOAL_COLORS = ['bg-brand-orange','bg-purple-500','bg-sky-500','bg-green-500','bg-red-500'];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-zinc-900 border border-zinc-700 text-sm font-bold text-white shadow-2xl animate-slide-down whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* Invite modal */}
      {inviteOpen && (
        <InviteModal squad={squad} currentUserId={userId} onClose={() => { setInviteOpen(false); load(); }} />
      )}

      {/* Header */}
      <div className="glass rounded-2xl border border-zinc-800/60 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-orange-500 via-red-500 to-pink-600" />
        <div className="p-5">
          <button onClick={onBack} className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs font-bold mb-4 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" /> All Squads
          </button>
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/20 flex items-center justify-center text-3xl shrink-0">{squad.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-xl font-black text-white">{squad.name}</h2>
                {isLeader && <span className="px-1.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[9px] font-black text-amber-400 uppercase">Leader</span>}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-zinc-500">{stats.memberCount} member{stats.memberCount !== 1 ? 's' : ''}</span>
                <CopyChip text={squad.code} />
              </div>
            </div>
            <button onClick={() => setLeaveConf(true)} className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-all">Leave</button>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-zinc-800/60">
            <StatPill icon={Flame}    value={stats.totalReps.toLocaleString()}     label="Reps"     color="text-orange-400" />
            <StatPill icon={Activity} value={stats.totalWorkouts}                  label="Sessions" color="text-sky-400" />
            <StatPill icon={Star}     value={stats.totalPoints.toLocaleString()}   label="Points"   color="text-amber-400" />
            <StatPill icon={Users}    value={stats.memberCount}                    label="Members"  color="text-purple-400" />
          </div>
        </div>
      </div>

      {/* Member Leaderboard */}
      <div className="glass rounded-2xl border border-zinc-800/60 p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-sm font-black text-white flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-400" /> Member Leaderboard</h3>
          <button onClick={() => setInviteOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-brand-orange/20 text-xs font-bold text-brand-orange hover:bg-brand-orange/20 transition-all">
            <UserPlus className="w-3.5 h-3.5" /> Invite / Add
          </button>
        </div>
        <div className="space-y-2.5">
          {stats.memberStats.map((m, i) => (
            <div key={m.userId} className={`flex items-center gap-3 p-3 rounded-xl ${i === 0 ? 'bg-amber-500/5 border border-amber-500/10' : 'bg-zinc-900/40'}`}>
              <RankBadge rank={i + 1} />
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center shrink-0">
                <UserIcon className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{m.name}{m.userId === squad.leaderId && <span className="ml-1 text-[9px] text-amber-400 font-black">👑</span>}</p>
                <p className="text-[10px] text-zinc-500">{m.weekWorkouts} sessions this week</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-black text-brand-orange">{m.totalReps.toLocaleString()}</p>
                <p className="text-[10px] text-zinc-600">reps</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Group Goals */}
      <div className="glass rounded-2xl border border-zinc-800/60 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-white flex items-center gap-2"><Target className="w-4 h-4 text-purple-400" /> Group Goals</h3>
          {isLeader && (
            <button onClick={() => setGoalModal(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs font-bold text-purple-400 hover:bg-purple-500/20 transition-all">
              <Plus className="w-3 h-3" /> Add Goal
            </button>
          )}
        </div>
        {stats.goals.length === 0 ? (
          <div className="text-center py-8"><Target className="w-8 h-8 text-zinc-700 mx-auto mb-2" /><p className="text-sm text-zinc-600">No goals yet.{isLeader ? ' Add one to motivate the team!' : ''}</p></div>
        ) : (
          <div className="space-y-4">
            {stats.goals.map((goal, i) => (
              <div key={goal.id}>
                <div className="flex items-center justify-between mb-2">
                  <div><p className="text-sm font-bold text-white">{goal.title}</p><p className="text-[10px] text-zinc-500">{goal.exercise} · {goal.target.toLocaleString()} reps target</p></div>
                  <div className="text-right">{goal.completed ? <span className="text-xs font-black text-green-400">✅ Done!</span> : <span className="text-xs font-black text-white">{goal.pct}%</span>}</div>
                </div>
                <ProgressBar pct={goal.pct} color={goal.completed ? 'bg-green-500' : GOAL_COLORS[i % GOAL_COLORS.length]} />
                <p className="text-[10px] text-zinc-600 mt-1">{(goal.current||0).toLocaleString()} / {goal.target.toLocaleString()} reps</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Challenges */}
      <div className="glass rounded-2xl border border-zinc-800/60 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-white flex items-center gap-2"><Swords className="w-4 h-4 text-red-400" /> Active Challenges</h3>
          {isLeader && (
            <button onClick={() => setChalModal(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-all">
              <Plus className="w-3 h-3" /> Challenge Squad
            </button>
          )}
        </div>
        {(squad.challenges || []).length === 0 ? (
          <div className="text-center py-8"><Swords className="w-8 h-8 text-zinc-700 mx-auto mb-2" /><p className="text-sm text-zinc-600">No active challenges.{isLeader ? ' Issue a challenge to a rival squad!' : ''}</p></div>
        ) : (
          <div className="space-y-3">
            {squad.challenges.map(chal => {
              const oppSquad = getSquadById(chal.opponentSquadId);
              const oppStats = oppSquad ? getSquadStats(oppSquad) : null;
              const myTotal  = stats.totalReps;
              const oppTotal = oppStats?.totalReps || 0;
              const winning  = myTotal >= oppTotal;
              return (
                <div key={chal.id} className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                  <p className="text-xs font-black text-red-400 uppercase tracking-wider mb-3">⚔️ {chal.title}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 text-center"><p className="text-lg">{squad.emoji}</p><p className="text-xs font-bold text-white truncate">{squad.name}</p><p className="text-sm font-black text-brand-orange">{myTotal.toLocaleString()}</p><p className="text-[10px] text-zinc-600">reps</p></div>
                    <div className="text-center"><p className="text-lg font-black text-red-400">VS</p><p className="text-[9px] text-zinc-600">{chal.metric}</p></div>
                    <div className="flex-1 text-center"><p className="text-lg">{chal.opponentEmoji || '🏆'}</p><p className="text-xs font-bold text-white truncate">{chal.opponentName || 'Unknown'}</p><p className="text-sm font-black text-zinc-400">{oppTotal.toLocaleString()}</p><p className="text-[10px] text-zinc-600">reps</p></div>
                  </div>
                  <div className="mt-3">
                    <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden flex">
                      <div className="h-full bg-brand-orange transition-all duration-700 rounded-full" style={{ width: `${myTotal+oppTotal>0 ? Math.round(myTotal/(myTotal+oppTotal)*100) : 50}%` }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[9px] text-brand-orange font-bold">{squad.name}</span>
                      <span className="text-[9px] text-zinc-500 font-semibold">{winning ? '🏅 Leading' : '📈 Behind'}</span>
                      <span className="text-[9px] text-zinc-500">{chal.opponentName}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {leaveConf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="glass rounded-2xl border border-red-500/20 p-6 max-w-xs w-full text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto"><X className="w-6 h-6 text-red-400" /></div>
            <div><h3 className="text-base font-black text-white">Leave {squad.name}?</h3><p className="text-xs text-zinc-500 mt-1">You can rejoin with the squad code later.</p></div>
            <div className="flex gap-3">
              <button onClick={() => setLeaveConf(false)} className="flex-1 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm font-bold text-zinc-300 hover:text-white transition-all">Cancel</button>
              <button onClick={handleLeave} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-black hover:bg-red-600 transition-all">Leave</button>
            </div>
          </div>
        </div>
      )}

      {goalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="glass rounded-2xl border border-purple-500/20 p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-black text-white flex items-center gap-2"><Target className="w-4 h-4 text-purple-400"/>New Group Goal</h3><button onClick={() => setGoalModal(false)}><X className="w-4 h-4 text-zinc-500 hover:text-white"/></button></div>
            <div className="space-y-3">
              <input value={gTitle} onChange={e => setGTitle(e.target.value)} placeholder="Goal title" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-purple-500/50"/>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Exercise</label><select value={gExercise} onChange={e => setGExercise(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:border-purple-500/50">{EXERCISES.map(e => <option key={e}>{e}</option>)}</select></div>
                <div><label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Target Reps</label><input type="number" value={gTarget} onChange={e => setGTarget(e.target.value)} min="100" max="1000000" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:border-purple-500/50"/></div>
              </div>
              <div><label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Deadline (optional)</label><input type="date" value={gDeadline} onChange={e => setGDeadline(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:border-purple-500/50"/></div>
            </div>
            <div className="flex gap-2 pt-1"><button onClick={() => setGoalModal(false)} className="flex-1 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm font-bold text-zinc-400 hover:text-white transition-all">Cancel</button><button onClick={handleAddGoal} disabled={!gTitle.trim()} className="flex-1 py-2.5 rounded-xl bg-purple-500 text-white text-sm font-black hover:bg-purple-600 transition-all disabled:opacity-40">Add Goal</button></div>
          </div>
        </div>
      )}

      {chalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="glass rounded-2xl border border-red-500/20 p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-black text-white flex items-center gap-2"><Swords className="w-4 h-4 text-red-400"/>Issue Challenge</h3><button onClick={() => setChalModal(false)}><X className="w-4 h-4 text-zinc-500 hover:text-white"/></button></div>
            <div className="space-y-3">
              <input value={cTitle} onChange={e => setCTitle(e.target.value)} placeholder="Challenge title" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-red-500/50"/>
              <div><label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Opponent Squad Code</label><input value={cOpponent} onChange={e => setCOpponent(e.target.value.toUpperCase())} placeholder="e.g. ALPHA4" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm font-mono text-brand-orange placeholder:text-zinc-600 focus:border-red-500/50 uppercase tracking-widest"/></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Metric</label><select value={cMetric} onChange={e => setCMetric(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:border-red-500/50">{METRICS.map(m => <option key={m}>{m}</option>)}</select></div>
                <div><label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Duration</label><select value={cDuration} onChange={e => setCDuration(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:border-red-500/50">{DURATIONS.map(d => <option key={d}>{d}</option>)}</select></div>
              </div>
            </div>
            <div className="flex gap-2 pt-1"><button onClick={() => setChalModal(false)} className="flex-1 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm font-bold text-zinc-400 hover:text-white transition-all">Cancel</button><button onClick={handleChallenge} disabled={!cTitle.trim() || !cOpponent.trim()} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-black hover:bg-red-600 transition-all disabled:opacity-40">⚔️ Issue</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   SQUAD CARD
══════════════════════════════════════════════════════════════════════════════ */

function SquadCard({ squad, userId, onClick }) {
  const stats   = getSquadStats(squad);
  const isLeader = squad.leaderId === userId;
  return (
    <div onClick={onClick} className="glass rounded-2xl border border-zinc-800/60 hover:border-orange-500/30 cursor-pointer transition-all hover:shadow-lg hover:shadow-orange-500/5 hover:-translate-y-0.5 overflow-hidden group">
      <div className="h-1.5 bg-gradient-to-r from-orange-500 via-red-500 to-pink-600" />
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/20 flex items-center justify-center text-2xl shrink-0">{squad.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              <h3 className="text-sm font-black text-white truncate">{squad.name}</h3>
              {isLeader && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
            </div>
            <p className="text-[10px] text-zinc-500">{stats.memberCount} member{stats.memberCount !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3 pt-3 border-t border-zinc-800/40">
          <div className="text-center"><p className="text-sm font-black text-brand-orange">{stats.totalReps.toLocaleString()}</p><p className="text-[9px] text-zinc-600 uppercase tracking-wider">Reps</p></div>
          <div className="text-center"><p className="text-sm font-black text-sky-400">{stats.totalWorkouts}</p><p className="text-[9px] text-zinc-600 uppercase tracking-wider">Workouts</p></div>
          <div className="text-center"><p className="text-sm font-black text-amber-400">{stats.goals.length}</p><p className="text-[9px] text-zinc-600 uppercase tracking-wider">Goals</p></div>
        </div>
        <div className="flex items-center justify-between">
          <CopyChip text={squad.code} />
          <span className="text-xs font-bold text-brand-orange flex items-center gap-1 transition-all">View <ChevronRight className="w-3.5 h-3.5" /></span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   SQUAD HUB
══════════════════════════════════════════════════════════════════════════════ */

function SquadHub({ user }) {
  const userId   = user?.id;
  const userName = user?.name || 'Athlete';

  const [tab,         setTab]         = useState('mySquads');
  const [mySquads,    setMySquads]    = useState([]);
  const [allSquads,   setAllSquads]   = useState([]);
  const [detailId,    setDetailId]    = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [joinModal,   setJoinModal]   = useState(false);
  const [toast,       setToast]       = useState('');

  const [cName,  setCName]  = useState('');
  const [cEmoji, setCEmoji] = useState('💪');

  // Join form state with full validation feedback
  const [jCode,    setJCode]    = useState('');
  const [jErr,     setJErr]     = useState('');
  const [jLoading, setJLoading] = useState(false);
  const [jSuccess, setJSuccess] = useState('');

  const refresh = useCallback(async () => {
    // Pull latest from Supabase (no-op if not configured), then read local cache
    await refreshSquadsFromSupabase();
    setMySquads(getUserSquads(userId));
    setAllSquads(getAllSquads());
  }, [userId]);

  useEffect(() => {
    refresh();
    const h = () => refresh();
    window.addEventListener('fittrack_squads_updated', h);
    return () => window.removeEventListener('fittrack_squads_updated', h);
  }, [refresh]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const handleCreate = async () => {
    if (!cName.trim()) return;
    const squad = await createSquad(cName, cEmoji, userId, userName);
    if (squad) {
      setCreateModal(false); setCName(''); setCEmoji('💪');
      showToast('🎉 Squad created! Share the code with your team.');
      refresh();
      setDetailId(squad.id);
    }
  };

  const handleJoin = async () => {
    setJErr(''); setJSuccess('');
    const code = jCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 4) { setJErr('Code must be at least 4 characters.'); return; }

    setJLoading(true);
    console.log('[handleJoin] Attempting to join with code:', code, '— userId:', userId, '— userName:', userName);

    // Small async pause so loading state renders
    await new Promise(r => setTimeout(r, 400));

    const result = await joinSquadByCode(code, userId, userName);
    setJLoading(false);

    console.log('[handleJoin] Result:', result);

    if (result.success) {
      setJSuccess(`✅ Joined "${result.squad.name}"!`);
      setTimeout(() => {
        setJoinModal(false); setJCode(''); setJErr(''); setJSuccess('');
        refresh();
        setDetailId(result.squad.id);
      }, 1200);
    } else {
      setJErr(result.error || 'Invalid Squad Code. Please check and try again.');
    }
  };

  if (detailId) return (
    <SquadDetail squadId={detailId} userId={userId} onBack={() => setDetailId(null)} onRefresh={refresh} />
  );

  const rankedSquads = [...allSquads].sort((a, b) => getSquadStats(b).totalPoints - getSquadStats(a).totalPoints);

  const HUB_TABS = [
    { id: 'mySquads',   label: 'My Squads', icon: Shield },
    { id: 'rankings',   label: 'Rankings',  icon: Trophy },
    { id: 'challenges', label: 'Challenges',icon: Swords },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-zinc-900 border border-zinc-700 text-sm font-bold text-white shadow-2xl animate-slide-down whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">⚡ PRO Feature</p>
          <h1 className="text-2xl font-black text-white flex items-center gap-2"><Shield className="w-6 h-6 text-brand-orange" /> Squad System</h1>
          <p className="text-sm text-zinc-500 mt-1">Compete as a team. Win together.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setJoinModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800/60 text-xs font-bold text-zinc-300 hover:text-white hover:border-zinc-700 transition-all">
            <LogIn className="w-3.5 h-3.5" /> Join
          </button>
          <button onClick={() => setCreateModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-black shadow-lg shadow-orange-500/20 hover:scale-[1.03] active:scale-[0.97] transition-all">
            <Plus className="w-3.5 h-3.5" /> Create Squad
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800/60 w-fit">
        {HUB_TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab === id ? 'bg-brand-orange text-white shadow-md shadow-orange-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* MY SQUADS */}
      {tab === 'mySquads' && (
        <div className="space-y-4">
          {/* Pending invites banner */}
          {userId && <PendingInvitesBanner userId={userId} onAccepted={(squadId) => { refresh(); setDetailId(squadId); }} />}

          {mySquads.length === 0 ? (
            <div className="glass rounded-2xl border border-zinc-800/60 p-12 text-center">
              <Shield className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <h3 className="text-base font-black text-white mb-1">No squads yet</h3>
              <p className="text-sm text-zinc-500 mb-5">Create your own squad or join one with an invite code.</p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => setJoinModal(true)} className="px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm font-bold text-zinc-300 hover:text-white transition-all">Join with Code</button>
                <button onClick={() => setCreateModal(true)} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-black shadow-lg shadow-orange-500/20">Create Squad</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {mySquads.map(s => <SquadCard key={s.id} squad={s} userId={userId} onClick={() => setDetailId(s.id)} />)}
            </div>
          )}
        </div>
      )}

      {/* RANKINGS */}
      {tab === 'rankings' && (
        <div className="space-y-4">
          <div className="glass rounded-2xl border border-amber-500/20 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center"><Trophy className="w-6 h-6 text-amber-400" /></div>
            <div><h2 className="text-base font-black text-white">Global Squad Rankings</h2><p className="text-xs text-zinc-500">{allSquads.length} squad{allSquads.length !== 1 ? 's' : ''} competing worldwide</p></div>
          </div>
          {allSquads.length === 0 ? (
            <div className="glass rounded-2xl border border-zinc-800/60 p-12 text-center"><Trophy className="w-10 h-10 text-zinc-700 mx-auto mb-3" /><p className="text-sm text-zinc-500">No squads yet. Be the first to create one!</p></div>
          ) : (
            <div className="glass rounded-2xl border border-zinc-800/60 overflow-hidden">
              {rankedSquads.map((s, i) => {
                const st = getSquadStats(s);
                const isMe = s.members.some(m => m.userId === userId);
                const maxPts = getSquadStats(rankedSquads[0]).totalPoints || 1;
                return (
                  <div key={s.id} onClick={() => isMe && setDetailId(s.id)} className={`flex items-center gap-4 px-4 py-3.5 border-b border-zinc-800/40 last:border-0 transition-colors ${isMe ? 'cursor-pointer hover:bg-orange-500/5 bg-orange-500/3' : ''}`}>
                    <RankBadge rank={i + 1} />
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center text-xl shrink-0">{s.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <p className="text-sm font-bold text-white truncate">{s.name}</p>
                        {isMe && <span className="px-1.5 py-0.5 rounded bg-brand-orange/20 text-[9px] font-black text-brand-orange">YOU</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden"><div className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-700" style={{ width: `${Math.round(st.totalPoints / maxPts * 100)}%` }} /></div>
                        <span className="text-[10px] text-zinc-500 whitespace-nowrap">{st.memberCount} members</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0"><p className="text-sm font-black text-amber-400">{st.totalPoints.toLocaleString()}</p><p className="text-[9px] text-zinc-600">pts</p></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CHALLENGES */}
      {tab === 'challenges' && (
        <div className="space-y-4">
          {mySquads.length === 0 ? (
            <div className="glass rounded-2xl border border-zinc-800/60 p-12 text-center"><Swords className="w-10 h-10 text-zinc-700 mx-auto mb-3" /><p className="text-sm text-zinc-500">Join or create a squad first to participate in challenges.</p></div>
          ) : mySquads.map(s => {
            const challenges = s.challenges || [];
            const st = getSquadStats(s);
            return (
              <div key={s.id}>
                <div className="flex items-center gap-2 mb-3"><span className="text-lg">{s.emoji}</span><h3 className="text-sm font-black text-white">{s.name}</h3><span className="text-xs text-zinc-500">· {challenges.length} challenge{challenges.length !== 1 ? 's' : ''}</span></div>
                {challenges.length === 0 ? (
                  <div className="glass rounded-xl border border-zinc-800/60 p-5 text-center">
                    <p className="text-xs text-zinc-600">No active challenges for this squad.</p>
                    {s.leaderId === userId && <button onClick={() => setDetailId(s.id)} className="mt-2 text-xs font-bold text-brand-orange hover:text-amber-400 transition-colors">Open squad to issue a challenge →</button>}
                  </div>
                ) : challenges.map(chal => {
                  const opp = getSquadById(chal.opponentSquadId);
                  const oppSt = opp ? getSquadStats(opp) : null;
                  const myPts = st.totalReps, oppPts = oppSt?.totalReps || 0;
                  const pct = myPts + oppPts > 0 ? Math.round(myPts / (myPts + oppPts) * 100) : 50;
                  const winning = myPts >= oppPts;
                  return (
                    <div key={chal.id} className="glass rounded-xl border border-red-500/10 p-4 mb-3">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-black text-white">⚔️ {chal.title}</p>
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${winning ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>{winning ? '🏅 Leading' : '📈 Behind'}</span>
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1 text-center"><p className="text-xl">{s.emoji}</p><p className="text-xs font-bold text-white">{s.name}</p><p className="text-sm font-black text-brand-orange">{myPts.toLocaleString()}</p></div>
                        <div className="text-center px-2"><p className="text-base font-black text-red-400">VS</p></div>
                        <div className="flex-1 text-center"><p className="text-xl">{chal.opponentEmoji || '🏆'}</p><p className="text-xs font-bold text-zinc-400">{chal.opponentName}</p><p className="text-sm font-black text-zinc-400">{oppPts.toLocaleString()}</p></div>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden flex"><div className="h-full bg-brand-orange transition-all duration-700" style={{ width: `${pct}%` }} /><div className="h-full bg-zinc-600 flex-1" /></div>
                      <div className="flex justify-between mt-1"><span className="text-[9px] text-brand-orange">{pct}%</span><span className="text-[9px] text-zinc-500">{chal.metric} · {chal.duration}</span><span className="text-[9px] text-zinc-500">{100-pct}%</span></div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE MODAL */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="glass rounded-2xl border border-orange-500/20 p-6 max-w-sm w-full space-y-5">
            <div className="flex items-center justify-between"><h3 className="font-black text-white flex items-center gap-2"><Shield className="w-4 h-4 text-brand-orange"/>Create Squad</h3><button onClick={() => setCreateModal(false)}><X className="w-4 h-4 text-zinc-500 hover:text-white"/></button></div>
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-2">Squad Icon</label>
              <div className="grid grid-cols-10 gap-1">
                {SQUAD_EMOJIS.map(e => (<button key={e} onClick={() => setCEmoji(e)} className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all ${cEmoji===e ? 'bg-brand-orange/20 border border-brand-orange/40 scale-110' : 'hover:bg-zinc-800'}`}>{e}</button>))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1.5">Squad Name</label>
              <input value={cName} onChange={e => setCName(e.target.value)} placeholder="e.g. Iron Wolves, Team Phoenix…" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-brand-orange/50" onKeyDown={e => e.key === 'Enter' && handleCreate()}/>
            </div>
            {cName.trim() && (<div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800"><span className="text-2xl">{cEmoji}</span><div><p className="text-sm font-black text-white">{cName}</p><p className="text-[10px] text-zinc-500">1 member · 0 goals</p></div></div>)}
            <div className="flex gap-2 pt-1"><button onClick={() => setCreateModal(false)} className="flex-1 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm font-bold text-zinc-400 hover:text-white transition-all">Cancel</button><button onClick={handleCreate} disabled={!cName.trim()} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-black hover:scale-[1.02] transition-all disabled:opacity-40">🚀 Create</button></div>
          </div>
        </div>
      )}

      {/* JOIN MODAL — fully hardened */}
      {joinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="glass rounded-2xl border border-sky-500/20 p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-white flex items-center gap-2"><LogIn className="w-4 h-4 text-sky-400"/>Join a Squad</h3>
              <button onClick={() => { setJoinModal(false); setJCode(''); setJErr(''); setJSuccess(''); }}><X className="w-4 h-4 text-zinc-500 hover:text-white"/></button>
            </div>
            <p className="text-xs text-zinc-500">Enter the 6-character invite code shared by your squad leader. Codes are case-insensitive.</p>

            <div>
              <input
                value={jCode}
                onChange={e => { setJCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'')); setJErr(''); setJSuccess(''); }}
                onKeyDown={e => e.key === 'Enter' && !jLoading && jCode.length >= 4 && handleJoin()}
                placeholder="e.g. ALPHA4"
                maxLength={6}
                className={`w-full bg-zinc-900 border rounded-xl px-4 py-3 text-center font-mono text-2xl font-black text-brand-orange uppercase tracking-widest placeholder:text-zinc-700 transition-colors ${jErr ? 'border-red-500/60' : jSuccess ? 'border-green-500/60' : 'border-zinc-700 focus:border-sky-500/50'}`}
              />
              {jErr     && <p className="text-xs text-red-400 mt-2 font-semibold flex items-center gap-1.5"><X className="w-3 h-3 shrink-0"/>{jErr}</p>}
              {jSuccess && <p className="text-xs text-green-400 mt-2 font-bold flex items-center gap-1.5"><CheckCircle className="w-3 h-3 shrink-0"/>{jSuccess}</p>}
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setJoinModal(false); setJCode(''); setJErr(''); setJSuccess(''); }} className="flex-1 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm font-bold text-zinc-400 hover:text-white transition-all">Cancel</button>
              <button
                onClick={handleJoin}
                disabled={jCode.length < 4 || jLoading || !!jSuccess}
                className="flex-1 py-2.5 rounded-xl bg-sky-500 text-white text-sm font-black hover:bg-sky-600 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {jLoading ? <><Loader2 className="w-4 h-4 animate-spin"/> Searching…</> : 'Join Squad'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════════════════════════════════ */

export default function Squads() {
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [pro,    setPro]    = useState(() => isProUser());
  const [screen, setScreen] = useState(() => isProUser() ? 'hub' : 'paywall');

  useEffect(() => {
    const handler = () => {
      const nowPro = isProUser();
      setPro(nowPro);
      if (nowPro && screen === 'paywall') setScreen('hub');
    };
    window.addEventListener('fittrack_pro_updated', handler);
    window.addEventListener('fittrack_session_loaded', handler);
    return () => {
      window.removeEventListener('fittrack_pro_updated', handler);
      window.removeEventListener('fittrack_session_loaded', handler);
    };
  }, [screen]);

  useEffect(() => {
    const h = (e) => setCurrentUser(e.detail ?? getCurrentUser());
    window.addEventListener('fittrack_auth_updated', h);
    return () => window.removeEventListener('fittrack_auth_updated', h);
  }, []);

  const handlePaymentSuccess = useCallback((method) => {
    grantProAccess(method, currentUser?.id);
    setPro(true);
    setScreen('hub');
  }, [currentUser?.id]);

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {screen === 'paywall' && <SquadPaywall onUpgrade={() => setScreen('payment')} />}
        {screen === 'payment' && <MockPayment onSuccess={handlePaymentSuccess} onBack={() => setScreen('paywall')} />}
        {screen === 'hub'     && <SquadHub user={currentUser} />}
      </div>
    </div>
  );
}
