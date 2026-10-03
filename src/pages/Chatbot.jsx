import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Activity, Plus, MessageSquare, Trash2, ChevronRight, Zap } from 'lucide-react';

/* ══════════════════════════════════════════════════════════════════════════════
   FITNESS & DIET KNOWLEDGE BASE
══════════════════════════════════════════════════════════════════════════════ */

const match = (msg, ...terms) => terms.some(t => msg.includes(t));

const getBotResponse = (rawMessage) => {
  const msg = rawMessage.toLowerCase().trim();

  // ── Greetings ──────────────────────────────────────────────────────────────
  if (match(msg, 'hello', 'hi', 'hey', 'sup', 'hola', 'namaste', 'good morning', 'good evening')) {
    return `Hey! 👋 I'm **FitBot**, your AI fitness & nutrition coach.\n\nI can help you with:\n💪 Workout plans & exercise form\n🥗 Diet, meal plans & macros\n🔥 Fat loss & muscle gain\n🧘 Recovery, sleep & flexibility\n📊 Calorie & protein calculation\n🏃 Cardio & endurance training\n💊 Supplements & hydration\n\nWhat's your fitness goal today?`;
  }

  // ── Identity ───────────────────────────────────────────────────────────────
  if (match(msg, 'who are you', 'what are you', 'your name', 'fitbot')) {
    return `I'm **FitBot** 🤖 — FitTrack AI's built-in fitness & nutrition assistant.\n\nI'm trained on evidence-based sports nutrition, exercise science, and workout programming. Ask me anything about your diet, training, or recovery!`;
  }

  // ── BMR / TDEE / Calorie calculation ──────────────────────────────────────
  if (match(msg, 'calorie', 'calories', 'tdee', 'bmr', 'maintenance', 'how much should i eat', 'daily intake')) {
    if (match(msg, 'deficit', 'lose', 'cut')) {
      return `**Calorie Deficit for Fat Loss** 🔥\n\nFormula: TDEE × 0.8 (20% deficit)\n\n📌 Example for 70kg person:\n• Sedentary: ~1,760 kcal/day\n• Moderate activity: ~2,000 kcal/day\n• Very active: ~2,240 kcal/day\n\n✅ Tips:\n• Never drop below 1,200 (women) or 1,500 (men) kcal\n• Aim to lose 0.5–1 kg per week\n• Keep protein high (1.8–2g/kg) to preserve muscle\n• Track with MyFitnessPal or FitTrack PRO Nutrition Planner`;
    }
    if (match(msg, 'surplus', 'gain', 'bulk')) {
      return `**Calorie Surplus for Muscle Gain** 💪\n\nFormula: TDEE + 200–500 kcal\n\n📌 Lean bulk guideline:\n• Add ~250 kcal above TDEE\n• Target 0.25–0.5 kg weight gain per week\n• Protein: 1.6–2.2g/kg bodyweight\n• Carbs: 4–7g/kg on training days\n\n✅ Eat calorie-dense whole foods:\n• Oats, rice, bananas, sweet potato\n• Eggs, chicken, fish, whey protein\n• Nuts, nut butters, full-fat dairy`;
    }
    return `**Daily Calorie Needs (TDEE)** 📊\n\nEstimated targets by weight & activity:\n\n| Weight | Sedentary | Moderate | Active |\n|--------|-----------|----------|--------|\n| 55 kg  | 1,650     | 1,930    | 2,120  |\n| 65 kg  | 1,850     | 2,150    | 2,380  |\n| 75 kg  | 2,050     | 2,390    | 2,640  |\n| 85 kg  | 2,250     | 2,625    | 2,900  |\n\nUse our **PRO Nutrition Planner** for a personalised calculation based on your exact height, weight, age and goal!`;
  }

  // ── Protein ────────────────────────────────────────────────────────────────
  if (match(msg, 'protein')) {
    if (match(msg, 'source', 'food', 'which', 'what')) {
      return `**Best Protein Sources** 🥩\n\n🐔 Animal proteins (complete):\n• Chicken breast – 31g per 100g\n• Eggs – 6g per egg\n• Greek yogurt – 10g per 100g\n• Cottage cheese – 11g per 100g\n• Salmon/tuna – 25–28g per 100g\n• Whey protein – 25g per scoop\n\n🌱 Plant proteins:\n• Lentils – 9g per 100g cooked\n• Chickpeas – 8g per 100g\n• Tofu – 8g per 100g\n• Paneer – 18g per 100g\n• Tempeh – 19g per 100g\n• Soybeans – 36g per 100g dry`;
    }
    return `**Protein — Your Most Important Macro** 💪\n\n📌 Daily requirements:\n• General health: 0.8g/kg\n• Active lifestyle: 1.2–1.6g/kg\n• Muscle building: 1.6–2.2g/kg\n• Fat loss (preserve muscle): 1.8–2.4g/kg\n\n✅ Pro tips:\n• Spread protein across 4–5 meals (25–40g each)\n• Have protein within 60 min post-workout\n• Leucine-rich foods (eggs, meat, whey) trigger best muscle synthesis\n• Plant protein requires combining sources for all amino acids`;
  }

  // ── Carbs ──────────────────────────────────────────────────────────────────
  if (match(msg, 'carb', 'carbohydrate', 'sugar', 'starchy')) {
    if (match(msg, 'avoid', 'bad', 'cut', 'no carb', 'low carb', 'keto')) {
      return `**Low-Carb & Keto** 🥑\n\nLow-carb: < 100–150g carbs/day\nKeto: < 20–50g carbs/day (forces ketosis)\n\n✅ Benefits:\n• Quick initial weight loss (mostly water)\n• Reduced insulin spikes\n• May help with appetite control\n\n⚠️ Drawbacks:\n• Hard to sustain for athletes\n• Low energy for intense training\n• Muscle loss risk without enough protein\n\n🧠 Better approach for most people: **moderate carbs** timed around workouts!`;
    }
    return `**Carbohydrates — Your Energy Source** ⚡\n\n✅ Best complex carbs:\n• Oats, brown rice, quinoa, barley\n• Sweet potato, regular potato\n• Whole wheat bread/pasta\n• Fruits: banana, apple, berries, mango\n• Legumes: lentils, chickpeas, kidney beans\n\n⏱️ Timing tips:\n• Pre-workout (1–2 hrs before): banana, oats, rice\n• Post-workout: fast carbs (white rice, fruit) + protein\n• Evening: lighter carbs, more veg-based\n\n📌 Target: 40–60% of daily calories`;
  }

  // ── Fats ───────────────────────────────────────────────────────────────────
  if (match(msg, 'fat', 'omega', 'healthy fat', 'saturated', 'unsaturated')) {
    return `**Dietary Fats — Don't Fear Them!** 🥑\n\n✅ Healthy fats (prioritise these):\n• Avocado & avocado oil\n• Olive oil (extra virgin)\n• Fatty fish: salmon, sardines, mackerel\n• Nuts: almonds, walnuts, cashews\n• Seeds: chia, flax, pumpkin\n• Nut butters (natural, no added sugar)\n\n🚫 Limit / avoid:\n• Trans fats (hydrogenated oils, deep fried)\n• Excessive saturated fat (processed meat)\n\n📌 Target: 20–35% of daily calories from fat\n💊 Consider Omega-3 supplement (2–3g EPA+DHA/day) if you don't eat fish regularly`;
  }

  // ── Hydration / Water ──────────────────────────────────────────────────────
  if (match(msg, 'water', 'hydrat', 'electrolyte', 'drink', 'thirst')) {
    return `**Hydration Guide** 💧\n\n📌 General targets:\n• Baseline: 35ml per kg bodyweight\n• 70kg person: ~2.5L/day\n• Add 500–750ml per hour of exercise\n• Hot climate: add extra 500ml–1L\n\n✅ Tips:\n• Start the day with 500ml water\n• Pale yellow urine = well hydrated 🟡\n• Dark yellow = drink more 🟠\n• Drink 300–500ml 30–60 min before training\n• Add electrolytes (sodium, potassium, magnesium) during sessions > 60 min\n\n🚫 Avoid:\n• Sugary sports drinks unless doing 90+ min exercise\n• Excessive caffeine (mild diuretic)`;
  }

  // ── Meal Plans ─────────────────────────────────────────────────────────────
  if (match(msg, 'meal plan', 'diet plan', 'weekly diet', 'what to eat')) {
    if (match(msg, 'fat loss', 'lose weight', 'cut', 'deficit')) {
      return `**Fat Loss Meal Plan (1,800 kcal)** 🔥\n\n🌅 Breakfast:\n• Oats (50g) + skimmed milk + ½ banana\n• 2 boiled eggs\n• Black coffee/green tea\n→ ~450 kcal | 28g protein\n\n☀️ Lunch:\n• Brown rice (100g cooked) + grilled chicken (150g)\n• Mixed salad + lemon-olive oil dressing\n→ ~540 kcal | 42g protein\n\n🍎 Snack:\n• Greek yogurt (150g) + 10 almonds\n→ ~200 kcal | 14g protein\n\n🌙 Dinner:\n• 2 multigrain rotis + paneer bhurji (100g low-fat)\n• Stir-fried vegetables\n→ ~520 kcal | 28g protein\n\n💧 Water: 3L | 📊 Total: ~1,800 kcal | 112g protein`;
    }
    if (match(msg, 'muscle', 'bulk', 'gain', 'surplus')) {
      return `**Muscle Gain Meal Plan (2,800 kcal)** 💪\n\n🌅 Breakfast:\n• 3 whole eggs scrambled + 2 whites\n• Oats (80g) + full-fat milk + 1 banana\n• 1 tbsp peanut butter\n→ ~700 kcal | 45g protein\n\n☀️ Lunch:\n• White rice (200g) + chicken/fish (200g)\n• Rajma/kidney beans (½ cup) + salad\n→ ~750 kcal | 55g protein\n\n🍎 Pre-workout snack:\n• Banana + whey shake\n→ ~350 kcal | 28g protein\n\n🌙 Dinner:\n• 3 rotis + paneer (150g) + sabzi\n• Full-fat curd (150g)\n→ ~700 kcal | 40g protein\n\n🌙 Before bed:\n• Cottage cheese / casein shake\n→ ~200 kcal | 24g protein\n\n💧 Water: 3.5L | 📊 Total: ~2,800 kcal | 192g protein`;
    }
    return `**Balanced Maintenance Meal Plan (2,200 kcal)** ⚖️\n\n🌅 Breakfast:\n• 2 eggs (any style) + oats (60g) + 1 fruit\n→ ~480 kcal | 28g protein\n\n☀️ Lunch:\n• Rice or 2 rotis + dal (1 cup)\n• Vegetable sabzi + paneer/chicken (100g) + salad\n→ ~620 kcal | 38g protein\n\n🍎 Snack:\n• Makhana/roasted chana + fruit\n→ ~200 kcal | 8g protein\n\n🌙 Dinner:\n• 2 rotis + mixed vegetable curry\n• Curd (100g) + light soup\n→ ~520 kcal | 22g protein\n\n💧 Water: 2.5–3L | 📊 Total: ~2,200 kcal | 96g protein`;
  }

  // ── Breakfast / Lunch / Dinner / Snacks ───────────────────────────────────
  if (match(msg, 'breakfast')) {
    return `**Healthy Breakfast Ideas** 🌅\n\n🥣 High-protein options:\n• Oatmeal + berries + nuts + protein scoop\n• Greek yogurt + granola + fruit\n• Egg bhurji / scrambled eggs + toast + avocado\n• Paneer paratha (limited oil) + curd\n\n🚀 Quick options:\n• Banana + peanut butter + milk\n• Smoothie: spinach + banana + whey + almond milk\n• Overnight oats prepped the night before\n\n⏰ Eat within 1–2 hrs of waking up for best metabolic function!\n🚫 Avoid: sugary cereals, white bread alone, skipping breakfast`;
  }
  if (match(msg, 'lunch')) {
    return `**Healthy Lunch Ideas** ☀️\n\n🥗 Balanced options:\n• Grilled chicken + brown rice + salad\n• Dal + roti + sabzi + curd (classic Indian balanced meal!)\n• Tuna/salmon wrap with veggies\n• Buddha bowl: grains + protein + roasted veg + tahini\n\n🇮🇳 Indian options:\n• Rajma-rice (great protein combo!)\n• Chole + roti\n• Moong dal khichdi\n• Grilled paneer with quinoa salad\n\n📌 Aim for: 35% of your daily calories at lunch`;
  }
  if (match(msg, 'dinner')) {
    return `**Healthy Dinner Ideas** 🌙\n\nKeep dinner lighter to support sleep and digestion:\n\n🍽️ Lean options:\n• Baked/grilled fish + roasted vegetables\n• Stir-fried tofu/paneer + quinoa\n• Soup + 2 rotis + light sabzi\n• Egg white omelette + whole grain toast + salad\n\n⚠️ Avoid before bed:\n• Heavy fried foods\n• Large portions of fast carbs alone\n• Excess sugar\n\n✅ Include: lean protein + fibre-rich veggies + small portion of slow carbs`;
  }
  if (match(msg, 'snack', 'snacks', 'between meals', 'mid-meal')) {
    return `**Smart Snack Ideas** 🍎\n\nPre/post workout:\n• Banana + peanut butter 🍌\n• Rice cakes + almond butter\n• Whey shake + milk\n• Boiled eggs (2)\n\nLight snacks:\n• Greek yogurt (150g)\n• Handful of mixed nuts (30g) + fruit\n• Roasted chana / makhana\n• Carrot/cucumber sticks + hummus\n• Low-sugar protein bar\n\n🚫 Avoid: chips, biscuits, sugary drinks, processed snacks\n\n📌 Ideal snack: 150–250 kcal with at least 10–15g protein`;
  }

  // ── Fat Loss ───────────────────────────────────────────────────────────────
  if (match(msg, 'lose weight', 'fat loss', 'weight loss', 'lose fat', 'cut fat', 'slim', 'reduce weight')) {
    return `**Fat Loss Blueprint** 🔥\n\n1️⃣ **Nutrition (80% of results):**\n• Caloric deficit: -300 to -500 kcal/day\n• Protein: 1.8–2.2g/kg (prevents muscle loss)\n• Reduce sugar, alcohol, refined carbs\n• Eat more veggies (volume eating)\n\n2️⃣ **Training:**\n• Strength training 3–4x/week (preserves muscle)\n• Cardio 2–3x/week (HIIT or steady-state)\n• Stay active daily (7,000–10,000 steps)\n\n3️⃣ **Lifestyle:**\n• Sleep 7–9 hours (poor sleep = more cravings)\n• Manage stress (cortisol raises fat storage)\n• Drink 2.5–3L water daily\n• Track food intake — awareness is key!\n\n📊 Realistic goal: 0.5–1 kg fat loss per week`;
  }

  // ── Muscle Building ────────────────────────────────────────────────────────
  if (match(msg, 'build muscle', 'gain muscle', 'muscle building', 'bulk', 'mass', 'hypertrophy', 'bigger')) {
    return `**Muscle Building Guide** 💪\n\n1️⃣ **Training:**\n• Resistance training 4–5x/week\n• Progressive overload (add weight/reps weekly)\n• Each muscle 2x/week minimum\n• Rep range: 6–12 for hypertrophy\n\n2️⃣ **Nutrition:**\n• Caloric surplus: +200–500 kcal\n• Protein: 1.6–2.2g/kg/day\n• Carbs: 4–6g/kg on training days\n• Eat every 3–4 hours\n\n3️⃣ **Recovery:**\n• Sleep 8–9 hours (GH released during deep sleep!)\n• Deload every 4–6 weeks\n• Creatine monohydrate (3–5g/day) — most studied supplement\n\n📈 Realistic gain: 0.5–2 kg muscle/month for beginners\n⏳ Consistency for 8–12 weeks before judging results!`;
  }

  // ── Push-ups ───────────────────────────────────────────────────────────────
  if (match(msg, 'push up', 'push-up', 'pushup')) {
    return `**Push-Up Mastery Guide** 💪\n\n✅ Perfect form cues:\n• Hands slightly wider than shoulder-width\n• Core tight, body in a straight line (head to heel)\n• Lower until chest is ~2cm from floor\n• Elbows at 45° angle (not flared out)\n• Exhale as you push up\n\n📈 Progressions:\n• Beginner: Knee push-ups → Incline push-ups\n• Standard: Regular push-ups\n• Advanced: Diamond → Decline → Archer → One-arm\n• Elite: Plyometric, clap push-ups\n\n🎯 Challenge: 100 push-ups in a day? Do 10 sets of 10!\n\n💡 Use FitTrack AI's camera tracker for real-time form feedback!`;
  }

  // ── Squats ─────────────────────────────────────────────────────────────────
  if (match(msg, 'squat')) {
    return `**Squat Mastery Guide** 🦵\n\n✅ Perfect form cues:\n• Feet shoulder-width, toes slightly out\n• Chest up, spine neutral, core braced\n• Hinge hips first, then bend knees\n• Knees track over toes (don't cave in)\n• Thighs parallel or lower at bottom\n• Drive through heels to stand\n\n📈 Progressions:\n• Beginner: Chair squat, goblet squat\n• Intermediate: Back squat, front squat\n• Advanced: Overhead squat, pistol squat, jump squat\n\n🎯 Variations & targets:\n• Sumo squat → inner thighs + glutes\n• Bulgarian split → single-leg strength\n• Box squat → controlled depth\n\n💡 Track your form with FitTrack AI's Squat Tracker!`;
  }

  // ── Workout Plans ──────────────────────────────────────────────────────────
  if (match(msg, 'workout plan', 'training plan', 'exercise plan', 'weekly plan', 'program')) {
    if (match(msg, 'beginner', 'newbie', 'new', 'start', 'starting out')) {
      return `**Beginner Workout Plan (3 days/week)** 🏋️\n\n📅 Monday — Upper Body:\n• Push-ups: 3×10\n• Incline push-ups: 2×12\n• Pike push-ups: 2×10\n• Plank: 3×30 sec\n\n📅 Wednesday — Lower Body:\n• Bodyweight squats: 3×15\n• Lunges: 3×10 each leg\n• Glute bridges: 3×15\n• Calf raises: 3×20\n\n📅 Friday — Full Body:\n• Burpees: 3×8\n• Mountain climbers: 3×20\n• Jumping jacks: 3×30\n• Core circuit: plank + crunches\n\n✅ Rest: 60–90 sec between sets\n📈 Increase reps/sets every 2 weeks`;
    }
    if (match(msg, 'intermediate', 'moderate', '6 months', 'some experience')) {
      return `**Intermediate 4-Day Split** 🏋️\n\n📅 Monday — Push (Chest/Shoulders/Triceps):\n• Push-ups / bench press: 4×10–12\n• Dips: 3×10\n• Overhead press: 3×10\n• Lateral raises: 3×15\n\n📅 Tuesday — Pull (Back/Biceps):\n• Pull-ups: 4×6–8\n• Bent-over rows: 3×10\n• Bicep curls: 3×12\n• Face pulls: 3×15\n\n📅 Thursday — Legs:\n• Squats: 4×8–10\n• Romanian deadlift: 3×10\n• Lunges: 3×10 each\n• Leg raises: 3×15\n\n📅 Friday — Cardio + Core:\n• 20 min HIIT or run\n• Plank circuit: 4 variations × 30 sec\n• Ab wheel rollouts: 3×10`;
    }
    return `**Home Workout Plan (No Equipment)** 🏠\n\n📅 Day 1 — Upper Push:\n• Push-ups: 4×15 | Diamond: 3×12 | Pike press: 3×10 | Dips (chair): 3×12\n\n📅 Day 2 — Lower Body:\n• Squats: 4×20 | Jump squats: 3×15 | Lunges: 3×12e | Glute bridge: 4×20\n\n📅 Day 3 — Cardio:\n• Jump rope or burpees: 20 min HIIT (20s on / 10s off)\n\n📅 Day 4 — Upper Pull + Core:\n• Table rows: 4×12 | Superman: 3×15 | Plank: 4×45s | Dead bug: 3×10e\n\n📅 Day 5 — Full Body:\n• 5 rounds: 10 push-ups + 15 squats + 10 lunges + 30s plank\n\n📅 Days 6–7: Rest / light yoga / walking`;
  }

  // ── Cardio ─────────────────────────────────────────────────────────────────
  if (match(msg, 'cardio', 'running', 'jogging', 'hiit', 'aerobic', 'endurance', 'treadmill')) {
    if (match(msg, 'hiit', 'interval', 'high intensity')) {
      return `**HIIT Training Guide** ⚡\n\n✅ What is HIIT?\nHigh-Intensity Interval Training alternates between hard effort and rest.\n\n📌 Sample 20-min HIIT:\n• Warm-up: 3 min light jog / march\n• 8 rounds: 30s ALL-OUT (sprints/burpees) + 30s rest\n• Cool-down: 3 min walk + stretch\n\n🔥 Benefits:\n• Burns more fat in less time than steady cardio\n• Afterburn effect (EPOC) — burns calories for hours after\n• Improves VO2 max and cardiovascular health\n\n⚠️ Limit to 2–3 sessions/week — hard on joints & CNS\n✅ Beginners: start with 20s work / 40s rest`;
    }
    return `**Cardio Guidelines** 🏃\n\n📌 WHO Recommendations:\n• 150 min/week moderate intensity OR\n• 75 min/week vigorous intensity\n• + 2 days strength training\n\n🏃 Moderate: brisk walk, cycling, swimming, elliptical\n⚡ Vigorous: running, HIIT, jump rope, fast cycling\n\n🔥 For fat loss:\n• Fasted cardio (morning, before breakfast) — optional but effective\n• 30–45 min at 60–70% max heart rate (fat-burning zone)\n• Max HR = 220 − your age\n\n💡 Best combo: 2–3x strength + 2–3x cardio per week`;
  }

  // ── Recovery / Sleep ───────────────────────────────────────────────────────
  if (match(msg, 'recovery', 'rest day', 'overtraining', 'burnout', 'overtrain')) {
    return `**Recovery & Rest Guide** 😴\n\n✅ Recovery is where growth happens!\n\n🛌 Sleep (most important):\n• 7–9 hours/night minimum\n• Growth hormone peaks during deep sleep\n• Poor sleep = more cravings + less fat loss\n\n📅 Rest days (1–2/week):\n• Active recovery: walk, yoga, light stretching\n• Not total inactivity — keep blood flowing\n\n🍽️ Nutrition for recovery:\n• Protein within 60 min post-workout\n• Carbs + protein combo (rice + chicken, oats + eggs)\n• Anti-inflammatory foods: turmeric, ginger, berries, salmon\n\n🛁 Recovery tools:\n• Foam rolling / massage\n• Cold shower or ice bath (reduces inflammation)\n• Stretching + mobility work\n\n⚠️ Signs of overtraining: fatigue, poor sleep, declining performance, irritability`;
  }

  if (match(msg, 'sleep', 'insomnia', 'can\'t sleep', 'sleep better')) {
    return `**Sleep & Fitness** 😴\n\nSleep is the #1 recovery tool — here's how to optimize it:\n\n✅ Sleep hygiene tips:\n• Consistent bedtime (same time daily, even weekends)\n• Dark, cool room (18–20°C ideal)\n• No screens 30–60 min before bed\n• Avoid caffeine after 2pm\n• No heavy meals within 2 hrs of sleep\n\n🌙 Pre-sleep nutrition:\n• Casein protein (cottage cheese, milk) = slow release overnight\n• Tart cherry juice — natural melatonin source\n• Magnesium glycinate supplement can improve sleep quality\n\n📌 Sleep & body composition:\n• 5–6 hrs sleep: 55% fat loss vs 7–8 hrs (same diet!)\n• Sleep deprivation increases ghrelin (hunger hormone) by 15%`;
  }

  // ── DOMS / Soreness ────────────────────────────────────────────────────────
  if (match(msg, 'sore', 'soreness', 'doms', 'muscle pain', 'stiff', 'recovery after')) {
    return `**Managing DOMS (Delayed Onset Muscle Soreness)** 💪\n\nDOMS peaks 24–72 hrs after training. It's a normal sign of muscle adaptation!\n\n✅ Speed up recovery:\n• **Light movement** — gentle walk/stretching (increases blood flow)\n• **Foam rolling** — 60–90 sec on each sore area\n• **Warm bath** — relaxes muscles, reduces stiffness\n• **Protein & carbs** — fuel muscle repair\n• **Sleep** — 80% of repair happens while sleeping\n\n🍒 Anti-inflammatory foods:\n• Tart cherry juice, turmeric milk, salmon, ginger tea\n\n⚠️ When to worry:\n• Sharp pain during movement = stop & rest\n• Swelling + warmth = possible injury\n• Muscle cramps = electrolyte deficiency`;
  }

  // ── Supplements ────────────────────────────────────────────────────────────
  if (match(msg, 'supplement', 'whey', 'creatine', 'bcaa', 'pre-workout', 'protein powder', 'vitamin', 'fish oil')) {
    if (match(msg, 'creatine')) {
      return `**Creatine — Most Studied Supplement** 💊\n\n✅ What it does:\n• Increases ATP production (fuel for explosive movements)\n• Improves strength, power, muscle size\n• Helps with brain health & recovery\n\n📌 How to take:\n• 3–5g creatine monohydrate daily\n• No loading phase needed\n• Take at any time — consistency matters\n• Drink extra water (1 extra glass/day)\n\n⚠️ Safe for healthy individuals\n🚫 No need for expensive forms — monohydrate is best value`;
    }
    if (match(msg, 'whey', 'protein powder')) {
      return `**Whey Protein Guide** 🥛\n\n✅ Types:\n• Whey Concentrate (70–80% protein, cheaper, some lactose)\n• Whey Isolate (90%+ protein, less lactose, premium)\n• Casein (slow-digesting, great before bed)\n\n📌 When to use:\n• Post-workout: 25–40g within 60 min\n• Morning if struggling to hit protein goals\n• Before bed: casein protein\n\n🇮🇳 Good brands in India: MuscleBlaze, ON (Optimum Nutrition), MyProtein, AS-IT-IS\n\n⚠️ Real food > supplements. Whey is a convenient top-up, not a replacement!`;
    }
    return `**Top Evidence-Based Supplements** 💊\n\nTier 1 (Most effective):\n• 🔵 **Creatine monohydrate** — strength + muscle size (3–5g/day)\n• 🟠 **Whey protein** — convenient protein source\n• 🟡 **Caffeine** — performance + fat loss (200–400mg pre-workout)\n• 🟢 **Omega-3 / Fish oil** — inflammation, brain health (2–3g EPA+DHA)\n• ⬜ **Vitamin D3** — immunity, hormones, mood (1,000–2,000 IU)\n\nTier 2 (Some evidence):\n• Magnesium glycinate — sleep + recovery\n• Beta-alanine — endurance (3.2–6.4g/day)\n• Ashwagandha — stress + testosterone (600mg/day)\n• Zinc — testosterone + immunity\n\n🚫 Skip: most fat burners, BCAAs if eating enough protein, testosterone boosters`;
  }

  // ── Stretching / Flexibility / Yoga ───────────────────────────────────────
  if (match(msg, 'stretch', 'flexibility', 'yoga', 'mobility', 'tight')) {
    return `**Stretching & Mobility Guide** 🧘\n\n📌 Types of stretching:\n• **Dynamic** (before workout): leg swings, arm circles, hip circles\n• **Static** (after workout): hold 20–30 sec, don't bounce\n• **Foam rolling** (any time): 60–90 sec per muscle\n\n🧘 Key stretches to do daily:\n• Hip flexor lunge stretch (desk workers!)\n• Hamstring stretch\n• Chest opener / doorway stretch\n• Thoracic spine rotation\n• Pigeon pose (hips + glutes)\n\n✅ Benefits:\n• Reduces injury risk\n• Improves performance\n• Better posture\n• Less back/neck pain\n\n⏰ Just 10 min of mobility work daily = huge long-term gains!`;
  }

  // ── Abs / Core ─────────────────────────────────────────────────────────────
  if (match(msg, 'abs', 'six pack', 'core', 'belly fat', 'flat stomach', 'stomach')) {
    return `**Abs & Core Training Guide** 💪\n\n🔑 Truth: **Abs are made in the kitchen!**\n• You can't spot-reduce belly fat\n• Visible abs require low body fat (men <15%, women <22%)\n\n✅ Best core exercises:\n• **Stability**: Plank, dead bug, bird-dog, Pallof press\n• **Strength**: Ab wheel rollout, hanging leg raise, dragon flag\n• **Rotation**: Russian twists, woodchops\n• **Anti-extension**: RKC plank, ab wheel\n\n📅 Core training: 3–4x/week, 10–15 min\n\n🔥 Belly fat strategy:\n• Caloric deficit + high protein\n• Compound lifts (squats/deadlifts) burn more fat than crunches\n• Reduce alcohol (empty calories + fat storage)\n• Manage stress/cortisol (high cortisol = belly fat storage)`;
  }

  // ── Pre/Post Workout Nutrition ─────────────────────────────────────────────
  if (match(msg, 'pre workout', 'pre-workout', 'before workout', 'before gym')) {
    return `**Pre-Workout Nutrition** ⚡\n\n📌 Timing:\n• Full meal: 2–3 hours before\n• Snack: 30–60 min before\n\n✅ Best pre-workout foods:\n• Banana + peanut butter 🍌\n• Oats + honey + milk\n• White rice + chicken (2–3 hrs before)\n• Whole grain toast + eggs\n\n💊 Supplements (optional):\n• Caffeine: 3–6mg/kg, 30–45 min before (most effective)\n• Creatine: any time of day\n• Beta-alanine: if doing high-rep work\n\n🚫 Avoid: high-fat or high-fibre meals right before — can cause GI issues`;
  }
  if (match(msg, 'post workout', 'post-workout', 'after workout', 'after gym', 'after training')) {
    return `**Post-Workout Nutrition** 🔄\n\n📌 The anabolic window: eat within 30–90 min post-workout\n\n✅ Ideal post-workout meal:\n• **Protein**: 25–40g (whey shake, chicken, eggs, Greek yogurt)\n• **Carbs**: 30–60g (banana, white rice, oats, fruit)\n• **Hydration**: 500ml+ water with electrolytes\n\n🍽️ Great combos:\n• Whey shake + banana\n• Rice + chicken + salad\n• Eggs on toast\n• Greek yogurt + berries + granola\n\n⚠️ Skipping post-workout nutrition = slower recovery, less muscle growth!`;
  }

  // ── Indian Diet specific ───────────────────────────────────────────────────
  if (match(msg, 'indian', 'india', 'vegetarian', 'vegan', 'dal', 'roti', 'rice', 'paneer', 'desi', 'south indian', 'north indian')) {
    return `**Indian Diet for Fitness** 🇮🇳\n\n✅ Excellent Indian protein sources:\n• Paneer: 18g protein/100g — great for veg lifters!\n• Dal (lentils): 9g/100g cooked — eat daily\n• Rajma/Chole: 8–9g/100g cooked\n• Eggs: 6g each — most affordable\n• Chicken: 27–31g/100g\n\n🥗 Healthy swaps:\n• White rice → Brown rice or millets (bajra, jowar)\n• Maida roti → Multigrain/wheat roti\n• Full-fat paneer → Low-fat paneer\n• Deep-fried snacks → Roasted chana, makhana\n\n🍽️ Balanced Indian meal template:\n• Dal + roti/rice + sabzi + curd + salad\n→ This is perfect! Just watch portion sizes.\n\n💡 Curd (dahi) is a probiotic superfood — eat daily for gut health!`;
  }

  // ── Weight & Body Composition ──────────────────────────────────────────────
  if (match(msg, 'bmi', 'body fat', 'body composition', 'ideal weight', 'healthy weight')) {
    return `**Body Composition Guide** 📊\n\n✅ Healthy body fat ranges:\n| Category       | Men       | Women      |\n|----------------|-----------|------------|\n| Essential fat  | 2–5%      | 10–13%     |\n| Athletes       | 6–13%     | 14–20%     |\n| Fitness        | 14–17%    | 21–24%     |\n| Acceptable     | 18–24%    | 25–31%     |\n| Obese          | 25%+      | 32%+       |\n\n📌 BMI limitations:\n• BMI doesn't account for muscle mass\n• A muscular athlete may be "overweight" by BMI\n• Waist circumference is a better health indicator\n\n✅ Waist health targets:\n• Men: < 94 cm (< 80 cm optimal)\n• Women: < 80 cm (< 70 cm optimal)`;
  }

  // ── Motivation ────────────────────────────────────────────────────────────
  if (match(msg, 'motivat', 'lazy', 'no motivation', 'give up', 'hard to stay', 'consistency', 'discipline')) {
    return `**Staying Consistent — Mindset Guide** 🧠\n\n🔑 Truth: Motivation is temporary. Discipline is permanent.\n\n✅ Proven strategies:\n• **Identity-based habits**: "I am someone who exercises" → every workout reinforces that identity\n• **Reduce friction**: lay out gym clothes the night before, pre-plan meals\n• **2-minute rule**: commit to just 2 minutes — you'll usually keep going\n• **Track progress**: photos, measurements, workout logs — seeing progress = motivation\n• **Accountability**: workout buddy, squads feature, social features\n• **Celebrate small wins**: every workout counts!\n\n📅 Building the habit:\n• 3–4 weeks of consistent effort forms the habit\n• Don't break the chain (streak tracking!)\n\n💭 Remember your **WHY**: health, longevity, confidence, energy, family`;
  }

  // ── Stretching / Warm up / Cool down ──────────────────────────────────────
  if (match(msg, 'warm up', 'warmup', 'cool down', 'cooldown')) {
    return `**Warm Up & Cool Down Guide** 🔥\n\n🔥 Warm-Up (5–10 min before training):\n• 3 min light cardio (jog, jump rope, jumping jacks)\n• Dynamic stretches:\n  - Leg swings (front/back + side/side) × 10 each\n  - Arm circles × 10 each direction\n  - Hip circles × 10\n  - Bodyweight squats × 10\n  - Inchworms × 5\n\n✅ Benefits: increases blood flow, raises core temp, activates nervous system, prevents injury\n\n🧊 Cool-Down (5–10 min after):\n• 3 min light walk\n• Static stretches (hold 20–30 sec):\n  - Quad stretch\n  - Hamstring stretch\n  - Hip flexor lunge\n  - Chest/shoulder stretch\n  - Child's pose\n\n✅ Benefits: reduces DOMS, lowers heart rate, improves flexibility`;
  }

  // ── Plank ─────────────────────────────────────────────────────────────────
  if (match(msg, 'plank')) {
    return `**Plank — Core King** 🧘\n\n✅ Perfect form:\n• Forearms on floor, elbows under shoulders\n• Body in a straight line (no sagging hips or raised butt!)\n• Core + glutes + quads all braced\n• Look at the floor (neutral neck)\n• Breathe normally — don't hold your breath\n\n📈 Progression plan:\n• Week 1–2: 3 × 20 sec\n• Week 3–4: 3 × 30 sec\n• Week 5–6: 3 × 45 sec\n• Week 7–8: 3 × 60 sec\n• Advanced: RKC plank, plank with shoulder taps, plank rows\n\n🎯 Variations:\n• Side plank (obliques) | Reverse plank (glutes/back)\n• Plank + leg raise | Dynamic plank (up-downs)`;
  }

  // ── Thanking / Goodbye ────────────────────────────────────────────────────
  if (match(msg, 'thank', 'thanks', 'thx', 'appreciate', 'helpful')) {
    return `You're welcome! 💪 Happy to help you crush your fitness goals.\n\nRemember: **Small, consistent actions > occasional perfection.**\n\nKeep tracking your workouts, eating well, and sleeping enough. You've got this! 🔥`;
  }
  if (match(msg, 'bye', 'goodbye', 'see you', 'later', 'cya')) {
    return `Stay strong and keep grinding! 💪🔥 Come back anytime you need fitness or nutrition advice. Goodbye and great training! 🏆`;
  }

  // ── Default ───────────────────────────────────────────────────────────────
  return `That's a great question! I can help with:\n\n💪 **Workouts**: push-ups, squats, plans, exercises\n🥗 **Nutrition**: meals, macros, calorie targets\n🔥 **Goals**: fat loss, muscle gain, maintenance\n💊 **Supplements**: protein, creatine, vitamins\n😴 **Recovery**: sleep, soreness, rest days\n🧘 **Flexibility**: stretching, yoga, mobility\n\nTry asking something like:\n• *"What should I eat to lose fat?"*\n• *"Give me a beginner workout plan"*\n• *"How much protein do I need?"*\n• *"Best foods for muscle gain"*`;
};

