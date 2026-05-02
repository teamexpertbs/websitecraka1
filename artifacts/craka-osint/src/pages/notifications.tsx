import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Info, AlertTriangle, CheckCircle2, Zap, Trash2 } from "lucide-react";
import { format } from "date-fns";

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
    queryFn: async () => {
      return customFetch("/api/broadcasts") as Promise<any[]>;
    },
    refetchInterval: 60_000,
  });
}

function TypeIcon({ type }: { type: string }) {
  if (type === "success") return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  if (type === "warning") return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
  if (type === "error") return <AlertTriangle className="w-4 h-4 text-destructive" />;
  if (type === "promo") return <Zap className="w-4 h-4 text-purple-400" />;
  return <Info className="w-4 h-4 text-primary" />;
}

function typeBadgeClass(type: string) {
  if (type === "success") return "text-green-400 border-green-400/30 bg-green-400/10";
  if (type === "warning") return "text-yellow-400 border-yellow-400/30 bg-yellow-400/10";
  if (type === "error") return "text-destructive border-destructive/30 bg-destructive/10";
  if (type === "promo") return "text-purple-400 border-purple-400/30 bg-purple-400/10";
  return "text-primary border-primary/30 bg-primary/10";
}

export default function Notifications() {
  const { data: broadcasts = [], isLoading } = usePublicBroadcasts();
  const [readIds, setReadIds] = useState<Set<number>>(getReadIds);

  const unreadCount = broadcasts.filter((b: any) => !readIds.has(b.id)).length;

  useEffect(() => {
    if (broadcasts.length > 0) {
      const allIds = broadcasts.map((b: any) => b.id);
      markAllRead(allIds);
      setReadIds(new Set(allIds));
    }
  }, [broadcasts.length]);

  const handleMarkAllRead = () => {
    const allIds = broadcasts.map((b: any) => b.id);
    markAllRead(allIds);
    setReadIds(new Set(allIds));
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-3">
              <Bell className="w-7 h-7 sm:w-8 sm:h-8" />
              Notifications
              {unreadCount > 0 && (
                <Badge className="bg-primary text-primary-foreground text-xs px-1.5 py-0">{unreadCount}</Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm">System broadcasts and announcements from admin.</p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-muted-foreground hover:text-primary transition-colors mt-1 shrink-0"
            >
              Mark all read
            </button>
          )}
        </header>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-20 bg-card border border-border rounded-lg animate-pulse" />
            ))}
          </div>
        ) : broadcasts.length === 0 ? (
          <Card className="border-border bg-card/60">
            <CardContent className="p-12 flex flex-col items-center gap-3">
              <BellOff className="w-12 h-12 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">No announcements yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {broadcasts.map((b: any) => {
              const isUnread = !readIds.has(b.id);
              return (
                <Card
                  key={b.id}
                  className={`border transition-all ${
                    isUnread
                      ? "border-primary/30 bg-primary/5 shadow-[0_0_10px_rgba(0,217,255,0.05)]"
                      : "border-border bg-card/60"
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        <TypeIcon type={b.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-foreground">{b.title}</h3>
                          {isUnread && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          )}
                          <Badge variant="outline" className={`ml-auto text-[10px] h-4 ${typeBadgeClass(b.type)}`}>
                            {b.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{b.message}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-2">
                          {format(new Date(b.createdAt), "dd MMM yyyy, HH:mm")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <p className="text-center text-[11px] text-muted-foreground/50 pb-4">
          Only the latest 30 broadcasts are shown.
        </p>
      </div>
    </Layout>
  );
}
