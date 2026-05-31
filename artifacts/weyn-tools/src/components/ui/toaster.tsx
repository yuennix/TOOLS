import { useToast } from "@/hooks/use-toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`border p-4 font-mono text-sm transition-all ${
            toast.variant === "destructive"
              ? "border-destructive text-destructive bg-background"
              : "border-primary text-primary bg-background"
          }`}
        >
          {toast.title && <p className="font-semibold">{toast.title}</p>}
          {toast.description && <p className="text-xs mt-1 text-muted-foreground">{toast.description}</p>}
          <button
            onClick={() => dismiss(toast.id)}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
