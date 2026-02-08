
import React, { useState, useRef, useEffect } from 'react';

interface HoldToFillButtonProps {
    onConfirm: () => void;
    label: string;
    disabled?: boolean;
    color?: string;
    icon?: string;
    fillDuration?: number;
}

export const HoldToFillButton: React.FC<HoldToFillButtonProps> = ({
    onConfirm,
    label,
    disabled = false,
    color = '#FF6B00',
    icon = 'fa-chevron-right',
    fillDuration = 1500
}) => {
    const [progress, setProgress] = useState(0);
    const [isHolding, setIsHolding] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);

    const intervalRef = useRef<number | null>(null);
    const progressRef = useRef(0);

    const startFilling = () => {
        if (disabled || isCompleted) return;
        setIsHolding(true);
        setProgress(0);
        progressRef.current = 0;

        // Calculate step based on fillDuration (60fps assumption = 16ms)
        const stepTime = 16;
        const steps = fillDuration / stepTime;
        const stepValue = 100 / steps;

        if (intervalRef.current) clearInterval(intervalRef.current);

        intervalRef.current = window.setInterval(() => {
            progressRef.current += stepValue;
            if (progressRef.current >= 100) {
                progressRef.current = 100;
                completeFilling();
            }
            setProgress(progressRef.current);
        }, stepTime);
    };

    const cancelFilling = () => {
        if (isCompleted) return;
        setIsHolding(false);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setProgress(0);
        progressRef.current = 0;
    };

    const completeFilling = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setIsCompleted(true);
        setIsHolding(false);
        setProgress(100);

        if (navigator.vibrate) navigator.vibrate(50);

        onConfirm();

        setTimeout(() => {
            setIsCompleted(false);
            setProgress(0);
        }, 2000);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    return (
        <div
            className={`relative w-full h-14 rounded-full overflow-hidden select-none touch-none cursor-pointer duration-200 ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
            style={{
                backgroundColor: disabled ? '#333' : '#1a1a1a',
                boxShadow: isHolding ? `0 0 15px ${color}4D` : 'none',
                border: `1px solid ${disabled ? '#444' : color}`
            }}
            onMouseDown={startFilling}
            onTouchStart={startFilling}
            onMouseUp={cancelFilling}
            onMouseLeave={cancelFilling}
            onTouchEnd={cancelFilling}
        >
            {/* Fill */}
            <div
                className="absolute top-0 left-0 h-full transition-all duration-75 ease-linear"
                style={{
                    width: `${progress}%`,
                    backgroundColor: color,
                    opacity: 0.9
                }}
            />

            {/* Label */}
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center z-10 pointer-events-none text-white">
                {isCompleted ? (
                    <div className="flex items-center font-bold animate-pulse">
                        <i className="fa-solid fa-check text-xl mr-2"></i>
                        <span>SUCESSO!</span>
                    </div>
                ) : (
                    <div className="flex items-center">
                        <span className={`font-bold mr-2 text-sm uppercase tracking-wider ${isHolding ? 'opacity-100' : 'opacity-90'}`}>
                            {label}
                        </span>
                        {!isHolding && <i className={`fa-solid ${icon}`}></i>}
                    </div>
                )}
            </div>

            {/* Gloss */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-white opacity-5 pointer-events-none"></div>
        </div>
    );
};