/* ══════════════════════════════════════════════════════════════════════════════
   QUICK PROMPT CHIPS
══════════════════════════════════════════════════════════════════════════════ */

const QUICK_PROMPTS = [
  { label: '🔥 Fat loss plan',        text: 'Give me a complete fat loss diet and workout plan' },
  { label: '💪 Build muscle',         text: 'How do I build muscle fast? Give me a meal and training plan' },
  { label: '🥗 Meal plan today',      text: 'Give me a full day healthy meal plan' },
  { label: '🍗 Protein sources',      text: 'What are the best protein food sources for fitness?' },
  { label: '📊 Calorie calculator',   text: 'How many calories should I eat per day?' },
  { label: '🏋️ Beginner workout',     text: 'Give me a beginner workout plan I can do at home' },
  { label: '💧 Hydration guide',      text: 'How much water should I drink daily for fitness?' },
  { label: '😴 Recovery tips',        text: 'How can I improve my recovery between workouts?' },
  { label: '💊 Best supplements',     text: 'What are the best supplements for fitness?' },
  { label: '🧘 Stretching routine',   text: 'Give me a daily stretching and mobility routine' },
  { label: '🇮🇳 Indian diet plan',    text: 'Give me a healthy Indian vegetarian diet plan for fitness' },
  { label: '⚡ HIIT workout',         text: 'Give me a 20-minute HIIT workout I can do at home' },
];

