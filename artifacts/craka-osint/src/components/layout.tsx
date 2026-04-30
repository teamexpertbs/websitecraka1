import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { Terminal, History, BarChart2, Wrench, Shield, LogOut, Crown, Gift, Menu, X } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { TokenBadge } from "@/components/token-badge";
import { useEnsureUserInitialized } from "@/lib/user";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { token, setToken } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEnsureUserInitialized();

  const navItems = [
    { href: "/", label: "Terminal", icon: Terminal },
    { href: "/logs", label: "Logs", icon: History },
    { href: "/stats", label: "Stats", icon: BarChart2 },
    { href: "/tools", label: "Tools", icon: Wrench },
    { href: "/admin", label: "Admin Panel", icon: Shield },
  ];

  const Sidebar = (
    <aside className="w-60 flex flex-col border-r border-border bg-card h-full">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Terminal className="w-6 h-6 text-primary text-glow" />
          <span className="font-bold text-lg tracking-wider text-glow text-primary">CraKa OSINT</span>
        </div>
        <button
          className="md:hidden text-muted-foreground hover:text-foreground p-1"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        <div className="text-xs text-muted-foreground font-semibold mb-3 uppercase tracking-widest">
          Modules
        </div>
        {navItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <div
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_10px_rgba(0,217,255,0.1)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}

        <div className="pt-3 pb-1">
          <div className="text-xs text-muted-foreground font-semibold mb-2 uppercase tracking-widest">
            Membership
          </div>
        </div>

        <Link href="/premium">
          <div
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-all ${
              location === "/premium"
                ? "bg-yellow-400/10 text-yellow-400 border border-yellow-400/30"
                : "text-yellow-400/70 hover:text-yellow-400 hover:bg-yellow-400/5 border border-yellow-400/0 hover:border-yellow-400/20"
            }`}
          >
            <Crown className="w-4 h-4" />
            <span className="text-sm font-medium">Premium</span>
            <span className="ml-auto text-[9px] font-bold bg-yellow-400/20 text-yellow-400 px-1.5 py-0.5 rounded">
              HOT
            </span>
          </div>
        </Link>

        <Link href="/refer">
          <div
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-all ${
              location === "/refer"
                ? "bg-green-500/10 text-green-400 border border-green-500/30"
                : "text-green-400/70 hover:text-green-400 hover:bg-green-500/5 border border-green-400/0 hover:border-green-400/20"
            }`}
          >
            <Gift className="w-4 h-4" />
            <span className="text-sm font-medium">Refer & Earn</span>
          </div>
        </Link>
      </nav>

      <div className="p-4 border-t border-border mt-auto space-y-3">
        <div className="flex justify-center">
          <TokenBadge />
        </div>
        {token && (
          <button
            onClick={() => setToken(null)}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors mb-3"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        )}
        <div className="text-xs text-muted-foreground text-center">
          Developed by <span className="text-primary text-glow">@DM_CRAKA_OWNER_BOT</span>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col w-60 flex-shrink-0">
        {Sidebar}
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col md:hidden transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {Sidebar}
      </div>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-muted-foreground hover:text-primary transition-colors p-1"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            <span className="font-bold text-primary tracking-wider text-sm">CraKa OSINT</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <TokenBadge compact />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
