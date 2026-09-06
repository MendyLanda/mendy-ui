import { ImageResponse } from "next/og";
export const dynamic = "force-static";
export const alt = "Mendy UI. Components, considered.";
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
        background: "#fafaf8",
        color: "#171717",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", fontSize: 32, color: "#175c45" }}>m. / Mendy UI</div>
      <div style={{ display: "flex", flexDirection: "column", fontSize: 84, letterSpacing: -4 }}>
        <span>Components,</span>
        <span style={{ color: "#737373" }}>considered.</span>
      </div>
      <div style={{ display: "flex", fontSize: 24, color: "#737373" }}>
        Composable React components · ui.mendylanda.com
      </div>
    </div>,
    size,
  );
}
