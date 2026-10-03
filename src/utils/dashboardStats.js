/**
 * dashboardStats.js
 *
 * Utility functions for parsing workout history and aggregating statistics
 * for Daily, Weekly, and Monthly views.
 */

// ─── Duration helpers ────────────────────────────────────────────────────────

export const parseDurationToSeconds = (durationStr) => {
  if (!durationStr) return 0;
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
};

export const formatSecondsToTime = (totalSeconds) => {
  const hours   = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0)
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

// ─── Date constants ──────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ─── Local date utilities ────────────────────────────────────────────────────

/** Returns a new Date set to midnight in local time. */
const localMidnight = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Returns "YYYY-MM-DD" in the user's local timezone. */
const toLocalDateStr = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Returns the Monday of the ISO week that contains `date` (local time). */
const getWeekMonday = (date) => {
  const d = localMidnight(date);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day; // shift so Mon = 0
  d.setDate(d.getDate() + diff);
  return d;
};

// ─── Session date extractor ──────────────────────────────────────────────────

/**
 * Extracts the real local Date from a session.
 * Priority: numeric `id` (Unix ms timestamp) → `date` string ("27 Jun 2026").
 */
const getSessionDate = (session) => {
  if (session.id) {
    const ts = parseInt(session.id, 10);
    if (!isNaN(ts) && ts > 1_000_000_000_000) return new Date(ts);
  }
  if (session.date) {
    const parts = session.date.split(' ');
    if (parts.length === 3) {
      const day      = parseInt(parts[0], 10);
      const monthIdx = MONTHS.indexOf(parts[1]);
      const year     = parseInt(parts[2], 10);
      if (day && monthIdx !== -1 && year)
        return new Date(year, monthIdx, day, 12, 0, 0); // noon avoids DST edge-cases
    }
  }
  return new Date();
};

// ─── Human-readable period label ─────────────────────────────────────────────

/**
 * Returns a short, accurate description of the current period window
 * to show in stat tile sub-labels.
 *   day   → "Today, 1 Jul"
 *   week  → "Mon 25 Jun – Sun 1 Jul"
 *   month → "July 2026"
 */
export const getPeriodLabel = (period) => {
  const now = new Date();

  if (period === 'day') {
    return `Today, ${now.getDate()} ${MONTHS[now.getMonth()]}`;
  }

  if (period === 'week') {
    const mon = getWeekMonday(now);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const fmt = (d) => `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
    return `${fmt(mon)} – ${fmt(sun)}`;
  }

  // month
  return `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
};

// ─── Main aggregation ────────────────────────────────────────────────────────

/**
 * Aggregates workout history into stats + chart slots for the chosen period.
 *
 * @param {Array}  history - Workout history array
 * @param {string} period  - 'day' | 'week' | 'month'
 * @returns {object}
 */
export const getDashboardStats = (history = [], period = 'day') => {
  const now = new Date();

  let totalWorkouts        = 0;
  let totalReps            = 0;
  let totalCalories        = 0;
  let totalDurationSeconds = 0;
  let totalPoints          = 0;
  let pushupsReps          = 0;
  let squatsReps           = 0;

  // ── Build chart slots ──────────────────────────────────────────────────────
  const chartSlots = [];

  if (period === 'day') {
    // Last 7 days, oldest → newest
    for (let i = 6; i >= 0; i--) {
      const d = localMidnight(now);
      d.setDate(d.getDate() - i);
      const isToday = i === 0;
      chartSlots.push({
        key:      toLocalDateStr(d),
        // "Today" for the rightmost bar, otherwise "Mon 30"
        label:    isToday ? 'Today' : `${DAYS[d.getDay()]} ${d.getDate()}`,
        dateObj:  d,
        reps: 0, calories: 0, points: 0, workouts: 0,
      });
    }
  } else if (period === 'week') {
    // Last 8 weeks (current week + 7 previous), oldest → newest
    const thisWeekMonday = getWeekMonday(now);
    for (let i = 7; i >= 0; i--) {
      const mon = new Date(thisWeekMonday);
      mon.setDate(mon.getDate() - i * 7);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      const isCurrentWeek = i === 0;
      // Label: "This week" for current, otherwise "25 Jun"
      const label = isCurrentWeek
        ? 'This wk'
        : `${mon.getDate()} ${MONTHS[mon.getMonth()]}`;
      chartSlots.push({
        key:     toLocalDateStr(mon),      // Monday of that week
        label,
        dateObj: mon,
        endDateObj: sun,
        reps: 0, calories: 0, points: 0, workouts: 0,
      });
    }
  } else {
    // Last 6 months, oldest → newest
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const isCurrentMonth = i === 0;
      chartSlots.push({
        key:    `${d.getFullYear()}-${d.getMonth()}`,
        // "Jul" for current month, "Jun '26" for past months (only show year if different from now)
        label:  isCurrentMonth
          ? MONTHS[d.getMonth()]
          : d.getFullYear() === now.getFullYear()
            ? MONTHS[d.getMonth()]
            : `${MONTHS[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`,
        dateObj: d,
        reps: 0, calories: 0, points: 0, workouts: 0,
      });
    }
  }

  // ── Slot finder ────────────────────────────────────────────────────────────
  const findSlotIndex = (date) => {
    const d = localMidnight(date);

    if (period === 'day') {
      const target = toLocalDateStr(d);
      return chartSlots.findIndex(s => s.key === target);
    }

    if (period === 'week') {
      const monday = getWeekMonday(d);
      const target = toLocalDateStr(monday);
      return chartSlots.findIndex(s => s.key === target);
    }

    // month
    const target = `${d.getFullYear()}-${d.getMonth()}`;
    return chartSlots.findIndex(s => s.key === target);
  };

  // ── Aggregate sessions ─────────────────────────────────────────────────────
  history.forEach(session => {
    const sessionDate = getSessionDate(session);
    const durationSec = parseDurationToSeconds(session.duration);
    const reps        = session.reps            || 0;
    const calories    = session.caloriesBurned  || 0;
    const points      = session.pointsEarned    || 0;
    const exercise    = session.exerciseType?.toLowerCase() || '';

    const slotIdx = findSlotIndex(sessionDate);
    if (slotIdx === -1) return; // outside current window — skip

    totalWorkouts        += 1;
    totalReps            += reps;
    totalCalories        += calories;
    totalDurationSeconds += durationSec;
    totalPoints          += points;

    if (exercise.includes('push'))  pushupsReps += reps;
    else if (exercise.includes('squat')) squatsReps += reps;

    chartSlots[slotIdx].reps     += reps;
    chartSlots[slotIdx].calories  = Math.round((chartSlots[slotIdx].calories + calories) * 10) / 10;
    chartSlots[slotIdx].points   += points;
    chartSlots[slotIdx].workouts += 1;
  });

  totalCalories = Math.round(totalCalories * 10) / 10;

  return {
    totalWorkouts,
    totalReps,
    totalCalories,
    totalDurationStr: formatSecondsToTime(totalDurationSeconds),
    totalPoints,
    pushupsReps,
    squatsReps,
    periodLabel: getPeriodLabel(period),
    chartData: chartSlots.map(s => ({
      label:    s.label,
      reps:     s.reps,
      calories: s.calories,
      points:   s.points,
      workouts: s.workouts,
    })),
  };
};
