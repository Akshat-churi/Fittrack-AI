import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, Mail, Lock, User, Shield, Key } from 'lucide-react';
import { signInWithEmail, signInWithGoogleCredential, signUpWithEmail, signUpAdmin, getCurrentUser, signOut } from '../utils/auth';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const loadGoogleScript = () => new Promise((res, rej) => {
  if (window.google?.accounts?.id) return res(window.google);
  const s = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
  if (s) { s.addEventListener('load', () => res(window.google), { once: true }); s.addEventListener('error', rej, { once: true }); return; }
  const el = Object.assign(document.createElement('script'), { src: 'https://accounts.google.com/gsi/client', async: true, defer: true });
  el.onload = () => res(window.google); el.onerror = rej;
  document.head.appendChild(el);
});

export default function Auth() {
  const navigate = useNavigate();
  const gBtnRef = useRef(null);

  // Unified authentication state
  const [portal, setPortal] = useState('USER'); // 'USER' | 'ADMIN'
  const [mode, setMode] = useState('signin'); // 'signup' | 'signin'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [gReady, setGReady] = useState(false);

  const isSignup = mode === 'signup';

  // Load Google Auth Script for User Portal
  useEffect(() => {
    let alive = true;
    if (!googleClientId) return;
    loadGoogleScript().then(g => {
      if (!alive || !gBtnRef.current) return;
      g.accounts.id.initialize({
        client_id: googleClientId,
        callback: ({ credential }) => {
          try {
            setError('');
            signInWithGoogleCredential(credential);
            const loggedIn = getCurrentUser();
            if (loggedIn?.role === 'ADMIN') {
              navigate('/admin');
            } else {
              navigate('/');
            }
          } catch (e) {
            setError(e.message);
          }
        },
      });
      g.accounts.id.renderButton(gBtnRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
        width: gBtnRef.current.offsetWidth || 340
      });
      setGReady(true);
    }).catch(() => alive && setError('Google sign-in unavailable. Check your connection.'));
    return () => { alive = false; };
  }, [navigate, portal]); // Re-initialize Google button when portal switches to ensure ref binding

  // Clear inputs and error on toggling portal or signin/signup mode
  const handlePortalSwitch = (newPortal) => {
    setPortal(newPortal);
    setError('');
    setForm({ name: '', email: '', password: '' });
  };

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setError('');
    setForm({ name: '', email: '', password: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    try {
      if (portal === 'USER') {
        if (isSignup) {
          if (!form.name.trim()) throw new Error('Please enter your name.');
          signUpWithEmail(form);
        } else {
          signInWithEmail(form);
        }
        
        const logged = getCurrentUser();
        if (logged?.role === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } else {
        // ADMIN Portal
        if (isSignup) {
          if (!form.name.trim()) throw new Error('Please enter your name.');
          signUpAdmin(form);
        } else {
          signInWithEmail(form);
        }

        const logged = getCurrentUser();
        if (logged?.role !== 'ADMIN') {
          signOut(); // Immediately revoke session if not admin
          throw new Error('This account does not have Admin privileges.');
        }
        navigate('/admin');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-6 md:p-12 bg-gradient-to-tr from-brand-dark via-brand-dark to-zinc-950/40">
      
      {/* 🧩 SINGLE CENTERED AUTHENTICATION CARD */}
      <div className="w-full max-w-md animate-scale-in">
        <div className="glass rounded-3xl p-7 md:p-9 border border-zinc-800/60 shadow-2xl relative overflow-hidden transition-all duration-300">
          
          {/* Decorative glowing background effect inside card */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-orange/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* 1. Header Section */}
          <div className="text-center mb-6 relative z-10">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-brand-orange to-brand-orange-dark flex items-center justify-center shadow-glow-orange mb-3 transition-transform hover:scale-105 duration-200">
              <Activity className="w-6 h-6 text-white"/>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Fit Track <span className="text-gradient">AI</span>
            </h1>
            <p className="text-zinc-400 text-xs mt-1">
              Welcome back, sign in to continue
            </p>
          </div>

          {/* 2. Role Selector (Segmented control) */}
          <div className="relative flex bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-1 mb-5 z-10">
            <button
              type="button"
              onClick={() => handlePortalSwitch('USER')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                portal === 'USER' 
                  ? 'bg-brand-orange text-white shadow' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              User
            </button>
            <button
              type="button"
              onClick={() => handlePortalSwitch('ADMIN')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                portal === 'ADMIN' 
                  ? 'bg-zinc-800 text-brand-orange border border-zinc-700/60 shadow' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Admin
            </button>
          </div>

          {/* User Mode Switcher (Sign In vs Sign Up) */}
          <div className="flex bg-zinc-950/50 border border-zinc-900 rounded-xl p-1 mb-5 z-10">
            {['signin', 'signup'].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => handleModeSwitch(m)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-150 ${
                  mode === m 
                    ? 'bg-zinc-800 text-white border border-zinc-750' 
                    : 'text-zinc-500 hover:text-zinc-350'
                }`}
              >
                {m === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {/* 3. Dynamic Form Content */}
          <div className="relative z-10">
            
            {/* Google Login for Users only */}
            {portal === 'USER' && (
              <div className="transition-opacity duration-300">
                <div className="mb-4">
                  {googleClientId ? (
                    <div className="min-h-[40px] w-full overflow-hidden rounded-xl bg-white flex items-center justify-center">
                      <div ref={gBtnRef} className="w-full"/>
                      {!gReady && <span className="py-2.5 text-xs font-bold text-zinc-950">Loading Google…</span>}
                    </div>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => setError('Google client ID is not configured.')}
                      className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-white text-zinc-900 text-xs font-bold hover:bg-zinc-100 transition-all"
                    >
                      <span className="w-4 h-4 rounded-full bg-zinc-900 flex items-center justify-center text-white text-[10px] font-black">G</span>
                      Continue with Google
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-zinc-800/80"/>
                  <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">or use email</span>
                  <div className="h-px flex-1 bg-zinc-800/80"/>
                </div>
              </div>
            )}

            {/* Admin seeded demo badge hint */}
            {portal === 'ADMIN' && (
              <div className="bg-brand-orange/5 border border-brand-orange/20 rounded-2xl p-3 mb-4 text-center transition-all duration-300 animate-slide-down">
                <p className="text-[10px] text-brand-orange font-bold uppercase tracking-wider">
                  Demo Admin Credentials:
                </p>
                <p className="text-[11px] text-zinc-400 font-mono mt-0.5 select-all">
                  admin@fittrack.ai | Admin@1234
                </p>
              </div>
            )}

            {/* Input Forms */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignup && (
                <div className="transition-all duration-300">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                    {portal === 'ADMIN' ? 'Admin Name' : 'Full Name'}
                  </label>
                  <div className="flex items-center gap-2.5 border border-zinc-800/60 bg-zinc-900/85 rounded-xl px-3 py-0.5 focus-within:border-brand-orange/40 transition-colors">
                    <User className="w-3.5 h-3.5 text-zinc-650 shrink-0"/>
                    <input 
                      type="text"
                      name="name" 
                      value={form.name} 
                      onChange={e => setForm(f => ({...f, name: e.target.value}))}
                      className="flex-1 bg-transparent py-2.5 text-xs text-white placeholder:text-zinc-650 focus:outline-none" 
                      placeholder={portal === 'ADMIN' ? 'Admin Display Name' : 'John Doe'}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  {portal === 'ADMIN' ? 'Admin Email' : 'Email Address'}
                </label>
                <div className="flex items-center gap-2.5 border border-zinc-800/60 bg-zinc-900/85 rounded-xl px-3 py-0.5 focus-within:border-brand-orange/40 transition-colors">
                  <Mail className="w-3.5 h-3.5 text-zinc-650 shrink-0"/>
                  <input 
                    type="email" 
                    name="email" 
                    value={form.email} 
                    onChange={e => setForm(f => ({...f, email: e.target.value}))} 
                    required
                    className="flex-1 bg-transparent py-2.5 text-xs text-white placeholder:text-zinc-650 focus:outline-none" 
                    placeholder={portal === 'ADMIN' ? 'admin@fittrack.ai' : 'you@example.com'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="flex items-center gap-2.5 border border-zinc-800/60 bg-zinc-900/85 rounded-xl px-3 py-0.5 focus-within:border-brand-orange/40 transition-colors">
                  <Lock className="w-3.5 h-3.5 text-zinc-650 shrink-0"/>
                  <input 
                    type="password" 
                    name="password" 
                    value={form.password} 
                    onChange={e => setForm(f => ({...f, password: e.target.value}))} 
                    required 
                    minLength={6}
                    className="flex-1 bg-transparent py-2.5 text-xs text-white placeholder:text-zinc-650 focus:outline-none" 
                    placeholder="Min. 6 characters"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2.5 text-xs text-red-400 transition-all">
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black text-white bg-brand-orange hover:bg-[#ff8f4d] shadow-glow-orange hover:shadow-glow-orange-light transition-all"
              >
                {isSignup 
                  ? (portal === 'ADMIN' ? 'Register Admin' : 'Create User Account') 
                  : (portal === 'ADMIN' ? 'Sign In as Admin' : 'Sign In as User')
                }
                <ArrowRight className="w-3.5 h-3.5"/>
              </button>
            </form>
          </div>

          <Link to="/" className="block text-center text-xs text-brand-orange hover:text-brand-orange-light font-semibold mt-5 transition-colors relative z-10">
            ← Back to home
          </Link>
        </div>
      </div>

    </div>
  );
}
