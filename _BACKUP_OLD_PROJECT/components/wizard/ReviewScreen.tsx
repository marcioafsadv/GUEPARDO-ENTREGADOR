import React, { useState } from 'react';
import { RegistrationData } from '../../types';

interface ReviewScreenProps {
    theme: 'dark' | 'light';
    data: RegistrationData;
    onEdit: (step: number) => void;
    onSubmit: () => void;
    onBack: () => void;
    isSubmitting: boolean;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({
    theme,
    data,
    onEdit,
    onSubmit,
    onBack,
    isSubmitting
}) => {
    const cardBg = theme === 'dark' ? 'bg-zinc-900' : 'bg-white';
    const textPrimary = theme === 'dark' ? 'text-white' : 'text-zinc-900';
    const textMuted = theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600';
    const borderColor = theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200';
    const inputBg = theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100';

    const ReviewSection = ({
        step,
        title,
        icon,
        children
    }: {
        step: number;
        title: string;
        icon: string;
        children: React.ReactNode;
    }) => (
        <div className={`${cardBg} rounded-xl border ${borderColor} overflow-hidden mb-4`}>
            <div className={`${inputBg} px-4 py-3 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                        <i className="fas fa-check text-white"></i>
                    </div>
                    <div>
                        <p className={`text-xs ${textMuted}`}>Etapa {step}/5</p>
                        <h3 className={`font-bold ${textPrimary}`}>{title}</h3>
                    </div>
                </div>
                <button
                    onClick={() => onEdit(step)}
                    className={`px-4 py-2 rounded-lg font-semibold ${textMuted} hover:${textPrimary} transition-colors`}
                >
                    <i className="fas fa-edit mr-2"></i>
                    Editar
                </button>
            </div>
            <div className="px-4 py-4">
                {children}
            </div>
        </div>
    );

    const DataRow = ({ label, value }: { label: string; value: string }) => (
        <div className="flex justify-between py-2 border-b border-zinc-800/20 last:border-0">
            <span className={`${textMuted} text-sm`}>{label}</span>
            <span className={`${textPrimary} text-sm font-semibold text-right`}>{value}</span>
        </div>
    );

    return (
        <div className={`min-h-screen ${theme === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50'} flex flex-col`}>
            {/* Header */}
            <div className={`${cardBg} border-b ${borderColor} px-4 py-4`}>
                <button onClick={onBack} className={`${textMuted} hover:${textPrimary} mb-3`}>
                    <i className="fas fa-arrow-left text-xl"></i>
                </button>
                <h1 className={`text-2xl font-bold ${textPrimary}`}>Revisar Cadastro</h1>
                <p className={`text-sm ${textMuted}`}>Confira seus dados antes de enviar</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
                {/* Step 1: Personal Data */}
                <ReviewSection step={1} title="Dados Pessoais" icon="fa-user">
                    <DataRow label="Nome" value={data.personal.fullName} />
                    <DataRow label="Data de Nascimento" value={new Date(data.personal.birthDate).toLocaleDateString('pt-BR')} />
                    <DataRow label="CPF" value={data.personal.cpf} />
                    <DataRow label="Telefone" value={data.personal.phone} />
                    <DataRow label="E-mail" value={data.personal.email} />
                    <DataRow label="Gênero" value={data.personal.gender} />
                    <DataRow label="Chave PIX" value={data.personal.pixKey} />
                </ReviewSection>

                {/* Step 2: Photo */}
                <ReviewSection step={2} title="Foto do Rosto" icon="fa-camera">
                    {data.photoUrl ? (
                        <div className="text-center">
                            <img
                                src={data.photoUrl}
                                alt="Foto de perfil"
                                className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-green-500"
                            />
                            <p className={`${textMuted} text-sm mt-2`}>Foto capturada com sucesso</p>
                        </div>
                    ) : (
                        <p className={`${textMuted} text-sm`}>Nenhuma foto enviada</p>
                    )}
                </ReviewSection>

                {/* Step 3: Address */}
                <ReviewSection step={3} title="Endereço" icon="fa-map-marker-alt">
                    <DataRow label="CEP" value={data.address.zipCode} />
                    <DataRow label="Logradouro" value={data.address.street} />
                    <DataRow label="Número" value={data.address.number || 'S/N'} />
                    {data.address.complement && <DataRow label="Complemento" value={data.address.complement} />}
                    {data.address.reference && <DataRow label="Referência" value={data.address.reference} />}
                    <DataRow label="Bairro" value={data.address.district} />
                    <DataRow label="Cidade" value={`${data.address.city} - ${data.address.state}`} />
                </ReviewSection>

                {/* Step 4: Vehicle */}
                <ReviewSection step={4} title="Veículo e CNH" icon="fa-motorcycle">
                    <DataRow label="CNH" value={data.vehicle.cnhNumber} />
                    <DataRow label="Validade CNH" value={new Date(data.vehicle.cnhValidity).toLocaleDateString('pt-BR')} />
                    <DataRow label="Placa" value={data.vehicle.plate} />
                    <DataRow label="UF/Cidade Placa" value={`${data.vehicle.plateState} - ${data.vehicle.plateCity}`} />
                    <DataRow label="Modelo" value={data.vehicle.model} />
                    <DataRow label="Ano" value={data.vehicle.year.toString()} />
                    <DataRow label="Cor" value={data.vehicle.color} />
                    <DataRow label="RENAVAM" value={data.vehicle.renavam} />
                    <DataRow label="Veículo Próprio" value={data.vehicle.isOwner ? 'Sim' : 'Não'} />
                </ReviewSection>

                {/* Step 5: Documents */}
                <ReviewSection step={5} title="Documentos" icon="fa-file-alt">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className={`${textMuted} text-sm`}>CNH - Frente</span>
                            <i className={`fas fa-check-circle text-green-500`}></i>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className={`${textMuted} text-sm`}>CNH - Verso</span>
                            <i className={`fas fa-check-circle text-green-500`}></i>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className={`${textMuted} text-sm`}>Comprovante de Residência</span>
                            <i className={`fas fa-check-circle text-green-500`}></i>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className={`${textMuted} text-sm`}>CRLV</span>
                            <i className={`fas fa-check-circle text-green-500`}></i>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className={`${textMuted} text-sm`}>Foto da Moto</span>
                            <i className={`fas fa-check-circle text-green-500`}></i>
                        </div>
                    </div>
                </ReviewSection>

                {/* City */}
                <div className={`${inputBg} rounded-xl p-4 mb-4`}>
                    <p className={`text-sm ${textMuted} mb-1`}>Praça de Atuação</p>
                    <p className={`font-bold ${textPrimary} text-lg`}>
                        <i className="fas fa-map-marker-alt text-yellow-500 mr-2"></i>
                        {data.workCity}
                    </p>
                </div>

                {/* Important Notice */}
                <div className={`${inputBg} rounded-xl p-4 border-l-4 border-yellow-500`}>
                    <p className={`${textPrimary} font-semibold mb-2`}>
                        <i className="fas fa-info-circle text-yellow-500 mr-2"></i>
                        Importante
                    </p>
                    <p className={`${textMuted} text-sm`}>
                        Após enviar seu cadastro, ele passará por análise da nossa equipe.
                        Você receberá um e-mail quando for aprovado para começar a trabalhar.
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className={`${cardBg} border-t ${borderColor} px-4 py-4`}>
                <button
                    onClick={onSubmit}
                    disabled={isSubmitting}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${isSubmitting
                            ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-zinc-900 hover:shadow-lg hover:scale-[1.02]'
                        }`}
                >
                    {isSubmitting ? (
                        <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            Enviando...
                        </>
                    ) : (
                        <>
                            <i className="fas fa-check-circle mr-2"></i>
                            Finalizar Cadastro
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
