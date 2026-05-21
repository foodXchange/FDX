import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://fdx.trading";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/en/admin/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
