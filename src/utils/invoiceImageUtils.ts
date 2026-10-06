/**
 * Utilidades para renderizar y copiar la factura como imagen PNG en memoria (sin descargas locales)
 */

export async function captureInvoiceImageBlob(container: HTMLElement): Promise<Blob> {
  if (!container) {
    throw new Error('Contenedor de factura no encontrado');
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
    await new Promise((r) => setTimeout(r, 600));

    const html2canvasModule = await import('html2canvas-pro');
    const html2canvas = html2canvasModule.default;

    canvas = await html2canvas(container, {
      scale: 2, // Calidad HD para que todo el texto y números sean ultra legibles en WhatsApp
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
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
        reject(new Error('No se pudo generar el archivo de imagen de la factura'));
      } else {
        resolve(blob);
      }
    }, 'image/png');
  });
}

/**
 * Copia la imagen de la factura directamente al portapapeles del sistema operativo
 */
export async function copyInvoiceImageToClipboard(container: HTMLElement): Promise<boolean> {
  const blob = await captureInvoiceImageBlob(container);

  if (typeof window !== 'undefined' && navigator.clipboard && window.ClipboardItem) {
    const item = new ClipboardItem({ 'image/png': blob });
    await navigator.clipboard.write([item]);
    return true;
  } else {
    throw new Error('Tu navegador no soporta copiar imágenes directamente al portapapeles.');
  }
}
