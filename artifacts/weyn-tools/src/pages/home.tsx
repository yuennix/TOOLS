import { Link } from "wouter";
import { useState, useEffect } from "react";

const TOOLS = [
  {
    id: "01",
    href: "/reset-link",
    testId: "link-reset-link",
    title: "Reset Link",
    subtitle: "SEND RECOVERY EMAIL",
    desc: "Trigger an Instagram account recovery email to any target address.",
    tag: "SMTP",
  },
  {
    id: "02",
    href: "/reset-pass",
    testId: "link-reset-pass",
    title: "Reset Pass",
    subtitle: "PASSWORD OVERRIDE",
    desc: "Reset an Instagram password directly using a recovery link.",
    tag: "API",
  },
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-12">

      {/* Hero */}
      <section
        className="text-center space-y-4"
        style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.5s ease" }}
      >
        <p className="text-xs font-mono tracking-[0.3em] uppercase" style={{ color: "var(--text-muted)" }}>
          Instagram Recovery Suite
        </p>
        <h1
          className="font-mono text-4xl sm:text-5xl font-bold tracking-widest animate-red-breathe"
          style={{ letterSpacing: "0.18em" }}
        >
          WEYN
        </h1>
        <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--text-secondary)" }}>
          Professional toolset for Instagram account recovery operations.
        </p>

        {/* Status bar */}
        <div
          className="inline-flex items-center gap-5 px-5 py-2.5 border text-xs font-mono mx-auto"
          style={{ border: "1px solid var(--line)", background: "var(--surface-2)", borderRadius: "4px" }}
        >
          {[
            { label: "STATUS", val: "ONLINE", color: "#22c55e" },
            { label: "TOOLS", val: "02", color: "var(--red-accent)" },
            { label: "ENGINE", val: "PYTHON", color: "var(--text-secondary)" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span style={{ color: "var(--text-muted)" }}>{s.label}</span>
              <span style={{ color: s.color, fontWeight: 600 }}>{s.val}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="h-px" style={{ background: "linear-gradient(90deg, transparent, var(--line) 30%, var(--line) 70%, transparent)" }} />

      {/* Tool cards — compact */}
      <section className="space-y-3">
        <p className="text-xs font-mono tracking-widest" style={{ color: "var(--text-muted)" }}>
          SELECT MODULE
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {TOOLS.map((tool, i) => (
            <ToolCard key={tool.id} tool={tool} delay={i * 80} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <div className="text-center text-xs font-mono" style={{ color: "var(--text-muted)" }}>
        BY <span style={{ color: "var(--red-accent)" }}>@jinbelowg</span>
        <span className="mx-2" style={{ color: "var(--line)" }}>·</span>
        USE RESPONSIBLY
      </div>
    </div>
  );
}

function ToolCard({ tool, delay }: { tool: (typeof TOOLS)[number]; delay: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={tool.href}
      data-testid={tool.testId}
      className="block transition-all duration-200 animate-fade-up"
      style={{
        animationDelay: `${delay}ms`,
        border: hovered ? "1px solid var(--red-accent)" : "1px solid var(--line)",
        background: hovered ? "var(--surface-2)" : "var(--surface)",
        borderRadius: "6px",
        padding: "14px 16px",
        boxShadow: hovered ? "0 0 0 1px var(--red-glow), 0 2px 16px var(--red-glow)" : "none",
        cursor: "pointer",
        textDecoration: "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 flex items-center justify-center font-mono text-xs border"
            style={{
              border: `1px solid ${hovered ? "var(--red-accent)" : "var(--line)"}`,
              color: hovered ? "var(--red-accent)" : "var(--text-muted)",
              borderRadius: "3px",
              transition: "all 0.2s",
            }}
          >
            {tool.id}
          </span>
          <span className="text-xs font-mono tracking-wider" style={{ color: hovered ? "var(--red-accent)" : "var(--text-muted)", transition: "color 0.2s" }}>
            {tool.subtitle}
          </span>
        </div>
        <span
          className="text-xs font-mono px-1.5 py-0.5"
          style={{ border: "1px solid var(--line)", color: "var(--text-muted)", borderRadius: "3px", background: "var(--surface-2)" }}
        >
          {tool.tag}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{tool.title}</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)", lineHeight: "1.4" }}>{tool.desc}</p>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ color: hovered ? "var(--red-accent)" : "var(--line)", flexShrink: 0, marginLeft: "12px", transform: hovered ? "translateX(2px)" : "none", transition: "all 0.2s" }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </Link>
  );
}
