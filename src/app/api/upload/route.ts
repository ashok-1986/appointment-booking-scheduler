import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
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

      // Clean file extension
      const origName = file.name || "upload.png";
      const ext = path.extname(origName) || ".png";
      const filename = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
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