/* ══════════════════════════════════════════════════════════════════════════════
   STORAGE
══════════════════════════════════════════════════════════════════════════════ */

const STORAGE_KEY = 'fitbot_conversations';

const loadConversations = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
};

const saveConversations = (convos) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(convos));

const defaultMessages = () => ([{
  id: 1,
  sender: 'bot',
  text: "Hey! I'm **FitBot** 🤖 — your AI fitness & nutrition coach.\n\nAsk me about workouts, meal plans, macros, supplements, recovery — anything fitness-related!\n\nOr pick a quick topic below 👇",
}]);

/* ══════════════════════════════════════════════════════════════════════════════
   FORMAT BOT TEXT — render **bold** and line breaks
══════════════════════════════════════════════════════════════════════════════ */

const FormattedText = ({ text }) => {
  // Split into lines, then render bold (**text**) inside each line
  const renderLine = (line, lineIdx) => {
    const parts = line.split(/\*\*(.+?)\*\*/g);
    return (
      <span key={lineIdx}>
        {parts.map((p, i) =>
          i % 2 === 1
            ? <strong key={i} className="font-black text-white">{p}</strong>
            : p
        )}
      </span>
    );
  };

  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap">
      {text.split('\n').map((line, i, arr) => (
        <React.Fragment key={i}>
          {renderLine(line, i)}
          {i < arr.length - 1 && <br />}
        </React.Fragment>
      ))}
    </p>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */

const Chatbot = () => {
  const [conversations, setConversations] = useState(() => loadConversations());
  const [activeId,      setActiveId]      = useState(null);
  const [messages,      setMessages]      = useState(defaultMessages());
  const [input,         setInput]         = useState('');
  const [isTyping,      setIsTyping]      = useState(false);
  const [sidebarOpen,   setSidebarOpen]   = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

  // Auto-save whenever the chat has user messages
  useEffect(() => {
    if (messages.length <= 1) return;
    if (!messages.some(m => m.sender === 'user')) return;

    const title     = messages.find(m => m.sender === 'user')?.text?.slice(0, 44) || 'Chat';
    const timestamp = Date.now();

    setConversations(prev => {
      let updated;
      if (activeId) {
        updated = prev.map(c => c.id === activeId ? { ...c, messages, title, timestamp } : c);
      } else {
        const newId = timestamp;
        setActiveId(newId);
        updated = [{ id: newId, title, messages, timestamp }, ...prev];
      }
      saveConversations(updated);
      return updated;
    });
  }, [messages]);

  const sendUserMessage = async (text) => {
    const userMsg = { id: Date.now(), sender: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    // If no API key is set, fall back to local knowledge base
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      const delay = 700 + Math.random() * 800;
      setTimeout(() => {
        const botMsg = { id: Date.now() + 1, sender: 'bot', text: getBotResponse(text) };
        setMessages(prev => [...prev, botMsg]);
        setIsTyping(false);
      }, delay);
      return;
    }

    try {
      // Build conversation history for context (last 10 messages)
      const history = messages.slice(-10).map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: {
              parts: [{
                text: `You are FitBot 🤖, an expert AI fitness and nutrition coach inside the FitTrack AI app.
You specialise in evidence-based exercise science, sports nutrition, workout programming, and healthy habits.
Keep replies practical, motivating, and concise (use bullet points and emojis where helpful).
Focus exclusively on fitness, diet, exercise, health, and wellness topics.
If asked about anything unrelated to fitness or health, politely redirect the user back to fitness topics.`,
              }],
            },
            contents: [
              ...history,
              { role: 'user', parts: [{ text: text.trim() }] },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const botText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        getBotResponse(text); // fallback if response is empty

      const botMsg = { id: Date.now() + 1, sender: 'bot', text: botText };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error('Gemini API call failed:', err);
      // Fall back to local knowledge base on error
      const botMsg = { id: Date.now() + 1, sender: 'bot', text: getBotResponse(text) };
      setMessages(prev => [...prev, botMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    sendUserMessage(input);
  };

  const startNewChat = () => {
    setActiveId(null);
    setMessages(defaultMessages());
    setInput('');
  };

  const openConversation = (convo) => {
    setActiveId(convo.id);
    setMessages(convo.messages);
  };

  const deleteConversation = (e, id) => {
    e.stopPropagation();
    const updated = conversations.filter(c => c.id !== id);
    saveConversations(updated);
    setConversations(updated);
    if (activeId === id) { setActiveId(null); setMessages(defaultMessages()); }
  };

  const formatTime = (ts) => {
    const d    = new Date(ts);
    const diff = Math.floor((Date.now() - d) / 86400000);
    if (diff === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff === 1) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const showQuickPrompts = messages.length <= 1;

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-6 bg-transparent flex flex-col items-center">
      <div className="w-full max-w-6xl flex-1 flex gap-4" style={{ minHeight: 'calc(100vh - 8rem)' }}>

        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <div className={`${sidebarOpen ? 'w-64' : 'w-0'} shrink-0 transition-all duration-300 overflow-hidden hidden md:block`}>
          <div className="w-64 h-full flex flex-col premium-glass-card rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-orange" />
                <span className="text-sm font-bold text-white">Saved Chats</span>
              </div>
              <button onClick={startNewChat} title="New chat"
                className="w-7 h-7 rounded-lg bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center text-brand-orange hover:bg-brand-orange/20 transition-all">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
              {conversations.length === 0 ? (
                <div className="text-center py-8 px-3">
                  <MessageSquare className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-xs text-zinc-600 leading-relaxed">Your saved chats will appear here as you talk to FitBot.</p>
                </div>
              ) : conversations.map(convo => (
                <button key={convo.id} onClick={() => openConversation(convo)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all group flex items-start gap-2 ${
                    activeId === convo.id ? 'bg-brand-orange/15 border border-brand-orange/25' : 'hover:bg-zinc-800/60 border border-transparent'
                  }`}>
                  <Bot className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${activeId === convo.id ? 'text-brand-orange' : 'text-zinc-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${activeId === convo.id ? 'text-brand-orange' : 'text-zinc-300'}`}>{convo.title}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">{formatTime(convo.timestamp)}</p>
                  </div>
                  <button onClick={(e) => deleteConversation(e, convo.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-zinc-600 hover:text-red-400 rounded">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </button>
              ))}
            </div>

            <div className="p-3 border-t border-zinc-800/60">
              <p className="text-[9px] text-zinc-600 text-center uppercase tracking-widest font-semibold">Chats saved locally</p>
            </div>
          </div>
        </div>

        {/* ── Main chat panel ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col premium-glass-card rounded-2xl overflow-hidden min-w-0">

          {/* Header */}
          <div className="border-b border-zinc-800/60 p-4 flex items-center gap-3 bg-brand-surface/20 shrink-0">
            <button onClick={() => setSidebarOpen(p => !p)} title={sidebarOpen ? 'Hide history' : 'Show history'}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-brand-orange hover:bg-brand-orange/10 transition-all hidden md:flex">
              <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${sidebarOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className="bg-brand-orange/10 p-2 rounded-xl border border-brand-orange/20">
              <Bot className="w-5 h-5 text-brand-orange" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-white tracking-tight">FitBot AI Coach</h2>
              <p className="text-[10px] text-brand-orange font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse"/>
                Fitness & Nutrition Expert
              </p>
            </div>
            <button onClick={startNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-orange/10 border border-brand-orange/20 text-brand-orange text-xs font-bold hover:bg-brand-orange/20 transition-all shrink-0">
              <Plus className="w-3.5 h-3.5" /> New Chat
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 scrollbar-hide">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                  msg.sender === 'user'
                    ? 'bg-slate-800 border-slate-700 shadow-md'
                    : 'bg-brand-orange/10 border-brand-orange/20 shadow-[0_0_10px_rgba(255,126,51,0.06)]'
                }`}>
                  {msg.sender === 'user'
                    ? <User className="w-4 h-4 text-slate-300" />
                    : <Bot className="w-4 h-4 text-brand-orange" />}
                </div>
                <div className={`max-w-[82%] rounded-xl px-4 py-3 shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-slate-800 text-white rounded-tr-none border border-slate-700'
                    : 'bg-zinc-900/80 border border-zinc-700/60 text-zinc-200 rounded-tl-none'
                }`}>
                  <FormattedText text={msg.text} />
                </div>
              </div>
            ))}

            {/* Quick prompt chips — shown only on fresh chat */}
            {showQuickPrompts && (
              <div className="pt-2">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-brand-orange" /> Quick topics
                </p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map(({ label, text }) => (
                    <button key={label} onClick={() => sendUserMessage(text)}
                      className="px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-700/60 text-xs font-semibold text-zinc-300 hover:border-brand-orange/40 hover:text-white hover:bg-zinc-800 transition-all active:scale-95">
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isTyping && (
              <div className="flex gap-3 flex-row">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-brand-orange/10 border border-brand-orange/20">
                  <Bot className="w-4 h-4 text-brand-orange" />
                </div>
                <div className="bg-zinc-900/80 border border-zinc-700/60 rounded-xl rounded-tl-none px-4 py-3 flex items-center gap-1.5">
                  {[0, 0.2, 0.4].map((d, i) => (
                    <div key={i} className="w-1.5 h-1.5 bg-brand-orange/60 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-zinc-800/60 bg-brand-surface/20 shrink-0">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about workouts, diet, macros, supplements..."
                className="w-full bg-brand-dark border border-brand-border text-white rounded-xl pl-5 pr-12 py-3 focus:outline-none focus:border-brand-orange/50 focus:ring-2 focus:ring-brand-orange/5 transition-all placeholder:text-slate-600 text-sm shadow-inner"
              />
              <button type="submit" disabled={!input.trim() || isTyping}
                className="absolute right-2 p-2 bg-brand-orange text-white rounded-lg hover:bg-[#ff8f4d] disabled:opacity-30 disabled:hover:bg-brand-orange transition-all shadow-md hover:scale-105 active:scale-95">
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="text-center mt-2.5 flex items-center justify-center gap-1.5 text-[9px] text-slate-600 uppercase tracking-widest font-semibold">
              <Activity className="w-3 h-3" />
              <span>FitBot AI • Evidence-based fitness & nutrition advice</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
