import React from 'react';

interface RexCharacterProps {
  emotion: 'excited' | 'concerned' | 'thoughtful';
  className?: string;
}

export const RexCharacter: React.FC<RexCharacterProps> = ({ emotion, className = '' }) => {
  // Define emotion-based styling
  const getEmotionStyles = () => {
    switch (emotion) {
      case 'excited':
        return {
          gradient: 'from-green-500 via-emerald-500 to-teal-500',
          animation: 'animate-bounce',
          transform: 'rotate-3'
        };
      case 'concerned':
        return {
          gradient: 'from-orange-500 via-red-500 to-rose-500',
          animation: 'animate-pulse',
          transform: '-rotate-3'
        };
      case 'thoughtful':
      default:
        return {
          gradient: 'from-red-500 via-rose-500 to-orange-500',
          animation: '',
          transform: 'rotate-0'
        };
    }
  };

  const styles = getEmotionStyles();

  return (
    <div className={`relative ${className}`}>
      {/* Glow effect */}
      <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} rounded-full blur-xl opacity-40 ${styles.animation}`}></div>

      {/* Character container */}
      <div className={`relative w-20 h-20 transform ${styles.transform} transition-all duration-500`}>
        {/* Rex character - using emoji-style robot for now */}
        <div className={`w-full h-full rounded-full bg-gradient-to-br ${styles.gradient} flex items-center justify-center border-4 border-white dark:border-[#1f1f1f] shadow-2xl`}>
          <svg
            viewBox="0 0 100 100"
            className="w-12 h-12 text-white drop-shadow-lg"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Robot head */}
            <rect x="25" y="30" width="50" height="45" rx="8" fill="currentColor" opacity="0.9" />

            {/* Eyes based on emotion */}
            {emotion === 'excited' && (
              <>
                <circle cx="38" cy="45" r="4" fill="white" />
                <circle cx="62" cy="45" r="4" fill="white" />
                <path d="M 35 60 Q 50 68 65 60" stroke="white" strokeWidth="3" fill="none" />
              </>
            )}
            {emotion === 'concerned' && (
              <>
                <line x1="33" y1="45" x2="43" y2="45" stroke="white" strokeWidth="3" />
                <line x1="57" y1="45" x2="67" y2="45" stroke="white" strokeWidth="3" />
                <path d="M 35 65 Q 50 58 65 65" stroke="white" strokeWidth="3" fill="none" />
              </>
            )}
            {emotion === 'thoughtful' && (
              <>
                <circle cx="38" cy="45" r="3" fill="white" />
                <circle cx="62" cy="45" r="3" fill="white" />
                <line x1="35" y1="60" x2="65" y2="60" stroke="white" strokeWidth="2.5" />
              </>
            )}

            {/* Antenna */}
            <line x1="50" y1="30" x2="50" y2="22" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="50" cy="20" r="3" fill="currentColor" />
          </svg>
        </div>

        {/* Floating particles around Rex */}
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping"></div>
        <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-75"></div>
      </div>
    </div>
  );
};
