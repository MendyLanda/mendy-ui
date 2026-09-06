import { ImageResponse } from "next/og";
import { SITE } from "@/constants/site";
export const dynamic = "force-static";
export const alt = "Mendy UI. My personal collection of components I like to use.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: "70px",
        background: "#ffffff",
        color: "#171717",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", fontSize: 64 }}>Mendy UI</div>
      <div style={{ display: "flex", fontSize: 42, lineHeight: 1.4, maxWidth: 850 }}>
        {SITE.description}
      </div>
      <div style={{ display: "flex", fontSize: 24, color: "#737373" }}>ui.mendylanda.com</div>
    </div>,
    size,
  );
}
