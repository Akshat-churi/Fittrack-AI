/**
 * squadStorage.js
 *
 * Squad System data layer for FitTrack AI.
 * All squad data stored under fittrack_squads in localStorage.
 * Squad stats are computed live from each member's existing workout histories.
 *
 * Key layout:
 *   fittrack_squads  – global array of all squad objects
 */

import { getWorkoutHistory, getUserPoints } from './storage';
import { logEvent } from './analytics';

const SQUADS_KEY = 'fittrack_squads';

// ── Helpers ──────────────────────────────────────────────────────────────────

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const generateCode = () =>
  Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');

const dispatchUpdate = (detail = {}) => {
  window.dispatchEvent(new CustomEvent('fittrack_squads_updated', { detail }));
};

// ── Raw I/O ──────────────────────────────────────────────────────────────────

export const getAllSquads = () => {
  try { return JSON.parse(localStorage.getItem(SQUADS_KEY) || '[]'); }
  catch { return []; }
};

export const saveAllSquads = (squads) => {
  try {
    localStorage.setItem(SQUADS_KEY, JSON.stringify(squads));
    dispatchUpdate();
  } catch (err) {
    console.error('[squadStorage] write failed', err);
  }
};

// ── Queries ──────────────────────────────────────────────────────────────────

export const getSquadById = (id) =>
  getAllSquads().find(s => s.id === id) || null;

export const getUserSquads = (userId) => {
  if (!userId) return [];
  return getAllSquads().filter(s => s.members.some(m => m.userId === userId));
};

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Creates a new squad.
 * Returns the new squad or null on validation failure.
 */
