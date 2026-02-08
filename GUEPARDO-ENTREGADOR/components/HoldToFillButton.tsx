import React, { useState, useRef, useEffect } from 'react';

interface HoldToFillButtonProps {
    onConfirm: () => void;
    label: string;
    disabled?: boolean;
    color?: string;
    icon?: string;
    fillDuration?: number; // Tempo em ms para encher (default: 1500ms)
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

        const stepTime = 20; // Atualiza a cada 20ms
        const stepValue = (100 / (fillDuration / stepTime));

        intervalRef.current = window.setInterval(() => {
            progressRef.current += stepValue;
            if (progressRef.current >= 100) {
                progressRef.current = 100;
                completeFilling();
            }
            setProgress(progressRef.current);
        }, stepTime);
    };

    const stopFilling = () => {
        if (isCompleted) return;
        setIsHolding(false);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        // Animação de volta pra 0 se soltar antes de completar
        const animateBack = () => {
            if (progressRef.current > 0) {
                progressRef.current = Math.max(0, progressRef.current - 5);
                setProgress(progressRef.current);
                requestAnimationFrame(animateBack);
            }
        };
        requestAnimationFrame(animateBack);
    };

    const completeFilling = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setIsCompleted(true);
        setProgress(100);

        // Pequeno delay visual antes de confirmar
        setTimeout(() => {
            if (navigator.vibrate) navigator.vibrate(50);
            onConfirm();
            // Reset state after confirm (opcional, dependendo de como o pai gerencia)
            // setTimeout(() => {
            //     setIsCompleted(false);
            //     setProgress(0);
            //     progressRef.current = 0;
            // }, 1000); 
        }, 100);
    };

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    // Reset interno se o componente for "reciclado" mas não desmontado, ou se o pai mudar o status
    useEffect(() => {
        if (!disabled) {
            // Se o botão for reabilitado (ex: mudança de status), garante que o estado reseta
            // Mas precisamos cuidar para não resetar enquanto está animando se for apenas um rerender
            // A lógica de negócio no pai controla quando o botão muda de contexto (label muda, etc)
        }
    }, [disabled, label]);

    // Reset quando o label muda (indica nova ação)
    useEffect(() => {
        setIsCompleted(false);
        setProgress(0);
        progressRef.current = 0;
        setIsHolding(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
    }, [label]);


    return (
        <div
            className={`relative w-full h-16 rounded-2xl select-none overflow-hidden transition-all duration-300 transform active:scale-[0.98] ${disabled
                    ? 'bg-zinc-800 opacity-50 cursor-not-allowed'
                    : 'bg-zinc-900 shadow-lg cursor-pointer'
                }`}
            onMouseDown={startFilling}
            onMouseUp={stopFilling}
            onMouseLeave={stopFilling}
            onTouchStart={startFilling}
            onTouchEnd={stopFilling}
            // onTouchCancel={stopFilling}
            style={{
                boxShadow: isHolding ? `0 0 15px ${color}40` : '',
                border: `1px solid ${disabled ? 'transparent' : 'rgba(255,255,255,0.1)'}`
            }}
        >
            {/* Background Fill Animation */}
            <div
                className="absolute top-0 left-0 bottom-0 transition-all ease-linear"
                style={{
                    width: `${progress}%`,
                    backgroundColor: color,
                    opacity: 0.2
                }}
            />

            {/* Progress Bar Line at Bottom */}
            <div
                className="absolute bottom-0 left-0 h-1 transition-all ease-linear"
                style={{
                    width: `${progress}%`,
                    backgroundColor: color
                }}
            />

            <div className="absolute inset-0 flex items-center justify-between px-6 z-10 pointer-events-none">
                {/* Icon Container */}
                <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${isCompleted ? 'bg-white text-[color]' : 'bg-white/10 text-white'
                        }`}
                    style={{
                        color: isCompleted ? color : undefined,
                        transform: `scale(${isHolding ? 1.1 : 1})`
                    }}
                >
                    <i className={`fas ${isCompleted ? 'fa-check' : icon} ${isHolding && !isCompleted ? 'animate-pulse' : ''}`}></i>
                </div>

                {/* Label */}
                <div className="flex-1 text-center">
                    <span className={`font-black uppercase tracking-widest text-xs transition-all ${isCompleted ? 'text-white' : 'text-zinc-300'
                        }`}>
                        {isCompleted ? 'Confirmado!' : (isHolding ? 'Segure para confirmar...' : label)}
                    </span>
                </div>

                {/* Placeholder for balance/equilibrium */}
                <div className="w-10"></div>
            </div>

            {/* Particle effects or feedback could be added here */}
        </div>
    );
};
