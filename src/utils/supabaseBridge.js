import { supabase, isSupabaseConfigured } from './supabaseClient';
import { calculateStreaks } from './streakTracker';
import { getUserPoints, getWorkoutHistory, getUnlockedBadges } from './storage';
import { getCurrentUser } from './auth';
import { logEvent } from './analytics';

// ---------------------------------------------------------------------------
// Guard: silently skip all operations if Supabase is not configured
// ---------------------------------------------------------------------------
const checkSupabase = () => {
  if (!isSupabaseConfigured()) {
    console.warn('[SupabaseBridge] Supabase is not configured. Operation skipped.');
    return false;
  }
  return true;
};

/**
 * Wraps a promise in a timeout to prevent unreachable hosts from blocking the UI.
 */
export const withTimeout = (promise, ms = 3500) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
    ),
  ]);

/**
 * Converts a File to a base64 data URL (used as fallback when storage buckets are unavailable).
 */
export const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/**
 * Local post storage fallback
 */
export const LOCAL_POSTS_KEY = 'fittrack_local_posts';
export const getLocalPosts = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_POSTS_KEY) || '[]');
  } catch {
    return [];
  }
};
export const saveLocalPosts = (posts) => {
  try {
    localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts));
  } catch (err) {
    console.warn('[saveLocalPosts] Failed:', err);
  }
};

/**
 * Local comments storage fallback
 */
export const LOCAL_COMMENTS_KEY = 'fittrack_local_comments';
export const getLocalComments = (postId) => {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_COMMENTS_KEY) || '{}');
    return all[postId] || [];
  } catch {
    return [];
  }
};
export const saveLocalComment = (postId, comment) => {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_COMMENTS_KEY) || '{}');
    if (!all[postId]) all[postId] = [];
    all[postId].push(comment);
    localStorage.setItem(LOCAL_COMMENTS_KEY, JSON.stringify(all));
  } catch (err) {
    console.warn('[saveLocalComment] Failed:', err);
  }
};

// ---------------------------------------------------------------------------
// STORAGE HELPERS
// ---------------------------------------------------------------------------

/**
 * Uploads a file to a Supabase Storage bucket and returns its public URL.
 * @param {string} bucket - Bucket name
 * @param {string} userId - User ID (used as folder prefix)
 * @param {File} file - The file to upload
 */
const uploadToStorage = async (bucket, userId, file) => {
  const ext = file.name.split('.').pop().toLowerCase();
  const uniqueName = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from(bucket)
    .upload(uniqueName, file, { cacheControl: '3600', upsert: true });

  if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(uniqueName);
  return data.publicUrl;
};

/**
 * Upload a profile photo and return the public URL.
 */
export const uploadProfilePhoto = async (userId, file) => {
  if (!checkSupabase()) return null;
  try {
    return await uploadToStorage('profile_photos', userId, file);
  } catch (err) {
    console.error('[uploadProfilePhoto]', err);
    return null;
  }
};

/**
 * Upload a cover photo and return the public URL.
 */
export const uploadCoverPhoto = async (userId, file) => {
  if (!checkSupabase()) return null;
  try {
    return await uploadToStorage('cover_photos', userId, file);
  } catch (err) {
    console.error('[uploadCoverPhoto]', err);
    return null;
  }
};

// ---------------------------------------------------------------------------
// PROFILES
// ---------------------------------------------------------------------------

/**
 * Syncs local profile data to Supabase (called on app load, workout end, profile save).
 */
export const syncProfile = async (localUser) => {
  if (!checkSupabase() || !localUser) return null;

  try {
    const history = getWorkoutHistory();
    const streakInfo = calculateStreaks(history);
    const calories = history.reduce((sum, s) => sum + (s.caloriesBurned ?? 0), 0);
    const badges = getUnlockedBadges();

    // Preserve existing username — don't overwrite if user set a custom one
    const { data: existing } = await supabase
      .from('profiles')
      .select('username, cover_photo')
      .eq('id', localUser.id)
      .maybeSingle();

    const fallbackUsername = (localUser.name || 'user')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 20) + '_' + localUser.id.slice(-4);

    const { error } = await supabase.from('profiles').upsert({
      id: localUser.id,
      username: existing?.username || fallbackUsername,
      display_name: localUser.name || 'Fit User',
      email: localUser.email || '',
      photo: localUser.photo || '',
      cover_photo: existing?.cover_photo || localUser.coverPhoto || '',
      bio: localUser.bio || '',
      fitness_goal: localUser.fitnessGoal || '',
      current_streak: streakInfo.currentStreak,
      longest_streak: streakInfo.longestStreak,
      reward_points: getUserPoints(),
      total_workouts: history.length,
      calories_burned: Math.round(calories * 10) / 10,
      badges: badges,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      // Silently ignore — Supabase tables may not be set up yet
      console.warn('[syncProfile] skipped:', error.message);
      return null;
    }
    return true;
  } catch (err) {
    // Fail silently — never show error toasts for background sync
    console.warn('[syncProfile] error:', err.message);
    return null;
  }
};

/**
 * Directly update specific Supabase profile fields (e.g. cover_photo URL, username).
 */
export const updateSupabaseProfile = async (userId, updates) => {
  if (!checkSupabase()) return false;
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[updateSupabaseProfile]', err);
    return false;
  }
};

/**
 * Check if a username is already taken (excluding the current user).
 */
export const isUsernameAvailable = async (username, currentUserId) => {
  if (!checkSupabase()) return true;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase().trim())
      .neq('id', currentUserId)
      .maybeSingle();

    return !data; // true = available
  } catch {
    return true;
  }
};

/**
 * Fetch a public user profile by ID, enriched with follow/friend status.
 */
