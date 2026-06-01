import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function Access() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        sessionStorage.setItem("weyn-access", "1");
        toast({ title: "Access Granted", description: "Welcome to WEYN Tools" });
        setLocation("/");
      } else {
        setError(data.error ?? "Invalid key");
      }
    } catch {
      setError("Connection error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--surface)" }}
    >
      <div className="w-full max-w-sm space-y-6">

        {/* Logo */}
        <div className="text-center space-y-1">
          <h1
            className="font-mono text-3xl font-bold tracking-widest animate-red-breathe"
            style={{ letterSpacing: "0.22em" }}
          >
            WEYN
          </h1>
          <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
            ACCESS RESTRICTED
          </p>
        </div>

        {/* Card */}
        <div
          className="p-6 space-y-4"
          style={{
            border: "1px solid var(--line)",
            borderRadius: "8px",
            background: "var(--surface)",
          }}
        >
          <div className="space-y-1">
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Enter Access Key
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              A valid single-use key is required to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              value={key}
              onChange={(e) => { setKey(e.target.value.toUpperCase()); setError(""); }}
              placeholder="WEYN-XXXX-XXXX-XXXX"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="w-full px-3 py-2.5 font-mono text-sm tracking-widest transition-all duration-200"
              style={{
                border: error
                  ? "1px solid #ef4444"
                  : focused
                  ? "1px solid var(--red-accent)"
                  : "1px solid var(--line)",
                borderRadius: "6px",
                background: "var(--surface-2)",
                color: "var(--text-primary)",
                boxShadow: focused && !error ? "0 0 0 3px var(--red-glow)" : "none",
              }}
              autoComplete="off"
              spellCheck={false}
            />

            {error && (
              <p className="text-xs font-mono" style={{ color: "#ef4444" }}>
                ✗ {error}
              </p>
            )}

            <SubmitBtn loading={loading} />
          </form>
        </div>

        <p
          className="text-center text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          Contact <span style={{ color: "var(--red-accent)" }}>@jinbelowg</span> for access
        </p>
      </div>
    </div>
  );
}

function SubmitBtn({ loading }: { loading: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-2.5 text-sm font-semibold transition-all duration-200"
      style={{
        borderRadius: "6px",
        border: "1px solid var(--red-accent)",
        background: loading ? "transparent" : hovered ? "var(--red-accent)" : "transparent",
        color: loading ? "var(--text-muted)" : hovered ? "#fff" : "var(--red-accent)",
        cursor: loading ? "not-allowed" : "pointer",
        boxShadow: hovered && !loading ? "0 0 14px var(--red-glow-strong)" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="inline-block w-3 h-3 border-2 rounded-full animate-spin"
            style={{ borderColor: "var(--red-accent)", borderTopColor: "transparent" }} />
          Verifying...
        </span>
      ) : "Enter"}
    </button>
  );
}
