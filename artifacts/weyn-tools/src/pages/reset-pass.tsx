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
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (chatId) localStorage.setItem("weyn-chat-id", chatId);
  }, [chatId]);

  useEffect(() => {
    if (botToken) localStorage.setItem("weyn-bot-token", botToken);
  }, [botToken]);

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
        <Link href="/" style={{ color: "var(--text-muted)" }} className="hover:text-foreground transition-colors">
          Home
        </Link>
        <span style={{ color: "var(--text-muted)" }}>/</span>
        <span style={{ color: "var(--red-accent)" }}>Reset Pass</span>
      </nav>

      {/* Page header */}
      <div className="space-y-1 animate-fade-up">
        <p className="text-xs font-mono tracking-widest" style={{ color: "var(--red-accent)" }}>MODULE 02</p>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>Reset Pass</h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Reset Instagram passwords using valid recovery links.
        </p>
      </div>

      {/* Form card */}
      <div
        className="p-6 space-y-5 animate-fade-up"
        style={{ border: "1px solid var(--line)", borderRadius: "8px", background: "var(--surface)", animationDelay: "60ms" }}
      >
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Reset Links */}
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Reset Links
              <span className="ml-1" style={{ color: "var(--red-accent)" }}>*</span>
              <span className="ml-2 text-xs font-mono" style={{ color: "var(--text-muted)" }}>one per line</span>
            </label>
            <textarea
              className="w-full h-36 p-3 text-sm font-mono resize-none transition-all duration-200"
              style={{ border: "1px solid var(--line)", borderRadius: "6px", background: "var(--surface-2)", color: "var(--text-primary)" }}
              placeholder={"https://www.instagram.com/accounts/password/reset/?uidb36=...&token=..."}
              value={resetLinksText}
              onChange={(e) => setResetLinksText(e.target.value)}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--red-accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--red-glow)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.boxShadow = "none"; }}
            />
          </div>

          {/* Telegram Chat ID */}
          <SavedField
            label="Telegram Chat ID"
            placeholder="-1001234567890"
            value={chatId}
            onChange={(v) => setChatId(v)}
            storageKey="weyn-chat-id"
          />

          {/* Telegram Bot Token */}
          <SavedField
            label="Telegram Bot Token"
            placeholder="1234567890:AAF..."
            value={botToken}
            onChange={(v) => setBotToken(v)}
            storageKey="weyn-bot-token"
          />

          {/* Custom Password */}
          <div className="space-y-1.5">
            <div className="flex items-baseline gap-2">
              <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Custom Password</label>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Optional — leave blank to auto-generate</span>
            </div>
            <input
              type="text"
              value={customPassword}
              onChange={(e) => setCustomPassword(e.target.value)}
              placeholder="Leave empty for random password"
              className="w-full px-3 py-2.5 text-sm font-mono transition-all duration-200"
              style={{ border: "1px solid var(--line)", borderRadius: "6px", background: "var(--surface-2)", color: "var(--text-primary)" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--red-accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--red-glow)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.boxShadow = "none"; }}
            />
          </div>

          <div className="pt-1">
            <ActionButton loading={loading} count={resetLinksText.split("\n").filter((l) => l.trim()).length} />
          </div>
        </form>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3 animate-fade-up">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Results</p>
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

