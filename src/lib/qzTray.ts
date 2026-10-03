// @ts-ignore
import qz from 'qz-tray';
import { toast } from 'react-hot-toast';
import { signQzMessage } from '@/app/(dashboard)/facturas/actions';

let qzConnected = false;

const publicCertificate = `-----BEGIN CERTIFICATE-----
MIIDYzCCAkugAwIBAgIUExB/BwNBNdMs3oswepLrBZ6EdrAwDQYJKoZIhvcNAQEL
BQAwQTEZMBcGA1UEAwwQUGFyYWlzb0Zsb3JhbFBPUzEXMBUGA1UECgwOUGFyYWlz
byBGbG9yYWwxCzAJBgNVBAYTAkhOMB4XDTI2MTAwMzIyNTUzM1oXDTM2MDkzMDIy
NTUzM1owQTEZMBcGA1UEAwwQUGFyYWlzb0Zsb3JhbFBPUzEXMBUGA1UECgwOUGFy
YWlzbyBGbG9yYWwxCzAJBgNVBAYTAkhOMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A
MIIBCgKCAQEA5VJZrsWh8VUP7tWU2nmvBD27zVqZrJkV7CUoo0XsAnwX4OCNd9/U
cBBdEmExY62FXK/G0wYJ++fzG2Stnv0ELm5SS6u2YNd00FqZ2IHwYqV4Zvg5+f6v
Sl6f6KXaZLrPFZjUA+XidYWMxocvs48nq8R661VKr9rRQVn8cgKsDGtwuA7SPr/I
yc+95j6eaHpNq89acYLV3OnVlU/4CMdS2JAbwQn+SNDRYF+s4ty95D5Lu0ILlros
RfnZNtqDb7BLwfPFIq4xO4DRJJmo3kT49vDZP1fhSciVpaFQPPJDJFm82Bu1oUxs
93ZF8d2B36lZOIN6xz21J6kEwAK+BLcpdQIDAQABo1MwUTAdBgNVHQ4EFgQURNYa
wei2mJ8R6iwznHP7XXVg2R4wHwYDVR0jBBgwFoAURNYawei2mJ8R6iwznHP7XXVg
2R4wDwYDVR0TAQH/BAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEA1/3UthElPlHF
V0UEHNgqelO6wil4lFrs5ZdXXs/7JjM5EFqpp1ZY05j8RuWyccOiGzNb6SgEWsl2
uAdyRNhC2PbcPmnQtBe7LTVV6gEyTBqWCOn9XS1GQsytN4vbnV7hvBbD8eiI8LfM
QEAjeEeY/VODoxNOzU1sfQSAql97t1INTR+y4Hnh/aMpUXPqUaFNwL+1rz6X89Co
0+18Nbrxo+/bsXEnzxMm+rAzJZekn5aheJZ1k1aT9JsSoJYSNkvpyQYdxR5wNlLT
xu82kxX6VXUk/Yur3pj/ZN9H/9NQ32r/OyYb13OfqBxpHl1BWRc4fxNzRGwRSHYo
q1XERHJ9kQ==
-----END CERTIFICATE-----`;

qz.security.setCertificatePromise(function(resolve: any, reject: any) {
    resolve(publicCertificate);
});

qz.security.setSignatureAlgorithm("SHA512");
qz.security.setSignaturePromise(function(toSign: string) {
    return function(resolve: any, reject: any) {
        signQzMessage(toSign).then(resolve).catch(reject);
    };
});

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
