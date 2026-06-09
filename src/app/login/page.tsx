"use client";

import { useState, useEffect } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("error") === "1") {
        setError(true);
      }
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = `/?password=${encodeURIComponent(password)}`;
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0a0a0a",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <div style={{
          width: 48, height: 48,
          background: "#fff", borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 1.5rem",
          fontSize: 24,
        }}>
          🐦
        </div>
        <h1 style={{
          fontSize: "1.25rem", color: "#e5e5e5",
          marginBottom: "0.25rem", fontWeight: 600,
        }}>
          X Insight Hub
        </h1>
        <p style={{ color: "#888", fontSize: "0.875rem", marginBottom: "2rem" }}>
          请输入访问密码
        </p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            style={{
              background: "#1a1a1a",
              border: "1px solid #333",
              color: "#fff",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              fontSize: "1rem",
              width: 280,
              outline: "none",
            }}
          />
          <button type="submit" style={{
            background: "#fff",
            color: "#0a0a0a",
            border: "none",
            padding: "0.75rem 2rem",
            borderRadius: "0.5rem",
            fontSize: "1rem",
            fontWeight: 500,
            cursor: "pointer",
          }}>
            Enter
          </button>
        </form>
        {error && (
          <p style={{ color: "#f44", fontSize: "0.8rem", marginTop: "1rem" }}>
            密码错误，请重试
          </p>
        )}
      </div>
    </div>
  );
}
