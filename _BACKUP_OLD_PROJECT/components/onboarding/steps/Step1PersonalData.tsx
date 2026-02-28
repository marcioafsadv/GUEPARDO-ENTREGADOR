import React, { useState } from 'react';
import { maskCPF, maskPhone, isValidCPF, isValidEmail, isValidPhone } from '../../../utils/masks';
import PasswordValidator from './PasswordValidator';

interface Step1PersonalDataProps {
    data: {
        fullName: string;
        birthDate: string;
        cpf: string;
        phone: string;
        email: string;
        gender: string;
        pixKey: string;
        password: string;
        confirmPassword: string;
    };
    onUpdate: (updates: any) => void;
    onNext: () => void;
    theme?: 'dark' | 'light';
}

const Step1PersonalData: React.FC<Step1PersonalDataProps> = ({ data, onUpdate, onNext, theme = 'dark' }) => {
    const [isPasswordValid, setIsPasswordValid] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateAndNext = () => {
        const newErrors: Record<string, string> = {};

        if (!data.fullName || data.fullName.length < 3) {
            newErrors.fullName = 'Nome completo é obrigatório';
        }

        if (!data.birthDate) {
            newErrors.birthDate = 'Data de nascimento é obrigatória';
        } else {
            const birthYear = new Date(data.birthDate).getFullYear();
            const currentYear = new Date().getFullYear();
            if (currentYear - birthYear < 18) {
                newErrors.birthDate = 'Você deve ter pelo menos 18 anos';
            }
        }

        if (!isValidCPF(data.cpf)) {
            newErrors.cpf = 'CPF inválido';
        }

        if (!isValidPhone(data.phone)) {
            newErrors.phone = 'Telefone inválido';
        }

        if (!isValidEmail(data.email)) {
            newErrors.email = 'E-mail inválido';
        }

        if (!data.gender) {
            newErrors.gender = 'Selecione o gênero';
        }

        if (!data.pixKey) {
            newErrors.pixKey = 'Chave Pix é obrigatória';
        }

        if (!isPasswordValid) {
            newErrors.password = 'Senha não atende aos requisitos';
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            onNext();
        }
    };

    const cardBg = theme === 'dark' ? 'bg-zinc-900' : 'bg-white';
    const innerBg = theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100';
    const textPrimary = theme === 'dark' ? 'text-white' : 'text-zinc-900';
    const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';

    return (
        <div className="space-y-6">
            <div>
                <h2 className={`text-3xl font-black italic ${textPrimary} mb-2`}>Dados Pessoais</h2>
                <p className={`text-sm ${textMuted}`}>Preencha seus dados para começar</p>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {/* Nome Completo */}
                <div>
                    <label className={`text-xs font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>
                        Nome Completo *
                    </label>
                    <input
                        type="text"
                        value={data.fullName}
                        onChange={(e) => onUpdate({ fullName: e.target.value })}
                        placeholder="Seu nome completo"
                        className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border ${errors.fullName ? 'border-red-500' : 'border-white/5'} focus:border-[#FF6B00] font-bold placeholder:text-zinc-600`}
                    />
                    {errors.fullName && <p className="text-xs text-red-500 mt-1 ml-2">{errors.fullName}</p>}
                </div>

                {/* Data de Nascimento */}
                <div>
                    <label className={`text-xs font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>
                        Data de Nascimento *
                    </label>
                    <input
                        type="date"
                        value={data.birthDate}
                        onChange={(e) => onUpdate({ birthDate: e.target.value })}
                        className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border ${errors.birthDate ? 'border-red-500' : 'border-white/5'} focus:border-[#FF6B00] font-bold`}
                    />
                    {errors.birthDate && <p className="text-xs text-red-500 mt-1 ml-2">{errors.birthDate}</p>}
                </div>

                {/* CPF */}
                <div>
                    <label className={`text-xs font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>
                        CPF *
                    </label>
                    <input
                        type="text"
                        value={data.cpf}
                        onChange={(e) => onUpdate({ cpf: maskCPF(e.target.value) })}
                        placeholder="000.000.000-00"
                        maxLength={14}
                        className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border ${errors.cpf ? 'border-red-500' : 'border-white/5'} focus:border-[#FF6B00] font-bold placeholder:text-zinc-600`}
                    />
                    {errors.cpf && <p className="text-xs text-red-500 mt-1 ml-2">{errors.cpf}</p>}
                </div>

                {/* Telefone */}
                <div>
                    <label className={`text-xs font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>
                        Telefone *
                    </label>
                    <input
                        type="tel"
                        value={data.phone}
                        onChange={(e) => onUpdate({ phone: maskPhone(e.target.value) })}
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                        className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border ${errors.phone ? 'border-red-500' : 'border-white/5'} focus:border-[#FF6B00] font-bold placeholder:text-zinc-600`}
                    />
                    {errors.phone && <p className="text-xs text-red-500 mt-1 ml-2">{errors.phone}</p>}
                </div>

                {/* Email */}
                <div>
                    <label className={`text-xs font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>
                        E-mail *
                    </label>
                    <input
                        type="email"
                        value={data.email}
                        onChange={(e) => onUpdate({ email: e.target.value })}
                        placeholder="seu@email.com"
                        className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border ${errors.email ? 'border-red-500' : 'border-white/5'} focus:border-[#FF6B00] font-bold placeholder:text-zinc-600`}
                    />
                    {errors.email && <p className="text-xs text-red-500 mt-1 ml-2">{errors.email}</p>}
                </div>

                {/* Gênero */}
                <div>
                    <label className={`text-xs font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>
                        Gênero *
                    </label>
                    <select
                        value={data.gender}
                        onChange={(e) => onUpdate({ gender: e.target.value })}
                        className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border ${errors.gender ? 'border-red-500' : 'border-white/5'} focus:border-[#FF6B00] font-bold`}
                    >
                        <option value="">Selecione...</option>
                        <option value="masculino">Masculino</option>
                        <option value="feminino">Feminino</option>
                        <option value="outro">Outro</option>
                        <option value="prefiro_nao_dizer">Prefiro não dizer</option>
                    </select>
                    {errors.gender && <p className="text-xs text-red-500 mt-1 ml-2">{errors.gender}</p>}
                </div>

                {/* Chave Pix */}
                <div>
                    <label className={`text-xs font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>
                        Chave Pix *
                    </label>
                    <input
                        type="text"
                        value={data.pixKey}
                        onChange={(e) => onUpdate({ pixKey: e.target.value })}
                        placeholder="CPF, e-mail, telefone ou chave aleatória"
                        className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border ${errors.pixKey ? 'border-red-500' : 'border-white/5'} focus:border-[#FF6B00] font-bold placeholder:text-zinc-600`}
                    />
                    {errors.pixKey && <p className="text-xs text-red-500 mt-1 ml-2">{errors.pixKey}</p>}
                    <p className={`text-xs ${textMuted} mt-1 ml-2`}>Necessário para receber seus pagamentos</p>
                </div>

                {/* Senha */}
                <div>
                    <label className={`text-xs font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>
                        Senha *
                    </label>
                    <input
                        type="password"
                        value={data.password}
                        onChange={(e) => onUpdate({ password: e.target.value })}
                        placeholder="Crie uma senha forte"
                        className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border ${errors.password ? 'border-red-500' : 'border-white/5'} focus:border-[#FF6B00] font-bold placeholder:text-zinc-600`}
                    />
                </div>

                {/* Confirmar Senha */}
                <div>
                    <label className={`text-xs font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>
                        Confirmar Senha *
                    </label>
                    <input
                        type="password"
                        value={data.confirmPassword}
                        onChange={(e) => onUpdate({ confirmPassword: e.target.value })}
                        placeholder="Digite a senha novamente"
                        className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border border-white/5 focus:border-[#FF6B00] font-bold placeholder:text-zinc-600`}
                    />
                </div>

                {/* Password Validator */}
                {data.password && (
                    <PasswordValidator
                        password={data.password}
                        confirmPassword={data.confirmPassword}
                        onValidationChange={setIsPasswordValid}
                        theme={theme}
                    />
                )}
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

export default Step1PersonalData;
