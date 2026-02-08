import React, { useEffect } from 'react';

interface PasswordValidatorProps {
    password: string;
    confirmPassword: string;
    onValidationChange: (isValid: boolean) => void;
    theme?: 'dark' | 'light';
}

const PasswordValidator: React.FC<PasswordValidatorProps> = ({
    password,
    confirmPassword,
    onValidationChange,
    theme = 'dark'
}) => {
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

    const allValid = hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar && passwordsMatch;

    useEffect(() => {
        onValidationChange(allValid);
    }, [allValid, onValidationChange]);

    const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';
    const textSuccess = 'text-green-500';
    const textError = 'text-red-500';

    const getStatusColor = (condition: boolean) => {
        if (!password) return textMuted;
        return condition ? textSuccess : textError;
    };

    const getIcon = (condition: boolean) => {
        if (!password) return '○';
        return condition ? '✓' : '✗';
    };

    return (
        <div className="space-y-2 mt-2">
            <p className={`text-xs font-black uppercase tracking-widest ml-2 ${textMuted}`}>
                Requisitos da senha:
            </p>
            <div className="space-y-1 ml-2">
                <p className={`text-xs ${getStatusColor(hasMinLength)}`}>
                    {getIcon(hasMinLength)} Mínimo de 8 caracteres
                </p>
                <p className={`text-xs ${getStatusColor(hasUpperCase)}`}>
                    {getIcon(hasUpperCase)} Pelo menos uma letra maiúscula
                </p>
                <p className={`text-xs ${getStatusColor(hasLowerCase)}`}>
                    {getIcon(hasLowerCase)} Pelo menos uma letra minúscula
                </p>
                <p className={`text-xs ${getStatusColor(hasNumber)}`}>
                    {getIcon(hasNumber)} Pelo menos um número
                </p>
                <p className={`text-xs ${getStatusColor(hasSpecialChar)}`}>
                    {getIcon(hasSpecialChar)} Pelo menos um caractere especial (!@#$%^&*...)
                </p>
                {confirmPassword && (
                    <p className={`text-xs ${getStatusColor(passwordsMatch)}`}>
                        {getIcon(passwordsMatch)} As senhas coincidem
                    </p>
                )}
            </div>
        </div>
    );
};

export default PasswordValidator;
