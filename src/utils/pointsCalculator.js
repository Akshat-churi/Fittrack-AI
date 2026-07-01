/**
 * pointsCalculator.js
 *
 * Reusable service for calculating reward points after a workout session.
 *
 * Points are composed of four independent bonus components so the UI can
 * show users exactly how their score was built:
 *
 *   repBonus        = reps × repRate          (exercise-specific)
 *   durationBonus   = floor(minutes) × 2      (+2 pts per full minute)
 *   calorieBonus    = floor(kcal / 10) × 5    (+5 pts per 10 kcal)
 *   completionBonus = 50 flat                 (awarded whenever reps > 0)
 *
 * To support a new exercise, add its slug and rep-rate to REP_RATES below.
 * No other changes are required.
 */

/** Points awarded per repetition, keyed by exercise route slug. */
const REP_RATES = {
  pushups: 10,
  squats: 5,
};

const DURATION_RATE   = 2;   // pts per full minute
const CALORIE_RATE    = 5;   // pts per 10 kcal
const CALORIE_BUCKET  = 10;  // kcal per bucket
const COMPLETION_BONUS = 50; // flat pts for finishing

/**
 * Calculates reward points for a completed workout session.
 *
 * @param {object} params
 * @param {string} params.exerciseType    - Route slug, e.g. 'pushups' | 'squats'
 * @param {number} params.reps            - Total repetitions completed
 * @param {number} params.durationSeconds - Session duration in seconds
 * @param {number} [params.caloriesBurned=0] - Estimated kcal burned
 * @returns {{
 *   total: number,
 *   repBonus: number,
 *   durationBonus: number,
 *   calorieBonus: number,
 *   completionBonus: number
 * }} Detailed point breakdown. All values are non-negative integers.
 */
export const calculatePoints = ({
  exerciseType,
  reps,
  durationSeconds,
  caloriesBurned = 0,
  streakBonus = 0,
}) => {
  if (!reps || reps <= 0) {
    return { total: 0, repBonus: 0, durationBonus: 0, calorieBonus: 0, completionBonus: 0, streakBonus: 0 };
  }

  const repRate = REP_RATES[exerciseType] ?? 5; // default to lower rate for unknown exercises

  const repBonus        = reps * repRate;
  const durationBonus   = Math.floor(durationSeconds / 60) * DURATION_RATE;
  const calorieBonus    = Math.floor(caloriesBurned / CALORIE_BUCKET) * CALORIE_RATE;
  const completionBonus = COMPLETION_BONUS;

  const total = repBonus + durationBonus + calorieBonus + completionBonus + streakBonus;

  return { total, repBonus, durationBonus, calorieBonus, completionBonus, streakBonus };
};
