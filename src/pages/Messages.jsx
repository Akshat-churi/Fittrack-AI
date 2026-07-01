import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Send, User, MessageSquare, Trophy, Sword } from 'lucide-react';
import { getCurrentUser } from '../utils/auth';
import {
  getFriendsList, fetchMessages, sendMessage, markMessagesRead,
  getUnreadMessageCount, fetchPublicProfile,
} from '../utils/supabaseBridge';
import { supabase } from '../utils/supabaseClient';
import { useToast } from '../components/Toast';
import EmojiPicker from '../components/EmojiPicker';
import SkeletonLoader from '../components/SkeletonLoader';
import { logEvent } from '../utils/analytics';

// ─── Relative time ───────────────────────────────────────────────────────────
const relTime = (iso) => {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return d.toLocaleDateString('en-GB', { weekday: 'short' });
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const Messages = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const { addToast } = useToast();

  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeExercise, setChallengeExercise] = useState('pushups');
  const [challengeTarget, setChallengeTarget] = useState(20);

  const endRef = useRef(null);
  const channelRef = useRef(null);

  const scrollToBottom = () => endRef.current?.scrollIntoView({ behavior: 'smooth' });

  // Load friends
  useEffect(() => {
    if (!currentUser) return;
    const load = async () => {
      setFriendsLoading(true);
      const list = await getFriendsList(currentUser.id);
      setFriends(list);
      setFriendsLoading(false);

      // Load unread counts
      const counts = {};
      await Promise.all(list.map(async (f) => {
        counts[f.id] = await getUnreadMessageCount(currentUser.id, f.id);
      }));
      setUnreadCounts(counts);

      // Set partner from URL
      const partnerId = searchParams.get('partner');
      if (partnerId) {
        const partner = list.find(f => f.id === partnerId);
        if (partner) {
          setActivePartner(partner);
        } else {
          // Might not be a friend but URL was opened — load full profile
          const prof = await fetchPublicProfile(partnerId, currentUser.id);
          if (prof) setActivePartner(prof);
        }
      }
    };
    load();
  }, [currentUser?.id]);

  // Load messages when partner changes
  useEffect(() => {
    if (!currentUser || !activePartner) {
      setMessages([]);
      return;
    }

    const load = async () => {
      setMessagesLoading(true);
      const data = await fetchMessages(currentUser.id, activePartner.id);
      setMessages(data);
      setMessagesLoading(false);
      setTimeout(scrollToBottom, 80);

      // Mark as read
      await markMessagesRead(activePartner.id, currentUser.id);
      setUnreadCounts(prev => ({ ...prev, [activePartner.id]: 0 }));
    };

    load();

    // Real-time subscription for this conversation
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    channelRef.current = supabase
      .channel(`chat_${currentUser.id}_${activePartner.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${currentUser.id}`,
      }, (payload) => {
        const msg = payload.new;
        if (msg.sender_id === activePartner.id) {
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          setTimeout(scrollToBottom, 50);
          markMessagesRead(activePartner.id, currentUser.id);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${currentUser.id}`,
      }, (payload) => {
        const msg = payload.new;
        if (msg.receiver_id === activePartner.id) {
          setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read_at: msg.read_at } : m));
        }
      })
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [activePartner?.id, currentUser?.id]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || !activePartner || sending) return;

    setSending(true);
    const msg = await sendMessage({
      senderId: currentUser.id,
      receiverId: activePartner.id,
      text: inputText.trim(),
    });
    setSending(false);

    if (msg) {
      setMessages(prev => [...prev, msg]);
      setInputText('');
      setTimeout(scrollToBottom, 50);
    } else {
      addToast('Failed to send message.', 'error');
    }
  };

  const handleShareProgress = async () => {
    if (!activePartner) return;
    const history = JSON.parse(localStorage.getItem('fittrack_history') || '[]');
    const points = parseInt(localStorage.getItem('fittrack_points') || '0', 10);

    const msg = await sendMessage({
      senderId: currentUser.id,
      receiverId: activePartner.id,
      sharedProgress: { workouts: history.length, points, calories: history.reduce((s, h) => s + (h.caloriesBurned || 0), 0) },
    });
    if (msg) {
      setMessages(prev => [...prev, msg]);
      setTimeout(scrollToBottom, 50);
    }
  };

  const handleSendChallenge = async () => {
    const label = challengeExercise === 'pushups' ? 'Push-ups' : 'Squats';
    const msg = await sendMessage({
      senderId: currentUser.id,
      receiverId: activePartner.id,
      challengeInvite: { exercise: label, slug: challengeExercise, target: challengeTarget },
    });
    if (msg) {
      setMessages(prev => [...prev, msg]);
      setShowChallengeModal(false);
      setTimeout(scrollToBottom, 50);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <button onClick={() => navigate('/auth')} className="px-6 py-3 bg-brand-orange text-white rounded-xl font-bold">Sign In</button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-6 flex justify-center">
      <div className="max-w-5xl w-full flex premium-glass-card rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 7rem)' }}>

        {/* Friend List */}
        <div className="w-72 border-r border-brand-border/40 flex flex-col shrink-0">
          <div className="p-4 border-b border-brand-border/40">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-brand-orange" /> Messages
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {friendsLoading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonLoader key={i} type="messageFriend" count={1} />)
            ) : friends.length === 0 ? (
              <div className="p-4 text-[11px] text-slate-500 font-semibold text-center leading-relaxed">
                Add friends to start chatting.
              </div>
            ) : (
              friends.map(friend => {
                const isActive = activePartner?.id === friend.id;
                const unread = unreadCounts[friend.id] || 0;
                return (
                  <button
                    key={friend.id}
                    onClick={() => setActivePartner(friend)}
                    className={`w-full p-4 flex items-center gap-3 transition-all text-left ${
                      isActive ? 'bg-brand-orange/15' : 'hover:bg-brand-surface/40'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-brand-dark overflow-hidden flex items-center justify-center border border-brand-orange/20">
                        {friend.photo
                          ? <img src={friend.photo} alt="" className="w-full h-full object-cover" />
                          : <User className="w-5 h-5 text-slate-600" />}
                      </div>
                      {unread > 0 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-black text-white">
                          {unread > 9 ? '9+' : unread}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold leading-tight truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                        {friend.display_name}
                      </p>
                      <p className="text-[10px] text-slate-500 font-semibold truncate">@{friend.username}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {activePartner ? (
            <>
              {/* Chat header */}
              <div className="p-4 border-b border-brand-border/40 flex items-center justify-between bg-brand-surface/20 shrink-0">
                <button className="flex items-center gap-3" onClick={() => navigate(`/user/${activePartner.id}`)}>
                  <div className="w-9 h-9 rounded-xl overflow-hidden border border-brand-orange/20 shrink-0">
                    {activePartner.photo
                      ? <img src={activePartner.photo} alt="" className="w-full h-full object-cover" />
                      : <User className="w-5 h-5 text-slate-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{activePartner.display_name}</p>
                    <p className="text-[10px] text-slate-500 font-semibold">@{activePartner.username}</p>
                  </div>
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messagesLoading ? (
                  <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-brand-orange" /></div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className="w-10 h-10 text-slate-700 mb-3" />
                    <p className="text-sm font-bold text-white">No messages yet</p>
                    <p className="text-xs text-slate-500 mt-1">Say hi to {activePartner.display_name}! 👋</p>
                  </div>
                ) : messages.map(msg => {
                  const isMe = msg.sender_id === currentUser.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                        isMe ? 'bg-brand-orange text-white rounded-tr-sm' : 'bg-slate-800 border border-slate-700 text-white rounded-tl-sm'
                      }`}>
                        {/* Standard text */}
                        {msg.message_text && <p className="text-xs font-semibold leading-relaxed">{msg.message_text}</p>}

                        {/* Shared Progress */}
                        {msg.shared_progress && (
                          <div className="bg-black/20 rounded-xl p-3 space-y-1 mt-1 text-center">
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-70">🏆 Progress Shared</p>
                            <div className="flex justify-around text-center">
                              <div><p className="text-[8px] opacity-60">Points</p><p className="text-xs font-black">{msg.shared_progress.points?.toLocaleString()}</p></div>
                              <div><p className="text-[8px] opacity-60">Workouts</p><p className="text-xs font-black">{msg.shared_progress.workouts}</p></div>
                              <div><p className="text-[8px] opacity-60">Calories</p><p className="text-xs font-black">{Math.round(msg.shared_progress.calories || 0)}</p></div>
                            </div>
                          </div>
                        )}

                        {/* Challenge Invite */}
                        {msg.challenge_invite && (
                          <div className="bg-red-900/40 border border-red-500/30 rounded-xl p-3 mt-1 text-center space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-red-400">⚔️ Challenge</p>
                            <p className="text-sm font-black text-white">{msg.challenge_invite.target} {msg.challenge_invite.exercise}</p>
                            {!isMe && (
                              <button
                                onClick={() => {
                                  logEvent('challenge_joined', { exercise: msg.challenge_invite.exercise, target: msg.challenge_invite.target });
                                  localStorage.setItem('fittrack_active_challenge', JSON.stringify({ exercise: msg.challenge_invite.exercise, target: msg.challenge_invite.target }));
                                  navigate(`/workout/${msg.challenge_invite.slug}`);
                                }}
                                className="w-full py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                              >
                                Accept Challenge
                              </button>
                            )}
                          </div>
                        )}

                        {isMe ? (
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="text-[8px] text-white/60 font-semibold">{relTime(msg.created_at)}</span>
                            <span className={`text-[10px] font-black leading-none ${msg.read_at ? 'text-sky-300' : 'text-white/40'}`} title={msg.read_at ? 'Read' : 'Sent'}>
                              {msg.read_at ? '✓✓' : '✓'}
                            </span>
                          </div>
                        ) : (
                          <p className="text-[8px] mt-1 text-slate-500 text-left font-semibold">
                            {relTime(msg.created_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-brand-border/40 bg-brand-surface/20 space-y-2 shrink-0">
                <div className="flex gap-2">
                  <button
                    onClick={handleShareProgress}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-orange/10 border border-brand-orange/20 text-brand-orange font-bold text-[10px] uppercase tracking-wide hover:bg-brand-orange/20 transition-all"
                  >
                    <Trophy className="w-3.5 h-3.5" /> Share Progress
                  </button>
                  <button
                    onClick={() => setShowChallengeModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-[10px] uppercase tracking-wide hover:bg-red-500/20 transition-all"
                  >
                    <Sword className="w-3.5 h-3.5" /> Challenge
                  </button>
                </div>
                <form onSubmit={handleSend} className="flex items-center gap-2">
                  <div className="flex-1 relative flex items-center">
                    <input
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      placeholder={`Message ${activePartner.display_name}...`}
                      className="w-full bg-brand-dark border border-brand-border text-white rounded-xl pl-4 pr-10 py-3 text-sm focus:outline-none focus:border-brand-orange/50"
                    />
                    <div className="absolute right-2">
                      <EmojiPicker onSelect={e => setInputText(prev => prev + e)} />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    className="p-3 bg-brand-orange text-white rounded-xl disabled:opacity-30 hover:bg-[#ff8f4d] transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <div className="p-4 bg-brand-surface/20 border border-brand-border/40 rounded-2xl mb-4">
                <MessageSquare className="w-8 h-8 text-slate-600" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Select a Conversation</h3>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed font-semibold">
                Choose a friend from the list to start messaging, share workouts, or send challenges.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Challenge Modal */}
      {showChallengeModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="premium-glass-card max-w-xs w-full rounded-2xl p-6 border border-red-500/20">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Sword className="w-5 h-5 text-red-500" /> Create Challenge
            </h3>
            <div className="space-y-4">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Exercise
                <select value={challengeExercise} onChange={e => setChallengeExercise(e.target.value)} className="mt-1.5 w-full bg-brand-dark border border-brand-border rounded-xl text-white py-2.5 px-4 text-sm focus:outline-none">
                  <option value="pushups">Push-ups</option>
                  <option value="squats">Squats</option>
                </select>
              </label>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Target Reps
                <input type="number" min="5" max="500" value={challengeTarget} onChange={e => setChallengeTarget(parseInt(e.target.value) || 20)} className="mt-1.5 w-full bg-brand-dark border border-brand-border rounded-xl text-white py-2.5 px-4 text-sm focus:outline-none" />
              </label>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowChallengeModal(false)} className="flex-1 py-2.5 bg-brand-dark border border-brand-border rounded-xl text-slate-400 font-bold text-xs hover:text-white transition-all">Cancel</button>
                <button onClick={handleSendChallenge} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-xs transition-all">Send ⚔️</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
