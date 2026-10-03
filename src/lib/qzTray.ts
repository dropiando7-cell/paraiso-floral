// @ts-ignore
import qz from 'qz-tray';
import { toast } from 'react-hot-toast';

let qzConnected = false;

export const connectQZ = async () => {
  if (qzConnected && qz.websocket.isActive()) return true;
  
  try {
    if (!qz.websocket.isActive()) {
      await qz.websocket.connect({ retries: 2, delay: 1 });
    }
    qzConnected = true;
    return true;
  } catch (err) {
    console.error("Error conectando a QZ Tray:", err);
    qzConnected = false;
    return false;
  }
};

export const printURLSilent = async (printerName: string, url: string) => {
  try {
    const isConnected = await connectQZ();
    if (!isConnected) {
      toast.error('No se pudo conectar a QZ Tray. Asegúrate de tener el programa abierto en tu PC.', { duration: 5000 });
      return false;
    }

    // Buscar la impresora
    const printers = await qz.printers.find();
    
    // Buscar coincidencia parcial (ej: "STAR" o "EPSON")
    const targetPrinter = printers.find((p: string) => 
      p.toLowerCase().includes(printerName.toLowerCase())
    );

    if (!targetPrinter) {
      toast.error(`No se encontró la impresora "${printerName}". Impresoras detectadas: ${printers.join(', ')}`, { duration: 6000 });
      return false;
    }

    // Configurar e imprimir
    const config = qz.configs.create(targetPrinter, {
       colorType: 'color',
       copies: 1,
       margins: 0,
       spool: { end: '1' }
    });
    
    const data = [{
      type: 'pixel',
      format: 'html',
      flavor: 'file',
      data: url
    }];

    toast.loading(`Enviando a ${targetPrinter}...`, { id: 'qz-print' });
    await qz.print(config, data);
    toast.success(`¡Impresión enviada a ${targetPrinter}!`, { id: 'qz-print' });
    return true;

  } catch (err) {
    console.error("Error imprimiendo con QZ Tray:", err);
    toast.error('Error al imprimir silenciosamente. Verifica QZ Tray.', { id: 'qz-print' });
    return false;
  }
};
