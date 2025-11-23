import React from 'react';

interface RexCharacterProps {
  emotion: 'excited' | 'concerned' | 'thoughtful';
  className?: string;
}

export const RexCharacter: React.FC<RexCharacterProps> = ({ emotion, className = '' }) => {
  return (
    <div className={`relative ${className}`}>
      <div className="relative w-[150px] h-[150px]">
        <img
          src="/Revoa-Bot.gif"
          alt="Revoa AI Bot"
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
};
