import React, { useState } from 'react';
import { maskPlate, maskCNH, maskRENAVAM, maskYear } from '../../../utils/masks';

interface Step4VehicleProps {
    data: {
        cnhNumber: string;
        cnhValidity: string;
        plate: string;
        plateState: string;
        plateCity: string;
        model: string;
        year: string;
        color: string;
        renavam: string;
        isOwner: boolean;
    };
    onUpdate: (updates: any) => void;
    onNext: () => void;
    theme?: 'dark' | 'light';
}

const Step4Vehicle: React.FC<Step4VehicleProps> = ({ data, onUpdate, onNext, theme = 'dark' }) => {
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateAndNext = () => {
        const newErrors: Record<string, string> = {};

        if (!data.cnhNumber || data.cnhNumber.length < 11) {
            newErrors.cnhNumber = 'CNH inválida';
        }

        if (!data.cnhValidity) {
            newErrors.cnhValidity = 'Data de validade é obrigatória';
        } else {
            const validityDate = new Date(data.cnhValidity);
            const today = new Date();
            if (validityDate < today) {
                newErrors.cnhValidity = 'CNH vencida';
            }
        }

        if (!data.plate || data.plate.length < 7) {
            newErrors.plate = 'Placa inválida';
        }

        if (!data.plateState) {
            newErrors.plateState = 'UF da placa é obrigatória';
        }

        if (!data.plateCity) {
            newErrors.plateCity = 'Cidade da placa é obrigatória';
        }

        if (!data.model) {
            newErrors.model = 'Modelo é obrigatório';
        }

        if (!data.year || parseInt(data.year) < 1900 || parseInt(data.year) > new Date().getFullYear() + 1) {
            newErrors.year = 'Ano inválido';
        }

        if (!data.color) {
            newErrors.color = 'Cor é obrigatória';
        }

        if (!data.renavam || data.renavam.length < 9) {
            newErrors.renavam = 'RENAVAM inválido';
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            onNext();
        }
    };

    const innerBg = theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100';
    const textPrimary = theme === 'dark' ? 'text-white' : 'text-zinc-900';
    const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';

    return (
        <div className="space-y-6">
            <div>
                <h2 className={`text-3xl font-black italic ${textPrimary} mb-2`}>Dados do Veículo</h2>
                <p className={`text-sm ${textMuted}`}>Informações da sua moto e CNH</p>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {/* CNH Number */}
                <div>
                    <label className={`text-xs font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>
                        Número da CNH *
                    </label>
                    <input
                        type="text"
                        value={data.cnhNumber}
                        onChange={(e) => onUpdate({ cnhNumber: maskCNH(e.target.value) })}
                        placeholder="00000000000"
                        maxLength={11}
                        className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border ${errors.cnhNumber ? 'border-red-500' : 'border-white/5'} focus:border-[#FF6B00] font-bold placeholder:text-zinc-600`}
                    />
                    {errors.cnhNumber && <p className="text-xs text-red-500 mt-1 ml-2">{errors.cnhNumber}</p>}
                </div>

                {/* CNH Validity */}
                <div>
                    <label className={`text-xs font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>
                        Validade da CNH *
                    </label>
                    <input
                        type="date"
                        value={data.cnhValidity}
                        onChange={(e) => onUpdate({ cnhValidity: e.target.value })}
                        className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border ${errors.cnhValidity ? 'border-red-500' : 'border-white/5'} focus:border-[#FF6B00] font-bold`}
                    />
                    {errors.cnhValidity && <p className="text-xs text-red-500 mt-1 ml-2">{errors.cnhValidity}</p>}
                </div>

                {/* Plate */}
                <div>
                    <label className={`text-xs font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>
                        Placa *
                    </label>
                    <input
                        type="text"
                        value={data.plate}
                        onChange={(e) => onUpdate({ plate: maskPlate(e.target.value) })}
                        placeholder="ABC1D23 ou ABC-1234"
                        maxLength={8}
                        className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border ${errors.plate ? 'border-red-500' : 'border-white/5'} focus:border-[#FF6B00] font-bold placeholder:text-zinc-600 uppercase`}
                    />
                    {errors.plate && <p className="text-xs text-red-500 mt-1 ml-2">{errors.plate}</p>}
                    <p className={`text-xs ${textMuted} mt-1 ml-2`}>Formato Mercosul (ABC1D23) ou antigo (ABC-1234)</p>
                </div>

                {/* Plate State and City */}
                <div className="flex space-x-3">
                    <div className="w-24">
                        <label className={`text-xs font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>
                            UF Placa *
                        </label>
                        <input
                            type="text"
                            value={data.plateState}
                            onChange={(e) => onUpdate({ plateState: e.target.value.toUpperCase() })}
                            placeholder="SP"
                            maxLength={2}
                            className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border ${errors.plateState ? 'border-red-500' : 'border-white/5'} focus:border-[#FF6B00] font-bold placeholder:text-zinc-600 text-center uppercase`}
                        />
                        {errors.plateState && <p className="text-xs text-red-500 mt-1 ml-2">{errors.plateState}</p>}
                    </div>
                    <div className="flex-1">
                        <label className={`text-xs font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>
                            Cidade da Placa *
                        </label>
                        <input
                            type="text"
                            value={data.plateCity}
                            onChange={(e) => onUpdate({ plateCity: e.target.value })}
                            placeholder="Nome da cidade"
                            className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border ${errors.plateCity ? 'border-red-500' : 'border-white/5'} focus:border-[#FF6B00] font-bold placeholder:text-zinc-600`}
                        />
                        {errors.plateCity && <p className="text-xs text-red-500 mt-1 ml-2">{errors.plateCity}</p>}
                    </div>
                </div>

                {/* Model */}
                <div>
                    <label className={`text-xs font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>
                        Modelo da Moto *
                    </label>
                    <input
                        type="text"
                        value={data.model}
                        onChange={(e) => onUpdate({ model: e.target.value })}
                        placeholder="Ex: Honda CG 160"
                        className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border ${errors.model ? 'border-red-500' : 'border-white/5'} focus:border-[#FF6B00] font-bold placeholder:text-zinc-600`}
                    />
                    {errors.model && <p className="text-xs text-red-500 mt-1 ml-2">{errors.model}</p>}
                </div>

                {/* Year and Color */}
                <div className="flex space-x-3">
                    <div className="w-32">
                        <label className={`text-xs font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>
                            Ano *
                        </label>
                        <input
                            type="text"
                            value={data.year}
                            onChange={(e) => onUpdate({ year: maskYear(e.target.value) })}
                            placeholder="2020"
                            maxLength={4}
                            className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border ${errors.year ? 'border-red-500' : 'border-white/5'} focus:border-[#FF6B00] font-bold placeholder:text-zinc-600`}
                        />
                        {errors.year && <p className="text-xs text-red-500 mt-1 ml-2">{errors.year}</p>}
                    </div>
                    <div className="flex-1">
                        <label className={`text-xs font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>
                            Cor *
                        </label>
                        <input
                            type="text"
                            value={data.color}
                            onChange={(e) => onUpdate({ color: e.target.value })}
                            placeholder="Ex: Preta"
                            className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border ${errors.color ? 'border-red-500' : 'border-white/5'} focus:border-[#FF6B00] font-bold placeholder:text-zinc-600`}
                        />
                        {errors.color && <p className="text-xs text-red-500 mt-1 ml-2">{errors.color}</p>}
                    </div>
                </div>

                {/* RENAVAM */}
                <div>
                    <label className={`text-xs font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>
                        Código RENAVAM *
                    </label>
                    <input
                        type="text"
                        value={data.renavam}
                        onChange={(e) => onUpdate({ renavam: maskRENAVAM(e.target.value) })}
                        placeholder="00000000000"
                        maxLength={11}
                        className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border ${errors.renavam ? 'border-red-500' : 'border-white/5'} focus:border-[#FF6B00] font-bold placeholder:text-zinc-600`}
                    />
                    {errors.renavam && <p className="text-xs text-red-500 mt-1 ml-2">{errors.renavam}</p>}
                </div>

                {/* Is Owner */}
                <div className={`p-4 rounded-xl ${innerBg}`}>
                    <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={data.isOwner}
                            onChange={(e) => onUpdate({ isOwner: e.target.checked })}
                            className="w-5 h-5 rounded accent-[#FF6B00]"
                        />
                        <div>
                            <span className={`text-sm font-bold ${textPrimary} block`}>Veículo Próprio</span>
                            <span className={`text-xs ${textMuted}`}>Marque se a moto é sua</span>
                        </div>
                    </label>
                </div>
            </div>

            <button
                onClick={validateAndNext}
                className="w-full h-14 bg-[#FF6B00] rounded-2xl font-black text-white uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:scale-105 transition-transform"
            >
                Continuar
            </button>
        </div>
    );
};

export default Step4Vehicle;
