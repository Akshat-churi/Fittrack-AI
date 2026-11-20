/**
 * Nutrition Engine for FitTrack AI.
 * Calculates precise BMR, TDEE, calories, and macros, and generates
 * personalized meal plans & dynamic tips via Gemini AI or dynamic local algorithms.
 */

/* ── Activity multipliers (Mifflin-St Jeor) ─────────────────────── */
const ACTIVITY = {
  low:    1.375,   // lightly active / sedentary
  medium: 1.55,    // moderately active (3–5 days/week)
  high:   1.725,   // very active (6–7 days/week)
};

/**
 * Calculate Basal Metabolic Rate using the Mifflin-St Jeor formula.
 */
export const calcBMR = ({ weight, height, age, gender }) => {
  const base = 10 * Number(weight) + 6.25 * Number(height) - 5 * Number(age);
  return Math.round(gender === 'female' ? base - 161 : base + 5);
};

/**
 * Calculate Total Daily Energy Expenditure (TDEE).
 */
export const calcTDEE = ({ weight, height, age, gender, activity }) => {
  const bmr = calcBMR({ weight, height, age, gender });
  const multiplier = ACTIVITY[activity] ?? 1.55;
  return Math.round(bmr * multiplier);
};

/* ── Label helpers ── */
export const GOAL_LABELS = {
  'fat-loss':    '🔥 Fat Loss',
  'muscle':      '💪 Muscle Gain',
  'maintenance': '⚖️  Maintenance',
};

export const ACTIVITY_LABELS = {
  low:    '🚶 Low (Desk job, minimal exercise)',
  medium: '🏃 Medium (Exercise 3–5 days/week)',
  high:   '🔥 High (Intense training 6–7 days/week)',
};

export const DIET_LABELS = {
  'non-veg':    '🍗 Non-Vegetarian',
  'veg':        '🥗 Vegetarian',
  'eggetarian': '🥚 Eggetarian',
  'vegan':      '🌱 Vegan',
};

