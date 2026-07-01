import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Heart, MessageSquare, UserPlus, UserCheck, Eye, CheckCheck, User, Trash2, X, Check } from 'lucide-react';
import { getCurrentUser } from '../utils/auth';
import { 
  fetchNotifications, 
  markNotificationRead, 
  markAllNotificationsRead, 
  acceptFriendRequest, 
  rejectFriendRequest,
  getFriendRequestStatus,
  deleteNotification,
  deleteAllNotifications
} from '../utils/supabaseBridge';
import { supabase } from '../utils/supabaseClient';
import SkeletonLoader from '../components/SkeletonLoader';
import { useToast } from '../components/Toast';

const Notifications = () => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    if (!currentUser) return;
    setLoading(true);
    const data = await fetchNotifications(currentUser.id);
    setNotifications(data);
    setLoading(false);
    
    // Automatically mark all as read when opening notification page
    await markAllNotificationsRead(currentUser.id);
  };

  useEffect(() => {
    loadNotifications();

    if (!currentUser) return;

    // Realtime notification listener
    const notificationSubscription = supabase
      .channel(`notifs_${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `receiver_id=eq.${currentUser.id}`
        },
        async (payload) => {
          // Fetch complete enriched row with sender profile
          const { data, error } = await supabase
            .from('notifications')
            .select(`
              *,
              sender:profiles!notifications_sender_id_fkey (*)
            `)
            .eq('id', payload.new.id)
            .single();

          if (!error && data) {
            setNotifications(prev => [data, ...prev]);
            // Automatically mark this new one as read since they are on the page
            await markNotificationRead(data.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationSubscription);
    };
  }, [currentUser?.id]);

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    await markAllNotificationsRead(currentUser.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    addToast('All notifications marked as read.', 'success');
  };

  const handleDeleteNotification = async (e, id) => {
    e.stopPropagation();
    const success = await deleteNotification(id);
    if (success) {
      setNotifications(prev => prev.filter(n => n.id !== id));
      addToast('Notification deleted.', 'info');
    } else {
      addToast('Failed to delete notification.', 'error');
    }
  };

  const handleClearAll = async () => {
    if (!currentUser) return;
    if (window.confirm('Are you sure you want to clear all notifications?')) {
      const success = await deleteAllNotifications(currentUser.id);
      if (success) {
        setNotifications([]);
        addToast('All notifications cleared.', 'info');
      } else {
        addToast('Failed to clear notifications.', 'error');
      }
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      await markNotificationRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    }
    
    // Redirect based on type
    if (notif.type === 'follow' || notif.type === 'friend_request' || notif.type === 'friend_accept') {
      navigate(`/user/${notif.sender_id}`);
    } else {
      navigate('/feed');
    }
  };

  const handleAcceptRequest = async (notif) => {
    // We need to fetch the request ID for acceptFriendRequest
    const reqStatus = await getFriendRequestStatus(notif.sender_id, currentUser.id);
    if (reqStatus && reqStatus.status === 'pending') {
      const success = await acceptFriendRequest(reqStatus.id, notif.sender_id, currentUser.id);
      if (success) {
        addToast('Friend request accepted!', 'success');
        // Update notification UI to clear action
        setNotifications(prev => prev.filter(n => n.id !== notif.id));
      } else {
        addToast('Failed to accept request.', 'error');
      }
    } else {
      addToast('No pending request found.', 'warning');
    }
  };

  const handleRejectRequest = async (notif) => {
    const reqStatus = await getFriendRequestStatus(notif.sender_id, currentUser.id);
    if (reqStatus) {
      const success = await rejectFriendRequest(reqStatus.id);
      if (success) {
        addToast('Friend request declined.', 'info');
        setNotifications(prev => prev.filter(n => n.id !== notif.id));
      } else {
        addToast('Failed to decline request.', 'error');
      }
    }
  };

  const getNotificationText = (type) => {
    switch (type) {
      case 'follow':
        return 'started following you.';
      case 'friend_request':
        return 'sent you a friend request.';
      case 'friend_accept':
        return 'accepted your friend request.';
      case 'like':
        return 'liked your workout post.';
      case 'comment':
        return 'commented on your post.';
      case 'mention':
        return 'mentioned you in a post.';
      default:
        return 'interacted with your profile.';
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'follow':
        return <UserCheck className="w-4 h-4 text-sky-400" />;
      case 'friend_request':
        return <UserPlus className="w-4 h-4 text-indigo-400" />;
      case 'friend_accept':
        return <UserCheck className="w-4 h-4 text-emerald-400" />;
      case 'like':
        return <Heart className="w-4 h-4 text-red-500 fill-red-500" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-brand-orange" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  // Group notifications helper
  const groupNotifications = () => {
    const today = [];
    const yesterday = [];
    const older = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

    notifications.forEach(notif => {
      const time = new Date(notif.created_at).getTime();
      if (time >= todayStart) {
        today.push(notif);
      } else if (time >= yesterdayStart) {
        yesterday.push(notif);
      } else {
        older.push(notif);
      }
    });

    return { today, yesterday, older };
  };

  const grouped = groupNotifications();

  const renderSection = (title, items) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">{title}</h3>
        <div className="space-y-3">
          {items.map((notif) => (
            <div 
              key={notif.id}
              className={`premium-glass-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all border ${
                notif.read 
                  ? 'border-brand-border/40 opacity-80' 
                  : 'border-brand-orange/30 bg-brand-orange/5 shadow-[0_0_15px_rgba(255,126,51,0.04)] font-bold text-white'
              }`}
            >
              <div 
                className="flex items-center gap-3.5 cursor-pointer flex-1"
                onClick={() => handleNotificationClick(notif)}
              >
                {/* Sender Avatar */}
                <div className="w-11 h-11 rounded-xl bg-brand-dark overflow-hidden flex items-center justify-center border border-brand-orange/20 shrink-0 relative">
                  {notif.sender?.photo ? (
                    <img src={notif.sender.photo} alt={notif.sender.display_name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-slate-600" />
                  )}
                  {/* Floating mini alert badge icon */}
                  <div className="absolute -bottom-1 -right-1 bg-brand-dark border border-brand-border/80 p-0.5 rounded-md shadow-md">
                    {getNotificationIcon(notif.type)}
                  </div>
                </div>

                <div>
                  <p className="text-xs leading-relaxed text-slate-200">
                    <span className="font-extrabold text-white">{notif.sender?.display_name || 'An athlete'}</span>{' '}
                    {getNotificationText(notif.type)}
                  </p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5 font-bold">
                    {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Inline Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {notif.type === 'friend_request' && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRejectRequest(notif); }}
                      className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all"
                      title="Decline"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAcceptRequest(notif); }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-brand-orange hover:bg-[#ff8f4d] text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                    >
                      <Check className="w-4 h-4" /> Accept
                    </button>
                  </>
                )}
                <button
                  onClick={(e) => handleDeleteNotification(e, notif.id)}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                  title="Delete notification"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-transparent p-4 md:p-6 flex flex-col items-center">
      <div className="max-w-2xl w-full space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Alerts <span className="text-brand-orange">Center</span></h1>
            <p className="text-slate-400 text-xs font-semibold tracking-wider uppercase">Social interactions & progress events.</p>
          </div>
          {notifications.length > 0 && (
            <div className="flex items-center gap-4">
              {notifications.some(n => !n.read) && (
                <button 
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                  <CheckCheck className="w-4.5 h-4.5 text-brand-orange" /> Mark all read
                </button>
              )}
              <button 
                onClick={handleClearAll}
                className="flex items-center gap-1.5 text-xs font-bold text-red-450 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Clear all
              </button>
            </div>
          )}
        </div>

        {/* Notifications list */}
        {loading ? (
          <div className="space-y-4">
            <SkeletonLoader type="notification" count={4} />
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-6">
            {renderSection('Today', grouped.today)}
            {renderSection('Yesterday', grouped.yesterday)}
            {renderSection('Older', grouped.older)}
          </div>
        ) : (
          <div className="premium-glass-card rounded-2xl p-10 text-center border border-brand-border/40">
            <div className="inline-flex items-center justify-center p-4 bg-brand-dark rounded-2xl mb-4 border border-brand-border">
              <Bell className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">All Clear!</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed font-semibold">
              You are completely caught up on your social alerts.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default Notifications;
