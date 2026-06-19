/**
 * Helper utility to compress and resize images on the client side using HTML5 Canvas.
 */
export interface CompressedResult {
    file: File;
    url: string;
}

export const compressImage = (
    file: File,
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.75
): Promise<CompressedResult> => {
    return new Promise((resolve, reject) => {
        // Only compress image files
        if (!file.type.startsWith('image/')) {
            reject(new Error('O arquivo selecionado não é uma imagem válida.'));
            return;
        }

        // Use URL.createObjectURL as the primary method because it's memory-efficient
        // and doesn't crash on large camera photos in mobile browsers/webviews.
        let objectUrl: string | null = null;
        try {
            objectUrl = URL.createObjectURL(file);
            const img = new Image();
            img.src = objectUrl;

            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Calculate the new dimensions keeping aspect ratio
                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        if (objectUrl) URL.revokeObjectURL(objectUrl);
                        reject(new Error('Não foi possível obter o contexto 2D do Canvas.'));
                        return;
                    }

                    // Draw image on canvas
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert canvas back to a compressed data URL (JPEG format for best compression)
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

                    // Convert canvas to a File object
                    canvas.toBlob((blob) => {
                        if (objectUrl) URL.revokeObjectURL(objectUrl);
                        if (!blob) {
                            reject(new Error('Falha ao processar blob da imagem.'));
                            return;
                        }

                        // Force extension to .jpg for maximum compatibility
                        const originalName = file.name;
                        const lastDot = originalName.lastIndexOf('.');
                        const nameWithoutExt = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
                        const finalName = `${nameWithoutExt}.jpg`;

                        const compressedFile = new File([blob], finalName, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });

                        resolve({
                            file: compressedFile,
                            url: compressedDataUrl
                        });
                    }, 'image/jpeg', quality);
                } catch (e: any) {
                    if (objectUrl) URL.revokeObjectURL(objectUrl);
                    reject(new Error(e.message || 'Erro ao processar o canvas da imagem.'));
                }
            };

            img.onerror = (err) => {
                if (objectUrl) URL.revokeObjectURL(objectUrl);
                // Fallback to FileReader if createObjectURL fails to load
                fallbackWithFileReader(file, resolve, reject, maxWidth, maxHeight, quality);
            };
        } catch (e) {
            // Fallback to FileReader if createObjectURL is not supported or throws
            fallbackWithFileReader(file, resolve, reject, maxWidth, maxHeight, quality);
        }
    });
};

const fallbackWithFileReader = (
    file: File,
    resolve: (value: CompressedResult) => void,
    reject: (reason: any) => void,
    maxWidth: number,
    maxHeight: number,
    quality: number
) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Não foi possível obter o contexto 2D do Canvas.'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Falha ao processar blob da imagem.'));
                        return;
                    }

                    const originalName = file.name;
                    const lastDot = originalName.lastIndexOf('.');
                    const nameWithoutExt = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
                    const finalName = `${nameWithoutExt}.jpg`;

                    const compressedFile = new File([blob], finalName, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });

                    resolve({
                        file: compressedFile,
                        url: compressedDataUrl
                    });
                }, 'image/jpeg', quality);
            } catch (e: any) {
                reject(new Error(e.message || 'Erro ao processar o canvas da imagem.'));
            }
        };

        img.onerror = () => {
            reject(new Error('Erro ao carregar a imagem para compressão.'));
        };
    };

    reader.onerror = () => {
        reject(new Error('Erro ao ler o arquivo de imagem.'));
    };
};
