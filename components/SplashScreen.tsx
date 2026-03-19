import React from 'react';

export const SplashScreen: React.FC = () => {
    return (
        <div
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
            style={{
                background: 'radial-gradient(ellipse at 50% 40%, #5c2a08 0%, #2a1004 45%, #0d0502 100%)',
            }}
        >
            {/* Ambient glow top */}
            <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[70vw] h-[40vh] pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse at center top, rgba(200, 80, 10, 0.18) 0%, transparent 70%)'
                }}
            />

            {/* Logo hero */}
            <div className="flex flex-col items-center flex-1 justify-center w-full px-6">
                <img
                    src="/guepardo-entregador-logo.png"
                    alt="Guepardo Entregador"
                    className="w-[45vw] max-w-[220px] object-contain"
                    style={{
                        filter: 'drop-shadow(0 16px 48px rgba(200,80,10,0.65)) drop-shadow(0 4px 12px rgba(0,0,0,0.7))',
                    }}
                />

                {/* Branding Text */}
                <div className="flex flex-col items-center mt-6">
                    <p
                        className="text-2xl font-black uppercase tracking-wider"
                        style={{ color: 'white', textShadow: '0 2px 12px rgba(200,80,10,0.7)' }}
                    >
                        Guepardo <span style={{ color: '#FF8C28' }}>Delivery</span>
                    </p>
                    <p
                        className="text-[10px] font-bold uppercase tracking-[0.55em] mt-1.5"
                        style={{ color: 'rgba(255,190,80,0.6)' }}
                    >
                        ENTREGADOR
                    </p>
                </div>
            </div>

            {/* Loading area — parte inferior */}
            <div className="w-full flex flex-col items-center pb-12 gap-4">
                {/* Spinner */}
                <div
                    className="w-8 h-8 rounded-full border-2 border-transparent animate-spin"
                    style={{
                        borderTopColor: '#F59E0B',
                        borderRightColor: 'rgba(245,158,11,0.3)',
                    }}
                />

                {/* Rodapé */}
                <p className="text-[10px] tracking-wider" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    Versão 1.0 &copy; 2026 Guepardo Delivery
                </p>
            </div>
        </div>
    );
};
