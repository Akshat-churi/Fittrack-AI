import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, Crown, Lock, CreditCard, Smartphone, CheckCircle,
  ChevronRight, X, Loader2, Utensils, Target, Zap, Apple,
  BarChart3, Shield, RefreshCw, AlertCircle, User, Activity,
  Flame, Droplets, Scale,
} from 'lucide-react';
import { isProUser, grantProAccess, getProMeta } from '../utils/proAccess';
import {
  generateNutritionPlan,
  generateAiNutritionPlan,
  GOAL_LABELS,
  ACTIVITY_LABELS,
  DIET_LABELS,
  calcBMR,
  calcTDEE,
} from '../utils/nutritionEngine';
import { getCurrentUser } from '../utils/auth';
import { getUserScopedKey } from '../utils/userDataManager';
import { logEvent } from '../utils/analytics';

/* ══════════════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════════════ */
const DEMO_QR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="#18181b"/>
  <!-- QR outer border -->
  <rect x="10" y="10" width="180" height="180" rx="8" fill="none" stroke="#f97316" stroke-width="3"/>
  <!-- Top-left finder -->
  <rect x="20" y="20" width="50" height="50" rx="4" fill="none" stroke="#f97316" stroke-width="3"/>
  <rect x="30" y="30" width="30" height="30" rx="2" fill="#f97316"/>
  <!-- Top-right finder -->
  <rect x="130" y="20" width="50" height="50" rx="4" fill="none" stroke="#f97316" stroke-width="3"/>
  <rect x="140" y="30" width="30" height="30" rx="2" fill="#f97316"/>
  <!-- Bottom-left finder -->
  <rect x="20" y="130" width="50" height="50" rx="4" fill="none" stroke="#f97316" stroke-width="3"/>
  <rect x="30" y="140" width="30" height="30" rx="2" fill="#f97316"/>
  <!-- Data modules (decorative) -->
  <rect x="90" y="20" width="8" height="8" fill="#f97316"/>
  <rect x="105" y="20" width="8" height="8" fill="#f97316"/>
  <rect x="90" y="35" width="8" height="8" fill="#f97316"/>
  <rect x="120" y="35" width="8" height="8" fill="#f97316"/>
  <rect x="90" y="50" width="8" height="8" fill="#f97316"/>
  <rect x="105" y="50" width="8" height="8" fill="#f97316"/>
  <rect x="90" y="65" width="8" height="8" fill="#f97316"/>
  <rect x="90" y="90" width="8" height="8" fill="#f97316"/>
  <rect x="105" y="90" width="8" height="8" fill="#f97316"/>
  <rect x="120" y="90" width="8" height="8" fill="#f97316"/>
  <rect x="135" y="90" width="8" height="8" fill="#f97316"/>
  <rect x="150" y="90" width="8" height="8" fill="#f97316"/>
  <rect x="165" y="90" width="8" height="8" fill="#f97316"/>
  <rect x="90" y="105" width="8" height="8" fill="#f97316"/>
  <rect x="120" y="105" width="8" height="8" fill="#f97316"/>
  <rect x="150" y="105" width="8" height="8" fill="#f97316"/>
  <rect x="90" y="120" width="8" height="8" fill="#f97316"/>
  <rect x="105" y="120" width="8" height="8" fill="#f97316"/>
  <rect x="135" y="120" width="8" height="8" fill="#f97316"/>
  <rect x="165" y="120" width="8" height="8" fill="#f97316"/>
  <rect x="90" y="135" width="8" height="8" fill="#f97316"/>
  <rect x="120" y="135" width="8" height="8" fill="#f97316"/>
  <rect x="150" y="135" width="8" height="8" fill="#f97316"/>
  <rect x="90" y="150" width="8" height="8" fill="#f97316"/>
  <rect x="105" y="150" width="8" height="8" fill="#f97316"/>
  <rect x="120" y="150" width="8" height="8" fill="#f97316"/>
  <rect x="135" y="150" width="8" height="8" fill="#f97316"/>
  <rect x="90" y="165" width="8" height="8" fill="#f97316"/>
  <rect x="165" y="165" width="8" height="8" fill="#f97316"/>
  <text x="100" y="193" text-anchor="middle" font-family="monospace" font-size="7" fill="#52525b">DEMO – NOT REAL</text>
