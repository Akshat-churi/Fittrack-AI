/**
 * streakTracker.js
 * 
 * Manages daily workout streaks, calculating current and longest streaks
 * based on session history dates, and determining milestones.
 */

// Helper to format Date objects as YYYY-MM-DD in local time
const toLocalDateStr = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const d = dateObj.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Calculates current and longest workout streaks.
 * 
 * @param {Array} history - Workout history
 * @returns {object} { currentStreak: number, longestStreak: number, hasWorkoutToday: boolean }
 */
export const calculateStreaks = (history = []) => {
  if (!history || history.length === 0) {
    return { currentStreak: 0, longestStreak: 0, hasWorkoutToday: false };
  }

  const dateSet = new Set();
  history.forEach(session => {
    const ts = parseInt(session.id, 10);
    if (!isNaN(ts)) {
      const dateObj = new Date(ts);
      dateSet.add(toLocalDateStr(dateObj));
    } else if (session.date) {
      // Fallback parsing for manual dates ("27 Jun 2026")
      const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const parts = session.date.split(' ');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const monthIdx = MONTHS.indexOf(parts[1]);
        const year = parseInt(parts[2], 10);
        if (day && monthIdx !== -1 && year) {
          const dateObj = new Date(year, monthIdx, day);
          dateSet.add(toLocalDateStr(dateObj));
        }
      }
    }
  });

  const sortedDates = Array.from(dateSet).sort((a, b) => b.localeCompare(a));
  if (sortedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, hasWorkoutToday: false };
  }

  const today = new Date();
  const todayStr = toLocalDateStr(today);

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = toLocalDateStr(yesterday);

  const newestWorkoutStr = sortedDates[0];
  const hasWorkoutToday = newestWorkoutStr === todayStr;
  const hasWorkoutYesterday = newestWorkoutStr === yesterdayStr;

  let currentStreak = 0;
  if (hasWorkoutToday || hasWorkoutYesterday) {
    let checkDate = hasWorkoutToday ? new Date(today) : new Date(yesterday);
    let checkStr = toLocalDateStr(checkDate);
    
    while (dateSet.has(checkStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
      checkStr = toLocalDateStr(checkDate);
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  let expectedDateStr = null;

  const sortedDatesAsc = Array.from(dateSet).sort((a, b) => a.localeCompare(b));
  sortedDatesAsc.forEach(dateStr => {
    if (expectedDateStr === null) {
      tempStreak = 1;
    } else {
      if (dateStr === expectedDateStr) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    
    // Calculate expected date string for next consecutive day
    const curDate = new Date(dateStr);
    curDate.setDate(curDate.getDate() + 1);
    expectedDateStr = toLocalDateStr(curDate);

    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
  });

  return { currentStreak, longestStreak, hasWorkoutToday };
};

/**
 * Gets what the streak stats will be when a new workout is completed right now.
 * 
 * @param {Array} history - Workout history
 * @returns {object} { nextStreak: number, longestStreak: number, isNewStreakDay: boolean }
 */
export const getNextStreakStats = (history = []) => {
  const { currentStreak, longestStreak, hasWorkoutToday } = calculateStreaks(history);
  
  if (hasWorkoutToday) {
    return {
      nextStreak: currentStreak,
      longestStreak,
      isNewStreakDay: false
    };
  }

  const nextStreak = currentStreak + 1;
  const newLongest = nextStreak > longestStreak ? nextStreak : longestStreak;
  
  return {
    nextStreak,
    longestStreak: newLongest,
    isNewStreakDay: true
  };
};

/**
 * Awards bonus reward points at streak milestones.
 * 
 * @param {number} streak - The current/new streak count
 * @returns {number} Bonus points
 */
export const getStreakBonus = (streak) => {
  if (streak <= 0) return 0;
  
  // Weekly multiples (7, 14, 21, 28...)
  if (streak % 7 === 0) return 200;
  // 5-day milestone
  if (streak === 5) return 100;
  // 3-day milestone
  if (streak === 3) return 50;
  
  return 0;
};
