import React, { useState } from 'react';
import { VehicleData } from '../../types';
import { applyCnhMask, applyPlateMask, applyRenavamMask } from '../../utils/masks';
import { validateCnh, validatePlate, validateRenavam, validateFutureDate } from '../../utils/validation';
import { WizardProgress } from './WizardProgress';

interface Step4VehicleProps {
    theme: 'dark' | 'light';
    data: VehicleData;
    onDataChange: (data: VehicleData) => void;
    onNext: () => void;
    onBack: () => void;
}

export const Step4Vehicle: React.FC<Step4VehicleProps> = ({
    theme,
    data,
    onDataChange,
    onNext,
    onBack
}) => {
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (field: keyof VehicleData, value: string | number | boolean) => {
        let processedValue = value;

        if (typeof value === 'string') {
            if (field === 'cnhNumber') processedValue = applyCnhMask(value);
            if (field === 'plate') processedValue = applyPlateMask(value);
            if (field === 'renavam') processedValue = applyRenavamMask(value);
        }

        onDataChange({ ...data, [field]: processedValue });

        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!data.cnhNumber) newErrors.cnhNumber = 'CNH é obrigatória';
        else if (!validateCnh(data.cnhNumber)) newErrors.cnhNumber = 'CNH inválida';

        if (!data.cnhValidity) newErrors.cnhValidity = 'Validade da CNH é obrigatória';
        else if (!validateFutureDate(data.cnhValidity)) newErrors.cnhValidity = 'CNH vencida ou inválida';

        if (!data.plate) newErrors.plate = 'Placa é obrigatória';
        else if (!validatePlate(data.plate)) newErrors.plate = 'Placa inválida';

        if (!data.plateState.trim()) newErrors.plateState = 'UF da placa é obrigatória';
        if (!data.plateCity.trim()) newErrors.plateCity = 'Cidade da placa é obrigatória';
        if (!data.model.trim()) newErrors.model = 'Modelo é obrigatório';

        if (!data.year) newErrors.year = 'Ano é obrigatório';
        else if (data.year < 1990 || data.year > new Date().getFullYear() + 1) {
            newErrors.year = 'Ano inválido';
        }

        if (!data.color.trim()) newErrors.color = 'Cor é obrigatória';
        if (!data.renavam) newErrors.renavam = 'RENAVAM é obrigatório';
        else if (!validateRenavam(data.renavam)) newErrors.renavam = 'RENAVAM inválido';

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
                <WizardProgress currentStep={4} totalSteps={5} theme={theme} />
                <h1 className={`text-2xl font-bold ${textPrimary} mt-4`}>Veículo e CNH</h1>
                <p className={`text-sm ${textMuted}`}>Dados do seu veículo e habilitação</p>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
                {/* CNH Number */}
                <div>
                    <label className={`block text-sm font-semibold ${textPrimary} mb-2`}>
                        Número da CNH *
                    </label>
                    <input
                        type="text"
                        value={data.cnhNumber}
                        onChange={(e) => handleChange('cnhNumber', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl ${inputBg} ${textPrimary} outline-none ${errors.cnhNumber ? 'border-2 border-red-500' : ''
                            }`}
                        placeholder="00000000000"
                        maxLength={11}
                    />
                    {errors.cnhNumber && <p className="text-red-500 text-sm mt-1">{errors.cnhNumber}</p>}
                </div>

                {/* CNH Validity */}
                <div>
                    <label className={`block text-sm font-semibold ${textPrimary} mb-2`}>
                        Validade da CNH *
                    </label>
                    <input
                        type="date"
                        value={data.cnhValidity}
                        onChange={(e) => handleChange('cnhValidity', e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className={`w-full px-4 py-3 rounded-xl ${inputBg} ${textPrimary} outline-none ${errors.cnhValidity ? 'border-2 border-red-500' : ''
                            }`}
                    />
                    {errors.cnhValidity && <p className="text-red-500 text-sm mt-1">{errors.cnhValidity}</p>}
                </div>

                {/* Plate */}
                <div>
                    <label className={`block text-sm font-semibold ${textPrimary} mb-2`}>
                        Placa *
                    </label>
                    <input
                        type="text"
                        value={data.plate}
                        onChange={(e) => handleChange('plate', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl ${inputBg} ${textPrimary} outline-none ${errors.plate ? 'border-2 border-red-500' : ''
                            }`}
                        placeholder="ABC1D23 ou ABC-1234"
                        maxLength={8}
                    />
                    <p className={`text-xs ${textMuted} mt-1`}>
                        <i className="fas fa-info-circle mr-1"></i>
                        Formato Mercosul ou antigo
                    </p>
                    {errors.plate && <p className="text-red-500 text-sm mt-1">{errors.plate}</p>}
                </div>

                {/* Plate State and City */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={`block text-sm font-semibold ${textPrimary} mb-2`}>
                            UF da Placa *
                        </label>
                        <input
                            type="text"
                            value={data.plateState}
                            onChange={(e) => handleChange('plateState', e.target.value.toUpperCase())}
                            className={`w-full px-4 py-3 rounded-xl ${inputBg} ${textPrimary} outline-none ${errors.plateState ? 'border-2 border-red-500' : ''
                                }`}
                            placeholder="SP"
                            maxLength={2}
                        />
                        {errors.plateState && <p className="text-red-500 text-sm mt-1">{errors.plateState}</p>}
                    </div>
                    <div>
                        <label className={`block text-sm font-semibold ${textPrimary} mb-2`}>
                            Cidade da Placa *
                        </label>
                        <input
                            type="text"
                            value={data.plateCity}
                            onChange={(e) => handleChange('plateCity', e.target.value)}
                            className={`w-full px-4 py-3 rounded-xl ${inputBg} ${textPrimary} outline-none ${errors.plateCity ? 'border-2 border-red-500' : ''
                                }`}
                            placeholder="Itu"
                        />
                        {errors.plateCity && <p className="text-red-500 text-sm mt-1">{errors.plateCity}</p>}
                    </div>
                </div>

                {/* Model */}
                <div>
                    <label className={`block text-sm font-semibold ${textPrimary} mb-2`}>
                        Modelo da Moto *
                    </label>
                    <input
                        type="text"
                        value={data.model}
                        onChange={(e) => handleChange('model', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl ${inputBg} ${textPrimary} outline-none ${errors.model ? 'border-2 border-red-500' : ''
                            }`}
                        placeholder="Honda CG 160"
                    />
                    {errors.model && <p className="text-red-500 text-sm mt-1">{errors.model}</p>}
                </div>

                {/* Year and Color */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={`block text-sm font-semibold ${textPrimary} mb-2`}>
                            Ano de Fabricação *
                        </label>
                        <input
                            type="number"
                            value={data.year || ''}
                            onChange={(e) => handleChange('year', parseInt(e.target.value) || 0)}
                            className={`w-full px-4 py-3 rounded-xl ${inputBg} ${textPrimary} outline-none ${errors.year ? 'border-2 border-red-500' : ''
                                }`}
                            placeholder="2020"
                            min={1990}
                            max={new Date().getFullYear() + 1}
                        />
                        {errors.year && <p className="text-red-500 text-sm mt-1">{errors.year}</p>}
                    </div>
                    <div>
                        <label className={`block text-sm font-semibold ${textPrimary} mb-2`}>
                            Cor *
                        </label>
                        <input
                            type="text"
                            value={data.color}
                            onChange={(e) => handleChange('color', e.target.value)}
                            className={`w-full px-4 py-3 rounded-xl ${inputBg} ${textPrimary} outline-none ${errors.color ? 'border-2 border-red-500' : ''
                                }`}
                            placeholder="Preta"
                        />
                        {errors.color && <p className="text-red-500 text-sm mt-1">{errors.color}</p>}
                    </div>
                </div>

                {/* RENAVAM */}
                <div>
                    <label className={`block text-sm font-semibold ${textPrimary} mb-2`}>
                        Código RENAVAM *
                    </label>
                    <input
                        type="text"
                        value={data.renavam}
                        onChange={(e) => handleChange('renavam', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl ${inputBg} ${textPrimary} outline-none ${errors.renavam ? 'border-2 border-red-500' : ''
                            }`}
                        placeholder="00000000000"
                        maxLength={11}
                    />
                    {errors.renavam && <p className="text-red-500 text-sm mt-1">{errors.renavam}</p>}
                </div>

                {/* Is Owner */}
                <div className={`${inputBg} rounded-xl p-4`}>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={data.isOwner}
                            onChange={(e) => handleChange('isOwner', e.target.checked)}
                            className="w-5 h-5"
                        />
                        <div>
                            <p className={`font-semibold ${textPrimary}`}>Veículo Próprio</p>
                            <p className={`text-sm ${textMuted}`}>Marque se a moto é sua</p>
                        </div>
                    </label>
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