/* ── Meal Variation Pools for Dynamic Local Generation ── */
const MEAL_POOLS = {
  'non-veg': {
    breakfast: [
      (cals, prot) => ({
        items: [
          `3 whole eggs or omelette with vegetables (${Math.round(prot * 0.4)}g protein)`,
          `Oats (${Math.round(cals * 0.12)}g) cooked with milk and berries`,
          '1 medium banana or apple',
          'Black coffee or green tea (unsweetened)',
        ],
        notes: 'High-protein, moderate-GI carbohydrates for sustained morning energy',
      }),
      (cals, prot) => ({
        items: [
          `Scrambled eggs (3 eggs + 2 egg whites) with spinach (${Math.round(prot * 0.45)}g protein)`,
          `2 whole wheat toast slices with 1 tbsp peanut butter`,
          '1 bowl fresh papaya or orange slices',
          '1 glass warm lemon water with chia seeds',
        ],
        notes: 'Lean protein + healthy monounsaturated fats',
      }),
      (cals, prot) => ({
        items: [
          `High-protein smoothie: whey protein (${Math.round(prot * 0.5)}g protein) + banana + 40g oats + milk`,
          '2 boiled eggs with salt & pepper',
          'Handful of soaked almonds (15g)',
        ],
        notes: 'Quick, nutrient-dense breakfast for busy mornings',
      }),
    ],
    lunch: [
      (cals, prot) => ({
        items: [
          `Grilled or baked chicken breast (${Math.round(prot * 0.55 * 3.5)}g cooked, ~${Math.round(prot * 0.55)}g protein)`,
          `Brown rice or basmati rice (${Math.round(cals * 0.18)}g cooked) or 2–3 rotis`,
          '1 bowl mixed green vegetable salad with olive oil dressing',
          '1 bowl thick yellow dal or lentil soup',
        ],
        notes: 'Peak midday fuel: complete amino acid profile with complex carbs',
      }),
      (cals, prot) => ({
        items: [
          `Grilled fish (salmon/tilapia/pomfret) or chicken (${Math.round(prot * 0.5 * 3.5)}g cooked)`,
          `Quinoa or sweet potato (${Math.round(cals * 0.15)}g)`,
          'Stir-fried broccoli, bell peppers and mushrooms in olive oil',
          'Fresh cucumber, tomato and mint raita',
        ],
        notes: 'Rich in Omega-3 fatty acids, micronutrients and high-satiety fiber',
      }),
    ],
    dinner: [
      (cals, prot) => ({
        items: [
          `2–3 whole wheat or multigrain rotis`,
          `Chicken curry or grilled chicken/fish (${Math.round(prot * 0.45 * 3.5)}g)`,
          'Mixed vegetable sabzi (beans, carrots, cauliflower)',
          '1 bowl fresh curd / Greek yogurt (100g)',
        ],
        notes: 'Moderate-carb dinner to promote restful sleep and steady overnight recovery',
      }),
      (cals, prot) => ({
        items: [
          `Egg curry (2–3 boiled eggs) or stir-fried chicken (${Math.round(prot * 0.45)}g protein)`,
          `1 small bowl steamed rice or 2 rotis`,
          'Large bowl clear vegetable soup or sautéed greens',
          'Fresh cucumber and carrot sticks with lemon',
        ],
        notes: 'Light on digestion, high in bioavailable protein',
      }),
    ],
    snacks: [
      (cals, prot) => ({
        items: [
          `Greek yogurt (150g) or boiled eggs (2) (~${Math.round(prot * 0.7)}g protein)`,
          'Handful of mixed nuts (almonds, walnuts) or roasted makhana (25g)',
          '1 seasonal fresh fruit (apple/guava/orange)',
        ],
        notes: 'Prevents energy dips and curbs between-meal cravings',
      }),
      (cals, prot) => ({
        items: [
          `Protein shake or sattu drink (${Math.round(prot * 0.8)}g protein)`,
          'Roasted chana (30g) with pinch of black salt',
          '1 medium banana (great pre-workout energy)',
        ],
        notes: 'Optimal pre/post-workout snack timing',
      }),
    ],
  },

  veg: {
    breakfast: [
      (cals, prot) => ({
        items: [
          `Paneer bhurji or grilled low-fat paneer (${Math.round(prot * 0.4 * 5.5)}g, ~${Math.round(prot * 0.4)}g protein)`,
          `Oats (${Math.round(cals * 0.12)}g) with skimmed milk and chia seeds`,
          '1 medium fruit (banana, apple, or berries)',
          'Green tea or ginger tea (sugar-free)',
        ],
        notes: 'Calcium and protein-rich vegetarian morning kickstart',
      }),
      (cals, prot) => ({
        items: [
          `Besan chilla (2 medium) stuffed with low-fat paneer (~${Math.round(prot * 0.45)}g protein)`,
          'Green mint-coriander chutney',
          '1 bowl fresh curd (150g) or Greek yogurt',
          'Handful of soaked walnuts and almonds',
        ],
        notes: 'Traditional high-protein vegetarian breakfast',
      }),
      (cals, prot) => ({
        items: [
          `Sprouted moong & chana chaat with lemon and cucumber (~${Math.round(prot * 0.35)}g protein)`,
          `2 multigrain toast slices with 1 tbsp peanut butter`,
          '1 glass skimmed milk or soy milk (250ml)',
        ],
        notes: 'Live enzymes from sprouts + slow-burning complex carbs',
      }),
    ],
    lunch: [
      (cals, prot) => ({
        items: [
          `2–3 whole wheat rotis or brown rice (${Math.round(cals * 0.18)}g cooked)`,
          `Paneer or tofu curry (120–150g paneer, ~${Math.round(prot * 0.4)}g protein)`,
          '1 thick bowl dal (rajma / chole / moong dal) for dual protein source',
          'Large seasonal salad with lemon juice dressing',
        ],
        notes: 'Lentils + grains combo creates a complete amino acid profile',
      }),
      (cals, prot) => ({
        items: [
          `1 bowl rajma or chole curry (150g cooked)`,
          `1 bowl steamed basmati rice (${Math.round(cals * 0.16)}g cooked)`,
          `100g low-fat paneer or roasted tofu (~${Math.round(prot * 0.45)}g protein)`,
          'Mixed vegetable sabzi + cucumber raita (100g)',
        ],
        notes: 'High-fiber complex carbohydrate lunch for all-day focus',
      }),
    ],
    dinner: [
      (cals, prot) => ({
        items: [
          `2 multigrain rotis or 1 small bowl brown rice`,
          `Thick moong or toor dal with tadka (1.5 cups)`,
          `Soya chunks curry or paneer tikka (~${Math.round(prot * 0.45)}g protein)`,
          'Stir-fried vegetables (beans, broccoli, capsicum)',
        ],
        notes: 'Lean vegetarian protein to facilitate overnight cellular repair',
      }),
      (cals, prot) => ({
        items: [
          `Moong dal khichdi with vegetables and ghee (1 tsp)`,
          `100g paneer bhurji or grilled tofu (~${Math.round(prot * 0.4)}g protein)`,
          '1 bowl fresh curd (dahi) with roasted cumin',
          'Fresh green salad with flaxseed sprinkle',
        ],
        notes: 'Probiotic-rich, soothing on gut and digestion before sleep',
      }),
    ],
    snacks: [
      (cals, prot) => ({
        items: [
          `Roasted makhana (fox nuts, 30g) + roasted chana (30g) (~${Math.round(prot * 0.6)}g protein)`,
          'Handful of mixed nuts (almonds, cashews, pumpkin seeds)',
          '1 seasonal fresh fruit or coconut water',
        ],
        notes: 'Crunchy, low-glycemic vegetarian snacks',
      }),
      (cals, prot) => ({
        items: [
          `Greek yogurt or curd bowl with chopped walnuts and honey (~${Math.round(prot * 0.7)}g protein)`,
          '1 medium apple or orange',
          'Green tea or lemon water',
        ],
        notes: 'High protein + antioxidant recovery boost',
      }),
    ],
  },

  eggetarian: {
    breakfast: [
      (cals, prot) => ({
        items: [
          `3 boiled or scrambled whole eggs (${Math.round(prot * 0.4)}g protein)`,
          `Oats (${Math.round(cals * 0.12)}g) cooked with milk and cinnamon`,
          '1 banana or apple',
          'Black coffee or green tea',
        ],
        notes: 'Top bioavailable egg protein to kickstart muscle protein synthesis',
      }),
    ],
    lunch: [
      (cals, prot) => ({
        items: [
          `Egg curry (3 boiled eggs, ~${Math.round(prot * 0.45)}g protein)`,
          `Brown rice or 3 whole wheat rotis (${Math.round(cals * 0.18)}g cooked)`,
          '1 thick bowl dal or rajma',
          'Green vegetable salad with lemon',
        ],
        notes: 'Balanced whole food lunch combining eggs and whole grains',
      }),
    ],
    dinner: [
      (cals, prot) => ({
        items: [
          `2 multigrain rotis`,
          `Egg white scramble with mushrooms and peppers (4 egg whites + 1 whole egg)`,
          'Mixed vegetable sabzi',
          '1 cup fresh curd or dal',
        ],
        notes: 'Lean protein dinner that keeps digestion light',
      }),
    ],
    snacks: [
      (cals, prot) => ({
        items: [
          `2 boiled eggs with black pepper (~12g protein)`,
          'Handful of roasted almonds (20g)',
          '1 fresh fruit or coconut water',
        ],
        notes: 'Zero-prep, protein-dense snack',
      }),
    ],
  },

  vegan: {
    breakfast: [
      (cals, prot) => ({
        items: [
          `Tofu scramble with turmeric, spinach and tomatoes (150g tofu, ~${Math.round(prot * 0.4)}g protein)`,
          `2 slices whole grain toast with 1 tbsp peanut or almond butter`,
          '1 glass unsweetened soy milk or almond milk',
          '1 bowl fresh papaya or apple slices',
        ],
        notes: '100% plant-based protein with healthy fats and fiber',
      }),
    ],
    lunch: [
      (cals, prot) => ({
        items: [
          `Brown rice or quinoa (${Math.round(cals * 0.18)}g cooked)`,
          `Soya chunks or tempeh curry (${Math.round(prot * 0.5)}g plant protein)`,
          '1 bowl thick rajma or chickpea curry (chole)',
          'Large cucumber, tomato and carrot salad with hemp seeds',
        ],
        notes: 'Dense plant-based protein combining soy and legumes',
      }),
    ],
    dinner: [
      (cals, prot) => ({
        items: [
          `3 multigrain rotis or sweet potato mash`,
          `Grilled firm tofu with stir-fried greens and bell peppers (~${Math.round(prot * 0.45)}g protein)`,
          '1 bowl yellow moong dal with cumin and garlic',
          'Large green leafy salad with olive oil and pumpkin seeds',
        ],
        notes: 'Nutrient-packed vegan dinner supporting cellular recovery',
      }),
    ],
    snacks: [
      (cals, prot) => ({
        items: [
          `Roasted edamame or roasted chana (40g) (~${Math.round(prot * 0.7)}g protein)`,
          'Handful of walnuts, chia seeds, and pumpkin seeds (30g)',
          '1 banana or orange',
        ],
        notes: 'Rich in plant-based Omega-3s, zinc and magnesium',
      }),
    ],
  },
};

