import { ImageResponse } from "next/og";

export const alt = "Ample Cleaners — professional cleaning, fixed price";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Rendered on request, not at build time: next/og cannot resolve its bundled font from a Windows path during local builds.
export const dynamic = "force-dynamic";

/** The card shown when the site is shared on WhatsApp, Facebook, LinkedIn, iMessage, etc. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center",
          padding: "80px", color: "white", background: "linear-gradient(135deg, #052e16 0%, #15803d 60%, #16a34a 100%)",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#bbf7d0", letterSpacing: 2 }}>AMPLE CLEANERS</div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 84, fontWeight: 800, lineHeight: 1.05 }}>A spotless home, booked in minutes.</div>
        <div style={{ display: "flex", marginTop: 32, fontSize: 36, color: "#dcfce7" }}>Fixed price · DBS-checked cleaners · Pay later, not upfront</div>
        <div style={{ display: "flex", marginTop: 48 }}>
          <div style={{ display: "flex", height: 10, width: 220, borderRadius: 10, background: "#38bdf8" }} />
          <div style={{ display: "flex", height: 10, width: 120, borderRadius: 10, background: "#a78bfa", marginLeft: 12 }} />
        </div>
      </div>
    ),
    size,
  );
}
