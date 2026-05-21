"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const success = searchParams.get("success") === "true";

  const [done, setDone] = useState(success);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!email || done) return;

    fetch("/api/newsletter/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
      .then((r) => r.json())
      .then((d: { ok?: boolean; error?: string }) => {
        if (d.ok) {
          setDone(true);
        } else {
          setError(d.error ?? "Something went wrong");
        }
      })
      .catch(() => setError("Network error — please try again"));
  }, [email, done]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        background: "#f8fafc",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          maxWidth: "480px",
          width: "100%",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          padding: "48px 40px",
        }}
      >
        {done ? (
          <>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>✓</div>
            <h1
              style={{
                fontSize: "20px",
                fontWeight: 600,
                color: "#0f172a",
                marginBottom: "12px",
              }}
            >
              You have been unsubscribed
            </h1>
            <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "32px" }}>
              You will no longer receive FoodXchange Market Notes.
              {email && (
                <>
                  {" "}
                  <span style={{ color: "#94a3b8" }}>({email})</span>
                </>
              )}
            </p>
            <Link
              href="/"
              style={{
                color: "#ea580c",
                fontSize: "14px",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              ← Back to fdx.trading
            </Link>
          </>
        ) : error ? (
          <>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>⚠️</div>
            <h1
              style={{
                fontSize: "20px",
                fontWeight: 600,
                color: "#0f172a",
                marginBottom: "12px",
              }}
            >
              Something went wrong
            </h1>
            <p style={{ color: "#ef4444", fontSize: "14px", marginBottom: "24px" }}>
              {error}
            </p>
            <Link href="/" style={{ color: "#ea580c", fontSize: "14px" }}>
              ← Back to fdx.trading
            </Link>
          </>
        ) : (
          <>
            <div
              style={{
                width: "32px",
                height: "32px",
                border: "2px solid #ea580c",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 16px",
              }}
            />
            <p style={{ color: "#64748b", fontSize: "14px" }}>
              Unsubscribing…
            </p>
          </>
        )}
      </div>
    </main>
  );
}
