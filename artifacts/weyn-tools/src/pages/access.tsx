import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

type Tab = "enter" | "generate";

export default function Access() {
  const [tab, setTab] = useState<Tab>("enter");
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2 animate-fade-up">
          <p className="text-xs font-mono tracking-widest" style={{ color: "var(--red-accent)" }}>
            ACCESS REQUIRED
          </p>
          <h1 className="text-3xl font-bold font-mono tracking-widest" style={{ color: "var(--text-primary)" }}>
            WEYN
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Enter your access key or generate a new one below.
          </p>
        </div>

        <div className="animate-fade-up text-center" style={{ animationDelay: "120ms" }}>
          <Link
            href="/admin"
            className="text-xs font-mono tracking-widest transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--red-accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            ADMIN PANEL →
          </Link>
        </div>

        <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
          <div
            className="flex border rounded overflow-hidden"
            style={{ borderColor: "var(--line)" }}
          >
            {(["enter", "generate"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-2.5 text-xs font-mono tracking-widest uppercase transition-all duration-200"
                style={{
                  background: tab === t ? "var(--red-accent)" : "transparent",
                  color: tab === t ? "#fff" : "var(--text-muted)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {t === "enter" ? "Enter Key" : "Generate Key"}
              </button>
            ))}
          </div>

          <div
            className="mt-4 p-6"
            style={{
              border: "1px solid var(--line)",
              borderRadius: "8px",
              background: "var(--surface)",
            }}
          >
            {tab === "enter" ? <EnterKeyForm /> : <GenerateKeyForm />}
          </div>
        </div>
      </div>
    </div>
  );
}

function EnterKeyForm() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = key.trim().toUpperCase();
    if (!trimmed) {
      toast({ title: "Error", description: "Enter your access key", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/keys/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: trimmed }),
      });
      const data = await res.json();
      if (data.valid) {
        login(data.name, trimmed);
        toast({ title: "Access granted", description: `Welcome, ${data.name}` });
        setTimeout(() => setLocation("/"), 500);
      } else {
        toast({ title: "Access denied", description: data.reason ?? "Invalid key", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Could not connect to server", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          Access Key
        </label>
        <input
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="WEYN-XXXX-XXXX-XXXX"
          className="w-full px-3 py-2.5 text-sm font-mono transition-all duration-200"
          style={{
            border: "1px solid var(--line)",
            borderRadius: "6px",
            background: "var(--surface-2)",
            color: "var(--text-primary)",
          }}
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
      <SubmitButton loading={loading} label="Validate Key" />
    </form>
  );
}

function GenerateKeyForm() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<{ key: string; name: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: "Error", description: "Enter your name", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/keys/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (data.key) {
        setGenerated({ key: data.key, name: data.name });
      } else {
        toast({ title: "Error", description: data.error ?? "Failed to generate key", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Could not connect to server", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  if (generated) {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Key generated for <span style={{ color: "var(--red-accent)" }}>{generated.name}</span>
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Save this key — you'll need it to access the tools once approved.
          </p>
        </div>
        <div
          className="p-4 rounded font-mono text-base tracking-widest text-center select-all"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--red-accent)",
            color: "var(--red-accent)",
            boxShadow: "0 0 12px var(--red-glow)",
            letterSpacing: "0.15em",
          }}
        >
          {generated.key}
        </div>
        <div
          className="flex items-start gap-2 p-3 rounded text-xs font-mono"
          style={{ background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--text-muted)" }}
        >
          <span style={{ color: "var(--red-accent)" }}>!</span>
          Your key is pending admin approval. Once approved, enter it in the "Enter Key" tab to access the tools. Each key works once only.
        </div>
        <button
          onClick={() => { setGenerated(null); setName(""); }}
          className="w-full py-2 text-xs font-mono transition-colors"
          style={{ color: "var(--text-muted)", background: "transparent", border: "none", cursor: "pointer" }}
        >
          Generate another key
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          Your Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          className="w-full px-3 py-2.5 text-sm transition-all duration-200"
          style={{
            border: "1px solid var(--line)",
            borderRadius: "6px",
            background: "var(--surface-2)",
            color: "var(--text-primary)",
          }}
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
      <SubmitButton loading={loading} label="Generate Key" />
    </form>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  const [hovered, setHovered] = useState(false);
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
