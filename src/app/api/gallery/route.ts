import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-utils";
import {
  listMediaAssets,
  createMediaAsset,
  createMultipleMediaAssets,
  updateMediaAssetConsent,
  deleteMediaAsset,
  getClientsForGallery,
  getClientSessionsAndBookings,
  CATEGORY_META,
  type MediaCategory,
} from "@/lib/gallery";
import { jsonError } from "@/lib/route-utils";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const meta = searchParams.get("meta");

    // Sub-endpoint for client sessions dropdown
    if (meta === "client_sessions") {
      const clientId = searchParams.get("clientId");
      if (!clientId) {
        return NextResponse.json(
          { ok: false, error: "clientId is required" },
          { status: 400 }
        );
      }
      const data = await getClientSessionsAndBookings(clientId);
      return NextResponse.json({ ok: true, ...data });
    }

    // Sub-endpoint for client list
    if (meta === "clients") {
      const clientsList = await getClientsForGallery();
      return NextResponse.json({ ok: true, clients: clientsList });
    }

    const category = searchParams.get("category") || undefined;
    const clientId = searchParams.get("clientId") || undefined;
    const bookingId = searchParams.get("bookingId") || undefined;
    const sessionId = searchParams.get("sessionId") || undefined;
    const search = searchParams.get("search") || undefined;

    const [assets, clientsList] = await Promise.all([
      listMediaAssets({
        category,
        clientId,
        bookingId,
        sessionId,
        search,
      }),
      getClientsForGallery(),
    ]);

    return NextResponse.json({
      ok: true,
      assets,
      clients: clientsList,
      categories: CATEGORY_META,
      total: assets.length,
    });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";

    // Handle Multipart Form Data (direct file upload + metadata)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const clientId = formData.get("clientId") as string;
      const category = (formData.get("category") as MediaCategory) || "fresh";
      const caption = (formData.get("caption") as string) || "";
      const bookingId = (formData.get("bookingId") as string) || undefined;
      const sessionId = (formData.get("sessionId") as string) || undefined;
      const consentForMarketing = formData.get("consentForMarketing") === "true";

      if (!clientId) {
        return NextResponse.json(
          { ok: false, error: "Client is required for photo upload" },
          { status: 400 }
        );
      }

      const files = formData.getAll("file") as File[];
      if (!files || files.length === 0) {
        return NextResponse.json(
          { ok: false, error: "No files uploaded" },
          { status: 400 }
        );
      }

      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });

      const uploadedInputs = [];

      for (const file of files) {
        if (typeof file === "string") continue;

        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          return NextResponse.json(
            { ok: false, error: `Invalid file type: ${file.name}. Only JPEG, PNG, and WebP are allowed.` },
            { status: 400 }
          );
        }

        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            { ok: false, error: `File ${file.name} exceeds 10MB limit.` },
            { status: 400 }
          );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const origName = file.name || "tattoo-photo.png";
        const ext = path.extname(origName) || ".png";
        const filename = `gallery-${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
        const filePath = path.join(uploadDir, filename);

        await writeFile(filePath, buffer);

        uploadedInputs.push({
          clientId,
          bookingId: bookingId || null,
          sessionId: sessionId || null,
          url: `/uploads/${filename}`,
          category,
          caption: caption || null,
          consentForMarketing,
        });
      }

      const created = await createMultipleMediaAssets(uploadedInputs);
      return NextResponse.json({ ok: true, assets: created });
    }

    // Handle JSON payload (URLs already uploaded or externally hosted)
    const body = await req.json();
    const {
      clientId,
      bookingId,
      sessionId,
      category = "fresh",
      caption,
      consentForMarketing = false,
      urls,
      url,
    } = body;

    if (!clientId) {
      return NextResponse.json(
        { ok: false, error: "Client is required for photo upload" },
        { status: 400 }
      );
    }

    const allUrls: string[] = Array.isArray(urls)
      ? urls
      : url
      ? [url]
      : [];

    if (allUrls.length === 0) {
      return NextResponse.json(
        { ok: false, error: "At least one image URL or file is required" },
        { status: 400 }
      );
    }

    const inputs = allUrls.map((imgUrl) => ({
      clientId,
      bookingId: bookingId || null,
      sessionId: sessionId || null,
      url: imgUrl,
      category: category as MediaCategory,
      caption: caption || null,
      consentForMarketing: Boolean(consentForMarketing),
    }));

    const created = await createMultipleMediaAssets(inputs);
    return NextResponse.json({ ok: true, assets: created });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, consentForMarketing } = body;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Media asset id is required" },
        { status: 400 }
      );
    }

    if (typeof consentForMarketing === "boolean") {
      await updateMediaAssetConsent(id, consentForMarketing);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Media asset id is required" },
        { status: 400 }
      );
    }

    await deleteMediaAsset(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
