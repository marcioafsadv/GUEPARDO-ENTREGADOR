import React, { useState } from 'react';

interface LocationPermissionProps {
    theme: 'dark' | 'light';
    onPermissionGranted: () => void;
    onSkip: () => void;
}

export const LocationPermission: React.FC<LocationPermissionProps> = ({
    theme,
    onPermissionGranted,
    onSkip
}) => {
    const [isRequesting, setIsRequesting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRequestPermission = () => {
        setIsRequesting(true);
        setError(null);

        if (!navigator.geolocation) {
            setError('Geolocalização não é suportada neste dispositivo.');
            setIsRequesting(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            () => {
                setIsRequesting(false);
                onPermissionGranted();
            },
            (err) => {
                setIsRequesting(false);
                if (err.code === err.PERMISSION_DENIED) {
                    setError('Você negou a permissão de localização. Por favor, ative nas configurações do navegador.');
                } else {
                    setError('Erro ao obter localização. Tente novamente.');
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const cardBg = theme === 'dark' ? 'bg-zinc-900' : 'bg-white';
    const textPrimary = theme === 'dark' ? 'text-white' : 'text-zinc-900';
    const textMuted = theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600';

    return (
        <div className={`min-h-screen ${theme === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50'} flex items-center justify-center p-4`}>
            <div className={`${cardBg} rounded-2xl p-8 max-w-md w-full shadow-2xl`}>
                {/* Icon */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 mb-4">
                        <i className="fas fa-location-arrow text-4xl text-zinc-900"></i>
                    </div>
                    <h1 className={`text-2xl font-bold ${textPrimary} mb-2`}>
                        Ei, entregador! 🏍️
                    </h1>
                    <p className={`text-lg ${textMuted}`}>
                        Precisamos da sua localização
                    </p>
                </div>

                {/* Explanation */}
                <div className={`${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100'} rounded-xl p-4 mb-6`}>
                    <p className={`${textMuted} text-sm leading-relaxed`}>
                        Para distribuir entregas próximas a você e garantir que você receba os melhores pedidos,
                        precisamos acessar sua localização em tempo real.
                    </p>
                </div>

                {/* Benefits */}
                <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-3">
                        <i className="fas fa-check-circle text-green-500 text-xl mt-0.5"></i>
                        <div>
                            <p className={`${textPrimary} font-semibold`}>Entregas Próximas</p>
                            <p className={`${textMuted} text-sm`}>Receba pedidos perto de você</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <i className="fas fa-check-circle text-green-500 text-xl mt-0.5"></i>
                        <div>
                            <p className={`${textPrimary} font-semibold`}>Rotas Otimizadas</p>
                            <p className={`${textMuted} text-sm`}>Navegação inteligente para economizar tempo</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <i className="fas fa-check-circle text-green-500 text-xl mt-0.5"></i>
                        <div>
                            <p className={`${textPrimary} font-semibold`}>Segurança</p>
                            <p className={`${textMuted} text-sm`}>Rastreamento para sua proteção</p>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500 rounded-xl p-4 mb-4">
                        <p className="text-red-500 text-sm flex items-center gap-2">
                            <i className="fas fa-exclamation-triangle"></i>
                            {error}
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                <button
                    onClick={handleRequestPermission}
                    disabled={isRequesting}
                    className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-yellow-400 to-orange-500 text-zinc-900 hover:shadow-lg hover:scale-[1.02] transition-all mb-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isRequesting ? (
                        <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            Solicitando...
                        </>
                    ) : (
                        <>
                            <i className="fas fa-map-marker-alt mr-2"></i>
                            Permitir Localização
                        </>
                    )}
                </button>

                <button
                    onClick={onSkip}
                    className={`w-full py-3 rounded-xl font-semibold ${textMuted} hover:${textPrimary} transition-colors`}
                >
                    Pular por enquanto
                </button>

                {/* Privacy Note */}
                <p className={`text-xs ${textMuted} text-center mt-4`}>
                    <i className="fas fa-shield-alt mr-1"></i>
                    Sua privacidade é protegida. Você pode desativar a qualquer momento.
                </p>
            </div>
        </div>
    );
};
