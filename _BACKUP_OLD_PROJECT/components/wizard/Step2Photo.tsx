import React, { useState, useRef } from 'react';
import { WizardProgress } from './WizardProgress';

interface Step2PhotoProps {
    theme: 'dark' | 'light';
    photoUrl: string;
    onPhotoCapture: (photoUrl: string) => void;
    onNext: () => void;
    onBack: () => void;
}

export const Step2Photo: React.FC<Step2PhotoProps> = ({
    theme,
    photoUrl,
    onPhotoCapture,
    onNext,
    onBack
}) => {
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });
            setStream(mediaStream);
            setIsCameraActive(true);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.play();
            }
        } catch (error) {
            console.error('Camera error:', error);
            alert('Erro ao acessar a câmera. Verifique as permissões.');
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0);
                const imageUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
                onPhotoCapture(imageUrl);
                stopCamera();
            }
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setIsCameraActive(false);
    };

    const handleNext = () => {
        if (!photoUrl) {
            alert('Por favor, tire uma foto antes de continuar.');
            return;
        }
        onNext();
    };

    const cardBg = theme === 'dark' ? 'bg-zinc-900' : 'bg-white';
    const textPrimary = theme === 'dark' ? 'text-white' : 'text-zinc-900';
    const textMuted = theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600';
    const borderColor = theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200';
    const inputBg = theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100';

    return (
        <div className={`min-h-screen ${theme === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50'} flex flex-col`}>
            {/* Header */}
            <div className={`${cardBg} border-b ${borderColor} px-4 py-4`}>
                <button onClick={onBack} className={`${textMuted} hover:${textPrimary} mb-3`}>
                    <i className="fas fa-arrow-left text-xl"></i>
                </button>
                <WizardProgress currentStep={2} totalSteps={5} theme={theme} />
                <h1 className={`text-2xl font-bold ${textPrimary} mt-4`}>Foto do Rosto</h1>
                <p className={`text-sm ${textMuted}`}>Para identificação e segurança</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
                {/* Instructions */}
                {!isCameraActive && !photoUrl && (
                    <div className={`${inputBg} rounded-xl p-6 mb-6`}>
                        <h3 className={`font-bold ${textPrimary} mb-3 flex items-center gap-2`}>
                            <i className="fas fa-lightbulb text-yellow-500"></i>
                            Dicas para uma boa foto:
                        </h3>
                        <ul className={`space-y-2 ${textMuted} text-sm`}>
                            <li className="flex items-start gap-2">
                                <i className="fas fa-check text-green-500 mt-0.5"></i>
                                <span>Boa iluminação (evite contraluz)</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <i className="fas fa-check text-green-500 mt-0.5"></i>
                                <span>Sem óculos escuros ou chapéu</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <i className="fas fa-check text-green-500 mt-0.5"></i>
                                <span>Rosto inteiro visível</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <i className="fas fa-check text-green-500 mt-0.5"></i>
                                <span>Fundo neutro</span>
                            </li>
                        </ul>
                    </div>
                )}

                {/* Camera View */}
                {isCameraActive && (
                    <div className="mb-6">
                        <div className={`relative rounded-2xl overflow-hidden ${borderColor} border-4`}>
                            <video
                                ref={videoRef}
                                className="w-full"
                                autoPlay
                                playsInline
                                muted
                            />
                            <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border-4 border-yellow-500 border-dashed"></div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={capturePhoto}
                                className="flex-1 py-4 rounded-xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 text-zinc-900 hover:shadow-lg transition-all"
                            >
                                <i className="fas fa-camera mr-2"></i>
                                Capturar Foto
                            </button>
                            <button
                                onClick={stopCamera}
                                className={`px-6 py-4 rounded-xl font-bold ${inputBg} ${textPrimary} hover:opacity-80 transition-all`}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                )}

                {/* Photo Preview */}
                {photoUrl && !isCameraActive && (
                    <div className="text-center mb-6">
                        <div className="inline-block relative">
                            <img
                                src={photoUrl}
                                alt="Preview"
                                className="w-64 h-64 rounded-full object-cover border-4 border-green-500"
                            />
                            <div className="absolute -top-2 -right-2 w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                                <i className="fas fa-check text-white text-xl"></i>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                onPhotoCapture('');
                                startCamera();
                            }}
                            className={`mt-4 px-6 py-3 rounded-xl font-semibold ${textMuted} hover:${textPrimary} transition-colors`}
                        >
                            <i className="fas fa-redo mr-2"></i>
                            Tirar Nova Foto
                        </button>
                    </div>
                )}

                {/* Start Camera Button */}
                {!isCameraActive && !photoUrl && (
                    <button
                        onClick={startCamera}
                        className="w-full py-6 rounded-xl font-bold text-lg bg-gradient-to-r from-yellow-400 to-orange-500 text-zinc-900 hover:shadow-lg hover:scale-[1.02] transition-all"
                    >
                        <i className="fas fa-camera text-2xl mb-2 block"></i>
                        Abrir Câmera Frontal
                    </button>
                )}

                <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Footer */}
            <div className={`${cardBg} border-t ${borderColor} px-4 py-4`}>
                <button
                    onClick={handleNext}
                    disabled={!photoUrl}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${photoUrl
                            ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-zinc-900 hover:shadow-lg hover:scale-[1.02]'
                            : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                        }`}
                >
                    Continuar
                    <i className="fas fa-arrow-right ml-2"></i>
                </button>
            </div>
        </div>
    );
};
