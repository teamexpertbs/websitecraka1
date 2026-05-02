import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Terminal, Loader2, CheckCircle, XCircle, Mail } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "idle">("idle");
  const [message, setMessage] = useState("");

  const token = new URLSearchParams(window.location.search).get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link — no token found.");
      return;
    }
    setStatus("loading");
    fetch(`${API_BASE}/api/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setStatus("success");
          setMessage(data.message || "Email verified! You can now sign in.");
          setTimeout(() => setLocation("/login"), 2500);
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Network error. Please try again.");
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-7">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Terminal className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-primary tracking-widest">CraKa OSINT</h1>
        </div>

        <div className="w-full bg-card border border-border rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-5">
          {status === "loading" && (
            <>
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm font-semibold text-foreground">Verifying your email...</p>
            </>
          )}
          {status === "idle" && (
            <>
              <Mail className="w-10 h-10 text-primary" />
              <p className="text-sm text-muted-foreground text-center">Processing verification link...</p>
            </>
          )}
          {status === "success" && (
            <>
              <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Email Verified!</p>
                <p className="text-xs text-muted-foreground mt-1">{message}</p>
                <p className="text-xs text-primary mt-2 font-mono">Redirecting to sign in...</p>
              </div>
            </>
          )}
          {status === "error" && (
            <>
              <div className="w-12 h-12 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-destructive" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Verification Failed</p>
                <p className="text-xs text-muted-foreground mt-1 font-mono">{message}</p>
              </div>
              <button onClick={() => setLocation("/login")} className="text-xs text-primary hover:underline">
                Back to login →
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
