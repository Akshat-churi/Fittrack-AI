/**
 * dashboardStats.js
 * 
 * Utility functions for parsing workout history and aggregating statistics
 * for Daily, Weekly, and Monthly views.
 */

// Helper to convert MM:SS or HH:MM:SS string to total seconds
export const parseDurationToSeconds = (durationStr) => {
  if (!durationStr) return 0;
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]; // MM:SS
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
  }
  return 0;
};

// Helper to format seconds back to MM:SS or HH:MM:SS
export const formatSecondsToTime = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Map of months for label generation
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Get date from session. Uses `id` timestamp if valid, falls back to parsing `date` string.
 */
const getSessionDate = (session) => {
  if (session.id) {
    const timestamp = parseInt(session.id, 10);
    if (!isNaN(timestamp) && timestamp > 1000000000000) {
      return new Date(timestamp);
    }
  }
  
  // Fallback to date string parsing ("27 Jun 2026")
  if (session.date) {
    const parts = session.date.split(' ');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const monthIdx = MONTHS.indexOf(parts[1]);
      const year = parseInt(parts[2], 10);
      if (day && monthIdx !== -1 && year) {
        return new Date(year, monthIdx, day);
      }
    }
  }
  
  return new Date();
};

/**
 * Aggregates statistics for the dashboard based on workout history.
 * 
 * @param {Array} history - Workout history array
 * @param {string} period - 'day' | 'week' | 'month'
 * @returns {object} Aggregated stats and chart details
 */
export const getDashboardStats = (history = [], period = 'day') => {
  const now = new Date();
  
  // Initialize base aggregates
  let totalWorkouts = 0;
  let totalReps = 0;
  let totalCalories = 0;
  let totalDurationSeconds = 0;
  let totalPoints = 0;
  let pushupsReps = 0;
  let squatsReps = 0;

  // We want to generate time-slots for the charts:
  // - day: Last 7 days (including today)
  // - week: Last 8 weeks (including this week)
  // - month: Last 6 months (including this month)
  
  const chartSlots = [];
  
  if (period === 'day') {
    // Generate last 7 days slots
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      chartSlots.push({
        key: d.toDateString(),
        label: `${DAYS[d.getDay()]} ${d.getDate()}`,
        dateObj: d,
        reps: 0,
        calories: 0,
        points: 0,
        workouts: 0
      });
    }
  } else if (period === 'week') {
    // Generate last 8 weeks slots (each slot represents the start date of that week)
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      // Go back i weeks
      d.setDate(now.getDate() - (i * 7));
      // Set to beginning of week (Monday or Sunday - let's do Monday)
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      d.setDate(diff);
      d.setHours(0, 0, 0, 0);
      
      chartSlots.push({
        key: `week-${d.getFullYear()}-${Math.floor(d.getTime() / (7 * 24 * 60 * 60 * 1000))}`,
        label: `${d.getDate()} ${MONTHS[d.getMonth()]}`,
        dateObj: d,
        reps: 0,
        calories: 0,
        points: 0,
        workouts: 0
      });
    }
  } else {
    // Generate last 6 months slots
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      chartSlots.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: `${MONTHS[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`,
        dateObj: d,
        reps: 0,
        calories: 0,
        points: 0,
        workouts: 0
      });
    }
  }

  // Helper to find slot index for a date
  const findSlotIndex = (date) => {
    const d = new Date(date);
    d.setHours(0,0,0,0);
    
    if (period === 'day') {
      const targetStr = d.toDateString();
      return chartSlots.findIndex(slot => slot.key === targetStr);
    } else if (period === 'week') {
      // Find week slot that contains this date
      return chartSlots.findIndex((slot, idx) => {
        const start = slot.dateObj.getTime();
        const end = start + (7 * 24 * 60 * 60 * 1000);
        return d.getTime() >= start && d.getTime() < end;
      });
    } else {
      // Month
      const targetKey = `${d.getFullYear()}-${d.getMonth()}`;
      return chartSlots.findIndex(slot => slot.key === targetKey);
    }
  };

  // Process history
  history.forEach(session => {
    const sessionDate = getSessionDate(session);
    const durationSec = parseDurationToSeconds(session.duration);
    const reps = session.reps || 0;
    const calories = session.caloriesBurned || 0;
    const points = session.pointsEarned || 0;
    const exercise = session.exerciseType?.toLowerCase() || '';

    const slotIdx = findSlotIndex(sessionDate);
    
    if (slotIdx !== -1) {
      totalWorkouts += 1;
      totalReps += reps;
      totalCalories += calories;
      totalDurationSeconds += durationSec;
      totalPoints += points;

      if (exercise.includes('push')) {
        pushupsReps += reps;
      } else if (exercise.includes('squat')) {
        squatsReps += reps;
      }

      // Add to specific chart slot
      chartSlots[slotIdx].reps += reps;
      chartSlots[slotIdx].calories += Math.round(calories * 10) / 10;
      chartSlots[slotIdx].points += points;
      chartSlots[slotIdx].workouts += 1;
    }
  });

  // Round calories
  totalCalories = Math.round(totalCalories * 10) / 10;

  return {
    totalWorkouts,
    totalReps,
    totalCalories,
    totalDurationStr: formatSecondsToTime(totalDurationSeconds),
    totalPoints,
    pushupsReps,
    squatsReps,
    chartData: chartSlots.map(slot => ({
      label: slot.label,
      reps: slot.reps,
      calories: Math.round(slot.calories * 10) / 10,
      points: slot.points,
      workouts: slot.workouts
    }))
  };
};