export const fetchPublicProfile = async (userId, viewerId = null) => {
  if (!checkSupabase()) return null;
  try {
    const fetchProf = async () => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      const isSelf = viewerId && viewerId === userId;
      const results = await Promise.allSettled([
        viewerId && !isSelf ? checkIsFollowing(viewerId, userId) : Promise.resolve(false),
        viewerId && !isSelf ? getFriendRequestStatus(viewerId, userId) : Promise.resolve(null),
        supabase.from('followers').select('id', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('followers').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
        getFriendsList(userId),
      ]);

      return {
        ...profile,
        isFollowing: results[0].value || false,
        friendStatus: results[1].value || null,
        followersCount: results[2].value?.count || 0,
        followingCount: results[3].value?.count || 0,
        friends: results[4].value || [],
        friendsCount: (results[4].value || []).length,
      };
    };

    return await withTimeout(fetchProf(), 3500);
  } catch (err) {
    console.error('[fetchPublicProfile]', err);
    return null;
  }
};

/**
 * Search users by username or display name.
 */
export const searchUsers = async (query = '') => {
  if (!checkSupabase()) return [];
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(15);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[searchUsers]', err);
    return [];
  }
};

/**
 * Fetch top athletes by points (used as "trending" on empty search).
 */
export const fetchTrendingAthletes = async (limit = 10) => {
  if (!checkSupabase()) return [];
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('reward_points', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[fetchTrendingAthletes]', err);
    return [];
  }
};

// ---------------------------------------------------------------------------
// FOLLOW SYSTEM
// ---------------------------------------------------------------------------

export const followUser = async (followerId, followingId) => {
  if (!checkSupabase()) return false;
  try {
    const { error } = await supabase
      .from('followers')
      .insert({ follower_id: followerId, following_id: followingId });

    if (error) throw error;

    await sendNotification({ receiverId: followingId, senderId: followerId, type: 'follow' });
    return true;
  } catch (err) {
    console.error('[followUser]', err);
    return false;
  }
};

export const unfollowUser = async (followerId, followingId) => {
  if (!checkSupabase()) return false;
  try {
    const { error } = await supabase
      .from('followers')
      .delete()
      .match({ follower_id: followerId, following_id: followingId });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[unfollowUser]', err);
    return false;
  }
};

export const checkIsFollowing = async (followerId, followingId) => {
  if (!checkSupabase() || !followerId || !followingId) return false;
  try {
    const { data } = await supabase
      .from('followers')
      .select('id')
      .match({ follower_id: followerId, following_id: followingId })
      .maybeSingle();

    return !!data;
  } catch {
    return false;
  }
};

