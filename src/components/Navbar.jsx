import React, { useState, useEffect, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, Home, BarChart2, TrendingUp, Bell, User, LogIn,
  History, BookOpen, Trophy, Menu, X, Users, Target, Crown,
  Shield, Sun, Moon, Play, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useUserPoints } from '../hooks/useUserPoints';
import { getCurrentUser, signOut } from '../utils/auth';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { SidebarContext } from '../App';

const Dot = ({ n }) => n > 0 ? (
  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-black text-white leading-none">
    {n > 9 ? '9+' : n}
  </span>
) : null;

/* ── NAV SECTIONS ──────────────────────────────────────────────── */
const NAV = {
  main: [
    { to: '/',            icon: Home,       label: 'Home'        },
    { to: '/history',     icon: History,    label: 'History'     },
    { to: '/guide',       icon: BookOpen,   label: 'Guide'       },
    { to: '/goals',       icon: Target,     label: 'Goals'       },
  ],
  pro: [
    { to: '/nutrition',   icon: Crown,      label: 'Nutrition',  pro: true  },
  ],
  social: [
    { to: '/dashboard',   icon: BarChart2,  label: 'Dashboard'   },
    { to: '/social',      icon: Users,      label: 'Social'      },
    { to: '/leaderboard', icon: TrendingUp, label: 'Rankings'    },
  ],
  account: [
    { to: '/profile',     icon: User,       label: 'Profile'     },
  ],
};

