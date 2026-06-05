import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/hooks/use-theme";

function useSessionCountdown() {
  const [display, setDisplay] = useState<string | null>(null);
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    function tick() {
      const expiry = localStorage.getItem("weyn-key-expiry");
      if (!expiry) { setDisplay(null); return; }
      const ms = new Date(expiry).getTime() - Date.now();
      if (ms <= 0) { setDisplay(null); return; }
      const totalSec = Math.floor(ms / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      setUrgent(ms < 5 * 60 * 1000);
      if (h > 0) {
        setDisplay(`${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`);
      } else {
        setDisplay(`${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`);
      }
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return { display, urgent };
}

export default function Navbar() {
  const { theme, toggle } = useTheme();
  const [location] = useLocation();
  const isAdmin = location === "/admin";
  const isAccess = location === "/access";
  const isProtected = !isAdmin && !isAccess;
  const { display: countdown, urgent } = useSessionCountdown();

  return (
    <header
      className="sticky top-0 z-50 border-b transition-colors duration-300"
      style={{
        background: "var(--surface)",
        borderColor: "var(--line)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href={localStorage.getItem("weyn-access") === "1" ? "/" : "/access"} className="flex items-center gap-2">
          <span
            className="font-mono text-base font-bold tracking-widest animate-red-breathe select-none"
            style={{ letterSpacing: "0.22em" }}
          >
            WEYN
          </span>
          <span className="font-mono text-xs tracking-widest" style={{ color: "var(--text-muted)" }}>
            / TOOLS
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">

          {/* Session countdown — only on protected pages when expiry is set */}
          {isProtected && countdown && (
            <span
              className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 transition-colors duration-300"
              style={{
                border: `1px solid ${urgent ? "#ef444466" : "var(--line)"}`,
                borderRadius: "5px",
                color: urgent ? "#ef4444" : "var(--text-muted)",
                background: urgent ? "#ef444411" : "transparent",
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              {countdown}
            </span>
          )}

          {!isAccess && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs font-mono" style={{ color: "var(--text-muted)" }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full animate-blink" style={{ background: "#22c55e" }} />
              ONLINE
            </span>
          )}

          {!isAdmin && !isAccess && (
            <Link
              href="/admin"
              className="text-xs font-mono px-3 py-1.5 border transition-all duration-150"
              style={{ border: "1px solid var(--line)", color: "var(--text-muted)", borderRadius: "4px" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--red-accent)";
                e.currentTarget.style.color = "var(--red-accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--line)";
                e.currentTarget.style.color = "var(--text-muted)";
              }}
            >
              ADMIN
            </Link>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono transition-all duration-200 border"
            style={{ border: "1px solid var(--line)", color: "var(--text-secondary)", background: "transparent", borderRadius: "4px" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--red-accent)";
              e.currentTarget.style.color = "var(--red-accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--line)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            {theme === "dark" ? (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
                LIGHT
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
                DARK
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
