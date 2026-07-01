/**
 * goalsStorage.js
 *
 * All goals are stored per userId:
 *   fittrack_<userId>_goals
 *
 * Falls back to getCurrentUser() when no userId is supplied so all
 * existing call-sites continue to work without changes.
 */

import { getCurrentUser } from './auth';
import { getUserScopedKey } from './userDataManager';
import { logEvent } from './analytics';

// ─── Key resolver ───────────────────────────────────────────────────────────

const resolveUserId = (userId) =>
  userId || getCurrentUser()?.id || 'anonymous';

const goalsKey = (userId) =>
  getUserScopedKey(resolveUserId(userId), 'goals');

// ─── Internal persistence ───────────────────────────────────────────────────

const persistGoals = (goals, userId) => {
  localStorage.setItem(goalsKey(userId), JSON.stringify(goals));
  window.dispatchEvent(
    new CustomEvent('fittrack_goals_updated', { detail: goals })
  );
};

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns all goals for the current (or given) user.
 * @param {string} [userId]
 * @returns {Array}
 */
export const getGoals = (userId) => {
  try {
    const data = localStorage.getItem(goalsKey(userId));
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

/**
 * Creates a new goal for the current (or given) user.
 * @param {{ name: string, type: string, target: number }} payload
 * @param {string} [userId]
 * @returns {object}
 */
export const createGoal = ({ name, type, target }, userId) => {
  const goals = getGoals(userId);
  const goal  = {
    id:        Date.now().toString(),
    name:      name.trim(),
    type,          // 'pushups' | 'squats' | 'jumping-jacks' | 'high-knees' | 'plank'
    target:    Number(target),
    progress:  0,
    status:    'active', // 'active' | 'completed'
    createdAt: new Date().toISOString(),
  };
  goals.push(goal);
  persistGoals(goals, userId);
  logEvent('goal_created', { name: goal.name, type: goal.type, target: goal.target });
  return goal;
};

/**
 * Deletes a goal by id.
 * @param {string} id
 * @param {string} [userId]
 */
export const deleteGoal = (id, userId) => {
  const goals = getGoals(userId).filter((g) => g.id !== id);
  persistGoals(goals, userId);
};

/**
 * Adds progress to every active goal that matches the given exercise type.
 * Marks the goal completed when progress >= target.
 * Returns any newly-completed goal ids.
 *
 * @param {string} exerciseType - label like "Push-ups" or "Squats"
 * @param {number} reps         - reps from the finished session
 * @param {string} [userId]
 * @returns {string[]} ids of newly completed goals
 */
export const updateGoalsForWorkout = (exerciseType, reps, userId) => {
  const goals         = getGoals(userId);
  const newlyCompleted = [];

  // Map workout labels → goal types
  const labelToType = {
    'push-ups':      'pushups',
    'pushups':       'pushups',
    'squats':        'squats',
    'jumping jacks': 'jumping-jacks',
    'high knees':    'high-knees',
    'plank':         'plank',
  };

  const key       = (exerciseType || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const matchType = labelToType[key];

  if (!matchType) return newlyCompleted;

  let changed = false;
  goals.forEach((g) => {
    if (g.status !== 'active' || g.type !== matchType) return;
    const before = g.progress;
    g.progress   = Math.min(g.progress + reps, g.target);
    
    if (g.progress > before) {
      logEvent('goal_progress_updated', { goalId: g.id, name: g.name, progress: g.progress, target: g.target });
      
      if (g.progress >= g.target && before < g.target) {
        g.status = 'completed';
        newlyCompleted.push(g.id);
        logEvent('goal_completed', { goalId: g.id, name: g.name, target: g.target });
      }
      changed = true;
    }
  });

  if (changed) persistGoals(goals, userId);
  return newlyCompleted;
};
