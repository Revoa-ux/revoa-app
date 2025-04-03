import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white/70 backdrop-blur-sm shadow-sm rounded-2xl p-8 ${className}`}>
      {children}
    </div>
  );
};

export default GlassCard;