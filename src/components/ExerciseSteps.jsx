import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────
   SVG ILLUSTRATIONS — inline, theme-aware, no external assets
───────────────────────────────────────────────────────────────── */

/* shared palette */
const C = {
  skin:   '#fbbf80',
  body:   '#f97316',
  dark:   '#ea580c',
  floor:  '#3f3f46',
  shadow: 'rgba(249,115,22,0.18)',
  line:   '#52525b',
  text:   '#a1a1aa',
};

/* ── PUSH-UP ILLUSTRATIONS ────────────────────────────────────── */

const PushupStep1 = () => (
  <svg viewBox="0 0 220 140" className="w-full h-full" aria-label="Push-up start — high plank">
    <rect width="220" height="140" fill="#111113" rx="12"/>
    {/* floor */}
    <line x1="20" y1="110" x2="200" y2="110" stroke={C.floor} strokeWidth="2.5" strokeLinecap="round"/>
    {/* shadow */}
    <ellipse cx="110" cy="112" rx="70" ry="5" fill={C.shadow}/>
    {/* body — straight plank */}
    <line x1="55" y1="78" x2="175" y2="78" stroke={C.body} strokeWidth="7" strokeLinecap="round"/>
    {/* left arm straight down */}
    <line x1="65" y1="78" x2="65" y2="108" stroke={C.body} strokeWidth="6" strokeLinecap="round"/>
    <circle cx="65" cy="110" r="5" fill={C.dark}/>
    {/* right arm straight down */}
    <line x1="155" y1="78" x2="155" y2="108" stroke={C.body} strokeWidth="6" strokeLinecap="round"/>
    <circle cx="155" cy="110" r="5" fill={C.dark}/>
    {/* legs */}
    <line x1="175" y1="78" x2="175" y2="108" stroke={C.body} strokeWidth="6" strokeLinecap="round"/>
    <circle cx="175" cy="110" r="4" fill={C.dark}/>
    {/* head */}
    <circle cx="48" cy="75" r="12" fill={C.skin} stroke={C.dark} strokeWidth="1.5"/>
    {/* angle indicator */}
    <path d="M65 78 L65 108 L95 78" fill="none" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 2"/>
    <text x="80" y="97" fontSize="8" fill="#22c55e" fontWeight="bold">180°</text>
    {/* label */}
    <text x="110" y="128" textAnchor="middle" fontSize="9" fill={C.text} fontWeight="600">Arms fully extended</text>
  </svg>
);

const PushupStep2 = () => (
  <svg viewBox="0 0 220 140" className="w-full h-full" aria-label="Push-up mid descent">
    <rect width="220" height="140" fill="#111113" rx="12"/>
    <line x1="20" y1="110" x2="200" y2="110" stroke={C.floor} strokeWidth="2.5" strokeLinecap="round"/>
    <ellipse cx="110" cy="112" rx="68" ry="4" fill={C.shadow}/>
    {/* body — slight diagonal as going down */}
    <line x1="55" y1="72" x2="175" y2="82" stroke={C.body} strokeWidth="7" strokeLinecap="round"/>
    {/* left arm — elbow bent ~120° */}
    <line x1="65" y1="74" x2="65" y2="93" stroke={C.body} strokeWidth="6" strokeLinecap="round"/>
    <line x1="65" y1="93" x2="65" y2="108" stroke={C.body} strokeWidth="6" strokeLinecap="round"/>
    <circle cx="65" cy="93" r="4" fill="#f59e0b"/>
    <circle cx="65" cy="110" r="5" fill={C.dark}/>
    {/* right arm — elbow bent */}
    <line x1="155" y1="82" x2="155" y2="97" stroke={C.body} strokeWidth="6" strokeLinecap="round"/>
    <line x1="155" y1="97" x2="155" y2="108" stroke={C.body} strokeWidth="5" strokeLinecap="round"/>
    <circle cx="155" cy="97" r="4" fill="#f59e0b"/>
    <circle cx="155" cy="110" r="5" fill={C.dark}/>
    {/* legs */}
    <line x1="175" y1="82" x2="175" y2="108" stroke={C.body} strokeWidth="6" strokeLinecap="round"/>
    <circle cx="175" cy="110" r="4" fill={C.dark}/>
    {/* head lower */}
    <circle cx="48" cy="70" r="12" fill={C.skin} stroke={C.dark} strokeWidth="1.5"/>
    {/* elbow label */}
    <text x="75" y="91" fontSize="8" fill="#f59e0b" fontWeight="bold">~120°</text>
    <text x="110" y="128" textAnchor="middle" fontSize="9" fill={C.text} fontWeight="600">Elbows start bending</text>
  </svg>
);

