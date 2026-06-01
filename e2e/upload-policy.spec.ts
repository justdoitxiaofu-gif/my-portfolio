import { expect, test } from "@playwright/test";
import { newAdminApi } from "./admin-api";

const IMAGE_LIMIT = 50 * 1024 * 1024;

test("presigned upload rejects images larger than the processing limit", async ({ baseURL }) => {
  if (!baseURL) throw new Error("baseURL is required");
  const api = await newAdminApi(baseURL);

  try {
    const response = await api.post("/api/upload/presigned", {
      data: {
        contentType: "image/png",
        fileSize: IMAGE_LIMIT + 1,
        requestId: `oversize-${Date.now()}`,
      },
    });

    expect(response.status()).toBe(413);
    const body = await response.json();
    expect(body.code).toBe("PAYLOAD_TOO_LARGE");
  } finally {
    await api.dispose();
  }
});
