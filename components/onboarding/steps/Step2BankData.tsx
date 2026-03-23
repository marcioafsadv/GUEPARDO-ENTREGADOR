import React, { useState } from 'react';

interface Step2BankDataProps {
    data: {
        bankName: string;
        agency: string;
        accountNumber: string;
        accountType: string;
        pixKey: string;
    };
    onUpdate: (updates: any) => void;
    onNext: () => void;
    theme?: 'dark' | 'light';
}

const Step2BankData: React.FC<Step2BankDataProps> = ({ data, onUpdate, onNext, theme = 'dark' }) => {
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateAndNext = () => {
        const newErrors: Record<string, string> = {};

        if (!data.bankName) {
            newErrors.bankName = 'Nome do banco é obrigatório';
        }

        if (!data.agency) {
            newErrors.agency = 'Agência é obrigatória';
        }

        if (!data.accountNumber) {
            newErrors.accountNumber = 'Número da conta é obrigatório';
        }

        if (!data.accountType) {
            newErrors.accountType = 'Tipo de conta é obrigatório';
        }

        if (!data.pixKey) {
            newErrors.pixKey = 'Chave Pix é obrigatória';
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
                <h2 className={`text-3xl font-black italic ${textPrimary} mb-2`}>Dados Bancários</h2>
                <p className={`text-sm ${textMuted}`}>Onde você receberá seus pagamentos</p>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {/* Nome do Banco */}
                <div>
                    <label className={`text-xs font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>
                        Banco *
                    </label>
                    <input
                        type="text"
                        value={data.bankName}
                        onChange={(e) => onUpdate({ bankName: e.target.value })}
                        placeholder="Ex: Nubank, Itaú, Bradesco"
                        className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border ${errors.bankName ? 'border-red-500' : 'border-white/5'} focus:border-[#FF6B00] font-bold placeholder:text-zinc-600`}
                    />
                    {errors.bankName && <p className="text-xs text-red-500 mt-1 ml-2">{errors.bankName}</p>}
                </div>

                {/* Agência */}
                <div>
                    <label className={`text-xs font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>
                        Agência *
                    </label>
                    <input
                        type="text"
                        value={data.agency}
                        onChange={(e) => onUpdate({ agency: e.target.value })}
                        placeholder="0001"
                        className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border ${errors.agency ? 'border-red-500' : 'border-white/5'} focus:border-[#FF6B00] font-bold placeholder:text-zinc-600`}
                    />
                    {errors.agency && <p className="text-xs text-red-500 mt-1 ml-2">{errors.agency}</p>}
                </div>

                {/* Número da Conta */}
                <div>
                    <label className={`text-xs font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>
                        Número da Conta *
                    </label>
                    <input
                        type="text"
                        value={data.accountNumber}
                        onChange={(e) => onUpdate({ accountNumber: e.target.value })}
                        placeholder="000000-0"
                        className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border ${errors.accountNumber ? 'border-red-500' : 'border-white/5'} focus:border-[#FF6B00] font-bold placeholder:text-zinc-600`}
                    />
                    {errors.accountNumber && <p className="text-xs text-red-500 mt-1 ml-2">{errors.accountNumber}</p>}
                </div>

                {/* Tipo de Conta */}
                <div>
                    <label className={`text-xs font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>
                        Tipo de Conta *
                    </label>
                    <select
                        value={data.accountType}
                        onChange={(e) => onUpdate({ accountType: e.target.value })}
                        className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border ${errors.accountType ? 'border-red-500' : 'border-white/5'} focus:border-[#FF6B00] font-bold`}
                    >
                        <option value="">Selecione...</option>
                        <option value="corrente">Conta Corrente</option>
                        <option value="poupanca">Conta Poupança</option>
                        <option value="pagamento">Conta de Pagamento</option>
                    </select>
                    {errors.accountType && <p className="text-xs text-red-500 mt-1 ml-2">{errors.accountType}</p>}
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

export default Step2BankData;