function SavedField({
  label,
  placeholder,
  value,
  onChange,
  storageKey,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  storageKey: string;
}) {
  const [focused, setFocused] = useState(false);
  const isSaved = !!localStorage.getItem(storageKey);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {label} <span style={{ color: "var(--red-accent)" }}>*</span>
        </label>
        {isSaved && value && (
          <span
            className="text-xs font-mono px-2 py-0.5 rounded-full"
            style={{ background: "rgba(255,60,60,0.1)", color: "var(--red-accent)", border: "1px solid rgba(255,60,60,0.2)" }}
          >
            ✓ saved
          </span>
        )}
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
          <span className="inline-block w-3 h-3 border-2 rounded-full animate-spin"
            style={{ borderColor: "var(--red-accent)", borderTopColor: "transparent" }} />
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
          style={{ background: result.success ? "var(--red-accent)" : "var(--line)", color: result.success ? "#fff" : "var(--text-muted)" }}
        >
          {result.success ? "✓" : "✗"}
        </span>
        <span className="text-xs font-mono flex-1 truncate" style={{ color: "var(--text-secondary)" }}>
          {result.success && result.username ? `@${result.username}` : shortLink}
        </span>
        <span className="text-xs font-mono shrink-0" style={{ color: result.success ? "var(--red-accent)" : "var(--text-muted)" }}>
          {result.success ? "DONE" : "FAILED"}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ color: "var(--text-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4" style={{ borderTop: "1px solid var(--line)" }}>
          {result.success ? (
            <BotMessageCard username={result.username ?? ""} password={result.password ?? ""} />
          ) : (
            <pre className="mt-3 text-xs font-mono p-3 whitespace-pre-wrap break-all"
              style={{ background: "var(--surface-2)", color: "var(--text-secondary)", borderRadius: "6px", border: "1px solid var(--line)" }}>
              {result.error}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function BotMessageCard({ username, password }: { username: string; password: string }) {
  const [copied, setCopied] = useState(false);

  const messageText =
    `Hola! Your Password has been changed! 🎉\n\nUsername: @${username}\nPassword: ${password}\n\n— WEYN Tools by @jinbelowg`;

  function copyAll() {
    navigator.clipboard.writeText(messageText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mt-3 space-y-2">
      {/* Label */}
      <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
        📨 Message sent to Telegram:
      </p>

      {/* Telegram bubble */}
      <div
        className="rounded-2xl rounded-tl-sm px-4 py-3 relative"
        style={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #162d4a 100%)",
          border: "1px solid rgba(100,160,255,0.2)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
          maxWidth: "100%",
        }}
      >
        {/* Telegram-style dot indicator */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
            style={{ background: "rgba(100,160,255,0.2)", fontSize: "10px" }}>
            🤖
          </div>
          <span className="text-xs font-semibold" style={{ color: "rgba(100,180,255,0.9)", fontFamily: "'Nunito', system-ui, sans-serif" }}>
            WEYN Bot
          </span>
        </div>

        {/* Message lines */}
        <div className="space-y-1" style={{ fontFamily: "'Nunito', system-ui, sans-serif" }}>
          <p className="font-extrabold text-sm" style={{ color: "#fff", lineHeight: 1.4 }}>
            Hola! Your Password has been changed! 🎉
          </p>
          <div className="pt-1 space-y-0.5">
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
              <span style={{ color: "rgba(100,180,255,0.8)", fontWeight: 700 }}>Username:</span>{" "}
              <span className="font-mono font-bold" style={{ color: "#fff" }}>@{username}</span>
            </p>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
              <span style={{ color: "rgba(100,180,255,0.8)", fontWeight: 700 }}>Password:</span>{" "}
              <span className="font-mono font-bold" style={{ color: "#7dd3fc" }}>{password}</span>
            </p>
          </div>
          <p className="text-xs pt-1" style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>
            — WEYN Tools by @jinbelowg
          </p>
        </div>

        {/* Time-style stamp like Telegram */}
        <div className="flex justify-end mt-1">
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)", fontSize: "10px" }}>
            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ✓✓
          </span>
        </div>
      </div>

      {/* Copy button */}
      <button
        type="button"
        onClick={copyAll}
        className="w-full py-2 text-xs font-semibold rounded-lg transition-all duration-150"
        style={{
          fontFamily: "'Nunito', system-ui, sans-serif",
          background: copied ? "var(--red-accent)" : "rgba(255,60,60,0.1)",
          color: copied ? "#fff" : "var(--red-accent)",
          border: "1px solid var(--red-accent)",
          cursor: "pointer",
          letterSpacing: "0.04em",
        }}
      >
        {copied ? "✓ Copied to clipboard!" : "Copy Message"}
      </button>
    </div>
  );
}
