import { useState } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function ResetLink() {
  const { toast } = useToast();
  const [emailsText, setEmailsText] = useState("");
  const [results, setResults] = useState<Array<{ email: string; success: boolean; response: string }>>([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const emails = emailsText
      .split("\n")
      .map((e) => e.trim())
      .filter(Boolean);

    if (!emails.length) {
      toast({ title: "Error", description: "Enter at least one email", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const res = await fetch("/api/reset-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      const data = await res.json();
      setResults(data.results ?? []);
      toast({ title: "Done", description: `Processed ${data.results?.length ?? 0} email(s)` });
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/" data-testid="link-back" className="text-muted-foreground hover:text-primary text-sm">&lt; BACK</Link>
        <h1 className="text-primary font-mono text-lg">RESET LINK</h1>
      </div>

      <div className="border border-border p-6 space-y-4">
        <p className="text-muted-foreground text-xs">&gt; Send recovery emails to Instagram accounts</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-primary text-sm font-mono">TARGET EMAILS (one per line)</label>
            <textarea
              data-testid="input-emails"
              className="w-full h-32 bg-background border border-input text-foreground font-mono text-sm p-3 focus:outline-none focus:border-primary resize-none"
              placeholder="user@gmail.com&#10;another@gmail.com"
              value={emailsText}
              onChange={(e) => setEmailsText(e.target.value)}
            />
          </div>

          <button
            data-testid="button-submit"
            type="submit"
            disabled={loading}
            className="w-full border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors p-3 font-mono text-sm disabled:opacity-50"
          >
            {loading ? "PROCESSING..." : "SEND RECOVERY EMAILS"}
          </button>
        </form>
      </div>

      {results.length > 0 && (
        <div className="border border-border p-6 space-y-2">
          <p className="text-muted-foreground text-xs mb-3">&gt; RESULTS:</p>
          {results.map((r, i) => (
            <div key={i} data-testid={`result-item-${i}`} className="border border-border p-3 space-y-1">
              <p className="text-primary font-mono text-sm">{r.email}</p>
              <p className={`text-xs font-mono ${r.success ? "text-primary" : "text-destructive"}`}>
                {r.success ? "[SUCCESS]" : "[FAILED]"} {r.response.slice(0, 120)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
