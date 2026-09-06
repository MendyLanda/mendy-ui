import type { MetadataRoute } from "next";
import { source } from "@/lib/source";
import { SITE } from "@/constants/site";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", ...source.getPages().map((page) => page.url)].map((path) => ({
    url: `${SITE.url}${path}`,
  }));
}
