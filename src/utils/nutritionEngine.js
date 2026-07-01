/**
 * Pure JS nutrition calculation engine.
 * No external API required — all math is evidence-based formula.
 */

/* ── Activity multipliers (Mifflin-St Jeor) ─────────────────────── */
const ACTIVITY = {
  low:    1.375,   // lightly active
  medium: 1.55,    // moderately active
  high:   1.725,   // very active
};

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor formula.
 */
const calcBMR = ({ weight, height, age, gender }) => {
  // weight kg, height cm, age years
  const base = 10 * weight + 6.25 * height - 5 * age;
  return gender === 'female' ? base - 161 : base + 5;
};

/**
 * Main nutrition calculation.
 * @param {{ height, weight, age, gender, goal, activity }} input
 * @returns {{ calories, protein, carbs, fat, meals, tips }}
 */
export const generateNutritionPlan = ({ height, weight, age, gender, goal, activity }) => {
  const bmr    = calcBMR({ weight, height, age, gender });
  const tdee   = Math.round(bmr * (ACTIVITY[activity] ?? 1.55));

  /* ── Calorie target ── */
  let calories;
  if (goal === 'fat-loss')      calories = Math.round(tdee * 0.8);   // 20% deficit
  else if (goal === 'muscle')   calories = Math.round(tdee * 1.1);   // 10% surplus
  else                          calories = tdee;                      // maintenance

  /* ── Macro targets ── */
  let proteinPerKg;
  if (goal === 'muscle')        proteinPerKg = 2.0;
  else if (goal === 'fat-loss') proteinPerKg = 1.8;
  else                          proteinPerKg = 1.4;

  const protein = Math.round(weight * proteinPerKg);        // g
  const fat     = Math.round((calories * 0.25) / 9);        // 25% cals from fat
  const carbs   = Math.round((calories - protein * 4 - fat * 9) / 4);

  /* ── Meal split (%) ── */
  const split = { breakfast: 0.25, lunch: 0.35, dinner: 0.30, snacks: 0.10 };

  /* ── Meal templates by goal ── */
  const mealTemplates = {
    'fat-loss': {
      breakfast: {
        items: ['Oats (50g) with skimmed milk', 'Half banana', '2 boiled egg whites', 'Black coffee or green tea'],
        notes: 'High fibre, low sugar start',
      },
      lunch: {
        items: ['Brown rice (100g cooked)', 'Grilled chicken breast (150g)', 'Mixed salad with lemon dressing', 'Cucumber & tomato slices'],
        notes: 'Lean protein + complex carbs',
      },
      dinner: {
        items: ['2 multigrain rotis', 'Paneer bhurji (100g low-fat paneer)', 'Stir-fried vegetables', 'Dal (½ cup)'],
        notes: 'Light, high-protein dinner',
      },
      snacks: {
        items: ['Greek yogurt (150g) OR handful of almonds (20g)', 'Apple or orange'],
        notes: 'Keep snacks under 200 kcal',
      },
    },
    muscle: {
      breakfast: {
        items: ['3 whole eggs scrambled', 'Oats (80g) with full-fat milk', '1 banana', 'Peanut butter (1 tbsp)', 'Whey protein shake (optional)'],
        notes: 'Calorie-dense, protein-rich start',
      },
      lunch: {
        items: ['White rice (200g cooked)', 'Chicken breast or thigh (200g)', 'Rajma / kidney beans (½ cup)', 'Salad with olive oil dressing'],
        notes: 'High carb + high protein for energy & growth',
      },
      dinner: {
        items: ['3 rotis', 'Paneer or tofu (150g)', 'Sabzi (cooked vegetables)', 'Full-fat curd (150g)'],
        notes: 'Slow-digesting protein for overnight recovery',
      },
      snacks: {
        items: ['Banana + peanut butter', 'Mixed nuts (30g)', 'Cottage cheese or Greek yogurt'],
        notes: 'Calorie-dense snacks between meals',
      },
    },
    maintenance: {
      breakfast: {
        items: ['2 eggs (any style)', 'Oats (60g) with milk', '1 fruit of choice', 'Tea or coffee'],
        notes: 'Balanced start to the day',
      },
      lunch: {
        items: ['Rice or 2 rotis', 'Dal (1 cup)', 'Vegetables sabzi', 'Grilled chicken or paneer (100g)', 'Salad'],
        notes: 'Balanced macros, satisfying meal',
      },
      dinner: {
        items: ['2 rotis or 1 small bowl rice', 'Mixed vegetable curry', 'Curd (100g)', 'Light soup'],
        notes: 'Moderate, light dinner',
      },
      snacks: {
        items: ['Makhana / fox nuts', 'Fruit + nuts mix', 'Roasted chana'],
        notes: 'Nutritious light snacks',
      },
    },
  };

  const template = mealTemplates[goal] ?? mealTemplates.maintenance;

  /* ── Build meals with calorie estimates ── */
  const meals = Object.entries(split).map(([meal, pct]) => {
    const mealCals = Math.round(calories * pct);
    const mealProt = Math.round(protein * pct);
    const t = template[meal];
    return {
      meal: meal.charAt(0).toUpperCase() + meal.slice(1),
      calories: mealCals,
      protein: mealProt,
      items: t.items,
      notes: t.notes,
    };
  });

  /* ── Workout-based tips ── */
  const tips = [];
  if (goal === 'muscle') {
    tips.push('🏋️ Have a protein shake or banana 30 min before strength training.');
    tips.push('🥩 Eat a high-protein meal within 60 min after your workout.');
    tips.push('😴 Sleep 7–9 hrs — most muscle repair happens overnight.');
  } else if (goal === 'fat-loss') {
    tips.push('🔥 Do cardio in a fasted state (morning) for extra fat burn.');
    tips.push('💧 Drink 500 ml water before each meal to reduce hunger.');
    tips.push('🥗 Fill half your plate with non-starchy vegetables at every meal.');
  } else {
    tips.push('⚖️ Track your weight weekly — adjust calories if weight shifts.');
    tips.push('🚶 Aim for 7,000–10,000 steps daily for general health.');
    tips.push('🥦 Prioritise whole foods over processed options.');
  }
  tips.push('💊 Consider a daily multivitamin and Vitamin D supplement.');

  return {
    calories,
    tdee,
    protein,
    carbs,
    fat,
    meals,
    tips,
    goal,
    activity,
  };
};

/* ── Label helpers ── */
export const GOAL_LABELS = {
  'fat-loss':    '🔥 Fat Loss',
  'muscle':      '💪 Muscle Gain',
  'maintenance': '⚖️  Maintenance',
};

export const ACTIVITY_LABELS = {
  low:    '🚶 Low (Sedentary)',
  medium: '🏃 Medium (Active)',
  high:   '🔥 High (Very Active)',
};
