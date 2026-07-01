import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Eye, Pause, Play } from 'lucide-react';
import { recordStoryView, getStoryViewCount, deleteStory } from '../utils/supabaseBridge';
import { getCurrentUser } from '../utils/auth';

const STORY_DURATION_MS = 5000; // 5 seconds per story

/**
 * Full-screen story viewer with auto-advance, progress bars, and swipe support.
 *
 * Props:
 *   storyGroups  - Array of { user, stories[] } objects
 *   initialIndex - Which group to open first (default 0)
 *   onClose      - Callback to close the viewer
 *   onStoryDeleted - Optional callback when owner deletes a story
 */
const StoryViewer = ({ storyGroups, initialIndex = 0, onClose, onStoryDeleted }) => {
  const currentUser = getCurrentUser();
  const [groupIdx, setGroupIdx]   = useState(initialIndex);
  const [storyIdx, setStoryIdx]   = useState(0);
  const [progress, setProgress]   = useState(0);
  const [paused, setPaused]       = useState(false);
  const [viewCount, setViewCount] = useState(null);

  const timerRef    = useRef(null);
  const startRef    = useRef(null);
  const elapsedRef  = useRef(0);
  const touchStartX = useRef(null);

  const group = storyGroups[groupIdx];
  const story = group?.stories[storyIdx];
  const isOwner = story?.user_id === currentUser?.id;

  // ── advance to next story / group ─────────────────────────────────────────
  const goNext = useCallback(() => {
    if (!group) return;
    if (storyIdx < group.stories.length - 1) {
      setStoryIdx(i => i + 1);
      setProgress(0);
      elapsedRef.current = 0;
    } else if (groupIdx < storyGroups.length - 1) {
      setGroupIdx(g => g + 1);
      setStoryIdx(0);
      setProgress(0);
      elapsedRef.current = 0;
    } else {
      onClose();
    }
  }, [group, storyIdx, groupIdx, storyGroups.length, onClose]);

  const goPrev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx(i => i - 1);
      setProgress(0);
      elapsedRef.current = 0;
    } else if (groupIdx > 0) {
      setGroupIdx(g => g - 1);
      const prevGroup = storyGroups[groupIdx - 1];
      setStoryIdx(prevGroup.stories.length - 1);
      setProgress(0);
      elapsedRef.current = 0;
    }
  }, [storyIdx, groupIdx, storyGroups]);

  // ── timer ─────────────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    startRef.current = Date.now() - elapsedRef.current;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min((elapsed / STORY_DURATION_MS) * 100, 100);
      setProgress(pct);
      elapsedRef.current = elapsed;

      if (elapsed >= STORY_DURATION_MS) {
        clearInterval(timerRef.current);
        goNext();
      }
    }, 50);
  }, [goNext]);

  const pauseTimer = useCallback(() => {
    clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (!story) return;
    setProgress(0);
    elapsedRef.current = 0;

    if (!paused) startTimer();

    // Record view
    if (currentUser?.id && story.id) {
      recordStoryView(story.id, currentUser.id);
    }
    // Load view count for owner
    if (isOwner && story.id) {
      getStoryViewCount(story.id).then(setViewCount);
    } else {
      setViewCount(null);
    }

    return () => clearInterval(timerRef.current);
  }, [story?.id, paused]);

  useEffect(() => {
    if (paused) pauseTimer();
    else startTimer();
  }, [paused]);

  // ── keyboard navigation ───────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft')  goPrev();
      if (e.key === 'Escape')     onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev, onClose]);

  // ── touch swipe ───────────────────────────────────────────────────────────
  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    setPaused(true);
  };
  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - (touchStartX.current || 0);
    if (Math.abs(dx) > 50) {
      dx < 0 ? goNext() : goPrev();
    }
    setPaused(false);
  };

  const handleDelete = async () => {
    if (!story || !isOwner) return;
    const ok = await deleteStory(story.id, currentUser.id);
    if (ok && onStoryDeleted) onStoryDeleted(story.id);
    goNext();
  };

  if (!group || !story) return null;

  const timeLeft = Math.max(0, Math.round(((100 - progress) / 100) * (STORY_DURATION_MS / 1000)));

  return (
    <div
      className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
        {group.stories.map((s, i) => (
          <div key={s.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-none rounded-full"
              style={{
                width: i < storyIdx ? '100%' : i === storyIdx ? `${progress}%` : '0%',
                transition: i === storyIdx ? 'none' : undefined,
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 z-10 mt-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/60 shrink-0">
            {group.user.photo
              ? <img src={group.user.photo} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold">
                  {(group.user.display_name || '?')[0]}
                </div>
            }
          </div>
          <div>
            <p className="text-white text-sm font-bold leading-tight">
              {group.user.display_name || group.user.username}
            </p>
            <p className="text-white/60 text-[10px]">{timeLeft}s left</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOwner && viewCount !== null && (
            <div className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-1">
              <Eye className="w-3 h-3 text-white/70" />
              <span className="text-white/70 text-[10px] font-semibold">{viewCount}</span>
            </div>
          )}
          <button
            onClick={() => setPaused(p => !p)}
            className="p-1.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          {isOwner && (
            <button
              onClick={handleDelete}
              className="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold hover:bg-red-500/40 transition-colors"
            >
              Delete
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Media */}
      <div
        className="relative w-full max-w-sm h-full max-h-[90vh] flex items-center justify-center rounded-2xl overflow-hidden"
        style={{ background: story.background_color || '#1a1a2e' }}
      >
        {story.media_type === 'video'
          ? (
            <video
              key={story.id}
              src={story.media_url}
              autoPlay
              muted={false}
              playsInline
              loop={false}
              className="w-full h-full object-contain"
            />
          )
          : (
            <img
              key={story.id}
              src={story.media_url}
              alt="Story"
              className="w-full h-full object-contain"
            />
          )
        }

        {/* Text overlay */}
        {story.text_overlay && (
          <div className="absolute bottom-24 left-0 right-0 flex justify-center px-6">
            <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-2xl max-w-full">
              <p className="text-white text-sm font-semibold text-center leading-snug">
                {story.text_overlay}
              </p>
            </div>
          </div>
        )}

        {/* Emoji overlay */}
        {story.emoji_overlay && (
          <div className="absolute bottom-16 left-0 right-0 flex justify-center">
            <span className="text-4xl drop-shadow-lg">{story.emoji_overlay}</span>
          </div>
        )}
      </div>

      {/* Tap zones for prev/next */}
      <button
        className="absolute left-0 top-0 bottom-0 w-1/3 z-10 opacity-0"
        onClick={goPrev}
        aria-label="Previous story"
      />
      <button
        className="absolute right-0 top-0 bottom-0 w-1/3 z-10 opacity-0"
        onClick={goNext}
        aria-label="Next story"
      />

      {/* Group navigation arrows */}
      {groupIdx > 0 && (
        <button
          onClick={() => { setGroupIdx(g => g - 1); setStoryIdx(0); setProgress(0); }}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      {groupIdx < storyGroups.length - 1 && (
        <button
          onClick={() => { setGroupIdx(g => g + 1); setStoryIdx(0); setProgress(0); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default StoryViewer;
