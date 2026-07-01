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

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[syncProfile]', err);
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
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    const results = await Promise.allSettled([
      viewerId ? checkIsFollowing(viewerId, userId) : Promise.resolve(false),
      viewerId ? getFriendRequestStatus(viewerId, userId) : Promise.resolve(null),
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
 */
export const createPost = async ({ userId, caption = '', exerciseType, reps, caloriesBurned, duration, mediaFiles = [] }) => {
  if (!checkSupabase()) return null;

  try {
    // Extract hashtags from caption
    const hashtags = (caption.match(/#\w+/g) || []).map(h => h.toLowerCase());

    const { data: post, error: postErr } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        caption,
        exercise_type: exerciseType || null,
        reps: reps || null,
        calories_burned: caloriesBurned || null,
        duration: duration || null,
        hashtags,
      })
      .select()
      .single();

    if (postErr) throw postErr;

    // Upload media files if any
    if (mediaFiles && mediaFiles.length > 0) {
      const mediaRows = await Promise.all(
        Array.from(mediaFiles).map(async (file, idx) => {
          const type = file.type.startsWith('video/') ? 'video' : 'image';
          const url = await uploadToStorage('workout_media', userId, file);
          return { post_id: post.id, media_url: url, media_type: type, display_order: idx };
        })
      );

      const { error: mediaErr } = await supabase.from('post_media').insert(mediaRows);
      if (mediaErr) throw mediaErr;
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
        await Promise.all(
          mentionedUsers
            .filter(u => u.id !== userId)
            .map(u => sendNotification({ receiverId: u.id, senderId: userId, type: 'mention', postId: post.id }))
        );
      }
    }

    return post;
  } catch (err) {
    console.error('[createPost]', err);
    return null;
  }
};

/**
 * Delete a post (only if owned by user).
 */
export const deletePost = async (postId, userId) => {
  if (!checkSupabase()) return false;
  try {
    const { error } = await supabase
      .from('posts')
      .delete()
      .match({ id: postId, user_id: userId });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[deletePost]', err);
    return false;
  }
};

// ---------------------------------------------------------------------------
// FEED
// ---------------------------------------------------------------------------

/**
 * Fetch social feed (posts from self, following, friends) with engagement data.
 */
export const fetchFeed = async (userId, limit = 8, offset = 0) => {
  if (!checkSupabase()) return [];

  try {
    const [followingRes, friendsRes] = await Promise.all([
      supabase.from('followers').select('following_id').eq('follower_id', userId),
      supabase.from('friendships').select('user1_id, user2_id').or(`user1_id.eq.${userId},user2_id.eq.${userId}`),
    ]);

    const followingIds = (followingRes.data || []).map(f => f.following_id);
    const friendIds = (friendsRes.data || []).map(f =>
      f.user1_id === userId ? f.user2_id : f.user1_id
    );

    const feedUserIds = [...new Set([userId, ...followingIds, ...friendIds])];

    // Guard: Supabase .in() with empty array returns an error — always include self
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
  } catch (err) {
    console.error('[fetchFeed]', err);
    return [];
  }
};

/**
 * Fetch all posts for a specific user's public profile.
 */
export const getUserPosts = async (profileId, viewerId = null) => {
  if (!checkSupabase()) return [];
  try {
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
  } catch (err) {
    console.error('[getUserPosts]', err);
    return [];
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
  if (!checkSupabase()) return false;
  try {
    if (isLikedNow) {
      await supabase.from('likes').delete().match({ post_id: postId, user_id: userId });
    } else {
      await supabase.from('likes').insert({ post_id: postId, user_id: userId });

      const { data: post } = await supabase.from('posts').select('user_id').eq('id', postId).single();
      if (post && post.user_id !== userId) {
        await sendNotification({ receiverId: post.user_id, senderId: userId, type: 'like', postId });
      }
    }
    return true;
  } catch (err) {
    console.error('[toggleLikePost]', err);
    return false;
  }
};

// ---------------------------------------------------------------------------
// COMMENTS
// ---------------------------------------------------------------------------

export const fetchComments = async (postId) => {
  if (!checkSupabase()) return [];
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles!comments_user_id_fkey (id, username, display_name, photo)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[fetchComments]', err);
    return [];
  }
};

export const addComment = async (postId, userId, text) => {
  if (!checkSupabase() || !text.trim()) return null;
  try {
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: userId, comment_text: text.trim() })
      .select(`
        *,
        profiles!comments_user_id_fkey (id, username, display_name, photo)
      `)
      .single();

    if (error) throw error;

    const { data: post } = await supabase.from('posts').select('user_id').eq('id', postId).single();
    if (post && post.user_id !== userId) {
      await sendNotification({ receiverId: post.user_id, senderId: userId, type: 'comment', postId, commentId: data.id });
    }

    return data;
  } catch (err) {
    console.error('[addComment]', err);
    return null;
  }
};

export const editComment = async (commentId, userId, newText) => {
  if (!checkSupabase() || !newText.trim()) return false;
  try {
    const { error } = await supabase
      .from('comments')
      .update({ comment_text: newText.trim(), edited_at: new Date().toISOString() })
      .match({ id: commentId, user_id: userId });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[editComment]', err);
    return false;
  }
};

export const deleteComment = async (commentId, userId) => {
  if (!checkSupabase()) return false;
  try {
    const { error } = await supabase
      .from('comments')
      .delete()
      .match({ id: commentId, user_id: userId });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[deleteComment]', err);
    return false;
  }
};

// ---------------------------------------------------------------------------
// SAVED POSTS
// ---------------------------------------------------------------------------

export const toggleSavePost = async (postId, userId, isSavedNow) => {
  if (!checkSupabase()) return false;
  try {
    if (isSavedNow) {
      await supabase.from('saved_posts').delete().match({ post_id: postId, user_id: userId });
    } else {
      await supabase.from('saved_posts').insert({ post_id: postId, user_id: userId });
    }
    return true;
  } catch (err) {
    console.error('[toggleSavePost]', err);
    return false;
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

export const createStory = async (userId, file, textOverlay = '', emojiOverlay = '', backgroundColor = '#1a1a2e') => {
  if (!checkSupabase()) return null;
  try {
    const type = file.type.startsWith('video/') ? 'video' : 'image';
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

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[createStory]', err);
    return null;
  }
};

export const fetchStoriesFeed = async (userId) => {
  if (!checkSupabase()) return [];
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

    // Group by user
    const grouped = {};
    (data || []).forEach(story => {
      const u = story.profiles;
      if (!u) return;
      if (!grouped[u.id]) grouped[u.id] = { user: u, stories: [] };
      grouped[u.id].stories.push(story);
    });

    return Object.values(grouped);
  } catch (err) {
    console.error('[fetchStoriesFeed]', err);
    return [];
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
// LEADERBOARDS
// ---------------------------------------------------------------------------

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
  if (!checkSupabase()) return [];
  try {
    const orderCol = METRIC_COLUMN_MAP[metric] || 'reward_points';

    let query = supabase
      .from('profiles')
      .select('*')
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

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[getLeaderboardData]', err);
    return [];
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
