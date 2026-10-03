import React, { useState } from 'react';
import { BookOpen, Activity, Link as LinkIcon, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StepCarousel, PUSHUP_STEPS, SQUAT_STEPS } from '../components/ExerciseSteps';

/* ─────────────────────────────────────────────────────────────────
   TUTORIAL DATA WITH REAL PHOTOS
───────────────────────────────────────────────────────────────── */
const tutorials = {
  pushups: [
    {
      title: 'Standard Push-up',
      description: 'The classic upper-body compound movement. Builds chest, shoulders and triceps simultaneously while engaging your core.',
      steps: [
        'Start in a high plank: hands slightly wider than shoulder-width, arms straight.',
        'Keep your body in a perfectly straight line from head to heels — no sagging hips.',
        'Lower your chest to ~2 cm above the floor, elbows at roughly 45°.',
        'Exhale and drive through your palms to push back to the start.',
      ],
      target: 'Chest, Shoulders, Triceps, Core',
      difficulty: 'Beginner',
      img: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=700&q=80&fit=crop',
      tip: 'Keep your neck neutral — look at the floor, not forward.',
    },
    {
      title: 'Diamond Push-up',
      description: 'Hands form a diamond shape directly under your chest — this variation crushes the triceps and hits the inner chest hard.',
      steps: [
        'Form a diamond shape with thumbs and index fingers under your sternum.',
        'Keep elbows tucked close to your ribs the entire rep.',
        'Lower until your chest nearly touches your hands.',
        'Push back up explosively, squeezing triceps at the top.',
      ],
      target: 'Triceps, Inner Chest',
      difficulty: 'Intermediate',
      img: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a73?w=700&q=80&fit=crop',
      tip: 'If wrists hurt, use push-up handles or fists to reduce extension.',
    },
    {
      title: 'Wide Grip Push-up',
      description: 'Hands positioned 1.5× shoulder-width apart to maximise outer chest activation and improve shoulder mobility.',
      steps: [
        'Place hands ~1.5× shoulder-width, fingers pointing forward or slightly out.',
        'Lower your body letting elbows flare at ~70°.',
        'Feel the stretch across your chest at the bottom.',
        'Press back up, squeezing chest muscles at the top.',
      ],
      target: 'Outer Chest, Shoulders',
      difficulty: 'Intermediate',
      img: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=700&q=80&fit=crop',
      tip: 'Slower descent (3 sec) increases time under tension for more growth.',
    },
    {
      title: 'Pike Push-up',
      description: 'Hips raised high into an inverted V — mimics the overhead press pattern and builds serious shoulder strength.',
      steps: [
        'Start in a downward-dog position — hips high, forming an inverted V.',
        'Bend elbows and lower the crown of your head toward the floor.',
        'Press back up through your shoulders and triceps.',
        'Maintain the inverted-V hip position throughout.',
      ],
      target: 'Shoulders, Upper Chest, Triceps',
      difficulty: 'Advanced',
      img: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=700&q=80&fit=crop',
      tip: 'Elevate feet on a chair to progress toward a handstand push-up.',
    },
  ],
  squats: [
    {
      title: 'Standard Squat',
      description: 'The king of lower body exercises. Develops quad, glute, and hamstring strength in a natural movement pattern.',
      steps: [
        'Stand with feet shoulder-width apart, toes 15–30° out.',
        'Brace your core, chest up, and spine neutral.',
        'Push hips back first, then bend knees — tracking them over toes.',
        'Lower until thighs are parallel (or below) to the floor.',
        'Drive through heels and stand, squeezing glutes at the top.',
      ],
      target: 'Quads, Glutes, Hamstrings, Core',
      difficulty: 'Beginner',
      img: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=700&q=80&fit=crop',
      tip: 'Keep heels flat on the floor — if they rise, stretch your calves and ankles.',
    },
    {
      title: 'Sumo Squat',
      description: 'Wide-stance squat with toes turned out significantly — shifts emphasis to inner thighs and glutes.',
      steps: [
        'Take a stance ~1.5× shoulder-width, toes angled 45° outward.',
        'Sit straight down, tracking knees over toes without caving inward.',
        'Keep torso upright — wider stance naturally helps with this.',
        'Push through heels and squeeze glutes hard at the top.',
      ],
      target: 'Inner Thighs, Glutes, Quads',
      difficulty: 'Beginner',
      img: 'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=700&q=80&fit=crop',
      tip: 'Hold a weight at your chest (goblet hold) to improve balance in this stance.',
    },
    {
      title: 'Jump Squat',
      description: 'Plyometric power squat — the explosive jump builds fast-twitch muscle fibres, burns more calories, and improves athletic performance.',
      steps: [
        'Perform a full squat to parallel depth.',
        'Load through your heels and mid-foot.',
        'Explode upward, fully extending hips and knees into a jump.',
        'Land softly with bent knees to absorb impact, immediately dropping into the next rep.',
      ],
      target: 'Quads, Glutes, Calves, Cardiovascular System',
      difficulty: 'Intermediate',
      img: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=700&q=80&fit=crop',
      tip: 'Land toe-heel — never flat-footed — to protect your knees and ankles.',
    },
    {
      title: 'Bulgarian Split Squat',
      description: 'The most effective single-leg strength exercise. Exposes muscle imbalances and builds unilateral power and balance.',
      steps: [
        'Stand 2–3 feet in front of a bench or chair, back to it.',
        'Place the top of your rear foot on the bench surface.',
        'Lower your rear knee toward the floor while keeping the front shin vertical.',
        'Lower until front thigh is parallel — then push through the front heel to stand.',
      ],
      target: 'Quads, Glutes, Hip Flexors, Balance',
      difficulty: 'Advanced',
      img: 'https://images.unsplash.com/photo-1574680178050-55c6a6a96e0a?w=700&q=80&fit=crop',
      tip: 'Elevate the front foot slightly to increase glute activation.',
    },
  ],
};

