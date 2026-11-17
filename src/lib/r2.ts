import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "apis-uploads";
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || "";

export function isR2Configured(): boolean {
  return Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
}

function getR2Client(): S3Client | null {
  if (!isR2Configured()) return null;

  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
  });
}

/**
 * Generates a presigned PUT URL for direct browser-to-R2 upload (up to 10 GB)
 * and a presigned GET download URL valid for 7 days.
 * Bypasses Vercel's 4.5 MB request payload limit completely.
 */
export async function createPresignedUpload(
  fileName: string,
  contentType: string
): Promise<{ uploadUrl: string; downloadUrl: string; key: string } | null> {
  const client = getR2Client();
  if (!client) return null;

  const cleanName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `uploads/${Date.now()}-${cleanName}`;

  // 1. Presigned Upload URL (PUT)
  const putCommand = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType || "application/octet-stream",
  });
  const uploadUrl = await getSignedUrl(client, putCommand, { expiresIn: 10800 }); // 3 hours

  // 2. Download URL: Either public custom domain or 7-day presigned GET
  let downloadUrl = "";
  if (R2_PUBLIC_DOMAIN) {
    downloadUrl = `${R2_PUBLIC_DOMAIN.replace(/\/$/, "")}/${key}`;
  } else {
    const getCommand = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
    downloadUrl = await getSignedUrl(client, getCommand, { expiresIn: 604800 }); // 7 days
  }

  return { uploadUrl, downloadUrl, key };
}
