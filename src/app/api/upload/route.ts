import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("file") as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json({ ok: false, error: "No files uploaded" }, { status: 400 });
    }

    const uploadedUrls: string[] = [];

    for (const file of files) {
      if (typeof file === "string") continue;
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Clean file extension
      const origName = file.name || "upload.png";
      const ext = path.extname(origName) || ".png";
      const filename = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads");
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
