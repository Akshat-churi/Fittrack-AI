import React, { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';

// Common emojis organized by category for fitness/social context
const EMOJI_GROUPS = [
  {
    label: '🔥 Fitness',
    emojis: ['💪', '🏋️', '🤸', '🏃', '🚴', '⚡', '🔥', '🎯', '🏆', '🥇', '🏅', '⭐', '✨', '💥', '🎉'],
  },
  {
    label: '😊 Reactions',
    emojis: ['😀', '😂', '🤩', '😍', '🥳', '🙌', '👏', '👍', '❤️', '🫶', '💯', '🎊', '🥰', '😎', '😤'],
  },
  {
    label: '🌟 Motivation',
    emojis: ['💡', '🚀', '🌟', '⚡', '💎', '👑', '🦁', '🐉', '🌈', '🎵', '📈', '💪', '🏁', '🌅', '🌊'],
  },
];

/**
 * Lightweight emoji picker with a toggle button.
 * @param {function} onSelect - Called with the selected emoji string
 * @param {string} [buttonClassName] - Extra classes for the trigger button
 */
const EmojiPicker = ({ onSelect, buttonClassName = '' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className={`text-slate-400 hover:text-brand-orange transition-colors ${buttonClassName}`}
        title="Add emoji"
        aria-label="Open emoji picker"
      >
        <Smile className="w-5 h-5" />
      </button>

      {open && (
        <div className="absolute bottom-10 right-0 z-50 bg-slate-900 border border-brand-border rounded-2xl shadow-2xl p-3 w-72 max-h-72 overflow-y-auto">
          {EMOJI_GROUPS.map(group => (
            <div key={group.label} className="mb-3">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-1">
                {group.emojis.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onSelect(emoji);
                      setOpen(false);
                    }}
                    className="text-xl p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer leading-none"
                    aria-label={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmojiPicker;
