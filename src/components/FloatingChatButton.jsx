import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bot, MessageCircle } from 'lucide-react';

const FloatingChatButton = () => {
  const location = useLocation();
  const isActive = location.pathname === '/chat';

  if (location.pathname.startsWith('/admin') || location.pathname === '/auth') {
    return null;
  }

  return (
    <Link
      to="/chat"
      aria-label="Open FitBot Assistant"
      title="Open FitBot Assistant"
      className={`fixed right-5 bottom-5 sm:right-6 sm:bottom-6 z-50 flex h-16 w-16 items-center justify-center rounded-full border transition-all duration-200 shadow-[0_0_28px_rgba(255,126,51,0.35)] hover:-translate-y-1 hover:scale-105 active:scale-95 ${
        isActive
          ? 'bg-white text-brand-orange border-brand-orange/40'
          : 'bg-brand-orange text-white border-white/10 hover:bg-[#ff8f4d]'
      }`}
    >
      <span className="absolute inset-0 rounded-full bg-white/10"></span>
      <MessageCircle className="h-8 w-8" aria-hidden="true" />
      <span className="absolute -right-0.5 -top-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-900 bg-brand-dark">
        <Bot className="h-3.5 w-3.5 text-brand-orange" aria-hidden="true" />
      </span>
    </Link>
  );
};

export default FloatingChatButton;
