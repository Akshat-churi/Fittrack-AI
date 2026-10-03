import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowRight, Trophy, Flame, BarChart2, Zap, Play,
  ChevronRight, ChevronLeft, Camera, Shield, TrendingUp, Star,
  Target, Users, BookOpen, Clock, Calendar,
} from 'lucide-react';
import { useUserPoints } from '../hooks/useUserPoints';
import { getWorkoutHistory } from '../utils/storage';
import { calculateStreaks } from '../utils/streakTracker';
import { getDashboardStats } from '../utils/dashboardStats';

/* ─────────────────────────────────────────────────────────────────
   HERO SLIDESHOW DATA
───────────────────────────────────────────────────────────────── */
const SLIDES = [
  {
    url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1600&q=85&fit=crop',
    label: 'Push-up Mastery',
    sub: 'AI counts every rep, live',
    accent: '#f97316',
  },
  {
    url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=85&fit=crop',
    label: 'Build Real Strength',
    sub: 'Track progress, session after session',
    accent: '#3b82f6',
  },
  {
    url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1600&q=85&fit=crop',
    label: 'Perfect Your Form',
    sub: 'Real-time joint angle feedback',
    accent: '#f97316',
  },
  {
    url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=1600&q=85&fit=crop',
    label: 'Squat Like a Pro',
    sub: 'Hip, knee & ankle analysis',
    accent: '#8b5cf6',
  },
  {
    url: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1600&q=85&fit=crop',
    label: 'Stay Consistent',
    sub: 'Streaks, points & leaderboard glory',
    accent: '#22c55e',
  },
  {
    url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=1600&q=85&fit=crop',
    label: 'Dominate Every Session',
    sub: 'From beginner to elite — we track it all',
    accent: '#ef4444',
  },
];

