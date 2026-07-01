import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Globe, Search, MessageSquare, Bookmark, Bell } from 'lucide-react';
import SocialFeed    from './SocialFeed';
import SearchUsers   from './SearchUsers';
import Messages      from './Messages';
import SavedPosts    from './SavedPosts';
import Notifications from './Notifications';
import { getCurrentUser } from '../utils/auth';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';

const TABS = [
  { id: 'feed',          label: 'Feed',    icon: Globe },
  { id: 'search',        label: 'Search',  icon: Search },
  { id: 'messages',      label: 'Chat',    icon: MessageSquare },
  { id: 'saved',         label: 'Saved',   icon: Bookmark },
  { id: 'notifications', label: 'Alerts',  icon: Bell },
];

export default function Social() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    TABS.find(t => t.id === tabFromUrl) ? tabFromUrl : 'feed'
  );

  const [unreadNotifs, setUnreadNotifs]  = useState(0);
  const [unreadMsgs,   setUnreadMsgs]    = useState(0);

  /* sync tab → URL */
  const switchTab = (id) => {
    setActiveTab(id);
    setSearchParams({ tab: id }, { replace: true });
  };

  /* keep URL in sync if user navigates back/forward */
  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && TABS.find(x => x.id === t) && t !== activeTab) setActiveTab(t);
  }, [searchParams]);

  /* unread counts */
  useEffect(() => {
    if (!currentUser || !isSupabaseConfigured()) return;

    const loadCounts = async () => {
      try {
        const [{ count: nc }, { count: mc }] = await Promise.all([
          supabase.from('notifications').select('*', { count: 'exact', head: true }).match({ receiver_id: currentUser.id, read: false }),
          supabase.from('messages').select('*', { count: 'exact', head: true }).match({ receiver_id: currentUser.id }).is('read_at', null),
        ]);
        setUnreadNotifs(nc || 0);
        setUnreadMsgs(mc || 0);
      } catch {}
    };
    loadCounts();

    const ch = supabase.channel('social_hub_counts_' + currentUser.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `receiver_id=eq.${currentUser.id}` }, loadCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages',      filter: `receiver_id=eq.${currentUser.id}` }, loadCounts)
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [currentUser?.id]);

  /* clear badge when tab opened */
  useEffect(() => {
    if (activeTab === 'notifications') setUnreadNotifs(0);
    if (activeTab === 'messages')      setUnreadMsgs(0);
  }, [activeTab]);

  const Badge = ({ n }) => n > 0 ? (
    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow">
      {n > 9 ? '9+' : n}
    </span>
  ) : null;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">

      {/* ── Sticky Tab Bar ─────────────────────────────────────────────── */}
      <div className="sticky top-16 z-30 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800/60">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-stretch overflow-x-auto scrollbar-hide">
            {TABS.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              const badge = id === 'notifications' ? unreadNotifs : id === 'messages' ? unreadMsgs : 0;

              return (
                <button
                  key={id}
                  onClick={() => switchTab(id)}
                  className={`relative flex items-center gap-2 px-5 py-4 text-sm font-bold whitespace-nowrap transition-all border-b-2 shrink-0 ${
                    isActive
                      ? 'text-brand-orange border-brand-orange'
                      : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  <span className="relative">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-brand-orange' : ''}`} />
                    <Badge n={badge} />
                  </span>
                  <span>{label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-brand-orange/0 via-brand-orange to-brand-orange/0 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Tab Content ────────────────────────────────────────────────── */}
      <div className="flex-1">
        {activeTab === 'feed'          && <SocialFeed />}
        {activeTab === 'search'        && <SearchUsers />}
        {activeTab === 'messages'      && <Messages />}
        {activeTab === 'saved'         && <SavedPosts />}
        {activeTab === 'notifications' && <Notifications />}
      </div>
    </div>
  );
}
