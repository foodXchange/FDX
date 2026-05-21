"use client";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "sans-serif",
            background: "#f8fafc",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 600,
              color: "#0f172a",
              marginBottom: "8px",
            }}
          >
            Something went wrong
          </h2>
          <p
            style={{
              color: "#64748b",
              fontSize: "14px",
              marginBottom: "24px",
            }}
          >
            We have been notified and are looking into it.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#ea580c",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "10px 24px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