export const getFollowStats = async (userId) => {
  if (!checkSupabase()) return { followers: 0, following: 0 };
  try {
    const [frs, fns] = await Promise.all([
      supabase.from('followers').select('id', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('followers').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
    ]);
    return { followers: frs.count || 0, following: fns.count || 0 };
  } catch {
    return { followers: 0, following: 0 };
  }
};

// ---------------------------------------------------------------------------
// FRIEND SYSTEM
// ---------------------------------------------------------------------------

export const sendFriendRequest = async (senderId, receiverId) => {
  if (!checkSupabase()) return false;
  try {
    const { error } = await supabase
      .from('friend_requests')
      .upsert({ sender_id: senderId, receiver_id: receiverId, status: 'pending' });

    if (error) throw error;
    await sendNotification({ receiverId, senderId, type: 'friend_request' });
    return true;
  } catch (err) {
    console.error('[sendFriendRequest]', err);
    return false;
  }
};

export const getFriendRequestStatus = async (userId1, userId2) => {
  if (!checkSupabase() || !userId1 || !userId2) return null;
  try {
    // Check both directions
    const [r1, r2] = await Promise.all([
      supabase.from('friend_requests').select('*').match({ sender_id: userId1, receiver_id: userId2 }).maybeSingle(),
      supabase.from('friend_requests').select('*').match({ sender_id: userId2, receiver_id: userId1 }).maybeSingle(),
    ]);
    return r1.data || r2.data || null;
  } catch {
    return null;
  }
};

export const acceptFriendRequest = async (requestId, senderId, receiverId) => {
  if (!checkSupabase()) return false;
  try {
    const { error: reqErr } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (reqErr) throw reqErr;

    const u1 = senderId < receiverId ? senderId : receiverId;
    const u2 = senderId < receiverId ? receiverId : senderId;

    const { error: friendErr } = await supabase
      .from('friendships')
      .upsert({ user1_id: u1, user2_id: u2 });

    if (friendErr) throw friendErr;

    await sendNotification({ receiverId: senderId, senderId: receiverId, type: 'friend_accept' });
    return true;
  } catch (err) {
    console.error('[acceptFriendRequest]', err);
    return false;
  }
};

export const rejectFriendRequest = async (requestId) => {
  if (!checkSupabase()) return false;
  try {
    const { error } = await supabase.from('friend_requests').delete().eq('id', requestId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[rejectFriendRequest]', err);
    return false;
  }
};

/**
 * Cancel an outgoing pending friend request (sender cancels before acceptance).
 */
export const cancelFriendRequest = async (senderId, receiverId) => {
  if (!checkSupabase()) return false;
  try {
    const { error } = await supabase
      .from('friend_requests')
      .delete()
      .match({ sender_id: senderId, receiver_id: receiverId, status: 'pending' });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[cancelFriendRequest]', err);
    return false;
  }
};

/**
 * Get all incoming pending friend requests for a user (with sender profile).
 */
export const getIncomingFriendRequests = async (userId) => {
  if (!checkSupabase()) return [];
  try {
    const { data, error } = await supabase
      .from('friend_requests')
      .select(`
        *,
        sender:profiles!friend_requests_sender_id_fkey (id, username, display_name, photo)
      `)
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[getIncomingFriendRequests]', err);
    return [];
  }
};

export const removeFriend = async (userId1, userId2) => {
  if (!checkSupabase()) return false;
  try {
    const u1 = userId1 < userId2 ? userId1 : userId2;
    const u2 = userId1 < userId2 ? userId2 : userId1;

    await Promise.all([
      supabase.from('friendships').delete().match({ user1_id: u1, user2_id: u2 }),
      supabase.from('friend_requests').delete().match({ sender_id: userId1, receiver_id: userId2 }),
      supabase.from('friend_requests').delete().match({ sender_id: userId2, receiver_id: userId1 }),
    ]);
    return true;
  } catch (err) {
    console.error('[removeFriend]', err);
    return false;
  }
};

export const getFriendsList = async (userId) => {
  if (!checkSupabase()) return [];
  try {
    const { data, error } = await supabase
      .from('friendships')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    if (error) throw error;

    const friendIds = (data || []).map(f => f.user1_id === userId ? f.user2_id : f.user1_id);
    if (friendIds.length === 0) return [];

    const { data: friends, error: pErr } = await supabase
      .from('profiles')
      .select('*')
      .in('id', friendIds);

    if (pErr) throw pErr;
    return friends || [];
  } catch (err) {
    console.error('[getFriendsList]', err);
    return [];
  }
};

// ---------------------------------------------------------------------------
// POSTS
// ---------------------------------------------------------------------------

/**
 * Create a new post with optional media files.
 * Extracts hashtags from caption automatically.
 * Supports cloud Supabase storage + resilient local fallback.
 */
export const createPost = async ({ userId, caption = '', exerciseType, reps, caloriesBurned, duration, mediaFiles = [] }) => {
  const hashtags = (caption.match(/#\w+/g) || []).map(h => h.toLowerCase());
  const currentUser = getCurrentUser();

  // 1. Process media files: convert to base64 first as safe fallback
  let mediaRows = [];
  if (mediaFiles && mediaFiles.length > 0) {
    mediaRows = await Promise.all(
      Array.from(mediaFiles).map(async (file, idx) => {
        const type = file.type.startsWith('video/') ? 'video' : 'image';
        let url = '';
        try {
          url = await fileToBase64(file);
        } catch (e) {
          console.warn('[createPost] fileToBase64 fallback failed:', e);
        }
        return {
          id: `media_${Date.now()}_${idx}`,
          media_url: url,
          media_type: type,
          display_order: idx,
          file,
        };
      })
    );
  }

  let createdPost = null;

  // 2. Try Supabase if configured
  if (checkSupabase()) {
    try {
      if (currentUser && currentUser.id === userId) {
        await withTimeout(syncProfile(currentUser), 2000).catch(() => null);
      }

      const { data: post, error: postErr } = await withTimeout(
        supabase
          .from('posts')
          .insert({
            user_id: userId,
            caption,
            exercise_type: exerciseType || null,
            reps: reps || null,
            calories_burned: caloriesBurned || null,
            duration: duration ? String(duration) : null,
            hashtags,
          })
          .select()
          .single(),
        3500
      );

      if (postErr) throw postErr;
      createdPost = post;

      if (mediaRows.length > 0) {
        const uploadedMediaRows = await Promise.all(
          mediaRows.map(async (item, idx) => {
            let finalUrl = item.media_url;
            if (item.file) {
              try {
                finalUrl = await withTimeout(uploadToStorage('workout_media', userId, item.file), 3500);
              } catch (storageErr) {
                console.warn('[createPost] Storage upload failed, keeping base64 media:', storageErr.message);
              }
            }
            return {
              post_id: post.id,
              media_url: finalUrl,
              media_type: item.media_type,
              display_order: idx,
            };
          })
        );

        const { error: mediaErr } = await withTimeout(
          supabase.from('post_media').insert(uploadedMediaRows),
          3000
        ).catch(err => ({ error: err }));

        if (mediaErr) console.warn('[createPost] post_media insert error:', mediaErr.message);
        mediaRows = uploadedMediaRows;
      }

      // Check caption for @mentions and notify
      const mentions = caption.match(/@\w+/g) || [];
      if (mentions.length > 0) {
        const usernames = mentions.map(m => m.slice(1).toLowerCase());
        const { data: mentionedUsers } = await supabase
          .from('profiles')
          .select('id')
          .in('username', usernames);

        if (mentionedUsers) {
          await Promise.allSettled(
            mentionedUsers
              .filter(u => u.id !== userId)
              .map(u => sendNotification({ receiverId: u.id, senderId: userId, type: 'mention', postId: post.id }))
          );
        }
      }
    } catch (err) {
      console.warn('[createPost] Supabase creation skipped/failed, saved to local store:', err.message);
    }
  }

  // 3. Build rich final post object
  const history = getWorkoutHistory();
  const streakInfo = calculateStreaks(history);

  const finalPost = {
    id: createdPost?.id || `local_post_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    user_id: userId,
    caption,
    exercise_type: exerciseType || null,
    reps: reps || null,
    calories_burned: caloriesBurned || null,
    duration: duration ? String(duration) : null,
    hashtags,
    created_at: createdPost?.created_at || new Date().toISOString(),
    profiles: {
      id: currentUser?.id || userId,
      username: currentUser?.username || (currentUser?.name || 'athlete').toLowerCase().replace(/[^a-z0-9]/g, ''),
      display_name: currentUser?.name || 'Athlete',
      photo: currentUser?.photo || '',
      current_streak: streakInfo.currentStreak || 0,
    },
    post_media: mediaRows.map(({ post_id, media_url, media_type, display_order }) => ({
      post_id: post_id || (createdPost?.id || 'local'),
      media_url,
      media_type,
      display_order,
    })),
    likesCount: 0,
    commentsCount: 0,
    isLiked: false,
    isSaved: false,
  };

  // 4. Save to local storage cache so it appears immediately
  const existingLocalPosts = getLocalPosts();
  saveLocalPosts([finalPost, ...existingLocalPosts.filter(p => p.id !== finalPost.id)]);

  return finalPost;
};

/**
 * Delete a post (from local cache and Supabase).
 */
export const deletePost = async (postId, userId) => {
  const localPosts = getLocalPosts();
  saveLocalPosts(localPosts.filter(p => p.id !== postId));

  if (!checkSupabase()) return true;
  try {
    await withTimeout(
      supabase.from('posts').delete().match({ id: postId, user_id: userId }),
      3000
    );
    return true;
  } catch (err) {
    console.warn('[deletePost]', err);
    return true;
  }
};

// ---------------------------------------------------------------------------
// FEED
// ---------------------------------------------------------------------------

/**
 * Fetch social feed (posts from self, following, friends) with engagement data.
 */
export const fetchFeed = async (userId, limit = 8, offset = 0) => {
  const localPosts = getLocalPosts();

  if (!checkSupabase()) return localPosts.slice(offset, offset + limit);

  try {
    const fetchRemote = async () => {
      const [followingRes, friendsRes] = await Promise.all([
        supabase.from('followers').select('following_id').eq('follower_id', userId),
        supabase.from('friendships').select('user1_id, user2_id').or(`user1_id.eq.${userId},user2_id.eq.${userId}`),
      ]);

      const followingIds = (followingRes.data || []).map(f => f.following_id);
      const friendIds = (friendsRes.data || []).map(f =>
        f.user1_id === userId ? f.user2_id : f.user1_id
      );

      const feedUserIds = [...new Set([userId, ...followingIds, ...friendIds])];
      if (feedUserIds.length === 0) feedUserIds.push(userId);

      const { data: posts, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey (id, username, display_name, photo, current_streak),
          post_media (id, media_url, media_type, display_order)
        `)
        .in('user_id', feedUserIds)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return enrichPostsWithEngagement(posts || [], userId);
    };

    const remotePosts = await withTimeout(fetchRemote(), 3500);

    // Merge remote and local posts
    const combined = [...remotePosts];
    localPosts.forEach(lp => {
      if (!combined.some(cp => cp.id === lp.id)) {
        combined.push(lp);
      }
    });

    combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return combined.slice(offset, offset + limit);
  } catch (err) {
    console.warn('[fetchFeed] Remote failed, using local feed:', err.message);
    return localPosts.slice(offset, offset + limit);
  }
};

/**
 * Fetch all posts for a specific user's public profile.
 */
export const getUserPosts = async (profileId, viewerId = null) => {
  const localPosts = getLocalPosts().filter(p => p.user_id === profileId);

  if (!checkSupabase()) return localPosts;
  try {
    const fetchRemote = async () => {
      const { data: posts, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey (id, username, display_name, photo),
          post_media (id, media_url, media_type, display_order)
        `)
        .eq('user_id', profileId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return enrichPostsWithEngagement(posts || [], viewerId);
    };

    const remotePosts = await withTimeout(fetchRemote(), 3500);
    const combined = [...remotePosts];
    localPosts.forEach(lp => {
      if (!combined.some(cp => cp.id === lp.id)) {
        combined.push(lp);
      }
    });
    combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return combined;
  } catch (err) {
    console.warn('[getUserPosts]', err);
    return localPosts;
  }
};

/**
 * Enrich posts with like count, comment count, isLiked, isSaved.
 */
const enrichPostsWithEngagement = async (posts, viewerId) => {
  if (posts.length === 0) return [];

  return Promise.all(
    posts.map(async (post) => {
      const queries = [
        supabase.from('likes').select('id', { count: 'exact', head: true }).eq('post_id', post.id),
        supabase.from('comments').select('id', { count: 'exact', head: true }).eq('post_id', post.id),
      ];

      if (viewerId) {
        queries.push(
          supabase.from('likes').select('id').match({ post_id: post.id, user_id: viewerId }).maybeSingle(),
          supabase.from('saved_posts').select('id').match({ post_id: post.id, user_id: viewerId }).maybeSingle()
        );
      }

      const results = await Promise.allSettled(queries);

      // Sort media by display_order
      const sortedMedia = (post.post_media || []).sort((a, b) => a.display_order - b.display_order);

      // Fix: maybeSingle returns { data: row | null } — check data is not null
      const likeRow  = viewerId ? results[2]?.value?.data : null;
      const savedRow = viewerId ? results[3]?.value?.data : null;

      return {
        ...post,
        post_media: sortedMedia,
        likesCount: results[0].value?.count || 0,
        commentsCount: results[1].value?.count || 0,
        isLiked: likeRow !== null && likeRow !== undefined,
        isSaved: savedRow !== null && savedRow !== undefined,
      };
    })
  );
};

// ---------------------------------------------------------------------------
// LIKES
// ---------------------------------------------------------------------------

export const toggleLikePost = async (postId, userId, isLikedNow) => {
  logEvent('post_liked', { postId, isLiked: !isLikedNow });

  // Update in local storage
  const localPosts = getLocalPosts();
  saveLocalPosts(localPosts.map(p => p.id === postId ? {
    ...p,
    isLiked: !isLikedNow,
    likesCount: Math.max(0, (p.likesCount || 0) + (isLikedNow ? -1 : 1))
  } : p));

  if (!checkSupabase()) return true;
  try {
    if (isLikedNow) {
      await withTimeout(supabase.from('likes').delete().match({ post_id: postId, user_id: userId }), 3000);
    } else {
      await withTimeout(supabase.from('likes').insert({ post_id: postId, user_id: userId }), 3000);

      const { data: post } = await supabase.from('posts').select('user_id').eq('id', postId).single();
      if (post && post.user_id !== userId) {
        await sendNotification({ receiverId: post.user_id, senderId: userId, type: 'like', postId });
      }
    }
    return true;
  } catch (err) {
    console.warn('[toggleLikePost] Remote failed, local updated:', err);
    return true;
  }
};

// ---------------------------------------------------------------------------
// COMMENTS
// ---------------------------------------------------------------------------

export const fetchComments = async (postId) => {
  const localComments = getLocalComments(postId);
  if (!checkSupabase()) return localComments;
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('comments')
        .select(`
          *,
          profiles!comments_user_id_fkey (id, username, display_name, photo)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true }),
      3500
    );

    if (error) throw error;
    const combined = [...(data || [])];
    localComments.forEach(lc => {
      if (!combined.some(c => c.id === lc.id)) combined.push(lc);
    });
    return combined;
  } catch (err) {
    console.warn('[fetchComments] Returning local comments:', err);
    return localComments;
  }
};

export const addComment = async (postId, userId, text) => {
  if (!text.trim()) return null;
  const currentUser = getCurrentUser();

  const localComment = {
    id: `local_comment_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    post_id: postId,
    user_id: userId,
    comment_text: text.trim(),
    created_at: new Date().toISOString(),
    profiles: {
      id: currentUser?.id || userId,
      username: currentUser?.username || 'user',
      display_name: currentUser?.name || 'Athlete',
      photo: currentUser?.photo || '',
    },
  };

  saveLocalComment(postId, localComment);

  const localPosts = getLocalPosts();
  saveLocalPosts(localPosts.map(p => p.id === postId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p));

  if (!checkSupabase()) return localComment;
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('comments')
        .insert({ post_id: postId, user_id: userId, comment_text: text.trim() })
        .select(`
          *,
          profiles!comments_user_id_fkey (id, username, display_name, photo)
        `)
        .single(),
      3500
    );

    if (error) throw error;

    const { data: post } = await supabase.from('posts').select('user_id').eq('id', postId).single();
    if (post && post.user_id !== userId) {
      await sendNotification({ receiverId: post.user_id, senderId: userId, type: 'comment', postId, commentId: data.id });
    }

    return data;
  } catch (err) {
    console.warn('[addComment] Saved locally:', err);
    return localComment;
  }
};

export const editComment = async (commentId, userId, newText) => {
  if (!newText.trim()) return false;
  if (!checkSupabase()) return true;
  try {
    const { error } = await supabase
      .from('comments')
      .update({ comment_text: newText.trim(), edited_at: new Date().toISOString() })
      .match({ id: commentId, user_id: userId });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[editComment]', err);
    return true;
  }
};

export const deleteComment = async (commentId, userId) => {
  if (!checkSupabase()) return true;
  try {
    const { error } = await supabase
      .from('comments')
      .delete()
      .match({ id: commentId, user_id: userId });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[deleteComment]', err);
    return true;
  }
};

// ---------------------------------------------------------------------------
// SAVED POSTS
// ---------------------------------------------------------------------------

export const toggleSavePost = async (postId, userId, isSavedNow) => {
  const localPosts = getLocalPosts();
  saveLocalPosts(localPosts.map(p => p.id === postId ? { ...p, isSaved: !isSavedNow } : p));

  if (!checkSupabase()) return true;
  try {
    if (isSavedNow) {
      await withTimeout(supabase.from('saved_posts').delete().match({ post_id: postId, user_id: userId }), 3000);
    } else {
      await withTimeout(supabase.from('saved_posts').insert({ post_id: postId, user_id: userId }), 3000);
    }
    return true;
  } catch (err) {
    console.warn('[toggleSavePost] Local updated:', err);
    return true;
  }
};

export const fetchSavedPosts = async (userId) => {
  if (!checkSupabase()) return [];
  try {
    const { data: saved, error: savedErr } = await supabase
      .from('saved_posts')
      .select('post_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (savedErr) throw savedErr;

    const postIds = (saved || []).map(s => s.post_id);
    if (postIds.length === 0) return [];

    const { data: posts, error: postsErr } = await supabase
      .from('posts')
      .select(`
        *,
        profiles!posts_user_id_fkey (id, username, display_name, photo),
        post_media (id, media_url, media_type, display_order)
      `)
      .in('id', postIds)
      .order('created_at', { ascending: false });

    if (postsErr) throw postsErr;

    return (posts || []).map(post => {
      const sortedMedia = (post.post_media || []).sort((a, b) => a.display_order - b.display_order);
      return { ...post, post_media: sortedMedia, isSaved: true, isLiked: false, likesCount: 0, commentsCount: 0 };
    });
  } catch (err) {
    console.error('[fetchSavedPosts]', err);
    return [];
  }
};

// ---------------------------------------------------------------------------
// STORIES
// ---------------------------------------------------------------------------

/**
 * Local story storage key.
 */
const LOCAL_STORIES_KEY = 'fittrack_local_stories';

const getLocalStories = () => {
  try { return JSON.parse(localStorage.getItem(LOCAL_STORIES_KEY) || '[]'); } catch { return []; }
};
const saveLocalStories = (stories) => {
  localStorage.setItem(LOCAL_STORIES_KEY, JSON.stringify(stories));
};

export const createStory = async (userId, file, textOverlay = '', emojiOverlay = '', backgroundColor = '#1a1a2e') => {
  const type = file.type.startsWith('video/') ? 'video' : 'image';

  // --- Try Supabase first ---
  if (checkSupabase()) {
    try {
      const url = await uploadToStorage('stories_media', userId, file);

      const { data, error } = await supabase
        .from('stories')
        .insert({
          user_id: userId,
          media_url: url,
          media_type: type,
          text_overlay: textOverlay,
          emoji_overlay: emojiOverlay,
          background_color: backgroundColor,
        })
        .select()
        .single();

      if (!error && data) return data;
      // If Supabase insert failed, fall through to local
      console.warn('[createStory] Supabase insert failed, using local fallback:', error?.message);
    } catch (err) {
      console.warn('[createStory] Supabase upload failed, using local fallback:', err.message);
    }
  }

  // --- Local fallback: store as base64 ---
  try {
    const base64Url = await fileToBase64(file);
    const currentUser = getCurrentUser();
    const story = {
      id: `local_story_${Date.now()}`,
      user_id: userId,
      media_url: base64Url,
      media_type: type,
      text_overlay: textOverlay,
      emoji_overlay: emojiOverlay,
      background_color: backgroundColor,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      profiles: {
        id: userId,
        display_name: currentUser?.name || 'You',
        username: currentUser?.username || '',
        photo: currentUser?.photo || '',
      },
    };

    const all = getLocalStories().filter(s => new Date(s.expires_at) > new Date()); // prune expired
    all.unshift(story);
    saveLocalStories(all);
    return story;
  } catch (err) {
    console.error('[createStory] Local fallback also failed:', err);
    return null;
  }
};

export const fetchStoriesFeed = async (userId) => {
  // Always load local stories first
  const localStories = getLocalStories().filter(s => new Date(s.expires_at) > new Date());

  if (!checkSupabase()) {
    // Return local-only stories grouped by user
    const grouped = {};
    localStories.forEach(story => {
      const u = story.profiles;
      if (!u) return;
      if (!grouped[u.id]) grouped[u.id] = { user: u, stories: [] };
      grouped[u.id].stories.push(story);
    });
    return Object.values(grouped);
  }

  try {
    const [followingRes, friendsRes] = await Promise.all([
      supabase.from('followers').select('following_id').eq('follower_id', userId),
      supabase.from('friendships').select('user1_id, user2_id').or(`user1_id.eq.${userId},user2_id.eq.${userId}`),
    ]);

    const followingIds = (followingRes.data || []).map(f => f.following_id);
    const friendIds = (friendsRes.data || []).map(f =>
      f.user1_id === userId ? f.user2_id : f.user1_id
    );

    const storyUserIds = [...new Set([userId, ...followingIds, ...friendIds])];
    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from('stories')
      .select(`
        *,
        profiles!stories_user_id_fkey (id, username, display_name, photo)
      `)
      .in('user_id', storyUserIds)
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Combine Supabase stories with local stories
    const allStories = [...localStories, ...(data || [])];
    const grouped = {};
    allStories.forEach(story => {
      const u = story.profiles;
      if (!u) return;
      if (!grouped[u.id]) grouped[u.id] = { user: u, stories: [] };
      // Avoid duplicates
      if (!grouped[u.id].stories.find(s => s.id === story.id)) {
        grouped[u.id].stories.push(story);
      }
    });

    return Object.values(grouped);
  } catch (err) {
    console.error('[fetchStoriesFeed]', err);
    // Fall back to local stories on error
    const grouped = {};
    localStories.forEach(story => {
      const u = story.profiles;
      if (!u) return;
      if (!grouped[u.id]) grouped[u.id] = { user: u, stories: [] };
      grouped[u.id].stories.push(story);
    });
    return Object.values(grouped);
  }
};

// ---------------------------------------------------------------------------
// MESSAGES
// ---------------------------------------------------------------------------

export const fetchMessages = async (userId, partnerId) => {
  if (!checkSupabase()) return [];
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`
      )
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[fetchMessages]', err);
    return [];
  }
};

