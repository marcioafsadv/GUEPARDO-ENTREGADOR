import React from 'react';

interface WizardProgressProps {
    currentStep: number;
    totalSteps: number;
    theme: 'dark' | 'light';
}

export const WizardProgress: React.FC<WizardProgressProps> = ({ currentStep, totalSteps, theme }) => {
    const textPrimary = theme === 'dark' ? 'text-white' : 'text-zinc-900';
    const textMuted = theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600';

    return (
        <div className="mb-6">
            {/* Step Counter */}
            <div className="flex items-center justify-between mb-3">
                <p className={`text-sm font-semibold ${textMuted}`}>
                    Etapa {currentStep} de {totalSteps}
                </p>
                <p className={`text-sm font-bold ${textPrimary}`}>
                    {Math.round((currentStep / totalSteps) * 100)}%
                </p>
            </div>

            {/* Progress Bar */}
            <div className={`h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500 ease-out"
                    style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                />
            </div>

            {/* Step Dots */}
            <div className="flex justify-between mt-3">
                {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
                    <div
                        key={step}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step < currentStep
                                ? 'bg-green-500 text-white'
                                : step === currentStep
                                    ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-zinc-900 scale-110'
                                    : theme === 'dark'
                                        ? 'bg-zinc-800 text-zinc-600'
                                        : 'bg-zinc-200 text-zinc-400'
                            }`}
                    >
                        {step < currentStep ? <i className="fas fa-check"></i> : step}
                    </div>
                ))}
            </div>
        </div>
    );
};
