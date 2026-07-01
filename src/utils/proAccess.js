/**
 * proAccess.js
 *
 * Per-account PRO subscription management.
 *
 * Key: fittrack_<userId>_pro
 *
 * PRO status is strictly isolated per account.
 * If no userId is provided, falls back to the currently logged-in user.
 */

import { getCurrentUser, updateCurrentUser } from './auth';
import { getUserScopedKey } from './userDataManager';
import { logEvent } from './analytics';

// ─── Key resolver ───────────────────────────────────────────────────────────

const resolveUserId = (userId) =>
  userId || getCurrentUser()?.id || null;

const proKey = (userId) => {
  const id = resolveUserId(userId);
  if (!id) return null;
  return getUserScopedKey(id, 'pro');
};

// ─── Read helpers ───────────────────────────────────────────────────────────

/**
 * Returns true if the given (or current) user has PRO access.
 * @param {string} [userId]
 * @returns {boolean}
 */
export const isProUser = (userId) => {
  try {
    const key = proKey(userId);
    if (!key) return false;

    // Check scoped key first (new system)
    const data = JSON.parse(localStorage.getItem(key) || 'null');
    if (data?.status === 'pro') return true;

    // Also accept isPro flag on the user object itself (set by upgradeUserToPro)
    const id   = resolveUserId(userId);
    const user = id ? JSON.parse(localStorage.getItem('fittrack_auth_user') || 'null') : null;
    if (user?.id === id && user?.isPro === true) return true;

    return false;
  } catch {
    return false;
  }
};

/**
 * Returns PRO metadata or null.
 * @param {string} [userId]
 */
export const getProMeta = (userId) => {
  try {
    const key = proKey(userId);
    if (!key) return null;
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
};

// ─── Write helpers ──────────────────────────────────────────────────────────

/**
 * Grants PRO access for the given (or current) user.
 * Writes the scoped key AND syncs isPro on the user object.
 *
 * @param {string} [method]  – 'upi' | 'card' | 'mock'
 * @param {string} [userId]
 */
export const grantProAccess = (method = 'mock', userId) => {
  const key = proKey(userId);
  if (!key) {
    console.warn('[proAccess] Cannot grant PRO — no user is logged in.');
    return;
  }

  const id      = resolveUserId(userId);
  const current = getCurrentUser();

  const payload = {
    status:    'pro',
    grantedAt: new Date().toISOString(),
    method,
  };

  localStorage.setItem(key, JSON.stringify(payload));
  logEvent('pro_purchase_success', { method, userId: id });

  // Keep the user object in sync so Profile/Navbar reflect PRO badge
  if (current?.id === id) {
    updateCurrentUser({ isPro: true, paymentStatus: 'PAID', proGrantedAt: payload.grantedAt, proMethod: method });
  }

  window.dispatchEvent(
    new CustomEvent('fittrack_pro_updated', { detail: payload })
  );
};

/**
 * Revokes PRO access (useful for testing / admin).
 * @param {string} [userId]
 */
export const revokeProAccess = (userId) => {
  const key = proKey(userId);
  if (key) localStorage.removeItem(key);

  const id      = resolveUserId(userId);
  const current = getCurrentUser();
  if (current?.id === id) {
    updateCurrentUser({ isPro: false, paymentStatus: 'NOT_PAID' });
  }

  window.dispatchEvent(
    new CustomEvent('fittrack_pro_updated', { detail: null })
  );
};
