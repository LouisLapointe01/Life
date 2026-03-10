import { ImageResponse } from "next/og";

export const runtime = "edge";

function clampSize(input: number) {
  if (Number.isNaN(input)) return 512;
  return Math.min(Math.max(input, 32), 1024);
}

function LifeIcon({ size }: { size: number }) {
  const tileSize = Math.round(size * 0.72);
  const leafSize = Math.round(size * 0.34);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #e9faf4 0%, #e5f3ff 52%, #f1f5ff 100%)",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: Math.round(size * 0.08),
          borderRadius: Math.round(size * 0.28),
          background: "radial-gradient(circle at top, rgba(59,165,160,0.20), transparent 50%)",
          opacity: 0.95,
        }}
      />

      <div
        style={{
          width: tileSize,
          height: tileSize,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          borderRadius: Math.round(size * 0.24),
          background: "linear-gradient(145deg, #44b6a9 0%, #2f958f 48%, #226f8b 100%)",
          boxShadow: "0 28px 70px rgba(34, 111, 139, 0.28)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: Math.round(size * 0.08),
            left: Math.round(size * 0.08),
            width: Math.round(size * 0.22),
            height: Math.round(size * 0.22),
            borderRadius: 999,
            background: "rgba(255,255,255,0.16)",
            filter: "blur(4px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -Math.round(size * 0.06),
            top: -Math.round(size * 0.02),
            width: Math.round(size * 0.34),
            height: Math.round(size * 0.34),
            borderRadius: 999,
            background: "rgba(255,255,255,0.18)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -Math.round(size * 0.05),
            bottom: -Math.round(size * 0.08),
            width: Math.round(size * 0.3),
            height: Math.round(size * 0.3),
            borderRadius: 999,
            background: "rgba(255,255,255,0.12)",
          }}
        />

        <svg
          width={leafSize}
          height={leafSize}
          viewBox="0 0 192 192"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: "relative" }}
        >
          <path
            d="M96 34C124 38 146 60 146 89C146 122 123 147 96 154C69 147 46 122 46 89C46 60 68 38 96 34Z"
            fill="rgba(255,255,255,0.96)"
          />
          <path d="M96 45V143" stroke="#2B9390" strokeWidth="8" strokeLinecap="round" opacity="0.45" />
          <path d="M95 77C76 84 63 94 54 108" stroke="#2B9390" strokeWidth="6" strokeLinecap="round" opacity="0.34" />
          <path d="M97 77C116 84 129 94 138 108" stroke="#2B9390" strokeWidth="6" strokeLinecap="round" opacity="0.34" />
          <path d="M95 103C79 111 67 123 61 133" stroke="#2B9390" strokeWidth="6" strokeLinecap="round" opacity="0.28" />
          <path d="M97 103C113 111 125 123 131 133" stroke="#2B9390" strokeWidth="6" strokeLinecap="round" opacity="0.28" />
        </svg>
      </div>
    </div>
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const size = clampSize(Number(searchParams.get("size") ?? "512"));

  return new ImageResponse(<LifeIcon size={size} />, {
    width: size,
    height: size,
  });
}