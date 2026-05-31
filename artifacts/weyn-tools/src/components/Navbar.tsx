import { Link } from "wouter";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";

export default function Navbar() {
  const { theme, toggle } = useTheme();
  const { session, logout } = useAuth();

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
        <Link href={session ? "/" : "/access"} className="flex items-center gap-2 group">
          <span
            className="font-mono text-base font-bold tracking-widest animate-red-breathe select-none"
            style={{ letterSpacing: "0.22em" }}
          >
            WEYN
          </span>
          <span
            className="font-mono text-xs tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            / TOOLS
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <span
            className="hidden sm:flex items-center gap-1.5 text-xs font-mono"
            style={{ color: "var(--text-muted)" }}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full animate-blink"
              style={{ background: "#22c55e" }}
            />
            ONLINE
          </span>

          {session && (
            <span className="hidden sm:block text-xs font-mono" style={{ color: "var(--text-muted)" }}>
              {session.name}
            </span>
          )}

          {session && (
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono transition-all duration-200 border rounded"
              style={{ border: "1px solid var(--line)", color: "var(--text-secondary)", background: "transparent" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--red-accent)"; e.currentTarget.style.color = "var(--red-accent)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            >
              LOGOUT
            </button>
          )}

          <button
            onClick={toggle}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono transition-all duration-200 border rounded"
            style={{
              border: "1px solid var(--line)",
              color: "var(--text-secondary)",
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--red-accent)";
              e.currentTarget.style.color = "var(--red-accent)";
              e.currentTarget.style.boxShadow = "0 0 8px var(--red-glow)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--line)";
              e.currentTarget.style.color = "var(--text-secondary)";
              e.currentTarget.style.boxShadow = "none";
            }}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
                LIGHT
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
