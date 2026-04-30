import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { X, Crown } from "lucide-react";
import { useCurrentUser, isPremiumActive } from "@/lib/user";

const TELEGRAM = "DM_CRAKA_OWNER_BOT";
const WA_NUMBER = "917571083385";

export function PremiumBanner() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [, navigate] = useLocation();
  const { data: user } = useCurrentUser();

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem("premium_banner_dismissed");
    if (wasDismissed) return;
    const timer = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Don't show the upgrade banner to users who are already on an active premium plan
  if (isPremiumActive(user)) return null;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("premium_banner_dismissed", "1");
    setTimeout(() => setVisible(false), 400);
  };

  const handleUpgrade = () => {
    handleDismiss();
    navigate("/premium");
  };

  const handleTelegram = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://t.me/${TELEGRAM}`, "_blank");
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ${
        dismissed
          ? "opacity-0 translate-y-4 scale-95"
          : "opacity-100 translate-y-0 scale-100"
      }`}
      style={{ animation: dismissed ? undefined : "bannerSlideUp 0.5s cubic-bezier(0.34,1.56,0.64,1)" }}
    >
      <div className="relative w-72 rounded-xl border border-yellow-400/40 bg-gradient-to-br from-[#0d0d14] via-[#12111f] to-[#0a0a10] shadow-[0_0_30px_rgba(250,204,21,0.15)] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-yellow-400/10 rounded-full blur-2xl animate-pulse" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-cyan-400/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: "1s" }} />
        </div>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />

        <button
          onClick={handleDismiss}
          className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground transition-colors z-10 p-1 rounded hover:bg-white/5"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-yellow-400/10 border border-yellow-400/30 animate-pulse">
              <Crown className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-yellow-400 tracking-wider uppercase">CraKa Premium</div>
              <div className="text-[10px] text-muted-foreground">Unlock all OSINT powers</div>
            </div>
          </div>

          <div className="space-y-1 mb-4">
            {[
              "⚡ Unlimited lookups per day",
              "🚀 Priority API, no queues",
              "👑 Exclusive tools + bulk search",
            ].map((text) => (
              <div key={text} className="text-[11px] text-muted-foreground">{text}</div>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-3">
            <div className="text-xs line-through text-muted-foreground/50">₹299/mo</div>
            <div className="text-lg font-black text-yellow-400">₹99</div>
            <div className="text-[10px] text-muted-foreground">/month</div>
            <div className="ml-auto text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-semibold">
              67% OFF
            </div>
          </div>

          <button
            onClick={handleUpgrade}
            className="w-full py-2 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-bold text-xs tracking-wider hover:from-yellow-400 hover:to-yellow-300 transition-all shadow-[0_0_15px_rgba(250,204,21,0.3)] hover:shadow-[0_0_25px_rgba(250,204,21,0.5)] active:scale-95 mb-2"
          >
            ⚡ UPGRADE NOW — See Plans
          </button>

          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hi! I want to buy CraKa OSINT Premium. Please guide me.")}`, "_blank"); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-green-600/20 border border-green-500/30 text-green-400 text-[11px] font-semibold hover:bg-green-600/30 transition-all"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </button>
            <button
              onClick={handleTelegram}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[#229ED9]/20 border border-[#229ED9]/30 text-[#229ED9] text-[11px] font-semibold hover:bg-[#229ED9]/30 transition-all"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              Telegram
            </button>
          </div>

          <div className="mt-2 text-center text-[10px] text-muted-foreground/50">
            @{TELEGRAM}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bannerSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
