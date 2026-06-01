import { createId } from "@paralleldrive/cuid2";
import type { InArgs } from "@libsql/client";
import db from "@/lib/db";
import { deleteFromR2 } from "@/lib/r2";
import { reportApiError, reportMetric } from "@/lib/monitoring";

type R2DeleteJobExecutor = {
  execute(statement: { sql: string; args: InArgs }): Promise<unknown>;
};

function backoffSeconds(attempts: number) {
  return Math.min(300, 2 ** Math.max(1, attempts));
}

export async function enqueueR2Delete(urls: string[]) {
  const unique = [...new Set(urls.filter(Boolean))];
  if (unique.length === 0) return;
  await enqueueR2DeleteInTransaction(db, unique);
}

export async function enqueueR2DeleteInTransaction(executor: R2DeleteJobExecutor, urls: string[]) {
  const unique = [...new Set(urls.filter(Boolean))];
  if (unique.length === 0) return 0;
  await executor.execute({
    sql: "INSERT INTO r2_delete_jobs (id, urls_json, attempts, next_run_at) VALUES (?, ?, 0, datetime('now'))",
    args: [createId(), JSON.stringify(unique)],
  });
  reportMetric({ scope: "r2.delete.enqueue", value: unique.length, meta: { jobCount: 1 } });
  return unique.length;
}

export async function processR2DeleteJobs(limit = 5) {
  const summary = { processed: 0, succeeded: 0, failed: 0 };
  const jobs = await db.execute({
    sql: `SELECT id, urls_json, attempts
          FROM r2_delete_jobs
          WHERE next_run_at <= datetime('now')
          ORDER BY next_run_at ASC
          LIMIT ?`,
    args: [limit],
  });

  for (const row of jobs.rows) {
    summary.processed += 1;
    const id = row.id as string;
    const attempts = Number(row.attempts || 0);
    let urls: string[] = [];
    try {
      const parsed = JSON.parse((row.urls_json as string) || "[]");
      urls = Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
    } catch {
      urls = [];
    }

    try {
      await deleteFromR2(urls);
      await db.execute({ sql: "DELETE FROM r2_delete_jobs WHERE id = ?", args: [id] });
      summary.succeeded += 1;
      reportMetric({ scope: "r2.delete.succeeded", value: urls.length, meta: { jobId: id, attempts } });
    } catch (error) {
      summary.failed += 1;
      const nextAttempts = attempts + 1;
      const waitSeconds = backoffSeconds(nextAttempts);
      const errMsg = error instanceof Error ? error.message : "unknown";
      await db.execute({
        sql: `UPDATE r2_delete_jobs
              SET attempts = ?, last_error = ?, next_run_at = datetime('now', ?)
              WHERE id = ?`,
        args: [nextAttempts, errMsg, `+${waitSeconds} seconds`, id],
      });
      reportMetric({ scope: "r2.delete.failed", value: urls.length || 1, meta: { jobId: id, attempts: nextAttempts } });
      reportApiError({
        scope: "r2.delete.failed",
        message: errMsg,
        meta: { jobId: id, attempts: nextAttempts, urlCount: urls.length, nextRunInSeconds: waitSeconds },
      });
    }
  }
  return summary;
}
