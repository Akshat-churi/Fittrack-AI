import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Trophy, Flame, BarChart2, Zap, Play, ChevronRight, Star, ChevronLeft } from 'lucide-react';
import { useUserPoints } from '../hooks/useUserPoints';
import { getWorkoutHistory } from '../utils/storage';
import { calculateStreaks } from '../utils/streakTracker';

const SLIDES = [
  {
    url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1400&q=80&fit=crop',
    label: 'Push-up Mastery',
    sub: 'AI counts every rep, live',
  },
  {
    url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1400&q=80&fit=crop',
    label: 'Build Real Strength',
    sub: 'Track progress, session after session',
  },
  {
    url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1400&q=80&fit=crop',
    label: 'Perfect Your Form',
    sub: 'Real-time joint angle feedback',
  },
  {
    url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=1400&q=80&fit=crop',
    label: 'Squat Like a Pro',
    sub: 'Hip, knee & ankle analysis',
  },
  {
    url: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1400&q=80&fit=crop',
    label: 'Stay Consistent',
    sub: 'Streaks, points & leaderboard glory',
  },
];

function WorkoutSlideshow() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  const goTo = useCallback((idx) => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrent(idx);
      setAnimating(false);
    }, 400);
  }, [animating]);

  const prev = useCallback(() => goTo((current - 1 + SLIDES.length) % SLIDES.length), [current, goTo]);
  const next = useCallback(() => goTo((current + 1) % SLIDES.length), [current, goTo]);

  // Auto-advance every 4 s
  useEffect(() => {
    const t = setInterval(() => {
      setCurrent(c => (c + 1) % SLIDES.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl" style={{ height: '420px' }}>
      {/* Slides */}
      {SLIDES.map((slide, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-all duration-700 ease-in-out"
          style={{ 
            opacity: i === current ? 1 : 0, 
            zIndex: i === current ? 1 : 0,
            transform: i === current ? 'scale(1)' : 'scale(1.05)'
          }}
        >
          <img
            src={slide.url}
            alt={slide.label}
            className="w-full h-full object-cover"
            loading={i === 0 ? 'eager' : 'lazy'}
            draggable={false}
          />
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/15" />
          {/* Orange accent top line */}
          <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-brand-orange via-amber-400 to-brand-orange" />

          {/* Text label */}
          <div
            className="absolute bottom-0 left-0 right-0 p-8 md:p-10"
            style={{
              transform: i === current ? 'translateY(0)' : 'translateY(20px)',
              opacity: i === current ? 1 : 0,
              transition: 'transform 0.7s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.7s ease',
              transitionDelay: i === current ? '0.15s' : '0s',
            }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-orange/25 border border-brand-orange/40 text-brand-orange text-[10px] font-black uppercase tracking-widest mb-3">
              <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse" />
              Workout {i + 1} / {SLIDES.length}
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight mb-2">{slide.label}</h2>
            <p className="text-base md:text-lg text-white/80">{slide.sub}</p>
          </div>
        </div>
      ))}

      {/* Arrow buttons */}
      <button
        onClick={prev}
        aria-label="Previous slide"
        className="absolute left-5 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full flex items-center justify-center bg-black/60 border border-white/20 text-white hover:bg-brand-orange/80 hover:border-brand-orange/60 transition-all duration-300 active:scale-90 shadow-lg hover:shadow-xl"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={next}
        aria-label="Next slide"
        className="absolute right-5 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full flex items-center justify-center bg-black/60 border border-white/20 text-white hover:bg-brand-orange/80 hover:border-brand-orange/60 transition-all duration-300 active:scale-90 shadow-lg hover:shadow-xl"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className="transition-all duration-300 rounded-full"
            style={{
              width: i === current ? '32px' : '8px',
              height: '8px',
              background: i === current ? '#f97316' : 'rgba(255,255,255,0.45)',
              boxShadow: i === current ? '0 0 12px rgba(249,115,22,0.6)' : 'none',
            }}
          />
        ))}
      </div>
    </div>
  );
}

const ExerciseCard = ({ to, title, subtitle, description, gradient, icon: Icon, difficulty, calories }) => (
  <Link to={to} className="group block">
    <div 
      className={`relative overflow-hidden rounded-3xl p-6 md:p-8 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${gradient}`}
      style={{ borderColor: 'var(--border-color)', borderWidth: '1px' }}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon className="w-full h-full text-white"/>
      </div>

      <div className="relative z-10 space-y-5">
        <div className="flex items-start justify-between">
          <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center backdrop-blur-sm">
            <Icon className="w-7 h-7 text-white"/>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="badge-orange text-[10px]">{difficulty}</span>
            <span className="text-[10px] font-bold text-white/65 uppercase tracking-wider">{calories} kcal/set</span>
          </div>
        </div>

        <div>
          <p className="text-xs font-black text-white/65 uppercase tracking-widest mb-1.5">{subtitle}</p>
          <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">{title}</h3>
          <p className="text-sm md:text-base text-white/75 mt-2 leading-relaxed">{description}</p>
        </div>

        <div className="flex items-center gap-2.5 text-white font-bold text-sm group-hover:gap-4 transition-all">
          <div className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center">
            <Play className="w-4 h-4 text-white fill-white"/>
          </div>
          Start Session
          <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-1 transition-transform"/>
        </div>
      </div>
    </div>
  </Link>
);

export default function Home() {
  const points = useUserPoints();

  const { sessions, totalCalories } = useMemo(() => {
    const h = getWorkoutHistory();
    return { sessions: h.length, totalCalories: Math.round(h.reduce((s, x) => s + (x.caloriesBurned ?? 0), 0) * 10) / 10 };
  }, []);

  const { currentStreak } = useMemo(() => calculateStreaks(getWorkoutHistory()), []);

  const stats = [
    { label: 'Reward Points', value: points.toLocaleString(), icon: Trophy, color: 'text-brand-orange', bg: 'bg-brand-orange/10 border-brand-orange/20' },
    { label: 'Sessions Done', value: sessions, icon: BarChart2, color: 'text-accent-blue', bg: 'bg-accent-blue/10 border-accent-blue/20' },
    { label: 'kcal Burned', value: totalCalories.toLocaleString(), icon: Flame, color: 'text-red-500 dark:text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
    { label: 'Day Streak', value: currentStreak, icon: Zap, color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  ];

  return (
    <div className="page pb-24 md:pb-12">
      <div className="content-width space-y-12">

        {/* ── Workout Slideshow ────────────────────────────────────────── */}
        <div className="animate-fade-in">
          <WorkoutSlideshow />
        </div>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div className="text-center space-y-5 pt-6 md:pt-10 animate-fade-in">
          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-brand-orange/10 border border-brand-orange/20 text-brand-orange text-xs font-black uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse"/>
            AI-Powered Fitness Coach
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05]" style={{ color: 'var(--text-primary)' }}>
            Train Smarter<br/>
            <span className="text-gradient">With AI Vision</span>
          </h1>
          <p className="text-base md:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Real-time pose detection counts your reps, corrects your form, and tracks every calorie — using just your camera.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
            <Link to="/instructions/pushups" className="btn-primary px-7 py-4 text-base md:text-lg">
              <Play className="w-6 h-6 fill-white"/> Start Workout
            </Link>
            <Link to="/dashboard" className="btn-secondary px-7 py-4 text-base md:text-lg">
              <BarChart2 className="w-6 h-6"/> View Progress
            </Link>
          </div>
        </div>

        {/* ── Stats row ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 animate-slide-up">
          {stats.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`glass rounded-2xl p-5 md:p-6 flex flex-col gap-4 border ${bg}`}>
              <div className={`w-11 h-11 md:w-12 md:h-12 rounded-xl ${bg} border flex items-center justify-center`}>
                <Icon className={`w-5 md:w-6 h-5 md:h-6 ${color}`}/>
              </div>
              <div>
                <p className={`text-2xl md:text-4xl font-black ${color} tracking-tight`}>{value}</p>
                <p className="text-[11px] font-black uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Exercise cards ───────────────────────────────────────────── */}
        <div className="space-y-4">
          <h2 className="section-title">Choose Your Workout</h2>
          <p className="text-sm md:text-base" style={{ color: 'var(--text-secondary)' }}>AI tracks your reps in real-time using your camera</p>
        </div>
        <div className="grid md:grid-cols-2 gap-5 md:gap-7">
          <ExerciseCard
            to="/instructions/pushups"
            title="Push-ups"
            subtitle="Upper Body"
            description="Master your form with real-time elbow angle tracking and instant rep counting."
            gradient="bg-gradient-to-br from-brand-orange/20 via-zinc-900 to-zinc-900 dark:via-zinc-900 dark:to-zinc-900"
            icon={Activity}
            difficulty="All Levels"
            calories="8–12"
          />
          <ExerciseCard
            to="/instructions/squats"
            title="Squats"
            subtitle="Lower Body"
            description="Optimize lower body power with hip, knee, and ankle joint analysis."
            gradient="bg-gradient-to-br from-accent-blue/15 via-zinc-900 to-zinc-900 dark:via-zinc-900 dark:to-zinc-900"
            icon={Zap}
            difficulty="All Levels"
            calories="5–9"
          />
        </div>

        {/* ── Feature highlights ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
          {[
            { icon: '🎯', title: 'Accurate Tracking', desc: 'MediaPipe pose estimation with 33 body landmarks' },
            { icon: '⚡', title: 'Instant Feedback', desc: 'Real-time form analysis and rep counting at 30fps' },
            { icon: '🔒', title: '100% Private', desc: 'All processing runs locally — no data ever leaves your device' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="glass rounded-2xl p-6 flex flex-col gap-3">
              <span className="text-3xl">{icon}</span>
              <h4 className="text-sm md:text-base font-black" style={{ color: 'var(--text-primary)' }}>{title}</h4>
              <p className="text-xs md:text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
