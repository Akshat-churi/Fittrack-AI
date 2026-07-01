import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Trophy, 
  Flame, 
  Layers, 
  Activity, 
  Award, 
  Zap, 
  Lock, 
  MessageSquare, 
  UserPlus, 
  UserMinus, 
  UserCheck, 
  User, 
  Grid,
  Sparkles
} from 'lucide-react';
import { getCurrentUser } from '../utils/auth';
import { 
  fetchPublicProfile, 
  getUserPosts, 
  followUser, 
  unfollowUser, 
  sendFriendRequest, 
  acceptFriendRequest, 
  removeFriend,
  cancelFriendRequest,
  rejectFriendRequest
} from '../utils/supabaseBridge';
import { BADGES } from '../utils/badgeTracker';
import SkeletonLoader from '../components/SkeletonLoader';
import { useToast } from '../components/Toast';

const PublicProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const currentUser = getCurrentUser();
  
  const targetId = id || currentUser?.id;
  const isOwnProfile = targetId === currentUser?.id;

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'badges' | 'friends'
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const BadgeIconMap = {
    Award: Award,
    Layers: Layers,
    Activity: Activity,
    Zap: Zap,
    Trophy: Trophy,
    Flame: Flame
  };

  const loadProfileData = async () => {
    if (!targetId) return;
    setLoading(true);
    
    const [prof, userPosts] = await Promise.all([
      fetchPublicProfile(targetId, currentUser?.id),
      getUserPosts(targetId, currentUser?.id)
    ]);
    
    setProfile(prof);
    setPosts(userPosts);
    setLoading(false);
  };

  useEffect(() => {
    loadProfileData();
  }, [targetId, currentUser?.id]);

  const handleFollowToggle = async () => {
    if (!currentUser) {
      navigate('/auth');
      return;
    }
    setActionLoading(true);
    const success = profile.isFollowing
      ? await unfollowUser(currentUser.id, profile.id)
      : await followUser(currentUser.id, profile.id);

    setActionLoading(false);
    if (success) {
      addToast(profile.isFollowing ? `Unfollowed ${profile.display_name}` : `Following ${profile.display_name}`, 'success');
      loadProfileData();
    } else {
      addToast('Failed to update follow status.', 'error');
    }
  };

  const handleFriendAction = async () => {
    if (!currentUser) {
      navigate('/auth');
      return;
    }

    setActionLoading(true);
    const status = profile.friendStatus?.status;
    const isSender = profile.friendStatus?.sender_id === currentUser.id;

    if (!profile.friendStatus) {
      // Send Request
      const success = await sendFriendRequest(currentUser.id, profile.id);
      if (success) addToast('Friend request sent!', 'success');
    } else if (status === 'pending') {
      if (isSender) {
        // Cancel Request
        const success = await cancelFriendRequest(currentUser.id, profile.id);
        if (success) addToast('Friend request cancelled.', 'info');
      } else {
        // Accept Request
        const success = await acceptFriendRequest(profile.friendStatus.id, profile.friendStatus.sender_id, currentUser.id);
        if (success) addToast('Friend request accepted!', 'success');
      }
    } else if (status === 'accepted') {
      // Remove friend
      if (window.confirm(`Are you sure you want to remove ${profile.display_name} as friend?`)) {
        const success = await removeFriend(currentUser.id, profile.id);
        if (success) addToast('Friend removed.', 'info');
      }
    }
    setActionLoading(false);
    loadProfileData();
  };

  const handleRejectFriend = async () => {
    if (!currentUser || !profile.friendStatus) return;
    setActionLoading(true);
    const success = await rejectFriendRequest(profile.friendStatus.id);
    setActionLoading(false);
    if (success) {
      addToast('Friend request declined.', 'info');
      loadProfileData();
    } else {
      addToast('Failed to decline friend request.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-transparent p-6 space-y-6">
        {/* Cover Skeleton */}
        <div className="h-64 w-full bg-slate-800 animate-pulse rounded-2xl border border-brand-border/40" />
        <div className="max-w-5xl mx-auto px-4 -mt-16 space-y-6">
          <div className="premium-glass-card rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6">
            <div className="w-32 h-32 rounded-3xl bg-slate-800 animate-pulse border-4 border-slate-900 shrink-0" />
            <div className="space-y-3 flex-1">
              <div className="h-6 w-48 bg-slate-800 animate-pulse rounded" />
              <div className="h-4 w-32 bg-slate-800 animate-pulse rounded" />
              <div className="h-4 w-full bg-slate-800 animate-pulse rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <SkeletonLoader type="profileStat" count={6} />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 text-center">
        <div className="premium-glass-card rounded-2xl p-8 max-w-sm">
          <h2 className="text-xl font-bold text-red-500 mb-2">Profile Not Found</h2>
          <p className="text-slate-400 text-xs leading-relaxed mb-4">This athlete does not exist or has not synchronized their local profile yet.</p>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-brand-orange text-white rounded-xl text-xs font-bold">Return Home</button>
        </div>
      </div>
    );
  }

  // Display badges from database (or fall back to local badges for own profile)
  const unlockedBadges = profile.badges || [];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-transparent">
      
      {/* Cover Photo */}
      <div className="h-44 sm:h-64 w-full bg-gradient-to-r from-brand-orange/20 via-brand-dark to-indigo-500/20 relative border-b border-brand-border overflow-hidden">
        {profile.cover_photo ? (
          <img src={profile.cover_photo} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-brand-dark/40 flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-slate-700/50 animate-pulse" />
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-16 sm:-mt-24 pb-12 space-y-6 relative z-10">
        
        {/* User Card */}
        <div className="premium-glass-card rounded-2xl p-6 flex flex-col md:flex-row items-center md:items-end justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
            {/* Avatar */}
            <div className="w-32 h-32 rounded-3xl overflow-hidden bg-brand-dark border-4 border-slate-900 shadow-2xl flex items-center justify-center shrink-0">
              {profile.photo ? (
                <img src={profile.photo} alt={profile.display_name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-slate-600" />
              )}
            </div>
            {/* Profile Info */}
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2 justify-center md:justify-start">
                {profile.display_name}
                {profile.current_streak > 0 && (
                  <span className="flex items-center gap-0.5 text-xs text-red-500 font-bold bg-red-500/10 px-2 py-0.5 rounded-lg">
                    <Flame className="w-4 h-4 fill-red-500" /> {profile.current_streak}
                  </span>
                )}
              </h2>
              <p className="text-sm text-slate-400 font-semibold">@{profile.username}</p>
              {profile.bio && <p className="text-slate-300 text-xs font-semibold max-w-md pt-2 leading-relaxed">{profile.bio}</p>}
              {profile.fitness_goal && (
                <p className="text-[10px] text-brand-orange font-bold uppercase tracking-wider pt-1.5 flex items-center gap-1.5 justify-center md:justify-start">
                  <Sparkles className="w-3 h-3" /> Focus: {profile.fitness_goal}
                </p>
              )}
            </div>
          </div>

          {/* Social Interaction Buttons */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-center">
            {isOwnProfile ? (
              <button
                onClick={() => navigate('/profile')}
                className="w-full md:w-auto px-5 py-3 rounded-xl bg-brand-orange hover:bg-[#ff8f4d] text-white font-bold text-xs transition-all active:scale-95 shadow-md"
              >
                Edit Profile
              </button>
            ) : (
              <>
                {/* Friend Button */}
                {profile.friendStatus?.status === 'pending' && profile.friendStatus.sender_id !== currentUser?.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleFriendAction}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95 border-transparent"
                    >
                      <UserCheck className="w-4 h-4" /> Accept
                    </button>
                    <button
                      onClick={handleRejectFriend}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-red-500/20 text-red-400 bg-red-500/5 hover:bg-red-500/10 active:scale-95"
                    >
                      <UserMinus className="w-4 h-4" /> Decline
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleFriendAction}
                    disabled={actionLoading}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                      profile.friendStatus?.status === 'accepted'
                        ? 'border-indigo-500/30 text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10'
                        : profile.friendStatus?.status === 'pending'
                          ? 'border-slate-750 text-slate-400 bg-slate-800'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md active:scale-95 border-transparent'
                    }`}
                  >
                    {profile.friendStatus?.status === 'accepted' ? (
                      <><UserCheck className="w-4 h-4" /> Friends</>
                    ) : profile.friendStatus?.status === 'pending' ? (
                      'Request Sent'
                    ) : (
                      <><UserPlus className="w-4 h-4" /> Add Friend</>
                    )}
                  </button>
                )}

                {/* Follow Button */}
                <button
                  onClick={handleFollowToggle}
                  disabled={actionLoading}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                    profile.isFollowing
                      ? 'border-brand-orange/30 text-brand-orange bg-brand-orange/5 hover:bg-brand-orange/10'
                      : 'bg-brand-orange hover:bg-[#ff8f4d] text-white shadow-md active:scale-95 border-transparent'
                  }`}
                >
                  {profile.isFollowing ? 'Following' : 'Follow'}
                </button>

                {/* Direct Message button */}
                <button 
                  onClick={() => navigate(`/messages?partner=${profile.id}`)}
                  className="p-2.5 rounded-xl border border-brand-border bg-brand-dark text-slate-300 hover:text-white hover:bg-brand-border transition-all"
                  title="Direct Message"
                >
                  <MessageSquare className="w-4.5 h-4.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Global Statistics Summary Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="premium-glass-card rounded-2xl p-4 text-center border border-brand-border/40 hover:border-brand-orange/20 transition-all">
            <Trophy className="w-5 h-5 text-brand-orange mx-auto mb-1.5" />
            <p className="text-xl font-black text-white">{(profile.reward_points || 0).toLocaleString()}</p>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Points</p>
          </div>
          <div className="premium-glass-card rounded-2xl p-4 text-center border border-brand-border/40 hover:border-red-500/20 transition-all">
            <Flame className="w-5 h-5 text-red-500 mx-auto mb-1.5" />
            <p className="text-xl font-black text-white">{(profile.calories_burned || 0).toLocaleString()}</p>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Calories</p>
          </div>
          <div className="premium-glass-card rounded-2xl p-4 text-center border border-brand-border/40 hover:border-indigo-500/20 transition-all">
            <Layers className="w-5 h-5 text-indigo-400 mx-auto mb-1.5" />
            <p className="text-xl font-black text-white">{profile.total_workouts || 0}</p>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Workouts</p>
          </div>
          <div className="premium-glass-card rounded-2xl p-4 text-center border border-brand-border/40 hover:border-emerald-500/20 transition-all">
            <Flame className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
            <p className="text-xl font-black text-white">{profile.longest_streak || 0} Days</p>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Longest Streak</p>
          </div>
          <div className="premium-glass-card rounded-2xl p-4 text-center border border-brand-border/40">
            <p className="text-xl font-black text-white">{profile.followersCount}</p>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Followers</p>
          </div>
          <div className="premium-glass-card rounded-2xl p-4 text-center border border-brand-border/40">
            <p className="text-xl font-black text-white">{profile.friendsCount}</p>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Friends</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-brand-border/40 pb-px">
          {['posts', 'badges', 'friends'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all -mb-px ${
                activeTab === tab
                  ? 'border-brand-orange text-brand-orange'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {tab} ({tab === 'posts' ? posts.length : tab === 'badges' ? unlockedBadges.length : profile.friendsCount})
            </button>
          ))}
        </div>

        {/* Tab content panels */}
        <div>
          {/* Post Tab Grid */}
          {activeTab === 'posts' && (
            posts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {posts.map((post) => (
                  <div 
                    key={post.id} 
                    onClick={() => navigate('/feed')}
                    className="aspect-square premium-glass-card rounded-2xl overflow-hidden cursor-pointer group relative border border-brand-border/40 hover:border-brand-orange/30"
                  >
                    {post.post_media?.[0] ? (
                      post.post_media[0].media_type === 'video' ? (
                        <video src={post.post_media[0].media_url} className="w-full h-full object-cover" muted playsInline />
                      ) : (
                        <img src={post.post_media[0].media_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      )
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                        <Activity className="w-8 h-8 text-brand-orange mb-1.5" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">{post.exercise_type || 'Workout'}</span>
                        <span className="text-[9px] font-black text-slate-500 mt-0.5">{post.reps} Reps</span>
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-center gap-1">
                      <span className="text-white text-sm font-black">{post.likesCount} Likes</span>
                      <span className="text-slate-300 text-xs font-semibold">{post.commentsCount} Comments</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="premium-glass-card rounded-2xl p-12 text-center">
                <Grid className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm font-semibold">No posts uploaded yet.</p>
              </div>
            )
          )}

          {/* Badges Tab Panel */}
          {activeTab === 'badges' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {BADGES.map(badge => {
                // unlockedBadges has elements like { id: 'first_workout', unlockedAt: ... }
                const unlockedInfo = unlockedBadges.find(u => u.id === badge.id);
                const isUnlocked = !!unlockedInfo;
                const Icon = BadgeIconMap[badge.icon] || Award;

                return (
                  <div 
                    key={badge.id}
                    className={`border rounded-2xl p-4 flex gap-4 items-start transition-all relative overflow-hidden group ${
                      isUnlocked 
                        ? `${badge.color} border-brand-orange/20` 
                        : 'border-brand-border/40 bg-brand-dark/20 opacity-40'
                    }`}
                  >
                    <div className={`p-3 rounded-xl border shrink-0 relative ${
                      isUnlocked 
                        ? 'border-brand-orange/20 bg-brand-orange/10 text-brand-orange shadow-[0_0_15px_rgba(255,126,51,0.08)]' 
                        : 'border-brand-border bg-brand-surface text-slate-600'
                    }`}>
                      {isUnlocked ? <Icon className="w-6 h-6 animate-pulse" /> : <Lock className="w-6 h-6" />}
                    </div>

                    <div className="space-y-1 z-10">
                      <h4 className={`text-sm font-bold tracking-tight ${isUnlocked ? 'text-white font-extrabold' : 'text-slate-500'}`}>
                        {badge.name}
                      </h4>
                      <p className="text-[10px] font-semibold text-slate-400 leading-relaxed">
                        {badge.description}
                      </p>
                      {isUnlocked && (
                        <span className="text-[8px] font-bold text-brand-orange/60 uppercase tracking-widest block pt-1">
                          Unlocked {new Date(unlockedInfo.unlockedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Friends Tab Panel */}
          {activeTab === 'friends' && (
            profile.friends && profile.friends.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {profile.friends.map((friend) => (
                  <div 
                    key={friend.id} 
                    onClick={() => navigate(`/user/${friend.id}`)}
                    className="premium-glass-card rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-brand-orange/20 transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-brand-dark overflow-hidden flex items-center justify-center border border-brand-orange/20 shrink-0">
                      {friend.photo ? (
                        <img src={friend.photo} alt={friend.display_name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-slate-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-tight">{friend.display_name}</h4>
                      <p className="text-[10px] text-slate-500 font-semibold">@{friend.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="premium-glass-card rounded-2xl p-12 text-center">
                <User className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm font-semibold font-mono">No friends added to this user's list yet.</p>
              </div>
            )
          )}
        </div>

      </div>
    </div>
  );
};

export default PublicProfile;