/**
 * Generates dynamic, highly specific tips based on calculated calories,
 * goal, body stats, and activity schedule.
 */
export const generateDynamicTips = ({ calories, tdee, bmr, protein, carbs, fat, weight, goal, activity, diet }) => {
  const tips = [];
  const diff = calories - tdee;
  const absDiff = Math.abs(diff);
  const waterTarget = Math.max(2.5, Math.round(weight * 0.035 * 10) / 10);

  // 1. Exact Calorie Budget Strategy
  if (goal === 'fat-loss') {
    tips.push(
      `🔥 **Calorie Deficit**: Your target is **${calories.toLocaleString()} kcal/day** (${absDiff} kcal below your ${tdee.toLocaleString()} TDEE). This calculated deficit puts you on pace to burn approximately **0.4–0.6 kg of body fat weekly** without crashing your metabolism.`
    );
  } else if (goal === 'muscle') {
    tips.push(
      `💪 **Controlled Surplus**: Your target is **${calories.toLocaleString()} kcal/day** (+${absDiff} kcal above your ${tdee.toLocaleString()} TDEE). This lean surplus fuels muscle hypertrophy and glycogen replenishment while minimizing unwanted fat gain.`
    );
  } else {
    tips.push(
      `⚖️ **Energy Balance**: Your target is **${calories.toLocaleString()} kcal/day**, perfectly balanced with your ${tdee.toLocaleString()} TDEE to maintain current weight while improving body composition and daily energy.`
    );
  }

  // 2. Specific Protein Allocation
  const perMealProtein = Math.round(protein / 4);
  tips.push(
    `🥩 **Protein Distribution**: To reach your **${protein}g protein target**, distribute approximately **${perMealProtein}g of protein** across Breakfast, Lunch, Dinner, and Snacks. This maintains constant muscle protein synthesis (MPS) throughout the day.`
  );

  // 3. Hydration Target Tailored to Weight
  tips.push(
    `💧 **Calculated Hydration**: Based on your ${weight}kg bodyweight and ${activity} activity, aim for **${waterTarget}L to ${(waterTarget + 0.5).toFixed(1)}L of water daily**. Drinking 500ml 30 minutes before main meals also improves digestion and appetite regulation.`
  );

  // 4. Workout & Nutrient Timing
  if (activity === 'high') {
    tips.push(
      `⚡ **Pre & Post-Workout**: With an intense training schedule, consume **${Math.round(carbs * 0.3)}g of fast carbs** (banana, oats, or toast) 45 min before workouts, and prioritize a high-protein meal within 60 min after your session.`
    );
  } else if (activity === 'medium') {
    tips.push(
      `🏋️ **Training Nutrition**: On workout days, center the bulk of your **${carbs}g carbohydrate budget** around your training window to maximize performance and glycogen replenishment.`
    );
  } else {
    tips.push(
      `🚶 **Metabolic Activity**: For a desk-heavy routine, take a brisk 10-minute walk after lunch and dinner to lower post-meal glucose spikes and accelerate fat oxidation.`
    );
  }

  // 5. Diet-Specific Actionable Tip
  if (diet === 'veg' || diet === 'vegan') {
    tips.push(
      `🌱 **Plant Protein Bioavailability**: Combine lentils with grains (dal + rice or roti) to complete the amino acid profile, and include paneer, tofu, or soya chunks to easily hit your **${protein}g protein goal**.`
    );
  } else {
    tips.push(
      `🍳 **Complete Proteins**: Prioritize whole eggs, chicken breast, or fish for dinner to supply slow-digesting amino acids that protect lean tissue as you sleep.`
    );
  }

  // 6. Micronutrient & Recovery Recommendation
  tips.push(
    `😴 **Sleep & Recovery**: Target 7.5–9 hours of quality sleep nightly. Over 70% of human growth hormone release and muscle tissue regeneration occurs during deep REM sleep.`
  );

  return tips;
};

