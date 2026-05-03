 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/artifacts/craka-osint/src/pages/login.tsx b/artifacts/craka-osint/src/pages/login.tsx
index 4369440d3c5e24548715778f19d877120d1412ec..e1e84e2e7632996c6b16bfc8381f19e6ffb5b157 100644
--- a/artifacts/craka-osint/src/pages/login.tsx
+++ b/artifacts/craka-osint/src/pages/login.tsx
@@ -147,51 +147,56 @@ export default function Login() {
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
-            <GoogleSignInButton onSuccess={() => setLocation("/")} size="large" referralCode={tab === "signup" ? referralCode : undefined} />
+            <div className="space-y-2">
+              <GoogleSignInButton onSuccess={() => setLocation("/")} size="large" referralCode={tab === "signup" ? referralCode : undefined} />
+              <p className="text-[11px] text-center text-muted-foreground/70">
+                Google account se account banane ke liye upar <span className="text-foreground font-medium">Continue with Google</span> par click karein.
+              </p>
+            </div>
 
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
 
EOF
)