export const createSquad = (name, emoji, userId, userName) => {
  if (!userId || !name?.trim()) return null;

  const squad = {
    id:        `squad_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name:      name.trim(),
    emoji:     emoji || '💪',
    code:      generateCode(),
    leaderId:  userId,
    members:   [{ userId, name: userName || 'Athlete', joinedAt: new Date().toISOString() }],
    goals:     [],
    challenges:[],
    createdAt: new Date().toISOString(),
  };

  const all = getAllSquads();
  all.push(squad);
  saveAllSquads(all);
  logEvent('squad_created', { squadId: squad.id, name: squad.name });
  return squad;
};

/**
 * Joins a squad by its invite code.
 * Returns { success, squad?, error? }
 */
export const joinSquadByCode = (code, userId, userName) => {
  if (!code?.trim() || !userId) return { success: false, error: 'Invalid code or session.' };

  const all = getAllSquads();
  const idx = all.findIndex(s => s.code.toUpperCase() === code.toUpperCase().trim());

  if (idx === -1) return { success: false, error: 'No squad found with that code. Double-check and try again.' };

  const squad = all[idx];
  if (squad.members.some(m => m.userId === userId))
    return { success: false, error: "You're already in this squad." };
  if (squad.members.length >= 20)
    return { success: false, error: 'This squad is full (max 20 members).' };

  squad.members.push({ userId, name: userName || 'Athlete', joinedAt: new Date().toISOString() });
  all[idx] = squad;
  saveAllSquads(all);
  logEvent('squad_joined', { squadId: squad.id, name: squad.name });
  return { success: true, squad };
};

/**
 * Directly adds a user to a squad by userId (leader action — no code needed).
 * Returns { success, error? }
 */
export const addMemberDirectly = (squadId, userId, userName) => {
  if (!squadId || !userId) return { success: false, error: 'Invalid parameters.' };

  const all = getAllSquads();
  const idx = all.findIndex(s => s.id === squadId);

  if (idx === -1) return { success: false, error: 'Squad not found.' };

  const squad = all[idx];
  if (squad.members.some(m => m.userId === userId))
    return { success: false, error: 'This user is already in the squad.' };
  if (squad.members.length >= 20)
    return { success: false, error: 'Squad is full (max 20 members).' };

  squad.members.push({ userId, name: userName || 'Athlete', joinedAt: new Date().toISOString() });
  all[idx] = squad;
  saveAllSquads(all);
  logEvent('squad_member_added', { squadId, addedUserId: userId });
  return { success: true };
};

/**
 * Removes a user from a squad.
 * If leader leaves, next member is promoted.
 * If last member leaves, squad is deleted.
 */
export const leaveSquad = (squadId, userId) => {
  const all = getAllSquads();
  const idx = all.findIndex(s => s.id === squadId);
  if (idx === -1) return;

  const squad = all[idx];
  squad.members = squad.members.filter(m => m.userId !== userId);

  if (squad.leaderId === userId && squad.members.length > 0)
    squad.leaderId = squad.members[0].userId;

  if (squad.members.length === 0) { all.splice(idx, 1); }
  else                             { all[idx] = squad; }

  saveAllSquads(all);
};

/**
 * Adds a goal to a squad.
 * Returns the created goal or null.
 */
export const addSquadGoal = (squadId, goalData) => {
  const all = getAllSquads();
  const idx = all.findIndex(s => s.id === squadId);
  if (idx === -1) return null;

  const goal = {
    id:        `goal_${Date.now()}`,
    createdAt: new Date().toISOString(),
    progress:  0,
    ...goalData,
  };

  all[idx].goals.push(goal);
  saveAllSquads(all);
  logEvent('squad_goal_added', { squadId, title: goal.title });
  return goal;
};

/**
 * Adds a challenge to a squad (vs another squad).
 */
export const addSquadChallenge = (squadId, challengeData) => {
  const all = getAllSquads();
  const idx = all.findIndex(s => s.id === squadId);
  if (idx === -1) return null;

  const challenge = {
    id:        `chal_${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...challengeData,
  };

  all[idx].challenges.push(challenge);
  saveAllSquads(all);
  logEvent('squad_challenge_started', { squadId, title: challenge.title });
  return challenge;
};

// ── Stats computation ─────────────────────────────────────────────────────────

/**
 * Computes live stats for a single squad member from their workout history.
 */
export const getMemberStats = (member) => {
  const history = getWorkoutHistory(member.userId);
  const points  = getUserPoints(member.userId);

  const totalReps     = history.reduce((s, h) => s + (h.reps || 0), 0);
  const totalWorkouts = history.length;
  const totalCals     = history.reduce((s, h) => s + (h.caloriesBurned || 0), 0);

  // Sessions in the last 7 days
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekSessions = history.filter(h => {
    try { return new Date(h.date).getTime() > cutoff; } catch { return false; }
  });

  return {
    ...member,
    totalReps,
    totalWorkouts,
    totalCals:    Math.round(totalCals),
    points,
    weekReps:     weekSessions.reduce((s, h) => s + (h.reps || 0), 0),
    weekWorkouts: weekSessions.length,
    recentSessions: history.slice(0, 5),
  };
};

/**
 * Aggregates full squad stats (members + goals progress + totals).
 * All data is read live from localStorage.
 */
export const getSquadStats = (squad) => {
  const memberStats = (squad.members || []).map(getMemberStats);

  const totalReps     = memberStats.reduce((s, m) => s + m.totalReps,     0);
  const totalWorkouts = memberStats.reduce((s, m) => s + m.totalWorkouts, 0);
  const totalPoints   = memberStats.reduce((s, m) => s + m.points,        0);
  const totalCals     = memberStats.reduce((s, m) => s + m.totalCals,     0);
  const weekReps      = memberStats.reduce((s, m) => s + m.weekReps,      0);

  // Enrich goals with live progress
  const goals = (squad.goals || []).map(goal => {
    let current = 0;

    if (goal.exercise) {
      // Count reps for the target exercise from all members' recent sessions
      memberStats.forEach(m => {
        m.recentSessions.forEach(sess => {
          const ex = (sess.exerciseType || '').toLowerCase();
          if (ex.includes(goal.exercise.toLowerCase()) || goal.exercise.toLowerCase().includes(ex))
            current += (sess.reps || 0);
        });
      });
    } else {
      // Fallback: use total weekly reps as proxy
      current = weekReps;
    }

    const pct = goal.target > 0 ? Math.min(100, Math.round((current / goal.target) * 100)) : 0;
    return { ...goal, current, pct, completed: pct >= 100 };
  });

  return {
    memberStats: [...memberStats].sort((a, b) => b.totalReps - a.totalReps),
    totalReps,
    totalWorkouts,
    totalPoints,
    totalCals,
    weekReps,
    goals,
    memberCount: squad.members.length,
  };
};

/**
 * Dispatches a squads-updated event when a workout is saved.
 * Called from storage.js after saveWorkoutSession().
 */
export const notifySquadWorkoutUpdate = (userId) => {
  dispatchUpdate({ userId });
};
