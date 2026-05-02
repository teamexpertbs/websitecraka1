import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Terminal, Shield, Zap, Users, UserPlus, LogIn, Gift } from "lucide-react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { useUserStore } from "@/lib/user-store";

type Tab = "signin" | "signup";

export default function Login() {
  const [, setLocation] = useLocation();
  const { signedInUser } = useUserStore();
  const [tab, setTab] = useState<Tab>("signin");
  const [referralCode, setReferralCode] = useState("");

  useEffect(() => {
    if (signedInUser) setLocation("/");
  }, [signedInUser]);

  const signInFeatures = [
    { icon: Shield, text: "Secure Google Sign-In — no password needed" },
    { icon: Zap, text: "Instant access to all OSINT tools" },
    { icon: Users, text: "Your session synced across devices" },
  ];

  const signUpFeatures = [
    { icon: Zap, text: "5 free search tokens on signup" },
    { icon: Gift, text: "Bonus tokens with referral code" },
    { icon: Users, text: "Earn tokens by referring friends" },
  ];

  const features = tab === "signin" ? signInFeatures : signUpFeatures;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Glow blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-primary/3 blur-[60px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-7">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center shadow-[0_0_40px_rgba(0,217,255,0.2)]">
            <Terminal className="w-8 h-8 text-primary" style={{ filter: "drop-shadow(0 0 8px currentColor)" }} />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-primary tracking-widest" style={{ textShadow: "0 0 20px currentColor" }}>
              CraKa OSINT
            </h1>
            <p className="text-muted-foreground text-sm mt-1 font-mono">
              India's #1 Intelligence Portal
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setTab("signin")}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-colors ${
                tab === "signin"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
            <button
              onClick={() => setTab("signup")}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-colors ${
                tab === "signup"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Sign Up
            </button>
          </div>

          <div className="px-6 pt-5 pb-2">
            {tab === "signin" ? (
              <div className="text-center">
                <h2 className="text-base font-bold text-foreground">Welcome back</h2>
                <p className="text-xs text-muted-foreground mt-1">Sign in with your Google account to continue</p>
              </div>
            ) : (
              <div className="text-center">
                <h2 className="text-base font-bold text-foreground">Create your account</h2>
                <p className="text-xs text-muted-foreground mt-1">Join CraKa OSINT — get 5 free tokens instantly</p>
              </div>
            )}
          </div>

          <div className="px-6 py-5 flex flex-col items-center gap-4">
            {/* Referral code (Sign Up only) */}
            {tab === "signup" && (
              <div className="w-full">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block font-mono">
                  Referral Code <span className="text-muted-foreground/50">(optional)</span>
                </label>
                <div className="relative">
                  <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary/50" />
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="ENTER CODE"
                    maxLength={10}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-background border border-border text-sm font-mono tracking-widest text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
            )}

            <GoogleSignInButton
              onSuccess={() => setLocation("/")}
              size="large"
              referralCode={tab === "signup" ? referralCode : undefined}
            />

            <div className="w-full flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-muted-foreground font-mono">OR</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button
              onClick={() => setLocation("/")}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Continue as guest (limited features)
            </button>

            {tab === "signin" && (
              <button
                onClick={() => setLocation("/forgot-password")}
                className="w-full text-center text-[11px] text-muted-foreground/60 hover:text-primary transition-colors pb-1"
              >
                Forgot / lost access? Recover via email →
              </button>
            )}
          </div>
        </div>

        {/* Feature list */}
        <div className="w-full space-y-2.5">
          {features.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <span>{text}</span>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground/50 text-center font-mono">
          Developed by{" "}
          <span className="text-primary/60">@DM_CRAKA_OWNER_BOT</span>
        </p>
      </div>
    </div>
  );
}
