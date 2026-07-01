/**
 * auth.js
 *
 * Local mock-auth layer for FitTrack AI.
 *
 * Each user object carries:
 *   role          – 'USER' | 'ADMIN'
 *   isPro         – boolean  (per-account PRO status)
 *   paymentStatus – 'NOT_PAID' | 'PAID'
 *
 * Session rules:
 *   • Login  → writes fittrack_auth_user (active session only)
 *   • Logout → removes fittrack_auth_user ONLY; never deletes user data
 *
 * Default admin:
 *   email:    admin@fittrack.ai
 *   password: Admin@1234
 *   (seeded on first app load via seedDefaultAdmin)
 */

import { loadUserSession } from './userDataManager';
import { logEvent } from './analytics';

const USER_KEY  = 'fittrack_auth_user';
const USERS_KEY = 'fittrack_auth_users';

// ─── Internal helpers ───────────────────────────────────────────────────────

const readUsers = () => {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  } catch (error) {
    console.error('Failed to parse users', error);
    return [];
  }
};

const writeUsers = (users) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

/**
 * Returns default SaaS fields so older user objects stay compatible.
 */
const withDefaults = (user) => ({
  role:          'USER',
  isPro:         false,
  paymentStatus: 'NOT_PAID',
  ...user,
});

// ─── Public read helpers ────────────────────────────────────────────────────

export const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return withDefaults(JSON.parse(raw));
  } catch (error) {
    console.error('Failed to parse current user', error);
    return null;
  }
};

/**
 * Look up any user by id (used by social features).
 * @param {string} userId
 * @returns {object|null}
 */
export const getUserById = (userId) => {
  if (!userId) return null;
  const user = readUsers().find((u) => u.id === userId);
  return user ? withDefaults({ ...user, password: undefined }) : null;
};

// ─── Role helpers ──────────────────────────────────────────────────────────

/**
 * Returns true if the given (or current) user is an admin.
 * @param {object|null} [user] - defaults to getCurrentUser()
 */
export const isAdminUser = (user) => {
  const u = user ?? getCurrentUser();
  return u?.role === 'ADMIN';
};

// ─── Default admin seeding ───────────────────────────────────────────────────

const DEFAULT_ADMIN = {
  email:    'admin@fittrack.ai',
  password: 'Admin@1234',
  name:     'FitTrack Admin',
};

/**
 * Ensures at least one ADMIN account exists in the registry.
 * Called once on app startup. Safe to call multiple times (idempotent).
 */
export const seedDefaultAdmin = () => {
  const users = readUsers();
  const hasAdmin = users.some((u) => u.role === 'ADMIN');
  if (hasAdmin) return;

  const admin = withDefaults({
    id:          'fittrack-admin-default',
    name:        DEFAULT_ADMIN.name,
    email:       DEFAULT_ADMIN.email,
    password:    DEFAULT_ADMIN.password,
    provider:    'email',
    photo:       '',
    bio:         'Platform administrator',
    age:         '',
    fitnessGoal: '',
    role:        'ADMIN',
    isPro:       true,
    paymentStatus: 'PAID',
    createdAt:   new Date().toISOString(),
  });

  users.push(admin);
  writeUsers(users);
  console.info('[auth] Default admin account seeded (admin@fittrack.ai / Admin@1234)');
};

// ─── Sign up ────────────────────────────────────────────────────────────────

