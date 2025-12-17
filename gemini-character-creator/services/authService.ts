const ACCESS_CODE = '9898';

export const validateAccessCode = (code: string): boolean => {
    return code.trim() === ACCESS_CODE;
};
