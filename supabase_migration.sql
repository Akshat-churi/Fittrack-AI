-- ============================================================================
-- FitTrack AI — Complete Supabase Social Platform Migration
-- Paste this ENTIRE file into: Supabase Dashboard → SQL Editor → Run
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id              TEXT PRIMARY KEY,
  username        TEXT UNIQUE,
  display_name    TEXT,
  email           TEXT,
  photo           TEXT DEFAULT '',
  cover_photo     TEXT DEFAULT '',
  bio             TEXT DEFAULT '',
  fitness_goal    TEXT DEFAULT '',
  current_streak  INTEGER DEFAULT 0,
  longest_streak  INTEGER DEFAULT 0,
  reward_points   INTEGER DEFAULT 0,
  total_workouts  INTEGER DEFAULT 0,
  calories_burned NUMERIC(10,1) DEFAULT 0,
  badges          JSONB DEFAULT '[]'::jsonb,
  personal_records JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);
CREATE INDEX IF NOT EXISTS idx_profiles_reward_points ON public.profiles (reward_points DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON public.profiles (display_name);

-- ============================================================================
-- 2. FOLLOWERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.followers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id  TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_followers_follower ON public.followers (follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following ON public.followers (following_id);

-- ============================================================================
-- 3. FRIEND REQUESTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (sender_id, receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_req_receiver ON public.friend_requests (receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_req_sender ON public.friend_requests (sender_id);

-- ============================================================================
-- 4. FRIENDSHIPS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.friendships (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id  TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id  TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user1_id, user2_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON public.friendships (user1_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON public.friendships (user2_id);

-- ============================================================================
-- 5. POSTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  caption         TEXT DEFAULT '',
  exercise_type   TEXT,
  reps            INTEGER,
  calories_burned NUMERIC(8,1),
  duration        INTEGER,
  hashtags        TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts (user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_hashtags ON public.posts USING GIN (hashtags);

-- ============================================================================
-- 6. POST MEDIA
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.post_media (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  media_url     TEXT NOT NULL,
  media_type    TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  display_order INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_media_post ON public.post_media (post_id);

-- ============================================================================
-- 7. LIKES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.likes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_post ON public.likes (post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON public.likes (user_id);

-- ============================================================================
-- 8. COMMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  edited_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON public.comments (post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON public.comments (user_id);

-- ============================================================================
-- 9. SAVED POSTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.saved_posts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_posts_user ON public.saved_posts (user_id);

-- ============================================================================
-- 10. STORIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stories (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_url        TEXT NOT NULL,
  media_type       TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  text_overlay     TEXT DEFAULT '',
  emoji_overlay    TEXT DEFAULT '',
  background_color TEXT DEFAULT '#1a1a2e',
  expires_at       TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stories_user ON public.stories (user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires ON public.stories (expires_at);

-- ============================================================================
-- 11. STORY VIEWS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.story_views (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id   UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id  TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (story_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS idx_story_views_story ON public.story_views (story_id);

-- ============================================================================
-- 12. MESSAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id        TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id      TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_text     TEXT DEFAULT '',
  shared_post_id   UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  shared_progress  JSONB,
  challenge_invite JSONB,
  read_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages (receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages (receiver_id, read_at) WHERE read_at IS NULL;

-- ============================================================================
-- 13. NOTIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receiver_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id   TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  type        TEXT NOT NULL CHECK (type IN ('follow', 'friend_request', 'friend_accept', 'like', 'comment', 'mention', 'challenge')),
  post_id     UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id  UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  read        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_receiver ON public.notifications (receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications (receiver_id, read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications (created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY — Permissive for anon role
-- Compatible with localStorage-based auth (no Supabase Auth UIDs needed)
-- ============================================================================
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_media      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_posts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications   ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE TO anon, authenticated USING (true);

-- followers
CREATE POLICY "followers_select" ON public.followers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "followers_insert" ON public.followers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "followers_delete" ON public.followers FOR DELETE TO anon, authenticated USING (true);

-- friend_requests
CREATE POLICY "friend_req_select" ON public.friend_requests FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "friend_req_insert" ON public.friend_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "friend_req_update" ON public.friend_requests FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "friend_req_delete" ON public.friend_requests FOR DELETE TO anon, authenticated USING (true);

-- friendships
CREATE POLICY "friendships_select" ON public.friendships FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "friendships_insert" ON public.friendships FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "friendships_delete" ON public.friendships FOR DELETE TO anon, authenticated USING (true);

-- posts
CREATE POLICY "posts_select" ON public.posts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "posts_insert" ON public.posts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "posts_update" ON public.posts FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "posts_delete" ON public.posts FOR DELETE TO anon, authenticated USING (true);

-- post_media
CREATE POLICY "post_media_select" ON public.post_media FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "post_media_insert" ON public.post_media FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "post_media_delete" ON public.post_media FOR DELETE TO anon, authenticated USING (true);

-- likes
CREATE POLICY "likes_select" ON public.likes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "likes_insert" ON public.likes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "likes_delete" ON public.likes FOR DELETE TO anon, authenticated USING (true);

-- comments
CREATE POLICY "comments_select" ON public.comments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "comments_insert" ON public.comments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "comments_update" ON public.comments FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "comments_delete" ON public.comments FOR DELETE TO anon, authenticated USING (true);

-- saved_posts
CREATE POLICY "saved_select" ON public.saved_posts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "saved_insert" ON public.saved_posts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "saved_delete" ON public.saved_posts FOR DELETE TO anon, authenticated USING (true);

-- stories
CREATE POLICY "stories_select" ON public.stories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "stories_insert" ON public.stories FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "stories_delete" ON public.stories FOR DELETE TO anon, authenticated USING (true);

-- story_views
CREATE POLICY "story_views_select" ON public.story_views FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "story_views_insert" ON public.story_views FOR INSERT TO anon, authenticated WITH CHECK (true);

-- messages
CREATE POLICY "messages_select" ON public.messages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "messages_insert" ON public.messages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "messages_update" ON public.messages FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "messages_delete" ON public.messages FOR DELETE TO anon, authenticated USING (true);

-- notifications
CREATE POLICY "notifs_select" ON public.notifications FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "notifs_insert" ON public.notifications FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "notifs_update" ON public.notifications FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "notifs_delete" ON public.notifications FOR DELETE TO anon, authenticated USING (true);

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('profile_photos', 'profile_photos', true, 5242880,  ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('cover_photos',   'cover_photos',   true, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('workout_media',  'workout_media',  true, 52428800, ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']),
  ('stories_media',  'stories_media',  true, 52428800, ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies
CREATE POLICY "sp_profile_photos_sel"  ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'profile_photos');
CREATE POLICY "sp_profile_photos_ins"  ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'profile_photos');
CREATE POLICY "sp_profile_photos_upd"  ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'profile_photos');
CREATE POLICY "sp_profile_photos_del"  ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'profile_photos');

CREATE POLICY "sp_cover_photos_sel"    ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'cover_photos');
CREATE POLICY "sp_cover_photos_ins"    ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'cover_photos');
CREATE POLICY "sp_cover_photos_upd"    ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'cover_photos');
CREATE POLICY "sp_cover_photos_del"    ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'cover_photos');

CREATE POLICY "sp_workout_media_sel"   ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'workout_media');
CREATE POLICY "sp_workout_media_ins"   ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'workout_media');
CREATE POLICY "sp_workout_media_del"   ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'workout_media');

CREATE POLICY "sp_stories_media_sel"   ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'stories_media');
CREATE POLICY "sp_stories_media_ins"   ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'stories_media');
CREATE POLICY "sp_stories_media_del"   ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'stories_media');

-- ============================================================================
-- REALTIME PUBLICATION
-- ============================================================================
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['notifications','messages','posts','profiles','likes','comments','stories'] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

-- ============================================================================
-- EXPIRED STORIES CLEANUP FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION delete_expired_stories()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.stories WHERE expires_at < NOW();
END;
$$;

-- ============================================================================
-- 14. SQUADS Table
-- Stores squad data so all users across all devices share the same squads.
-- members / goals / challenges stored as JSONB blobs.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.squads (
  id          TEXT PRIMARY KEY,
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,
  emoji       TEXT NOT NULL DEFAULT '💪',
  leader_id   TEXT NOT NULL,
  members     JSONB NOT NULL DEFAULT '[]',
  goals       JSONB NOT NULL DEFAULT '[]',
  challenges  JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS squads_code_idx ON public.squads (UPPER(code));

ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "squads_select" ON public.squads FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "squads_insert" ON public.squads FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "squads_update" ON public.squads FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "squads_delete" ON public.squads FOR DELETE TO anon, authenticated USING (true);

-- Add squads to realtime publication so member lists update live
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.squads;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ============================================================================
-- 15. SQUAD INVITATIONS Table (if not already created)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.squad_invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id    TEXT NOT NULL,
  squad_name  TEXT NOT NULL DEFAULT '',
  squad_emoji TEXT NOT NULL DEFAULT '💪',
  sender_id   TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE (squad_id, receiver_id)
);

ALTER TABLE public.squad_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "squad_inv_select" ON public.squad_invitations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "squad_inv_insert" ON public.squad_invitations FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "squad_inv_update" ON public.squad_invitations FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "squad_inv_delete" ON public.squad_invitations FOR DELETE TO anon, authenticated USING (true);
