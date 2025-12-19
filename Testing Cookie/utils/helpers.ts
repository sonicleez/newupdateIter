export const slugify = (text: string): string => {
    return text
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');
};

export const downloadImage = (base64Image: string, filename: string) => {
    if (!base64Image) return;
    const link = document.createElement('a');
    link.href = base64Image;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const cleanToken = (t: string) => {
    if (!t) return "";
    if (t.includes('session-token=')) {
        return t.split('session-token=')[1].split(';')[0].trim();
    }
    return t.trim();
};

export const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
