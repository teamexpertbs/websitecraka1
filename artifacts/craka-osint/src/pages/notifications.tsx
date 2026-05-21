import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell, BellOff, Info, AlertTriangle, CheckCircle2,
  Zap, Sparkles, Megaphone, Clock, CheckCheck
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const STORAGE_KEY = "craka_read_broadcasts";

function getReadIds(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch { return new Set(); }
}

function markAllRead(ids: number[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

function usePublicBroadcasts() {
  return useQuery({
    queryKey: ["public-broadcasts"],
    queryFn: async () => customFetch("/api/broadcasts") as Promise<any[]>,
    refetchInterval: 60_000,
  });
}

const TYPE_CONFIG: Record<string, {
  icon: React.ReactNode;
  label: string;
  cardClass: string;
  badgeClass: string;
  glowClass: string;
  dotClass: string;
}> = {
  success: {
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    label: "Success",
    cardClass: "border-emerald-500/25 bg-gradient-to-br from-emerald-950/40 to-card/80",
    badgeClass: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
    glowClass: "shadow-[0_0_20px_rgba(52,211,153,0.08)]",
    dotClass: "bg-emerald-400",
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    label: "Warning",
    cardClass: "border-amber-500/25 bg-gradient-to-br from-amber-950/40 to-card/80",
    badgeClass: "text-amber-400 border-amber-400/30 bg-amber-400/10",
    glowClass: "shadow-[0_0_20px_rgba(251,191,36,0.08)]",
    dotClass: "bg-amber-400",
  },
  danger: {
    icon: <AlertTriangle className="w-5 h-5 text-rose-400" />,
    label: "Alert",
    cardClass: "border-rose-500/25 bg-gradient-to-br from-rose-950/40 to-card/80",
    badgeClass: "text-rose-400 border-rose-400/30 bg-rose-400/10",
    glowClass: "shadow-[0_0_20px_rgba(251,113,133,0.08)]",
    dotClass: "bg-rose-400",
  },
  promo: {
    icon: <Sparkles className="w-5 h-5 text-purple-400" />,
    label: "Promo",
    cardClass: "border-purple-500/25 bg-gradient-to-br from-purple-950/40 to-card/80",
    badgeClass: "text-purple-400 border-purple-400/30 bg-purple-400/10",
    glowClass: "shadow-[0_0_20px_rgba(167,139,250,0.08)]",
    dotClass: "bg-purple-400",
  },
  info: {
    icon: <Info className="w-5 h-5 text-primary" />,
    label: "Info",
    cardClass: "border-primary/20 bg-gradient-to-br from-primary/5 to-card/80",
    badgeClass: "text-primary border-primary/30 bg-primary/10",
    glowClass: "shadow-[0_0_20px_rgba(0,217,255,0.06)]",
    dotClass: "bg-primary",
  },
};

function getConfig(type: string) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.info;
}

export default function Notifications() {
  const { data: broadcasts = [], isLoading } = usePublicBroadcasts();
  const [readIds, setReadIds] = useState<Set<number>>(getReadIds);
  const [popupBroadcast, setPopupBroadcast] = useState<any | null>(null);
  const [popupDismissed, setPopupDismissed] = useState(false);

  const unreadCount = broadcasts.filter((b: any) => !readIds.has(b.id)).length;

  // Show latest unread as a popup once
  useEffect(() => {
    if (broadcasts.length > 0 && !popupDismissed) {
      const latest = broadcasts.find((b: any) => !readIds.has(b.id));
      if (latest) setPopupBroadcast(latest);
    }
  }, [broadcasts.length]);

  const handleMarkAllRead = () => {
    const allIds = broadcasts.map((b: any) => b.id);
    markAllRead(allIds);
    setReadIds(new Set(allIds));
  };

  const handleDismissPopup = () => {
    if (popupBroadcast) {
      const updated = new Set([...readIds, popupBroadcast.id]);
      markAllRead([...updated]);
      setReadIds(updated);
    }
    setPopupBroadcast(null);
    setPopupDismissed(true);
  };

  return (
    <Layout>
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-primary/5 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto space-y-5 px-4 py-4 sm:py-6">

        {/* Header */}
        <header className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(0,217,255,0.5)]">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                  Notifications
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? "s" : ""}` : "System broadcasts & announcements"}
                </p>
              </div>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-xs text-muted-foreground hover:text-primary gap-1.5 shrink-0 mt-1 border border-border/50 hover:border-primary/30"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </Button>
          )}
        </header>

        {/* Loading skeleton */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-xl border border-border/50 bg-card/50 animate-pulse" />
            ))}
          </div>

        /* Empty state */
        ) : broadcasts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-center">
              <BellOff className="w-9 h-9 text-muted-foreground/30" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground/60">No announcements yet</p>
              <p className="text-sm text-muted-foreground mt-1">Check back later for updates from admin.</p>
            </div>
          </div>

        /* Notification list */
        ) : (
          <div className="space-y-3">
            {broadcasts.map((b: any) => {
              const isUnread = !readIds.has(b.id);
              const cfg = getConfig(b.type);
              return (
                <div
                  key={b.id}
                  className={`relative rounded-xl border backdrop-blur-sm transition-all duration-300 overflow-hidden
                    ${isUnread ? `${cfg.cardClass} ${cfg.glowClass}` : "border-border/40 bg-card/40"}
                  `}
                >
                  {/* Unread accent bar */}
                  {isUnread && (
                    <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${cfg.dotClass} rounded-l-xl`} />
                  )}

                  <div className="flex items-start gap-3.5 p-4 pl-5">
                    {/* Icon */}
                    <div className={`mt-0.5 shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-opacity
                      ${isUnread ? "opacity-100" : "opacity-50"}
                      ${b.type === "success" ? "bg-emerald-500/10 border border-emerald-500/20"
                        : b.type === "warning" ? "bg-amber-500/10 border border-amber-500/20"
                        : b.type === "danger" ? "bg-rose-500/10 border border-rose-500/20"
                        : b.type === "promo" ? "bg-purple-500/10 border border-purple-500/20"
                        : "bg-primary/10 border border-primary/20"}`}
                    >
                      {cfg.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className={`text-sm font-semibold leading-tight ${isUnread ? "text-foreground" : "text-foreground/70"}`}>
                          {b.title}
                        </h3>
                        {isUnread && (
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dotClass} animate-pulse`} />
                        )}
                        <Badge
                          variant="outline"
                          className={`ml-auto text-[9px] uppercase tracking-wider h-4 px-1.5 ${isUnread ? cfg.badgeClass : "text-muted-foreground/50 border-border/40"}`}
                        >
                          {cfg.label}
                        </Badge>
                      </div>

                      <p className={`text-sm leading-relaxed ${isUnread ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
                        {b.message}
                      </p>

                      <div className="flex items-center gap-1.5 mt-2">
                        <Clock className="w-3 h-3 text-muted-foreground/40" />
                        <span className="text-[10px] text-muted-foreground/40 font-mono">
                          {formatDistanceToNow(new Date(b.createdAt), { addSuffix: true })}
                          <span className="mx-1.5 opacity-50">·</span>
                          {format(new Date(b.createdAt), "dd MMM yyyy, HH:mm")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-[10px] text-muted-foreground/30 pb-4 font-mono tracking-wider">
          SHOWING LATEST 30 BROADCASTS
        </p>
      </div>

      {/* Premium Popup for latest unread broadcast */}
      {popupBroadcast && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6"
          onClick={handleDismissPopup}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative z-10 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            {(() => {
              const cfg = getConfig(popupBroadcast.type);
              return (
                <div className={`rounded-2xl border backdrop-blur-md overflow-hidden ${cfg.cardClass} ${cfg.glowClass}`}>
                  {/* Top accent line */}
                  <div className={`h-[2px] w-full ${
                    popupBroadcast.type === "success" ? "bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
                    : popupBroadcast.type === "warning" ? "bg-gradient-to-r from-transparent via-amber-400 to-transparent"
                    : popupBroadcast.type === "danger" ? "bg-gradient-to-r from-transparent via-rose-400 to-transparent"
                    : popupBroadcast.type === "promo" ? "bg-gradient-to-r from-transparent via-purple-400 to-transparent"
                    : "bg-gradient-to-r from-transparent via-primary to-transparent"
                  }`} />

                  <div className="p-6">
                    {/* Icon + badge row */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                        popupBroadcast.type === "success" ? "bg-emerald-500/15 border-emerald-500/30"
                        : popupBroadcast.type === "warning" ? "bg-amber-500/15 border-amber-500/30"
                        : popupBroadcast.type === "danger" ? "bg-rose-500/15 border-rose-500/30"
                        : popupBroadcast.type === "promo" ? "bg-purple-500/15 border-purple-500/30"
                        : "bg-primary/15 border-primary/30"
                      }`}>
                        <div className="scale-125">{cfg.icon}</div>
                      </div>
                      <div>
                        <Badge variant="outline" className={`text-[10px] uppercase tracking-widest ${cfg.badgeClass}`}>
                          {cfg.label}
                        </Badge>
                        <p className="text-[10px] text-muted-foreground/50 mt-0.5 font-mono">
                          {format(new Date(popupBroadcast.createdAt), "dd MMM yyyy, HH:mm")}
                        </p>
                      </div>
                      <div className="ml-auto">
                        <Megaphone className="w-4 h-4 text-muted-foreground/30" />
                      </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-lg font-bold text-foreground mb-2 leading-tight">
                      {popupBroadcast.title}
                    </h2>

                    {/* Message */}
                    <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                      {popupBroadcast.message}
                    </p>

                    {/* Action button */}
                    <Button
                      onClick={handleDismissPopup}
                      className={`w-full font-semibold tracking-wide ${
                        popupBroadcast.type === "success" ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                        : popupBroadcast.type === "warning" ? "bg-amber-600 hover:bg-amber-500 text-black"
                        : popupBroadcast.type === "danger" ? "bg-rose-600 hover:bg-rose-500 text-white"
                        : popupBroadcast.type === "promo" ? "bg-purple-600 hover:bg-purple-500 text-white"
                        : "bg-primary hover:bg-primary/90 text-primary-foreground"
                      }`}
                    >
                      <CheckCheck className="w-4 h-4 mr-2" />
                      Got it
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </Layout>
  );
}
