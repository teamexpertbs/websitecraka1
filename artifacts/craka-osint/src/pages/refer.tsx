import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout";
import { Copy, Check, Share2 } from "lucide-react";
import { getOrCreateSession } from "@/lib/session";
import { useUserStore } from "@/lib/user-store";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Refer() {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { signedInUser } = useUserStore();

  const initUser = useCallback(async () => {
    // Priority 1: signed-in user's code
    if (signedInUser?.referralCode) {
      setReferralCode(signedInUser.referralCode);
      setLoading(false);
      return;
    }

    // Priority 2: fetch from API
    const sessionId = signedInUser?.sessionId || getOrCreateSession();
    try {
      const res = await fetch(`${API_BASE}/api/user/me?sessionId=${encodeURIComponent(sessionId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.referralCode) { setReferralCode(data.referralCode); setLoading(false); return; }
      }
    } catch {}

    // Priority 3: init fallback
    try {
      const res = await fetch(`${API_BASE}/api/user/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (data.referralCode) setReferralCode(data.referralCode);
    } catch {}
    setLoading(false);
  }, [signedInUser]);

  useEffect(() => { initUser(); }, [initUser]);

  const referralLink = referralCode
    ? `${window.location.origin}/refer?ref=${referralCode}`
    : "";

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const text = `🎯 CraKa OSINT Portal — India's #1 OSINT Tool\n\nJoin free aur pao exclusive access:\n${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "CraKa OSINT Portal",
        text: "India's best OSINT tool — join free!",
        url: referralLink,
      }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto pt-8 space-y-5">
        {loading ? (
          <div className="bg-card border border-border rounded-2xl p-8 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/3 mb-4" />
            <div className="h-12 bg-muted rounded mb-4" />
            <div className="h-12 bg-muted rounded" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Label */}
            <label className="text-xs text-muted-foreground font-bold uppercase tracking-[0.2em] block">
              Tera Referral Link
            </label>

            {/* Link box + Copy */}
            <div className="flex gap-2">
              <div className="flex-1 flex items-center bg-muted/50 border border-border rounded-lg px-4 py-3 font-mono text-sm text-primary overflow-hidden">
                <span className="truncate">{referralLink || "Loading..."}</span>
              </div>
              <button
                onClick={handleCopy}
                disabled={!referralLink}
                className="flex items-center gap-1.5 px-4 py-3 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all text-sm font-semibold whitespace-nowrap disabled:opacity-50"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            {/* WhatsApp + Share buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleWhatsApp}
                disabled={!referralLink}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp pe Share
              </button>
              <button
                onClick={handleShare}
                disabled={!referralLink}
                className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-card border border-border hover:border-primary/40 text-muted-foreground hover:text-primary transition-all text-sm font-semibold disabled:opacity-50"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