</svg>`);

const PRO_BENEFITS = [
  { icon: Sparkles,  text: 'AI-generated personalised meal plans' },
  { icon: Target,    text: 'Smart daily calorie targeting' },
  { icon: Utensils,  text: 'Full breakfast, lunch, dinner & snacks' },
  { icon: Zap,       text: 'Workout-based nutrition optimisation' },
  { icon: BarChart3, text: 'Macro breakdown (protein / carbs / fat)' },
  { icon: Apple,     text: 'Goal-specific diet tips & advice' },
];

/* ══════════════════════════════════════════════════════════════════
   PAYWALL
══════════════════════════════════════════════════════════════════ */
function Paywall({ onUpgrade, userEmail }) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg animate-scale-in">
        {/* Header card */}
        <div className="relative glass rounded-3xl border border-brand-orange/30 overflow-hidden mb-4 shadow-glow-orange">
          {/* Glow bg */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-orange/10 via-transparent to-accent-purple/5 pointer-events-none" />

          <div className="relative p-7 text-center">
            {/* Crown icon */}
            <div className="relative w-20 h-20 mx-auto mb-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-orange to-amber-500 flex items-center justify-center shadow-glow-orange">
                <Crown className="w-10 h-10 text-white" />
              </div>
              <div className="absolute inset-0 bg-brand-orange/30 rounded-2xl blur-xl animate-pulse" />
            </div>

            <span className="badge badge-orange mb-3 mx-auto w-fit">PRO Feature</span>
            <h1 className="text-2xl md:text-3xl font-black text-white mb-2 tracking-tight">
              Unlock AI Nutrition<br />
              <span className="text-gradient">Planner PRO</span>
            </h1>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-sm mx-auto">
              Get a personalised full-day meal plan, calorie targets, and macro breakdowns — generated for your exact body and goal.
            </p>
          </div>

          {/* Benefits */}
          <div className="relative border-t border-zinc-800/60 px-7 py-5 grid sm:grid-cols-2 gap-3">
            {PRO_BENEFITS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-brand-orange" />
                </div>
                <span className="text-xs text-zinc-300 font-semibold">{text}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="relative border-t border-zinc-800/60 px-7 py-5">
            {userEmail && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800/60">
                <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <p className="text-[11px] text-zinc-400 font-semibold truncate">
                  Upgrading account: <span className="text-white">{userEmail}</span>
                </p>
              </div>
            )}
            <button
              onClick={onUpgrade}
              className="btn-primary w-full text-base py-4 shadow-glow-orange"
            >
              <Crown className="w-5 h-5" />
              Upgrade to PRO — ₹499/mo
              <ChevronRight className="w-4 h-4 ml-auto" />
            </button>
            <p className="text-center text-[10px] text-zinc-600 mt-3 font-semibold">
              Demo mode · No real money charged · Instant access
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-600">
          <Shield className="w-3 h-3 inline mr-1 text-zinc-500" />
          This is a demo app. All payments are simulated and completely safe.
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MOCK PAYMENT
══════════════════════════════════════════════════════════════════ */
const CARD_REGEX = {
  number: /^\d{16}$/,
  expiry: /^(0[1-9]|1[0-2])\/\d{2}$/,
  cvv:    /^\d{3,4}$/,
};

function formatCardNumber(v) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(v) {
  const digits = v.replace(/\D/g, '').slice(0, 4);
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

function MockPayment({ onSuccess, onBack }) {
  const [tab,     setTab]     = useState('upi'); // 'upi' | 'card'
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [card,    setCard]    = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [errors,  setErrors]  = useState({});
  const [upiWait, setUpiWait] = useState(false);

  /* ── UPI flow ── */
  const handleUpiPaid = () => {
    setUpiWait(true);
    setTimeout(() => { setDone(true); setTimeout(() => onSuccess('upi'), 1800); }, 2500);
  };

  /* ── Card validation ── */
  const validateCard = () => {
    const e = {};
    if (!CARD_REGEX.number.test(card.number.replace(/\s/g, ''))) e.number = 'Enter a valid 16-digit card number';
    if (!CARD_REGEX.expiry.test(card.expiry))                    e.expiry = 'Enter expiry as MM/YY';
    if (!CARD_REGEX.cvv.test(card.cvv))                          e.cvv    = 'CVV must be 3 or 4 digits';
    if (!card.name.trim())                                       e.name   = 'Enter name on card';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCardPay = (e) => {
    e.preventDefault();
    if (!validateCard()) return;
    setLoading(true);
    setTimeout(() => { setDone(true); setTimeout(() => onSuccess('card'), 1800); }, 2800);
  };

  if (done) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="glass rounded-3xl border border-green-500/30 p-10 text-center max-w-sm w-full animate-scale-in">
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Payment Successful 🎉</h2>
          <p className="text-zinc-400 text-sm mb-1">(Demo Mode)</p>
          <p className="text-zinc-500 text-xs">Unlocking your PRO access…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-slide-up">

        {/* Back */}
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-semibold mb-5 transition-colors">
          <X className="w-4 h-4" /> Cancel
        </button>

        {/* Demo warning banner */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-5">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300 font-semibold">
            DEMO MODE — No real money is charged. This is a simulation only.
          </p>
        </div>

        <div className="glass rounded-3xl border border-zinc-800/60 overflow-hidden">
          {/* Title */}
          <div className="px-6 py-5 border-b border-zinc-800/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center">
              <Crown className="w-4.5 h-4.5 text-brand-orange" />
            </div>
            <div>
              <p className="text-sm font-black text-white">FitTrack AI PRO</p>
              <p className="text-[10px] text-zinc-500">₹499 / month · Nutrition Planner Access</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-zinc-800/60">
            {[{ id: 'upi', label: 'UPI / QR', icon: Smartphone }, { id: 'card', label: 'Debit / Credit Card', icon: CreditCard }].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-bold transition-all ${tab === id ? 'text-brand-orange border-b-2 border-brand-orange bg-brand-orange/5' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          {/* UPI tab */}
          {tab === 'upi' && (
            <div className="p-6 text-center space-y-5">
              {/* QR */}
              <div className="relative inline-block">
                <div className="w-48 h-48 rounded-2xl overflow-hidden border-2 border-brand-orange/40 shadow-glow-orange mx-auto">
                  <img src={DEMO_QR} alt="Demo UPI QR" className="w-full h-full" />
                </div>
                {/* DEMO watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-black text-white/20 rotate-[-30deg] text-center leading-tight tracking-widest uppercase">
                    DEMO<br />NOT REAL
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-black text-white">Scan with any UPI app</p>
                <p className="text-[10px] text-zinc-500 mt-1">GPay · PhonePe · Paytm · BHIM</p>
                <p className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-400">
                  ⚠️ DEMO UPI PAYMENT – NOT REAL
                </p>
              </div>

              <div className="font-mono text-sm text-brand-orange bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5">
                fittrack-demo@upi
              </div>

              {upiWait ? (
                <div className="flex items-center justify-center gap-3 text-zinc-400 text-sm font-semibold py-2">
                  <Loader2 className="w-5 h-5 animate-spin text-brand-orange" />
                  Verifying payment…
                </div>
              ) : (
                <button onClick={handleUpiPaid} className="btn-primary w-full">
                  <CheckCircle className="w-4 h-4" /> I Have Paid
                </button>
              )}
            </div>
          )}

          {/* Card tab */}
          {tab === 'card' && (
            <form onSubmit={handleCardPay} className="p-6 space-y-4">
              {/* Card number */}
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">Card Number</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="1234 5678 9012 3456"
                  value={card.number}
                  onChange={(e) => setCard(p => ({ ...p, number: formatCardNumber(e.target.value) }))}
                  className={`input-field ${errors.number ? 'border-red-500/50' : ''}`}
                  maxLength={19}
                />
                {errors.number && <p className="text-[10px] text-red-400 mt-1 font-semibold">{errors.number}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Expiry */}
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">Expiry (MM/YY)</label>
                  <input
                    type="text"
                    placeholder="08/27"
                    value={card.expiry}
                    onChange={(e) => setCard(p => ({ ...p, expiry: formatExpiry(e.target.value) }))}
                    className={`input-field ${errors.expiry ? 'border-red-500/50' : ''}`}
                    maxLength={5}
                  />
                  {errors.expiry && <p className="text-[10px] text-red-400 mt-1 font-semibold">{errors.expiry}</p>}
                </div>
                {/* CVV */}
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">CVV</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    placeholder="•••"
                    value={card.cvv}
                    onChange={(e) => setCard(p => ({ ...p, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    className={`input-field ${errors.cvv ? 'border-red-500/50' : ''}`}
                    maxLength={4}
                  />
                  {errors.cvv && <p className="text-[10px] text-red-400 mt-1 font-semibold">{errors.cvv}</p>}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">Name on Card</label>
                <input
                  type="text"
                  placeholder="RAHUL SHARMA"
                  value={card.name}
                  onChange={(e) => setCard(p => ({ ...p, name: e.target.value }))}
                  className={`input-field ${errors.name ? 'border-red-500/50' : ''}`}
                />
                {errors.name && <p className="text-[10px] text-red-400 mt-1 font-semibold">{errors.name}</p>}
              </div>

              {loading ? (
                <div className="flex items-center justify-center gap-3 py-4 text-zinc-400 text-sm font-semibold">
                  <Loader2 className="w-5 h-5 animate-spin text-brand-orange" />
                  Processing payment…
                </div>
              ) : (
                <button type="submit" className="btn-primary w-full">
                  <CreditCard className="w-4 h-4" /> Pay ₹499 (Demo)
                </button>
              )}

              <p className="text-center text-[10px] text-zinc-600 font-semibold">
                🔒 Demo only — no real transaction occurs
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   NUTRITION FORM
══════════════════════════════════════════════════════════════════ */
const MEAL_EMOJIS = { Breakfast: '🌅', Lunch: '☀️', Dinner: '🌙', Snacks: '🍎' };
const GOAL_COLORS = {
  'fat-loss':    'text-red-400 border-red-500/30 bg-red-500/10',
  'muscle':      'text-blue-400 border-blue-500/30 bg-blue-500/10',
  'maintenance': 'text-green-400 border-green-500/30 bg-green-500/10',
};

function MacroPill({ label, value, unit, color }) {
  return (
    <div className={`glass rounded-2xl p-4 text-center border ${color}`}>
      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-black text-white">{value}<span className="text-sm font-bold text-zinc-500 ml-1">{unit}</span></p>
    </div>
  );
}

function MealCard({ meal }) {
  const emoji = MEAL_EMOJIS[meal.meal] ?? '🍽️';
  return (
    <div className="glass rounded-2xl border border-zinc-800/60 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{emoji}</span>
          <div>
            <p className="text-sm font-black text-white">{meal.meal}</p>
            <p className="text-[10px] text-zinc-500 font-semibold">{meal.notes}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-black text-brand-orange">{meal.calories} kcal</p>
          <p className="text-[10px] text-zinc-500">{meal.protein}g protein</p>
        </div>
      </div>
      <ul className="space-y-1.5 mt-3 border-t border-zinc-800/40 pt-3">
        {meal.items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-xs text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-orange/60 shrink-0 mt-1.5" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   GENERATING STATE (AI LOADING SCREEN)
══════════════════════════════════════════════════════════════════ */
function GeneratingPlan({ isRegenerating = false }) {
  const [stepIndex, setStepIndex] = useState(0);
  const steps = [
    'Calculating Basal Metabolic Rate (BMR) & Daily Expenditure...',
    'Calibrating targeted calorie deficit/surplus & macros...',
    'Consulting Gemini AI for customized recipes & exact portions...',
    'Formulating workout-timed nutrition tips for your goal...',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="glass rounded-3xl border border-brand-orange/30 p-8 sm:p-12 text-center max-w-md w-full animate-scale-in relative overflow-hidden shadow-glow-orange">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-orange/10 via-transparent to-amber-500/5 pointer-events-none" />

        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-orange to-amber-500 flex items-center justify-center shadow-glow-orange">
            <Sparkles className="w-10 h-10 text-white animate-pulse" />
          </div>
          <div className="absolute inset-0 bg-brand-orange/30 rounded-3xl blur-xl animate-pulse" />
        </div>

        <h2 className="text-2xl font-black text-white mb-2">
          {isRegenerating ? 'Generating AI Variation' : 'Crafting Your AI Meal Plan'}
        </h2>
        <p className="text-zinc-400 text-xs font-semibold mb-6">
          Personalized to your exact calorie target, metabolism & dietary preferences
        </p>

        <div className="flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-xs text-brand-orange font-bold">
          <Loader2 className="w-4 h-4 animate-spin shrink-0 text-brand-orange" />
          <span className="transition-opacity duration-300">{steps[stepIndex]}</span>
        </div>
      </div>
    </div>
  );
}

function NutritionForm({ onGenerate }) {
  const user = getCurrentUser();
  const [form, setForm] = useState({
    height:   user?.height || '',
    weight:   user?.weight || '',
    age:      user?.age    || '',
    gender:   'male',
    goal:     'fat-loss',
    activity: 'medium',
    diet:     'non-veg',
  });
  const [errors, setErrors] = useState({});

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: '' })); };

  const validate = () => {
    const e = {};
    if (!form.height || isNaN(form.height) || form.height < 100 || form.height > 250)
      e.height = 'Enter height between 100–250 cm';
    if (!form.weight || isNaN(form.weight) || form.weight < 30 || form.weight > 300)
      e.weight = 'Enter weight between 30–300 kg';
    if (!form.age    || isNaN(form.age)    || form.age < 10    || form.age > 100)
      e.age    = 'Enter age between 10–100';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onGenerate({
      height:   Number(form.height),
      weight:   Number(form.weight),
      age:      Number(form.age),
      gender:   form.gender,
      goal:     form.goal,
      activity: form.activity,
      diet:     form.diet,
    });
  };

  const Select = ({ label, name, options, value, onChange }) => (
    <div>
      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">{label}</label>
      <select
        className="input-field"
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
      >
        {options.map(({ value: v, label: l }) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="page pb-24 md:pb-8">
      <div className="content-width max-w-xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-orange to-amber-500 flex items-center justify-center shadow-glow-orange">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="section-title">AI Nutrition <span className="text-gradient">Planner</span></h1>
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mt-0.5">
              <Crown className="w-3 h-3 inline text-brand-orange mr-1" />PRO Feature · Personalised meal planning
            </p>
          </div>
        </div>

        {/* PRO badge */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-brand-orange/10 border border-brand-orange/20">
          <Crown className="w-4 h-4 text-brand-orange shrink-0" />
          <p className="text-xs text-zinc-300 font-semibold">
            You have <span className="text-brand-orange font-black">PRO access</span>. Fill in your details to generate your personalised plan.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass rounded-3xl border border-zinc-800/60 p-6 space-y-5">
          <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Your Body Stats</h2>

          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'height', label: 'Height (cm)', placeholder: '175' },
              { key: 'weight', label: 'Weight (kg)', placeholder: '70' },
              { key: 'age',    label: 'Age',          placeholder: '25' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">{label}</label>
                <input
                  type="number"
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={placeholder}
                  className={`input-field ${errors[key] ? 'border-red-500/50' : ''}`}
                />
                {errors[key] && <p className="text-[10px] text-red-400 mt-1 font-semibold">{errors[key]}</p>}
              </div>
            ))}
          </div>

          <Select
            label="Gender"
            name="gender"
            value={form.gender}
            onChange={set}
            options={[{ value: 'male', label: '👨 Male' }, { value: 'female', label: '👩 Female' }, { value: 'other', label: '🧑 Prefer not to say' }]}
          />

          <Select
            label="Fitness Goal"
            name="goal"
            value={form.goal}
            onChange={set}
            options={[
              { value: 'fat-loss',    label: '🔥 Fat Loss — Calorie Deficit' },
              { value: 'muscle',      label: '💪 Muscle Gain — Calorie Surplus' },
              { value: 'maintenance', label: '⚖️  Maintenance — Stay the Same' },
            ]}
          />

          <Select
            label="Dietary Preference"
            name="diet"
            value={form.diet}
            onChange={set}
            options={[
              { value: 'non-veg',    label: '🍗 Non-Vegetarian (Chicken, Fish, Eggs, Meat)' },
              { value: 'veg',        label: '🥗 Vegetarian (Paneer, Tofu, Legumes, Dairy)' },
              { value: 'eggetarian', label: '🥚 Eggetarian (Eggs + Vegetarian Foods)' },
              { value: 'vegan',      label: '🌱 Vegan (100% Plant-Based, No Dairy/Eggs)' },
            ]}
          />

          <Select
            label="Activity Level"
            name="activity"
            value={form.activity}
            onChange={set}
            options={[
              { value: 'low',    label: '🚶 Low — Desk job, minimal exercise' },
              { value: 'medium', label: '🏃 Medium — Exercise 3–5 days/week' },
              { value: 'high',   label: '🔥 High — Hard training 6–7 days/week' },
            ]}
          />

          <button type="submit" className="btn-primary w-full py-4 text-base shadow-glow-orange">
            <Sparkles className="w-5 h-5" /> Generate My AI Meal Plan
          </button>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   RESULTS
══════════════════════════════════════════════════════════════════ */
function NutritionResults({ plan, onReset, onRegenerate, isRegenerating }) {
  const goalColorClass = GOAL_COLORS[plan.goal] ?? GOAL_COLORS.maintenance;

  return (
    <div className="page pb-24 md:pb-8">
      <div className="content-width max-w-2xl space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="section-title">Your <span className="text-gradient">Meal Plan</span></h1>
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mt-1">
              AI-generated · calibrated for your metabolism
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="btn-primary text-xs px-3.5 py-2.5 flex items-center gap-1.5 shadow-glow-orange"
              title="Generate a fresh variation with AI"
            >
              {isRegenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>New AI Plan</span>
            </button>
            <button
              onClick={onReset}
              className="btn-secondary text-xs px-3.5 py-2.5 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Recalculate
            </button>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${goalColorClass}`}>
            {GOAL_LABELS[plan.goal] || plan.goal}
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 text-xs font-semibold text-zinc-300">
            {DIET_LABELS[plan.diet] || plan.diet}
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 text-xs font-semibold text-zinc-400">
            {ACTIVITY_LABELS[plan.activity]?.split('(')[0]?.trim() || plan.activity}
          </div>
          {plan.isAiGenerated ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-orange/15 border border-brand-orange/30 text-xs font-bold text-brand-orange">
              <Sparkles className="w-3.5 h-3.5" /> AI Custom Plan
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-xs font-semibold text-zinc-400">
              <Zap className="w-3.5 h-3.5 text-brand-orange" /> Smart Calorie Engine
            </div>
          )}
        </div>

        {/* Calorie target hero */}
        <div className="glass rounded-3xl border border-brand-orange/30 p-7 text-center relative overflow-hidden shadow-glow-orange">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-orange/10 via-transparent to-amber-500/5 pointer-events-none" />
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Daily Calorie Target</p>
          <p className="text-6xl font-black text-white">{plan.calories.toLocaleString()}</p>
          <p className="text-brand-orange font-black text-lg mt-1">kcal / day</p>

          {/* Breakdown cards */}
          <div className="grid grid-cols-3 gap-2 mt-6 pt-5 border-t border-zinc-800/80 max-w-lg mx-auto">
            <div className="text-center px-2 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800/50">
              <p className="text-[10px] text-zinc-500 font-bold uppercase">Basal BMR</p>
              <p className="text-sm font-black text-white mt-0.5">
                {plan.bmr || Math.round(plan.tdee / 1.55)} <span className="text-[10px] font-normal text-zinc-500">kcal</span>
              </p>
            </div>
            <div className="text-center px-2 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800/50">
              <p className="text-[10px] text-zinc-500 font-bold uppercase">Daily TDEE</p>
              <p className="text-sm font-black text-white mt-0.5">
                {plan.tdee} <span className="text-[10px] font-normal text-zinc-500">kcal</span>
              </p>
            </div>
            <div className="text-center px-2 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800/50">
              <p className="text-[10px] text-zinc-500 font-bold uppercase">Strategy</p>
              <p className={`text-sm font-black mt-0.5 ${
                plan.goal === 'fat-loss' ? 'text-red-400' : plan.goal === 'muscle' ? 'text-blue-400' : 'text-green-400'
              }`}>
                {plan.goal === 'fat-loss' ? `-${Math.abs(plan.adjustment || (plan.tdee - plan.calories))} kcal` :
                 plan.goal === 'muscle' ? `+${Math.abs(plan.adjustment || (plan.calories - plan.tdee))} kcal` : 'Maintenance'}
              </p>
            </div>
          </div>
        </div>

        {/* Macros */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Daily Macro Targets</h2>
            <span className="text-[11px] text-zinc-500 font-semibold">Total Target: {plan.calories} kcal</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MacroPill label="Protein"  value={plan.protein} unit="g" color="border-blue-500/30"   />
            <MacroPill label="Carbs"    value={plan.carbs}   unit="g" color="border-amber-500/30"  />
            <MacroPill label="Fat"      value={plan.fat}     unit="g" color="border-red-500/30"    />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500 mt-2.5 px-1 font-semibold">
            <span>
              Protein target: <span className="text-zinc-300 font-bold">{plan.protein}g/day</span> (~{Math.round((plan.protein * 4 / plan.calories) * 100)}% of intake)
            </span>
            <span>
              Hydration: <span className="text-blue-400 font-bold">{((plan.weight || 70) * 0.035).toFixed(1)}L water daily</span>
            </span>
          </div>
        </div>

        {/* Meal plan */}
        <div>
          <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Full Day Meal Plan</h2>
          <div className="space-y-3">
            {plan.meals.map((meal) => (
              <MealCard key={meal.meal} meal={meal} />
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="glass rounded-3xl border border-zinc-800/60 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-brand-orange" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">Targeted Nutrition & Workout Tips</h2>
              <p className="text-[10px] text-zinc-500 font-semibold">Customized to your {plan.calories} kcal target</p>
            </div>
          </div>
          <ul className="space-y-2.5">
            {plan.tips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm text-zinc-300">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-orange/60 shrink-0 mt-2" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] text-zinc-600 text-center leading-relaxed px-4">
          ⚠️ This plan is generated dynamically based on standard nutritional formulas (Mifflin-St Jeor). It is for informational and educational purposes only and not a substitute for clinical advice from a medical professional.
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ROOT COMPONENT
══════════════════════════════════════════════════════════════════ */
export default function NutritionPlanner() {
  // ── Resolve current user for per-account PRO checks ──────────────────────
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());

  // Re-read user on auth changes (e.g. after upgradeUserToPro syncs the object)
  useEffect(() => {
    const onAuth = (e) => setCurrentUser(e.detail);
    window.addEventListener('fittrack_auth_updated', onAuth);
    return () => window.removeEventListener('fittrack_auth_updated', onAuth);
  }, []);

  const userId = currentUser?.id;

  // isProUser is scoped per userId — User B never inherits User A's PRO status
  const [pro,    setPro]    = useState(() => isProUser(userId));
  const [screen, setScreen] = useState(() => isProUser(userId) ? 'form' : 'paywall');
  // 'paywall' | 'payment' | 'form' | 'generating' | 'results'
  const [plan,            setPlan]            = useState(null);
  const [lastInputs,      setLastInputs]      = useState(null);
  const [variationCount,  setVariationCount]  = useState(0);
  const [isRegenerating,  setIsRegenerating]  = useState(false);

  // Keep PRO state in sync when payment completes or another tab grants it
  useEffect(() => {
    const handler = () => {
      const nowPro = isProUser(userId);
      setPro(nowPro);
      if (nowPro && screen === 'paywall') setScreen('form');
    };
    window.addEventListener('fittrack_pro_updated', handler);
    // Also re-check when the session is restored (login switch)
    window.addEventListener('fittrack_session_loaded', handler);
    return () => {
      window.removeEventListener('fittrack_pro_updated', handler);
      window.removeEventListener('fittrack_session_loaded', handler);
    };
  }, [screen, userId]);

  const handleUpgradeClick = () => {
    logEvent('pro_purchase_attempt', { userId });
    setScreen('payment');
  };

  const handlePaymentSuccess = useCallback((method) => {
    // Grant PRO for THIS specific user account only
    grantProAccess(method, userId);
    setPro(true);
    setScreen('form');
  }, [userId]);

  const handleGenerate = async (inputs) => {
    setLastInputs(inputs);
    setVariationCount(0);
    setScreen('generating');
    try {
      const result = await generateAiNutritionPlan(inputs, 0);
      setPlan(result);
      setScreen('results');
      logEvent('nutrition_plan_generated', { goal: inputs.goal, activity: inputs.activity, diet: inputs.diet });
      if (result?.calories) {
        logEvent('calorie_logged', { calories: result.calories, type: 'target' });
      }
    } catch (err) {
      console.error('Error generating nutrition plan:', err);
      const fallback = generateNutritionPlan(inputs, 0);
      setPlan(fallback);
      setScreen('results');
    }
  };

  const handleRegenerate = async () => {
    if (!lastInputs) return;
    const nextVar = variationCount + 1;
    setVariationCount(nextVar);
    setIsRegenerating(true);
    try {
      const result = await generateAiNutritionPlan(lastInputs, nextVar);
      setPlan(result);
    } catch (err) {
      console.error('Error regenerating nutrition plan:', err);
      const fallback = generateNutritionPlan(lastInputs, nextVar);
      setPlan(fallback);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleReset = () => {
    setPlan(null);
    setScreen('form');
  };

  if (screen === 'paywall') return <Paywall onUpgrade={handleUpgradeClick} userEmail={currentUser?.email} />;
  if (screen === 'payment') return <MockPayment onSuccess={handlePaymentSuccess} onBack={() => setScreen('paywall')} />;
  if (screen === 'generating') return <GeneratingPlan isRegenerating={Boolean(plan)} />;
  if (screen === 'results' && plan) {
    return (
      <NutritionResults
        plan={plan}
        onReset={handleReset}
        onRegenerate={handleRegenerate}
        isRegenerating={isRegenerating}
      />
    );
  }
  return <NutritionForm onGenerate={handleGenerate} />;
}
