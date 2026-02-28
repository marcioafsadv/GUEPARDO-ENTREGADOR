import React, { useState } from 'react';
import { AddressData } from '../../types';
import { applyCepMask } from '../../utils/masks';
import { validateCep } from '../../utils/validation';
import { lookupCEP } from '../../supabase';
import { WizardProgress } from './WizardProgress';

interface Step3AddressProps {
    theme: 'dark' | 'light';
    data: AddressData;
    onDataChange: (data: AddressData) => void;
    onNext: () => void;
    onBack: () => void;
}

export const Step3Address: React.FC<Step3AddressProps> = ({
    theme,
    data,
    onDataChange,
    onNext,
    onBack
}) => {
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoadingCep, setIsLoadingCep] = useState(false);

    const handleChange = (field: keyof AddressData, value: string | boolean) => {
        let processedValue = value;

        if (field === 'zipCode' && typeof value === 'string') {
            processedValue = applyCepMask(value);
        }

        onDataChange({ ...data, [field]: processedValue });

        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleCepLookup = async () => {
        if (!validateCep(data.zipCode)) {
            setErrors(prev => ({ ...prev, zipCode: 'CEP inválido' }));
            return;
        }

        setIsLoadingCep(true);
        try {
            const cepData = await lookupCEP(data.zipCode);
            if (cepData) {
                onDataChange({
                    ...data,
                    street: cepData.logradouro || data.street,
                    district: cepData.bairro || data.district,
                    city: cepData.localidade || data.city,
                    state: cepData.uf || data.state,
                    complement: cepData.complemento || data.complement
                });
            }
        } catch (error: any) {
            setErrors(prev => ({ ...prev, zipCode: error.message || 'Erro ao buscar CEP' }));
        } finally {
            setIsLoadingCep(false);
        }
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!data.zipCode) newErrors.zipCode = 'CEP é obrigatório';
        else if (!validateCep(data.zipCode)) newErrors.zipCode = 'CEP inválido';

        if (!data.street.trim()) newErrors.street = 'Logradouro é obrigatório';
        if (!data.hasNoNumber && !data.number.trim()) newErrors.number = 'Número é obrigatório';
        if (!data.district.trim()) newErrors.district = 'Bairro é obrigatório';
        if (!data.city.trim()) newErrors.city = 'Cidade é obrigatória';
        if (!data.state.trim()) newErrors.state = 'Estado é obrigatório';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validate()) {
            onNext();
        }
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
                <WizardProgress currentStep={3} totalSteps={5} theme={theme} />
                <h1 className={`text-2xl font-bold ${textPrimary} mt-4`}>Endereço</h1>
                <p className={`text-sm ${textMuted}`}>Onde você mora</p>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
                {/* CEP */}
                <div>
                    <label className={`block text-sm font-semibold ${textPrimary} mb-2`}>
                        CEP *
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={data.zipCode}
                            onChange={(e) => handleChange('zipCode', e.target.value)}
                            onBlur={handleCepLookup}
                            className={`flex-1 px-4 py-3 rounded-xl ${inputBg} ${textPrimary} outline-none ${errors.zipCode ? 'border-2 border-red-500' : ''
                                }`}
                            placeholder="00000-000"
                            maxLength={9}
                        />
                        <button
                            onClick={handleCepLookup}
                            disabled={isLoadingCep}
                            className={`px-6 py-3 rounded-xl font-bold ${inputBg} ${textPrimary} hover:opacity-80 transition-all disabled:opacity-50`}
                        >
                            {isLoadingCep ? (
                                <i className="fas fa-spinner fa-spin"></i>
                            ) : (
                                <i className="fas fa-search"></i>
                            )}
                        </button>
                    </div>
                    {errors.zipCode && <p className="text-red-500 text-sm mt-1">{errors.zipCode}</p>}
                </div>

                {/* Logradouro */}
                <div>
                    <label className={`block text-sm font-semibold ${textPrimary} mb-2`}>
                        Logradouro *
                    </label>
                    <input
                        type="text"
                        value={data.street}
                        onChange={(e) => handleChange('street', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl ${inputBg} ${textPrimary} outline-none ${errors.street ? 'border-2 border-red-500' : ''
                            }`}
                        placeholder="Rua, Avenida, etc."
                    />
                    {errors.street && <p className="text-red-500 text-sm mt-1">{errors.street}</p>}
                </div>

                {/* Número */}
                <div>
                    <label className={`block text-sm font-semibold ${textPrimary} mb-2`}>
                        Número {!data.hasNoNumber && '*'}
                    </label>
                    <input
                        type="text"
                        value={data.number}
                        onChange={(e) => handleChange('number', e.target.value)}
                        disabled={data.hasNoNumber}
                        className={`w-full px-4 py-3 rounded-xl ${inputBg} ${textPrimary} outline-none ${errors.number ? 'border-2 border-red-500' : ''
                            } ${data.hasNoNumber ? 'opacity-50' : ''}`}
                        placeholder="123"
                    />
                    <label className="flex items-center gap-2 mt-2">
                        <input
                            type="checkbox"
                            checked={data.hasNoNumber}
                            onChange={(e) => handleChange('hasNoNumber', e.target.checked)}
                            className="w-4 h-4"
                        />
                        <span className={`text-sm ${textMuted}`}>Sem número</span>
                    </label>
                    {errors.number && <p className="text-red-500 text-sm mt-1">{errors.number}</p>}
                </div>

                {/* Complemento */}
                <div>
                    <label className={`block text-sm font-semibold ${textPrimary} mb-2`}>
                        Complemento
                    </label>
                    <input
                        type="text"
                        value={data.complement}
                        onChange={(e) => handleChange('complement', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl ${inputBg} ${textPrimary} outline-none`}
                        placeholder="Apto, Bloco, etc."
                    />
                </div>

                {/* Referência */}
                <div>
                    <label className={`block text-sm font-semibold ${textPrimary} mb-2`}>
                        Ponto de Referência
                    </label>
                    <input
                        type="text"
                        value={data.reference}
                        onChange={(e) => handleChange('reference', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl ${inputBg} ${textPrimary} outline-none`}
                        placeholder="Próximo ao mercado, etc."
                    />
                </div>

                {/* Bairro */}
                <div>
                    <label className={`block text-sm font-semibold ${textPrimary} mb-2`}>
                        Bairro *
                    </label>
                    <input
                        type="text"
                        value={data.district}
                        onChange={(e) => handleChange('district', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl ${inputBg} ${textPrimary} outline-none ${errors.district ? 'border-2 border-red-500' : ''
                            }`}
                        placeholder="Centro"
                    />
                    {errors.district && <p className="text-red-500 text-sm mt-1">{errors.district}</p>}
                </div>

                {/* Cidade e Estado */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={`block text-sm font-semibold ${textPrimary} mb-2`}>
                            Cidade *
                        </label>
                        <input
                            type="text"
                            value={data.city}
                            onChange={(e) => handleChange('city', e.target.value)}
                            className={`w-full px-4 py-3 rounded-xl ${inputBg} ${textPrimary} outline-none ${errors.city ? 'border-2 border-red-500' : ''
                                }`}
                            placeholder="Itu"
                        />
                        {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                    </div>
                    <div>
                        <label className={`block text-sm font-semibold ${textPrimary} mb-2`}>
                            UF *
                        </label>
                        <input
                            type="text"
                            value={data.state}
                            onChange={(e) => handleChange('state', e.target.value.toUpperCase())}
                            className={`w-full px-4 py-3 rounded-xl ${inputBg} ${textPrimary} outline-none ${errors.state ? 'border-2 border-red-500' : ''
                                }`}
                            placeholder="SP"
                            maxLength={2}
                        />
                        {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className={`${cardBg} border-t ${borderColor} px-4 py-4`}>
                <button
                    onClick={handleNext}
                    className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-yellow-400 to-orange-500 text-zinc-900 hover:shadow-lg hover:scale-[1.02] transition-all"
                >
                    Continuar
                    <i className="fas fa-arrow-right ml-2"></i>
                </button>
            </div>
        </div>
    );
};
