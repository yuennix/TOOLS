import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type Result = {
  resetLink: string;
  success: boolean;
  username?: string | null;
  password?: string | null;
  error?: string | null;
};

export default function ResetPass() {
  const { toast } = useToast();
  const [resetLinksText, setResetLinksText] = useState("");
  const [chatId, setChatId] = useState(() => localStorage.getItem("weyn-chat-id") ?? "");
  const [botToken, setBotToken] = useState(() => localStorage.getItem("weyn-bot-token") ?? "");
  const [customPassword, setCustomPassword] = useState("");

  useEffect(() => { localStorage.setItem("weyn-chat-id", chatId); }, [chatId]);
  useEffect(() => { localStorage.setItem("weyn-bot-token", botToken); }, [botToken]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const resetLinks = resetLinksText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (!resetLinks.length) {
      toast({ title: "Error", description: "Enter at least one reset link", variant: "destructive" });
      return;
    }
    if (!chatId || !botToken) {
      toast({ title: "Error", description: "Fill all required fields", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const res = await fetch("/api/reset-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetLinks,
          chatId,
          botToken,
          customPassword: customPassword || null,
        }),
      });
      const data = await res.json();
      const items: Result[] = data.results ?? [];
      setResults(items);
      const succeeded = items.filter((r) => r.success).length;
      toast({
        title: "Done",
        description: `${succeeded}/${items.length} reset(s) successful`,
        variant: succeeded === items.length ? "default" : "destructive",
      });
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
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
          style={{ color: "var(--text-muted)" }}
          className="hover:text-foreground transition-colors"
        >
          Home
        </Link>
        <span style={{ color: "var(--text-muted)" }}>/</span>
        <span style={{ color: "var(--red-accent)" }}>Reset Pass</span>
      </nav>

      {/* Page header */}
      <div className="space-y-1 animate-fade-up">
        <p className="text-xs font-mono tracking-widest" style={{ color: "var(--red-accent)" }}>
          MODULE 02
        </p>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Reset Pass
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Reset Instagram passwords using valid recovery links.
        </p>
      </div>

      {/* Form card */}
      <div
        className="p-6 space-y-5 animate-fade-up"
        style={{
          border: "1px solid var(--line)",
          borderRadius: "8px",
          background: "var(--surface)",
          animationDelay: "60ms",
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Reset Links textarea */}
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Reset Links
              <span className="ml-1" style={{ color: "var(--red-accent)" }}>*</span>
              <span className="ml-2 text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                one per line
              </span>
            </label>
            <textarea
              className="w-full h-36 p-3 text-sm font-mono resize-none transition-all duration-200"
              style={{
                border: "1px solid var(--line)",
                borderRadius: "6px",
                background: "var(--surface-2)",
                color: "var(--text-primary)",
              }}
              placeholder={"https://www.instagram.com/accounts/password/reset/?uidb36=...&token=...\nhttps://www.instagram.com/accounts/password/reset/?uidb36=...&token=..."}
              value={resetLinksText}
              onChange={(e) => setResetLinksText(e.target.value)}
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

          {/* Telegram Chat ID */}
          <FormField
            label="Telegram Chat ID"
            hint="Destination"
            placeholder="-1001234567890"
            required
            value={chatId}
            onChange={(v) => setChatId(v)}
          />

          {/* Telegram Bot Token */}
          <FormField
            label="Telegram Bot Token"
            hint="Required"
            placeholder="1234567890:AAF..."
            required
            value={botToken}
            onChange={(v) => setBotToken(v)}
          />

          {/* Custom Password */}
          <FormField
            label="Custom Password"
            hint="Optional — leave blank to auto-generate per link"
            placeholder="Leave empty for random password"
            required={false}
            value={customPassword}
            onChange={(v) => setCustomPassword(v)}
          />

          <div className="pt-1">
            <ActionButton loading={loading} count={resetLinksText.split("\n").filter((l) => l.trim()).length} />
          </div>
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
              {results.filter((r) => r.success).length}/{results.length} successful
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

function FormField({
  label,
  hint,
  placeholder,
  required,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  placeholder: string;
  required: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {label}
          {required && <span className="ml-1" style={{ color: "var(--red-accent)" }}>*</span>}
        </label>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{hint}</span>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full px-3 py-2.5 text-sm font-mono transition-all duration-200"
        style={{
          border: focused ? "1px solid var(--red-accent)" : "1px solid var(--line)",
          borderRadius: "6px",
          background: "var(--surface-2)",
          color: "var(--text-primary)",
          boxShadow: focused ? "0 0 0 3px var(--red-glow)" : "none",
        }}
      />
    </div>
  );
}

function ActionButton({ loading, count }: { loading: boolean; count: number }) {
  const [hovered, setHovered] = useState(false);
  const label = count > 1 ? `Reset ${count} Passwords` : "Reset Password";

  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-3 px-6 text-sm font-semibold transition-all duration-200"
      style={{
        borderRadius: "6px",
        border: "1px solid var(--red-accent)",
        background: loading ? "transparent" : hovered ? "var(--red-accent)" : "transparent",
        color: loading ? "var(--text-muted)" : hovered ? "#ffffff" : "var(--red-accent)",
        cursor: loading ? "not-allowed" : "pointer",
        boxShadow: hovered && !loading ? "0 0 16px var(--red-glow-strong)" : "none",
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
          Processing...
        </span>
      ) : label}
    </button>
  );
}

function ResultCard({ result }: { result: Result; index: number }) {
  const [open, setOpen] = useState(!result.success);
  const shortLink = result.resetLink.length > 55
    ? result.resetLink.slice(0, 55) + "…"
    : result.resetLink;

  return (
    <div
      className="overflow-hidden transition-all duration-200"
      style={{
        border: `1px solid ${result.success ? "var(--red-accent)" : "var(--line)"}`,
        borderRadius: "10px",
        background: "var(--surface)",
        opacity: result.success ? 1 : 0.75,
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
        <span className="text-xs font-mono flex-1 truncate" style={{ color: "var(--text-secondary)" }}>
          {result.success && result.username ? `@${result.username}` : shortLink}
        </span>
        <span
          className="text-xs font-mono shrink-0"
          style={{ color: result.success ? "var(--red-accent)" : "var(--text-muted)" }}
        >
          {result.success ? "DONE" : "FAILED"}
        </span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
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
        <div className="px-4 pb-4" style={{ borderTop: "1px solid var(--line)" }}>
          {result.success ? (
            <SuccessCard username={result.username ?? ""} password={result.password ?? ""} />
          ) : (
            <pre
              className="mt-3 text-xs font-mono p-3 whitespace-pre-wrap break-all"
              style={{
                background: "var(--surface-2)",
                color: "var(--text-secondary)",
                borderRadius: "6px",
                border: "1px solid var(--line)",
              }}
            >
              {result.error}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function SuccessCard({ username, password }: { username: string; password: string }) {
  const [copied, setCopied] = useState<string | null>(null);

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    });
  }

  function copyAll() {
    const text = `Hola! Your Password has been changed!\n\nUsername: @${username}\nPassword: ${password}`;
    copyText(text, "all");
  }

  return (
    <div
      className="mt-3 rounded-xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #1a0a0a 0%, #120808 100%)",
        border: "1px solid var(--red-accent)",
        boxShadow: "0 0 20px var(--red-glow)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 text-center"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,60,60,0.06)",
        }}
      >
        <p
          style={{
            fontFamily: "'Nunito', 'Quicksand', 'Varela Round', system-ui, sans-serif",
            fontWeight: 800,
            fontSize: "1rem",
            color: "#fff",
            letterSpacing: "0.01em",
            lineHeight: 1.3,
          }}
        >
          Hola! Your Password has been changed! 🎉
        </p>
      </div>

      {/* Fields */}
      <div className="px-5 py-4 space-y-3">
        <CopyRow
          label="Username"
          value={`@${username}`}
          onCopy={() => copyText(`@${username}`, "username")}
          copied={copied === "username"}
        />
        <CopyRow
          label="Password"
          value={password}
          onCopy={() => copyText(password, "password")}
          copied={copied === "password"}
          highlight
        />
      </div>

      {/* Copy All button */}
      <div className="px-5 pb-4">
        <button
          type="button"
          onClick={copyAll}
          className="w-full py-2 text-xs font-semibold transition-all duration-200 rounded-lg"
          style={{
            fontFamily: "'Nunito', system-ui, sans-serif",
            background: copied === "all" ? "var(--red-accent)" : "rgba(255,60,60,0.12)",
            color: copied === "all" ? "#fff" : "var(--red-accent)",
            border: "1px solid var(--red-accent)",
            cursor: "pointer",
            letterSpacing: "0.05em",
          }}
        >
          {copied === "all" ? "✓ Copied!" : "Copy All Details"}
        </button>
      </div>
    </div>
  );
}

function CopyRow({
  label,
  value,
  onCopy,
  copied,
  highlight,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <span
        className="text-xs shrink-0 w-20"
        style={{
          fontFamily: "'Nunito', system-ui, sans-serif",
          fontWeight: 700,
          color: "rgba(255,255,255,0.45)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          fontSize: "0.65rem",
        }}
      >
        {label}
      </span>
      <span
        className="flex-1 text-sm font-mono break-all"
        style={{
          color: highlight ? "var(--red-accent)" : "#fff",
          textShadow: highlight ? "0 0 10px var(--red-glow-strong)" : "none",
          fontWeight: highlight ? 700 : 400,
        }}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={onCopy}
        className="shrink-0 px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-150"
        style={{
          fontFamily: "'Nunito', system-ui, sans-serif",
          background: copied ? "var(--red-accent)" : "rgba(255,60,60,0.15)",
          color: copied ? "#fff" : "var(--red-accent)",
          border: "1px solid rgba(255,60,60,0.3)",
          cursor: "pointer",
          minWidth: "52px",
        }}
      >
        {copied ? "✓" : "Copy"}
      </button>
    </div>
  );
}
