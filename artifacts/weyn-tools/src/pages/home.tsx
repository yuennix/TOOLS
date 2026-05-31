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

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-6 py-16 space-y-16">

      {/* Hero */}
      <section
        className="text-center space-y-6"
        style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.5s ease" }}
      >
        <div className="space-y-3">
          <p
            className="text-xs font-mono tracking-[0.3em] uppercase"
            style={{ color: "var(--text-muted)" }}
          >
            Instagram Recovery Suite
          </p>
          <h1
            className="font-mono text-5xl sm:text-6xl font-bold tracking-widest animate-red-breathe"
            style={{ letterSpacing: "0.18em" }}
          >
            WEYN
          </h1>
          <p
            className="text-sm max-w-md mx-auto"
            style={{ color: "var(--text-secondary)" }}
          >
            Professional toolset for Instagram account recovery operations.
            Built for speed and reliability.
          </p>
        </div>

        {/* Stats bar */}
        <div
          className="inline-flex items-center gap-6 px-6 py-3 border text-xs font-mono"
          style={{
            border: "1px solid var(--line)",
            background: "var(--surface-2)",
            borderRadius: "4px",
          }}
        >
          {[
            { label: "STATUS", val: "ONLINE", color: "#22c55e" },
            { label: "TOOLS", val: "02", color: "var(--red-accent)" },
            { label: "ENGINE", val: "PYTHON", color: "var(--text-secondary)" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span style={{ color: "var(--text-muted)" }}>{s.label}</span>
              <span style={{ color: s.color, fontWeight: 600 }}>{s.val}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div
        className="h-px w-full"
        style={{ background: "linear-gradient(90deg, transparent, var(--line) 30%, var(--line) 70%, transparent)" }}
      />

      {/* Tool cards */}
      <section className="space-y-4">
        <p
          className="text-xs font-mono tracking-widest"
          style={{ color: "var(--text-muted)" }}
        >
          SELECT MODULE
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {TOOLS.map((tool, i) => (
            <ToolCard key={tool.id} tool={tool} delay={i * 80} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <div
        className="text-center text-xs font-mono"
        style={{ color: "var(--text-muted)" }}
      >
        <span>BY </span>
        <span style={{ color: "var(--red-accent)" }}>@jinbelowg</span>
        <span className="mx-3" style={{ color: "var(--line)" }}>·</span>
        <span>USE RESPONSIBLY</span>
      </div>
    </div>
  );
}

function ToolCard({
  tool,
  delay,
}: {
  tool: (typeof TOOLS)[number];
  delay: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={tool.href}
      data-testid={tool.testId}
      className="block group transition-all duration-200 animate-fade-up"
      style={{
        animationDelay: `${delay}ms`,
        border: hovered ? "1px solid var(--red-accent)" : "1px solid var(--line)",
        background: hovered ? "var(--surface-2)" : "var(--surface)",
        borderRadius: "6px",
        padding: "24px",
        boxShadow: hovered
          ? "0 0 0 1px var(--red-glow), 0 4px 20px var(--red-glow)"
          : "0 1px 4px rgba(0,0,0,0.06)",
        cursor: "pointer",
        textDecoration: "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-8 h-8 flex items-center justify-center font-mono text-xs font-bold border"
          style={{
            border: `1px solid ${hovered ? "var(--red-accent)" : "var(--line)"}`,
            color: hovered ? "var(--red-accent)" : "var(--text-muted)",
            background: hovered ? "var(--red-glow)" : "transparent",
            borderRadius: "4px",
            transition: "all 0.2s",
          }}
        >
          {tool.id}
        </div>
        <span
          className="text-xs font-mono px-2 py-0.5 border"
          style={{
            border: "1px solid var(--line)",
            color: "var(--text-muted)",
            borderRadius: "3px",
            background: "var(--surface-2)",
          }}
        >
          {tool.tag}
        </span>
      </div>

      {/* Content */}
      <div className="space-y-1 mb-4">
        <p
          className="text-xs font-mono tracking-widest"
          style={{ color: hovered ? "var(--red-accent)" : "var(--text-muted)", transition: "color 0.2s" }}
        >
          {tool.subtitle}
        </p>
        <h3
          className="text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {tool.title}
        </h3>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {tool.desc}
        </p>
      </div>

      {/* CTA */}
      <div
        className="flex items-center gap-1 text-xs font-mono"
        style={{
          color: hovered ? "var(--red-accent)" : "var(--text-muted)",
          transition: "color 0.2s",
        }}
      >
        RUN MODULE
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{ transform: hovered ? "translateX(3px)" : "none", transition: "transform 0.2s" }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </Link>
  );
}
