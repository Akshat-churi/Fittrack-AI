/**
 * storage.js
 *
 * All localStorage keys are now scoped per userId:
 *   fittrack_<userId>_history
 *   fittrack_<userId>_points
 *   fittrack_<userId>_badges
 *
 * Falls back to getCurrentUser() when no userId is supplied so all
 * existing call-sites continue to work without changes.
 */

import { getCurrentUser } from './auth';
import { getUserScopedKey } from './userDataManager';
import { logEvent } from './analytics';
import { notifySquadWorkoutUpdate } from './squadStorage';

// ─── Key resolver ───────────────────────────────────────────────────────────

const resolveUserId = (userId) =>
  userId || getCurrentUser()?.id || 'anonymous';

const historyKey = (userId) => getUserScopedKey(resolveUserId(userId), 'history');
const pointsKey  = (userId) => getUserScopedKey(resolveUserId(userId), 'points');
const badgesKey  = (userId) => getUserScopedKey(resolveUserId(userId), 'badges');

// ─── Workout history ────────────────────────────────────────────────────────

/**
 * Saves a workout session to the current user's history.
 * @param {object} session
 * @param {string} [userId]
 */
export const saveWorkoutSession = (session, userId) => {
  const history = getWorkoutHistory(userId);
  const newSession = {
    ...session,
    id:   Date.now().toString(),
    date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  history.unshift(newSession);
  localStorage.setItem(historyKey(userId), JSON.stringify(history));

  // Log to centralized SaaS analytics
  logEvent('exercise_completed', {
    exerciseType: newSession.exerciseType,
    reps: newSession.reps,
    caloriesBurned: newSession.caloriesBurned,
    pointsEarned: newSession.pointsEarned
  });

  if (newSession.reps > 0) {
    logEvent('reps_added', { reps: newSession.reps, exerciseType: newSession.exerciseType });
  }

  if (newSession.caloriesBurned > 0) {
    logEvent('calorie_logged', { calories: newSession.caloriesBurned, type: 'burned' });
  }

  window.dispatchEvent(
    new CustomEvent('fittrack_workout_saved', { detail: newSession })
  );

  // Notify squad goals so progress bars update in real-time
  notifySquadWorkoutUpdate(resolveUserId(userId));
};

/**
 * Retrieves the workout history for the current (or given) user.
 * @param {string} [userId]
 * @returns {Array}
 */
export const getWorkoutHistory = (userId) => {
  try {
    const data = localStorage.getItem(historyKey(userId));
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to parse workout history', error);
    return [];
  }
};

// ─── Points ─────────────────────────────────────────────────────────────────

/**
 * Retrieves total points for the current (or given) user.
 * @param {string} [userId]
 * @returns {number}
 */
export const getUserPoints = (userId) => {
  const raw = localStorage.getItem(pointsKey(userId));
  return raw ? parseInt(raw, 10) : 0;
};

/**
 * Adds points for the current (or given) user.
 * @param {number} amount
 * @param {string} [userId]
 */
export const addUserPoints = (amount, userId) => {
  const current  = getUserPoints(userId);
  const newTotal = current + amount;
  localStorage.setItem(pointsKey(userId), newTotal.toString());
  window.dispatchEvent(
    new CustomEvent('fittrack_points_updated', { detail: newTotal })
  );
};

/**
 * Clears workout history and optionally points for the current user.
 * @param {boolean} includePoints
 * @param {string}  [userId]
 */
export const clearWorkoutHistory = (includePoints = false, userId) => {
  localStorage.removeItem(historyKey(userId));
  if (includePoints) {
    localStorage.removeItem(pointsKey(userId));
    window.dispatchEvent(
      new CustomEvent('fittrack_points_updated', { detail: 0 })
    );
  }
};

// ─── Badges ─────────────────────────────────────────────────────────────────

/**
 * Retrieves unlocked badges for the current (or given) user.
 * @param {string} [userId]
 * @returns {Array}
 */
export const getUnlockedBadges = (userId) => {
  try {
    const data = localStorage.getItem(badgesKey(userId));
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to parse unlocked badges', error);
    return [];
  }
};

/**
 * Saves badges for the current (or given) user.
 * @param {Array}  badges
 * @param {string} [userId]
 */
export const saveUnlockedBadges = (badges, userId) => {
  localStorage.setItem(badgesKey(userId), JSON.stringify(badges));
  window.dispatchEvent(
    new CustomEvent('fittrack_badges_updated', { detail: badges })
  );
};
