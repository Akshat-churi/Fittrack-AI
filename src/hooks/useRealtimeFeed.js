import { useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';

/**
 * Subscribes to new posts in real-time and calls onNewPost when one arrives.
 * Returns an unsubscribe function.
 *
 * @param {string|null} userId - Current user ID (for filtering)
 * @param {Function} onNewPost - Callback receiving the enriched new post row
 * @param {string[]} feedUserIds - IDs of users whose posts should appear in feed
 */
const useRealtimeFeed = (userId, onNewPost, feedUserIds = []) => {
  const channelRef = useRef(null);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured()) return;

    // Clean up previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`realtime_feed_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
        },
        async (payload) => {
          const newPost = payload.new;

          // Only surface posts from users in the feed (self + following + friends)
          if (feedUserIds.length > 0 && !feedUserIds.includes(newPost.user_id)) {
            return;
          }

          // Fetch enriched post with profile + media
          try {
            const { data, error } = await supabase
              .from('posts')
              .select(`
                *,
                profiles!posts_user_id_fkey (id, username, display_name, photo, current_streak),
                post_media (id, media_url, media_type, display_order)
              `)
              .eq('id', newPost.id)
              .single();

            if (!error && data) {
              // Sort media
              const sortedMedia = (data.post_media || []).sort(
                (a, b) => a.display_order - b.display_order
              );
              onNewPost({
                ...data,
                post_media: sortedMedia,
                likesCount: 0,
                commentsCount: 0,
                isLiked: false,
                isSaved: false,
              });
            }
          } catch (err) {
            console.error('[useRealtimeFeed] fetch error', err);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, feedUserIds.join(',')]);
};

export default useRealtimeFeed;
