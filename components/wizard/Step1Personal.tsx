import React, { useState, useEffect } from 'react';
import { PersonalData } from '../../types';
import { applyCpfMask, applyPhoneMask } from '../../utils/masks';
import { validateCpf, validateEmail, validatePassword, validateAge } from '../../utils/validation';
import { WizardProgress } from './WizardProgress';

interface Step1PersonalProps {
    theme: 'dark' | 'light';
    data: PersonalData;
    onDataChange: (data: PersonalData) => void;
    onNext: () => void;
    onBack: () => void;
}

export const Step1Personal: React.FC<Step1PersonalProps> = ({
    theme,
    data,
    onDataChange,
    onNext,
    onBack
}) => {
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const passwordValidation = validatePassword(data.password);

    const handleChange = (field: keyof PersonalData, value: string) => {
        let processedValue = value;

        // Apply masks
        if (field === 'cpf') processedValue = applyCpfMask(value);
        if (field === 'phone') processedValue = applyPhoneMask(value);

        onDataChange({ ...data, [field]: processedValue });

        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!data.fullName.trim()) newErrors.fullName = 'Nome completo é obrigatório';
        if (!data.birthDate) newErrors.birthDate = 'Data de nascimento é obrigatória';
        else if (!validateAge(data.birthDate)) newErrors.birthDate = 'Você deve ter pelo menos 18 anos';

        if (!data.cpf) newErrors.cpf = 'CPF é obrigatório';
        else if (!validateCpf(data.cpf)) newErrors.cpf = 'CPF inválido';

        if (!data.phone) newErrors.phone = 'Telefone é obrigatório';
        if (!data.email) newErrors.email = 'E-mail é obrigatório';
        else if (!validateEmail(data.email)) newErrors.email = 'E-mail inválido';

        if (!data.password) newErrors.password = 'Senha é obrigatória';
        else if (!passwordValidation.isValid) newErrors.password = 'Senha não atende aos requisitos';

        if (data.password !== data.confirmPassword) newErrors.confirmPassword = 'As senhas não coincidem';

        if (!data.gender) newErrors.gender = 'Gênero é obrigatório';
        if (!data.pixKey.trim()) newErrors.pixKey = 'Chave PIX é obrigatória';

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
                <WizardProgress currentStep={1} totalSteps={5} theme={theme} />
                <h1 className={`text-2xl font-bold ${textPrimary} mt-4`}>Dados Pessoais</h1>
                <p className={`text-sm ${textMuted}`}>Preencha suas informações básicas</p>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
                {/* Nome Completo */}
                <div>
                    <label className={`block text-sm font-semibold ${textPrimary} mb-2`}>
                        Nome Completo *
                    </label>
                    <input
                        type="text"
                        value={data.fullName}
                        onChange={(e) => handleChange('fullName', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl ${inputBg} ${textPrimary} outline-none ${errors.fullName ? 'border-2 border-red-500' : ''
                            }`}
                        placeholder="João da Silva"
                    />
                    {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
                </div>

                {/* Data de Nascimento */}
                <div>
                    <label className={`block text-sm font-semibold ${textPrimary} mb-2`}>
                        Data de Nascimento *
                    </label>
                    <input
                        type="date"
                        value={data.birthDate}
                        onChange={(e) => handleChange('birthDate', e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className={`w-full px-4 py-3 rounded-xl ${inputBg} ${textPrimary} outline-none ${errors.birthDate ? 'border-2 border-red-500' : ''
                            }`}
                    />
                    {errors.birthDate && <p className="text-red-500 text-sm mt-1">{errors.birthDate}</p>}
                </div>

                {/* CPF */}
                <div>
                    <label className={`block text-sm font-semibold ${textPrimary} mb-2`}>
                        CPF *
                    </label>
                    <input
                        type="text"
                        value={data.cpf}
                        onChange={(e) => handleChange('cpf', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl ${inputBg} ${textPrimary} outline-none ${errors.cpf ? 'border-2 border-red-500' : ''
                            }`}
                        placeholder="000.000.000-00"
                        maxLength={14}
                    />
                    {errors.cpf && <p className="text-red-500 text-sm mt-1">{errors.cpf}</p>}
                </div>

                {/* Telefone */}
                <div>
                    <label className={`block text-sm font-semibold ${textPrimary} mb-2`}>
                        Telefone *
                    </label>
                    <input
                        type="tel"
                        value={data.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl ${inputBg} ${textPrimary} outline-none ${errors.phone ? 'border-2 border-red-500' : ''
                            }`}
                        placeholder="(11) 99999-9999"
                        maxLength={15}
                    />
                    {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                </div>

                {/* E-mail */}
                <div>
                    <label className={`block text-sm font-semibold ${textPrimary} mb-2`}>
                        E-mail *
                    </label>
                    <input
                        type="email"
                        value={data.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl ${inputBg} ${textPrimary} outline-none ${errors.email ? 'border-2 border-red-500' : ''
                            }`}
                        placeholder="seu@email.com"
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                {/* Senha */}
                <div>
                    <label className={`block text-sm font-semibold ${textPrimary} mb-2`}>
                        Criar Senha *
                    </label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={data.password}
                            onChange={(e) => handleChange('password', e.target.value)}
                            className={`w-full px-4 py-3 pr-12 rounded-xl ${inputBg} ${textPrimary} outline-none ${errors.password ? 'border-2 border-red-500' : ''
                                }`}
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className={`absolute right-4 top-1/2 -translate-y-1/2 ${textMuted}`}
                        >
                            <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                    </div>

                    {/* Password Validation Checklist */}
                    {data.password && (
                        <div className={`mt-3 p-3 rounded-xl ${inputBg} space-y-1`}>
                            <p className={`text-xs font-semibold ${textMuted} mb-2`}>Requisitos da senha:</p>
                            <div className={`flex items-center gap-2 text-xs ${passwordValidation.hasMinLength ? 'text-green-500' : textMuted}`}>
                                <i className={`fas ${passwordValidation.hasMinLength ? 'fa-check-circle' : 'fa-circle'}`}></i>
                                <span>Mínimo 8 caracteres</span>
                            </div>
                            <div className={`flex items-center gap-2 text-xs ${passwordValidation.hasNumber ? 'text-green-500' : textMuted}`}>
                                <i className={`fas ${passwordValidation.hasNumber ? 'fa-check-circle' : 'fa-circle'}`}></i>
                                <span>Pelo menos 1 número</span>
                            </div>
                            <div className={`flex items-center gap-2 text-xs ${passwordValidation.hasUppercase ? 'text-green-500' : textMuted}`}>
                                <i className={`fas ${passwordValidation.hasUppercase ? 'fa-check-circle' : 'fa-circle'}`}></i>
                                <span>Pelo menos 1 letra maiúscula</span>
                            </div>
                            <div className={`flex items-center gap-2 text-xs ${passwordValidation.hasLowercase ? 'text-green-500' : textMuted}`}>
                                <i className={`fas ${passwordValidation.hasLowercase ? 'fa-check-circle' : 'fa-circle'}`}></i>
                                <span>Pelo menos 1 letra minúscula</span>
                            </div>
                            <div className={`flex items-center gap-2 text-xs ${passwordValidation.hasSpecialChar ? 'text-green-500' : textMuted}`}>
                                <i className={`fas ${passwordValidation.hasSpecialChar ? 'fa-check-circle' : 'fa-circle'}`}></i>
                                <span>Pelo menos 1 caractere especial</span>
                            </div>
                        </div>
                    )}
                    {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                </div>

                {/* Confirmar Senha */}
                <div>
                    <label className={`block text-sm font-semibold ${textPrimary} mb-2`}>
                        Confirmar Senha *
                    </label>
                    <div className="relative">
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={data.confirmPassword}
                            onChange={(e) => handleChange('confirmPassword', e.target.value)}
                            className={`w-full px-4 py-3 pr-12 rounded-xl ${inputBg} ${textPrimary} outline-none ${errors.confirmPassword ? 'border-2 border-red-500' : ''
                                }`}
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className={`absolute right-4 top-1/2 -translate-y-1/2 ${textMuted}`}
                        >
                            <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                    </div>
                    {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
                </div>

                {/* Gênero */}
                <div>
                    <label className={`block text-sm font-semibold ${textPrimary} mb-2`}>
                        Gênero *
                    </label>
                    <select
                        value={data.gender}
                        onChange={(e) => handleChange('gender', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl ${inputBg} ${textPrimary} outline-none ${errors.gender ? 'border-2 border-red-500' : ''
                            }`}
                    >
                        <option value="">Selecione</option>
                        <option value="masculino">Masculino</option>
                        <option value="feminino">Feminino</option>
                        <option value="outro">Outro</option>
                        <option value="prefiro-nao-informar">Prefiro não informar</option>
                    </select>
                    {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender}</p>}
                </div>

                {/* Chave PIX */}
                <div>
                    <label className={`block text-sm font-semibold ${textPrimary} mb-2`}>
                        Chave PIX *
                    </label>
                    <input
                        type="text"
                        value={data.pixKey}
                        onChange={(e) => handleChange('pixKey', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl ${inputBg} ${textPrimary} outline-none ${errors.pixKey ? 'border-2 border-red-500' : ''
                            }`}
                        placeholder="CPF, e-mail, telefone ou chave aleatória"
                    />
                    <p className={`text-xs ${textMuted} mt-1`}>
                        <i className="fas fa-info-circle mr-1"></i>
                        Usada para receber seus ganhos
                    </p>
                    {errors.pixKey && <p className="text-red-500 text-sm mt-1">{errors.pixKey}</p>}
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
