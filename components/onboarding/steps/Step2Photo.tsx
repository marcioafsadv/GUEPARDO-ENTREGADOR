import React, { useRef, useState } from 'react';
import { compressImage } from '../../../utils/imageCompressor';

interface Step2PhotoProps {
    data: {
        photoUrl: string | null;
        photoFile: File | null;
    };
    onUpdate: (updates: any) => void;
    onNext: () => void;
    theme?: 'dark' | 'light';
}

const Step2Photo: React.FC<Step2PhotoProps> = ({ data, onUpdate, onNext, theme = 'dark' }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState('');
    const [isCompressing, setIsCompressing] = useState(false);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Por favor, selecione uma imagem válida');
            return;
        }

        // Safety limit: only reject files that are excessively huge (e.g. > 30MB)
        if (file.size > 30 * 1024 * 1024) {
            setError('A imagem é muito grande. Por favor, escolha uma foto menor que 30MB.');
            return;
        }

        setError('');
        setIsCompressing(true);

        try {
            // Compress the image down to 1200px max dimension and 75% quality
            const compressed = await compressImage(file, 1200, 1200, 0.75);
            onUpdate({
                photoUrl: compressed.url,
                photoFile: compressed.file
            });
        } catch (err: any) {
            console.error('Erro ao comprimir imagem:', err);
            setError(err.message || 'Erro ao processar imagem. Tente novamente.');
        } finally {
            setIsCompressing(false);
        }
    };

    const handleNext = () => {
        if (!data.photoUrl) {
            setError('Por favor, adicione uma foto do seu rosto');
            return;
        }
        onNext();
    };

    const cardBg = theme === 'dark' ? 'bg-zinc-900' : 'bg-white';
    const innerBg = theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100';
    const textPrimary = theme === 'dark' ? 'text-white' : 'text-zinc-900';
    const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';

    return (
        <div className="space-y-6">
            <div>
                <h2 className={`text-3xl font-black italic ${textPrimary} mb-2`}>Foto do Rosto</h2>
                <p className={`text-sm ${textMuted}`}>Para sua segurança e identificação</p>
            </div>

            {/* Instructions */}
            <div className={`p-4 rounded-xl ${innerBg} space-y-2`}>
                <p className={`text-xs font-black uppercase tracking-widest ${textMuted}`}>
                    Dicas para uma boa foto:
                </p>
                <ul className={`text-sm ${textMuted} space-y-1`}>
                    <li className="flex items-start space-x-2">
                        <i className="fas fa-check text-green-500 mt-1"></i>
                        <span>Boa iluminação (luz natural de frente)</span>
                    </li>
                    <li className="flex items-start space-x-2">
                        <i className="fas fa-check text-green-500 mt-1"></i>
                        <span>Rosto todo visível, sem óculos escuros ou chapéu</span>
                    </li>
                    <li className="flex items-start space-x-2">
                        <i className="fas fa-check text-green-500 mt-1"></i>
                        <span>Fundo neutro e limpo</span>
                    </li>
                    <li className="flex items-start space-x-2">
                        <i className="fas fa-check text-green-500 mt-1"></i>
                        <span>Olhe diretamente para a câmera</span>
                    </li>
                </ul>
            </div>

            {/* Photo preview or upload button */}
            <div className="flex flex-col items-center space-y-4">
                {isCompressing ? (
                    <div className={`w-48 h-48 rounded-full border-4 border-dashed border-[#FF6B00] flex flex-col items-center justify-center space-y-3`}>
                        <i className="fas fa-spinner fa-spin text-4xl text-[#FF6B00]"></i>
                        <span className={`text-sm font-bold ${textMuted}`}>Processando...</span>
                    </div>
                ) : data.photoUrl ? (
                    <div className="relative">
                        <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-[#FF6B00] shadow-2xl">
                            <img
                                src={data.photoUrl}
                                alt="Preview"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute bottom-2 right-2 w-12 h-12 bg-[#FF6B00] rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                        >
                            <i className="fas fa-camera text-white"></i>
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-48 h-48 rounded-full border-4 border-dashed ${theme === 'dark' ? 'border-zinc-700' : 'border-zinc-300'} flex flex-col items-center justify-center space-y-3 hover:border-[#FF6B00] transition-colors`}
                    >
                        <i className="fas fa-camera text-4xl text-[#FF6B00]"></i>
                        <span className={`text-sm font-bold ${textMuted}`}>Adicionar Foto</span>
                    </button>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isCompressing}
                />

                {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <button
                onClick={handleNext}
                disabled={isCompressing}
                className={`w-full h-14 bg-[#FF6B00] rounded-2xl font-black text-white uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:scale-105 transition-transform ${isCompressing ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''}`}
            >
                {isCompressing ? 'Processando imagem...' : 'Continuar'}
            </button>
        </div>
    );
};

export default Step2Photo;