const PushupStep3 = () => (
  <svg viewBox="0 0 220 140" className="w-full h-full" aria-label="Push-up bottom position">
    <rect width="220" height="140" fill="#111113" rx="12"/>
    <line x1="20" y1="110" x2="200" y2="110" stroke={C.floor} strokeWidth="2.5" strokeLinecap="round"/>
    <ellipse cx="110" cy="112" rx="70" ry="4" fill="rgba(249,115,22,0.28)"/>
    {/* body very low */}
    <line x1="55" y1="68" x2="175" y2="78" stroke={C.body} strokeWidth="7" strokeLinecap="round"/>
    {/* left arm — sharply bent ~70° */}
    <line x1="65" y1="70" x2="55" y2="88" stroke={C.body} strokeWidth="6" strokeLinecap="round"/>
    <line x1="55" y1="88" x2="65" y2="108" stroke={C.body} strokeWidth="6" strokeLinecap="round"/>
    <circle cx="55" cy="88" r="5" fill="#ef4444"/>
    <circle cx="65" cy="110" r="5" fill={C.dark}/>
    {/* right arm */}
    <line x1="155" y1="78" x2="148" y2="94" stroke={C.body} strokeWidth="6" strokeLinecap="round"/>
    <line x1="148" y1="94" x2="155" y2="108" stroke={C.body} strokeWidth="5" strokeLinecap="round"/>
    <circle cx="148" cy="94" r="5" fill="#ef4444"/>
    <circle cx="155" cy="110" r="5" fill={C.dark}/>
    {/* legs */}
    <line x1="175" y1="78" x2="175" y2="108" stroke={C.body} strokeWidth="6" strokeLinecap="round"/>
    <circle cx="175" cy="110" r="4" fill={C.dark}/>
    {/* head near ground */}
    <circle cx="46" cy="65" r="12" fill={C.skin} stroke={C.dark} strokeWidth="1.5"/>
    {/* chest-to-floor gap indicator */}
    <line x1="110" y1="73" x2="110" y2="110" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 2"/>
    <text x="118" y="95" fontSize="7" fill="#22c55e" fontWeight="bold">~2cm</text>
    <text x="44" y="86" fontSize="8" fill="#ef4444" fontWeight="bold">70°</text>
    <text x="110" y="128" textAnchor="middle" fontSize="9" fill={C.text} fontWeight="600">Chest near floor · full depth</text>
  </svg>
);

const PushupStep4 = () => (
  <svg viewBox="0 0 220 140" className="w-full h-full" aria-label="Push-up ascent">
    <rect width="220" height="140" fill="#111113" rx="12"/>
    <line x1="20" y1="110" x2="200" y2="110" stroke={C.floor} strokeWidth="2.5" strokeLinecap="round"/>
    <ellipse cx="110" cy="112" rx="68" ry="4" fill={C.shadow}/>
    {/* body rising */}
    <line x1="55" y1="72" x2="175" y2="80" stroke={C.body} strokeWidth="7" strokeLinecap="round"/>
    {/* arms partially extended */}
    <line x1="65" y1="74" x2="65" y2="96" stroke={C.body} strokeWidth="6" strokeLinecap="round"/>
    <line x1="65" y1="96" x2="65" y2="108" stroke={C.body} strokeWidth="6" strokeLinecap="round"/>
    <circle cx="65" cy="96" r="4" fill="#f59e0b"/>
    <circle cx="65" cy="110" r="5" fill={C.dark}/>
    <line x1="155" y1="80" x2="155" y2="98" stroke={C.body} strokeWidth="6" strokeLinecap="round"/>
    <line x1="155" y1="98" x2="155" y2="108" stroke={C.body} strokeWidth="5" strokeLinecap="round"/>
    <circle cx="155" cy="98" r="4" fill="#f59e0b"/>
    <circle cx="155" cy="110" r="5" fill={C.dark}/>
    <line x1="175" y1="80" x2="175" y2="108" stroke={C.body} strokeWidth="6" strokeLinecap="round"/>
    <circle cx="175" cy="110" r="4" fill={C.dark}/>
    <circle cx="48" cy="70" r="12" fill={C.skin} stroke={C.dark} strokeWidth="1.5"/>
    {/* upward arrow */}
    <path d="M108 60 L108 48 M104 52 L108 48 L112 52" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" fill="none"/>
    <text x="110" y="128" textAnchor="middle" fontSize="9" fill={C.text} fontWeight="600">Drive up — exhale</text>
  </svg>
);

