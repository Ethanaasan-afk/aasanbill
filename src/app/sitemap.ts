import type { MetadataRoute } from "next";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://aasanbill.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const paths = [
    "",
    "/how-it-works",
    "/contact",
    "/privacy-policy",
    "/terms",
    "/refund-policy",
  ];

  return paths.map((path) => ({
    url: `${SITE}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority:
      path === ""
        ? 1
        : path === "/privacy-policy" || path === "/terms" || path === "/refund-policy"
          ? 0.3
          : 0.8,
  }));
}
