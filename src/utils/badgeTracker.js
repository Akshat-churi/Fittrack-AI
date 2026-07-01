import { getUnlockedBadges, saveUnlockedBadges } from './storage';
import { calculateStreaks } from './streakTracker';

/**
 * Defines all achievement badges in the FitTrack AI ecosystem.
 * All icon strings map to Lucide icons.
 */
export const BADGES = [
  {
    id: 'first_workout',
    name: 'First Steps',
    description: 'Completed your first AI-guided workout session.',
    icon: 'Award',
    color: 'text-sky-400 border-sky-500/20 bg-sky-500/5'
  },
  {
    id: '10_workouts',
    name: 'Decathlon Warrior',
    description: 'Logged 10 workout sessions.',
    icon: 'Layers',
    color: 'text-indigo-400 border-indigo-500/20 bg-indigo-500/5'
  },
  {
    id: '50_workouts',
    name: 'Unstoppable Force',
    description: 'Logged 50 workout sessions.',
    icon: 'Activity',
    color: 'text-purple-400 border-purple-500/20 bg-purple-500/5'
  },
  {
    id: '100_pushups',
    name: 'Century Push',
    description: 'Completed a total of 100 push-ups.',
    icon: 'Zap',
    color: 'text-orange-400 border-orange-500/20 bg-orange-500/5'
  },
  {
    id: '500_pushups',
    name: 'Push-up Guru',
    description: 'Completed a total of 500 push-ups.',
    icon: 'Trophy',
    color: 'text-red-400 border-red-500/20 bg-red-500/5'
  },
  {
    id: '1000_points',
    name: 'Point Tycoon',
    description: 'Accumulated 1,000 total reward points.',
    icon: 'Trophy',
    color: 'text-amber-400 border-amber-500/20 bg-amber-500/5'
  },
  {
    id: '7_day_streak',
    name: 'Week on Fire',
    description: 'Maintained a 7-day daily workout streak.',
    icon: 'Flame',
    color: 'text-orange-500 border-orange-600/20 bg-orange-600/5'
  },
  {
    id: '30_day_streak',
    name: 'Consistent Legend',
    description: 'Maintained a 30-day daily workout streak.',
    icon: 'Trophy',
    color: 'text-rose-500 border-rose-600/20 bg-rose-600/5'
  },
  {
    id: 'highest_calories',
    name: 'Calorie Incinerator',
    description: 'Burned 50+ kcal in a single workout session.',
    icon: 'Flame',
    color: 'text-red-500 border-red-600/20 bg-red-600/5'
  }
];

/**
 * Checks if any badges should be unlocked based on the user's progress.
 * Unlocks them in storage and returns any newly unlocked badges.
 * 
 * @param {Array} history - Workout history
 * @param {number} totalPoints - User's total accumulated points
 * @returns {Array} List of newly unlocked badge objects
 */
export const checkAndUnlockBadges = (history = [], totalPoints = 0) => {
  const currentUnlocked = getUnlockedBadges();
  const unlockedIds = new Set(currentUnlocked.map(b => b.id));
  
  // Calculate aggregates
  const workoutsCount = history.length;
  const totalPushups = history.reduce((sum, s) => {
    return s.exerciseType === 'Push-ups' ? sum + (s.reps || 0) : sum;
  }, 0);
  const maxCalories = history.reduce((max, s) => {
    return (s.caloriesBurned || 0) > max ? s.caloriesBurned : max;
  }, 0);
  
  const streakInfo = calculateStreaks(history);
  const longestStreak = streakInfo.longestStreak;

  const newlyUnlocked = [];

  const checkAndAdd = (badgeId, isEarned) => {
    if (isEarned && !unlockedIds.has(badgeId)) {
      const badge = BADGES.find(b => b.id === badgeId);
      if (badge) {
        newlyUnlocked.push(badge);
        currentUnlocked.push({
          id: badgeId,
          unlockedAt: Date.now()
        });
      }
    }
  };

  // Evaluate conditions
  checkAndAdd('first_workout', workoutsCount >= 1);
  checkAndAdd('10_workouts', workoutsCount >= 10);
  checkAndAdd('50_workouts', workoutsCount >= 50);
  checkAndAdd('100_pushups', totalPushups >= 100);
  checkAndAdd('500_pushups', totalPushups >= 500);
  checkAndAdd('1000_points', totalPoints >= 1000);
  checkAndAdd('7_day_streak', longestStreak >= 7);
  checkAndAdd('30_day_streak', longestStreak >= 30);
  checkAndAdd('highest_calories', maxCalories >= 50);

  if (newlyUnlocked.length > 0) {
    saveUnlockedBadges(currentUnlocked);
  }

  return newlyUnlocked;
};
