
import React, { useState, useRef, useEffect } from 'react';

interface SliderSwitchProps {
  onToggle: (online: boolean) => void;
  initialState: boolean;
}

export const SliderSwitch: React.FC<SliderSwitchProps> = ({ onToggle, initialState }) => {
  const [isOnline, setIsOnline] = useState(initialState);
  const [position, setPosition] = useState(initialState ? 100 : 0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updateState = (online: boolean) => {
    setIsOnline(online);
    setPosition(online ? 100 : 0);
    onToggle(online);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    let pos = ((touch.clientX - rect.left) / rect.width) * 100;
    pos = Math.max(0, Math.min(100, pos));
    setPosition(pos);
  };

  const handleTouchEnd = () => {
    if (position > 50) {
      updateState(true);
    } else {
      updateState(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-20 rounded-full flex items-center p-2 cursor-pointer select-none overflow-hidden transition-colors duration-300 ${isOnline ? 'bg-green-600' : 'bg-zinc-800'}`}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={() => updateState(!isOnline)}
    >
      {/* Track Label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-white font-bold text-xl uppercase tracking-widest opacity-60">
          {isOnline ? 'ESTOU DISPONÍVEL' : 'FICAR DISPONÍVEL'}
        </span>
      </div>

      {/* Handle */}
      <div 
        className="h-16 w-16 bg-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-100 ease-out z-10"
        style={{ transform: `translateX(calc(${position}% * (100% - 64px) / 100))` }}
      >
        <i className={`fas ${isOnline ? 'fa-check text-green-600' : 'fa-power-off text-zinc-400'} text-2xl`}></i>
      </div>

      {/* Arrow Indicator */}
      {!isOnline && (
        <div className="absolute right-6 flex space-x-1 opacity-40">
           <i className="fas fa-chevron-right animate-pulse"></i>
           <i className="fas fa-chevron-right animate-pulse delay-100"></i>
           <i className="fas fa-chevron-right animate-pulse delay-200"></i>
        </div>
      )}
    </div>
  );
};