const PushupStep5 = () => (
  <svg viewBox="0 0 220 140" className="w-full h-full" aria-label="Push-up full rep complete">
    <rect width="220" height="140" fill="#111113" rx="12"/>
    <line x1="20" y1="110" x2="200" y2="110" stroke={C.floor} strokeWidth="2.5" strokeLinecap="round"/>
    <ellipse cx="110" cy="112" rx="70" ry="5" fill={C.shadow}/>
    {/* body straight — back to top */}
    <line x1="55" y1="78" x2="175" y2="78" stroke={C.body} strokeWidth="7" strokeLinecap="round"/>
    <line x1="65" y1="78" x2="65" y2="108" stroke={C.body} strokeWidth="6" strokeLinecap="round"/>
    <circle cx="65" cy="110" r="5" fill={C.dark}/>
    <line x1="155" y1="78" x2="155" y2="108" stroke={C.body} strokeWidth="6" strokeLinecap="round"/>
    <circle cx="155" cy="110" r="5" fill={C.dark}/>
    <line x1="175" y1="78" x2="175" y2="108" stroke={C.body} strokeWidth="6" strokeLinecap="round"/>
    <circle cx="175" cy="110" r="4" fill={C.dark}/>
    <circle cx="48" cy="75" r="12" fill={C.skin} stroke={C.dark} strokeWidth="1.5"/>
    {/* checkmark */}
    <circle cx="110" cy="52" r="14" fill="rgba(34,197,94,0.15)" stroke="#22c55e" strokeWidth="1.5"/>
    <path d="M103 52 L108 57 L118 47" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    <text x="110" y="128" textAnchor="middle" fontSize="9" fill="#22c55e" fontWeight="700">1 Rep Complete ✓</text>
  </svg>
);

/* ── SQUAT ILLUSTRATIONS ──────────────────────────────────────── */

const SC = { body: '#3b82f6', dark: '#1d4ed8', skin: '#fbbf80', floor: '#3f3f46', shadow: 'rgba(59,130,246,0.18)', text: '#a1a1aa' };

const SquatStep1 = () => (
  <svg viewBox="0 0 220 150" className="w-full h-full" aria-label="Squat start — standing">
    <rect width="220" height="150" fill="#111113" rx="12"/>
    <line x1="40" y1="125" x2="180" y2="125" stroke={SC.floor} strokeWidth="2.5" strokeLinecap="round"/>
    <ellipse cx="110" cy="127" rx="35" ry="5" fill={SC.shadow}/>
    {/* left leg straight */}
    <line x1="100" y1="90" x2="95" y2="125" stroke={SC.body} strokeWidth="7" strokeLinecap="round"/>
    <circle cx="95" cy="126" r="5" fill={SC.dark}/>
    {/* right leg straight */}
    <line x1="120" y1="90" x2="125" y2="125" stroke={SC.body} strokeWidth="7" strokeLinecap="round"/>
    <circle cx="125" cy="126" r="5" fill={SC.dark}/>
    {/* torso */}
    <line x1="110" y1="55" x2="110" y2="90" stroke={SC.body} strokeWidth="8" strokeLinecap="round"/>
    {/* arms out for balance */}
    <line x1="110" y1="65" x2="82" y2="80" stroke={SC.body} strokeWidth="5" strokeLinecap="round"/>
    <line x1="110" y1="65" x2="138" y2="80" stroke={SC.body} strokeWidth="5" strokeLinecap="round"/>
    {/* head */}
    <circle cx="110" cy="43" r="13" fill={SC.skin} stroke={SC.dark} strokeWidth="1.5"/>
    {/* shoulder-width arrow */}
    <line x1="95" y1="136" x2="125" y2="136" stroke="#a1a1aa" strokeWidth="1" strokeDasharray="2 2"/>
    <line x1="95" y1="132" x2="95" y2="140"/>
    <line x1="125" y1="132" x2="125" y2="140" stroke="#a1a1aa" strokeWidth="1"/>
    <text x="110" y="146" textAnchor="middle" fontSize="7" fill="#a1a1aa">shoulder-width</text>
    <text x="110" y="14" textAnchor="middle" fontSize="9" fill={SC.text} fontWeight="600">Stand tall · core braced</text>
  </svg>
);

