import { useEffect } from "react";
import { useLocation } from "wouter";
import { Terminal, Shield, Zap, Users } from "lucide-react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { useUserStore } from "@/lib/user-store";
import { useT } from "@/lib/i18n";

export default function Login() {
  const [, setLocation] = useLocation();
  const { signedInUser } = useUserStore();
  const { t } = useT();

  // Already signed in — redirect to home
  useEffect(() => {
    if (signedInUser) setLocation("/");
  }, [signedInUser]);

  const features = [
    { icon: Shield, text: "Secure Google Sign-In — no password needed" },
    { icon: Zap, text: "5 free search tokens on signup" },
    { icon: Users, text: "Earn tokens by referring friends" },
  ];

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

      {/* Glow blob */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center shadow-[0_0_30px_rgba(0,217,255,0.15)]">
            <Terminal className="w-8 h-8 text-primary text-glow" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-primary text-glow tracking-widest">CraKa OSINT</h1>
            <p className="text-muted-foreground text-sm mt-1 font-mono">
              India's #1 Intelligence Portal
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-b from-primary/5 to-transparent px-6 pt-6 pb-5 border-b border-border">
            <h2 className="text-lg font-bold text-foreground text-center">Sign in to continue</h2>
            <p className="text-xs text-muted-foreground text-center mt-1">
              Use your Google account for secure, instant access
            </p>
          </div>

          <div className="px-6 py-6 flex flex-col items-center gap-5">
            <GoogleSignInButton onSuccess={() => setLocation("/")} size="large" />

            <div className="w-full flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground font-mono">OR</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button
              onClick={() => setLocation("/")}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Continue as guest (limited features)
            </button>
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

        <p className="text-[11px] text-muted-foreground/60 text-center font-mono">
          Developed by{" "}
          <span className="text-primary/70">@DM_CRAKA_OWNER_BOT</span>
        </p>
      </div>
    </div>
  );
}
