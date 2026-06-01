import { expect, test } from "@playwright/test";

test("production smoke defaults to public-only checks", async () => {
  const { resolveSmokeSettings } = await import("../scripts/smoke-settings.mjs");

  const settings = resolveSmokeSettings({
    argv: ["node", "scripts/smoke-check.mjs", "--prod"],
    env: {
      ADMIN_SECRET_KEY: "secret",
    },
  });

  expect(settings.baseUrl).toBe("https://tangzihang.top");
  expect(settings.adminKey).toBe("secret");
  expect(settings.allowAdminWrites).toBe(false);
});

test("local smoke allows admin CRUD when an admin key is configured", async () => {
  const { resolveSmokeSettings } = await import("../scripts/smoke-settings.mjs");

  const settings = resolveSmokeSettings({
    argv: ["node", "scripts/smoke-check.mjs"],
    env: {
      BASE_URL: "http://127.0.0.1:3000/",
      ADMIN_KEY: "secret",
    },
  });

  expect(settings.baseUrl).toBe("http://127.0.0.1:3000");
  expect(settings.adminKey).toBe("secret");
  expect(settings.allowAdminWrites).toBe(true);
});