const SquatStep2 = () => (
  <svg viewBox="0 0 220 150" className="w-full h-full" aria-label="Squat half descent">
    <rect width="220" height="150" fill="#111113" rx="12"/>
    <line x1="40" y1="125" x2="180" y2="125" stroke={SC.floor} strokeWidth="2.5" strokeLinecap="round"/>
    <ellipse cx="110" cy="127" rx="38" ry="5" fill={SC.shadow}/>
    {/* legs — knee slightly bent */}
    <line x1="100" y1="97" x2="94" y2="112" stroke={SC.body} strokeWidth="7" strokeLinecap="round"/>
    <line x1="94" y1="112" x2="93" y2="125" stroke={SC.body} strokeWidth="7" strokeLinecap="round"/>
    <circle cx="94" cy="112" r="5" fill="#f59e0b"/>
    <circle cx="93" cy="126" r="5" fill={SC.dark}/>
    <line x1="120" y1="97" x2="126" y2="112" stroke={SC.body} strokeWidth="7" strokeLinecap="round"/>
    <line x1="126" y1="112" x2="127" y2="125" stroke={SC.body} strokeWidth="7" strokeLinecap="round"/>
    <circle cx="126" cy="112" r="5" fill="#f59e0b"/>
    <circle cx="127" cy="126" r="5" fill={SC.dark}/>
    {/* torso slight lean */}
    <line x1="110" y1="65" x2="110" y2="97" stroke={SC.body} strokeWidth="8" strokeLinecap="round"/>
    {/* arms forward for balance */}
    <line x1="110" y1="72" x2="82" y2="82" stroke={SC.body} strokeWidth="5" strokeLinecap="round"/>
    <line x1="110" y1="72" x2="138" y2="82" stroke={SC.body} strokeWidth="5" strokeLinecap="round"/>
    <circle cx="110" cy="53" r="13" fill={SC.skin} stroke={SC.dark} strokeWidth="1.5"/>
    {/* knee angle label */}
    <text x="78" y="110" fontSize="8" fill="#f59e0b" fontWeight="bold">~120°</text>
    {/* down arrow */}
    <path d="M110 35 L110 46 M106 43 L110 47 L114 43" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <text x="110" y="14" textAnchor="middle" fontSize="9" fill={SC.text} fontWeight="600">Hips back · knees track toes</text>
  </svg>
);

