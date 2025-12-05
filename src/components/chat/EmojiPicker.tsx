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
      className="absolute bottom-full right-0 mb-2 w-[352px] bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-[10000]"
      style={{
        transformOrigin: 'bottom right',
        animation: 'dropdown-in 0.2s ease-out'
      }}
    >
      {/* Categories */}
      <div className="flex border-b border-gray-200">
        {EMOJI_CATEGORIES.map((category, index) => (
          <button
            key={category.name}
            onClick={() => setSelectedCategory(index)}
            className={`flex-1 px-2 py-3 text-sm transition-colors hover:bg-gray-50 ${
              selectedCategory === index ? 'bg-gray-100' : ''
            }`}
          >
            {category.emojis[0]}
          </button>
        ))}
      </div>

      {/* Recent Emojis */}
      {recentEmojis.length > 0 && (
        <div className="p-2 border-b border-gray-200">
          <div className="text-xs font-medium text-gray-500 mb-2 px-2">
            Recently Used
          </div>
          <div className="grid grid-cols-8 gap-1">
            {recentEmojis.map((emoji, index) => (
              <button
                key={`${emoji}-${index}`}
                onClick={() => handleSelect(emoji)}
                className="w-10 h-10 flex items-center justify-center text-xl hover:bg-gray-100 rounded transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Emoji Grid */}
      <div className="p-2">
        <div className="text-xs font-medium text-gray-500 mb-2 px-2">
          {EMOJI_CATEGORIES[selectedCategory].name}
        </div>
        <div className="grid grid-cols-8 gap-1">
          {EMOJI_CATEGORIES[selectedCategory].emojis.slice(0, 16).map((emoji, index) => (
            <button
              key={`${emoji}-${index}`}
              onClick={() => handleSelect(emoji)}
              className="w-10 h-10 flex items-center justify-center text-xl hover:bg-gray-100 rounded transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};