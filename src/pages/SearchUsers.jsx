import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, UserPlus, UserMinus, UserCheck, Trophy, Flame, Eye, User, Sparkles } from 'lucide-react';
import { getCurrentUser } from '../utils/auth';
import { 
  searchUsers, 
  fetchTrendingAthletes,
  followUser, 
  unfollowUser, 
  checkIsFollowing, 
  sendFriendRequest, 
  getFriendRequestStatus,
  cancelFriendRequest,
  acceptFriendRequest,
  removeFriend
} from '../utils/supabaseBridge';
import SkeletonLoader from '../components/SkeletonLoader';
import { useToast } from '../components/Toast';

const SearchUsers = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const currentUser = getCurrentUser();

  // Load trending athletes on mount
  useEffect(() => {
    const loadTrending = async () => {
      setLoadingTrending(true);
      const data = await fetchTrendingAthletes(6);
      
      // Enrich trending users with relationship status
      if (data.length > 0 && currentUser) {
        const enriched = await Promise.all(data.map(async (user) => {
          if (user.id === currentUser.id) return { ...user, isSelf: true };
          const [isFollowing, reqStatus] = await Promise.all([
            checkIsFollowing(currentUser.id, user.id),
            getFriendRequestStatus(currentUser.id, user.id)
          ]);
          return { ...user, isFollowing, reqStatus };
        }));
        setTrending(enriched);
      } else {
        setTrending(data);
      }
      setLoadingTrending(false);
    };

    loadTrending();
  }, [currentUser?.id]);

  // Keep URL search params in sync with query
  useEffect(() => {
    const q = searchParams.get('q') || '';
    if (q !== query) {
      setQuery(q);
    }
  }, [searchParams]);

  // Debounced search trigger
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearchParams({});
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      setSearchParams({ q: query.trim() });
      const data = await searchUsers(query.trim());
      
      // Enrich search results with relationship status
      const enriched = await Promise.all(data.map(async (user) => {
        if (user.id === currentUser?.id) return { ...user, isSelf: true };
        const [isFollowing, reqStatus] = await Promise.all([
          currentUser ? checkIsFollowing(currentUser.id, user.id) : Promise.resolve(false),
          currentUser ? getFriendRequestStatus(currentUser.id, user.id) : Promise.resolve(null)
        ]);
        return { ...user, isFollowing, reqStatus };
      }));
      
      setResults(enriched);
      setLoading(false);
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query, currentUser?.id, setSearchParams]);

  const handleFollowToggle = async (user, isSearchResult = true) => {
    if (!currentUser) {
      navigate('/auth');
      return;
    }

    const success = user.isFollowing 
      ? await unfollowUser(currentUser.id, user.id)
      : await followUser(currentUser.id, user.id);

    if (success) {
      addToast(user.isFollowing ? `Unfollowed ${user.display_name}` : `Following ${user.display_name}`, 'success');
      
      const updateFn = (list) => list.map(u => u.id === user.id ? { ...u, isFollowing: !u.isFollowing } : u);
      if (isSearchResult) {
        setResults(updateFn);
      } else {
        setTrending(updateFn);
      }
    } else {
      addToast('Failed to update follow status.', 'error');
    }
  };

  const handleFriendAction = async (user, isSearchResult = true) => {
    if (!currentUser) {
      navigate('/auth');
      return;
    }

    const status = user.reqStatus?.status;
    const isSender = user.reqStatus?.sender_id === currentUser.id;
    let success = false;
    let toastMsg = '';

    if (!user.reqStatus) {
      // Send Request
      success = await sendFriendRequest(currentUser.id, user.id);
      if (success) toastMsg = 'Friend request sent!';
    } else if (status === 'pending') {
      if (isSender) {
        // Cancel Request
        success = await cancelFriendRequest(currentUser.id, user.id);
        if (success) toastMsg = 'Friend request cancelled.';
      } else {
        // Accept Request
        success = await acceptFriendRequest(user.reqStatus.id, user.reqStatus.sender_id, currentUser.id);
        if (success) toastMsg = 'Friend request accepted!';
      }
    } else if (status === 'accepted') {
      // Remove friend
      if (window.confirm(`Are you sure you want to remove ${user.display_name} as friend?`)) {
        success = await removeFriend(currentUser.id, user.id);
        if (success) toastMsg = 'Friend removed.';
      } else {
        return;
      }
    }

    if (success) {
      if (toastMsg) addToast(toastMsg, 'success');
      const refreshedStatus = await getFriendRequestStatus(currentUser.id, user.id);
      const updateFn = (list) => list.map(u => u.id === user.id ? { ...u, reqStatus: refreshedStatus } : u);
      if (isSearchResult) {
        setResults(updateFn);
      } else {
        setTrending(updateFn);
      }
    } else {
      addToast('Failed to perform friend action.', 'error');
    }
  };

  const renderUserCard = (user, isSearchResult = true) => {
    const isPending = user.reqStatus?.status === 'pending';
    const isFriends = user.reqStatus?.status === 'accepted';
    
    return (
      <div 
        key={user.id} 
        className="premium-glass-card rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:border-brand-orange/20"
      >
        {/* Profile Details */}
        <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
          <div className="w-14 h-14 rounded-2xl bg-brand-dark overflow-hidden flex items-center justify-center border border-brand-orange/20 shrink-0">
            {user.photo ? (
              <img src={user.photo} alt={user.display_name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-slate-600" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5 justify-center sm:justify-start">
              {user.display_name}
              {user.current_streak > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-red-500 font-bold bg-red-500/10 px-1.5 py-0.5 rounded-md">
                  <Flame className="w-3.5 h-3.5 fill-red-500" /> {user.current_streak}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 font-semibold">@{user.username}</p>
            
            {user.fitness_goal && (
              <p className="text-[10px] text-brand-orange font-bold uppercase tracking-wider mt-1 max-w-sm line-clamp-1">
                Goal: {user.fitness_goal}
              </p>
            )}
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {/* Stats indicators */}
          <div className="flex gap-2 mr-2">
            <div className="px-2.5 py-1 bg-brand-dark/60 rounded-xl border border-brand-border/60 text-center">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest font-mono">Points</p>
              <p className="text-xs font-black text-brand-orange">{(user.reward_points || 0).toLocaleString()}</p>
            </div>
            <div className="px-2.5 py-1 bg-brand-dark/60 rounded-xl border border-brand-border/60 text-center">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest font-mono">Workouts</p>
              <p className="text-xs font-black text-white">{user.total_workouts || 0}</p>
            </div>
          </div>

          {/* Profile View button */}
          <button 
            onClick={() => navigate(`/user/${user.id}`)}
            className="p-2.5 rounded-xl border border-brand-border bg-brand-dark text-slate-300 hover:text-white hover:bg-brand-border transition-all"
            title="View Profile"
          >
            <Eye className="w-4 h-4" />
          </button>

          {!user.isSelf && currentUser && (
            <>
              {/* Friend Button */}
              {(!user.reqStatus || user.reqStatus.status === 'rejected') ? (
                <button
                  onClick={() => handleFriendAction(user, isSearchResult)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Add Friend
                </button>
              ) : isPending ? (
                user.reqStatus.sender_id === currentUser?.id ? (
                  <button
                    onClick={() => handleFriendAction(user, isSearchResult)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-red-900/20 hover:text-red-400 border border-slate-700 rounded-xl text-xs font-bold transition-all"
                    title="Cancel pending request"
                  >
                    <UserCheck className="w-3.5 h-3.5" /> Cancel Request
                  </button>
                ) : (
                  <button
                    onClick={() => handleFriendAction(user, isSearchResult)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                  >
                    <UserCheck className="w-3.5 h-3.5" /> Accept Request
                  </button>
                )
              ) : isFriends ? (
                <button
                  onClick={() => handleFriendAction(user, isSearchResult)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500/10 hover:bg-red-500/10 hover:text-red-400 border border-indigo-500/20 text-indigo-400 rounded-xl text-xs font-bold transition-all"
                  title="Click to remove friend"
                >
                  <UserCheck className="w-3.5 h-3.5" /> Friends
                </button>
              ) : null}

              {/* Follow Button */}
              <button
                onClick={() => handleFollowToggle(user, isSearchResult)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                  user.isFollowing
                    ? 'border-brand-orange/30 text-brand-orange bg-brand-orange/5 hover:bg-brand-orange/10'
                    : 'bg-brand-orange hover:bg-[#ff8f4d] text-white shadow-md active:scale-95 border-transparent'
                }`}
              >
                {user.isFollowing ? 'Following' : 'Follow'}
              </button>
            </>
          )}

          {user.isSelf && (
            <span className="px-3 py-1.5 bg-brand-orange/10 border border-brand-orange/20 text-brand-orange rounded-xl text-xs font-bold select-none">
              You
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-transparent p-4 md:p-6 flex flex-col items-center">
      <div className="max-w-3xl w-full space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Search <span className="text-brand-orange">Athletes</span></h1>
          <p className="text-slate-400 text-xs font-semibold tracking-wider uppercase mt-1">Find and connect with fitness friends globally.</p>
        </div>

        {/* Search Input */}
        <div className="relative flex items-center w-full">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username or display name..."
            className="w-full bg-brand-dark border border-brand-border text-white rounded-2xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-brand-orange/50 focus:ring-2 focus:ring-brand-orange/5 transition-all placeholder:text-slate-600 text-sm shadow-inner"
          />
          <Search className="absolute left-4 w-5 h-5 text-slate-500" />
        </div>

        {/* Results List */}
        <div className="space-y-4">
          {loading && (
            <div className="space-y-3">
              <SkeletonLoader type="userCard" count={3} />
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="premium-glass-card rounded-2xl p-8 text-center">
              <p className="text-slate-500 text-sm font-semibold">No athletes found matching "{query}"</p>
            </div>
          )}

          {/* Search Results */}
          {!loading && results.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Search Results</h3>
              {results.map(user => renderUserCard(user, true))}
            </div>
          )}

          {/* Trending Athletes (When not searching) */}
          {!loading && !query && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pl-1">
                <Sparkles className="w-4 h-4 text-brand-orange" />
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Trending Athletes</h3>
              </div>
              
              {loadingTrending ? (
                <div className="space-y-3">
                  <SkeletonLoader type="userCard" count={4} />
                </div>
              ) : trending.length > 0 ? (
                <div className="space-y-3">
                  {trending.map(user => renderUserCard(user, false))}
                </div>
              ) : (
                <p className="text-slate-500 text-xs text-center py-4">No trending athletes found.</p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default SearchUsers;