const SquatStep3 = () => (
  <svg viewBox="0 0 220 150" className="w-full h-full" aria-label="Squat deep position">
    <rect width="220" height="150" fill="#111113" rx="12"/>
    <line x1="40" y1="125" x2="180" y2="125" stroke={SC.floor} strokeWidth="2.5" strokeLinecap="round"/>
    <ellipse cx="110" cy="127" rx="45" ry="5" fill="rgba(59,130,246,0.25)"/>
    {/* deep squat — thighs parallel */}
    <line x1="104" y1="105" x2="84" y2="112" stroke={SC.body} strokeWidth="7" strokeLinecap="round"/>
    <line x1="84" y1="112" x2="86" y2="125" stroke={SC.body} strokeWidth="7" strokeLinecap="round"/>
    <circle cx="84" cy="112" r="6" fill="#ef4444"/>
    <circle cx="86" cy="126" r="5" fill={SC.dark}/>
    <line x1="116" y1="105" x2="136" y2="112" stroke={SC.body} strokeWidth="7" strokeLinecap="round"/>
    <line x1="136" y1="112" x2="134" y2="125" stroke={SC.body} strokeWidth="7" strokeLinecap="round"/>
    <circle cx="136" cy="112" r="6" fill="#ef4444"/>
    <circle cx="134" cy="126" r="5" fill={SC.dark}/>
    {/* torso upright-ish, hips very low */}
    <line x1="110" y1="82" x2="110" y2="105" stroke={SC.body} strokeWidth="8" strokeLinecap="round"/>
    {/* arms extended forward */}
    <line x1="110" y1="88" x2="80" y2="94" stroke={SC.body} strokeWidth="5" strokeLinecap="round"/>
    <line x1="110" y1="88" x2="140" y2="94" stroke={SC.body} strokeWidth="5" strokeLinecap="round"/>
    <circle cx="110" cy="70" r="13" fill={SC.skin} stroke={SC.dark} strokeWidth="1.5"/>
    {/* parallel line */}
    <line x1="78" y1="107" x2="142" y2="107" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 2"/>
    <text x="148" y="110" fontSize="7" fill="#22c55e" fontWeight="bold">parallel</text>
    <text x="65" y="110" fontSize="8" fill="#ef4444" fontWeight="bold">90°</text>
    <text x="110" y="14" textAnchor="middle" fontSize="9" fill={SC.text} fontWeight="600">Thighs parallel · chest up</text>
  </svg>
);

const SquatStep4 = () => (
  <svg viewBox="0 0 220 150" className="w-full h-full" aria-label="Squat rising">
    <rect width="220" height="150" fill="#111113" rx="12"/>
    <line x1="40" y1="125" x2="180" y2="125" stroke={SC.floor} strokeWidth="2.5" strokeLinecap="round"/>
    <ellipse cx="110" cy="127" rx="38" ry="5" fill={SC.shadow}/>
    {/* mid-rise */}
    <line x1="100" y1="95" x2="94" y2="110" stroke={SC.body} strokeWidth="7" strokeLinecap="round"/>
    <line x1="94" y1="110" x2="93" y2="125" stroke={SC.body} strokeWidth="7" strokeLinecap="round"/>
    <circle cx="94" cy="110" r="5" fill="#f59e0b"/>
    <circle cx="93" cy="126" r="5" fill={SC.dark}/>
    <line x1="120" y1="95" x2="126" y2="110" stroke={SC.body} strokeWidth="7" strokeLinecap="round"/>
    <line x1="126" y1="110" x2="127" y2="125" stroke={SC.body} strokeWidth="7" strokeLinecap="round"/>
    <circle cx="126" cy="110" r="5" fill="#f59e0b"/>
    <circle cx="127" cy="126" r="5" fill={SC.dark}/>
    <line x1="110" y1="63" x2="110" y2="95" stroke={SC.body} strokeWidth="8" strokeLinecap="round"/>
    <line x1="110" y1="72" x2="82" y2="80" stroke={SC.body} strokeWidth="5" strokeLinecap="round"/>
    <line x1="110" y1="72" x2="138" y2="80" stroke={SC.body} strokeWidth="5" strokeLinecap="round"/>
    <circle cx="110" cy="51" r="13" fill={SC.skin} stroke={SC.dark} strokeWidth="1.5"/>
    {/* upward arrow */}
    <path d="M110 32 L110 22 M106 26 L110 22 L114 26" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" fill="none"/>
    <text x="110" y="14" textAnchor="middle" fontSize="9" fill={SC.text} fontWeight="600">Drive through heels · rise</text>
  </svg>
);