/**
 * Pure calculation and dynamic local plan generator.
 * Always works instantly, guaranteed without network dependencies.
 */
export const generateNutritionPlan = ({ height, weight, age, gender, goal, activity, diet = 'non-veg', variation = 0 }) => {
  const bmr  = calcBMR({ weight, height, age, gender });
  const tdee = Math.round(bmr * (ACTIVITY[activity] ?? 1.55));

  /* ── Calorie target ── */
  let calories;
  if (goal === 'fat-loss')      calories = Math.round(tdee * 0.8);   // 20% deficit
  else if (goal === 'muscle')   calories = Math.round(tdee * 1.15);  // 15% surplus
  else                          calories = tdee;                      // maintenance

  /* ── Macro targets ── */
  let proteinPerKg;
  if (goal === 'muscle')        proteinPerKg = 2.0;
  else if (goal === 'fat-loss') proteinPerKg = 1.9;
  else                          proteinPerKg = 1.5;

  const protein = Math.round(weight * proteinPerKg);                  // g
  const fat     = Math.round((calories * 0.25) / 9);                  // 25% cals from fat
  const carbs   = Math.round((calories - protein * 4 - fat * 9) / 4); // remaining from carbs

  /* ── Meal split percentages ── */
  const split = { breakfast: 0.25, lunch: 0.35, dinner: 0.30, snacks: 0.10 };

  const dietPool = MEAL_POOLS[diet] ?? MEAL_POOLS['non-veg'];

  const meals = Object.entries(split).map(([mealKey, pct]) => {
    const mealCals = Math.round(calories * pct);
    const mealProt = Math.round(protein * pct);
    const pool = dietPool[mealKey] ?? MEAL_POOLS['non-veg'][mealKey];
    const index = Math.abs(variation) % pool.length;
    const mealData = pool[index](mealCals, mealProt);

    return {
      meal: mealKey.charAt(0).toUpperCase() + mealKey.slice(1),
      calories: mealCals,
      protein: mealProt,
      items: mealData.items,
      notes: mealData.notes,
    };
  });

  const tips = generateDynamicTips({
    calories, tdee, bmr, protein, carbs, fat, weight, goal, activity, diet,
  });

  return {
    calories,
    tdee,
    bmr,
    protein,
    carbs,
    fat,
    meals,
    tips,
    goal,
    activity,
    diet,
    isAiGenerated: false,
    timestamp: Date.now(),
  };
};

