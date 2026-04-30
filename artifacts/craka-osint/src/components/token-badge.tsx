import { Link } from "wouter";
import { Zap, Crown, Infinity as InfinityIcon } from "lucide-react";
import { useCurrentUser, isUnlimitedUser, isPremiumActive } from "@/lib/user";

interface Props {
  compact?: boolean;
}

export function TokenBadge({ compact = false }: Props) {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading || !user) {
    return (
      <div
        className={`flex items-center gap-1.5 rounded-lg border border-border/60 bg-black/30 ${compact ? "px-2 py-1" : "px-3 py-1.5"}`}
      >
        <div className="w-3 h-3 rounded-full bg-muted animate-pulse" />
        <span className="text-[10px] text-muted-foreground font-mono">...</span>
      </div>
    );
  }

  const unlimited = isUnlimitedUser(user);
  const premiumActive = isPremiumActive(user);
  const tokens = user.creditsEarned ?? 0;

  const tokenColor =
    unlimited
      ? "text-purple-300"
      : tokens === 0
        ? "text-destructive"
        : tokens < 5
          ? "text-yellow-400"
          : "text-emerald-400";

  const planLabel = premiumActive && user.premiumPlan ? user.premiumPlan : "FREE";
  const planClass = premiumActive
    ? unlimited
      ? "bg-purple-500/15 text-purple-300 border-purple-500/40"
      : "bg-yellow-400/15 text-yellow-300 border-yellow-400/40"
    : "bg-zinc-700/30 text-muted-foreground border-zinc-600/40";

  return (
    <Link href="/premium">
      <div
        className={`inline-flex items-center gap-2 rounded-lg border bg-black/40 backdrop-blur cursor-pointer hover:border-primary/40 hover:shadow-[0_0_10px_rgba(0,217,255,0.15)] transition-all ${compact ? "px-2 py-1" : "px-2.5 py-1.5"} border-border/60`}
        title={
          unlimited
            ? "Elite plan — Unlimited searches"
            : `${tokens} search tokens • ${planLabel}`
        }
      >
        <div className="flex items-center gap-1">
          {unlimited ? (
            <>
              <InfinityIcon className={`${compact ? "w-3 h-3" : "w-3.5 h-3.5"} text-purple-300`} />
              <span className={`font-mono font-bold ${compact ? "text-[10px]" : "text-xs"} text-purple-300`}>
                ∞
              </span>
            </>
          ) : (
            <>
              <Zap className={`${compact ? "w-3 h-3" : "w-3.5 h-3.5"} ${tokenColor}`} />
              <span className={`font-mono font-bold ${compact ? "text-[10px]" : "text-xs"} ${tokenColor}`}>
                {tokens}
              </span>
            </>
          )}
        </div>
        <div className="w-px h-3 bg-border/60" />
        <div className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 ${planClass}`}>
          {premiumActive && <Crown className={`${compact ? "w-2.5 h-2.5" : "w-3 h-3"}`} />}
          <span className={`font-bold tracking-wider uppercase ${compact ? "text-[8px]" : "text-[9px]"}`}>
            {planLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}
