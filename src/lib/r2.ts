import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
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
 * Generates a presigned PUT URL for direct browser-to-R2 upload.
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

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType || "application/octet-stream",
  });

  // URL valid for 3 hours (plenty of time for large 10GB uploads)
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 10800 });

  const downloadUrl = R2_PUBLIC_DOMAIN
    ? `${R2_PUBLIC_DOMAIN.replace(/\/$/, "")}/${key}`
    : `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;

  return { uploadUrl, downloadUrl, key };
}
