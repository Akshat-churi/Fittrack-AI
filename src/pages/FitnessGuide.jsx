import React from 'react';
import { BookOpen, Activity, ArrowRight, Play } from 'lucide-react';
import { StepCarousel, PUSHUP_STEPS, SQUAT_STEPS } from '../components/ExerciseSteps';

const tutorials = {
  pushups: [
    {
      title: 'Standard Push-up',
      description: 'The classic upper-body exercise that targets chest, shoulders, and triceps.',
      steps: [
        'Start in a plank position with hands slightly wider than shoulder-width.',
        'Keep your body in a straight line from head to heels.',
        'Lower your body until your chest nearly touches the floor.',
        'Push back up to the starting position.'
      ],
      target: 'Chest, Shoulders, Triceps, Core',
      difficulty: 'Beginner'
    },
    {
      title: 'Diamond Push-up',
      description: 'A variation that places more emphasis on the triceps and inner chest.',
      steps: [
        'Form a diamond shape with your hands directly under your chest.',
        'Keep elbows tucked close to your body as you lower down.',
        'Push back up explosively.'
      ],
      target: 'Triceps, Inner Chest',
      difficulty: 'Intermediate'
    },
    {
      title: 'Wide Grip Push-up',
      description: 'Focuses more on the outer chest and shoulders.',
      steps: [
        'Place hands wider than standard, about 1.5 times shoulder-width.',
        'Lower your body, allowing elbows to flare out slightly.',
        'Push back up to the start.'
      ],
      target: 'Outer Chest, Shoulders',
      difficulty: 'Intermediate'
    },
    {
      title: 'Pike Push-up',
      description: 'An excellent shoulder-builder and progression towards handstand push-ups.',
      steps: [
        'Start in a downward dog yoga position (hips high in the air).',
        'Lower your head towards the floor between your hands.',
        'Push back up, keeping the hips elevated.'
      ],
      target: 'Shoulders, Upper Chest',
      difficulty: 'Advanced'
    }
  ],
  squats: [
    {
      title: 'Standard Squat',
      description: 'The foundational lower-body movement.',
      steps: [
        'Stand with feet shoulder-width apart, toes slightly pointed out.',
        'Keep your chest up and core braced.',
        'Push your hips back and bend your knees to lower down.',
        'Go as low as comfortable, then push through heels to stand.'
      ],
      target: 'Quads, Glutes, Hamstrings',
      difficulty: 'Beginner'
    },
    {
      title: 'Sumo Squat',
      description: 'Targets the inner thighs and glutes more heavily.',
      steps: [
        'Take a wide stance with toes pointed outwards at a 45-degree angle.',
        'Lower down while keeping your knees tracking over your toes.',
        'Squeeze glutes at the top of the movement.'
      ],
      target: 'Inner Thighs, Glutes',
      difficulty: 'Beginner'
    },
    {
      title: 'Jump Squat',
      description: 'A plyometric variation to build explosive power.',
      steps: [
        'Perform a standard squat to lower down.',
        'Explode upwards, jumping off the ground.',
        'Land softly and immediately go into the next repetition.'
      ],
      target: 'Quads, Calves, Cardiovascular System',
      difficulty: 'Intermediate'
    },
    {
      title: 'Bulgarian Split Squat',
      description: 'A challenging unilateral exercise for leg strength and balance.',
      steps: [
        'Stand a couple of feet in front of a bench or chair.',
        'Place one foot behind you on the elevated surface.',
        'Lower your body until your front thigh is parallel to the floor.',
        'Push back up through your front heel.'
      ],
      target: 'Quads, Glutes, Balance',
      difficulty: 'Advanced'
    }
  ]
};

const GuideCard = ({ tutorial }) => (
  <div className="glass rounded-2xl p-5 border border-zinc-800/40 hover:border-brand-orange/20 transition-all">
    <div className="flex justify-between items-start mb-4">
      <h3 className="text-base font-bold text-white">{tutorial.title}</h3>
      <span className={`badge text-[9px] ${
        tutorial.difficulty === 'Beginner'     ? 'badge-green' :
        tutorial.difficulty === 'Intermediate' ? 'badge-orange' : 'badge-red'
      }`}>{tutorial.difficulty}</span>
    </div>
    <p className="text-zinc-400 text-sm mb-5 leading-relaxed">{tutorial.description}</p>
    <div className="space-y-4">
      <div>
        <h4 className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-2.5">Steps</h4>
        <ol className="space-y-2.5">
          {tutorial.steps.map((step, idx) => (
            <li key={idx} className="flex gap-2.5 items-start text-zinc-300 text-sm">
              <span className="flex items-center justify-center w-5 h-5 rounded-lg bg-brand-orange/10 text-brand-orange text-[9px] font-black shrink-0 border border-brand-orange/20 mt-0.5">{idx+1}</span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="pt-3 border-t border-zinc-800/40 flex items-center gap-2">
        <Activity className="w-3.5 h-3.5 text-brand-orange shrink-0"/>
        <span className="text-xs text-zinc-500"><strong className="text-zinc-300 font-semibold">Targets:</strong> {tutorial.target}</span>
      </div>
    </div>
  </div>
);

const FitnessGuide = () => {
  return (
    <div className="page pb-24 md:pb-8">
      <div className="content-width space-y-10">
        <div className="text-center space-y-3 max-w-2xl mx-auto pt-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-orange/10 border border-brand-orange/20 mb-2">
            <BookOpen className="w-7 h-7 text-brand-orange"/>
          </div>
          <h1 className="section-title">Fitness <span className="text-gradient">Guide</span></h1>
          <p className="text-sm text-zinc-400 leading-relaxed">Master bodyweight exercises with step-by-step technique breakdowns.</p>
        </div>

        <div className="space-y-12 pb-6">
          <section>
            <div className="flex items-center gap-3 mb-6 border-l-4 border-brand-orange pl-4">
              <h2 className="text-xl font-black text-white">Push-up Variations</h2>
            </div>
            {/* ── Visual form guide ── */}
            <div className="glass rounded-3xl border border-zinc-800/60 p-5 mb-6">
              <StepCarousel
                steps={PUSHUP_STEPS}
                title="Standard Push-up · Form Breakdown"
                accentColor="bg-brand-orange"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {tutorials.pushups.map((t, i) => <GuideCard key={i} tutorial={t}/>)}
            </div>
          </section>
          <section>
            <div className="flex items-center gap-3 mb-6 border-l-4 border-accent-blue pl-4">
              <h2 className="text-xl font-black text-white">Squat Variations</h2>
            </div>
            {/* ── Visual form guide ── */}
            <div className="glass rounded-3xl border border-zinc-800/60 p-5 mb-6">
              <StepCarousel
                steps={SQUAT_STEPS}
                title="Standard Squat · Form Breakdown"
                accentColor="bg-accent-blue"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {tutorials.squats.map((t, i) => <GuideCard key={i} tutorial={t}/>)}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default FitnessGuide;
