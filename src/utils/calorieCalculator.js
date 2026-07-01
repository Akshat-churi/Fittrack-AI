/**
 * calorieCalculator.js
 *
 * Estimates calories burned for a workout session using the MET
 * (Metabolic Equivalent of Task) formula:
 *
 *   Calories (kcal) = MET × weightKg × durationHours
 *
 * To support a new exercise, simply add its key and MET value to
 * EXERCISE_MET below. No other changes are required.
 *
 * Reference MET values: Ainsworth et al., "Compendium of Physical Activities"
 */

/** MET table keyed by the route param / exerciseType slug. */
const EXERCISE_MET = {
  pushups: 3.8, // moderate-intensity calisthenics
  squats: 5.0,  // general bodyweight squats
};

const DEFAULT_WEIGHT_KG = 70;

/**
 * Estimates calories burned for a completed workout session.
 *
 * @param {object} params
 * @param {string} params.exerciseType   - Route slug, e.g. 'pushups' | 'squats'
 * @param {number} params.reps           - Total repetitions completed
 * @param {number} params.durationSeconds - Session duration in seconds
 * @param {number} [params.weightKg]     - User body-weight in kg (default: 70)
 * @returns {number} Estimated kilocalories, rounded to one decimal place.
 *                   Returns 0 if reps or duration are zero.
 */
export const estimateCalories = ({
  exerciseType,
  reps,
  durationSeconds,
  weightKg = DEFAULT_WEIGHT_KG,
}) => {
  if (!reps || !durationSeconds) return 0;

  const met = EXERCISE_MET[exerciseType] ?? 3.5; // generic light exercise fallback
  const durationHours = durationSeconds / 3600;
  const calories = met * weightKg * durationHours;

  return Math.round(calories * 10) / 10; // one decimal place
};
