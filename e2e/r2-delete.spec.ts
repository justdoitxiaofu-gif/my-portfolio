import { expect, test } from "@playwright/test";
import { enqueueR2DeleteInTransaction } from "../lib/r2-delete-jobs";
import { deleteR2Keys } from "../lib/r2";

test("R2 delete helper propagates storage delete failures", async () => {
  const client = {
    send: async () => {
      throw new Error("delete failed");
    },
  };

  await expect(deleteR2Keys(client, "bucket", ["originals/a.png"])).rejects.toThrow("delete failed");
});

test("R2 delete jobs can be enqueued through an existing transaction executor", async () => {
  const calls: Array<{ sql: string; args: unknown[] }> = [];
  const transaction = {
    execute: async (statement: { sql: string; args?: unknown }) => {
      calls.push({ sql: statement.sql, args: Array.isArray(statement.args) ? statement.args : [] });
      return { rows: [], rowsAffected: 1 };
    },
  };

  await enqueueR2DeleteInTransaction(transaction, [
    "https://cdn.example.com/originals/a.png",
    "https://cdn.example.com/originals/a.png",
    "",
  ]);

  expect(calls).toHaveLength(1);
  expect(calls[0].sql).toContain("INSERT INTO r2_delete_jobs");
  expect(JSON.parse(calls[0].args[1] as string)).toEqual(["https://cdn.example.com/originals/a.png"]);
});
