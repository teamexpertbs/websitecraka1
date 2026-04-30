import { Link, useLocation } from "wouter";
import { Terminal, History, Wrench, Crown, Receipt } from "lucide-react";
import { useT } from "@/lib/i18n";

interface NavItem {
  href: string;
  labelKey: string;
  fallback: string;
  icon: typeof Terminal;
  highlight?: boolean;
}

export function MobileBottomNav() {
  const [location] = useLocation();
  const { t } = useT();

  const items: NavItem[] = [
    { href: "/",            labelKey: "nav.terminal",     fallback: "Search",       icon: Terminal },
    { href: "/logs",        labelKey: "nav.logs",         fallback: "Logs",         icon: History },
    { href: "/transactions",labelKey: "nav.transactions", fallback: "Transactions", icon: Receipt },
    { href: "/tools",       labelKey: "nav.tools",        fallback: "Tools",        icon: Wrench },
    { href: "/premium",     labelKey: "nav.premium",      fallback: "Premium",      icon: Crown, highlight: true },
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
                  className={`flex flex-col items-center justify-center py-2 px-1 cursor-pointer transition-colors ${
                    active ? `${activeColor} bg-primary/5` : `${baseColor} hover:text-foreground`
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-0.5 ${active ? "text-glow" : ""}`} />
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
