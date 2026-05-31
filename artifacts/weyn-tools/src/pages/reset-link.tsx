import { useState } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function ResetLink() {
  const { toast } = useToast();
  const [emailsText, setEmailsText] = useState("");
  const [results, setResults] = useState<Array<{ email: string; success: boolean; response: string }>>([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const emails = emailsText
      .split("\n")
      .map((e) => e.trim())
      .filter(Boolean);

    if (!emails.length) {
      toast({ title: "Error", description: "Enter at least one email", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const res = await fetch("/api/reset-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      const data = await res.json();
      setResults(data.results ?? []);
      toast({ title: "Done", description: `Processed ${data.results?.length ?? 0} email(s)` });
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen p-8 max-w-2xl mx-auto space-y-6 relative"
      style={{ background: "#050505" }}
    >
      <div className="scanline-overlay" />

      {/* Header */}
      <div className="flex items-center gap-4 pt-2 animate-fade-in-up">
        <Link
          href="/"
          data-testid="link-back"
          className="text-xs tracking-widest transition-colors duration-150"
          style={{ color: "#ff000066" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#ff0000")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#ff000066")}
        >
          ← BACK
        </Link>
        <span style={{ color: "#ff000033" }}>|</span>
        <h1
          className="font-mono text-sm tracking-widest animate-red-pulse"
        >
          RESET LINK
        </h1>
      </div>

      {/* Panel */}
      <div
        className="p-6 space-y-5 animate-fade-in-up animate-border-glow"
        style={{
          border: "1px solid #ff000055",
          background: "#0a0a0a",
          animationDelay: "0.1s",
          opacity: 0,
          animationFillMode: "forwards",
        }}
      >
        <p className="text-xs" style={{ color: "#ff000077" }}>
          &gt; SEND RECOVERY EMAILS TO INSTAGRAM ACCOUNTS
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs tracking-widest" style={{ color: "#ffffff88" }}>
              TARGET EMAILS <span style={{ color: "#ff000066" }}>(ONE PER LINE)</span>
            </label>
            <textarea
              data-testid="input-emails"
              className="w-full h-36 bg-transparent font-mono text-sm p-3 resize-none transition-all duration-200"
              style={{
                border: "1px solid #ff000044",
                color: "#ffffff",
                background: "#050505",
              }}
              placeholder={"user@gmail.com\nanother@gmail.com"}
              value={emailsText}
              onChange={(e) => setEmailsText(e.target.value)}
            />
          </div>

          <SubmitButton loading={loading} label="SEND RECOVERY EMAILS" />
        </form>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div
          className="p-6 space-y-3 animate-fade-in-up"
          style={{ border: "1px solid #ff000044", background: "#0a0a0a" }}
        >
          <p className="text-xs mb-4" style={{ color: "#ff000077" }}>
            &gt; RESULTS — {results.length} TARGET(S) PROCESSED
          </p>
          {results.map((r, i) => (
            <div
              key={i}
              data-testid={`result-item-${i}`}
              className="p-4 space-y-2"
              style={{
                border: `1px solid ${r.success ? "#ff000066" : "#ff000033"}`,
                background: r.success ? "#ff000009" : "#0d0000",
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="text-xs"
                  style={{ color: r.success ? "#44ff44" : "#ff4444" }}
                >
                  {r.success ? "✓" : "✗"}
                </span>
                <span className="font-mono text-sm" style={{ color: "#ffffff" }}>
                  {r.email}
                </span>
                <span
                  className="ml-auto text-xs tracking-wider"
                  style={{ color: r.success ? "#44ff4488" : "#ff444488" }}
                >
                  {r.success ? "[SENT]" : "[FAILED]"}
                </span>
              </div>
              <pre
                className="text-xs font-mono whitespace-pre-wrap break-all p-3"
                style={{
                  color: "#666",
                  background: "#050505",
                  border: "1px solid #ff000022",
                }}
              >
                {r.response}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      data-testid="button-submit"
      type="submit"
      disabled={loading}
      className="w-full font-mono text-sm tracking-widest transition-all duration-200 p-4"
      style={{
        border: loading ? "1px solid #ff000033" : hovered ? "1px solid #ff0000" : "1px solid #ff000088",
        color: loading ? "#ff000055" : hovered ? "#000000" : "#ff0000",
        background: loading ? "transparent" : hovered ? "#ff0000" : "transparent",
        boxShadow: hovered && !loading ? "0 0 20px #ff000077, inset 0 0 10px #ff000022" : "none",
        cursor: loading ? "not-allowed" : "pointer",
        textShadow: hovered && !loading ? "none" : "0 0 8px #ff000066",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="animate-blink" style={{ color: "#ff0000" }}>■</span>
          PROCESSING...
        </span>
      ) : label}
    </button>
  );
}
