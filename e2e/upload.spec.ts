import { test, expect } from "@playwright/test";
import { authHeader, loginAs } from "./utils/api-client";

test.describe("uploads", () => {
  test("uploading an image returns a base64 data URL", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    
    // Create a fake small PNG buffer
    const fakeImageBuffer = Buffer.from("fake image content");
    const blob = new Blob([fakeImageBuffer], { type: 'image/png' });
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
    
    // Check that the returned URL is a base64 data URL
    expect(data.data.fileUrl).toMatch(/^data:image\/png;base64,[a-zA-Z0-9+/=]+$/);
  });
});
