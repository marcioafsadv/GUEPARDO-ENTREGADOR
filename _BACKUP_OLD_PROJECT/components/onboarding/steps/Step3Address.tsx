import React, { useState } from 'react';
import { maskCEP, isValidCEP } from '../../../utils/masks';

interface Step3AddressProps {
    data: {
        zipCode: string;
        street: string;
        number: string;
        hasNoNumber: boolean;
        complement: string;
        reference: string;
        district: string;
        city: string;
        state: string;
    };
    onUpdate: (updates: any) => void;
    onNext: () => void;
    theme?: 'dark' | 'light';
}

const Step3Address: React.FC<Step3AddressProps> = ({ data, onUpdate, onNext, theme = 'dark' }) => {
    const [isLoadingCEP, setIsLoadingCEP] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const fetchAddressByCEP = async (cep: string) => {
        if (!isValidCEP(cep)) return;

        setIsLoadingCEP(true);
        try {
            const cleanCEP = cep.replace(/\D/g, '');
            const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
            const addressData = await response.json();

            if (addressData.erro) {
                setErrors({ zipCode: 'CEP não encontrado' });
                return;
            }

            onUpdate({
                street: addressData.logradouro || '',
                district: addressData.bairro || '',
                city: addressData.localidade || '',
                state: addressData.uf || '',
            });

            setErrors({});
        } catch (error) {
            setErrors({ zipCode: 'Erro ao buscar CEP' });
        } finally {
            setIsLoadingCEP(false);
        }
    };

    const validateAndNext = () => {
        const newErrors: Record<string, string> = {};

        if (!isValidCEP(data.zipCode)) {
            newErrors.zipCode = 'CEP inválido';
        }
        if (!data.street) {
            newErrors.street = 'Logradouro é obrigatório';
        }
        if (!data.hasNoNumber && !data.number) {
            newErrors.number = 'Número é obrigatório';
        }
        if (!data.district) {
            newErrors.district = 'Bairro é obrigatório';
        }
        if (!data.city) {
            newErrors.city = 'Cidade é obrigatória';
        }
        if (!data.state) {
            newErrors.state = 'Estado é obrigatório';
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
                <h2 className={`text-3xl font-black italic ${textPrimary} mb-2`}>Endereço</h2>
                <p className={`text-sm ${textMuted}`}>Onde você mora atualmente</p>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {/* CEP */}
                <div>
                    <label className={`text-xs font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>
                        CEP *
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={data.zipCode}
                            onChange={(e) => {
                                const masked = maskCEP(e.target.value);
                                onUpdate({ zipCode: masked });
                                if (masked.length === 9) {
                                    fetchAddressByCEP(masked);
                                }
                            }}
                            placeholder="00000-000"
                            maxLength={9}
                            className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border ${errors.zipCode ? 'border-red-500' : 'border-white/5'} focus:border-[#FF6B00] font-bold placeholder:text-zinc-600`}
                        />
                        {isLoadingCEP && (
                            <i className="fas fa-circle-notch fa-spin absolute right-4 top-4 text-[#FF6B00]"></i>
                        )}
                    </div>
                    {errors.zipCode && <p className="text-xs text-red-500 mt-1 ml-2">{errors.zipCode}</p>}
                </div>

                {/* Logradouro */}
                <div>
                    <label className={`text-xs font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>
                        Logradouro *
                    </label>
                    <input
                        type="text"
                        value={data.street}
                        onChange={(e) => onUpdate({ street: e.target.value })}
                        placeholder="Rua, Avenida, etc."
                        className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border ${errors.street ? 'border-red-500' : 'border-white/5'} focus:border-[#FF6B00] font-bold placeholder:text-zinc-600`}
                    />
                    {errors.street && <p className="text-xs text-red-500 mt-1 ml-2">{errors.street}</p>}
                </div>

                {/* Número e Checkbox */}
                <div className="flex space-x-3">
                    <div className="flex-1">
                        <label className={`text-xs font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>
                            Número {!data.hasNoNumber && '*'}
                        </label>
                        <input
                            type="text"
                            value={data.number}
                            onChange={(e) => onUpdate({ number: e.target.value })}
                            placeholder="123"
                            disabled={data.hasNoNumber}
                            className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border ${errors.number ? 'border-red-500' : 'border-white/5'} focus:border-[#FF6B00] font-bold placeholder:text-zinc-600 disabled:opacity-50`}
                        />
                        {errors.number && <p className="text-xs text-red-500 mt-1 ml-2">{errors.number}</p>}
                    </div>
                    <div className="flex items-end pb-3">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={data.hasNoNumber}
                                onChange={(e) => onUpdate({ hasNoNumber: e.target.checked, number: e.target.checked ? '' : data.number })}
                                className="w-5 h-5 rounded accent-[#FF6B00]"
                            />
                            <span className={`text-sm font-bold ${textPrimary}`}>Sem número</span>
                        </label>
                    </div>
                </div>

                {/* Complemento */}
                <div>
                    <label className={`text-xs font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>
                        Complemento
                    </label>
                    <input
                        type="text"
                        value={data.complement}
                        onChange={(e) => onUpdate({ complement: e.target.value })}
                        placeholder="Apto, Bloco, etc."
                        className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border border-white/5 focus:border-[#FF6B00] font-bold placeholder:text-zinc-600`}
                    />
                </div>

                {/* Referência */}
                <div>
                    <label className={`text-xs font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>
                        Ponto de Referência
                    </label>
                    <input
                        type="text"
                        value={data.reference}
                        onChange={(e) => onUpdate({ reference: e.target.value })}
                        placeholder="Próximo ao mercado, etc."
                        className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border border-white/5 focus:border-[#FF6B00] font-bold placeholder:text-zinc-600`}
                    />
                </div>

                {/* Bairro */}
                <div>
                    <label className={`text-xs font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>
                        Bairro *
                    </label>
                    <input
                        type="text"
                        value={data.district}
                        onChange={(e) => onUpdate({ district: e.target.value })}
                        placeholder="Nome do bairro"
                        className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border ${errors.district ? 'border-red-500' : 'border-white/5'} focus:border-[#FF6B00] font-bold placeholder:text-zinc-600`}
                    />
                    {errors.district && <p className="text-xs text-red-500 mt-1 ml-2">{errors.district}</p>}
                </div>

                {/* Cidade e UF */}
                <div className="flex space-x-3">
                    <div className="flex-1">
                        <label className={`text-xs font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>
                            Cidade *
                        </label>
                        <input
                            type="text"
                            value={data.city}
                            onChange={(e) => onUpdate({ city: e.target.value })}
                            placeholder="Nome da cidade"
                            className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border ${errors.city ? 'border-red-500' : 'border-white/5'} focus:border-[#FF6B00] font-bold placeholder:text-zinc-600`}
                        />
                        {errors.city && <p className="text-xs text-red-500 mt-1 ml-2">{errors.city}</p>}
                    </div>
                    <div className="w-24">
                        <label className={`text-xs font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>
                            UF *
                        </label>
                        <input
                            type="text"
                            value={data.state}
                            onChange={(e) => onUpdate({ state: e.target.value.toUpperCase() })}
                            placeholder="SP"
                            maxLength={2}
                            className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border ${errors.state ? 'border-red-500' : 'border-white/5'} focus:border-[#FF6B00] font-bold placeholder:text-zinc-600 text-center uppercase`}
                        />
                        {errors.state && <p className="text-xs text-red-500 mt-1 ml-2">{errors.state}</p>}
                    </div>
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

export default Step3Address;
