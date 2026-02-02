import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-gradient-to-b from-gray-50 to-white dark:from-[#1f1f1f] dark:to-[#1a1a1a] border border-gray-200/60 dark:border-[#3a3a3a]/60 shadow-sm rounded-2xl p-8 ${className}`}>
      {children}
    </div>
  );
};

export default GlassCard;