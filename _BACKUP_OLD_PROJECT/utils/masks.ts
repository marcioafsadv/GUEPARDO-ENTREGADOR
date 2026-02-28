/**
 * Input Mask Utilities
 * Provides formatting functions for Brazilian document formats
 */

/**
 * Apply CPF mask: XXX.XXX.XXX-XX
 */
export const applyCpfMask = (value: string): string => {
    let v = value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return v;
};

/**
 * Apply phone mask: (XX) XXXXX-XXXX or (XX) XXXX-XXXX
 */
export const applyPhoneMask = (value: string): string => {
    let v = value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);

    if (v.length <= 10) {
        // Landline format: (XX) XXXX-XXXX
        v = v.replace(/^(\d{2})(\d)/, '($1) $2');
        v = v.replace(/(\d{4})(\d)/, '$1-$2');
    } else {
        // Mobile format: (XX) XXXXX-XXXX
        v = v.replace(/^(\d{2})(\d)/, '($1) $2');
        v = v.replace(/(\d{5})(\d)/, '$1-$2');
    }

    return v;
};

/**
 * Apply CNH mask: XXXXXXXXXXX (11 digits, no formatting)
 */
export const applyCnhMask = (value: string): string => {
    let v = value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    return v;
};

/**
 * Apply license plate mask (supports both Mercosul and old format)
 * Mercosul: ABC1D23
 * Old: ABC-1234
 */
export const applyPlateMask = (value: string): string => {
    let v = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (v.length > 7) v = v.slice(0, 7);

    // Detect format based on input
    if (v.length >= 4) {
        const hasLetterInPosition4 = /^[A-Z]{3}[0-9][A-Z]/.test(v);

        if (hasLetterInPosition4) {
            // Mercosul format: ABC1D23
            return v;
        } else {
            // Old format: ABC-1234
            v = v.replace(/^([A-Z]{3})([0-9])/, '$1-$2');
        }
    }

    return v;
};

/**
 * Apply CEP mask: XXXXX-XXX
 */
export const applyCepMask = (value: string): string => {
    let v = value.replace(/\D/g, '');
    if (v.length > 8) v = v.slice(0, 8);
    v = v.replace(/^(\d{5})(\d)/, '$1-$2');
    return v;
};

/**
 * Apply RENAVAM mask: XXXXXXXXXXX (11 digits, no formatting)
 */
export const applyRenavamMask = (value: string): string => {
    let v = value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    return v;
};

/**
 * Remove all mask formatting from a string
 */
export const removeMask = (value: string): string => {
    return value.replace(/\D/g, '');
};

/**
 * Format date to Brazilian format: DD/MM/YYYY
 */
export const formatDateBR = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

/**
 * Parse Brazilian date format (DD/MM/YYYY) to ISO format (YYYY-MM-DD)
 */
export const parseDateBR = (dateBR: string): string => {
    const [day, month, year] = dateBR.split('/');
    return `${year}-${month}-${day}`;
};

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate CPF (Brazilian tax ID)
 */
export const isValidCPF = (cpf: string): boolean => {
    const cleanCpf = cpf.replace(/\D/g, '');

    if (cleanCpf.length !== 11) return false;

    // Check for known invalid CPFs (all digits the same)
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
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validate Brazilian phone number
 */
export const isValidPhone = (phone: string): boolean => {
    const cleanPhone = phone.replace(/\D/g, '');
    // Valid formats: 10 digits (landline) or 11 digits (mobile)
    return cleanPhone.length === 10 || cleanPhone.length === 11;
};

/**
 * Validate CEP format
 */
export const isValidCEP = (cep: string): boolean => {
    const cleanCep = cep.replace(/\D/g, '');
    return cleanCep.length === 8;
};

/**
 * Apply Year mask: XXXX
 */
export const applyYearMask = (value: string): string => {
    let v = value.replace(/\D/g, '');
    if (v.length > 4) v = v.slice(0, 4);
    return v;
};

// ============================================
// ALIASES FOR BACKWARD COMPATIBILITY
// ============================================

/**
 * Alias for applyCpfMask
 */
export const maskCPF = applyCpfMask;

/**
 * Alias for applyPhoneMask
 */
export const maskPhone = applyPhoneMask;

/**
 * Alias for applyCepMask
 */
export const maskCEP = applyCepMask;

/**
 * Alias for applyPlateMask
 */
export const maskPlate = applyPlateMask;

/**
 * Alias for applyCnhMask
 */
export const maskCNH = applyCnhMask;

/**
 * Alias for applyRenavamMask
 */
export const maskRENAVAM = applyRenavamMask;

/**
 * Alias for applyYearMask
 */
export const maskYear = applyYearMask;
