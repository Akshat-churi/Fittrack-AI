import React, { useState, useRef } from 'react';
import {
  X, Image as ImageIcon, Video, Send, Smile, Activity,
  Loader2, Hash, AtSign, Flame, Clock
} from 'lucide-react';
import { createPost } from '../utils/supabaseBridge';
import { getCurrentUser } from '../utils/auth';
import { useToast } from './Toast';
import EmojiPicker from './EmojiPicker';
import { logEvent } from '../utils/analytics';

const EXERCISE_TYPES = ['Push-ups', 'Squats', 'Plank', 'Lunges', 'Burpees', 'Pull-ups', 'Sit-ups', 'Other'];

/**
 * Post creation modal — extracted from SocialFeed for reuse.
 *
 * Props:
 *   onClose    - Callback to close the modal
 *   onCreated  - Callback after successful creation (receives enriched post or null)
 *   defaultExercise - Optional pre-filled exercise type (from workout completion)
 *   defaultReps     - Optional pre-filled reps
 *   defaultCalories - Optional pre-filled calories
 *   defaultDuration - Optional pre-filled duration in seconds
 */
const PostCreator = ({
  onClose,
  onCreated,
  defaultExercise = '',
  defaultReps = '',
  defaultCalories = '',
  defaultDuration = '',
}) => {
  const currentUser = getCurrentUser();
  const { addToast } = useToast();

  const [caption, setCaption]         = useState('');
  const [exerciseType, setExerciseType] = useState(defaultExercise);
  const [reps, setReps]               = useState(defaultReps);
  const [calories, setCalories]       = useState(defaultCalories);
  const [duration, setDuration]       = useState(defaultDuration);
  const [mediaFiles, setMediaFiles]   = useState([]);
  const [previews, setPreviews]       = useState([]);
  const [showEmoji, setShowEmoji]     = useState(false);
  const [posting, setPosting]         = useState(false);

  const fileRef      = useRef(null);
  const captionRef   = useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Max 4 files
    const combined = [...mediaFiles, ...files].slice(0, 4);
    setMediaFiles(combined);
    setPreviews(combined.map(f => ({
      url: URL.createObjectURL(f),
      type: f.type.startsWith('video/') ? 'video' : 'image',
    })));
  };

  const removeMedia = (idx) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const insertAtCursor = (text) => {
    const el = captionRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const newVal = caption.slice(0, start) + text + caption.slice(end);
    setCaption(newVal);
    setTimeout(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + text.length;
    }, 0);
  };

  const handleEmojiSelect = (emoji) => {
    insertAtCursor(emoji);
    setShowEmoji(false);
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      addToast('Please sign in to post.', 'error');
      return;
    }
    if (!caption.trim() && mediaFiles.length === 0) {
      addToast('Add a caption or media to post.', 'error');
      return;
    }

    setPosting(true);
    try {
      const post = await createPost({
        userId: currentUser.id,
        caption: caption.trim(),
        exerciseType: exerciseType || null,
        reps: reps ? parseInt(reps) : null,
        caloriesBurned: calories ? parseFloat(calories) : null,
        duration: duration ? parseInt(duration) : null,
        mediaFiles,
      });

      if (post) {
        addToast('Post shared successfully! 🎉', 'success');
        logEvent('post_created', { postId: post.id, exerciseType: exerciseType || 'text-only', reps: reps || null });
        if (onCreated) onCreated(post);
        onClose();
      } else {
        addToast('Failed to create post. Try again.', 'error');
      }
    } catch (err) {
      console.error('[PostCreator]', err);
      addToast('Something went wrong.', 'error');
    } finally {
      setPosting(false);
    }
  };

  // Extract hashtags from caption for live preview
  const hashtags = (caption.match(/#\w+/g) || []);
  const mentions = (caption.match(/@\w+/g) || []);

  return (
    <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-brand-surface border border-brand-border rounded-t-3xl sm:rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-brand-border/60 shrink-0">
          <div className="flex items-center gap-2">
            {currentUser?.photo
              ? <img src={currentUser.photo} alt="" className="w-8 h-8 rounded-full object-cover" />
              : <div className="w-8 h-8 rounded-full bg-brand-orange/20 flex items-center justify-center">
                  <span className="text-brand-orange text-sm font-bold">
                    {(currentUser?.name || 'U')[0]}
                  </span>
                </div>
            }
            <div>
              <p className="text-white text-sm font-bold leading-tight">{currentUser?.name || 'You'}</p>
              <p className="text-slate-500 text-[10px]">Share your workout</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-brand-border/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Caption */}
          <div className="relative">
            <textarea
              ref={captionRef}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Share your workout... #fitness @username 💪"
              rows={4}
              maxLength={500}
              className="w-full bg-brand-dark border border-brand-border rounded-2xl p-4 text-sm text-white placeholder-slate-600 resize-none focus:border-brand-orange/40 transition-colors"
            />
            <div className="flex items-center justify-between mt-1 px-1">
              <div className="flex gap-1 flex-wrap">
                {hashtags.map((h, i) => (
                  <span key={i} className="text-sky-400 text-[10px] font-bold bg-sky-400/10 px-1.5 py-0.5 rounded-md">{h}</span>
                ))}
                {mentions.map((m, i) => (
                  <span key={i} className="text-brand-orange text-[10px] font-bold bg-brand-orange/10 px-1.5 py-0.5 rounded-md">{m}</span>
                ))}
              </div>
              <span className="text-slate-600 text-[10px]">{caption.length}/500</span>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-dark border border-brand-border rounded-xl text-xs text-slate-400 hover:text-white hover:border-brand-orange/30 transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5" /> Photo/Video
            </button>
            <div className="relative">
              <button
                onClick={() => setShowEmoji(p => !p)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-dark border border-brand-border rounded-xl text-xs text-slate-400 hover:text-white hover:border-brand-orange/30 transition-colors"
              >
                <Smile className="w-3.5 h-3.5" /> Emoji
              </button>
              {showEmoji && (
                <div className="absolute bottom-10 left-0 z-20">
                  <EmojiPicker
                    onSelect={handleEmojiSelect}
                    onClose={() => setShowEmoji(false)}
                  />
                </div>
              )}
            </div>
            <button
              onClick={() => insertAtCursor('#')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-dark border border-brand-border rounded-xl text-xs text-slate-400 hover:text-sky-400 hover:border-sky-400/30 transition-colors"
            >
              <Hash className="w-3.5 h-3.5" /> Hashtag
            </button>
            <button
              onClick={() => insertAtCursor('@')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-dark border border-brand-border rounded-xl text-xs text-slate-400 hover:text-brand-orange hover:border-brand-orange/30 transition-colors"
            >
              <AtSign className="w-3.5 h-3.5" /> Mention
            </button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Media previews */}
          {previews.length > 0 && (
            <div className={`grid gap-2 ${previews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {previews.map((p, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden aspect-square bg-brand-dark">
                  {p.type === 'video'
                    ? <video src={p.url} className="w-full h-full object-cover" muted />
                    : <img src={p.url} alt="" className="w-full h-full object-cover" />
                  }
                  <button
                    onClick={() => removeMedia(i)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-white hover:bg-red-500/80 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Workout details */}
          <div className="border border-brand-border/60 rounded-2xl p-4 space-y-3 bg-brand-dark/40">
            <p className="text-xs font-bold text-slate-400 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-brand-orange" /> Workout Details (optional)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-500 font-semibold mb-1 block">Exercise</label>
                <select
                  value={exerciseType}
                  onChange={(e) => setExerciseType(e.target.value)}
                  className="w-full bg-brand-dark border border-brand-border rounded-xl px-3 py-2 text-xs text-white focus:border-brand-orange/40 transition-colors"
                >
                  <option value="">Select...</option>
                  {EXERCISE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold mb-1 block flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Reps
                </label>
                <input
                  type="number"
                  min={0}
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  placeholder="e.g. 30"
                  className="w-full bg-brand-dark border border-brand-border rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 focus:border-brand-orange/40 transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold mb-1 block flex items-center gap-1">
                  <Flame className="w-3 h-3 text-red-400" /> Calories
                </label>
                <input
                  type="number"
                  min={0}
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="kcal"
                  className="w-full bg-brand-dark border border-brand-border rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 focus:border-brand-orange/40 transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold mb-1 block flex items-center gap-1">
                  <Clock className="w-3 h-3 text-sky-400" /> Duration (sec)
                </label>
                <input
                  type="number"
                  min={0}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 300"
                  className="w-full bg-brand-dark border border-brand-border rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 focus:border-brand-orange/40 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-brand-border/60 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={posting || (!caption.trim() && mediaFiles.length === 0)}
            className="w-full py-3 rounded-2xl font-bold text-sm transition-all bg-gradient-to-r from-brand-orange to-[#ff4b1f] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(255,126,51,0.3)]"
          >
            {posting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Posting…
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Share Post
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostCreator;