const SquatStep5 = () => (
  <svg viewBox="0 0 220 150" className="w-full h-full" aria-label="Squat rep complete">
    <rect width="220" height="150" fill="#111113" rx="12"/>
    <line x1="40" y1="125" x2="180" y2="125" stroke={SC.floor} strokeWidth="2.5" strokeLinecap="round"/>
    <ellipse cx="110" cy="127" rx="35" ry="5" fill={SC.shadow}/>
    {/* back to standing */}
    <line x1="100" y1="90" x2="95" y2="125" stroke={SC.body} strokeWidth="7" strokeLinecap="round"/>
    <circle cx="95" cy="126" r="5" fill={SC.dark}/>
    <line x1="120" y1="90" x2="125" y2="125" stroke={SC.body} strokeWidth="7" strokeLinecap="round"/>
    <circle cx="125" cy="126" r="5" fill={SC.dark}/>
    <line x1="110" y1="55" x2="110" y2="90" stroke={SC.body} strokeWidth="8" strokeLinecap="round"/>
    <line x1="110" y1="65" x2="82" y2="80" stroke={SC.body} strokeWidth="5" strokeLinecap="round"/>
    <line x1="110" y1="65" x2="138" y2="80" stroke={SC.body} strokeWidth="5" strokeLinecap="round"/>
    <circle cx="110" cy="43" r="13" fill={SC.skin} stroke={SC.dark} strokeWidth="1.5"/>
    {/* checkmark */}
    <circle cx="110" cy="22" r="14" fill="rgba(34,197,94,0.15)" stroke="#22c55e" strokeWidth="1.5"/>
    <path d="M103 22 L108 27 L118 17" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    <text x="110" y="138" textAnchor="middle" fontSize="9" fill="#22c55e" fontWeight="700">1 Rep Complete ✓</text>
  </svg>
);

/* ─────────────────────────────────────────────────────────────────
   DATA MAPS
───────────────────────────────────────────────────────────────── */
export const PUSHUP_STEPS = [
  { id: 1, label: 'Start Position',    sub: 'High Plank',        tip: 'Arms locked, core tight, body a straight line',           Illustration: PushupStep1, accent: 'border-zinc-700/60' },
  { id: 2, label: 'Mid Descent',       sub: 'Elbows Bending',    tip: 'Inhale as you lower — controlled movement, ~2 sec down',   Illustration: PushupStep2, accent: 'border-amber-500/30' },
  { id: 3, label: 'Bottom Position',   sub: 'Full Depth',        tip: 'Chest ~2 cm from floor — elbows at 70–90°',               Illustration: PushupStep3, accent: 'border-red-500/30' },
  { id: 4, label: 'Ascent',            sub: 'Pushing Up',        tip: 'Exhale as you push — drive through palms explosively',     Illustration: PushupStep4, accent: 'border-blue-500/30' },
  { id: 5, label: 'Rep Complete',      sub: 'Lock Out',          tip: 'Arms fully extended — 1 rep counted by the AI',           Illustration: PushupStep5, accent: 'border-green-500/30' },
];

export const SQUAT_STEPS = [
  { id: 1, label: 'Standing Start',    sub: 'Feet Shoulder-Width', tip: 'Stand tall, toes slightly out, chest up, core braced',  Illustration: SquatStep1, accent: 'border-zinc-700/60' },
  { id: 2, label: 'Half Descent',      sub: 'Hips Back & Down',   tip: 'Push hips back first, knees track over toes — inhale',   Illustration: SquatStep2, accent: 'border-amber-500/30' },
  { id: 3, label: 'Deep Squat',        sub: 'Thighs Parallel',    tip: 'Knee angle ~90° or lower — keep heels flat on floor',    Illustration: SquatStep3, accent: 'border-red-500/30' },
  { id: 4, label: 'Rising',            sub: 'Drive Through Heels', tip: 'Exhale on the way up — squeeze glutes at the top',      Illustration: SquatStep4, accent: 'border-blue-500/30' },
  { id: 5, label: 'Rep Complete',      sub: 'Full Extension',      tip: 'Back to standing — 1 rep counted by the AI',            Illustration: SquatStep5, accent: 'border-green-500/30' },
];

/* ─────────────────────────────────────────────────────────────────
   STEP CAROUSEL COMPONENT
───────────────────────────────────────────────────────────────── */

/**
 * Horizontal scrollable step-by-step form guide.
 * Props:
 *   steps   — array from PUSHUP_STEPS or SQUAT_STEPS
 *   accent  — tailwind color class for active indicator (optional)
 *   title   — section heading string
 */
