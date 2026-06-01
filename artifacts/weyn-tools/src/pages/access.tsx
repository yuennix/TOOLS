import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type Tab = "enter" | "generate";
type RequestState = "idle" | "pending" | "approved" | "rejected";

export default function Access() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("generate");

  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [reqLoading, setReqLoading] = useState(false);
  const [reqState, setReqState] = useState<RequestState>("idle");
  const [approvedKey, setApprovedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function handleEnter(e: React.FormEvent) {
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

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setNameError("Name is required"); return; }
    setReqLoading(true);
    setNameError("");
    try {
      const res = await fetch("/api/auth/request-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        setReqState("pending");
        startPolling(data.id);
      } else {
        setNameError(data.error ?? "Failed to send request");
      }
    } catch {
      setNameError("Connection error. Try again.");
    } finally {
      setReqLoading(false);
    }
  }

  function startPolling(id: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/request-key/${id}`);
        const data = await res.json();
        if (data.status === "approved" && data.key) {
          setReqState("approved");
          setApprovedKey(data.key);
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (data.status === "rejected") {
          setReqState("rejected");
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {}
    }, 3000);
  }

  function copyKey() {
    if (!approvedKey) return;
    navigator.clipboard.writeText(approvedKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  function resetRequest() {
    if (pollRef.current) clearInterval(pollRef.current);
    setReqState("idle");
    setApprovedKey(null);
    setName("");
    setNameError("");
    setCopied(false);
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "var(--surface)" }}
    >
      <div className="w-full max-w-sm space-y-6">

        {/* Hero */}
        <div className="text-center space-y-2">
          <p className="text-xs font-mono tracking-[0.25em] uppercase" style={{ color: "var(--red-accent)" }}>
            ACCESS REQUIRED
          </p>
          <h1
            className="font-sans text-5xl font-bold tracking-widest"
            style={{ color: "var(--text-primary)", letterSpacing: "0.15em" }}
          >
            WEYN
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Enter your access key or generate a new one below.
          </p>
        </div>

        {/* Admin panel link */}
        <div className="text-center">
          <Link
            href="/admin"
            className="text-xs font-mono tracking-[0.2em] uppercase transition-colors duration-150"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--red-accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            ADMIN PANEL →
          </Link>
        </div>

        {/* Tab switcher */}
        <div
          className="flex"
          style={{ border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden" }}
        >
          {(["enter", "generate"] as Tab[]).map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setError(""); }}
              className="flex-1 py-3 text-xs font-mono tracking-[0.15em] uppercase font-semibold transition-all duration-150"
              style={{
                background: tab === t ? "var(--red-accent)" : "transparent",
                color: tab === t ? "#fff" : "var(--text-muted)",
                border: "none",
                borderLeft: i === 1 ? "1px solid var(--line)" : "none",
                cursor: "pointer",
              }}
            >
              {t === "enter" ? "ENTER KEY" : "GENERATE KEY"}
            </button>
          ))}
        </div>

        {/* Card */}
        <div
          className="p-5 space-y-4"
          style={{ border: "1px solid var(--line)", borderRadius: "10px", background: "var(--surface-2)" }}
        >
          {tab === "enter" ? (
            <form onSubmit={handleEnter} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Access Key
                </label>
                <input
                  type="text"
                  value={key}
                  onChange={(e) => { setKey(e.target.value.toUpperCase()); setError(""); }}
                  placeholder="WEYN-XXXX-XXXX-XXXX"
                  className="w-full px-4 py-3 font-mono text-sm tracking-widest transition-all duration-200"
                  style={{
                    border: error ? "1px solid #ef4444" : "1px solid var(--line)",
                    borderRadius: "8px",
                    background: "var(--surface)",
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                  onFocus={(e) => { if (!error) e.target.style.borderColor = "var(--red-accent)"; }}
                  onBlur={(e) => { if (!error) e.target.style.borderColor = "var(--line)"; }}
                  autoComplete="off"
                  spellCheck={false}
                />
                {error && <p className="text-xs font-mono" style={{ color: "#ef4444" }}>✗ {error}</p>}
              </div>
              <ActionBtn loading={loading} label="Validate Key" />
            </form>
          ) : (
            <div className="space-y-4">
              {reqState === "idle" && (
                <form onSubmit={handleRequest} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setNameError(""); }}
                      placeholder="Enter your name"
                      className="w-full px-4 py-3 text-sm transition-all duration-200"
                      style={{
                        border: nameError ? "1px solid #ef4444" : "1px solid var(--line)",
                        borderRadius: "8px",
                        background: "var(--surface)",
                        color: "var(--text-primary)",
                        outline: "none",
                      }}
                      onFocus={(e) => { if (!nameError) e.target.style.borderColor = "var(--red-accent)"; }}
                      onBlur={(e) => { if (!nameError) e.target.style.borderColor = "var(--line)"; }}
                      autoComplete="off"
                    />
                    {nameError && <p className="text-xs font-mono" style={{ color: "#ef4444" }}>✗ {nameError}</p>}
                  </div>
                  <ActionBtn loading={reqLoading} label="Request Key" />
                </form>
              )}

              {reqState === "pending" && (
                <div className="text-center space-y-4 py-2">
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full border-2 animate-spin"
                      style={{ borderColor: "var(--red-accent)", borderTopColor: "transparent" }}
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        Request Sent
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Waiting for admin approval…
                      </p>
                      <p className="text-xs font-mono mt-1 px-3 py-1 rounded" style={{ color: "var(--red-accent)", background: "var(--red-glow)", display: "inline-block" }}>
                        {name}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={resetRequest}
                    className="text-xs font-mono transition-colors"
                    style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
                  >
                    Cancel request
                  </button>
                </div>
              )}

              {reqState === "approved" && approvedKey && (
                <div className="space-y-4 py-1">
                  <div className="text-center space-y-1">
                    <p className="text-xs font-mono" style={{ color: "#22c55e" }}>✓ APPROVED</p>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      Your key is ready, {name}!
                    </p>
                  </div>
                  <div
                    className="p-3 space-y-3"
                    style={{ border: "1px solid var(--red-accent)", borderRadius: "8px", background: "var(--red-glow)" }}
                  >
                    <p
                      className="font-mono text-sm tracking-widest text-center select-all break-all"
                      style={{ color: "var(--red-accent)" }}
                    >
                      {approvedKey}
                    </p>
                    <button
                      type="button"
                      onClick={copyKey}
                      className="w-full py-2 text-sm font-semibold transition-all duration-200"
                      style={{
                        borderRadius: "6px",
                        border: "1px solid var(--red-accent)",
                        background: copied ? "var(--red-accent)" : "transparent",
                        color: copied ? "#fff" : "var(--red-accent)",
                        cursor: "pointer",
                      }}
                    >
                      {copied ? "✓ Copied!" : "Copy to Clipboard"}
                    </button>
                  </div>
                  <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
                    Switch to{" "}
                    <button
                      type="button"
                      onClick={() => { setTab("enter"); setKey(approvedKey); resetRequest(); }}
                      style={{ color: "var(--red-accent)", background: "none", border: "none", cursor: "pointer", fontSize: "inherit", padding: 0 }}
                    >
                      Enter Key
                    </button>{" "}
                    to activate it.
                  </p>
                </div>
              )}

              {reqState === "rejected" && (
                <div className="text-center space-y-4 py-2">
                  <div className="space-y-1">
                    <p className="text-xs font-mono" style={{ color: "#ef4444" }}>✗ REJECTED</p>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      Your request was declined.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetRequest}
                    className="text-xs font-mono px-4 py-2 transition-all"
                    style={{ border: "1px solid var(--line)", borderRadius: "6px", color: "var(--text-muted)", background: "none", cursor: "pointer" }}
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function ActionBtn({ loading, label }: { loading: boolean; label: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-3 text-sm font-semibold transition-all duration-200"
      style={{
        borderRadius: "8px",
        border: "1.5px solid var(--red-accent)",
        background: "transparent",
        color: loading ? "var(--text-muted)" : "var(--red-accent)",
        cursor: loading ? "not-allowed" : "pointer",
        boxShadow: hovered && !loading ? "0 0 10px var(--red-glow-strong)" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span
            className="inline-block w-3 h-3 border-2 rounded-full animate-spin"
            style={{ borderColor: "var(--red-accent)", borderTopColor: "transparent" }}
          />
          {label === "Validate Key" ? "Validating..." : "Sending..."}
        </span>
      ) : label}
    </button>
  );
}