export const sendMessage = async ({ senderId, receiverId, text = '', sharedPostId = null, sharedProgress = null, challengeInvite = null }) => {
  if (!checkSupabase()) return null;
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        message_text: text,
        shared_post_id: sharedPostId || null,
        shared_progress: sharedProgress || null,
        challenge_invite: challengeInvite || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[sendMessage]', err);
    return null;
  }
};

export const markMessagesRead = async (senderId, receiverId) => {
  if (!checkSupabase()) return;
  try {
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .match({ sender_id: senderId, receiver_id: receiverId })
      .is('read_at', null);
  } catch (err) {
    console.error('[markMessagesRead]', err);
  }
};

export const getUnreadMessageCount = async (userId, partnerId) => {
  if (!checkSupabase()) return 0;
  try {
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .match({ sender_id: partnerId, receiver_id: userId })
      .is('read_at', null);
    return count || 0;
  } catch {
    return 0;
  }
};

// ---------------------------------------------------------------------------
// NOTIFICATIONS
// ---------------------------------------------------------------------------

/**
 * Internal helper — creates a notification row. Never notifies self.
 */
const sendNotification = async ({ receiverId, senderId, type, postId = null, commentId = null }) => {
  if (!receiverId || !senderId || receiverId === senderId) return;
  try {
    await supabase.from('notifications').insert({
      receiver_id: receiverId,
      sender_id: senderId,
      type,
      post_id: postId || null,
      comment_id: commentId || null,
    });
  } catch (err) {
    console.error('[sendNotification]', err);
  }
};

