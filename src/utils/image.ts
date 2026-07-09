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
  // Configuración predeterminada optimizada: alta resolución y calidad para no perder detalle de la reparación
  const { maxWidth = 2400, maxHeight = 2400, quality = 0.85 } = options;

  return new Promise(async (resolve) => {
    const isHeic = file.name.toLowerCase().endsWith('.heic') || 
                   file.name.toLowerCase().endsWith('.heif') || 
                   file.type === 'image/heic' || 
                   file.type === 'image/heif';

    // REGLA: Si la imagen no es HEIC y es menor de 5MB, subirla tal cual para conservar el 100% de detalle
    if (!isHeic && file.size < 5 * 1024 * 1024) {
      return resolve(file);
    }

    let imageFile = file;

    // Convertir HEIC (iPhone) a JPEG de forma asíncrona
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

        // Si después de la conversión el tamaño es menor a 5MB, no requiere más compresión de lienzo (canvas)
        if (imageFile.size < 5 * 1024 * 1024) {
          return resolve(imageFile);
        }
      } catch (heicErr) {
        console.error("Error converting HEIC to JPEG during compression:", heicErr);
      }
    }

    // Solo comprimir archivos de tipo imagen
    if (!imageFile.type.startsWith('image/')) {
      return resolve(imageFile);
    }

    // USAR URL.createObjectURL en lugar de FileReader.readAsDataURL para prevenir el desbordamiento de memoria (out of memory crash)
    let objectUrl: string | null = null;
    try {
      objectUrl = URL.createObjectURL(imageFile);
      const img = new Image();
      img.src = objectUrl;

      img.onload = () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        }

        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Redimensionar conservando la relación de aspecto
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
            // Cambiar extensión a .jpg si es necesario
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
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        }
        resolve(imageFile);
      };
    } catch (err) {
      console.error("Error creating Object URL for compression:", err);
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {}
      }
      resolve(imageFile);
    }
  });
}
