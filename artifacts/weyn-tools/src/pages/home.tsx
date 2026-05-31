import { Link } from "wouter";
import { useEffect, useState } from "react";

const ASCII = `
 ██╗    ██╗███████╗██╗   ██╗███╗   ██╗
 ██║    ██║██╔════╝╚██╗ ██╔╝████╗  ██║
 ██║ █╗ ██║█████╗   ╚████╔╝ ██╔██╗ ██║
 ██║███╗██║██╔══╝    ╚██╔╝  ██║╚██╗██║
 ╚███╔███╔╝███████╗   ██║   ██║ ╚████║
  ╚══╝╚══╝ ╚══════╝   ╚═╝   ╚═╝  ╚═══╝`;

export default function Home() {
  const [visible, setVisible] = useState(false);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d.length >= 3 ? "" : d + ".")), 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 gap-10 relative"
      style={{ background: "#050505" }}
    >
      <div className="scanline-overlay" />

      {/* Logo */}
      <div
        className={`flex flex-col items-center gap-2 transition-opacity duration-500 ${visible ? "opacity-100" : "opacity-0"}`}
      >
        <pre
          className="text-xs leading-tight select-none animate-glitch animate-flicker"
          style={{
            color: "#ff0000",
            textShadow: "0 0 8px #ff0000, 0 0 20px #ff000066, 0 0 40px #ff000033",
            fontFamily: "'Share Tech Mono', monospace",
          }}
        >
          {ASCII}
        </pre>

        <div
          className="text-xs tracking-widest mt-1"
          style={{ color: "#ffffff99", letterSpacing: "0.35em" }}
        >
          INSTAGRAM RECOVERY TOOLS
          <span
            className="animate-blink ml-1"
            style={{ color: "#ff0000" }}
          >
            _
          </span>
        </div>
      </div>

      {/* System status */}
      <div
        className="w-full max-w-md text-xs space-y-1 animate-fade-in-up"
        style={{ animationDelay: "0.1s", opacity: 0, animationFillMode: "forwards" }}
      >
        {[
          { label: "SYS", value: "ONLINE", ok: true },
          { label: "MODULE", value: "LOADED", ok: true },
          { label: "STATUS", value: "READY" + dots, ok: true },
        ].map((row) => (
          <div key={row.label} className="flex gap-3" style={{ color: "#555" }}>
            <span style={{ color: "#ff000088" }}>[{row.label}]</span>
            <span style={{ color: row.ok ? "#44ff44" : "#ff4444" }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* Tool cards */}
      <div
        className="w-full max-w-md space-y-3 animate-fade-in-up"
        style={{ animationDelay: "0.2s", opacity: 0, animationFillMode: "forwards" }}
      >
        <p className="text-xs mb-2" style={{ color: "#ff000099" }}>
          &gt; SELECT MODULE:
        </p>

        <ToolCard
          href="/reset-link"
          testId="link-reset-link"
          index="01"
          title="RESET LINK"
          desc="Send Instagram account recovery emails to target"
          delay="0.25s"
        />
        <ToolCard
          href="/reset-pass"
          testId="link-reset-pass"
          index="02"
          title="RESET PASS"
          desc="Reset Instagram password via recovery link"
          delay="0.32s"
        />
      </div>

      {/* Footer */}
      <div
        className="text-xs animate-fade-in-up"
        style={{
          color: "#333",
          animationDelay: "0.4s",
          opacity: 0,
          animationFillMode: "forwards",
          letterSpacing: "0.2em",
        }}
      >
        BY{" "}
        <span style={{ color: "#ff000066" }}>@jinbelowg</span>
        {" "}— USE AT YOUR OWN RISK
      </div>
    </div>
  );
}

function ToolCard({
  href, testId, index, title, desc, delay,
}: {
  href: string;
  testId: string;
  index: string;
  title: string;
  desc: string;
  delay: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={href}
      data-testid={testId}
      className="block p-5 cursor-pointer transition-all duration-200 animate-fade-in-up"
      style={{
        border: hovered ? "1px solid #ff0000" : "1px solid #ff000044",
        background: hovered ? "#ff000011" : "#0a0a0a",
        boxShadow: hovered
          ? "0 0 24px #ff000055, inset 0 0 16px #ff000011"
          : "0 0 6px #ff000022",
        animationDelay: delay,
        opacity: 0,
        animationFillMode: "forwards",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-3 mb-1">
        <span
          className="text-xs"
          style={{ color: hovered ? "#ff000099" : "#ff000055" }}
        >
          [{index}]
        </span>
        <span
          className="font-mono text-sm tracking-widest"
          style={{
            color: hovered ? "#ff0000" : "#ffffff",
            textShadow: hovered ? "0 0 8px #ff000088" : "none",
          }}
        >
          {title}
        </span>
        <span
          className="ml-auto text-xs animate-blink"
          style={{ color: "#ff000066", opacity: hovered ? 1 : 0 }}
        >
          &gt;
        </span>
      </div>
      <p className="text-xs ml-9" style={{ color: "#555" }}>
        {desc}
      </p>
    </Link>
  );
}
