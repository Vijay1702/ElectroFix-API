import { test, expect } from "@playwright/test";
import { authHeader, loginAs } from "./utils/api-client";

// A real 1x1 transparent PNG, so it passes the magic-byte signature check.
const REAL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

test.describe("uploads", () => {
  test("uploading a real image saves it to disk and returns a /uploads/:type/filename URL", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");

    const realImageBuffer = Buffer.from(REAL_PNG_BASE64, "base64");
    const blob = new Blob([realImageBuffer], { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', blob, 'test_image.png');

    const res = await fetch(`http://localhost:${process.env.PORT || 5001}/api/v1/uploads/product`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: formData
    });

    expect(res.ok).toBeTruthy();
    const data = await res.json();

    // Check that the returned URL is a disk-backed path under the product type folder
    expect(data.data.fileUrl).toMatch(/^\/uploads\/product\/[a-f0-9-]+\.png$/);

    // And that the file is actually servable from the static /uploads route
    const staticRes = await fetch(`http://localhost:${process.env.PORT || 5001}${data.data.fileUrl}`);
    expect(staticRes.ok).toBeTruthy();
  });

  test("a file whose content doesn't match its claimed type is rejected", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");

    // Plain text renamed/labeled as a PNG — content doesn't match the magic bytes.
    const spoofedBuffer = Buffer.from("fake image content");
    const blob = new Blob([spoofedBuffer], { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', blob, 'test_image.png');

    const res = await fetch(`http://localhost:${process.env.PORT || 5001}/api/v1/uploads/product`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: formData
    });

    expect(res.status).toBe(400);
  });
});