function WorkoutSlideshow() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  const goTo = useCallback((idx) => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => { setCurrent(idx); setAnimating(false); }, 380);
  }, [animating]);

  const prev = useCallback(() => goTo((current - 1 + SLIDES.length) % SLIDES.length), [current, goTo]);
  const next = useCallback(() => goTo((current + 1) % SLIDES.length), [current, goTo]);

  useEffect(() => {
    const t = setInterval(() => setCurrent(c => (c + 1) % SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl" style={{ height: '480px' }}>
      {SLIDES.map((slide, i) => (
        <div key={i} className="absolute inset-0 transition-all duration-700 ease-in-out"
          style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0, transform: i === current ? 'scale(1)' : 'scale(1.06)' }}>
          <img src={slide.url} alt={slide.label} className="w-full h-full object-cover"
            loading={i === 0 ? 'eager' : 'lazy'} draggable={false} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />
          {/* colored top accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, transparent, ${slide.accent}, transparent)` }} />

          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12"
            style={{ transform: i === current ? 'translateY(0)' : 'translateY(24px)', opacity: i === current ? 1 : 0, transition: 'transform 0.7s cubic-bezier(0.22,1,0.36,1), opacity 0.7s ease', transitionDelay: i === current ? '0.12s' : '0s' }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest mb-3"
              style={{ background: `${slide.accent}22`, borderColor: `${slide.accent}55`, color: slide.accent }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: slide.accent }} />
              {i + 1} / {SLIDES.length}
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight mb-2">{slide.label}</h2>
            <p className="text-base md:text-lg text-white/80 font-medium">{slide.sub}</p>
          </div>
        </div>
      ))}

      <button onClick={prev} aria-label="Previous"
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full flex items-center justify-center bg-black/60 border border-white/20 text-white hover:bg-brand-orange/80 hover:border-brand-orange/60 transition-all active:scale-90 shadow-xl">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button onClick={next} aria-label="Next"
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full flex items-center justify-center bg-black/60 border border-white/20 text-white hover:bg-brand-orange/80 hover:border-brand-orange/60 transition-all active:scale-90 shadow-xl">
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dot nav */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        {SLIDES.map((s, i) => (
          <button key={i} onClick={() => goTo(i)} aria-label={`Slide ${i + 1}`}
            className="rounded-full transition-all duration-300"
            style={{ width: i === current ? 28 : 8, height: 8, background: i === current ? s.accent : 'rgba(255,255,255,0.35)', boxShadow: i === current ? `0 0 12px ${s.accent}88` : 'none' }} />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   EXERCISE CARDS WITH REAL PHOTOS
───────────────────────────────────────────────────────────────── */
const EXERCISE_DATA = [
  {
    to: '/instructions/pushups',
    title: 'Push-ups',
    subtitle: 'Upper Body · Chest & Triceps',
    description: 'Real-time elbow angle tracking and rep counting with MediaPipe AI. Works with just your camera.',
    accentColor: '#f97316',
    accentClass: 'brand-orange',
    icon: Activity,
    difficulty: 'All Levels',
    calories: '8–12',
    muscles: ['Chest', 'Triceps', 'Shoulders', 'Core'],
    heroImg: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80&fit=crop',
    galleryImgs: [
      'https://images.unsplash.com/photo-1598971639058-fab3c3109a73?w=400&q=75&fit=crop',
      'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=75&fit=crop',
    ],
  },
  {
    to: '/instructions/squats',
    title: 'Squats',
    subtitle: 'Lower Body · Quads & Glutes',
    description: 'Hip, knee and ankle joint analysis tracks your depth and form. Perfect for all fitness levels.',
    accentColor: '#3b82f6',
    accentClass: 'accent-blue',
    icon: Zap,
    difficulty: 'All Levels',
    calories: '5–9',
    muscles: ['Quads', 'Glutes', 'Hamstrings', 'Calves'],
    heroImg: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80&fit=crop',
    galleryImgs: [
      'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=400&q=75&fit=crop',
      'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=400&q=75&fit=crop',
    ],
  },
];

function ExerciseCard({ to, title, subtitle, description, accentColor, accentClass, icon: Icon, difficulty, calories, muscles, heroImg, galleryImgs }) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <Link to={to} className="group block">
      <div className="glass rounded-3xl overflow-hidden border border-zinc-800/60 hover:border-zinc-600/60 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl"
        style={{ '--accent': accentColor }}>

        {/* Photo hero */}
        <div className="relative overflow-hidden" style={{ height: '220px' }}>
          {!imgFailed ? (
            <img src={heroImg} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              onError={() => setImgFailed(true)} loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: `${accentColor}18` }}>
              <Icon className="w-20 h-20 opacity-30" style={{ color: accentColor }} />
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
          {/* Colored accent bottom line */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />

          {/* Difficulty + calorie badges */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white"
              style={{ background: `${accentColor}cc`, backdropFilter: 'blur(8px)' }}>
              {difficulty}
            </span>
          </div>
          <div className="absolute top-4 right-4">
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 border border-white/10 text-[10px] font-black text-white backdrop-blur-sm">
              <Flame className="w-3 h-3 text-red-400" /> {calories} kcal/set
            </span>
          </div>

          {/* Small gallery thumbnails */}
          <div className="absolute bottom-3 right-3 flex gap-1.5">
            {galleryImgs.map((img, i) => (
              <img key={i} src={img} alt="" className="w-12 h-12 rounded-xl object-cover border-2 opacity-80 group-hover:opacity-100 transition-opacity"
                style={{ borderColor: `${accentColor}60` }} loading="lazy"
                onError={e => { e.target.style.display = 'none'; }} />
            ))}
          </div>
        </div>

        {/* Card body */}
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: accentColor }}>{subtitle}</p>
              <h3 className="text-2xl font-black text-white tracking-tight">{title}</h3>
            </div>
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border"
              style={{ background: `${accentColor}18`, borderColor: `${accentColor}40` }}>
              <Icon className="w-5 h-5" style={{ color: accentColor }} />
            </div>
          </div>

          <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>

          {/* Muscle tags */}
          <div className="flex flex-wrap gap-1.5">
            {muscles.map(m => (
              <span key={m} className="px-2 py-0.5 rounded-full text-[10px] font-bold text-zinc-400 bg-zinc-800/80 border border-zinc-700/60">
                {m}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
            <div className="flex items-center gap-2 text-sm font-bold group-hover:gap-3 transition-all" style={{ color: accentColor }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${accentColor}25` }}>
                <Play className="w-3.5 h-3.5 fill-current" style={{ color: accentColor }} />
              </div>
              Start Session
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────────
   INSPIRATION PHOTO GRID
───────────────────────────────────────────────────────────────── */
const INSPIRATION_PHOTOS = [
  { url: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&q=80&fit=crop', label: 'Strength' },
  { url: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=600&q=80&fit=crop', label: 'Endurance' },
  { url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&q=80&fit=crop', label: 'Power' },
  { url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80&fit=crop', label: 'Form' },
  { url: 'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=600&q=80&fit=crop', label: 'Focus' },
  { url: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=600&q=80&fit=crop', label: 'Consistency' },
];

function InspirationGrid() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">Training Moments</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Every rep is a step forward</p>
        </div>
        <Star className="w-5 h-5 text-brand-orange" />
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {INSPIRATION_PHOTOS.map(({ url, label }, i) => (
          <div key={i} className={`relative overflow-hidden rounded-2xl group cursor-default
            ${i === 0 ? 'row-span-2' : ''}`}
            style={{ height: i === 0 ? '260px' : '120px' }}>
            <img src={url} alt={label} loading="lazy"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              onError={e => { e.target.parentElement.style.display = 'none'; }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <span className="absolute bottom-2 left-3 text-[10px] font-black text-white uppercase tracking-widest">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   FEATURE HIGHLIGHTS WITH PHOTOS
───────────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Camera,
    emoji: '📸',
    title: 'AI Camera Tracking',
    desc: 'MediaPipe pose estimation with 33 body landmarks tracks your movement in real time at 30fps.',
    img: 'https://images.unsplash.com/photo-1576633587382-13ddf37b1fc1?w=600&q=75&fit=crop',
    color: 'from-brand-orange/20 to-brand-orange/5',
    border: 'border-brand-orange/20',
  },
  {
    icon: Shield,
    emoji: '🔒',
    title: '100% Private',
    desc: 'All video processing runs locally on your device — your camera feed never leaves your browser.',
    img: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=600&q=75&fit=crop',
    color: 'from-green-500/20 to-green-500/5',
    border: 'border-green-500/20',
  },
  {
    icon: TrendingUp,
    emoji: '📊',
    title: 'Progress Analytics',
    desc: 'Track workouts, calories, streaks and points over time with a full analytics dashboard.',
    img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=75&fit=crop',
    color: 'from-accent-blue/20 to-accent-blue/5',
    border: 'border-accent-blue/20',
  },
];

function FeatureCards() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black text-white">Why FitTrack AI?</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {FEATURES.map(({ icon: Icon, emoji, title, desc, img, color, border }) => (
          <div key={title} className={`glass rounded-2xl overflow-hidden border ${border} group hover:-translate-y-1 transition-all duration-300`}>
            {/* Photo */}
            <div className="relative h-36 overflow-hidden">
              <img src={img} alt={title} loading="lazy"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                onError={e => { e.target.parentElement.classList.add('hidden'); }} />
              <div className={`absolute inset-0 bg-gradient-to-br ${color}`} />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent" />
              <span className="absolute top-3 left-3 text-2xl">{emoji}</span>
            </div>
            {/* Text */}
            <div className="p-4 space-y-1.5">
              <h4 className="text-sm font-black text-white">{title}</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   QUICK LINKS SECTION
───────────────────────────────────────────────────────────────── */
const QUICK_LINKS = [
  { to: '/guide',       icon: BookOpen,   label: 'Fitness Guide',    desc: 'Learn correct form',     color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { to: '/goals',       icon: Target,     label: 'Goal Tracker',     desc: 'Set & track targets',    color: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/20' },
  { to: '/leaderboard', icon: Trophy,     label: 'Leaderboard',      desc: 'See who leads',          color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
  { to: '/social',      icon: Users,      label: 'Social',           desc: 'Connect & compete',      color: 'text-sky-400',     bg: 'bg-sky-500/10 border-sky-500/20' },
];

/* ─────────────────────────────────────────────────────────────────
   MINI PROGRESS DASHBOARD (inline on Home)
───────────────────────────────────────────────────────────────── */
function MiniProgressDashboard() {
  const history = useMemo(() => getWorkoutHistory(), []);
  const weekStats = useMemo(() => getDashboardStats(history, 'week'), [history]);
  const { currentStreak, longestStreak } = useMemo(() => calculateStreaks(history), [history]);

  if (history.length === 0) return null;

  // Last 5 sessions
  const recent = history.slice(0, 5);

  // Mini bar chart — last 7 days reps
  const maxReps = Math.max(...weekStats.chartData.map(d => d.reps), 1);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-brand-orange"/> Your Progress
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">{weekStats.periodLabel}</p>
        </div>
        <Link to="/dashboard"
          className="flex items-center gap-1 text-xs font-bold text-brand-orange hover:text-amber-400 transition-colors">
          Full Dashboard <ChevronRight className="w-3.5 h-3.5"/>
        </Link>
      </div>

      <div className="glass rounded-3xl border border-zinc-800/60 overflow-hidden">
        {/* Top stats strip */}
        <div className="grid grid-cols-4 divide-x divide-zinc-800/60">
          {[
            { label: 'Workouts',  value: weekStats.totalWorkouts,               icon: Calendar, color: 'text-sky-400' },
            { label: 'Reps',      value: weekStats.totalReps.toLocaleString(),  icon: Activity, color: 'text-brand-orange' },
            { label: 'kcal',      value: weekStats.totalCalories,               icon: Flame,    color: 'text-red-400' },
            { label: 'Streak',    value: `${currentStreak}d`,                   icon: Zap,      color: 'text-amber-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex flex-col items-center justify-center py-4 px-2 gap-1">
              <Icon className={`w-4 h-4 ${color} mb-0.5`}/>
              <p className={`text-xl font-black ${color} leading-none`}>{value}</p>
              <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">{label}</p>
            </div>
          ))}
        </div>

        {/* Mini bar chart */}
        <div className="px-5 pb-5 pt-4 border-t border-zinc-800/60">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Reps · Last 7 Days</p>
          <div className="flex items-end gap-1.5 h-16">
            {weekStats.chartData.slice(-7).map((d, i) => {
              const pct = (d.reps / maxReps) * 100;
              const isToday = d.label === 'Today';
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="w-full rounded-t-lg transition-all duration-500"
                    style={{
                      height: `${Math.max(pct, 4)}%`,
                      background: isToday ? '#f97316' : d.reps > 0 ? 'rgba(249,115,22,0.4)' : 'rgba(63,63,70,0.4)',
                    }}/>
                  <span className="text-[8px] text-zinc-600 font-semibold truncate w-full text-center">{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent sessions */}
        <div className="border-t border-zinc-800/60">
          <div className="px-5 py-3 flex items-center justify-between">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Recent Sessions</p>
            <Link to="/history" className="text-[10px] font-bold text-brand-orange hover:text-amber-400 transition-colors">See all</Link>
          </div>
          <div className="divide-y divide-zinc-800/40">
            {recent.map((s, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${s.exerciseType?.toLowerCase().includes('push') ? 'bg-brand-orange/10 border border-brand-orange/20' : 'bg-sky-500/10 border border-sky-500/20'}`}>
                  <Activity className={`w-3.5 h-3.5 ${s.exerciseType?.toLowerCase().includes('push') ? 'text-brand-orange' : 'text-sky-400'}`}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{s.exerciseType}</p>
                  <p className="text-[10px] text-zinc-500">{s.date} · {s.duration}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-white">{s.reps}</p>
                  <p className="text-[9px] text-zinc-600">reps</p>
                </div>
                <div className="text-right shrink-0 w-14">
                  <p className="text-xs font-black text-brand-orange">+{s.pointsEarned ?? 0}</p>
                  <p className="text-[9px] text-zinc-600">pts</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   PAGE EXPORT
───────────────────────────────────────────────────────────────── */
export default function Home() {
  const points = useUserPoints();
  const { sessions, totalCalories } = useMemo(() => {
    const h = getWorkoutHistory();
    return { sessions: h.length, totalCalories: Math.round(h.reduce((s, x) => s + (x.caloriesBurned ?? 0), 0) * 10) / 10 };
  }, []);
  const { currentStreak } = useMemo(() => calculateStreaks(getWorkoutHistory()), []);

  const stats = [
    { label: 'Points',   value: points.toLocaleString(),           icon: Trophy,   color: 'text-brand-orange', bg: 'bg-brand-orange/10 border-brand-orange/20' },
    { label: 'Sessions', value: sessions,                           icon: BarChart2, color: 'text-accent-blue',  bg: 'bg-accent-blue/10 border-accent-blue/20' },
    { label: 'Calories', value: totalCalories.toLocaleString(),    icon: Flame,    color: 'text-red-400',      bg: 'bg-red-500/10 border-red-500/20' },
    { label: 'Streak',   value: `${currentStreak}d`,               icon: Zap,      color: 'text-amber-400',    bg: 'bg-amber-500/10 border-amber-500/20' },
  ];

  return (
    <div className="page pb-24 md:pb-12">
      <div className="content-width space-y-14">

        {/* ── Hero Slideshow ── */}
        <section className="animate-fade-in">
          <WorkoutSlideshow />
        </section>

        {/* ── Headline + CTA ── */}
        <section className="text-center space-y-5 animate-fade-in">
          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-brand-orange/10 border border-brand-orange/20 text-brand-orange text-xs font-black uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse" />
            AI-Powered Fitness Coach
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05]" style={{ color: 'var(--text-primary)' }}>
            Train Smarter<br />
            <span className="text-gradient">With AI Vision</span>
          </h1>
          <p className="text-base md:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Real-time pose detection counts reps, corrects form, and tracks every calorie — using just your camera.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link to="/instructions/pushups" className="btn-primary px-7 py-4 text-base md:text-lg">
              <Play className="w-5 h-5 fill-white" /> Start Workout
            </Link>
            <Link to="/dashboard" className="btn-secondary px-7 py-4 text-base md:text-lg">
              <BarChart2 className="w-5 h-5" /> View Progress
            </Link>
          </div>
        </section>

        {/* ── Stats row ── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
          {stats.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`glass rounded-2xl p-5 flex flex-col gap-3 border ${bg}`}>
              <div className={`w-10 h-10 rounded-xl ${bg} border flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className={`text-2xl md:text-3xl font-black ${color} tracking-tight`}>{value}</p>
                <p className="text-[10px] font-black uppercase tracking-wider mt-0.5 text-zinc-500">{label}</p>
              </div>
            </div>
          ))}
        </section>

        {/* ── Exercise cards with photos ── */}
        <section className="space-y-5">
          <div>
            <h2 className="section-title">Choose Your Workout</h2>
            <p className="text-sm text-zinc-500 mt-1">AI-powered rep counting with your camera</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {EXERCISE_DATA.map(ex => <ExerciseCard key={ex.title} {...ex} />)}
          </div>
        </section>

        {/* ── Progress dashboard inline ── */}
        <MiniProgressDashboard/>

        {/* ── Photo grid + quick links (side by side on desktop) ── */}
        <section className="grid lg:grid-cols-2 gap-8 items-start">
          <InspirationGrid />

          {/* Quick nav links */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-black text-white">Explore FitTrack</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Everything you need to reach your goals</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {QUICK_LINKS.map(({ to, icon: Icon, label, desc, color, bg }) => (
                <Link key={to} to={to}
                  className={`glass rounded-2xl p-4 border ${bg} hover:scale-[1.02] transition-all duration-200 group`}>
                  <div className={`w-9 h-9 rounded-xl ${bg} border flex items-center justify-center mb-3`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <p className={`text-sm font-black ${color}`}>{label}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{desc}</p>
                </Link>
              ))}
            </div>

            {/* Motivational quote card */}
            <div className="relative glass rounded-2xl overflow-hidden border border-brand-orange/20">
              <img
                src="https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800&q=75&fit=crop"
                alt="Motivation" loading="lazy"
                className="absolute inset-0 w-full h-full object-cover opacity-20"
                onError={e => { e.target.style.display = 'none'; }}
              />
              <div className="relative p-5">
                <p className="text-brand-orange text-xs font-black uppercase tracking-widest mb-2">Daily Motivation</p>
                <p className="text-white font-black text-lg leading-snug">
                  "The only bad workout<br />is the one that didn't happen."
                </p>
                <p className="text-zinc-500 text-xs mt-2">Track your streak — don't break the chain 🔥</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Feature cards with photos ── */}
        <section>
          <FeatureCards />
        </section>

      </div>
    </div>
  );
}
