import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout";
import { Copy, Check, Share2, Gift, Users, Zap, Crown, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { getOrCreateSession } from "@/lib/session";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface UserData {
  referralCode: string;
  isPremium: boolean;
  premiumPlan: string | null;
  premiumExpiresAt: string | null;
  creditsEarned: number;
  totalReferrals: number;
  referredBy: string | null;
  recentReferrals: Array<{ date: string; credits: number }>;
}

export default function Refer() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [, navigate] = useLocation();

  const initUser = useCallback(async () => {
    const sessionId = getOrCreateSession();
    const ref = new URLSearchParams(window.location.search).get("ref");
    try {
      const res = await fetch(`${API_BASE}/api/user/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, referralCode: ref }),
      });
      const data = await res.json();
      setUser(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initUser();
  }, [initUser]);

  const referralLink = user
    ? `${window.location.origin}${API_BASE}/refer?ref=${user.referralCode}`
    : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const text = `🎯 CraKa OSINT Portal — India's #1 OSINT Tool\n\nJoin free aur pao exclusive access:\n${referralLink}\n\nMera referral code use karo → FREE credits milenge! 🎁`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "CraKa OSINT Portal",
        text: "India's best OSINT tool — join free and get credits!",
        url: referralLink,
      }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  const REWARDS = [
    { referrals: 1, reward: "+2 Tokens", icon: Gift, color: "text-cyan-400", bg: "bg-cyan-400/10 border-cyan-400/20" },
    { referrals: 20, reward: "1 Month Basic Free (₹99 Plan)", icon: Zap, color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20" },
    { referrals: 50, reward: "1 Month Pro Free", icon: Crown, color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20" },
    { referrals: 100, reward: "1 Month Elite Free", icon: Crown, color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/20" },
  ];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">
            <Gift className="w-3.5 h-3.5" />
            Refer & Earn
          </div>
          <h1 className="text-3xl font-black text-foreground">
            Dosto ko invite karo,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">
              free credits pao
            </span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Har successful referral pe tumhe aur tumhare dost dono ko credits milenge.
          </p>
        </div>

        {loading ? (
          <div className="bg-card border border-border rounded-2xl p-8 animate-pulse">
            <div className="h-6 bg-muted rounded w-1/3 mb-4" />
            <div className="h-12 bg-muted rounded mb-4" />
            <div className="h-10 bg-muted rounded" />
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Tera Referral Dashboard
              </h2>
              {user?.isPremium && (
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 px-2 py-0.5 rounded-full font-bold uppercase">
                    {user.premiumPlan || "Premium"} Member
                  </span>
                  {user.premiumExpiresAt && (
                    <span className="text-[10px] text-yellow-400/70 font-mono">
                      Expires: {new Date(user.premiumExpiresAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Referrals Kiye", value: user?.totalReferrals ?? 0, color: "text-cyan-400" },
                { label: "Credits Kamaye", value: user?.creditsEarned ?? 0, color: "text-yellow-400" },
                { label: "Tumhara Rank", value: (user?.totalReferrals ?? 0) >= 100 ? "Elite" : (user?.totalReferrals ?? 0) >= 50 ? "Pro" : (user?.totalReferrals ?? 0) >= 20 ? "Star" : "Naya", color: "text-purple-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-muted/30 border border-border/50 rounded-xl p-4 text-center">
                  <div className={`text-2xl font-black ${color}`}>{value}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{label}</div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Tera Referral Link</label>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2.5 font-mono text-xs text-primary overflow-hidden">
                  <span className="truncate">{referralLink}</span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all text-xs font-semibold"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleWhatsApp}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm transition-all active:scale-95"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp pe Share
              </button>
              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-card border border-border hover:border-primary/40 text-muted-foreground hover:text-primary transition-all text-sm font-semibold"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>

            <div className="bg-muted/20 border border-border/40 rounded-lg p-3 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Tera Code:</span>{" "}
              <span className="font-mono text-primary">{user?.referralCode}</span>
              {user?.referredBy && (
                <span className="ml-3">
                  <span className="font-semibold text-foreground">Referred by:</span>{" "}
                  <span className="font-mono text-green-400">{user.referredBy}</span>
                </span>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Gift className="w-4 h-4 text-yellow-400" />
            Reward Milestones
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {REWARDS.map(({ referrals, reward, icon: Icon, color, bg }) => {
              const achieved = (user?.totalReferrals ?? 0) >= referrals;
              return (
                <div
                  key={referrals}
                  className={`flex items-center gap-3 p-4 rounded-xl border ${bg} transition-all ${achieved ? "opacity-100" : "opacity-50 grayscale"}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bg} border`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm font-bold ${color}`}>{reward}</div>
                    <div className="text-[11px] text-muted-foreground">{referrals} referral{referrals > 1 ? "s" : ""} chahiye</div>
                  </div>
                  {achieved && <Check className="w-4 h-4 text-green-400 flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>

        <div
          onClick={() => navigate("/premium")}
          className="flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-yellow-400/10 to-yellow-400/5 border border-yellow-400/30 cursor-pointer hover:border-yellow-400/50 transition-all group"
        >
          <Crown className="w-8 h-8 text-yellow-400 group-hover:scale-110 transition-transform" />
          <div className="flex-1">
            <div className="font-bold text-foreground">Direct Premium Lena chahte ho?</div>
            <div className="text-sm text-muted-foreground">Plans ₹99/mo se start hote hain. WhatsApp se instant buy karo.</div>
          </div>
          <ChevronRight className="w-5 h-5 text-yellow-400 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Layout>
  );
}
