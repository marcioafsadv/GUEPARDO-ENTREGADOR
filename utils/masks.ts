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
