import { expect, test } from "@playwright/test";
import { deleteR2Keys } from "../lib/r2";

test("R2 delete helper propagates storage delete failures", async () => {
  const client = {
    send: async () => {
      throw new Error("delete failed");
    },
  };

  await expect(deleteR2Keys(client, "bucket", ["originals/a.png"])).rejects.toThrow("delete failed");
});
