import React, { useState, useRef } from 'react';
import { DocumentUpload } from '../../types';
import { WizardProgress } from './WizardProgress';

interface Step5DocumentsProps {
    theme: 'dark' | 'light';
    data: DocumentUpload;
    onDataChange: (data: DocumentUpload) => void;
    onNext: () => void;
    onBack: () => void;
}

export const Step5Documents: React.FC<Step5DocumentsProps> = ({
    theme,
    data,
    onDataChange,
    onNext,
    onBack
}) => {
    const [previews, setPreviews] = useState<Record<string, string>>({});
    const fileInputRefs = {
        cnhFront: useRef<HTMLInputElement>(null),
        cnhBack: useRef<HTMLInputElement>(null),
        proofOfResidence: useRef<HTMLInputElement>(null),
        crlv: useRef<HTMLInputElement>(null),
        bikePhoto: useRef<HTMLInputElement>(null)
    };

    const handleFileChange = (field: keyof DocumentUpload, file: File | null) => {
        if (file) {
            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                alert('Arquivo muito grande. Máximo 5MB.');
                return;
            }

            // Validate file type
            const validTypes = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'];
            if (!validTypes.includes(file.type)) {
                alert('Formato inválido. Use JPG, PNG, HEIC ou PDF.');
                return;
            }

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviews(prev => ({ ...prev, [field]: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }

        onDataChange({ ...data, [field]: file });
    };

    const handleNext = () => {
        // Validate required documents
        if (!data.cnhFront || !data.cnhBack) {
            alert('Por favor, envie a CNH (frente e verso).');
            return;
        }
        if (!data.proofOfResidence) {
            alert('Por favor, envie o comprovante de residência.');
            return;
        }
        if (!data.crlv) {
            alert('Por favor, envie o CRLV (documento do veículo).');
            return;
        }
        if (!data.bikePhoto) {
            alert('Por favor, envie a foto da moto.');
            return;
        }

        onNext();
    };

    const cardBg = theme === 'dark' ? 'bg-zinc-900' : 'bg-white';
    const textPrimary = theme === 'dark' ? 'text-white' : 'text-zinc-900';
    const textMuted = theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600';
    const borderColor = theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200';
    const inputBg = theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100';

    const DocumentUploadSlot = ({
        title,
        description,
        field,
        icon
    }: {
        title: string;
        description: string;
        field: keyof DocumentUpload;
        icon: string;
    }) => {
        const hasFile = data[field] !== null;
        const preview = previews[field];

        return (
            <div className={`${inputBg} rounded-xl p-4`}>
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <h3 className={`font-bold ${textPrimary} flex items-center gap-2`}>
                            <i className={`fas ${icon} text-yellow-500`}></i>
                            {title}
                        </h3>
                        <p className={`text-sm ${textMuted} mt-1`}>{description}</p>
                    </div>
                    {hasFile && (
                        <i className="fas fa-check-circle text-2xl text-green-500"></i>
                    )}
                </div>

                {preview && (
                    <div className="mb-3">
                        <img
                            src={preview}
                            alt={title}
                            className="w-full h-32 object-cover rounded-lg"
                        />
                    </div>
                )}

                <input
                    ref={fileInputRefs[field]}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileChange(field, e.target.files?.[0] || null)}
                    className="hidden"
                />

                <div className="flex gap-2">
                    <button
                        onClick={() => fileInputRefs[field].current?.click()}
                        className={`flex-1 py-3 rounded-xl font-semibold ${hasFile
                                ? `${inputBg} ${textPrimary} border-2 ${borderColor}`
                                : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-zinc-900'
                            } hover:opacity-90 transition-all`}
                    >
                        <i className={`fas ${hasFile ? 'fa-redo' : 'fa-upload'} mr-2`}></i>
                        {hasFile ? 'Alterar' : 'Enviar'}
                    </button>
                    {hasFile && (
                        <button
                            onClick={() => {
                                handleFileChange(field, null);
                                setPreviews(prev => {
                                    const newPreviews = { ...prev };
                                    delete newPreviews[field];
                                    return newPreviews;
                                });
                            }}
                            className={`px-4 py-3 rounded-xl font-semibold ${inputBg} text-red-500 hover:opacity-80 transition-all`}
                        >
                            <i className="fas fa-trash"></i>
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={`min-h-screen ${theme === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50'} flex flex-col`}>
            {/* Header */}
            <div className={`${cardBg} border-b ${borderColor} px-4 py-4`}>
                <button onClick={onBack} className={`${textMuted} hover:${textPrimary} mb-3`}>
                    <i className="fas fa-arrow-left text-xl"></i>
                </button>
                <WizardProgress currentStep={5} totalSteps={5} theme={theme} />
                <h1 className={`text-2xl font-bold ${textPrimary} mt-4`}>Documentos</h1>
                <p className={`text-sm ${textMuted}`}>Envie fotos dos seus documentos</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
                {/* Instructions */}
                <div className={`${inputBg} rounded-xl p-4 mb-4`}>
                    <h3 className={`font-bold ${textPrimary} mb-2 flex items-center gap-2`}>
                        <i className="fas fa-camera text-yellow-500"></i>
                        Dicas para boas fotos:
                    </h3>
                    <ul className={`space-y-1 ${textMuted} text-sm`}>
                        <li className="flex items-start gap-2">
                            <i className="fas fa-check text-green-500 mt-0.5"></i>
                            <span>Boa iluminação e foco nítido</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <i className="fas fa-check text-green-500 mt-0.5"></i>
                            <span>Documento inteiro visível</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <i className="fas fa-check text-green-500 mt-0.5"></i>
                            <span>Sem reflexos ou sombras</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <i className="fas fa-check text-green-500 mt-0.5"></i>
                            <span>Máximo 5MB por arquivo</span>
                        </li>
                    </ul>
                </div>

                {/* Document Slots */}
                <DocumentUploadSlot
                    title="CNH - Frente"
                    description="Foto da frente da sua CNH"
                    field="cnhFront"
                    icon="fa-id-card"
                />

                <DocumentUploadSlot
                    title="CNH - Verso"
                    description="Foto do verso da sua CNH"
                    field="cnhBack"
                    icon="fa-id-card"
                />

                <DocumentUploadSlot
                    title="Comprovante de Residência"
                    description="Conta de luz, água ou telefone (últimos 3 meses)"
                    field="proofOfResidence"
                    icon="fa-file-invoice"
                />

                <DocumentUploadSlot
                    title="CRLV - Documento do Veículo"
                    description="Certificado de Registro e Licenciamento do Veículo"
                    field="crlv"
                    icon="fa-file-alt"
                />

                <DocumentUploadSlot
                    title="Foto da Moto"
                    description="Lateral direita mostrando a frente"
                    field="bikePhoto"
                    icon="fa-motorcycle"
                />
            </div>

            {/* Footer */}
            <div className={`${cardBg} border-t ${borderColor} px-4 py-4`}>
                <button
                    onClick={handleNext}
                    className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-yellow-400 to-orange-500 text-zinc-900 hover:shadow-lg hover:scale-[1.02] transition-all"
                >
                    Revisar Cadastro
                    <i className="fas fa-arrow-right ml-2"></i>
                </button>
            </div>
        </div>
    );
};
