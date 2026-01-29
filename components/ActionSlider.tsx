
import React, { useState, useRef, useEffect } from 'react';

interface ActionSliderProps {
  onConfirm: () => void;
  label: string;
  disabled?: boolean;
  color?: string;
  icon?: string;
}

export const ActionSlider: React.FC<ActionSliderProps> = ({ 
  onConfirm, 
  label, 
  disabled = false, 
  color = '#FF6B00',
  icon = 'fa-chevron-right'
}) => {
  const [position, setPosition] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleStart = () => {
    if (disabled) return;
    isDragging.current = true;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging.current || !containerRef.current || disabled) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const handleWidth = 64; // Largura do gatilho
    const maxPath = rect.width - handleWidth - 8; // 8 é o padding total
    
    let currentPos = clientX - rect.left - (handleWidth / 2);
    let percentage = (currentPos / maxPath) * 100;
    
    percentage = Math.max(0, Math.min(100, percentage));
    setPosition(percentage);
  };

  const handleEnd = () => {
    if (!isDragging.current || disabled) return;
    isDragging.current = false;
    
    if (position >= 90) {
      setPosition(100);
      onConfirm();
      // Reset após pequena pausa para permitir transição de estado no pai
      setTimeout(() => setPosition(0), 500);
    } else {
      setPosition(0);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-20 rounded-[28px] flex items-center p-1 select-none overflow-hidden transition-all duration-300 border-2 ${
        disabled 
          ? 'bg-zinc-800 border-transparent opacity-50' 
          : 'bg-zinc-900 border-white/5 shadow-inner'
      }`}
      onTouchStart={handleStart}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
      onTouchEnd={handleEnd}
      onMouseDown={handleStart}
      onMouseMove={(e) => isDragging.current && handleMove(e.clientX)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
    >
      {/* Background Progress */}
      <div 
        className="absolute left-1 top-1 bottom-1 rounded-[24px] transition-all duration-75"
        style={{ 
          width: `calc(${position}% + 64px)`,
          backgroundColor: color,
          opacity: disabled ? 0 : (position / 100) * 0.8 + 0.2
        }}
      />

      {/* Track Label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className={`font-black text-[11px] uppercase tracking-[0.2em] italic transition-all ${
          position > 50 ? 'text-white' : 'text-zinc-500'
        }`}>
          {label}
        </span>
      </div>

      {/* Handle (Gatilho) */}
      <div 
        className={`h-16 w-16 rounded-[22px] shadow-2xl flex items-center justify-center z-10 transition-transform duration-75 cursor-grab active:cursor-grabbing ${
          disabled ? 'bg-zinc-700' : 'bg-white'
        }`}
        style={{ 
          transform: `translateX(calc(${position}% * (100% - 64px) / 100))`,
          boxShadow: position > 90 ? `0 0 20px ${color}` : 'none'
        }}
      >
        <i className={`fas ${icon} text-lg ${disabled ? 'text-zinc-500' : ''}`} style={{ color: disabled ? undefined : color }}></i>
      </div>

      {/* Arrow Indicator */}
      {!disabled && position < 20 && (
        <div className="absolute right-8 flex space-x-1.5 opacity-30 text-white">
           <i className="fas fa-chevron-right animate-pulse"></i>
           <i className="fas fa-chevron-right animate-pulse [animation-delay:200ms]"></i>
        </div>
      )}
    </div>
  );
};
