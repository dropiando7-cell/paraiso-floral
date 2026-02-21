import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_ENDPOINT = process.env.R2_ENDPOINT!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const NEXT_PUBLIC_R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL!;

export const r2Client = new S3Client({
    region: 'auto', // Always 'auto' for Cloudflare R2
    endpoint: R2_ENDPOINT,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

/**
 * Uploads a file buffer directly to Cloudflare R2
 * @param fileBuffer The file content as a Buffer
 * @param fileName The desired path/name of the file in the bucket (e.g., 'avatars/isaac.jpg')
 * @param contentType The MIME type of the file (e.g., 'image/jpeg')
 * @returns The public URL of the uploaded file
 */
export async function uploadToR2(fileBuffer: Buffer, fileName: string, contentType: string) {
    try {
        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: fileName,
            Body: fileBuffer,
            ContentType: contentType,
        });

        await r2Client.send(command);
        return `${NEXT_PUBLIC_R2_PUBLIC_URL}/${fileName}`;
    } catch (error) {
        console.error("Error uploading to R2:", error);
        throw new Error("Failed to upload file to Cloudflare R2");
    }
}

/**
 * Generates a temporary pre-signed URL to upload a file directly from the browser to R2.
 * Great for large files so they don't lock up the Next.js server.
 * @param fileName The desired path/name of the file in the bucket
 * @param contentType The MIME type of the file
 * @returns The temporary upload URL
 */
export async function getR2UploadUrl(fileName: string, contentType: string) {
    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: fileName,
        ContentType: contentType,
    });

    // URL expires in 15 minutes (900 seconds)
    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 900 });
    return signedUrl;
}

/**
 * Deletes a file from the Cloudflare R2 bucket.
 * @param fileName The full path/name of the file inside the bucket
 */
export async function deleteFromR2(fileName: string) {
    try {
        const command = new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: fileName,
        });

        await r2Client.send(command);
        return true;
    } catch (error) {
        console.error("Error deleting from R2:", error);
        throw new Error("Failed to delete file from Cloudflare R2");
    }
}
