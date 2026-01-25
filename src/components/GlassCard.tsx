import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-gradient-to-b from-gray-50 to-white dark:from-gray-900/80 dark:to-gray-900 border border-gray-200/60 dark:border-gray-800/60 shadow-sm rounded-2xl p-8 ${className}`}>
      {children}
    </div>
  );
};

export default GlassCard;