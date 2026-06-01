import { useState } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function ResetLink() {
  const { toast } = useToast();
  const [emailsText, setEmailsText] = useState("");
  const [results, setResults] = useState<
    Array<{ email: string; success: boolean; response: string }>
  >([]);
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
      if (!res.ok) {
        throw new Error(data.error ?? `Server error ${res.status}`);
      }
      setResults(data.results ?? []);
      toast({ title: "Done", description: `Processed ${data.results?.length ?? 0} email(s)` });
    } catch (err) {
      toast({ title: "Error", description: String(err instanceof Error ? err.message : err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-mono animate-slide-in">
        <Link
          href="/"
          data-testid="link-back"
          style={{ color: "var(--text-muted)" }}
          className="hover:text-foreground transition-colors"
        >
          Home
        </Link>
        <span style={{ color: "var(--text-muted)" }}>/</span>
        <span style={{ color: "var(--red-accent)" }}>Reset Link</span>
      </nav>

      {/* Page header */}
      <div className="space-y-1 animate-fade-up">
        <p className="text-xs font-mono tracking-widest" style={{ color: "var(--red-accent)" }}>
          MODULE 01
        </p>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Reset Link
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Send Instagram account recovery emails to target addresses.
        </p>
      </div>

      {/* Form card */}
      <div
        className="p-6 space-y-6 animate-fade-up"
        style={{
          border: "1px solid var(--line)",
          borderRadius: "8px",
          background: "var(--surface)",
          animationDelay: "60ms",
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label
              className="block text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              Target Emails
              <span
                className="ml-2 text-xs font-mono"
                style={{ color: "var(--text-muted)" }}
              >
                one per line
              </span>
            </label>
            <textarea
              data-testid="input-emails"
              className="w-full h-36 p-3 text-sm font-mono resize-none transition-all duration-200"
              style={{
                border: "1px solid var(--line)",
                borderRadius: "6px",
                background: "var(--surface-2)",
                color: "var(--text-primary)",
              }}
              placeholder={"user@gmail.com\nanother@gmail.com"}
              value={emailsText}
              onChange={(e) => setEmailsText(e.target.value)}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--red-accent)";
                e.currentTarget.style.boxShadow = "0 0 0 3px var(--red-glow)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--line)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          <ActionButton loading={loading} label="Send Recovery Emails" />
        </form>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3 animate-fade-up">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Results
            </p>
            <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
              {results.filter((r) => r.success).length}/{results.length} sent
            </span>
          </div>
          <div className="space-y-2">
            {results.map((r, i) => (
              <ResultCard key={i} result={r} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultCard({
  result,
  index,
}: {
  result: { email: string; success: boolean; response: string };
  index: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      data-testid={`result-item-${index}`}
      className="overflow-hidden transition-all duration-200"
      style={{
        border: `1px solid ${result.success ? "var(--red-accent)" : "var(--line)"}`,
        borderRadius: "6px",
        background: "var(--surface)",
        opacity: result.success ? 1 : 0.7,
      }}
    >
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <span
          className="w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full shrink-0"
          style={{
            background: result.success ? "var(--red-accent)" : "var(--line)",
            color: result.success ? "#fff" : "var(--text-muted)",
          }}
        >
          {result.success ? "✓" : "✗"}
        </span>
        <span className="text-sm font-mono flex-1" style={{ color: "var(--text-primary)" }}>
          {result.email}
        </span>
        <span
          className="text-xs font-mono"
          style={{ color: result.success ? "var(--red-accent)" : "var(--text-muted)" }}
        >
          {result.success ? "SENT" : "FAILED"}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            color: "var(--text-muted)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
            flexShrink: 0,
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div
          className="px-4 pb-3"
          style={{ borderTop: "1px solid var(--line)" }}
        >
          <pre
            className="text-xs font-mono mt-3 p-3 whitespace-pre-wrap break-all"
            style={{
              background: "var(--surface-2)",
              color: "var(--text-secondary)",
              borderRadius: "4px",
              border: "1px solid var(--line)",
            }}
          >
            {result.response}
          </pre>
        </div>
      )}
    </div>
  );
}

function ActionButton({ loading, label }: { loading: boolean; label: string }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      data-testid="button-submit"
      type="submit"
      disabled={loading}
      className="w-full py-3 px-6 text-sm font-semibold transition-all duration-200"
      style={{
        borderRadius: "6px",
        border: "1px solid var(--red-accent)",
        background: loading
          ? "transparent"
          : hovered
          ? "var(--red-accent)"
          : "transparent",
        color: loading
          ? "var(--text-muted)"
          : hovered
          ? "#ffffff"
          : "var(--red-accent)",
        cursor: loading ? "not-allowed" : "pointer",
        boxShadow: hovered && !loading ? "0 0 16px var(--red-glow-strong)" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span
            className="inline-block w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "var(--red-accent)", borderTopColor: "transparent" }}
          />
          Processing...
        </span>
      ) : label}
    </button>
  );
}
