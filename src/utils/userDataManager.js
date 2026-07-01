/**
 * userDataManager.js
 *
 * Central manager for per-user data in FitTrack AI.
 * Every piece of locally-stored data is scoped by userId so that
 * multiple accounts on the same device remain fully independent.
 *
 * Key layout:
 *   fittrack_<userId>_history    – workout sessions
 *   fittrack_<userId>_points     – accumulated points
 *   fittrack_<userId>_badges     – unlocked badges
 *   fittrack_<userId>_goals      – fitness goals
 *   fittrack_<userId>_pro        – PRO subscription
 *   fittrack_<userId>_friends    – friends list
 *   fittrack_<userId>_migrated   – one-time migration flag
 */

import { logEvent } from './analytics';

// ─── Old global keys (pre-SaaS) ────────────────────────────────────────────
const GLOBAL_KEYS = {
  history: 'fittrack_history',
  points:  'fittrack_points',
  badges:  'fittrack_badges',
  goals:   'fittrack_goals',
  pro:     'fittrack_pro_access',
};

// ─── Key builders ───────────────────────────────────────────────────────────

/**
 * Returns the userId-scoped localStorage key for a given data type.
 * @param {string} userId
 * @param {string} base  – 'history' | 'points' | 'badges' | 'goals' | 'pro' | 'friends'
 * @returns {string}
 */
export const getUserScopedKey = (userId, base) =>
  `fittrack_${userId}_${base}`;

// ─── Safe JSON helpers ──────────────────────────────────────────────────────

const lsGet = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const lsSet = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('[userDataManager] localStorage write failed', key, err);
  }
};

// ─── One-time data migration ────────────────────────────────────────────────

/**
 * Copies data from the legacy global keys into the user-scoped keys.
 * Runs once per userId (guarded by a migration flag).
 * Does NOT delete the global keys (other utilities might still read them
 * on the first render before switching to scoped keys).
 *
 * @param {string} userId
 */
export const migrateGlobalData = (userId) => {
  if (!userId) return;

  const migrationKey = `fittrack_${userId}_migrated`;
  if (localStorage.getItem(migrationKey)) return; // already done

  // Migrate each global key if it has data
  Object.entries(GLOBAL_KEYS).forEach(([base, globalKey]) => {
    const existing = lsGet(getUserScopedKey(userId, base));
    // Only migrate if the scoped key is empty and the global key has data
    const globalData = localStorage.getItem(globalKey);
    if (globalData && existing === null) {
      localStorage.setItem(getUserScopedKey(userId, base), globalData);
    }
  });

  // Mark as migrated
  localStorage.setItem(migrationKey, '1');

  console.info('[userDataManager] Migration complete for user', userId);
};

// ─── Session lifecycle ──────────────────────────────────────────────────────

/**
 * Called after a successful login.
 * Runs one-time migration and dispatches a custom event so
 * components can re-read user-scoped data.
 *
 * @param {string} userId
 */
export const loadUserSession = (userId) => {
  if (!userId) return;
  migrateGlobalData(userId);
  window.dispatchEvent(
    new CustomEvent('fittrack_session_loaded', { detail: { userId } })
  );
};

/**
 * Called on logout.
 * Removes ONLY the active session key — all user data remains intact.
 */
export const clearActiveSession = () => {
  localStorage.removeItem('fittrack_auth_user');
  window.dispatchEvent(new CustomEvent('fittrack_session_cleared'));
};

// ─── Friends (local social layer) ──────────────────────────────────────────

/**
 * Returns the stored friends list for a user.
 * @param {string} userId
 * @returns {Array<{ userId: string, addedAt: string }>}
 */
export const getFriendsList = (userId) => {
  if (!userId) return [];
  return lsGet(getUserScopedKey(userId, 'friends'), []);
};

/**
 * Saves a friends list for a user.
 * @param {string} userId
 * @param {Array}  list
 */
export const saveFriendsList = (userId, list) => {
  if (!userId) return;
  lsSet(getUserScopedKey(userId, 'friends'), list);
  window.dispatchEvent(
    new CustomEvent('fittrack_friends_updated', { detail: { userId, list } })
  );
};

/**
 * Returns true if userId has friendId in their friends list.
 * @param {string} userId
 * @param {string} friendId
 * @returns {boolean}
 */
export const isFriend = (userId, friendId) => {
  if (!userId || !friendId) return false;
  return getFriendsList(userId).some((f) => f.userId === friendId);
};

/**
 * Adds a bidirectional friendship between userA and userB.
 * Both sides are persisted in localStorage.
 *
 * @param {string} userAId  – the current user
 * @param {string} userBId  – the user being added
 * @param {string} [userBName]
 */
export const addFriend = (userAId, userBId, userBName = '') => {
  if (!userAId || !userBId || userAId === userBId) return;

  const now = new Date().toISOString();

  // A → B
  const listA = getFriendsList(userAId);
  if (!listA.some((f) => f.userId === userBId)) {
    listA.push({ userId: userBId, name: userBName, addedAt: now });
    saveFriendsList(userAId, listA);
  }

  // B → A (the other side — they get a friendship entry too)
  const listB = getFriendsList(userBId);
  if (!listB.some((f) => f.userId === userAId)) {
    listB.push({ userId: userAId, addedAt: now });
    saveFriendsList(userBId, listB);
  }

  logEvent('friend_added', { userAId, userBId });
};

/**
 * Removes a bidirectional friendship.
 * @param {string} userAId
 * @param {string} userBId
 */
export const removeFriend = (userAId, userBId) => {
  if (!userAId || !userBId) return;

  saveFriendsList(
    userAId,
    getFriendsList(userAId).filter((f) => f.userId !== userBId)
  );
  saveFriendsList(
    userBId,
    getFriendsList(userBId).filter((f) => f.userId !== userAId)
  );
};

// ─── User social data bundle ────────────────────────────────────────────────

/**
 * Returns a snapshot of a user's local social data.
 * @param {string} userId
 * @returns {{ friendsList: Array, friendCount: number }}
 */
export const getUserSocialData = (userId) => {
  const friendsList = getFriendsList(userId);
  return {
    friendsList,
    friendCount: friendsList.length,
  };
};
