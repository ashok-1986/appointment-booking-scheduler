import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { uploadToStorage, getStorageProvider } from "@/lib/services/storage";
import { existsSync, unlinkSync } from "fs";
import path from "path";

describe("Durable Storage Service", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.S3_BUCKET;
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;
    delete process.env.S3_ENDPOINT;
    delete process.env.S3_PUBLIC_URL;
    delete process.env.S3_REGION;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("should report 'local' provider when S3 credentials are unset", () => {
    expect(getStorageProvider()).toBe("local");
  });

  it("should write to local public/uploads when using local provider", async () => {
    const testFilename = `test_${Date.now()}.png`;
    const dummyBuffer = Buffer.from("test png data");
    const result = await uploadToStorage({
      buffer: dummyBuffer,
      filename: testFilename,
      mimeType: "image/png",
    });

    expect(result.provider).toBe("local");
    expect(result.url).toBe(`/uploads/${testFilename}`);

    const filePath = path.join(process.cwd(), "public", "uploads", testFilename);
    expect(existsSync(filePath)).toBe(true);

    unlinkSync(filePath);
  });

  it("should report 's3' provider when S3_BUCKET and keys are configured", () => {
    process.env.S3_BUCKET = "meetprerna-uploads";
    process.env.S3_ACCESS_KEY_ID = "mock_key";
    process.env.S3_SECRET_ACCESS_KEY = "mock_secret";
    expect(getStorageProvider()).toBe("s3");
  });

  it("should format S3 URL correctly when S3 is configured", async () => {
    process.env.S3_BUCKET = "meetprerna-uploads";
    process.env.S3_ACCESS_KEY_ID = "mock_key";
    process.env.S3_SECRET_ACCESS_KEY = "mock_secret";
    process.env.S3_PUBLIC_URL = "https://cdn.example.com";

    const result = await uploadToStorage({
      buffer: Buffer.from("test png data"),
      filename: "test.png",
      mimeType: "image/png",
    });

    expect(result.provider).toBe("s3");
    expect(result.url).toBe("https://cdn.example.com/test.png");
  });
});
