import { Jimp } from 'jimp';
import * as path from 'path';

async function generateIcons() {
    try {
        const sourcePath = path.join(process.cwd(), 'disenos', 'BEA-ICONO-APP.png');
        console.log(`Leyendo imagen de origen: ${sourcePath}`);
        
        const image = await Jimp.read(sourcePath);
        
        // Generar icono 192x192
        const dest192 = path.join(process.cwd(), 'public', 'icon-192.png');
        console.log(`Generando icono 192x192 en: ${dest192}`);
        const icon192 = image.clone().resize({ w: 192, h: 192 });
        await icon192.write(dest192 as `${string}.${string}`);
        
        // Generar icono 512x512
        const dest512 = path.join(process.cwd(), 'public', 'icon-512.png');
        console.log(`Generando icono 512x512 en: ${dest512}`);
        const icon512 = image.clone().resize({ w: 512, h: 512 });
        await icon512.write(dest512 as `${string}.${string}`);
        
        console.log('¡Iconos de PWA generados con éxito!');
    } catch (error) {
        console.error('Error al generar iconos con Jimp:', error);
    }
}

generateIcons();