export const signUpWithEmail = ({ name, email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const users = readUsers();

  if (users.some((user) => user.email === normalizedEmail)) {
    throw new Error('An account already exists with this email.');
  }

  const user = withDefaults({
    id:          crypto.randomUUID(),
    name:        name.trim(),
    email:       normalizedEmail,
    password,
    provider:    'email',
    photo:       '',
    bio:         '',
    age:         '',
    fitnessGoal: '',
    createdAt:   new Date().toISOString(),
  });

  users.push(user);
  writeUsers(users);
  logEvent('user_signup', { email: normalizedEmail, role: user.role, provider: 'email' });
  return setCurrentUser(user);
};

/**
 * Creates a new ADMIN account.
 * @param {{ name: string, email: string, password: string }} param
 */
export const signUpAdmin = ({ name, email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const users = readUsers();

  if (users.some((u) => u.email === normalizedEmail)) {
    throw new Error('An account already exists with this email.');
  }

  const admin = withDefaults({
    id:          crypto.randomUUID(),
    name:        name.trim(),
    email:       normalizedEmail,
    password,
    provider:    'email',
    photo:       '',
    bio:         '',
    age:         '',
    fitnessGoal: '',
    role:        'ADMIN',
    createdAt:   new Date().toISOString(),
  });

  users.push(admin);
  writeUsers(users);
  logEvent('user_signup', { email: normalizedEmail, role: admin.role, provider: 'email' });
  return setCurrentUser(admin);
};

// ─── Sign in ────────────────────────────────────────────────────────────────

export const signInWithEmail = ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const users = readUsers();
  const user = users.find(
    (u) => u.email === normalizedEmail && u.password === password
  );

  if (!user) {
    throw new Error('Email or password is incorrect.');
  }

  // Back-fill SaaS fields for legacy accounts that predate this update
  const enriched = withDefaults(user);
  if (enriched !== user) {
    writeUsers(users.map((u) => (u.id === enriched.id ? enriched : u)));
  }

  logEvent('user_login', { email: normalizedEmail, role: enriched.role, provider: 'email' });
  return setCurrentUser(enriched);
};

// ─── Google sign-in ─────────────────────────────────────────────────────────

const decodeGoogleCredential = (credential) => {
  try {
    const payload = credential.split('.')[1];
    const base64  = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json    = decodeURIComponent(
      atob(base64)
        .split('')
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    return JSON.parse(json);
  } catch (error) {
    console.error('Failed to decode Google credential', error);
    throw new Error('Could not read your Google account details. Please try again.', { cause: error });
  }
};

export const signInWithGoogleCredential = (credential) => {
  const profile = decodeGoogleCredential(credential);
  const email   = profile.email?.trim().toLowerCase();

  if (!email) {
    throw new Error('Your Google account did not share an email address.');
  }

  const users = readUsers();
  let user    = users.find((u) => u.email === email);

  if (!user) {
    user = withDefaults({
      id:          profile.sub || crypto.randomUUID(),
      name:        profile.name || email.split('@')[0],
      email,
      password:    '',
      provider:    'google',
      photo:       profile.picture || '',
      bio:         '',
      age:         '',
      fitnessGoal: 'Build a consistent workout habit',
      googleId:    profile.sub || '',
      createdAt:   new Date().toISOString(),
    });
    users.push(user);
    writeUsers(users);
  } else {
    user = withDefaults({
      ...user,
      name:     user.name || profile.name || email.split('@')[0],
      provider: 'google',
      photo:    user.photo || profile.picture || '',
      googleId: profile.sub || user.googleId,
    });
    writeUsers(users.map((u) => (u.email === email ? user : u)));
  }

  logEvent('user_login', { email, role: user.role, provider: 'google' });
  return setCurrentUser(user);
};

// ─── Update current user ────────────────────────────────────────────────────

export const updateCurrentUser = (updates) => {
  const currentUser = getCurrentUser();
  if (!currentUser) return null;

  const updatedUser = { ...currentUser, ...updates };

  // Keep the users registry in sync (including isPro + paymentStatus)
  const users = readUsers().map((u) =>
    u.id === updatedUser.id ? { ...u, ...updates } : u
  );
  writeUsers(users);

  return setCurrentUser(updatedUser);
};

/**
 * Upgrades the current user's PRO status in both the session token
 * and the persistent users registry.
 *
 * @param {string} method – 'upi' | 'card'
 */
export const upgradeUserToPro = (method = 'mock') => {
  return updateCurrentUser({
    isPro:         true,
    paymentStatus: 'PAID',
    proGrantedAt:  new Date().toISOString(),
    proMethod:     method,
  });
};

// ─── Sign out ───────────────────────────────────────────────────────────────

export const signOut = () => {
  const user = getCurrentUser();
  if (user) {
    logEvent('user_logout', { email: user.email, role: user.role });
  }
  // Remove ONLY the active session token — all user data is preserved
  localStorage.removeItem(USER_KEY);
  window.google?.accounts?.id?.disableAutoSelect();
  window.dispatchEvent(new CustomEvent('fittrack_auth_updated', { detail: null }));
};

// ─── Internal session writer ────────────────────────────────────────────────

const setCurrentUser = (user) => {
  // Never persist the raw password in the session token
  const publicUser = withDefaults({ ...user, password: undefined });
  localStorage.setItem(USER_KEY, JSON.stringify(publicUser));

  // Trigger session restore (migrates legacy data, fires events)
  loadUserSession(publicUser.id);

  window.dispatchEvent(
    new CustomEvent('fittrack_auth_updated', { detail: publicUser })
  );
  return publicUser;
};
