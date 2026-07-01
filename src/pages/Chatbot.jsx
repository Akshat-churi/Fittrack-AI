import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Activity, Plus, MessageSquare, Trash2, ChevronRight } from 'lucide-react';

// A simple mock bot logic
const getBotResponse = (message) => {
  const lowerMsg = message.toLowerCase();
  
  if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
    return "Hello there! I'm your AI Fitness Assistant. How can I help you with your health, diet, or workouts today?";
  }
  if (lowerMsg.includes('diet') || lowerMsg.includes('food') || lowerMsg.includes('eat')) {
    return "For a healthy diet, focus on whole foods: lean proteins, plenty of vegetables, complex carbohydrates, and healthy fats. Make sure you're eating in a caloric deficit if you want to lose weight, or a surplus to build muscle. Always stay hydrated!";
  }
  if (lowerMsg.includes('protein')) {
    return "Protein is crucial for muscle recovery. Aim for about 1.6 to 2.2 grams of protein per kilogram of body weight if you're actively training. Good sources include chicken, fish, eggs, tofu, lentils, and Greek yogurt.";
  }
  if (lowerMsg.includes('pushup') || lowerMsg.includes('push-up')) {
    return "Push-ups are fantastic for chest, shoulders, and triceps! Make sure to keep your core tight and your body in a straight line. If standard push-ups are too hard, try knee push-ups or incline push-ups. Check our Fitness Guide section for more details!";
  }
  if (lowerMsg.includes('squat')) {
    return "Squats are the king of lower body exercises. Keep your chest up, push your knees out slightly, and break parallel if your mobility allows it. Want to track your form? Use our AI Squat Tracker from the home page!";
  }
  if (lowerMsg.includes('lose weight') || lowerMsg.includes('fat loss')) {
    return "Weight loss ultimately comes down to a caloric deficit—burning more calories than you consume. Combine a balanced, slightly restricted diet with regular cardiovascular exercise and strength training to preserve muscle mass.";
  }
  if (lowerMsg.includes('muscle') || lowerMsg.includes('build')) {
    return "To build muscle, you need three things: resistance training (progressive overload), adequate protein intake, and sufficient rest/sleep. Aim to train each muscle group 2 times a week.";
  }
  
  return "That's a great question! While I'm just a simulated assistant right now, I highly recommend consulting a certified personal trainer or nutritionist for personalized advice. Is there anything else about workouts or basic nutrition I can help with?";
};

const STORAGE_KEY = 'fitbot_conversations';

const loadConversations = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveConversations = (convos) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(convos));
};

const defaultMessages = () => ([
  {
    id: 1,
    sender: 'bot',
    text: "Hi! I'm FitBot, your AI fitness and nutrition assistant. Ask me anything about workouts, diet, or training!"
  }
]);

