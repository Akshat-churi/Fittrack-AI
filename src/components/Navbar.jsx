import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, Home, BarChart2, Globe, Search, TrendingUp,
  MessageSquare, Bell, Bookmark, User, LogIn,
  History, BookOpen, Trophy, Menu, X, Zap, Users, Target, Crown, Shield, Sun, Moon
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useUserPoints } from '../hooks/useUserPoints';
import { getCurrentUser, signOut } from '../utils/auth';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';

/* ── badge dot ─────────────────────────────────────────────────────────── */
const Dot = ({ n }) => n > 0 ? (
  <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-0.5 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow-md">
    {n > 9 ? '9+' : n}
  </span>
) : null;

export default function Navbar() {
  const loc      = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  
  if (loc.pathname.startsWith('/admin')) return null;

  const points   = useUserPoints();
  const [user,          setUser]          = useState(() => getCurrentUser());
  const [unreadNotifs,  setUnreadNotifs]  = useState(0);
  const [unreadMsgs,    setUnreadMsgs]    = useState(0);
  const [mobileOpen,    setMobileOpen]    = useState(false);

  /* keep user in sync */
  useEffect(() => {
    const s = (e) => setUser(e.detail ?? getCurrentUser());
    window.addEventListener('fittrack_auth_updated', s);
    window.addEventListener('storage', s);
    return () => { window.removeEventListener('fittrack_auth_updated', s); window.removeEventListener('storage', s); };
  }, []);

  useEffect(() => { setMobileOpen(false); }, [loc.pathname]);

  /* realtime notification count */
  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return setUnreadNotifs(0);
    const load = async () => {
      try { const { count } = await supabase.from('notifications').select('*',{count:'exact',head:true}).match({receiver_id:user.id,read:false}); setUnreadNotifs(count||0); } catch{}
    };
    load();
    const ch = supabase.channel('nb_n_'+user.id).on('postgres_changes',{event:'*',schema:'public',table:'notifications',filter:`receiver_id=eq.${user.id}`},load).subscribe();
    return () => supabase.removeChannel(ch);
  }, [user?.id]);

  /* realtime message count */
  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return setUnreadMsgs(0);
    const load = async () => {
      try { const { count } = await supabase.from('messages').select('*',{count:'exact',head:true}).match({receiver_id:user.id}).is('read_at',null); setUnreadMsgs(count||0); } catch{}
    };
    load();
    const ch = supabase.channel('nb_m_'+user.id).on('postgres_changes',{event:'*',schema:'public',table:'messages',filter:`receiver_id=eq.${user.id}`},load).subscribe();
    return () => supabase.removeChannel(ch);
  }, [user?.id]);

  const isActive = (path) => path === '/' ? loc.pathname === '/' : loc.pathname.startsWith(path);

  const lnk = (path) =>
    `nav-link ${isActive(path) ? 'nav-link-active' : 'nav-link-inactive'}`;

  const handleSignOut = () => { signOut(); navigate('/auth'); };

  const totalUnread = unreadNotifs + unreadMsgs;

  /* ── Desktop links ─────────────────────────────────────────────────── */
  const DesktopLinks = () => (
    <>
      <Link to="/"           className={lnk('/')}          ><Home         className="w-4 h-4 shrink-0"/><span className="hidden xl:inline">Home</span></Link>
      <Link to="/history"    className={lnk('/history')}   ><History      className="w-4 h-4 shrink-0"/><span className="hidden xl:inline">History</span></Link>
      <Link to="/guide"      className={lnk('/guide')}     ><BookOpen     className="w-4 h-4 shrink-0"/><span className="hidden xl:inline">Guide</span></Link>
      <Link to="/goals"      className={lnk('/goals')}     ><Target       className="w-4 h-4 shrink-0"/><span className="hidden xl:inline">Goals</span></Link>
      <Link to="/nutrition"  className={lnk('/nutrition')} >
        <span className="relative shrink-0">
          <Crown className="w-4 h-4 text-amber-400"/>
        </span>
        <span className="hidden xl:inline text-amber-400 font-bold">Nutrition</span>
      </Link>
      <Link to="/squads"    className={lnk('/squads')}   >
        <span className="relative shrink-0">
          <Shield className="w-4 h-4 text-orange-400"/>
        </span>
        <span className="hidden xl:inline text-orange-400 font-bold">Squads</span>
      </Link>
      {user && <>
        <Link to="/dashboard"   className={lnk('/dashboard')}  ><BarChart2  className="w-4 h-4 shrink-0"/><span className="hidden xl:inline">Dashboard</span></Link>
        <Link to="/social"      className={`${lnk('/social')} relative`}>
          <span className="relative">
            <Users className="w-4 h-4 shrink-0"/>
            {totalUnread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-0.5 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-black text-white shadow">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </span>
          <span className="hidden xl:inline">Social</span>
        </Link>
        <Link to="/leaderboard" className={lnk('/leaderboard')}><TrendingUp className="w-4 h-4 shrink-0"/><span className="hidden xl:inline">Rankings</span></Link>
        <Link to="/profile"     className={lnk('/profile')}    >
          {user.photo ? <img src={user.photo} alt="" className="w-5 h-5 rounded-full object-cover shrink-0"/> : <User className="w-4 h-4 shrink-0"/>}
          <span className="hidden xl:inline">Profile</span>
        </Link>
      </>}
      {!user && <Link to="/auth" className={lnk('/auth')}><LogIn className="w-4 h-4 shrink-0"/><span className="hidden sm:inline">Sign in</span></Link>}
    </>
  );

  /* ── Mobile drawer links ───────────────────────────────────────────── */
  const DrawerLink = ({ to, icon: Icon, label, badge = 0 }) => (
    <Link to={to} onClick={() => setMobileOpen(false)}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all relative ${isActive(to) ? 'bg-brand-orange/15 text-brand-orange' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'}`}>
      <Icon className="w-5 h-5 shrink-0"/>
      {label}
      {badge > 0 && <span className="ml-auto min-w-[20px] h-5 px-1 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-black text-white">{badge > 9 ? '9+' : badge}</span>}
    </Link>
  );

  return (
    <>
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-4">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-orange to-brand-orange-dark flex items-center justify-center shadow-glow-orange group-hover:scale-105 transition-transform">
                <Activity className="w-5 h-5 text-white"/>
              </div>
              <span className="font-black text-lg tracking-tight hidden sm:block" style={{ color: 'var(--text-primary)' }}>
                FitTrack <span className="text-gradient">AI</span>
              </span>
            </Link>

            {/* Points pill */}
            {user && (
              <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-orange/10 border border-brand-orange/20">
                <Trophy className="w-3.5 h-3.5 text-brand-orange"/>
                <span className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>{points.toLocaleString()} <span className="text-brand-orange">PTS</span></span>
              </div>
            )}

            {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
          <DesktopLinks/>
        </div>

        {/* Theme toggle button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-700/80 dark:bg-zinc-800/60 dark:hover:bg-zinc-700/80 transition-all"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-zinc-700" />}
        </button>

            {/* Mobile right icons */}
            <div className="flex md:hidden items-center gap-1">
              {user && (
                <Link to="/social?tab=notifications" className="relative p-2 text-zinc-400 hover:text-white">
                  <Bell className="w-5 h-5"/>
                  <Dot n={unreadNotifs}/>
                </Link>
              )}
              <button onClick={() => setMobileOpen(p => !p)} className="p-2 text-zinc-400 hover:text-white" aria-label="Menu">
                {mobileOpen ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t backdrop-blur-xl px-4 py-3 space-y-1 animate-slide-down shadow-2xl" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}>
            <DrawerLink to="/"           icon={Home}         label="Home"/>
            <DrawerLink to="/history"    icon={History}      label="History"/>
            <DrawerLink to="/guide"      icon={BookOpen}     label="Guide"/>
            <DrawerLink to="/goals"      icon={Target}       label="Goals"/>
            <DrawerLink to="/nutrition"  icon={Crown}        label="Nutrition PRO"/>
            <DrawerLink to="/squads"     icon={Shield}       label="Squads PRO"/>
            {user && <>
              <DrawerLink to="/dashboard"   icon={BarChart2}   label="Dashboard"/>
              <DrawerLink to="/social"      icon={Users}       label="Social" badge={unreadMsgs + unreadNotifs}/>
              <DrawerLink to="/leaderboard" icon={TrendingUp}  label="Rankings"/>
              <DrawerLink to="/profile"     icon={User}        label="Profile"/>
            </>}
            {!user && <DrawerLink to="/auth" icon={LogIn} label="Sign in"/>}
          </div>
        )}
      </nav>

      {/* ── Mobile bottom nav (thumb-friendly) ─────────────────────────── */}
      {user && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden backdrop-blur-xl border-t safe-area-bottom" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-around px-2 py-2">
            {[
              { to: '/',           icon: Home,          label: 'Home' },
              { to: '/social',     icon: Users,         label: 'Social' },
              { to: '/dashboard',  icon: BarChart2,     label: 'Stats' },
              { to: '/leaderboard',icon: TrendingUp,    label: 'Rank' },
              { to: '/profile',    icon: User,          label: 'Profile' },
            ].map(({ to, icon: Icon, label }) => (
              <Link key={to} to={to}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${isActive(to) ? 'text-brand-orange' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <Icon className="w-5 h-5"/>
                <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
