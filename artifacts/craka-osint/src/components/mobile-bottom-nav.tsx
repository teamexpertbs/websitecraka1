import { Link, useLocation } from "wouter";
import { Terminal, History, Wrench, Crown, Bell } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";

const STORAGE_KEY = "craka_read_broadcasts";

export function MobileBottomNav() {
  const [location] = useLocation();
  const { t } = useT();

  const { data: broadcastList = [] } = useQuery({
    queryKey: ["public-broadcasts"],
    queryFn: async () => customFetch("/api/broadcasts") as Promise<any[]>,
    staleTime: 60_000,
  });
  const unreadCount = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const readIds: number[] = raw ? JSON.parse(raw) : [];
      return (broadcastList as any[]).filter((b: any) => !readIds.includes(b.id)).length;
    } catch { return 0; }
  })();

  const items = [
    { href: "/",              labelKey: "nav.terminal",  fallback: "Search",  icon: Terminal,  highlight: false },
    { href: "/logs",          labelKey: "nav.logs",      fallback: "Logs",    icon: History,   highlight: false },
    { href: "/tools",         labelKey: "nav.tools",     fallback: "Tools",   icon: Wrench,    highlight: false },
    { href: "/notifications", labelKey: "nav.notifs",    fallback: "Alerts",  icon: Bell,      highlight: false, badge: unreadCount },
    { href: "/premium",       labelKey: "nav.premium",   fallback: "Premium", icon: Crown,     highlight: true },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur border-t border-border">
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = location === item.href;
          const baseColor = item.highlight ? "text-yellow-400/80" : "text-muted-foreground";
          const activeColor = item.highlight ? "text-yellow-400" : "text-primary";
          return (
            <li key={item.href}>
              <Link href={item.href}>
                <div
                  className={`flex flex-col items-center justify-center py-2 px-1 cursor-pointer transition-colors relative ${
                    active ? `${activeColor} bg-primary/5` : `${baseColor} hover:text-foreground`
                  }`}
                >
                  <div className="relative">
                    <Icon className={`w-5 h-5 mb-0.5 ${active ? "text-glow" : ""}`} />
                    {(item as any).badge > 0 && (
                      <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 text-[9px] font-bold bg-primary text-primary-foreground rounded-full flex items-center justify-center px-0.5">
                        {(item as any).badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium leading-tight truncate max-w-full">
                    {t(item.labelKey, item.fallback)}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="h-[env(safe-area-inset-bottom)] bg-card/95" />
    </nav>
  );
}
