import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validates the file buffer magic bytes to detect real MIME type and canonical extension.
 * Rejects extension spoofing or disguised executable/HTML content.
 */
export function detectImageMagicBytes(buffer: Buffer): { mime: AllowedMimeType; ext: string } | null {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: "image/jpeg", ext: ".jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: "image/png", ext: ".png" };
  }

  // WebP: RIFF (4 bytes) ... WEBP (bytes 8..11)
  if (
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50 // P
  ) {
    return { mime: "image/webp", ext: ".webp" };
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("file") as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json({ ok: false, error: "No files uploaded" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const uploadedUrls: string[] = [];

    for (const file of files) {
      if (typeof file === "string") continue;

      const normalizedClientMime = file.type === "image/jpg" ? "image/jpeg" : file.type;
      if (!ALLOWED_MIME_TYPES.includes(normalizedClientMime as AllowedMimeType)) {
        return NextResponse.json(
          { ok: false, error: "Only JPEG, PNG, and WebP images are allowed" },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { ok: false, error: "File exceeds 10MB limit" },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      if (buffer.length > MAX_FILE_SIZE) {
        return NextResponse.json(
          { ok: false, error: "File exceeds 10MB limit" },
          { status: 400 }
        );
      }

      // Verify magic bytes
      const detected = detectImageMagicBytes(buffer);
      if (!detected || detected.mime !== normalizedClientMime) {
        return NextResponse.json(
          { ok: false, error: "Invalid file content: signature does not match allowed image format" },
          { status: 400 }
        );
      }

      // Strictly enforce canonical file extension derived from validated magic bytes
      const filename = `${Date.now()}-${randomUUID().slice(0, 8)}${detected.ext}`;
      const filePath = path.join(uploadDir, filename);

      await writeFile(filePath, buffer);
      uploadedUrls.push(`/uploads/${filename}`);
    }

    return NextResponse.json({ ok: true, urls: uploadedUrls });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Upload failed" }, { status: 500 });
  }
}
