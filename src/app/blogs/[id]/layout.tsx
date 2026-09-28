import type { Metadata } from "next";
import { cache } from "react";
import { SITE_NAME, SITE_URL } from "../../lib/site";

type BlogMeta = {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  author: string | null;
  publish_date: string | null;
  created_at: string;
  updated_at: string | null;
};

// Shared by generateMetadata and the layout so the post is only queried once.
const getPublishedBlog = cache(async (id: string): Promise<BlogMeta | null> => {
  try {
    const { sql } = await import("../../lib/neon");
    const rows = await sql`
      SELECT id, title, description, cover_image, author, publish_date, created_at, updated_at
      FROM aur_blogs
      WHERE id = ${id} AND status = 'published'
      LIMIT 1
    `;
    return (rows[0] as BlogMeta | undefined) ?? null;
  } catch {
    return null;
  }
});

export async function generateMetadata(
  props: LayoutProps<"/blogs/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const blog = await getPublishedBlog(id);
  if (!blog) return { title: "Blog post not found", robots: { index: false } };

  const path = `/blogs/${encodeURIComponent(blog.id)}`;
  const description = blog.description ?? undefined;
  const images = blog.cover_image ? [blog.cover_image] : undefined;

  return {
    title: blog.title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      title: blog.title,
      description,
      images,
      publishedTime: blog.publish_date ?? blog.created_at,
      modifiedTime: blog.updated_at ?? undefined,
      authors: blog.author ? [blog.author] : undefined,
    },
    twitter: { card: "summary_large_image", title: blog.title, description, images },
  };
}

export default async function BlogPostLayout(props: LayoutProps<"/blogs/[id]">) {
  const { id } = await props.params;
  const blog = await getPublishedBlog(id);

  const articleJsonLd = blog && {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: blog.title,
    description: blog.description ?? undefined,
    image: blog.cover_image ?? undefined,
    datePublished: blog.publish_date ?? blog.created_at,
    dateModified: blog.updated_at ?? blog.publish_date ?? blog.created_at,
    author: blog.author ? { "@type": "Person", name: blog.author } : undefined,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
    },
    mainEntityOfPage: `${SITE_URL}/blogs/${encodeURIComponent(blog.id)}`,
  };

  return (
    <>
      {articleJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(articleJsonLd).replace(/</g, "\u003c"),
          }}
        />
      )}
      {props.children}
    </>
  );
}
