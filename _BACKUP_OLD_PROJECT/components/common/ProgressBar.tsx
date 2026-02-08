import React from 'react';

interface ProgressBarProps {
    currentStep: number;
    totalSteps: number;
    theme?: 'dark' | 'light';
}

const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep, totalSteps, theme = 'dark' }) => {
    const progress = (currentStep / totalSteps) * 100;

    return (
        <div className="w-full">
            {/* Step indicator */}
            <div className="flex justify-between items-center mb-3">
                <span className={`text-xs font-black uppercase tracking-widest ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    Etapa {currentStep} de {totalSteps}
                </span>
                <span className="text-xs font-black text-[#FF6B00]">
                    {Math.round(progress)}%
                </span>
            </div>

            {/* Progress bar */}
            <div className={`w-full h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                <div
                    className="h-full bg-gradient-to-r from-[#FF6B00] to-[#FFD700] transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Step dots */}
            <div className="flex justify-between mt-3">
                {Array.from({ length: totalSteps }).map((_, index) => (
                    <div
                        key={index}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${index < currentStep
                                ? 'bg-[#FF6B00] scale-110'
                                : index === currentStep - 1
                                    ? 'bg-[#FFD700] scale-125 ring-4 ring-[#FFD700]/20'
                                    : theme === 'dark'
                                        ? 'bg-zinc-700'
                                        : 'bg-zinc-300'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
};

export default ProgressBar;
