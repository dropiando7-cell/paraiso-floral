import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const IMAGES_DIR = path.join(process.cwd(), 'public', 'firmas-sellos');
const BACKUP_DIR = path.join(process.cwd(), 'public', 'firmas-sellos-backup');

const files = [
  'SELLO DE BIOELECTRONICA.png',
  'SELLO DE CANCELADO.png',
  'SELLO DE ENTREGADO.png',
  'firma Ing Manuel Tejada.png',
  'firma emilia zapata.png'
];

async function processImage(filename: string) {
  const inputPath = path.join(IMAGES_DIR, filename);
  const backupPath = path.join(BACKUP_DIR, filename);

  if (!fs.existsSync(inputPath)) {
    console.error(`File not found: ${inputPath}`);
    return;
  }

  // Ensure backup directory exists
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // Backup original file if backup doesn't exist yet
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(inputPath, backupPath);
    console.log(`Backed up: ${filename} to backup folder`);
  }

  console.log(`Processing transparency for: ${filename}...`);

  // Load image with sharp
  const image = sharp(inputPath);
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  // For each pixel, determine if it is background (white/near-white)
  // We use min(R, G, B) to check how close all channels are to 255.
  // Colorful pixels (like red in cancelado, blue in company seal) will have at least one low channel,
  // so min(R,G,B) will be low and they will remain opaque.
  const thresholdLow = 190;
  const thresholdHigh = 245;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const minVal = Math.min(r, g, b);

    if (minVal >= thresholdHigh) {
      data[i + 3] = 0; // Fully transparent
    } else if (minVal > thresholdLow) {
      // Smooth interpolation for edges/anti-aliased pixels
      const ratio = (thresholdHigh - minVal) / (thresholdHigh - thresholdLow);
      data[i + 3] = Math.round(255 * ratio);
    }
    // If minVal <= thresholdLow, keep existing alpha (usually 255)
  }

  // Save back as PNG
  await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  })
    .png({ compressionLevel: 9 })
    .toFile(inputPath);

  console.log(`Successfully saved transparent image: ${filename}`);
}

async function main() {
  console.log('=== Start signature/seal transparency processing ===');
  for (const file of files) {
    await processImage(file);
  }
  console.log('=== All images processed successfully! ===');
}

main().catch(err => {
  console.error('Error processing images:', err);
  process.exit(1);
});
