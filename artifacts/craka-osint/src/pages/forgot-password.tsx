import { useState } from "react";
import { Link } from "wouter";
import { Terminal, Mail, ArrowLeft, CheckCircle, Loader2, Lock, RefreshCw } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const startCooldown = () => {
    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) { clearInterval(timer); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const submit = async (emailVal: string) => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailVal.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setError(data.error || "Too many requests. Please wait before trying again.");
        return;
      }
      if (res.ok && data.success) {
        setSent(true);
        startCooldown();
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(email);
  };

  const handleResend = () => {
    if (resendCooldown > 0) return;
    setSent(false);
    setError("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
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
            <h2 className="text-base font-bold text-foreground">Forgot Password</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Enter your email — we'll send a password reset link
            </p>
          </div>

          <div className="px-6 py-6">
            {sent ? (
              <div className="flex flex-col items-center gap-4 py-2">
                <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold text-foreground">Check your inbox!</p>
                  <p className="text-xs text-muted-foreground">
                    If <span className="text-primary font-mono">{email}</span> is registered, a reset link has been sent.
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    Link expires in <strong className="text-foreground/70">15 minutes</strong>. Check your spam folder too.
                  </p>
                </div>
                <div className="w-full border-t border-border pt-3 space-y-2">
                  <button
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className="w-3 h-3" />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Send a new link"}
                  </button>
                  <Link href="/login">
                    <button className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1">
                      <ArrowLeft className="w-3 h-3" /> Back to login
                    </button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block font-mono">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  {error && (
                    <p className="text-xs text-destructive mt-1.5 font-mono">{error}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                  ) : (
                    <><Lock className="w-4 h-4" /> Send Reset Link</>
                  )}
                </button>

                <Link href="/login">
                  <button type="button" className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1 mt-1">
                    <ArrowLeft className="w-3 h-3" /> Back to login
                  </button>
                </Link>
              </form>
            )}
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground/50 text-center font-mono">
          Works for email/password accounts only
        </p>
      </div>
    </div>
  );
}
