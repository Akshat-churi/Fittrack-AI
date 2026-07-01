import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from '../utils/auth';
import { fetchPublicProfile, syncProfile } from '../utils/supabaseBridge';
import { getUserPoints, getUnlockedBadges } from '../utils/storage';
import { getWorkoutHistory } from '../utils/storage';
import { calculateStreaks } from '../utils/streakTracker';

/**
 * Unified profile state hook.
 * Loads the current user's profile from Supabase and keeps local stats in sync.
 *
 * Returns:
 *   profile     - Full Supabase profile object (merged with local data)
 *   loading     - boolean
 *   refetch     - function to reload the profile
 *   localStats  - { points, streaks, history, badges }
 */
const useProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const localUser = getCurrentUser();

  const localStats = {
    points: getUserPoints(),
    badges: getUnlockedBadges(),
    history: getWorkoutHistory(),
    streaks: calculateStreaks(getWorkoutHistory()),
  };

  const fetchProfile = useCallback(async () => {
    if (!localUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Sync local stats to Supabase first
      await syncProfile(localUser);

      // Then fetch enriched profile from Supabase
      const data = await fetchPublicProfile(localUser.id, localUser.id);
      setProfile(data);
    } catch (err) {
      console.error('[useProfile] fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [localUser?.id]);

  useEffect(() => {
    fetchProfile();

    // Re-fetch when auth changes
    const handler = () => fetchProfile();
    window.addEventListener('fittrack_auth_updated', handler);
    return () => window.removeEventListener('fittrack_auth_updated', handler);
  }, [fetchProfile]);

  return {
    profile,
    loading,
    refetch: fetchProfile,
    localStats,
    localUser,
  };
};

export default useProfile;
