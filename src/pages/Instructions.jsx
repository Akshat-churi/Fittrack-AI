import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Camera, Smartphone, Shield, ArrowRight, Activity } from 'lucide-react';
import { StepCarousel, PUSHUP_STEPS, SQUAT_STEPS } from '../components/ExerciseSteps';

const CONFIGS = {
  pushups: {
    title:       'Push-up Session',
    emoji:       '💪',
    color:       'from-brand-orange/20 to-transparent',
    accentColor: 'bg-brand-orange',
    steps: [
      { icon: Smartphone, title: 'Device Position', desc: 'Place your device at floor level, 3–5 feet away. Your full side profile from head to toe must be visible.' },
      { icon: Camera,     title: 'Camera Angle',    desc: 'Keep the device stable and at a 90° side angle. Avoid overhead or frontal positioning.' },
      { icon: Shield,     title: 'Privacy First',   desc: 'All video is processed locally on your device. Nothing is ever uploaded or stored.' },
    ],
  },
  squats: {
    title:       'Squat Session',
    emoji:       '🏋️',
    color:       'from-accent-blue/15 to-transparent',
    accentColor: 'bg-accent-blue',
    steps: [
      { icon: Smartphone, title: 'Device Position', desc: 'Place your device at hip height, 4–6 feet away. Ensure hips, knees, and ankles are all visible.' },
      { icon: Camera,     title: 'Camera Angle',    desc: 'Side profile is essential. The AI tracks your hip-knee-ankle angle in real time.' },
      { icon: Shield,     title: 'Privacy First',   desc: 'All video processing happens 100% on your device. Zero data leaves your browser.' },
    ],
  },
};

export default function Instructions() {
  const { type } = useParams();
  const cfg        = CONFIGS[type] || CONFIGS.pushups;
  const formSteps  = type === 'squats' ? SQUAT_STEPS : PUSHUP_STEPS;
  const isPushup   = type !== 'squats';

  return (
    <div className="page pb-24 md:pb-8">
      <div className="max-w-lg mx-auto space-y-6 animate-scale-in">

        {/* ── Hero card ── */}
        <div className="glass rounded-3xl overflow-hidden border border-zinc-800/60">
          <div className={`bg-gradient-to-br ${cfg.color} p-8 text-center border-b border-zinc-800/40`}>
            <p className="text-5xl mb-3">{cfg.emoji}</p>
            <h1 className="text-2xl font-black text-white">{cfg.title}</h1>
            <p className="text-zinc-400 text-sm mt-1">Learn the correct form before you start</p>
          </div>

          <div className="p-6 space-y-4">
            {cfg.steps.map(({ icon: Icon, title, desc }, i) => (
              <div key={i} className="flex items-start gap-4 bg-zinc-900/60 rounded-2xl p-4 border border-zinc-800/40 hover:border-brand-orange/20 transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Icon className="w-5 h-5 text-brand-orange"/>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-0.5">{title}</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Step-by-step form guide ── */}
        <div className="glass rounded-3xl border border-zinc-800/60 p-5">
          <StepCarousel
            steps={formSteps}
            title={isPushup ? 'Push-up Form Guide' : 'Squat Form Guide'}
            accentColor={cfg.accentColor}
          />
        </div>

        {/* ── CTA ── */}
        <Link
          to={`/workout/${type}`}
          className="btn-primary w-full text-base py-4 rounded-2xl"
        >
          <Activity className="w-5 h-5"/> Start AI Tracking
          <ArrowRight className="w-5 h-5 ml-auto"/>
        </Link>
      </div>
    </div>
  );
}
