import { useLocation } from "wouter";
import { Crown, Zap, X, Gift, ArrowRight } from "lucide-react";

const WA_NUMBER = "917571083385";
const TELEGRAM = "DM_CRAKA_OWNER_BOT";

const QUICK_PLANS = [
  { name: "Basic", price: "₹99", tokens: "49 Tokens", color: "from-cyan-500 to-cyan-400", text: "text-cyan-300", border: "border-cyan-500/40" },
  { name: "Pro", price: "₹199", tokens: "99 Tokens", color: "from-yellow-500 to-yellow-400", text: "text-yellow-300", border: "border-yellow-400/50", highlight: true },
  { name: "Elite", price: "₹499", tokens: "Unlimited", color: "from-purple-500 to-pink-500", text: "text-purple-300", border: "border-purple-500/40" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  currentTokens: number;
  needTokens?: number;
  reason?: "out-of-tokens" | "insufficient";
}

export function BuyTokensModal({ open, onClose, currentTokens, needTokens, reason = "out-of-tokens" }: Props) {
  const [, navigate] = useLocation();

  if (!open) return null;

  const goToPremium = () => {
    onClose();
    navigate("/premium");
  };

  const goToRefer = () => {
    onClose();
    navigate("/refer");
  };

  const openWhatsApp = () => {
    const msg = `Hi! Mere CraKa OSINT account mein tokens khatam ho gaye. Premium lena hai. Please guide karo.`;
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const openTelegram = () => {
    window.open(`https://t.me/${TELEGRAM}`, "_blank");
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-yellow-400/40 bg-gradient-to-br from-[#0d0d14] via-[#12111f] to-[#0a0a10] shadow-[0_0_50px_rgba(250,204,21,0.2)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-6 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-400/15 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-cyan-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        </div>
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-yellow-400/70 to-transparent" />

        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-yellow-400/10 border border-yellow-400/40 shadow-[0_0_20px_rgba(250,204,21,0.25)]">
              <Crown className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-yellow-400 tracking-widest uppercase">
                {reason === "insufficient" ? "Not Enough Tokens" : "Tokens Khatam!"}
              </div>
              <h3 className="text-lg font-black text-foreground">Premium Upgrade Karo</h3>
            </div>
          </div>

          <div className="rounded-xl bg-muted/40 border border-border/60 p-3 mb-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tumhare Tokens</div>
              <div className={`text-2xl font-black ${currentTokens > 0 ? "text-yellow-400" : "text-destructive"}`}>
                {currentTokens}
              </div>
            </div>
            {needTokens != null && (
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Required</div>
                <div className="text-2xl font-black text-foreground">{needTokens}</div>
              </div>
            )}
            <Zap className="w-7 h-7 text-yellow-400/60" />
          </div>

          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            {reason === "insufficient"
              ? `Iss search ke liye ${needTokens ?? "kuch"} tokens chahiye. Premium lo aur unlimited searches karo.`
              : "Tumhare paas search karne ke liye tokens nahi bache. Niche se ek plan choose karo ya WhatsApp pe contact karo."}
          </p>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {QUICK_PLANS.map((p) => (
              <button
                key={p.name}
                onClick={goToPremium}
                className={`relative rounded-xl border ${p.border} bg-muted/40 p-3 text-left hover:scale-[1.02] transition-all ${p.highlight ? "shadow-[0_0_20px_rgba(250,204,21,0.2)]" : ""}`}
              >
                {p.highlight && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-black bg-gradient-to-r from-yellow-500 to-yellow-300 text-black px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    POPULAR
                  </span>
                )}
                <div className={`text-[10px] uppercase font-bold tracking-wider ${p.text}`}>{p.name}</div>
                <div className="text-base font-black text-foreground mt-0.5">{p.price}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{p.tokens}</div>
              </button>
            ))}
          </div>

          <button
            onClick={goToPremium}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-black text-sm tracking-wider hover:from-yellow-400 hover:to-yellow-300 transition-all shadow-[0_0_20px_rgba(250,204,21,0.35)] hover:shadow-[0_0_30px_rgba(250,204,21,0.55)] active:scale-95 mb-2 flex items-center justify-center gap-2"
          >
            <Crown className="w-4 h-4" />
            VIEW ALL PLANS
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              onClick={openWhatsApp}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-600/20 border border-green-500/40 text-green-400 text-xs font-bold hover:bg-green-600/30 transition-all"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </button>
            <button
              onClick={openTelegram}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#229ED9]/20 border border-[#229ED9]/40 text-[#229ED9] text-xs font-bold hover:bg-[#229ED9]/30 transition-all"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              Telegram
            </button>
          </div>

          <button
            onClick={goToRefer}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:text-green-400 transition-colors"
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Ya dosto ko refer karke FREE tokens kamao</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
