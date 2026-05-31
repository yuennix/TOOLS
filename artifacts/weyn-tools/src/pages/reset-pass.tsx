import { useState } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const FIELDS = [
  {
    name: "resetLink" as const,
    label: "RESET LINK",
    hint: "FROM RECOVERY EMAIL",
    placeholder: "https://www.instagram.com/accounts/password/reset/?uidb36=...&token=...",
    required: true,
  },
  {
    name: "chatId" as const,
    label: "TELEGRAM CHAT ID",
    hint: "DESTINATION",
    placeholder: "-1001234567890",
    required: true,
  },
  {
    name: "botToken" as const,
    label: "TELEGRAM BOT TOKEN",
    hint: "REQUIRED",
    placeholder: "1234567890:AAF...",
    required: true,
  },
  {
    name: "customPassword" as const,
    label: "CUSTOM PASSWORD",
    hint: "OPTIONAL — LEAVE BLANK FOR AUTO",
    placeholder: "Leave empty to auto-generate",
    required: false,
  },
] as const;

export default function ResetPass() {
  const { toast } = useToast();
  const [form, setForm] = useState({
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
      setResult(data);
      if (data.success) {
        toast({ title: "Success", description: `Password reset for @${data.username}` });
      } else {
        toast({ title: "Failed", description: data.error ?? "Unknown error", variant: "destructive" });
      }
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
        <h1 className="font-mono text-sm tracking-widest animate-red-pulse">
          RESET PASS
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
          &gt; RESET INSTAGRAM PASSWORD VIA RECOVERY LINK
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {FIELDS.map((field) => (
            <FormField
              key={field.name}
              field={field}
              value={form[field.name]}
              onChange={handleChange}
            />
          ))}

          <SubmitButton loading={loading} />
        </form>
      </div>

      {/* Result */}
      {result && (
        <div
          className="p-6 space-y-3 animate-fade-in-up"
          style={{
            border: result.success ? "1px solid #ff000088" : "1px solid #ff000044",
            background: result.success ? "#ff000009" : "#0d0000",
            boxShadow: result.success ? "0 0 20px #ff000033" : "none",
          }}
          data-testid="result-panel"
        >
          <p className="text-xs mb-3" style={{ color: "#ff000077" }}>
            &gt; RESULT:
          </p>
          {result.success ? (
            <div className="space-y-2">
              <p className="text-xs tracking-widest" style={{ color: "#44ff44" }}>
                ✓ PASSWORD RESET SUCCESSFUL
              </p>
              <div className="mt-3 p-4 space-y-2" style={{ border: "1px solid #ff000033", background: "#050505" }}>
                <ResultRow label="USERNAME" value={`@${result.username}`} />
                <ResultRow label="PASSWORD" value={result.password ?? ""} highlight />
              </div>
              <p className="text-xs mt-2" style={{ color: "#444" }}>
                SENT TO TELEGRAM ✓
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-xs tracking-widest" style={{ color: "#ff4444" }}>
                ✗ OPERATION FAILED
              </p>
              <p className="text-xs font-mono mt-2" style={{ color: "#ff000077" }}>
                {result.error}
              </p>
            </div>
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
    <div className="space-y-1">
      <div className="flex items-baseline gap-2">
        <label className="text-xs tracking-widest" style={{ color: "#ffffff88" }}>
          {field.label}
        </label>
        <span className="text-xs" style={{ color: "#ff000044" }}>
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
        className="w-full font-mono text-sm p-3 transition-all duration-200"
        style={{
          border: focused ? "1px solid #ff000099" : "1px solid #ff000033",
          background: "#050505",
          color: "#ffffff",
          boxShadow: focused ? "0 0 12px #ff000033, inset 0 0 8px #ff000011" : "none",
        }}
      />
    </div>
  );
}

function SubmitButton({ loading }: { loading: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      data-testid="button-submit"
      type="submit"
      disabled={loading}
      className="w-full font-mono text-sm tracking-widest transition-all duration-200 p-4 mt-2"
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
      ) : (
        "RESET PASSWORD"
      )}
    </button>
  );
}

function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-xs w-24 shrink-0" style={{ color: "#555" }}>
        {label}
      </span>
      <span
        className="text-sm font-mono"
        style={{
          color: highlight ? "#ff0000" : "#ffffff",
          textShadow: highlight ? "0 0 8px #ff000066" : "none",
        }}
      >
        {value}
      </span>
    </div>
  );
}
