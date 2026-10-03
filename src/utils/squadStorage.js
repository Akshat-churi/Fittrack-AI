/**
 * squadStorage.js
 *
 * Squad System data layer for FitTrack AI.
 *
 * Storage strategy:
 *   - When Supabase IS configured  → squads live in the `squads` table so
 *     every user on every device shares the same data. localStorage is used
 *     only as a local cache that mirrors the server.
 *   - When Supabase is NOT configured → falls back to localStorage-only,
 *     exactly as before (single-device demo mode).
 *
 * All public functions remain synchronous-or-async as they were so existing
 * call-sites in Squads.jsx don't need to change (the page already awaits
 * the async ones: joinSquadByCode, addMemberDirectly).
 */

import { getWorkoutHistory, getUserPoints } from './storage';
import { logEvent } from './analytics';
import { isSupabaseConfigured } from './supabaseClient';
import {
  upsertSquadToSupabase,
  fetchAllSquadsFromSupabase,
  fetchSquadByCodeFromSupabase,
  deleteSquadFromSupabase,
} from './supabaseBridge';

const SQUADS_KEY = 'fittrack_squads';

// ── Helpers ──────────────────────────────────────────────────────────────────

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const generateCode = () =>
  Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');

const dispatchUpdate = (detail = {}) => {
  window.dispatchEvent(new CustomEvent('fittrack_squads_updated', { detail }));
};

// ── localStorage I/O (local cache) ───────────────────────────────────────────

const readLocal = () => {
  try { return JSON.parse(localStorage.getItem(SQUADS_KEY) || '[]'); }
  catch { return []; }
};

const writeLocal = (squads) => {
  try { localStorage.setItem(SQUADS_KEY, JSON.stringify(squads)); }
  catch (err) { console.error('[squadStorage] localStorage write failed', err); }
};

// ── Save helper: persists to Supabase + local cache + fires event ─────────────

const persistSquad = async (squad) => {
  // Always update local cache immediately for instant UI feedback
  const all = readLocal();
  const idx = all.findIndex(s => s.id === squad.id);
  if (idx === -1) all.push(squad);
  else all[idx] = squad;
  writeLocal(all);

  // Sync to Supabase in the background (don't block the caller)
  if (isSupabaseConfigured()) {
    upsertSquadToSupabase(squad).catch(err =>
      console.error('[squadStorage] Supabase sync failed', err)
    );
  }

  dispatchUpdate({ squadId: squad.id });
};

const removeSquad = async (squadId) => {
  const all = readLocal().filter(s => s.id !== squadId);
  writeLocal(all);

  if (isSupabaseConfigured()) {
    deleteSquadFromSupabase(squadId).catch(err =>
      console.error('[squadStorage] Supabase delete failed', err)
    );
  }

  dispatchUpdate({ squadId });
};

// ── Raw I/O (public, used by SquadHub for synchronous reads) ─────────────────

/**
 * Returns all squads from the local cache.
 * Call refreshSquadsFromSupabase() first on page load to ensure cache is warm.
 */
export const getAllSquads = () => readLocal();

export const saveAllSquads = (squads) => {
  writeLocal(squads);
  dispatchUpdate();
  // Sync each squad that changed — used by legacy callers (goal/challenge mutations)
  if (isSupabaseConfigured()) {
    squads.forEach(s => upsertSquadToSupabase(s).catch(() => {}));
  }
};

/**
 * Fetches all squads from Supabase and updates the local cache.
 * Call this on component mount so the cache reflects the server state.
 * Returns the fresh array (or null when Supabase isn't configured).
 */
export const refreshSquadsFromSupabase = async () => {
  if (!isSupabaseConfigured()) return null;
  const squads = await fetchAllSquadsFromSupabase();
  if (squads) {
    writeLocal(squads);
    dispatchUpdate();
  }
  return squads;
};

// ── Queries ──────────────────────────────────────────────────────────────────

export const getSquadById = (id) =>
  readLocal().find(s => s.id === id) || null;

export const getUserSquads = (userId) => {
  if (!userId) return [];
  return readLocal().filter(s => s.members.some(m => m.userId === userId));
};

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Creates a new squad and syncs it to Supabase.
 * Returns the new squad or null on validation failure.
 */