export default function Navbar() {
  const loc      = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { collapsed, setCollapsed } = useContext(SidebarContext);

  if (loc.pathname.startsWith('/admin')) return null;

  const points = useUserPoints();
  const [user,         setUser]         = useState(() => getCurrentUser());
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMsgs,   setUnreadMsgs]   = useState(0);
  const [open,         setOpen]         = useState(false); // sidebar open on mobile

  useEffect(() => {
    const s = (e) => setUser(e.detail ?? getCurrentUser());
    window.addEventListener('fittrack_auth_updated', s);
    window.addEventListener('storage', s);
    return () => { window.removeEventListener('fittrack_auth_updated', s); window.removeEventListener('storage', s); };
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => { setOpen(false); }, [loc.pathname]);

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return setUnreadNotifs(0);
    const load = async () => {
      try { const { count } = await supabase.from('notifications').select('*',{count:'exact',head:true}).match({receiver_id:user.id,read:false}); setUnreadNotifs(count||0); } catch{}
    };
    load();
    const ch = supabase.channel('nb_n_'+user.id).on('postgres_changes',{event:'*',schema:'public',table:'notifications',filter:`receiver_id=eq.${user.id}`},load).subscribe();
    return () => supabase.removeChannel(ch);
  }, [user?.id]);

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
  const totalUnread = unreadNotifs + unreadMsgs;

  // Keyboard shortcut to toggle sidebar: '['
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName) || e.target?.isContentEditable) return;
      if (e.key === '[' || (e.altKey && e.key.toLowerCase() === 'b')) {
        e.preventDefault();
        setCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCollapsed]);

  const SideLink = ({ to, icon: Icon, label, badge = 0, pro = false }) => {
    const active = isActive(to);
    return (
      <Link to={to}
        className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
          ${active
            ? 'bg-brand-orange text-white shadow-md shadow-brand-orange/25'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-800/70'
          }`}>
        <span className="relative shrink-0">
          <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]"/>
          {badge > 0 && <Dot n={badge}/>}
        </span>
        <span className="flex-1 truncate">{label}</span>
        {pro && !active && (
          <span className="px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/25 text-[9px] font-black text-amber-400 uppercase shrink-0">PRO</span>
        )}
        {active && <ChevronRight className="w-3.5 h-3.5 opacity-60 shrink-0"/>}
      </Link>
    );
  };

  const SectionLabel = ({ label }) => (
    <p className="px-3 pt-4 pb-1 text-[9px] font-black text-zinc-600 uppercase tracking-widest">{label}</p>
  );

  /* ── Sidebar content shared by desktop + mobile overlay ── */
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo & Close button */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800/60 shrink-0">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-orange to-brand-orange-dark flex items-center justify-center shadow-glow-orange shrink-0 group-hover:scale-105 transition-transform">
            <Activity className="w-4 h-4 text-white"/>
          </div>
          <div>
            <p className="font-black text-sm tracking-tight text-white leading-tight">FitTrack</p>
            <p className="text-[10px] font-bold text-gradient leading-tight">AI</p>
          </div>
        </Link>
        <button
          onClick={() => setCollapsed(true)}
          className="hidden md:flex w-8 h-8 items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/70 border border-transparent hover:border-zinc-700/60 transition-all"
          title="Close sidebar (Full screen)"
          aria-label="Close sidebar to view full screen"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Quick workout CTA */}
      <div className="px-3 pt-4">
        <Link to="/instructions/pushups"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-brand-orange text-white text-sm font-bold hover:bg-brand-orange-light transition-all shadow-glow-orange active:scale-95">
          <Play className="w-4 h-4 fill-white"/> Start Workout
        </Link>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-hide">
        <SectionLabel label="Menu"/>
        {NAV.main.map(item => <SideLink key={item.to} {...item}/>)}

        <SectionLabel label="Pro"/>
        {NAV.pro.map(item => <SideLink key={item.to} {...item}/>)}

        {user && (
          <>
            <SectionLabel label="Analytics"/>
            {NAV.social.map(item => (
              <SideLink key={item.to} {...item}
                badge={item.to === '/social' ? totalUnread : 0}/>
            ))}
            <SectionLabel label="Account"/>
            {NAV.account.map(item => <SideLink key={item.to} {...item}/>)}
          </>
        )}

        {!user && (
          <>
            <SectionLabel label="Account"/>
            <SideLink to="/auth" icon={LogIn} label="Sign in"/>
          </>
        )}
      </nav>

      {/* Bottom: user card + theme */}
      <div className="border-t border-zinc-800/60 p-3 space-y-2">
        {user && (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
            {user.photo
              ? <img src={user.photo} alt="" className="w-8 h-8 rounded-lg object-cover border border-zinc-700 shrink-0"/>
              : <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0"><User className="w-4 h-4 text-zinc-500"/></div>}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user.name || 'Athlete'}</p>
              <p className="text-[10px] text-brand-orange font-semibold">{points.toLocaleString()} pts</p>
            </div>
            <button onClick={toggleTheme} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-all shrink-0" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-yellow-400"/> : <Moon className="w-3.5 h-3.5 text-zinc-500"/>}
            </button>
          </div>
        )}
        {!user && (
          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-zinc-600">Theme</span>
            <button onClick={toggleTheme} className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-yellow-400"/> : <Moon className="w-3.5 h-3.5 text-zinc-500"/>}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ── DESKTOP SIDEBAR ─────────────────── */}
      <aside
        className={`hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-50 border-r border-zinc-800/60 transition-all duration-300 w-56 ${
          collapsed ? '-translate-x-full shadow-none' : 'translate-x-0 shadow-2xl'
        }`}
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <SidebarContent />
      </aside>

      {/* ── DESKTOP FLOATING OPEN BUTTON (Visible in Full Screen mode) ── */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="hidden md:flex fixed top-3.5 left-3.5 z-40 items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900/95 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-white shadow-2xl backdrop-blur-md transition-all active:scale-95 group hover:border-brand-orange/50 hover:shadow-brand-orange/10"
          title="Open sidebar menu (Press [ to toggle)"
          aria-label="Open sidebar menu"
        >
          <PanelLeftOpen className="w-4 h-4 text-brand-orange group-hover:scale-110 transition-transform" />
          
        </button>
      )}

      {/* ── MOBILE TOP BAR ───────────────────────────────────────── */}
      <header className="md:hidden sticky top-0 z-50 flex items-center justify-between px-4 h-14 border-b border-zinc-800/60"
        style={{ backgroundColor: 'var(--glass-bg)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
        {/* Hamburger */}
        <button onClick={() => setOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-all">
          <Menu className="w-5 h-5"/>
        </button>

        {/* Logo center */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-orange to-brand-orange-dark flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-white"/>
          </div>
          <span className="font-black text-sm text-white">FitTrack <span className="text-gradient">AI</span></span>
        </Link>

        {/* Right: notif + points */}
        <div className="flex items-center gap-1.5">
          {user && (
            <>
              <span className="text-xs font-black text-brand-orange">{points.toLocaleString()}</span>
              <Link to="/social?tab=notifications"
                className="relative w-9 h-9 flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-all">
                <Bell className="w-4.5 h-4.5 w-[18px] h-[18px]"/>
                <Dot n={unreadNotifs}/>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* ── MOBILE OVERLAY SIDEBAR ───────────────────────────────── */}
      {open && (
        <div className="md:hidden fixed inset-0 z-[60] flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}/>

          {/* Sidebar panel */}
          <div className="relative w-64 h-full border-r border-zinc-800/60 animate-slide-in-left"
            style={{ backgroundColor: 'var(--bg-secondary)' }}>
            {/* Close button */}
            <button onClick={() => setOpen(false)}
              className="absolute top-4 right-3 w-8 h-8 flex items-center justify-center rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-800/60 transition-all z-10">
              <X className="w-4 h-4"/>
            </button>
            <SidebarContent/>
          </div>
        </div>
      )}

      {/* ── MOBILE BOTTOM NAV ────────────────────────────────────── */}
      {user && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800/60 flex items-center justify-around px-1"
          style={{ backgroundColor: 'var(--glass-bg)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)', height: '56px' }}>
          {[
            { to: '/',            icon: Home,       label: 'Home'    },
            { to: '/social',      icon: Users,      label: 'Social'  },
            { to: '/dashboard',   icon: BarChart2,  label: 'Stats'   },
            { to: '/leaderboard', icon: TrendingUp, label: 'Rank'    },
            { to: '/profile',     icon: User,       label: 'Me'      },
          ].map(({ to, icon: Icon, label }) => {
            const active = isActive(to);
            return (
              <Link key={to} to={to}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all ${active ? 'text-brand-orange' : 'text-zinc-500'}`}>
                <span className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${active ? 'scale-110' : ''}`}/>
                  {to === '/social' && totalUnread > 0 && <Dot n={totalUnread}/>}
                </span>
                <span className={`text-[9px] font-bold tracking-wider uppercase leading-none ${active ? 'text-brand-orange' : 'text-zinc-600'}`}>{label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}
