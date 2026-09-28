import type { MetadataRoute } from "next";
import { SITE_URL } from "./lib/site";

// Regenerate hourly so newly published blogs show up without a redeploy.
export const revalidate = 3600;

type BlogRow = { id: string; updated_at: string | null; created_at: string };

async function listPublishedBlogIds(): Promise<BlogRow[]> {
  try {
    const { sql } = await import("./lib/neon");
    const rows = await sql`
      SELECT id, updated_at, created_at
      FROM aur_blogs
      WHERE status = 'published'
      ORDER BY created_at DESC
    `;
    return rows as BlogRow[];
  } catch {
    // Keep the static entries if the database is unreachable at build time.
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogs = await listPublishedBlogIds();

  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/blogs`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/news`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    ...blogs.map((blog) => ({
      url: `${SITE_URL}/blogs/${encodeURIComponent(blog.id)}`,
      lastModified: new Date(blog.updated_at ?? blog.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
