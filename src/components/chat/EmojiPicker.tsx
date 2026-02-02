import React, { useRef } from 'react';
import { useClickOutside } from '@/lib/useClickOutside';

// Common emoji categories with emojis
const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    emojis: ['😊', '😂', '🤣', '😍', '🥰', '😘', '😭', '😅', '😉', '🙂', '🤔', '😐', '😴', '😷', '🤒', '🤮']
  },
  {
    name: 'Gestures',
    emojis: ['👍', '👎', '👌', '✌️', '🤞', '👊', '✋', '🤚', '🖐️', '🤙', '💪', '🙌', '👏', '🤝', '🙏', '✍️']
  },
  {
    name: 'Objects',
    emojis: ['💼', '📱', '💻', '⌚', '📷', '🔋', '💡', '🔍', '🔑', '🔒', '📝', '✏️', '📎', '📌', '🗂️', '📋']
  },
  {
    name: 'Symbols',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔', '✨', '🌟', '💫', '💯', '❗', '❓', '‼️', '⁉️']
  }
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, onClose }) => {
  const pickerRef = useRef<HTMLDivElement>(null);
  useClickOutside(pickerRef, onClose);

  const [selectedCategory, setSelectedCategory] = React.useState(0);
  const [recentEmojis, setRecentEmojis] = React.useState<string[]>(() => {
    const stored = localStorage.getItem('recentEmojis');
    return stored ? JSON.parse(stored) : [];
  });

  const addToRecent = (emoji: string) => {
    const newRecent = [
      emoji,
      ...recentEmojis.filter(e => e !== emoji)
    ].slice(0, 16); // Keep only the last 16 emojis
    
    setRecentEmojis(newRecent);
    localStorage.setItem('recentEmojis', JSON.stringify(newRecent));
  };

  const handleSelect = (emoji: string) => {
    addToRecent(emoji);
    onSelect(emoji);
    onClose();
  };

  return (
    <div
      ref={pickerRef}
      className="fixed w-[352px] bg-white dark:bg-dark rounded-lg shadow-xl border border-gray-200 dark:border-[#3a3a3a] overflow-hidden z-[100000]"
      style={{
        transformOrigin: 'bottom right',
        animation: 'dropdown-in 0.2s ease-out',
        bottom: '60px',
        right: '20px'
      }}
    >
      {/* Categories */}
      <div className="flex border-b border-gray-200 dark:border-[#3a3a3a]">
        {EMOJI_CATEGORIES.map((category, index) => (
          <button
            key={category.name}
            onClick={() => setSelectedCategory(index)}
            className={`flex-1 px-2 py-3 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-[#3a3a3a] ${
              selectedCategory === index ? 'bg-gray-100 dark:bg-[#3a3a3a]' : ''
            }`}
          >
            {category.emojis[0]}
          </button>
        ))}
      </div>

      {/* Recent Emojis */}
      {recentEmojis.length > 0 && (
        <div className="p-2 border-b border-gray-200 dark:border-[#3a3a3a]">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-2">
            Recently Used
          </div>
          <div className="grid grid-cols-8 gap-1">
            {recentEmojis.map((emoji, index) => (
              <button
                key={`${emoji}-${index}`}
                onClick={() => handleSelect(emoji)}
                className="w-10 h-10 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Emoji Grid */}
      <div className="p-2">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-2">
          {EMOJI_CATEGORIES[selectedCategory].name}
        </div>
        <div className="grid grid-cols-8 gap-1">
          {EMOJI_CATEGORIES[selectedCategory].emojis.slice(0, 16).map((emoji, index) => (
            <button
              key={`${emoji}-${index}`}
              onClick={() => handleSelect(emoji)}
              className="w-10 h-10 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};