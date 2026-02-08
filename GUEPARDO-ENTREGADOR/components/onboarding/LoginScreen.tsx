import React, { useState } from 'react';
import * as supabaseClient from '../../supabase';

interface LoginScreenProps {
    theme: 'dark' | 'light';
    onLoginSuccess: (userId: string) => void;
    onGoToRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ theme, onLoginSuccess, onGoToRegister }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const cardBg = theme === 'dark' ? 'bg-zinc-900' : 'bg-white';
    const textPrimary = theme === 'dark' ? 'text-white' : 'text-zinc-900';
    const textMuted = theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600';
    const inputBg = theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-50';
    const borderColor = theme === 'dark' ? 'border-zinc-700' : 'border-zinc-300';

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            alert('Preencha e-mail e senha');
            return;
        }

        setIsLoading(true);
        try {
            const { user } = await supabaseClient.signIn(email, password);
            if (user) {
                onLoginSuccess(user.id);
            }
        } catch (error: any) {
            console.error('Login error:', error);
            alert(error.message || 'Erro ao fazer login. Verifique suas credenciais.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`min-h-screen ${theme === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50'} flex flex-col items-center justify-center p-6`}>
            {/* Logo */}
            <div className="mb-8 text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                    <img
                        src="/logo-guepardo.jpg"
                        alt="Guepardo"
                        className="w-16 h-16 rounded-2xl shadow-lg"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                    <div className="text-left">
                        <h1 className={`text-3xl font-black italic ${textPrimary}`}>
                            GUEPARDO
                        </h1>
                        <p className="text-sm font-bold text-yellow-500">ENTREGADOR</p>
                    </div>
                </div>
                <p className={`text-sm ${textMuted}`}>Velocidade que transforma entregas</p>
            </div>

            {/* Login Form */}
            <div className={`w-full max-w-md ${cardBg} rounded-2xl p-8 shadow-xl border ${borderColor}`}>
                <h2 className={`text-2xl font-bold ${textPrimary} mb-6`}>Entrar na Conta</h2>

                <form onSubmit={handleLogin} className="space-y-4">
                    {/* Email */}
                    <div>
                        <label className={`block text-sm font-bold ${textMuted} mb-2`}>
                            E-mail
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            className={`w-full px-4 py-3 rounded-xl ${inputBg} ${textPrimary} border ${borderColor} focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all`}
                            required
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className={`block text-sm font-bold ${textMuted} mb-2`}>
                            Senha
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className={`w-full px-4 py-3 rounded-xl ${inputBg} ${textPrimary} border ${borderColor} focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all pr-12`}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className={`absolute right-3 top-1/2 -translate-y-1/2 ${textMuted} hover:text-yellow-500`}
                            >
                                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                        </div>
                    </div>

                    {/* Login Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${isLoading
                                ? 'bg-zinc-600 text-zinc-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-zinc-900 hover:shadow-lg hover:scale-[1.02]'
                            }`}
                    >
                        {isLoading ? (
                            <>
                                <i className="fas fa-circle-notch fa-spin mr-2"></i>
                                Entrando...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-sign-in-alt mr-2"></i>
                                Entrar
                            </>
                        )}
                    </button>
                </form>

                {/* Divider */}
                <div className="relative my-6">
                    <div className={`absolute inset-0 flex items-center`}>
                        <div className={`w-full border-t ${borderColor}`}></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className={`px-4 ${cardBg} ${textMuted} font-bold`}>OU</span>
                    </div>
                </div>

                {/* Register Button */}
                <button
                    onClick={onGoToRegister}
                    className={`w-full py-4 rounded-xl font-bold text-lg border-2 border-yellow-500 text-yellow-500 hover:bg-yellow-500/10 transition-all`}
                >
                    <i className="fas fa-user-plus mr-2"></i>
                    Criar Nova Conta
                </button>

                {/* Footer Links */}
                <div className="mt-6 text-center">
                    <a
                        href="#"
                        className={`text-sm ${textMuted} hover:text-yellow-500`}
                        onClick={(e) => {
                            e.preventDefault();
                            alert('Funcionalidade de recuperação de senha em desenvolvimento');
                        }}
                    >
                        Esqueci minha senha
                    </a>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
                <p className={`text-xs ${textMuted}`}>
                    © 2024 Guepardo Delivery. Todos os direitos reservados.
                </p>
            </div>
        </div>
    );
};
