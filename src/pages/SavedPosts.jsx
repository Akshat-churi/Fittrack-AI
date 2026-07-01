import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Heart, MessageSquare, Share2, User, Flame, ChevronLeft, ChevronRight } from 'lucide-react';
import { getCurrentUser } from '../utils/auth';
import { fetchSavedPosts, toggleLikePost, toggleSavePost, fetchComments, addComment } from '../utils/supabaseBridge';
import { useToast } from '../components/Toast';
import SkeletonLoader from '../components/SkeletonLoader';
import EmojiPicker from '../components/EmojiPicker';

// ─── Caption renderer with hashtags & @mentions ──────────────────────────────
const renderCaption = (caption, navigate) => {
  if (!caption) return null;
  const parts = caption.split(/(#\w+|@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('#')) {
      return <span key={i} className="text-sky-400 font-bold">{part}</span>;
    }
    if (part.startsWith('@')) {
      return (
        <span
          key={i}
          className="text-brand-orange font-bold cursor-pointer hover:underline"
          onClick={(e) => { e.stopPropagation(); navigate(`/search?q=${part.slice(1)}`); }}
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

// ─── Relative time ────────────────────────────────────────────────────────────
const relativeTime = (iso) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

// ─── Inline comment drawer ────────────────────────────────────────────────────
const InlineComments = ({ post, currentUser, onClose }) => {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComments(post.id).then(data => {
      setComments(data);
      setLoading(false);
    });
  }, [post.id]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!text.trim() || !currentUser) return;
    const comment = await addComment(post.id, currentUser.id, text);
    if (comment) {
      setComments(prev => [...prev, comment]);
      setText('');
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-brand-border/40 space-y-3">
      {loading ? (
        <p className="text-xs text-slate-500 text-center">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-slate-500 text-center">No comments yet.</p>
      ) : (
        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2 items-start">
              <div className="w-7 h-7 rounded-lg bg-brand-dark overflow-hidden flex items-center justify-center border border-brand-orange/20 shrink-0">
                {c.profiles?.photo
                  ? <img src={c.profiles.photo} alt="" className="w-full h-full object-cover" />
                  : <User className="w-3 h-3 text-slate-600" />}
              </div>
              <div className="bg-brand-dark/60 border border-brand-border/40 rounded-xl px-3 py-1.5 flex-1">
                <p className="text-[10px] font-extrabold text-white">{c.profiles?.display_name}</p>
                <p className="text-xs text-slate-300">{c.comment_text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {currentUser && (
        <form onSubmit={handlePost} className="flex items-center gap-2">
          <div className="flex-1 relative flex items-center">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Add comment…"
              className="w-full bg-brand-dark border border-brand-border text-white text-xs rounded-xl pl-3 pr-8 py-2 focus:outline-none"
            />
            <div className="absolute right-2">
              <EmojiPicker onSelect={e => setText(prev => prev + e)} />
            </div>
          </div>
          <button type="submit" disabled={!text.trim()} className="px-3 py-2 bg-brand-orange text-white rounded-xl text-xs font-bold disabled:opacity-30">
            Post
          </button>
        </form>
      )}
    </div>
  );
};

// ─── Saved Post Card ──────────────────────────────────────────────────────────
const SavedCard = ({ post, currentUser, onLike, onUnsave, navigate }) => {
  const [mediaIdx, setMediaIdx] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const media = post.post_media || [];

  return (
    <div className="premium-glass-card rounded-2xl overflow-hidden border border-brand-border/60">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-brand-border/40">
        <button
          onClick={() => navigate(`/user/${post.user_id}`)}
          className="flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-brand-dark border border-brand-orange/20 overflow-hidden flex items-center justify-center shrink-0">
            {post.profiles?.photo
              ? <img src={post.profiles.photo} alt="" className="w-full h-full object-cover" />
              : <User className="w-4 h-4 text-slate-600" />}
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-white leading-tight flex items-center gap-1.5">
              {post.profiles?.display_name}
              {post.profiles?.current_streak > 0 && (
                <span className="text-[10px] text-red-500 font-bold bg-red-500/10 px-1.5 py-0.5 rounded-lg flex items-center gap-0.5">
                  <Flame className="w-3 h-3 fill-red-500" />{post.profiles.current_streak}
                </span>
              )}
            </p>
            <p className="text-[10px] text-slate-500 font-semibold">{relativeTime(post.created_at)}</p>
          </div>
        </button>

        {/* Remove from saved */}
        <button
          onClick={() => onUnsave(post)}
          className="text-brand-orange hover:text-amber-400 transition-colors"
          title="Remove Bookmark"
        >
          <Bookmark className="w-5 h-5 fill-brand-orange" />
        </button>
      </div>

      {/* Media Carousel */}
      {media.length > 0 && (
        <div className="relative bg-black max-h-[420px] overflow-hidden flex items-center justify-center border-b border-brand-border/40">
          {media[mediaIdx].media_type === 'video'
            ? <video src={media[mediaIdx].media_url} controls className="w-full max-h-[420px] object-contain" />
            : <img src={media[mediaIdx].media_url} alt="Saved workout" className="w-full max-h-[420px] object-contain" loading="lazy" />}

          {/* Prev / Next arrows */}
          {media.length > 1 && (
            <>
              <button
                onClick={() => setMediaIdx(i => Math.max(i - 1, 0))}
                disabled={mediaIdx === 0}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full p-1.5 disabled:opacity-20 hover:bg-black/80 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMediaIdx(i => Math.min(i + 1, media.length - 1))}
                disabled={mediaIdx === media.length - 1}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full p-1.5 disabled:opacity-20 hover:bg-black/80 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {media.map((_, i) => (
                  <button key={i} onClick={() => setMediaIdx(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i === mediaIdx ? 'bg-white scale-125' : 'bg-white/40'}`} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="p-5 space-y-4">
        {/* Workout stats */}
        {post.exercise_type && (
          <div className="grid grid-cols-4 gap-2 bg-brand-dark/60 p-3 rounded-xl border border-brand-border/60 text-center">
            {[
              { label: 'Exercise', value: post.exercise_type, cls: 'text-white' },
              { label: 'Reps', value: post.reps ?? '—', cls: 'text-brand-orange' },
              { label: 'Calories', value: post.calories_burned ? `${post.calories_burned} kcal` : '—', cls: 'text-red-400' },
              { label: 'Duration', value: post.duration || '—', cls: 'text-emerald-400' },
            ].map(item => (
              <div key={item.label}>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{item.label}</p>
                <p className={`text-xs font-black ${item.cls}`}>{item.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Caption with hashtag/mention rendering */}
        {post.caption && (
          <p className="text-sm text-slate-300 leading-relaxed font-semibold">
            {renderCaption(post.caption, navigate)}
          </p>
        )}

        {/* Hashtag pills */}
        {post.hashtags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.hashtags.map(tag => (
              <span key={tag} className="text-[10px] text-sky-400 font-bold bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-lg">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions row */}
        <div className="flex items-center justify-between pt-2 border-t border-brand-border/30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onLike(post)}
              className={`flex items-center gap-1.5 text-xs font-bold transition-all active:scale-110 ${post.isLiked ? 'text-red-500' : 'text-slate-400 hover:text-white'}`}
            >
              <Heart className={`w-5 h-5 transition-all ${post.isLiked ? 'fill-red-500 scale-110' : ''}`} />
              <span>{post.likesCount}</span>
            </button>
            <button
              onClick={() => setShowComments(prev => !prev)}
              className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${showComments ? 'text-brand-orange' : 'text-slate-400 hover:text-white'}`}
            >
              <MessageSquare className="w-5 h-5" />
              <span>{post.commentsCount}</span>
            </button>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/user/${post.user_id}`);
            }}
            className="text-slate-400 hover:text-white transition-colors"
            title="Copy profile link"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {/* Inline comment section */}
        {showComments && (
          <InlineComments
            post={post}
            currentUser={currentUser}
            onClose={() => setShowComments(false)}
          />
        )}
      </div>
    </div>
  );
};

// ─── SavedPosts Page ──────────────────────────────────────────────────────────
const SavedPosts = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const currentUser = getCurrentUser();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }
    fetchSavedPosts(currentUser.id).then(data => {
      setPosts(data);
      setLoading(false);
    });
  }, [currentUser?.id]);

  const handleLike = async (post) => {
    if (!currentUser) { navigate('/auth'); return; }
    const ok = await toggleLikePost(post.id, currentUser.id, post.isLiked);
    if (ok) {
      setPosts(prev => prev.map(p => p.id === post.id ? {
        ...p,
        isLiked: !p.isLiked,
        likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1
      } : p));
    }
  };

  const handleUnsave = async (post) => {
    if (!currentUser) return;
    if (!window.confirm('Remove this post from your saved bookmarks?')) return;
    const ok = await toggleSavePost(post.id, currentUser.id, true);
    if (ok) {
      setPosts(prev => prev.filter(p => p.id !== post.id));
      addToast('Removed from saved.', 'info');
    } else {
      addToast('Failed to remove bookmark.', 'error');
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
        <div className="premium-glass-card rounded-2xl p-8 text-center max-w-sm border border-brand-border/40">
          <p className="text-base font-bold text-white mb-2">Sign in to view saved posts</p>
          <button onClick={() => navigate('/auth')} className="px-6 py-3 bg-brand-orange text-white rounded-xl font-bold text-sm hover:bg-[#ff8f4d] transition-all mt-2">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-transparent p-4 md:p-6 flex flex-col items-center">
      <div className="max-w-2xl w-full space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Saved <span className="text-brand-orange">Workouts</span>
          </h1>
          <p className="text-slate-400 text-xs font-semibold tracking-wider uppercase mt-1">
            Your bookmarked workouts and athletic inspiration.
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-6">
            <SkeletonLoader type="post" count={3} />
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-6">
            {posts.map(post => (
              <SavedCard
                key={post.id}
                post={post}
                currentUser={currentUser}
                onLike={handleLike}
                onUnsave={handleUnsave}
                navigate={navigate}
              />
            ))}
          </div>
        ) : (
          <div className="premium-glass-card rounded-2xl p-12 text-center border border-brand-border/40">
            <div className="inline-flex items-center justify-center p-5 bg-brand-dark rounded-2xl mb-5 border border-brand-border shadow-inner">
              <Bookmark className="w-9 h-9 text-slate-600" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">No Saved Bookmarks</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed font-semibold mb-4">
              Browse the social feed and tap the bookmark icon on any post to save it here.
            </p>
            <button
              onClick={() => navigate('/feed')}
              className="px-5 py-2.5 bg-brand-orange text-white rounded-xl text-xs font-bold hover:bg-[#ff8f4d] transition-all"
            >
              Browse Feed →
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default SavedPosts;