/* ─────────────────────────────────────────────────────────────────
   GUIDE CARD COMPONENT
───────────────────────────────────────────────────────────────── */
const difficultyStyle = {
  Beginner:     { badge: 'badge-green',  glow: 'border-green-500/25',  accent: '#22c55e' },
  Intermediate: { badge: 'badge-orange', glow: 'border-brand-orange/25', accent: '#f97316' },
  Advanced:     { badge: 'badge-red',    glow: 'border-red-500/25',    accent: '#ef4444' },
};

const GuideCard = ({ tutorial }) => {
  const [imgErr, setImgErr] = useState(false);
  const ds = difficultyStyle[tutorial.difficulty] || difficultyStyle.Beginner;

  return (
    <div className={`glass rounded-2xl overflow-hidden border ${ds.glow} hover:scale-[1.01] transition-all duration-300 group`}>
      {/* Photo banner */}
      <div className="relative h-44 overflow-hidden">
        {!imgErr ? (
          <img src={tutorial.img} alt={tutorial.title} loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgErr(true)} />
        ) : (
          <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
            <Activity className="w-12 h-12 text-zinc-700" />
          </div>
        )}
        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
        {/* Accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{ background: `linear-gradient(90deg, transparent, ${ds.accent}, transparent)` }} />
        {/* Difficulty badge */}
        <span className={`absolute top-3 right-3 badge ${ds.badge} text-[9px]`}>{tutorial.difficulty}</span>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        <div>
          <h3 className="text-base font-black text-white">{tutorial.title}</h3>
          <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{tutorial.description}</p>
        </div>

        {/* Steps */}
        <div>
          <h4 className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-2.5">How To</h4>
          <ol className="space-y-2">
            {tutorial.steps.map((step, idx) => (
              <li key={idx} className="flex gap-2.5 items-start text-zinc-300 text-xs">
                <span className="flex items-center justify-center w-5 h-5 rounded-lg bg-brand-orange/10 text-brand-orange text-[9px] font-black shrink-0 border border-brand-orange/20 mt-0.5">{idx + 1}</span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Pro tip */}
        {tutorial.tip && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/8 border border-amber-500/20">
            <span className="text-sm shrink-0">💡</span>
            <p className="text-[11px] text-amber-300/80 leading-relaxed font-semibold">{tutorial.tip}</p>
          </div>
        )}

        {/* Target muscles */}
        <div className="pt-2 border-t border-zinc-800/40 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-brand-orange shrink-0" />
          <span className="text-xs text-zinc-500">
            <strong className="text-zinc-300 font-semibold">Targets:</strong> {tutorial.target}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   SECTION HERO BANNER
───────────────────────────────────────────────────────────────── */
const SectionBanner = ({ imgUrl, title, subtitle, accentColor, to }) => {
  const [err, setErr] = useState(false);
  return (
    <div className="relative rounded-3xl overflow-hidden mb-8" style={{ height: '180px' }}>
      {!err ? (
        <img src={imgUrl} alt={title} loading="lazy"
          className="w-full h-full object-cover"
          onError={() => setErr(true)} />
      ) : (
        <div className="w-full h-full" style={{ background: `${accentColor}18` }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-center px-8">
        <div className="inline-flex items-center gap-2 mb-2">
          <div className="w-1 h-8 rounded-full" style={{ background: accentColor }} />
          <div>
            <h2 className="text-2xl font-black text-white">{title}</h2>
            <p className="text-xs font-semibold" style={{ color: `${accentColor}cc` }}>{subtitle}</p>
          </div>
        </div>
        <Link to={to}
          className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-white/70 hover:text-white transition-colors w-fit">
          Start with AI Tracker <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────────── */
const FitnessGuide = () => (
  <div className="page pb-24 md:pb-8">
    <div className="content-width space-y-10">

      {/* Page header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto pt-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-orange/10 border border-brand-orange/20 mb-2">
          <BookOpen className="w-7 h-7 text-brand-orange" />
        </div>
        <h1 className="section-title">Fitness <span className="text-gradient">Guide</span></h1>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Master bodyweight exercises with photo guides, step-by-step technique breakdowns, and AI form analysis.
        </p>
      </div>

      {/* Push-up section */}
      <section>
        <SectionBanner
          imgUrl="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&q=80&fit=crop"
          title="Push-up Variations"
          subtitle="Chest · Triceps · Shoulders · Core"
          accentColor="#f97316"
          to="/instructions/pushups"
        />

        {/* Form carousel */}
        <div className="glass rounded-3xl border border-zinc-800/60 p-5 mb-6">
          <StepCarousel steps={PUSHUP_STEPS} title="Standard Push-up · Form Breakdown" accentColor="bg-brand-orange" />
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {tutorials.pushups.map((t, i) => <GuideCard key={i} tutorial={t} />)}
        </div>
      </section>

      {/* Squat section */}
      <section>
        <SectionBanner
          imgUrl="https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=1200&q=80&fit=crop"
          title="Squat Variations"
          subtitle="Quads · Glutes · Hamstrings · Calves"
          accentColor="#3b82f6"
          to="/instructions/squats"
        />

        {/* Form carousel */}
        <div className="glass rounded-3xl border border-zinc-800/60 p-5 mb-6">
          <StepCarousel steps={SQUAT_STEPS} title="Standard Squat · Form Breakdown" accentColor="bg-accent-blue" />
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {tutorials.squats.map((t, i) => <GuideCard key={i} tutorial={t} />)}
        </div>
      </section>

    </div>
  </div>
);

export default FitnessGuide;
