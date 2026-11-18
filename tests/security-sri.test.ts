import { describe, it, expect } from "bun:test";
import { readFileSync } from "fs";
import path from "path";

describe("Security: Subresource Integrity (SRI) on Third-Party Scripts", () => {
  it("should enforce integrity and crossOrigin attributes on ideavo.min.js script tag", () => {
    const layoutPath = path.join(process.cwd(), "src", "app", "layout.tsx");
    const layoutContent = readFileSync(layoutPath, "utf-8");

    // Must include the ideavo script
    expect(layoutContent).toContain("ideavo.min.js");

    // Must include the calculated SHA-384 integrity hash
    expect(layoutContent).toMatch(/integrity=["']sha384-[A-Za-z0-9+/=]+["']/);

    // Must include crossOrigin="anonymous"
    expect(layoutContent).toMatch(/crossOrigin=["']anonymous["']/);
  });
});
