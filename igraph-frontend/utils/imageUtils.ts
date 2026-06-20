/**
 * Compresses a base64 image to a target size
 * @param base64String - The base64 image string (including data:image/...)
 * @param maxSizeKB - Maximum size in KB (default: 500)
 * @param maxDimension - Maximum width/height in pixels (default: 600)
 * @returns Compressed base64 string
 */
export const compressImage = (
  base64String: string,
  maxSizeKB: number = 500,
  maxDimension: number = 600
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64String;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Resize if too large
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Helper to get size in KB
      const getSizeInKB = (dataUrl: string): number => {
        const base64 = dataUrl.split(',')[1];
        return (base64.length * 3) / 4 / 1024;
      };

      // Start with high quality, reduce until size is acceptable
      let quality = 0.8;
      let result = canvas.toDataURL('image/jpeg', quality);
      let attempts = 0;
      const maxAttempts = 10;

      while (getSizeInKB(result) > maxSizeKB && quality > 0.1 && attempts < maxAttempts) {
        quality -= 0.08;
        result = canvas.toDataURL('image/jpeg', quality);
        attempts++;
      }

      // If still too large, resize further
      if (getSizeInKB(result) > maxSizeKB) {
        const newCanvas = document.createElement('canvas');
        const newWidth = Math.floor(width * 0.7);
        const newHeight = Math.floor(height * 0.7);
        newCanvas.width = newWidth;
        newCanvas.height = newHeight;
        const newCtx = newCanvas.getContext('2d');
        if (newCtx) {
          newCtx.drawImage(canvas, 0, 0, newWidth, newHeight);
          result = newCanvas.toDataURL('image/jpeg', 0.5);
        }
      }

      const finalSize = getSizeInKB(result);
      console.log(`📸 Image compressed: ${(base64String.length * 3 / 4 / 1024).toFixed(1)}KB → ${finalSize.toFixed(1)}KB`);
      
      resolve(result);
    };

    img.onerror = () => reject(new Error('Failed to load image for compression'));
  });
};

/**
 * Converts a file URI to base64
 */
export const uriToBase64 = async (uri: string): Promise<string> => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to convert URI to base64:', error);
    throw new Error('Failed to process image');
  }
};

/**
 * Gets the size of a base64 string in KB
 */
export const getBase64SizeKB = (base64String: string): number => {
  const base64 = base64String.split(',')[1] || base64String;
  return (base64.length * 3) / 4 / 1024;
};