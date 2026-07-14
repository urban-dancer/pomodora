import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at top, #fff7ed 0%, #fdba74 45%, #f97316 100%)",
        }}
      >
        <div
          style={{
            width: 360,
            height: 360,
            borderRadius: 90,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#111111",
            boxShadow: "0 30px 80px rgba(17, 17, 17, 0.28)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              color: "white",
              fontFamily: "sans-serif",
            }}
          >
            <div
              style={{
                fontSize: 44,
                letterSpacing: 10,
                textTransform: "uppercase",
                color: "#fdba74",
              }}
            >
              Focus
            </div>
            <div
              style={{
                marginTop: 18,
                fontSize: 112,
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              25
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
