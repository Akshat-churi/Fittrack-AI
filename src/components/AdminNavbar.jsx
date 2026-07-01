import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Shield, LogOut, User, ChevronDown } from 'lucide-react';
import { getCurrentUser, signOut } from '../utils/auth';

export default function AdminNavbar() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = () => {
    signOut();
    navigate('/auth');
  };

  return (
    <nav className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800/60">
      <div className="px-6 flex items-center justify-between h-16">

        {/* Logo + Admin badge */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-orange to-brand-orange-dark flex items-center justify-center shadow-glow-orange">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-black text-base text-white tracking-tight">
              FitTrack <span className="text-gradient">AI</span>
            </span>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-brand-orange" />
              <span className="text-[10px] font-black text-brand-orange uppercase tracking-widest">Admin Panel</span>
            </div>
          </div>
        </div>

        {/* Right side – admin user + signout */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(p => !p)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800/60 hover:border-brand-orange/30 transition-all group"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-orange to-amber-600 flex items-center justify-center">
              {user?.photo
                ? <img src={user.photo} alt="" className="w-7 h-7 rounded-lg object-cover" />
                : <User className="w-4 h-4 text-white" />}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-white leading-tight">{user?.name || 'Admin'}</p>
              <p className="text-[10px] text-zinc-500 leading-tight">{user?.email}</p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-52 glass rounded-2xl border border-zinc-800/60 shadow-2xl overflow-hidden z-50 animate-scale-in">
              <div className="px-4 py-3 border-b border-zinc-800/60">
                <p className="text-xs font-black text-white">{user?.name}</p>
                <p className="text-[10px] text-zinc-500 truncate">{user?.email}</p>
                <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-lg bg-brand-orange/10 border border-brand-orange/20">
                  <Shield className="w-2.5 h-2.5 text-brand-orange" />
                  <span className="text-[9px] font-black text-brand-orange uppercase tracking-widest">Administrator</span>
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
