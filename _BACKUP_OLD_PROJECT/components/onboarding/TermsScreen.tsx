import React, { useState, useEffect, useRef } from 'react';
import { PRIVACY_POLICY_TEXT, TERMS_OF_SERVICE_TEXT } from '../../constants-onboarding';

interface TermsScreenProps {
    theme: 'dark' | 'light';
    onAccept: () => void;
    onBack: () => void;
}

export const TermsScreen: React.FC<TermsScreenProps> = ({ theme, onAccept, onBack }) => {
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            // Consider "bottom" when within 50px of the actual bottom
            if (scrollHeight - scrollTop - clientHeight < 50) {
                setHasScrolledToBottom(true);
            }
        }
    };

    const cardBg = theme === 'dark' ? 'bg-zinc-900' : 'bg-white';
    const textPrimary = theme === 'dark' ? 'text-white' : 'text-zinc-900';
    const textMuted = theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600';
    const borderColor = theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200';

    return (
        <div className={`min-h-screen ${theme === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50'} flex flex-col`}>
            {/* Header */}
            <div className={`${cardBg} border-b ${borderColor} px-4 py-4 flex items-center gap-3`}>
                <button onClick={onBack} className={`${textMuted} hover:${textPrimary}`}>
                    <i className="fas fa-arrow-left text-xl"></i>
                </button>
                <div>
                    <h1 className={`text-xl font-bold ${textPrimary}`}>Termos e Privacidade</h1>
                    <p className={`text-sm ${textMuted}`}>Leia com atenção antes de continuar</p>
                </div>
            </div>

            {/* Scrollable Content */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 py-6"
                style={{ maxHeight: 'calc(100vh - 180px)' }}
            >
                <div className={`${cardBg} rounded-xl p-6 mb-4 border ${borderColor}`}>
                    <div className={`prose ${theme === 'dark' ? 'prose-invert' : ''} max-w-none`}>
                        <div dangerouslySetInnerHTML={{ __html: TERMS_OF_SERVICE_TEXT.replace(/\n/g, '<br/>') }} />
                    </div>
                </div>

                <div className={`${cardBg} rounded-xl p-6 border ${borderColor}`}>
                    <div className={`prose ${theme === 'dark' ? 'prose-invert' : ''} max-w-none`}>
                        <div dangerouslySetInnerHTML={{ __html: PRIVACY_POLICY_TEXT.replace(/\n/g, '<br/>') }} />
                    </div>
                </div>

                {!hasScrolledToBottom && (
                    <div className="text-center mt-4">
                        <p className={`text-sm ${textMuted} flex items-center justify-center gap-2`}>
                            <i className="fas fa-arrow-down animate-bounce"></i>
                            Role até o final para continuar
                        </p>
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className={`${cardBg} border-t ${borderColor} px-4 py-4`}>
                <button
                    onClick={onAccept}
                    disabled={!hasScrolledToBottom}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${hasScrolledToBottom
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-zinc-900 hover:shadow-lg hover:scale-[1.02]'
                        : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                        }`}
                >
                    {hasScrolledToBottom ? (
                        <>
                            <i className="fas fa-check-circle mr-2"></i>
                            Li e Concordo
                        </>
                    ) : (
                        <>
                            <i className="fas fa-lock mr-2"></i>
                            Role até o final
                        </>
                    )}
                </button>

                <div className="mt-3 text-center">
                    <a
                        href="https://guepardodelivery.com.br/privacidade"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-sm ${textMuted} hover:text-yellow-500`}
                    >
                        Política de Privacidade Completa
                    </a>
                </div>
            </div>
        </div>
    );
};
