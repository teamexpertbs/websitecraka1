import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Terminal, Shield, Zap, Users, UserPlus, LogIn, Gift, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { useUserStore } from "@/lib/user-store";

type Tab = "signin" | "signup";
type AuthMode = "google" | "email";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Login() {
  const [, setLocation] = useLocation();
  const { signedInUser, setUserToken } = useUserStore();
  const [tab, setTab] = useState<Tab>("signin");
  const [referralCode, setReferralCode] = useState("");

  // Email/password form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (signedInUser) setLocation("/");
  }, [signedInUser]);

  const resetForm = () => { setError(""); setSuccess(""); setNeedsVerification(false); };

  // ── Sign In ──────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    resetForm();
    if (!email || !password) { setError("Email and password are required"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setUserToken(data.token, {
          sessionId: data.user.sessionId,
          referralCode: data.user.referralCode,
          email: data.user.email ?? "",
          name: data.user.name ?? "",
          avatarUrl: data.user.avatarUrl,
          isPremium: data.user.isPremium ?? false,
          premiumPlan: data.user.premiumPlan ?? null,
          premiumExpiresAt: data.user.premiumExpiresAt ?? null,
          creditsEarned: data.user.creditsEarned ?? 0,
          totalReferrals: data.user.totalReferrals ?? 0,
        });
        setLocation("/");
      } else if (data.needsVerification) {
        setNeedsVerification(true);
        setError("Email not verified. Check your inbox or resend below.");
      } else {
        setError(data.error || "Sign in failed");
      }
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  };

  // ── Sign Up ──────────────────────────────────────────────────
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetForm();
    if (!email || !password) { setError("Email and password are required"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, referralCode: referralCode || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.dev_verify_token) {
          // Dev mode: auto-redirect to verify
          setLocation(`/verify-email?token=${data.dev_verify_token}`);
        } else {
          setSuccess("Account created! Check your email to verify your account before signing in.");
          setEmail(""); setPassword("");
        }
      } else {
        setError(data.error || "Registration failed");
      }
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  };

  // ── Resend verification ──────────────────────────────────────
  const handleResend = async () => {
    setResending(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.dev_verify_token) {
        setLocation(`/verify-email?token=${data.dev_verify_token}`);
      } else {
        setSuccess("Verification email resent! Check your inbox.");
        setNeedsVerification(false);
        setError("");
      }
    } catch { setError("Network error."); }
    finally { setResending(false); }
  };

  const switchTab = (t: Tab) => { setTab(t); resetForm(); setEmail(""); setPassword(""); };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[80px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center shadow-[0_0_40px_rgba(0,217,255,0.2)]">
            <Terminal className="w-8 h-8 text-primary" style={{ filter: "drop-shadow(0 0 8px currentColor)" }} />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-primary tracking-widest" style={{ textShadow: "0 0 20px currentColor" }}>CraKa OSINT</h1>
            <p className="text-muted-foreground text-sm mt-1 font-mono">India's #1 Intelligence Portal</p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          {/* Tabs */}
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
            <GoogleSignInButton onSuccess={() => setLocation("/")} size="large" referralCode={tab === "signup" ? referralCode : undefined} />

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
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block font-mono">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" required className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block font-mono">Password {tab === "signup" && <span className="text-muted-foreground/50">(min. 6 chars)</span>}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={tab === "signup" ? "Choose a password" : "Your password"} required className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> {tab === "signin" ? "Signing in..." : "Creating account..."}</> : tab === "signin" ? <><LogIn className="w-4 h-4" /> Sign In</> : <><UserPlus className="w-4 h-4" /> Create Account</>}
              </button>

              {/* Resend verification */}
              {needsVerification && (
                <button type="button" onClick={handleResend} disabled={resending} className="text-xs text-primary hover:underline text-center">
                  {resending ? "Resending..." : "Resend verification email →"}
                </button>
              )}
            </form>

            {/* Footer links */}
            <div className="flex flex-col items-center gap-1.5 pt-1">
              <button onClick={() => setLocation("/")} className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
                Continue as guest (limited features)
              </button>
              {tab === "signin" && (
                <button onClick={() => setLocation("/forgot-password")} className="text-[11px] text-muted-foreground/60 hover:text-primary transition-colors">
                  Forgot password? Reset via email →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="w-full space-y-2">
          {(tab === "signin" ? [
            { icon: Shield, text: "Google Sign-In or Email — your choice" },
            { icon: Zap, text: "Instant access to all OSINT tools" },
            { icon: Users, text: "Your session synced across devices" },
          ] : [
            { icon: Zap, text: "5 free search tokens on signup" },
            { icon: Gift, text: "Bonus tokens with referral code" },
            { icon: Users, text: "Earn tokens by referring friends" },
          ]).map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <span>{text}</span>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground/50 text-center font-mono">
          Developed by <span className="text-primary/60">@DM_CRAKA_OWNER_BOT</span>
        </p>
      </div>
    </div>
  );
}
