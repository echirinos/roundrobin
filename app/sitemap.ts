import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://playsync.fun";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  // Only the marketing homepage is indexable content. /tournament is the app
  // workspace and every page canonicalizes to "/", so listing it here would be
  // self-defeating.
  return [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
