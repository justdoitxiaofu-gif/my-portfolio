import type { MetadataRoute } from "next";
import { allWorks } from "@/lib/static-data";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base: MetadataRoute.Sitemap = [
    { url: "https://mouyifu.art", lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
  ];

  const workEntries: MetadataRoute.Sitemap = allWorks.map((work) => ({
    url: `https://mouyifu.art/work/${work.id}`,
    lastModified: new Date(work.updated_at || Date.now()),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...base, ...workEntries];
}
