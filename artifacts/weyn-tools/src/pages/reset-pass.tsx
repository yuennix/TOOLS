import { useState } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const FIELDS = [
  {
    name: "resetLink" as const,
    label: "Reset Link",
    hint: "From recovery email",
    placeholder: "https://www.instagram.com/accounts/password/reset/?uidb36=...&token=...",
    required: true,
  },
  {
    name: "chatId" as const,
    label: "Telegram Chat ID",
    hint: "Destination",
    placeholder: "-1001234567890",
    required: true,
  },
  {
    name: "botToken" as const,
    label: "Telegram Bot Token",
    hint: "Required",
    placeholder: "1234567890:AAF...",
    required: true,
  },
  {
    name: "customPassword" as const,
    label: "Custom Password",
    hint: "Optional — leave blank to auto-generate",
    placeholder: "Leave empty for random password",
    required: false,
  },
] as const;

type FormState = { resetLink: string; chatId: string; botToken: string; customPassword: string };

export default function ResetPass() {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>({
    resetLink: "",
    chatId: "",
    botToken: "",
    customPassword: "",
  });
  const [result, setResult] = useState<{
    success: boolean;
    username?: string | null;
    password?: string | null;
    error?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.resetLink || !form.chatId || !form.botToken) {
      toast({ title: "Error", description: "Fill all required fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/reset-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetLink: form.resetLink,
          chatId: form.chatId,
          botToken: form.botToken,
          customPassword: form.customPassword || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ success: false, error: data.error ?? `Server error ${res.status}` });
        toast({ title: "Failed", description: data.error ?? `Server error ${res.status}`, variant: "destructive" });
        return;
      }
      setResult(data);
      if (data.success) {
        toast({ title: "Success", description: `Password reset for @${data.username}` });
      } else {
        toast({ title: "Failed", description: data.error ?? "Unknown error", variant: "destructive" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: "Error", description: msg, variant: "destructive" });
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
          Reset an Instagram password using a valid recovery link.
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
          {FIELDS.map((field) => (
            <FormField
              key={field.name}
              field={field}
              value={form[field.name]}
              onChange={handleChange}
            />
          ))}

          <div className="pt-1">
            <ActionButton loading={loading} />
          </div>
        </form>
      </div>

      {/* Result */}
      {result && (
        <div
          className="p-6 animate-fade-up"
          style={{
            border: result.success
              ? "1px solid var(--red-accent)"
              : "1px solid var(--line)",
            borderRadius: "8px",
            background: "var(--surface)",
            boxShadow: result.success ? "0 0 0 1px var(--red-glow), 0 4px 20px var(--red-glow)" : "none",
          }}
          data-testid="result-panel"
        >
          <div className="flex items-center gap-2 mb-4">
            <span
              className="w-6 h-6 flex items-center justify-center text-xs font-bold rounded-full"
              style={{
                background: result.success ? "var(--red-accent)" : "var(--line)",
                color: result.success ? "#fff" : "var(--text-muted)",
              }}
            >
              {result.success ? "✓" : "✗"}
            </span>
            <span
              className="text-sm font-semibold"
              style={{ color: result.success ? "var(--text-primary)" : "var(--text-secondary)" }}
            >
              {result.success ? "Password Reset Successful" : "Operation Failed"}
            </span>
          </div>

          {result.success ? (
            <div
              className="space-y-3 p-4"
              style={{
                background: "var(--surface-2)",
                borderRadius: "6px",
                border: "1px solid var(--line)",
              }}
            >
              <ResultRow label="Username" value={`@${result.username}`} />
              <div style={{ borderTop: "1px solid var(--line)", paddingTop: "12px" }}>
                <ResultRow label="New Password" value={result.password ?? ""} highlight />
              </div>
              <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                ✓ Sent to Telegram
              </p>
            </div>
          ) : (
            <p
              className="text-sm font-mono p-3"
              style={{
                color: "var(--text-secondary)",
                background: "var(--surface-2)",
                borderRadius: "4px",
                border: "1px solid var(--line)",
              }}
            >
              {result.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function FormField({
  field,
  value,
  onChange,
}: {
  field: (typeof FIELDS)[number];
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {field.label}
          {field.required && (
            <span className="ml-1" style={{ color: "var(--red-accent)" }}>*</span>
          )}
        </label>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {field.hint}
        </span>
      </div>
      <input
        data-testid={`input-${field.name}`}
        type="text"
        name={field.name}
        value={value}
        onChange={onChange}
        placeholder={field.placeholder}
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

function ActionButton({ loading }: { loading: boolean }) {
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
            className="inline-block w-3 h-3 border-2 rounded-full animate-spin"
            style={{ borderColor: "var(--red-accent)", borderTopColor: "transparent" }}
          />
          Processing...
        </span>
      ) : (
        "Reset Password"
      )}
    </button>
  );
}

function ResultRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-xs w-28 shrink-0" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <span
        className="text-sm font-mono"
        style={{
          color: highlight ? "var(--red-accent)" : "var(--text-primary)",
          textShadow: highlight ? "0 0 8px var(--red-glow-strong)" : "none",
        }}
      >
        {value}
      </span>
    </div>
  );
}
