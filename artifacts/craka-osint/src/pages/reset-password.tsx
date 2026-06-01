import { useState } from "react";
import { useLocation } from "wouter";
import { Terminal, Lock, Loader2, CheckCircle, XCircle, Eye, EyeOff, AlertTriangle, Clock } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type ErrorType = "expired" | "invalid" | "generic" | null;

function classifyError(msg: string): ErrorType {
  const m = msg.toLowerCase();
  if (m.includes("expired")) return "expired";
  if (m.includes("invalid") || m.includes("already been used")) return "invalid";
  return "generic";
}

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const token = new URLSearchParams(window.location.search).get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState<ErrorType>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setErrorType(null);
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (!token) { setError("Invalid reset link"); setErrorType("invalid"); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (data.success) {
        setDone(true);
        setTimeout(() => setLocation("/login"), 2500);
      } else {
        const msg = data.error || "Reset failed. Please try again.";
        setError(msg);
        setErrorType(classifyError(msg));
      }
    } catch {
      setError("Network error. Please try again.");
      setErrorType("generic");
    } finally {
      setLoading(false);
    }
  };

  const goForgot = () => setLocation("/forgot-password");

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

        <div className="w-full bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-b from-primary/5 to-transparent px-6 pt-5 pb-4 border-b border-border">
            <h2 className="text-base font-bold text-foreground">Set New Password</h2>
            <p className="text-xs text-muted-foreground mt-1">Enter your new password below</p>
          </div>

          <div className="px-6 py-6">
            {/* No token in URL */}
            {!token ? (
              <div className="text-center space-y-4 py-2">
                <div className="w-12 h-12 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center mx-auto">
                  <XCircle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Invalid Reset Link</p>
                  <p className="text-xs text-muted-foreground mt-1">This link is missing required data. Please request a new one.</p>
                </div>
                <button onClick={goForgot} className="w-full py-2 rounded-lg bg-primary/10 border border-primary/30 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                  Request New Reset Link →
                </button>
              </div>

            /* Success */
            ) : done ? (
              <div className="flex flex-col items-center gap-4 py-2">
                <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">Password Updated!</p>
                  <p className="text-xs text-muted-foreground mt-1">Redirecting to sign in...</p>
                </div>
              </div>

            /* Token expired */
            ) : errorType === "expired" ? (
              <div className="text-center space-y-4 py-2">
                <div className="w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mx-auto">
                  <Clock className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Link Expired</p>
                  <p className="text-xs text-muted-foreground mt-1">This reset link has expired (15-minute limit). Please request a fresh one.</p>
                </div>
                <button onClick={goForgot} className="w-full py-2 rounded-lg bg-primary/10 border border-primary/30 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                  Request New Reset Link →
                </button>
              </div>

            /* Invalid / already used */
            ) : errorType === "invalid" ? (
              <div className="text-center space-y-4 py-2">
                <div className="w-12 h-12 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Link Already Used</p>
                  <p className="text-xs text-muted-foreground mt-1">This reset link has already been used or is invalid. Each link works only once.</p>
                </div>
                <button onClick={goForgot} className="w-full py-2 rounded-lg bg-primary/10 border border-primary/30 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                  Request New Reset Link →
                </button>
              </div>

            /* Password form */
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block font-mono">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      required
                      className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block font-mono">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <input
                      type={showPass ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Repeat password"
                      required
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  {error && !errorType && <p className="text-xs text-destructive mt-1.5 font-mono">{error}</p>}
                </div>
                <button
                  type="submit"
                  disabled={loading || !password || !confirm}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : <><Lock className="w-4 h-4" /> Update Password</>}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
