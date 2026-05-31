import { Link } from "wouter";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-8">
      <pre className="text-primary text-xs leading-tight select-none">
{`
 ██╗    ██╗███████╗██╗   ██╗███╗   ██╗
 ██║    ██║██╔════╝╚██╗ ██╔╝████╗  ██║
 ██║ █╗ ██║█████╗   ╚████╔╝ ██╔██╗ ██║
 ██║███╗██║██╔══╝    ╚██╔╝  ██║╚██╗██║
 ╚███╔███╔╝███████╗   ██║   ██║ ╚████║
  ╚══╝╚══╝ ╚══════╝   ╚═╝   ╚═╝  ╚═══╝
      INSTAGRAM TOOLS v1.0
`}
      </pre>

      <div className="border border-border p-6 w-full max-w-md space-y-1">
        <p className="text-muted-foreground text-sm mb-4">&gt; SELECT TOOL:</p>
        <Link
          href="/reset-link"
          data-testid="link-reset-link"
          className="block border border-border p-4 hover:bg-accent transition-colors cursor-pointer"
        >
          <p className="text-primary font-mono">[01] RESET LINK</p>
          <p className="text-muted-foreground text-xs mt-1">Send Instagram recovery emails to target accounts</p>
        </Link>
        <Link
          href="/reset-pass"
          data-testid="link-reset-pass"
          className="block border border-border p-4 hover:bg-accent transition-colors cursor-pointer"
        >
          <p className="text-primary font-mono">[02] RESET PASS</p>
          <p className="text-muted-foreground text-xs mt-1">Reset Instagram password via recovery link</p>
        </Link>
      </div>

      <p className="text-muted-foreground text-xs">BY: @jinbelowg</p>
    </div>
  );
}
