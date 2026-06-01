import type { Transaction } from "@libsql/client";

export interface PreparedWorkImage {
  id: string;
  imageUrl: string;
  thumbUrl: string;
  mediaType: string;
  imageSize: number;
  sortOrder: number;
}

export interface CoverImage {
  image_url?: unknown;
  thumb_url?: unknown;
}

export function collectRemovedImageUrls(
  existingRows: Array<Record<string, unknown>>,
  nextImages: PreparedWorkImage[]
): string[] {
  const newUrls = new Set(nextImages.flatMap((image) => [image.imageUrl, image.thumbUrl]));
  const removedUrls: string[] = [];
  for (const row of existingRows) {
    const imageUrl = row.image_url as string;
    const thumbUrl = row.thumb_url as string;
    if (imageUrl && !newUrls.has(imageUrl)) removedUrls.push(imageUrl);
    if (thumbUrl && !newUrls.has(thumbUrl)) removedUrls.push(thumbUrl);
  }
  return removedUrls;
}

export function chooseCoverImage(nextImages: PreparedWorkImage[], currentCover?: CoverImage): PreparedWorkImage {
  return (
    nextImages.find((image) => image.imageUrl === currentCover?.image_url || image.thumbUrl === currentCover?.thumb_url) ||
    [...nextImages].sort((a, b) => a.sortOrder - b.sortOrder)[0]
  );
}

export async function replaceWorkImagesInTransaction(
  transaction: Pick<Transaction, "execute" | "batch">,
  workId: string,
  images: PreparedWorkImage[]
) {
  await transaction.execute({ sql: "DELETE FROM work_images WHERE work_id = ?", args: [workId] });
  if (images.length === 0) return;

  await transaction.batch(
    images.map((image) => ({
      sql: `INSERT INTO work_images (id, work_id, image_url, thumb_url, media_type, sort_order, image_size)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [image.id, workId, image.imageUrl, image.thumbUrl, image.mediaType, image.sortOrder, image.imageSize],
    }))
  );
}
