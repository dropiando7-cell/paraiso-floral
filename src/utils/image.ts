/**
 * Compresses an image file client-side using Canvas API.
 * Resizes the image to a maximum width/height while maintaining aspect ratio,
 * and converts it to JPEG with a given quality ratio.
 * 
 * @param file The original image file
 * @param options Configuration options
 * @returns A Promise resolving to the compressed image File, or the original file if not an image or if compression fails.
 */
export function compressImage(
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<File> {
  const { maxWidth = 1200, maxHeight = 1200, quality = 0.75 } = options;

  return new Promise(async (resolve) => {
    let imageFile = file;
    const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif';

    if (isHeic) {
      try {
        const heic2any = (await import('heic2any')).default;
        const resultBlob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: quality
        });
        
        const blobArray = Array.isArray(resultBlob) ? resultBlob[0] : resultBlob;
        
        let newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
        imageFile = new File([blobArray], newName, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
      } catch (heicErr) {
        console.error("Error converting HEIC to JPEG during compression:", heicErr);
      }
    }

    // Only compress images
    if (!imageFile.type.startsWith('image/')) {
      return resolve(imageFile);
    }

    const reader = new FileReader();
    reader.readAsDataURL(imageFile);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio resizing
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(imageFile);
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(imageFile);
            }
            // Replace extension with .jpg if needed
            let newName = imageFile.name;
            if (!newName.toLowerCase().endsWith('.jpg') && !newName.toLowerCase().endsWith('.jpeg')) {
              newName = newName.replace(/\.[^/.]+$/, "") + ".jpg";
            }
            
            const compressedFile = new File([blob], newName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => {
        resolve(imageFile);
      };
    };
    reader.onerror = () => {
      resolve(imageFile);
    };
  });
}
