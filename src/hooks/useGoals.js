import { useState, useEffect, useCallback } from 'react';
import {
  getGoals,
  createGoal,
  deleteGoal,
  updateGoalsForWorkout,
} from '../utils/goalsStorage';

/**
 * Manages fitness goals.
 * - Syncs from localStorage on mount.
 * - Listens for fittrack_goals_updated to stay in sync.
 * - Listens for fittrack_workout_saved to auto-update goal progress.
 *
 * @returns {{
 *   goals: Array,
 *   addGoal: Function,
 *   removeGoal: Function,
 *   newlyCompleted: string[],
 *   clearCompleted: Function,
 * }}
 */
export const useGoals = () => {
  const [goals, setGoals] = useState(() => getGoals());
  const [newlyCompleted, setNewlyCompleted] = useState([]);

  // Keep in sync when another tab or component updates goals
  useEffect(() => {
    const onUpdate = (e) => setGoals(e.detail ?? getGoals());
    window.addEventListener('fittrack_goals_updated', onUpdate);
    return () => window.removeEventListener('fittrack_goals_updated', onUpdate);
  }, []);

  // Auto-update goals when a workout session is saved
  useEffect(() => {
    const onWorkout = (e) => {
      const { exerciseType, reps } = e.detail ?? {};
      if (!exerciseType || !reps) return;
      const completed = updateGoalsForWorkout(exerciseType, reps);
      if (completed.length > 0) {
        setNewlyCompleted((prev) => [...prev, ...completed]);
      }
      setGoals(getGoals());
    };
    window.addEventListener('fittrack_workout_saved', onWorkout);
    return () => window.removeEventListener('fittrack_workout_saved', onWorkout);
  }, []);

  const addGoal = useCallback((payload) => {
    const goal = createGoal(payload);
    setGoals(getGoals());
    return goal;
  }, []);

  const removeGoal = useCallback((id) => {
    deleteGoal(id);
    setGoals(getGoals());
  }, []);

  const clearCompleted = useCallback(() => setNewlyCompleted([]), []);

  return { goals, addGoal, removeGoal, newlyCompleted, clearCompleted };
};
