import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart, MessageSquare, Bookmark, Share2, Plus, Send, X, Activity,
  Image as ImageIcon, User, Flame, MoreHorizontal, Trash2, Edit3, Check,
  RefreshCw, Bell,
} from 'lucide-react';
import { getCurrentUser } from '../utils/auth';
import {
  fetchFeed, toggleLikePost, toggleSavePost,
  fetchComments, addComment, editComment, deleteComment,
  createStory, fetchStoriesFeed, deletePost,
} from '../utils/supabaseBridge';
import { supabase } from '../utils/supabaseClient';
import { useToast } from '../components/Toast';
import EmojiPicker from '../components/EmojiPicker';
import SkeletonLoader from '../components/SkeletonLoader';
import StoryViewer from '../components/StoryViewer';
import StoryCreator from '../components/StoryCreator';
import PostCreator from '../components/PostCreator';

// ─── Utility: parse caption for hashtags & @mentions ────────────────────────
const renderCaption = (caption, navigate) => {
  if (!caption) return null;
  const parts = caption.split(/(#\w+|@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('#')) {
      return <span key={i} className="text-sky-400 font-bold cursor-pointer hover:underline">{part}</span>;
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

// ─── Relative time helper ────────────────────────────────────────────────────
const relativeTime = (iso) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

// ─── Single Post Card ────────────────────────────────────────────────────────
const PostCard = ({ post, currentUser, onLike, onSave, onOpenComments, onDelete, navigate }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [mediaIdx, setMediaIdx] = useState(0);
  const isOwner = post.user_id === currentUser?.id;
  const media = post.post_media || [];

  return (
    <div className="premium-glass-card rounded-2xl overflow-hidden border border-brand-border/60">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-brand-border/40">
        <button
          onClick={() => navigate(`/user/${post.user_id}`)}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-dark border border-brand-orange/20 overflow-hidden flex items-center justify-center shrink-0">
            {post.profiles?.photo
              ? <img src={post.profiles.photo} alt="" className="w-full h-full object-cover" />
              : <User className="w-5 h-5 text-slate-600" />}
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-white tracking-tight leading-tight flex items-center gap-1.5">
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

        {/* Menu (owner only) */}
        {isOwner && (
          <div className="relative">
            <button onClick={() => setShowMenu(p => !p)} className="text-slate-500 hover:text-white p-1">
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 bg-slate-900 border border-brand-border rounded-xl shadow-2xl z-20 w-36 overflow-hidden">
                <button
                  onClick={() => { onDelete(post.id); setShowMenu(false); }}
                  className="flex items-center gap-2 px-4 py-3 text-red-400 hover:bg-red-500/10 w-full text-xs font-bold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Post
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Media Gallery */}
      {media.length > 0 && (
        <div className="relative bg-black border-b border-brand-border/40 max-h-[480px] overflow-hidden flex items-center justify-center">
          {media[mediaIdx].media_type === 'video'
            ? <video src={media[mediaIdx].media_url} controls className="w-full max-h-[480px] object-contain" />
            : <img src={media[mediaIdx].media_url} alt="Workout" className="w-full max-h-[480px] object-contain" loading="lazy" />
          }
          {/* Gallery dot navigation */}
          {media.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {media.map((_, i) => (
                <button key={i} onClick={() => setMediaIdx(i)} className={`w-2 h-2 rounded-full transition-all ${i === mediaIdx ? 'bg-white scale-125' : 'bg-white/40'}`} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Workout stats box */}
        {post.exercise_type && (
          <div className="grid grid-cols-4 gap-2 bg-brand-dark/60 p-3 rounded-xl border border-brand-border/60 text-center">
            {[
              { label: 'Exercise', value: post.exercise_type, cls: 'text-white' },
              { label: 'Reps', value: post.reps, cls: 'text-brand-orange' },
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

        {/* Caption */}
        {post.caption && (
          <p className="text-sm text-slate-300 leading-relaxed font-semibold">
            {renderCaption(post.caption, navigate)}
          </p>
        )}

        {/* Hashtags */}
        {post.hashtags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.hashtags.map(tag => (
              <span key={tag} className="text-[10px] text-sky-400 font-bold bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-lg">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
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
              onClick={() => onOpenComments(post)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
              <span>{post.commentsCount}</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/user/${post.user_id}`);
              }}
              className="text-slate-400 hover:text-white transition-colors"
              title="Copy profile link"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => onSave(post)}
              className={`transition-colors ${post.isSaved ? 'text-brand-orange' : 'text-slate-400 hover:text-white'}`}
              title="Save post"
            >
              <Bookmark className={`w-5 h-5 ${post.isSaved ? 'fill-brand-orange' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Comments Drawer ─────────────────────────────────────────────────────────
const CommentsDrawer = ({ post, currentUser, onClose }) => {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const { addToast } = useToast();
  const endRef = useRef(null);

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
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  const handleEdit = async (commentId) => {
    if (!editText.trim()) return;
    const ok = await editComment(commentId, currentUser.id, editText);
    if (ok) {
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, comment_text: editText, edited_at: new Date().toISOString() } : c));
      setEditingId(null);
      setEditText('');
    } else {
      addToast('Failed to edit comment.', 'error');
    }
  };

  const handleDelete = async (commentId) => {
    const ok = await deleteComment(commentId, currentUser.id);
    if (ok) setComments(prev => prev.filter(c => c.id !== commentId));
    else addToast('Failed to delete comment.', 'error');
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center p-4 backdrop-blur-sm">
      <div className="premium-glass-card max-w-md w-full rounded-t-2xl border border-brand-border/60 flex flex-col max-h-[80vh] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brand-border/40 shrink-0">
          <div>
            <h3 className="text-sm font-bold text-white">Comments</h3>
            <p className="text-[10px] text-slate-500 font-semibold">{comments.length} comments</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-brand-orange" /></div>
          ) : comments.length === 0 ? (
            <p className="text-center text-slate-500 text-xs py-8">No comments yet. Be the first! 💬</p>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex items-start gap-3">
                <button onClick={() => {}}>
                  <div className="w-8 h-8 rounded-xl bg-brand-dark overflow-hidden flex items-center justify-center border border-brand-orange/20 shrink-0">
                    {c.profiles?.photo
                      ? <img src={c.profiles.photo} alt="" className="w-full h-full object-cover" />
                      : <User className="w-4 h-4 text-slate-600" />}
                  </div>
                </button>
                <div className="flex-1 min-w-0">
                  <div className="bg-brand-dark/60 border border-brand-border/40 rounded-xl px-3 py-2">
                    <p className="text-[11px] font-extrabold text-white">{c.profiles?.display_name}</p>
                    {editingId === c.id ? (
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          className="flex-1 bg-brand-surface border border-brand-border rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                          autoFocus
                        />
                        <button onClick={() => handleEdit(c.id)} className="text-brand-orange"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingId(null)} className="text-slate-500"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{c.comment_text}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 px-1">
                    <span className="text-[9px] text-slate-600 font-semibold">{relativeTime(c.created_at)}</span>
                    {c.edited_at && <span className="text-[9px] text-slate-600 font-semibold">(edited)</span>}
                    {c.user_id === currentUser?.id && editingId !== c.id && (
                      <>
                        <button
                          onClick={() => { setEditingId(c.id); setEditText(c.comment_text); }}
                          className="text-[9px] font-bold text-slate-500 hover:text-white flex items-center gap-0.5"
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="text-[9px] font-bold text-red-500/70 hover:text-red-400 flex items-center gap-0.5"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <form onSubmit={handlePost} className="p-4 border-t border-brand-border/40 flex items-center gap-2 shrink-0">
          <div className="flex-1 relative flex items-center">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Write a comment..."
              className="w-full bg-brand-dark border border-brand-border text-white rounded-xl pl-4 pr-10 py-2.5 text-xs focus:outline-none focus:border-brand-orange/50"
            />
            <div className="absolute right-2">
              <EmojiPicker onSelect={emoji => setText(prev => prev + emoji)} />
            </div>
          </div>
          <button
            type="submit"
            disabled={!text.trim()}
            className="p-2.5 bg-brand-orange text-white rounded-xl disabled:opacity-30 hover:bg-[#ff8f4d] transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

// (StoryViewer, StoryCreator, PostCreator are now reusable components — imported above)


// ─── Main Feed Page ──────────────────────────────────────────────────────────
const SocialFeed = () => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const { addToast } = useToast();

  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newPostsBanner, setNewPostsBanner] = useState(false);

  const [showPostModal, setShowPostModal] = useState(false);
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [viewingStories, setViewingStories] = useState(null);
  const [workoutHistory, setWorkoutHistory] = useState([]);

  const loadFeed = useCallback(async (reset = false) => {
    if (!currentUser) { setLoadingFeed(false); return; }
    const newOffset = reset ? 0 : offset;
    if (reset) setLoadingFeed(true); else setLoadingMore(true);

    const data = await fetchFeed(currentUser.id, 8, newOffset);

    if (reset) {
      setPosts(data);
      setOffset(data.length);
      setNewPostsBanner(false);
    } else {
      setPosts(prev => [...prev, ...data]);
      setOffset(prev => prev + data.length);
    }

    setHasMore(data.length === 8);
    if (reset) setLoadingFeed(false); else setLoadingMore(false);
  }, [currentUser?.id, offset]);

  const refreshAll = useCallback(async () => {
    if (!currentUser) return;
    const storiesData = await fetchStoriesFeed(currentUser.id);
    setStories(storiesData);
    await loadFeed(true);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser) return;
    const logs = JSON.parse(localStorage.getItem('fittrack_history') || '[]');
    setWorkoutHistory(logs.slice(0, 15));
    fetchStoriesFeed(currentUser.id).then(setStories);
    loadFeed(true);
  }, [currentUser?.id]);

  // Realtime: show banner when new posts arrive from other users
  useEffect(() => {
    if (!currentUser) return;

    const postsCh = supabase
      .channel('feed_posts_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        // Show banner only for OTHER users' posts
        if (payload.new.user_id !== currentUser.id) {
          setNewPostsBanner(true);
        }
      })
      .subscribe();

    const likesCh = supabase
      .channel('feed_likes_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => {
        // Optimistically update like counts inline — no full refetch needed
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postsCh);
      supabase.removeChannel(likesCh);
    };
  }, [currentUser?.id]);

  const handleLike = async (post) => {
    if (!currentUser) { navigate('/auth'); return; }
    const ok = await toggleLikePost(post.id, currentUser.id, post.isLiked);
    if (ok) {
      setPosts(prev => prev.map(p => p.id === post.id ? {
        ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1
      } : p));
    }
  };

  const handleSave = async (post) => {
    if (!currentUser) { navigate('/auth'); return; }
    const ok = await toggleSavePost(post.id, currentUser.id, post.isSaved);
    if (ok) {
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, isSaved: !p.isSaved } : p));
      addToast(post.isSaved ? 'Removed from saved.' : 'Post saved! 🔖', 'success');
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    const ok = await deletePost(postId, currentUser.id);
    if (ok) {
      setPosts(prev => prev.filter(p => p.id !== postId));
      addToast('Post deleted.', 'info');
    } else {
      addToast('Failed to delete post.', 'error');
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
        <div className="premium-glass-card rounded-2xl p-8 text-center max-w-sm border border-brand-border/40">
          <p className="text-lg font-bold text-white mb-2">Sign in to see the feed</p>
          <p className="text-slate-400 text-sm mb-4">Join the community to follow athletes and share your workouts.</p>
          <button onClick={() => navigate('/auth')} className="px-6 py-3 bg-brand-orange text-white rounded-xl font-bold text-sm hover:bg-[#ff8f4d] transition-all">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-transparent p-4 md:p-6 flex justify-center">
      <div className="max-w-xl w-full space-y-6">

        {/* New posts banner */}
        {newPostsBanner && (
          <button
            onClick={() => loadFeed(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-orange/20 border border-brand-orange/40 rounded-2xl text-brand-orange text-xs font-bold hover:bg-brand-orange/30 transition-all animate-slide-up"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            New posts from athletes — tap to refresh
          </button>
        )}

        {/* Stories Row */}
        <div className="flex gap-4 overflow-x-auto py-2.5 scrollbar-hide bg-brand-dark/20 border border-brand-border/40 rounded-2xl px-4 items-center shrink-0">
          {/* Add story — opens StoryCreator modal directly */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <button
              onClick={() => setShowStoryCreator(true)}
              className="w-14 h-14 rounded-full border border-dashed border-brand-orange bg-brand-orange/5 hover:bg-brand-orange/10 flex items-center justify-center cursor-pointer transition-all group"
            >
              <Plus className="w-6 h-6 text-brand-orange group-hover:scale-110 transition-transform" />
            </button>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Story</span>
          </div>

          {/* Story circles */}
          {stories.map((group, groupIdx) => (
            <div key={group.user.id} className="flex flex-col items-center gap-1 shrink-0 cursor-pointer" onClick={() => setViewingStories({ groups: stories, startIdx: groupIdx })}>
              <div className="w-14 h-14 rounded-full p-[2.5px] bg-gradient-to-tr from-brand-orange to-red-500">
                <div className="w-full h-full rounded-full bg-slate-900 border-2 border-slate-950 overflow-hidden flex items-center justify-center">
                  {group.user.photo
                    ? <img src={group.user.photo} alt="" className="w-full h-full object-cover" />
                    : <User className="w-5 h-5 text-slate-600" />}
                </div>
              </div>
              <span className="text-[9px] font-bold text-slate-400 max-w-[55px] truncate">{group.user.display_name}</span>
            </div>
          ))}
        </div>

        {/* Post creation banner */}
        <div className="premium-glass-card rounded-2xl p-4 flex items-center justify-between border-brand-orange/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-dark overflow-hidden border border-brand-orange/20 flex items-center justify-center">
              {currentUser.photo
                ? <img src={currentUser.photo} alt="" className="w-full h-full object-cover" />
                : <User className="w-5 h-5 text-slate-600" />}
            </div>
            <span className="text-slate-500 text-xs font-semibold">What's your workout today?</span>
          </div>
          <button
            onClick={() => setShowPostModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-orange hover:bg-[#ff8f4d] text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md"
          >
            <Plus className="w-4 h-4" /> Post
          </button>
        </div>

        {/* Feed */}
        <div className="space-y-6">
          {loadingFeed ? (
            <SkeletonLoader type="post" count={3} />
          ) : posts.length === 0 ? (
            <div className="premium-glass-card rounded-2xl p-10 text-center border border-brand-border/40">
              <div className="text-5xl mb-4">🏋️</div>
              <h3 className="text-base font-bold text-white mb-2">Your feed is empty</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed mb-4">
                Follow athletes or connect with friends to see their workouts here.
              </p>
              <button onClick={() => navigate('/search')} className="px-5 py-2.5 bg-brand-orange text-white rounded-xl text-xs font-bold hover:bg-[#ff8f4d] transition-all">
                Find Athletes →
              </button>
            </div>
          ) : (
            posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={currentUser}
                onLike={handleLike}
                onSave={handleSave}
                onOpenComments={setActiveCommentPost}
                onDelete={handleDelete}
                navigate={navigate}
              />
            ))
          )}
        </div>

        {/* Load more */}
        {hasMore && !loadingFeed && posts.length > 0 && (
          <button
            onClick={() => loadFeed(false)}
            disabled={loadingMore}
            className="w-full py-3 bg-brand-dark/40 border border-brand-border rounded-xl text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white hover:bg-brand-border transition-all disabled:opacity-50"
          >
            {loadingMore ? 'Loading...' : 'Load More Posts'}
          </button>
        )}
      </div>

      {/* Modals */}
      {showPostModal && (
        <PostCreator
          onClose={() => setShowPostModal(false)}
          onCreated={() => refreshAll()}
        />
      )}

      {showStoryCreator && (
        <StoryCreator
          onClose={() => setShowStoryCreator(false)}
          onCreated={() => fetchStoriesFeed(currentUser.id).then(setStories)}
        />
      )}

      {activeCommentPost && (
        <CommentsDrawer
          post={activeCommentPost}
          currentUser={currentUser}
          onClose={() => setActiveCommentPost(null)}
        />
      )}

      {viewingStories && (
        <StoryViewer
          storyGroups={viewingStories.groups}
          initialIndex={viewingStories.startIdx}
          onClose={() => setViewingStories(null)}
          onStoryDeleted={(storyId) => {
            setStories(prev => prev.map(g => ({
              ...g,
              stories: g.stories.filter(s => s.id !== storyId)
            })).filter(g => g.stories.length > 0));
          }}
        />
      )}
    </div>
  );
};

export default SocialFeed;
