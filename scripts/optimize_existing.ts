import { Jimp } from 'jimp';
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_ENDPOINT = process.env.R2_ENDPOINT!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;

const r2Client = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

const prisma = new PrismaClient();

function getR2Key(url: string): string {
  const match = url.match(/r2\.dev\/(.+)$/);
  return match ? match[1] : '';
}

async function optimizeAndUpload(url: string) {
  const key = getR2Key(url);
  if (!key) {
    console.log(`Could not extract R2 key from URL: ${url}`);
    return;
  }

  console.log(`Processing: ${key}...`);

  try {
    // 1. Fetch original file
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Failed to download ${url}: ${res.statusText}`);
      return;
    }
    const ab = await res.arrayBuffer();
    const originalBuffer = Buffer.from(ab);
    const originalSize = originalBuffer.length;

    // 2. Load and compress using Jimp
    const image = await Jimp.read(originalBuffer);
    const origW = image.width;
    const origH = image.height;

    // Skip if it's already reasonably sized and small
    if (origW <= 1200 && origH <= 1200 && originalSize < 250 * 1024) {
      console.log(`Skipping ${key} (already optimized: ${origW}x${origH}, ${(originalSize/1024).toFixed(1)} KB)`);
      return;
    }

    if (origW > 1200 || origH > 1200) {
      // Calculate aspect ratio resize
      const ratio = Math.min(1200 / origW, 1200 / origH);
      const newW = Math.round(origW * ratio);
      image.resize({ w: newW });
    }

    const compressedBuffer = await image.getBuffer('image/jpeg', { quality: 75 });
    const compressedSize = compressedBuffer.length;

    const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    console.log(`Compressed: ${origW}x${origH} -> ${image.width}x${image.height}`);
    console.log(`Size: ${(originalSize/1024).toFixed(1)} KB -> ${(compressedSize/1024).toFixed(1)} KB (Saved ${savings}%)`);

    // 3. Upload back to R2 overwriting the original object
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: compressedBuffer,
      ContentType: 'image/jpeg',
    });

    await r2Client.send(command);
    console.log(`Successfully updated in R2!`);
  } catch (err) {
    console.error(`Error processing ${key}:`, err);
  }
}

async function main() {
  // Get Hector Moncada's Work Order DA2DC663 photos
  const order = await prisma.ordenTrabajo.findFirst({
    where: { codigoSeguridad: 'DA2DC663' }
  });

  const orderPhotos = order?.fotosEstadoInicial || [];
  console.log(`Found ${orderPhotos.length} photos in Hector Moncada's Order #DA2DC663.`);

  // Get Kanban task Aerti attachments
  const task = await prisma.kanbanTask.findFirst({
    where: {
      title: { contains: 'Revisión y diagnóstico de generador de oxígeno de 5 litros' }
    },
    include: { attachments: true }
  });

  const taskPhotos = task?.attachments
    .filter(att => att.tipo.startsWith('image/'))
    .map(att => att.url) || [];
  console.log(`Found ${taskPhotos.length} image attachments in Kanban Task '${task?.title || 'Unknown'}'.`);

  const allPhotos = [...new Set([...orderPhotos, ...taskPhotos])];
  console.log(`Total unique photos to optimize: ${allPhotos.length}\n`);

  for (const photoUrl of allPhotos) {
    await optimizeAndUpload(photoUrl);
    console.log('----------------------------------------------------');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
