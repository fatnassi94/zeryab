import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0A0E1A" }}>
        <svg width="180" height="180" viewBox="0 0 512 512">
          <g fill="none" stroke="#E4BE74" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round">
            <path d="M76 300 Q256 452 436 300" />
            <path d="M144 276 L256 132 L368 276" />
          </g>
          <circle cx="256" cy="214" r="28" fill="#E4BE74" />
        </svg>
      </div>
    ),
    size,
  );
}
