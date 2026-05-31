import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-primary font-mono text-2xl">404</p>
      <p className="text-muted-foreground font-mono text-sm">PAGE NOT FOUND</p>
      <Link href="/" className="text-primary hover:underline font-mono text-sm">&lt; GO HOME</Link>
    </div>
  );
}
