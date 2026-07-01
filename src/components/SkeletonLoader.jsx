import React from 'react';

/**
 * Reusable skeleton loading cards.
 * Usage: <SkeletonLoader type="post" count={3} />
 */

const pulse = 'skeleton';

const PostSkeleton = () => (
  <div className="premium-glass-card rounded-2xl overflow-hidden border border-brand-border/40">
    <div className="p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${pulse}`} />
      <div className="flex-1 space-y-1.5">
        <div className={`h-3 w-32 ${pulse}`} />
        <div className={`h-2.5 w-24 ${pulse}`} />
      </div>
    </div>
    <div className={`w-full h-64 ${pulse} rounded-none`} />
    <div className="p-5 space-y-3">
      <div className={`h-3 w-full ${pulse}`} />
      <div className={`h-3 w-4/5 ${pulse}`} />
      <div className="flex gap-4 pt-2">
        <div className={`h-4 w-16 ${pulse}`} />
        <div className={`h-4 w-20 ${pulse}`} />
      </div>
    </div>
  </div>
);

const UserCardSkeleton = () => (
  <div className="premium-glass-card rounded-2xl p-4 flex items-center justify-between gap-4 border border-brand-border/40">
    <div className="flex items-center gap-3">
      <div className={`w-14 h-14 rounded-2xl ${pulse}`} />
      <div className="space-y-1.5">
        <div className={`h-3 w-28 ${pulse}`} />
        <div className={`h-2.5 w-20 ${pulse}`} />
        <div className={`h-2 w-36 ${pulse}`} />
      </div>
    </div>
    <div className="flex gap-2">
      <div className={`w-20 h-9 rounded-xl ${pulse}`} />
      <div className={`w-20 h-9 rounded-xl ${pulse}`} />
    </div>
  </div>
);

const ProfileStatSkeleton = () => (
  <div className="premium-glass-card rounded-2xl p-4 text-center border border-brand-border/40 space-y-2">
    <div className={`w-5 h-5 mx-auto ${pulse} rounded-full`} />
    <div className={`h-6 w-12 mx-auto ${pulse}`} />
    <div className={`h-2 w-16 mx-auto ${pulse}`} />
  </div>
);

const NotificationSkeleton = () => (
  <div className="premium-glass-card rounded-2xl p-4 flex items-center gap-4 border border-brand-border/40">
    <div className={`w-11 h-11 rounded-xl shrink-0 ${pulse}`} />
    <div className="flex-1 space-y-1.5">
      <div className={`h-3 w-3/4 ${pulse}`} />
      <div className={`h-2.5 w-1/2 ${pulse}`} />
    </div>
  </div>
);

const LeaderboardRowSkeleton = () => (
  <tr>
    <td className="py-4 px-6"><div className={`h-4 w-6 mx-auto ${pulse}`} /></td>
    <td className="py-4 px-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl shrink-0 ${pulse}`} />
        <div className="space-y-1">
          <div className={`h-3 w-24 ${pulse}`} />
          <div className={`h-2 w-16 ${pulse}`} />
        </div>
      </div>
    </td>
    <td className="py-4 px-4"><div className={`h-3 w-8 mx-auto ${pulse}`} /></td>
    <td className="py-4 px-4"><div className={`h-3 w-16 mx-auto ${pulse}`} /></td>
    <td className="py-4 px-4"><div className={`h-3 w-8 mx-auto ${pulse}`} /></td>
    <td className="py-4 px-6"><div className={`h-4 w-16 ml-auto ${pulse}`} /></td>
  </tr>
);

const MessageFriendSkeleton = () => (
  <div className="p-4 flex items-center gap-3">
    <div className={`w-10 h-10 rounded-xl shrink-0 ${pulse}`} />
    <div className="flex-1 hidden sm:block space-y-1">
      <div className={`h-3 w-24 ${pulse}`} />
      <div className={`h-2 w-16 ${pulse}`} />
    </div>
  </div>
);

const SKELETON_TYPES = {
  post: PostSkeleton,
  userCard: UserCardSkeleton,
  profileStat: ProfileStatSkeleton,
  notification: NotificationSkeleton,
  leaderboardRow: LeaderboardRowSkeleton,
  messageFriend: MessageFriendSkeleton,
};

const SkeletonLoader = ({ type = 'post', count = 3 }) => {
  const Component = SKELETON_TYPES[type] || PostSkeleton;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Component key={i} />
      ))}
    </>
  );
};

export default SkeletonLoader;
