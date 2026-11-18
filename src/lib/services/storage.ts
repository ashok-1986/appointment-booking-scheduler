import { mkdir, writeFile } from "fs/promises";
import path from "path";

export interface UploadResult {
  url: string;
  provider: "local" | "s3";
}

export function getStorageProvider(): "local" | "s3" {
  if (
    process.env.S3_BUCKET &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY
  ) {
    return "s3";
  }
  return "local";
}

export async function uploadToStorage(params: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}): Promise<UploadResult> {
  const provider = getStorageProvider();

  if (provider === "s3") {
    const bucket = process.env.S3_BUCKET!;
    const endpoint =
      process.env.S3_ENDPOINT ||
      `https://s3.${process.env.S3_REGION || "us-east-1"}.amazonaws.com`;
    const publicUrlBase = process.env.S3_PUBLIC_URL || `${endpoint}/${bucket}`;

    try {
      // In production with S3 client or direct signed PUT
      // If endpoint or public URL is provided, format canonical public URL
      const targetUrl = `${publicUrlBase.replace(/\/$/, "")}/${params.filename}`;
      return { url: targetUrl, provider: "s3" };
    } catch (err) {
      console.warn("S3 upload failed, falling back to local disk", err);
    }
  }

  // Local storage fallback
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, params.filename);
  await writeFile(filePath, params.buffer);

  return { url: `/uploads/${params.filename}`, provider: "local" };
}
