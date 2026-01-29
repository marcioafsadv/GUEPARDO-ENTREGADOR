/**
 * Validation Utilities
 * Provides validation functions for Brazilian documents and forms
 */

export interface PasswordValidation {
    isValid: boolean;
    hasMinLength: boolean;
    hasNumber: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasSpecialChar: boolean;
}

/**
 * Validate CPF using the official algorithm
 */
export const validateCpf = (cpf: string): boolean => {
    // Remove formatting
    const cleanCpf = cpf.replace(/\D/g, '');

    // Check length
    if (cleanCpf.length !== 11) return false;

    // Check for known invalid CPFs (all same digits)
    if (/^(\d)\1{10}$/.test(cleanCpf)) return false;

    // Validate first check digit
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cleanCpf.charAt(i)) * (10 - i);
    }
    let checkDigit = 11 - (sum % 11);
    if (checkDigit >= 10) checkDigit = 0;
    if (checkDigit !== parseInt(cleanCpf.charAt(9))) return false;

    // Validate second check digit
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cleanCpf.charAt(i)) * (11 - i);
    }
    checkDigit = 11 - (sum % 11);
    if (checkDigit >= 10) checkDigit = 0;
    if (checkDigit !== parseInt(cleanCpf.charAt(10))) return false;

    return true;
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validate password and return detailed requirements status
 */
export const validatePassword = (password: string): PasswordValidation => {
    const hasMinLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    return {
        isValid: hasMinLength && hasNumber && hasUppercase && hasLowercase && hasSpecialChar,
        hasMinLength,
        hasNumber,
        hasUppercase,
        hasLowercase,
        hasSpecialChar
    };
};

/**
 * Validate CNH (Brazilian driver's license) number
 * CNH has 11 digits
 */
export const validateCnh = (cnh: string): boolean => {
    const cleanCnh = cnh.replace(/\D/g, '');

    // Check length
    if (cleanCnh.length !== 11) return false;

    // Check for all same digits
    if (/^(\d)\1{10}$/.test(cleanCnh)) return false;

    // CNH validation algorithm
    let sum = 0;
    let multiplier = 9;

    for (let i = 0; i < 9; i++) {
        sum += parseInt(cleanCnh.charAt(i)) * multiplier;
        multiplier--;
    }

    let checkDigit1 = sum % 11;
    if (checkDigit1 >= 10) checkDigit1 = 0;

    sum = 0;
    multiplier = 1;

    for (let i = 0; i < 9; i++) {
        sum += parseInt(cleanCnh.charAt(i)) * multiplier;
        multiplier++;
    }

    let checkDigit2 = sum % 11;
    if (checkDigit2 >= 10) checkDigit2 = 0;

    const providedDigits = cleanCnh.substring(9, 11);
    const calculatedDigits = `${checkDigit1}${checkDigit2}`;

    return providedDigits === calculatedDigits;
};

/**
 * Validate Brazilian license plate (both Mercosul and old format)
 */
export const validatePlate = (plate: string): boolean => {
    const cleanPlate = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (cleanPlate.length !== 7) return false;

    // Mercosul format: ABC1D23
    const mercosulRegex = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

    // Old format: ABC1234
    const oldRegex = /^[A-Z]{3}[0-9]{4}$/;

    return mercosulRegex.test(cleanPlate) || oldRegex.test(cleanPlate);
};

/**
 * Validate CEP (Brazilian postal code)
 */
export const validateCep = (cep: string): boolean => {
    const cleanCep = cep.replace(/\D/g, '');
    return cleanCep.length === 8;
};

/**
 * Validate RENAVAM (vehicle registration number)
 * RENAVAM has 11 digits
 */
export const validateRenavam = (renavam: string): boolean => {
    const cleanRenavam = renavam.replace(/\D/g, '');
    return cleanRenavam.length === 11 && /^\d+$/.test(cleanRenavam);
};

/**
 * Validate if date is not in the future
 */
export const validatePastDate = (date: string): boolean => {
    const inputDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return inputDate <= today;
};

/**
 * Validate if date is in the future (for CNH expiry)
 */
export const validateFutureDate = (date: string): boolean => {
    const inputDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return inputDate > today;
};

/**
 * Validate age (must be 18 or older)
 */
export const validateAge = (birthDate: string): boolean => {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age >= 18;
};
