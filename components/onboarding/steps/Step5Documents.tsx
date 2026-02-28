import React, { useRef, useState } from 'react';

interface DocumentUpload {
    file: File | null;
    url: string | null;
    label: string;
    required: boolean;
}

interface Step5DocumentsProps {
    data: {
        cnhFrontUrl: string | null;
        cnhBackUrl: string | null;
        crlvUrl: string | null;
        bikePhotoUrl: string | null;
        proofOfResidenceUrl: string | null;
    };
    onUpdate: (updates: any) => void;
    onNext: () => void;
    theme?: 'dark' | 'light';
}

const Step5Documents: React.FC<Step5DocumentsProps> = ({ data, onUpdate, onNext, theme = 'dark' }) => {
    const [error, setError] = useState('');
    const fileInputRefs = {
        cnhFront: useRef<HTMLInputElement>(null),
        cnhBack: useRef<HTMLInputElement>(null),
        crlv: useRef<HTMLInputElement>(null),
        bikePhoto: useRef<HTMLInputElement>(null),
        proofOfResidence: useRef<HTMLInputElement>(null),
    };

    const documents: Record<string, DocumentUpload> = {
        cnhFront: {
            file: null,
            url: data.cnhFrontUrl,
            label: 'CNH - Frente',
            required: true
        },
        cnhBack: {
            file: null,
            url: data.cnhBackUrl,
            label: 'CNH - Verso',
            required: true
        },
        crlv: {
            file: null,
            url: data.crlvUrl,
            label: 'CRLV (Documento do Veículo)',
            required: true
        },
        bikePhoto: {
            file: null,
            url: data.bikePhotoUrl,
            label: 'Foto da Moto (Lateral Direita)',
            required: true
        },
        proofOfResidence: {
            file: null,
            url: data.proofOfResidenceUrl,
            label: 'Comprovante de Residência',
            required: true
        }
    };

    const handleFileSelect = (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Por favor, selecione uma imagem válida');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            setError('A imagem deve ter no máximo 10MB');
            return;
        }

        setError('');

        // Create preview URL
        const reader = new FileReader();
        reader.onloadend = () => {
            const urlKey = `${docType}Url`;
            onUpdate({ [urlKey]: reader.result as string });
        };
        reader.readAsDataURL(file);
    };

    const validateAndNext = () => {
        const missingDocs: string[] = [];

        if (!data.cnhFrontUrl) missingDocs.push('CNH - Frente');
        if (!data.cnhBackUrl) missingDocs.push('CNH - Verso');
        if (!data.crlvUrl) missingDocs.push('CRLV');
        if (!data.bikePhotoUrl) missingDocs.push('Foto da Moto');
        if (!data.proofOfResidenceUrl) missingDocs.push('Comprovante de Residência');

        if (missingDocs.length > 0) {
            setError(`Documentos faltando: ${missingDocs.join(', ')}`);
            return;
        }

        onNext();
    };

    const innerBg = theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100';
    const textPrimary = theme === 'dark' ? 'text-white' : 'text-zinc-900';
    const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';

    const renderDocumentUpload = (docKey: string, doc: DocumentUpload) => {
        const urlKey = `${docKey}Url` as keyof typeof data;
        const hasDocument = data[urlKey];

        return (
            <div key={docKey} className={`p-4 rounded-xl ${innerBg} space-y-3`}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className={`text-sm font-black ${textPrimary}`}>
                            {doc.label}
                            {doc.required && <span className="text-red-500 ml-1">*</span>}
                        </p>
                    </div>
                    {hasDocument && (
                        <i className="fas fa-check-circle text-green-500 text-xl"></i>
                    )}
                </div>

                {hasDocument ? (
                    <div className="relative">
                        <img
                            src={hasDocument}
                            alt={doc.label}
                            className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                            onClick={() => fileInputRefs[docKey as keyof typeof fileInputRefs].current?.click()}
                            className="absolute bottom-2 right-2 w-10 h-10 bg-[#FF6B00] rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                        >
                            <i className="fas fa-camera text-white text-sm"></i>
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => fileInputRefs[docKey as keyof typeof fileInputRefs].current?.click()}
                        className={`w-full h-32 border-2 border-dashed ${theme === 'dark' ? 'border-zinc-700' : 'border-zinc-300'} rounded-lg flex flex-col items-center justify-center space-y-2 hover:border-[#FF6B00] transition-colors`}
                    >
                        <i className="fas fa-camera text-2xl text-[#FF6B00]"></i>
                        <span className={`text-xs font-bold ${textMuted}`}>Adicionar Foto</span>
                    </button>
                )}

                <input
                    ref={fileInputRefs[docKey as keyof typeof fileInputRefs]}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleFileSelect(docKey, e)}
                    className="hidden"
                />
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className={`text-3xl font-black italic ${textPrimary} mb-2`}>Documentos</h2>
                <p className={`text-sm ${textMuted}`}>Envie fotos dos documentos necessários</p>
            </div>

            {/* Instructions */}
            <div className={`p-4 rounded-xl ${innerBg} space-y-2`}>
                <p className={`text-xs font-black uppercase tracking-widest ${textMuted}`}>
                    Dicas para fotos de documentos:
                </p>
                <ul className={`text-sm ${textMuted} space-y-1`}>
                    <li className="flex items-start space-x-2">
                        <i className="fas fa-check text-green-500 mt-1"></i>
                        <span>Boa iluminação, sem reflexos ou sombras</span>
                    </li>
                    <li className="flex items-start space-x-2">
                        <i className="fas fa-check text-green-500 mt-1"></i>
                        <span>Documento inteiro visível e legível</span>
                    </li>
                    <li className="flex items-start space-x-2">
                        <i className="fas fa-check text-green-500 mt-1"></i>
                        <span>Foto nítida, sem borrões</span>
                    </li>
                </ul>
            </div>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                {Object.entries(documents).map(([key, doc]) => renderDocumentUpload(key, doc))}
            </div>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500 rounded-xl">
                    <p className="text-sm text-red-500 font-bold">{error}</p>
                </div>
            )}

            <button
                onClick={validateAndNext}
                className="w-full h-14 bg-[#FF6B00] rounded-2xl font-black text-white uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:scale-105 transition-transform"
            >
                Continuar
            </button>
        </div>
    );
};

export default Step5Documents;