export const fetchNotifications = async (userId) => {
  if (!checkSupabase()) return [];
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        sender:profiles!notifications_sender_id_fkey (id, username, display_name, photo)
      `)
      .eq('receiver_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[fetchNotifications]', err);
    return [];
  }
};

export const markNotificationRead = async (notificationId) => {
  if (!checkSupabase()) return;
  try {
    await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
  } catch (err) {
    console.error('[markNotificationRead]', err);
  }
};

export const markAllNotificationsRead = async (userId) => {
  if (!checkSupabase()) return;
  try {
    await supabase.from('notifications').update({ read: true }).eq('receiver_id', userId);
  } catch (err) {
    console.error('[markAllNotificationsRead]', err);
  }
};

/**
 * Delete a single notification by ID.
 */
export const deleteNotification = async (notificationId) => {
  if (!checkSupabase()) return false;
  try {
    const { error } = await supabase.from('notifications').delete().eq('id', notificationId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[deleteNotification]', err);
    return false;
  }
};

/**
 * Delete all notifications for a user.
 */
export const deleteAllNotifications = async (userId) => {
  if (!checkSupabase()) return false;
  try {
    const { error } = await supabase.from('notifications').delete().eq('receiver_id', userId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[deleteAllNotifications]', err);
    return false;
  }
};

// ---------------------------------------------------------------------------
// SQUAD SYNC — persists squad data to Supabase so all devices share the same squads
// ---------------------------------------------------------------------------

/**
 * Upsert a full squad object into Supabase.
 * Schema expected:
 *   squads(id text PK, code text UNIQUE, name text, emoji text,
 *          leader_id text, members jsonb, goals jsonb,
 *          challenges jsonb, created_at timestamptz, updated_at timestamptz)
 */
export const upsertSquadToSupabase = async (squad) => {
  if (!checkSupabase() || !squad?.id) return false;
  try {
    const { error } = await supabase.from('squads').upsert({
      id:         squad.id,
      code:       squad.code,
      name:       squad.name,
      emoji:      squad.emoji,
      leader_id:  squad.leaderId,
      members:    squad.members,
      goals:      squad.goals || [],
      challenges: squad.challenges || [],
      created_at: squad.createdAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[upsertSquadToSupabase]', err);
    return false;
  }
};

/**
 * Fetch all squads from Supabase and return them in the local squad shape.
 * Returns null when Supabase is not configured.
 */
export const fetchAllSquadsFromSupabase = async () => {
  if (!checkSupabase()) return null;
  try {
    const { data, error } = await supabase
      .from('squads')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(row => ({
      id:         row.id,
      code:       row.code,
      name:       row.name,
      emoji:      row.emoji,
      leaderId:   row.leader_id,
      members:    row.members || [],
      goals:      row.goals || [],
      challenges: row.challenges || [],
      createdAt:  row.created_at,
    }));
  } catch (err) {
    console.error('[fetchAllSquadsFromSupabase]', err);
    return null;
  }
};

/**
 * Fetch a single squad by its invite code from Supabase (case-insensitive).
 * Returns null if not found or on error.
 */
export const fetchSquadByCodeFromSupabase = async (code) => {
  if (!checkSupabase() || !code) return null;
  try {
    const { data, error } = await supabase
      .from('squads')
      .select('*')
      .ilike('code', code.trim())
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id:         data.id,
      code:       data.code,
      name:       data.name,
      emoji:      data.emoji,
      leaderId:   data.leader_id,
      members:    data.members || [],
      goals:      data.goals || [],
      challenges: data.challenges || [],
      createdAt:  data.created_at,
    };
  } catch (err) {
    console.error('[fetchSquadByCodeFromSupabase]', err);
    return null;
  }
};

/**
 * Delete a squad from Supabase by ID.
 */
export const deleteSquadFromSupabase = async (squadId) => {
  if (!checkSupabase() || !squadId) return false;
  try {
    const { error } = await supabase.from('squads').delete().eq('id', squadId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[deleteSquadFromSupabase]', err);
    return false;
  }
};
// SQUAD INVITATIONS
// ---------------------------------------------------------------------------

/**
 * Send a squad invitation to a user.
 * Inserts into squad_invitations and fires an in-app notification.
 *
 * @param {{ squadId, squadName, squadEmoji, senderId, receiverId }} param
 * @returns {boolean}
 */
export const sendSquadInvite = async ({ squadId, squadName, squadEmoji, senderId, receiverId }) => {
  if (!checkSupabase()) return false;
  if (!squadId || !senderId || !receiverId) return false;
  if (senderId === receiverId) return false;

  try {
    // Prevent duplicate pending invite
    const { data: existing } = await supabase
      .from('squad_invitations')
      .select('id, status')
      .match({ squad_id: squadId, receiver_id: receiverId })
      .maybeSingle();

    if (existing && existing.status === 'pending') {
      console.warn('[sendSquadInvite] Invite already pending for this user.');
      return false;
    }

    // Upsert (re-send if previously declined/expired)
    const { error } = await supabase
      .from('squad_invitations')
      .upsert({
        squad_id:    squadId,
        squad_name:  squadName,
        squad_emoji: squadEmoji || '💪',
        sender_id:   senderId,
        receiver_id: receiverId,
        status:      'pending',
        created_at:  new Date().toISOString(),
      }, { onConflict: 'squad_id,receiver_id' });

    if (error) throw error;

    // Fire in-app notification
    await supabase.from('notifications').insert({
      receiver_id: receiverId,
      sender_id:   senderId,
      type:        'squad_invite',
      post_id:     null,
      comment_id:  null,
      extra_data:  JSON.stringify({ squadId, squadName, squadEmoji }),
    });

    console.log('[sendSquadInvite] Invite sent to', receiverId, 'for squad', squadName);
    return true;
  } catch (err) {
    console.error('[sendSquadInvite]', err);
    return false;
  }
};

/**
 * Fetch all pending squad invitations for a user.
 * @param {string} userId
 * @returns {Array}
 */
export const fetchSquadInvitations = async (userId) => {
  if (!checkSupabase()) return [];
  try {
    const { data, error } = await supabase
      .from('squad_invitations')
      .select(`
        *,
        sender:profiles!squad_invitations_sender_id_fkey (id, username, display_name, photo)
      `)
      .eq('receiver_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[fetchSquadInvitations]', err);
    return [];
  }
};

/**
 * Accept or decline a squad invitation.
 * @param {string} inviteId
 * @param {'accepted'|'declined'} status
 * @returns {boolean}
 */
export const respondSquadInvitation = async (inviteId, status) => {
  if (!checkSupabase()) return false;
  try {
    const { error } = await supabase
      .from('squad_invitations')
      .update({ status, responded_at: new Date().toISOString() })
      .eq('id', inviteId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[respondSquadInvitation]', err);
    return false;
  }
};

/**
 * Check which users from a list already have a pending invite to a squad.
 * Returns a Set of receiver_id strings.
 * @param {string} squadId
 * @param {string[]} userIds
 * @returns {Set<string>}
 */
export const getPendingInvitesForSquad = async (squadId, userIds) => {
  if (!checkSupabase() || !userIds.length) return new Set();
  try {
    const { data } = await supabase
      .from('squad_invitations')
      .select('receiver_id')
      .eq('squad_id', squadId)
      .eq('status', 'pending')
      .in('receiver_id', userIds);

    return new Set((data || []).map(r => r.receiver_id));
  } catch {
    return new Set();
  }
};

const METRIC_COLUMN_MAP = {
  points: 'reward_points',
  calories: 'calories_burned',
  streak: 'current_streak',
  workouts: 'total_workouts',
};

/**
 * Global / Weekly / Monthly leaderboard.
 */
export const getLeaderboardData = async (metric = 'points', period = 'global') => {
  const localFallback = () => {
    const currentUser = getCurrentUser();
    if (!currentUser) return [];
    const history = getWorkoutHistory();
    const streakInfo = calculateStreaks(history);
    const calories = history.reduce((sum, s) => sum + (s.caloriesBurned ?? 0), 0);
    return [{
      id: currentUser.id,
      username: currentUser.username || (currentUser.name || 'athlete').toLowerCase().replace(/[^a-z0-9]/g, ''),
      display_name: currentUser.name || 'Athlete',
      photo: currentUser.photo || '',
      reward_points: getUserPoints(),
      calories_burned: Math.round(calories * 10) / 10,
      total_workouts: history.length,
      current_streak: streakInfo.currentStreak,
      updated_at: new Date().toISOString(),
    }];
  };

  if (!checkSupabase()) return localFallback();

  try {
    const orderCol = METRIC_COLUMN_MAP[metric] || 'reward_points';

    let query = supabase
      .from('profiles')
      .select('id, username, display_name, photo, reward_points, calories_burned, total_workouts, current_streak, updated_at')
      .order(orderCol, { ascending: false })
      .limit(50);

    // Period filtering on updated_at (profiles are updated after every workout)
    if (period === 'weekly') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      query = query.gt('updated_at', cutoff.toISOString());
    } else if (period === 'monthly') {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 1);
      query = query.gt('updated_at', cutoff.toISOString());
    }

    const { data, error } = await withTimeout(query, 3500);
    if (error) throw error;
    return (data && data.length > 0) ? data : localFallback();
  } catch (err) {
    console.warn('[getLeaderboardData] Using local leaderboard:', err.message);
    return localFallback();
  }
};

/**
 * Friends-only leaderboard.
 */
export const getFriendsLeaderboard = async (userId, metric = 'points') => {
  if (!checkSupabase()) return [];
  try {
    const friends = await getFriendsList(userId);
    const friendIds = friends.map(f => f.id);

    if (friendIds.length === 0) return [];

    const orderCol = METRIC_COLUMN_MAP[metric] || 'reward_points';

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('id', [userId, ...friendIds])
      .order(orderCol, { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[getFriendsLeaderboard]', err);
    return [];
  }
};

// ---------------------------------------------------------------------------
// PERSONAL RECORDS
// ---------------------------------------------------------------------------

/**
 * Fetch personal records for a user (stored in profiles.personal_records JSONB).
 */
export const fetchUserPersonalRecords = async (userId) => {
  if (!checkSupabase()) return {};
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('personal_records')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data?.personal_records || {};
  } catch (err) {
    console.error('[fetchUserPersonalRecords]', err);
    return {};
  }
};

/**
 * Update a specific personal record field.
 * @param {string} userId
 * @param {string} key - e.g. 'pushups', 'squats', 'plank_seconds'
 * @param {number} value - The new best value
 */
export const updatePersonalRecord = async (userId, key, value) => {
  if (!checkSupabase()) return false;
  try {
    // Read current records first
    const current = await fetchUserPersonalRecords(userId);
    const currentBest = current[key] ?? 0;

    // Only update if this is a new personal best
    if (value <= currentBest) return false;

    const updated = { ...current, [key]: value };
    const { error } = await supabase
      .from('profiles')
      .update({ personal_records: updated, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;
    return true; // New PB!
  } catch (err) {
    console.error('[updatePersonalRecord]', err);
    return false;
  }
};

/**
 * Batch-update personal records from a completed workout session.
 * @param {string} userId
 * @param {{ exercise: string, reps: number, caloriesBurned: number, duration: number }} session
 */
export const syncPersonalRecordsFromSession = async (userId, session) => {
  if (!checkSupabase() || !userId || !session) return;
  try {
    const current = await fetchUserPersonalRecords(userId);
    const updates = { ...current };
    let changed = false;

    if (session.exercise && session.reps) {
      const key = session.exercise.toLowerCase().replace(/\s+/g, '_') + '_max_reps';
      if ((session.reps || 0) > (current[key] || 0)) {
        updates[key] = session.reps;
        changed = true;
      }
    }
    if (session.caloriesBurned && (session.caloriesBurned > (current.best_session_calories || 0))) {
      updates.best_session_calories = Math.round(session.caloriesBurned * 10) / 10;
      changed = true;
    }
    if (session.duration && (session.duration > (current.longest_session_seconds || 0))) {
      updates.longest_session_seconds = session.duration;
      changed = true;
    }

    if (changed) {
      await supabase
        .from('profiles')
        .update({ personal_records: updates, updated_at: new Date().toISOString() })
        .eq('id', userId);
    }
  } catch (err) {
    console.error('[syncPersonalRecordsFromSession]', err);
  }
};

// ---------------------------------------------------------------------------
// STORY VIEWS
// ---------------------------------------------------------------------------

/**
 * Record that a user has viewed a story.
 */
export const recordStoryView = async (storyId, viewerId) => {
  if (!checkSupabase() || !storyId || !viewerId) return;
  try {
    await supabase
      .from('story_views')
      .upsert({ story_id: storyId, viewer_id: viewerId })
      .select();
  } catch (err) {
    console.error('[recordStoryView]', err);
  }
};

/**
 * Get viewer count for a story (owner only use-case).
 */
export const getStoryViewCount = async (storyId) => {
  if (!checkSupabase()) return 0;
  try {
    const { count } = await supabase
      .from('story_views')
      .select('id', { count: 'exact', head: true })
      .eq('story_id', storyId);
    return count || 0;
  } catch {
    return 0;
  }
};

/**
 * Delete a story by ID (owner only enforced at app level).
 */
export const deleteStory = async (storyId, userId) => {
  if (!checkSupabase()) return false;
  try {
    const { error } = await supabase
      .from('stories')
      .delete()
      .match({ id: storyId, user_id: userId });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[deleteStory]', err);
    return false;
  }
};

// ---------------------------------------------------------------------------
// CONVERSATIONS LIST (for Messages sidebar)
// ---------------------------------------------------------------------------

/**
 * Get the most recent message per conversation for the messages sidebar.
 */
export const getConversationsList = async (userId) => {
  if (!checkSupabase()) return [];
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    // Deduplicate to one row per partner
    const seen = new Set();
    const conversations = [];
    for (const msg of data || []) {
      const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      if (!seen.has(partnerId)) {
        seen.add(partnerId);
        conversations.push({ ...msg, partnerId });
      }
    }
    return conversations;
  } catch (err) {
    console.error('[getConversationsList]', err);
    return [];
  }
};