/**
 * Helper to safely extract JSON from Gemini text response.
 */
const extractJSON = (rawText) => {
  if (!rawText) return null;
  try {
    const cleaned = rawText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*$/gi, '')
      .trim();
    return JSON.parse(cleaned);
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
    return null;
  }
};

/**
 * AI-Powered Nutrition Plan Generator using Gemini AI API.
 * Calls modern Gemini models with automatic cascading fallback.
 * If AI is unavailable, falls back to the dynamic local engine smoothly.
 */
export const generateAiNutritionPlan = async ({
  height, weight, age, gender, goal, activity, diet = 'non-veg', apiKey,
}) => {
  // 1. Compute exact baseline mathematical targets first
  const basePlan = generateNutritionPlan({
    height, weight, age, gender, goal, activity, diet,
    variation: Math.floor(Math.random() * 5),
  });

  const key = apiKey || import.meta.env.VITE_GEMINI_API_KEY;

  if (!key || key === 'your_gemini_api_key_here') {
    return basePlan;
  }

  const CANDIDATE_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-3-flash-preview',
  ];

  const prompt = `You are an elite sports dietitian and nutritionist inside the FitTrack AI app.
Generate a fresh, realistic, and highly customized full-day meal plan and actionable diet tips for this individual based on their exact calculated targets:

[USER PROFILE]
- Age: ${age} years | Gender: ${gender} | Height: ${height} cm | Weight: ${weight} kg
- Fitness Goal: ${GOAL_LABELS[goal] || goal}
- Activity Level: ${ACTIVITY_LABELS[activity] || activity}
- Dietary Preference: ${DIET_LABELS[diet] || diet}

[EXACT SCIENTIFIC TARGETS]
- Daily Calorie Target: ${basePlan.calories} kcal/day (TDEE: ${basePlan.tdee} kcal, BMR: ${basePlan.bmr} kcal)
- Macro Targets: Protein: ${basePlan.protein}g, Carbohydrates: ${basePlan.carbs}g, Fats: ${basePlan.fat}g

[INSTRUCTIONS]
1. MEALS: Provide creative, delicious, and realistic items for Breakfast (~${Math.round(basePlan.calories * 0.25)} kcal, ~${Math.round(basePlan.protein * 0.25)}g protein), Lunch (~${Math.round(basePlan.calories * 0.35)} kcal, ~${Math.round(basePlan.protein * 0.35)}g protein), Dinner (~${Math.round(basePlan.calories * 0.30)} kcal, ~${Math.round(basePlan.protein * 0.30)}g protein), and Snacks (~${Math.round(basePlan.calories * 0.10)} kcal, ~${Math.round(basePlan.protein * 0.10)}g protein).
   - Strictly honor their dietary preference: ${DIET_LABELS[diet] || diet}.
   - Include realistic portion sizes in grams/spoons/pieces.
2. TIPS: Provide 4 to 5 unique, insightful, and actionable tips that DIRECTLY reference their calculated ${basePlan.calories} kcal target, ${basePlan.protein}g protein target, ${weight}kg hydration requirement, and workout schedule. Do NOT provide generic clichés.

Respond ONLY with a valid JSON object in this format (no markdown, no other text):
{
  "meals": [
    {
      "meal": "Breakfast",
      "calories": ${Math.round(basePlan.calories * 0.25)},
      "protein": ${Math.round(basePlan.protein * 0.25)},
      "items": ["Item 1 with exact portion", "Item 2 with portion", "Item 3"],
      "notes": "Specific benefit for their goal"
    },
    {
      "meal": "Lunch",
      "calories": ${Math.round(basePlan.calories * 0.35)},
      "protein": ${Math.round(basePlan.protein * 0.35)},
      "items": ["Item 1 with portion", "Item 2 with portion", "Item 3"],
      "notes": "Specific benefit for their goal"
    },
    {
      "meal": "Dinner",
      "calories": ${Math.round(basePlan.calories * 0.30)},
      "protein": ${Math.round(basePlan.protein * 0.30)},
      "items": ["Item 1 with portion", "Item 2 with portion", "Item 3"],
      "notes": "Specific benefit for their goal"
    },
    {
      "meal": "Snacks",
      "calories": ${Math.round(basePlan.calories * 0.10)},
      "protein": ${Math.round(basePlan.protein * 0.10)},
      "items": ["Item 1 with portion", "Item 2 with portion"],
      "notes": "Specific benefit for their goal"
    }
  ],
  "tips": [
    "Tip 1 referencing ${basePlan.calories} kcal and ${basePlan.goal} strategy...",
    "Tip 2 referencing ${basePlan.protein}g protein distribution...",
    "Tip 3 referencing hydration and training timing...",
    "Tip 4 tailored to ${DIET_LABELS[diet] || diet} foods..."
  ]
}`;

  for (const model of CANDIDATE_MODELS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8500); // 8.5s timeout per model

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.75,
              maxOutputTokens: 1400,
            },
          }),
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = extractJSON(rawText);

        if (parsed && Array.isArray(parsed.meals) && parsed.meals.length >= 3 && Array.isArray(parsed.tips) && parsed.tips.length >= 2) {
          return {
            ...basePlan,
            meals: parsed.meals,
            tips: parsed.tips,
            isAiGenerated: true,
            modelUsed: model,
          };
        }
      } else {
        console.warn(`Nutrition AI: ${model} returned status ${response.status}`);
      }
    } catch (err) {
      console.warn(`Nutrition AI: Error with ${model}:`, err.message || err);
    }
  }

  // If AI models fail or timed out, return the rich dynamic local plan
  return basePlan;
};
