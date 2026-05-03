import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Terminal, Mail, Lock, Eye, EyeOff, UserPlus, LogIn, Loader2, CheckCircle, AlertCircle, Gift } from "lucide-react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { useUserStore } from "@/lib/user-store";
import { getOrCreateSession } from "@/lib/session";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Tab = "signin" | "signup";

export default function Login() {
  const [, setLocation] = useLocation();
  const { setUserToken } = useUserStore();

  const [tab, setTab] = useState<Tab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const switchTab = (t: Tab) => {
    setTab(t);
    setError("");
    setSuccess("");
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const sessionId = getOrCreateSession();
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sign-in failed");
      setUserToken(data.token, data.user);
      setLocation("/");
    } catch (err: any) {
      setError(err?.message || "Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const sessionId = getOrCreateSession();
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          name: name.trim(),
          sessionId,
          referralCode: referralCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sign-up failed");
      setSuccess("Account created! Please check your email to verify your account.");
      setEmail("");
      setPassword("");
      setName("");
      setReferralCode("");
    } catch (err: any) {
      setError(err?.message || "Sign-up failed. Please try again.");
    } finally {
      setLoading(false);
    }
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
          <p className="text-xs text-muted-foreground font-mono">India's #1 Intelligence Portal</p>
        </div>

        <div className="w-full bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex border-b border-border">
            <button onClick={() => switchTab("signin")} className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-colors ${tab === "signin" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"}`}>
              <LogIn className="w-4 h-4" /> Sign In
            </button>
            <button onClick={() => switchTab("signup")} className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-colors ${tab === "signup" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"}`}>
              <UserPlus className="w-4 h-4" /> Sign Up
            </button>
          </div>

          <div className="px-6 py-5 flex flex-col gap-4">
            {/* Header */}
            <div className="text-center">
              <h2 className="text-base font-bold text-foreground">{tab === "signin" ? "Welcome back" : "Create your account"}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{tab === "signin" ? "Sign in with Google or email" : "Get 5 free tokens on signup"}</p>
            </div>

            {/* Referral (signup only) */}
            {tab === "signup" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block font-mono">Referral Code <span className="text-muted-foreground/50">(optional)</span></label>
                <div className="relative">
                  <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary/50" />
                  <input type="text" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} placeholder="ENTER CODE" maxLength={10} className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-background border border-border text-sm font-mono tracking-widest text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />
                </div>
              </div>
            )}

            {/* Google button */}
            <div className="space-y-2">
              <GoogleSignInButton onSuccess={() => setLocation("/")} size="large" referralCode={tab === "signup" ? referralCode : undefined} />
              <p className="text-[11px] text-center text-muted-foreground/70">
                Google account se account banane ke liye upar <span className="text-foreground font-medium">Continue with Google</span> par click karein.
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-muted-foreground font-mono">OR WITH EMAIL</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Success/Error banners */}
            {success && (
              <div className="flex items-start gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2.5">
                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}
            {error && (
              <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Email/password form */}
            <form onSubmit={tab === "signin" ? handleSignIn : handleSignUp} className="flex flex-col gap-3">
              {/* Name field (signup only) */}
              {tab === "signup" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block font-mono">Full Name</label>
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      required
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block font-mono">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block font-mono">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={tab === "signup" ? "Min. 6 characters" : "Your password"}
                    required
                    className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                    {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {tab === "signin" ? "Signing in..." : "Creating account..."}</>
                ) : tab === "signin" ? (
                  <><LogIn className="w-4 h-4" /> Sign In</>
                ) : (
                  <><UserPlus className="w-4 h-4" /> Create Account</>
                )}
              </button>

              {/* Forgot password (sign-in only) */}
              {tab === "signin" && (
                <Link href="/forgot-password">
                  <button type="button" className="w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors mt-1">
                    Forgot your password?
                  </button>
                </Link>
              )}
            </form>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground/50 text-center font-mono">
          By signing in you agree to our terms of service.
        </p>
      </div>
    </div>
  );
}
