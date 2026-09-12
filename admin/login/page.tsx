"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);

      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const j = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(j?.error || "Credenciales inválidas");
        return;
      }

      localStorage.setItem("admin_logged", "true");
      localStorage.setItem("admin_user", username.trim());
      localStorage.setItem("admin_user_id", String(j?.user?.id ?? ""));

      router.push("/cabildos");
    } catch (err) {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(1200px 600px at 50% 20%, oklch(27.9% .041 260.031) 0%, oklch(27.9% .041 260.031) 60%)",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "min(520px, 100%)",
          background: "#fff",
          borderRadius: 18,
          padding: "36px 34px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              background: "#ff9800",
              display: "grid",
              placeItems: "center",
            }}
            aria-hidden
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M17 10V8a5 5 0 10-10 0v2"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M7 10h10a2 2 0 012 2v7a2 2 0 01-2 2H7a2 2 0 01-2-2v-7a2 2 0 012-2z"
                stroke="#fff"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <h1 style={{ margin: 0, textAlign: "center", fontSize: 28, fontWeight: 800 }}>
          Admin Login
        </h1>
        <p style={{ marginTop: 8, textAlign: "center", color: "#667085" }}>
          Access settings and configuration
        </p>

        <form onSubmit={onSubmit} style={{ marginTop: 28 }}>
          <label style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>
            Username
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            autoComplete="username"
            style={{
              width: "100%",
              height: 46,
              borderRadius: 12,
              border: "1px solid #D0D5DD",
              padding: "0 14px",
              outline: "none",
              fontSize: 15,
            }}
          />

          <div style={{ height: 16 }} />

          <label style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>
            Password
          </label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            type="password"
            autoComplete="current-password"
            style={{
              width: "100%",
              height: 46,
              borderRadius: 12,
              border: "1px solid #D0D5DD",
              padding: "0 14px",
              outline: "none",
              fontSize: 15,
            }}
          />

          {error ? (
            <div
              style={{
                marginTop: 14,
                padding: 10,
                borderRadius: 10,
                background: "rgba(255,0,0,0.06)",
                border: "1px solid rgba(255,0,0,0.15)",
                color: "#b42318",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              height: 48,
              marginTop: 18,
              borderRadius: 12,
              border: "none",
              background: "#ff9800",
              color: "#fff",
              fontWeight: 800,
              fontSize: 16,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.75 : 1,
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}