export const createSquad = async (name, emoji, userId, userName) => {
  if (!userId || !name?.trim()) return null;

  const squad = {
    id:         `squad_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name:       name.trim(),
    emoji:      emoji || '💪',
    code:       generateCode(),
    leaderId:   userId,
    members:    [{ userId, name: userName || 'Athlete', joinedAt: new Date().toISOString() }],
    goals:      [],
    challenges: [],
    createdAt:  new Date().toISOString(),
  };

  await persistSquad(squad);
  logEvent('squad_created', { squadId: squad.id, name: squad.name });
  return squad;
};

/**
 * Joins a squad by its invite code.
 * When Supabase is configured the squad is looked up server-side so users
 * from different devices/browsers can join each other's squads.
 *
 * Returns { success, squad?, error? }
 */
export const joinSquadByCode = async (code, userId, userName) => {
  if (!code?.trim() || !userId)
    return { success: false, error: 'Invalid code or session.' };

  const normalizedCode = code.trim().toUpperCase();

  let squad = null;

  if (isSupabaseConfigured()) {
    // Primary: look up the squad on Supabase (cross-device)
    squad = await fetchSquadByCodeFromSupabase(normalizedCode);
    if (squad) {
      // Ensure local cache has this squad
      const all = readLocal();
      if (!all.find(s => s.id === squad.id)) {
        all.push(squad);
        writeLocal(all);
      }
    }
  }

  // Fallback to local cache (also covers Supabase-off mode)
  if (!squad) {
    squad = readLocal().find(s => s.code.toUpperCase() === normalizedCode) || null;
  }

  if (!squad)
    return { success: false, error: 'No squad found with that code. Double-check and try again.' };

  if (squad.members.some(m => m.userId === userId))
    return { success: false, error: "You're already in this squad." };

  if (squad.members.length >= 20)
    return { success: false, error: 'This squad is full (max 20 members).' };

  squad = {
    ...squad,
    members: [
      ...squad.members,
      { userId, name: userName || 'Athlete', joinedAt: new Date().toISOString() },
    ],
  };

  await persistSquad(squad);
  logEvent('squad_joined', { squadId: squad.id, name: squad.name });
  return { success: true, squad };
};

/**
 * Directly adds a user to a squad (leader action, no invite code needed).
 * Returns { success, error? }
 */
export const addMemberDirectly = async (squadId, userId, userName) => {
  if (!squadId || !userId) return { success: false, error: 'Invalid parameters.' };

  // Try to get the latest from Supabase first so we don't overwrite a stale local copy
  let squad = null;
  if (isSupabaseConfigured()) {
    const all = await fetchAllSquadsFromSupabase();
    if (all) { writeLocal(all); squad = all.find(s => s.id === squadId) || null; }
  }
  if (!squad) squad = getSquadById(squadId);

  if (!squad) return { success: false, error: 'Squad not found.' };
  if (squad.members.some(m => m.userId === userId))
    return { success: false, error: 'This user is already in the squad.' };
  if (squad.members.length >= 20)
    return { success: false, error: 'Squad is full (max 20 members).' };

  squad = {
    ...squad,
    members: [
      ...squad.members,
      { userId, name: userName || 'Athlete', joinedAt: new Date().toISOString() },
    ],
  };

  await persistSquad(squad);
  logEvent('squad_member_added', { squadId, addedUserId: userId });
  return { success: true };
};

/**
 * Removes a user from a squad.
 * If the leader leaves, the next member is promoted.
 * If the last member leaves, the squad is deleted.
 */
export const leaveSquad = async (squadId, userId) => {
  let squad = getSquadById(squadId);
  if (!squad) return;

  squad = { ...squad, members: squad.members.filter(m => m.userId !== userId) };

  if (squad.leaderId === userId && squad.members.length > 0)
    squad = { ...squad, leaderId: squad.members[0].userId };

  if (squad.members.length === 0) {
    await removeSquad(squadId);
  } else {
    await persistSquad(squad);
  }
};

/**
 * Adds a goal to a squad.
 * Returns the created goal or null.
 */
export const addSquadGoal = async (squadId, goalData) => {
  let squad = getSquadById(squadId);
  if (!squad) return null;

  const goal = {
    id:        `goal_${Date.now()}`,
    createdAt: new Date().toISOString(),
    progress:  0,
    ...goalData,
  };

  squad = { ...squad, goals: [...(squad.goals || []), goal] };
  await persistSquad(squad);
  logEvent('squad_goal_added', { squadId, title: goal.title });
  return goal;
};

/**
 * Adds a challenge to a squad (vs another squad).
 */
export const addSquadChallenge = async (squadId, challengeData) => {
  let squad = getSquadById(squadId);
  if (!squad) return null;

  const challenge = {
    id:        `chal_${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...challengeData,
  };

  squad = { ...squad, challenges: [...(squad.challenges || []), challenge] };
  await persistSquad(squad);
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

  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekSessions = history.filter(h => {
    try {
      const ts = parseInt(h.id, 10);
      return !isNaN(ts) ? ts > cutoff : new Date(h.date).getTime() > cutoff;
    } catch { return false; }
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
 */
export const getSquadStats = (squad) => {
  const memberStats = (squad.members || []).map(getMemberStats);

  const totalReps     = memberStats.reduce((s, m) => s + m.totalReps,     0);
  const totalWorkouts = memberStats.reduce((s, m) => s + m.totalWorkouts, 0);
  const totalPoints   = memberStats.reduce((s, m) => s + m.points,        0);
  const totalCals     = memberStats.reduce((s, m) => s + m.totalCals,     0);
  const weekReps      = memberStats.reduce((s, m) => s + m.weekReps,      0);

  const goals = (squad.goals || []).map(goal => {
    let current = 0;
    if (goal.exercise) {
      memberStats.forEach(m => {
        m.recentSessions.forEach(sess => {
          const ex = (sess.exerciseType || '').toLowerCase();
          if (ex.includes(goal.exercise.toLowerCase()) || goal.exercise.toLowerCase().includes(ex))
            current += (sess.reps || 0);
        });
      });
    } else {
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