export function StepCarousel({ steps, title, accentColor = 'bg-brand-orange' }) {
  const [active, setActive]   = useState(0);
  const trackRef              = useRef(null);
  const cardRefs              = useRef([]);

  /* scroll the active card into view in the dot-nav strip */
  useEffect(() => {
    if (!cardRefs.current[active]) return;
    cardRefs.current[active].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [active]);

  const prev = () => setActive(i => Math.max(0, i - 1));
  const next = () => setActive(i => Math.min(steps.length - 1, i + 1));

  /* touch swipe support */
  const touchStartX = useRef(null);
  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd   = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -40) next();
    else if (dx > 40) prev();
    touchStartX.current = null;
  };

  const step = steps[active];
  const { Illustration } = step;
  const isPushup = steps === PUSHUP_STEPS || (steps[0] && steps[0].label === 'Start Position');

  return (
    <div className="w-full">
      {/* Section header */}
      {title && (
        <div className={`flex items-center gap-3 mb-4 border-l-4 ${isPushup ? 'border-brand-orange' : 'border-accent-blue'} pl-3`}>
          <h3 className="text-sm font-black text-white uppercase tracking-wider">{title}</h3>
          <span className="badge badge-orange text-[9px]">Step by Step</span>
        </div>
      )}

      {/* Main card */}
      <div
        className={`glass rounded-2xl border ${step.accent} overflow-hidden transition-all duration-300 animate-fade-in`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Step counter strip */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/50 bg-zinc-950/40">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
            Step {step.id} of {steps.length}
          </span>
          <div className="flex items-center gap-1.5">
            {steps.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setActive(i)}
                className={`transition-all duration-300 rounded-full ${
                  i === active
                    ? `${accentColor} w-5 h-2`
                    : 'bg-zinc-700 w-2 h-2 hover:bg-zinc-500'
                }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Illustration */}
        <div className="relative bg-zinc-950/60 p-2">
          <div className="aspect-[16/9] max-h-52 w-full">
            <Illustration />
          </div>
          {/* Prev / Next overlay buttons */}
          {active > 0 && (
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 border border-zinc-700/60 flex items-center justify-center text-white hover:bg-black/80 transition-all active:scale-95"
              aria-label="Previous step"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {active < steps.length - 1 && (
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 border border-zinc-700/60 flex items-center justify-center text-white hover:bg-black/80 transition-all active:scale-95"
              aria-label="Next step"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Step info */}
        <div className="px-5 py-4">
          <div className="flex items-start gap-3">
            <div className={`w-7 h-7 rounded-lg ${accentColor} flex items-center justify-center shrink-0 mt-0.5`}>
              <span className="text-white text-xs font-black">{step.id}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white leading-tight">{step.label}</p>
              <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">{step.sub}</p>
              <p className="text-xs text-zinc-400 leading-relaxed mt-2">{step.tip}</p>
            </div>
          </div>
        </div>

        {/* Bottom nav buttons */}
        <div className="flex items-center gap-2 px-4 pb-4">
          <button
            onClick={prev}
            disabled={active === 0}
            className="btn-secondary flex-1 text-xs py-2 disabled:opacity-30"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>
          {active < steps.length - 1 ? (
            <button onClick={next} className="btn-primary flex-1 text-xs py-2">
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-xs font-bold text-green-400">
              ✓ All steps done
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail strip */}
      <div
        ref={trackRef}
        className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1"
      >
        {steps.map((s, i) => {
          const { Illustration: Thumb } = s;
          return (
            <button
              key={s.id}
              ref={(el) => (cardRefs.current[i] = el)}
              onClick={() => setActive(i)}
              className={`shrink-0 w-16 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                i === active
                  ? 'border-brand-orange scale-105 shadow-glow-orange'
                  : 'border-zinc-800/60 opacity-50 hover:opacity-80 hover:border-zinc-600'
              }`}
            >
              <div className="aspect-square pointer-events-none">
                <Thumb />
              </div>
              <div className={`text-center py-1 text-[8px] font-bold ${i === active ? 'text-brand-orange bg-brand-orange/5' : 'text-zinc-600'}`}>
                {s.id}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default StepCarousel;
