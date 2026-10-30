/**
 * Utilidades para renderizar y copiar la factura o recibo como imagen PNG en memoria (sin descargas locales)
 */

export interface CaptureImageOptions {
  exactWidth?: boolean;
  width?: number;
  scale?: number;
}

export async function captureInvoiceImageBlob(
  container: HTMLElement,
  options?: CaptureImageOptions
): Promise<Blob> {
  if (!container) {
    throw new Error('Contenedor de documento no encontrado');
  }

  // 1. Ocultar elementos de UI interactivos que no deben salir en la imagen
  const uiElements = container.querySelectorAll('button, select, [data-pdf-hide]');
  const originalDisplays: string[] = [];
  uiElements.forEach((el, i) => {
    const htmlEl = el as HTMLElement;
    originalDisplays[i] = htmlEl.style.display;
    htmlEl.style.display = 'none';
  });

  // 2. Mostrar elementos exclusivos de exportación
  const showElements = container.querySelectorAll('[data-pdf-show]');
  const originalShowDisplays: string[] = [];
  showElements.forEach((el, i) => {
    const htmlEl = el as HTMLElement;
    originalShowDisplays[i] = htmlEl.style.display;
    htmlEl.style.display = 'block';
  });

  const originalClasses = container.className;
  container.className = originalClasses.replace('pr-80', '').replace('scale-[0.95]', '');

  // 3. Preprocesar imágenes para evitar Tainted Canvas o bloqueos de CORS
  const imagesToConvert = Array.from(container.querySelectorAll('img'));
  imagesToConvert.forEach((img) => {
    img.setAttribute('data-original-src', img.src);
  });

  await Promise.all(
    imagesToConvert.map(async (img) => {
      if (img.src.startsWith('data:')) return;
      try {
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(img.src)}`;
        const fetchRes = await fetch(proxyUrl);
        if (fetchRes.ok) {
          const blob = await fetchRes.blob();
          const base64data = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
          img.src = base64data as string;
        }
      } catch (e) {
        console.warn('Could not base64 fetch image through proxy for canvas:', img.src, e);
      }
    })
  );

  let canvas: HTMLCanvasElement;
  try {
    // Breve pausa para que el motor del navegador pinte las imágenes base64
    await new Promise((r) => setTimeout(r, 450));

    const html2canvasModule = await import('html2canvas-pro');
    const html2canvas = html2canvasModule.default;

    const useExactWidth =
      options?.exactWidth || container.getAttribute('data-capture-exact-width') === 'true';

    const targetWidth = useExactWidth
      ? options?.width || container.offsetWidth || 440
      : Math.max(container.offsetWidth || 816, 816);

    const targetHeight = useExactWidth ? container.offsetHeight : undefined;

    canvas = await html2canvas(container, {
      scale: options?.scale || (useExactWidth ? 3 : 2), // Calidad HD nítida para pantallas móviles y WhatsApp
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: targetWidth,
      width: targetWidth,
      ...(targetHeight ? { height: targetHeight } : {})
    });
  } finally {
    // Restaurar siempre los elementos y las imágenes
    imagesToConvert.forEach((img) => {
      const orig = img.getAttribute('data-original-src');
      if (orig) {
        img.src = orig;
        img.removeAttribute('data-original-src');
      }
    });

    container.className = originalClasses;
    uiElements.forEach((el, i) => {
      (el as HTMLElement).style.display = originalDisplays[i];
    });
    showElements.forEach((el, i) => {
      (el as HTMLElement).style.display = originalShowDisplays[i];
    });
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('No se pudo generar el archivo de imagen del comprobante'));
      } else {
        resolve(blob);
      }
    }, 'image/png');
  });
}

/**
 * Copia la imagen de la factura o recibo directamente al portapapeles del sistema operativo
 */
export async function copyInvoiceImageToClipboard(
  container: HTMLElement,
  options?: CaptureImageOptions
): Promise<boolean> {
  const blob = await captureInvoiceImageBlob(container, options);

  if (typeof window !== 'undefined' && navigator.clipboard && window.ClipboardItem) {
    const item = new ClipboardItem({ 'image/png': blob });
    await navigator.clipboard.write([item]);
    return true;
  } else {
    throw new Error('Tu navegador no soporta copiar imágenes directamente al portapapeles.');
  }
}

export interface InvoiceCaptureResult {
  blob: Blob;
  copied: boolean;
  shared: boolean;
}

/**
 * Captura la factura en formato carta HD, la copia al portapapeles y permite compartir nativamente en móviles
 */
export async function captureAndProcessInvoiceImage(
  container: HTMLElement,
  options?: {
    filename?: string;
    title?: string;
    shareIfAvailable?: boolean;
    exactWidth?: boolean;
  }
): Promise<InvoiceCaptureResult> {
  const blob = await captureInvoiceImageBlob(container, { exactWidth: options?.exactWidth });
  let copied = false;
  let shared = false;

  // 1. Intentar copiar directamente al portapapeles
  if (typeof window !== 'undefined' && navigator.clipboard && window.ClipboardItem) {
    try {
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      copied = true;
    } catch (err) {
      console.warn('No se pudo copiar directamente al portapapeles:', err);
    }
  }

  // 2. Si está disponible en celular, activar Web Share API para compartir directo a WhatsApp
  const filename = options?.filename || 'factura.png';
  if (options?.shareIfAvailable !== false && typeof window !== 'undefined' && navigator.canShare) {
    try {
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: options?.title || 'Documento de Facturación',
          text: options?.title ? `${options.title} - Paraíso Floral` : 'Paraíso Floral'
        });
        shared = true;
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.warn('Error en Web Share API:', err);
      }
    }
  }

  return { blob, copied, shared };
}
