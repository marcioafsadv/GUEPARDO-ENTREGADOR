
import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  // Dimensionamento baseado em largura para manter proporção
  const sizeClasses = {
    sm: 'w-40',
    md: 'w-56',
    lg: 'w-72'
  };

  return (
    <div className={`flex items-center justify-center select-none ${sizeClasses[size]} ${className}`}>
      <img
        src="/logo-guepardo.jpg"
        alt="Guepardo Delivery"
        className="w-full h-auto drop-shadow-2xl"
        style={{ filter: 'brightness(1.1) contrast(1.05)' }}
      />
    </div>
  );
};