const Chatbot = () => {
  const [conversations, setConversations] = useState(() => loadConversations());
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState(defaultMessages());
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Auto-save current chat whenever messages change (only if there's a user message)
  useEffect(() => {
    if (messages.length <= 1) return; // only the welcome message — nothing to save yet
    const hasUser = messages.some(m => m.sender === 'user');
    if (!hasUser) return;

    const title = messages.find(m => m.sender === 'user')?.text?.slice(0, 40) || 'Chat';
    const timestamp = Date.now();

    setConversations(prev => {
      let updated;
      if (activeId) {
        updated = prev.map(c => c.id === activeId ? { ...c, messages, title, timestamp } : c);
      } else {
        const newId = timestamp;
        setActiveId(newId);
        updated = [{ id: newId, title, messages, timestamp }, ...prev];
      }
      saveConversations(updated);
      return updated;
    });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const botResponse = {
        id: Date.now() + 1,
        sender: 'bot',
        text: getBotResponse(userMessage.text)
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  const startNewChat = () => {
    setActiveId(null);
    setMessages(defaultMessages());
    setInput('');
  };

  const openConversation = (convo) => {
    setActiveId(convo.id);
    setMessages(convo.messages);
  };

  const deleteConversation = (e, id) => {
    e.stopPropagation();
    const updated = conversations.filter(c => c.id !== id);
    saveConversations(updated);
    setConversations(updated);
    if (activeId === id) {
      setActiveId(null);
      setMessages(defaultMessages());
    }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-6 bg-transparent flex flex-col items-center">
      <div className="w-full max-w-6xl flex-1 flex gap-4" style={{ minHeight: 'calc(100vh - 8rem)' }}>

        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <div className={`${sidebarOpen ? 'w-64' : 'w-0'} shrink-0 transition-all duration-300 overflow-hidden`}>
          <div className="w-64 h-full flex flex-col premium-glass-card rounded-2xl overflow-hidden">
            {/* Sidebar header */}
            <div className="p-4 border-b border-zinc-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-orange" />
                <span className="text-sm font-bold text-white">Saved Chats</span>
              </div>
              <button
                onClick={startNewChat}
                title="New chat"
                className="w-7 h-7 rounded-lg bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center text-brand-orange hover:bg-brand-orange/20 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
              {conversations.length === 0 ? (
                <div className="text-center py-8 px-3">
                  <MessageSquare className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-xs text-zinc-600 leading-relaxed">Your saved chats will appear here as you talk to FitBot.</p>
                </div>
              ) : (
                conversations.map(convo => (
                  <button
                    key={convo.id}
                    onClick={() => openConversation(convo)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all group flex items-start gap-2 ${
                      activeId === convo.id
                        ? 'bg-brand-orange/15 border border-brand-orange/25'
                        : 'hover:bg-zinc-800/60 border border-transparent'
                    }`}
                  >
                    <Bot className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${activeId === convo.id ? 'text-brand-orange' : 'text-zinc-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${activeId === convo.id ? 'text-brand-orange' : 'text-zinc-300'}`}>
                        {convo.title}
                      </p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">{formatTime(convo.timestamp)}</p>
                    </div>
                    <button
                      onClick={(e) => deleteConversation(e, convo.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-zinc-600 hover:text-red-400 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </button>
                ))
              )}
            </div>

            {/* Sidebar footer */}
            <div className="p-3 border-t border-zinc-800/60">
              <p className="text-[9px] text-zinc-600 text-center uppercase tracking-widest font-semibold">Chats saved locally</p>
            </div>
          </div>
        </div>

        {/* ── Main chat panel ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col premium-glass-card rounded-2xl overflow-hidden min-w-0">
          
          {/* Chat Header */}
          <div className="border-b border-zinc-800/60 p-4 flex items-center gap-3 bg-brand-surface/20">
            {/* Sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(p => !p)}
              title={sidebarOpen ? 'Hide history' : 'Show history'}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-brand-orange hover:bg-brand-orange/10 transition-all"
            >
              <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${sidebarOpen ? 'rotate-180' : ''}`} />
            </button>

            <div className="bg-brand-orange/10 p-2 rounded-xl border border-brand-orange/20">
              <Bot className="w-5 h-5 text-brand-orange" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-white tracking-tight">FitBot Assistant</h2>
              <p className="text-[10px] text-brand-orange font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse"></span>
                Live & Ready
              </p>
            </div>
            <button
              onClick={startNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-orange/10 border border-brand-orange/20 text-brand-orange text-xs font-bold hover:bg-brand-orange/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> New Chat
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 scrollbar-hide">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                  msg.sender === 'user' 
                    ? 'bg-slate-800 border-slate-700 shadow-md' 
                    : 'bg-brand-orange/10 border-brand-orange/20 shadow-[0_0_10px_rgba(255,126,51,0.06)]'
                }`}>
                  {msg.sender === 'user' ? (
                    <User className="w-4 h-4 text-slate-300" />
                  ) : (
                    <Bot className="w-4 h-4 text-brand-orange" />
                  )}
                </div>
                
                <div className={`max-w-[80%] rounded-xl px-4 py-2.5 shadow-sm ${
                  msg.sender === 'user' 
                    ? 'bg-slate-800 text-white rounded-tr-none border border-slate-700' 
                    : 'bg-brand-orange text-white rounded-tl-none font-medium'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex gap-3 flex-row">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-brand-orange/10 border border-brand-orange/20 shadow-[0_0_10px_rgba(255,126,51,0.06)]">
                  <Bot className="w-4 h-4 text-brand-orange" />
                </div>
                <div className="bg-brand-orange/10 border border-brand-orange/20 rounded-xl rounded-tl-none px-4 py-3 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-brand-orange/40 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-brand-orange/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-1.5 h-1.5 bg-brand-orange/80 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-zinc-800/60 bg-brand-surface/20">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about health and fitness..."
                className="w-full bg-brand-dark border border-brand-border text-white rounded-xl pl-5 pr-12 py-3 focus:outline-none focus:border-brand-orange/50 focus:ring-2 focus:ring-brand-orange/5 transition-all placeholder:text-slate-600 text-sm shadow-inner"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="absolute right-2 p-2 bg-brand-orange text-white rounded-lg hover:bg-[#ff8f4d] disabled:opacity-30 disabled:hover:bg-brand-orange transition-all shadow-md hover:scale-105 active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="text-center mt-2.5 flex items-center justify-center gap-1.5 text-[9px] text-slate-600 uppercase tracking-widest font-semibold">
              <Activity className="w-3 h-3" />
              <span>FitTrack AI Health Assistant • Beta</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Chatbot;
