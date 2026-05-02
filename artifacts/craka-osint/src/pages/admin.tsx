import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/auth";
import { 
  useAdminLogin, 
  useAdminListApis, 
  useAdminCreateApi, 
  useAdminUpdateApi, 
  useAdminDeleteApi, 
  useAdminGetStats,
  useAdminClearCache,
  useAdminGetHistory
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Shield, Lock, Activity, Database, Trash2, Plus, Edit2, KeyRound, Crown, Check, Users, HeartPulse, RefreshCw, Smartphone, FileText, CheckCircle, XCircle, Globe, Clock, Ban, Coins, Megaphone, AlertTriangle, Info, Bell, Send, ChevronDown, ChevronUp, Ticket, BarChart2, Calendar, Search } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import { useQueryClient } from "@tanstack/react-query";

function AdminLayout({ children, minimal }: { children: React.ReactNode; minimal?: boolean }) {
  const { token, setToken } = useAuthStore();
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border/60 bg-card/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-destructive/20 border border-destructive/40 flex items-center justify-center">
              <Shield className="w-4 h-4 text-destructive" />
            </div>
            <span className="font-mono font-bold text-sm tracking-widest text-destructive">CRAKA</span>
            <span className="font-mono text-xs text-muted-foreground tracking-widest">/ ADMIN</span>
          </div>
          {!minimal && token && (
            <button
              onClick={() => setToken(null)}
              className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-destructive transition-colors border border-border/50 hover:border-destructive/50 px-3 py-1.5 rounded-md"
            >
              <Lock className="w-3.5 h-3.5" />
              LOGOUT
            </button>
          )}
        </div>
      </header>
      <main className="flex-1 px-4 py-6 max-w-7xl mx-auto w-full">
        {children}
      </main>
      <footer className="border-t border-border/40 py-3 text-center text-[10px] font-mono text-muted-foreground/50 tracking-widest">
        CRAKA ADMIN PANEL — RESTRICTED ACCESS — UNAUTHORISED USE PROHIBITED
      </footer>
    </div>
  );
}

export default function Admin() {
  const { token, setToken } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totpToken, setTotpToken] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const loginMutation = useAdminLogin();
  const { toast } = useToast();
  const API_BASE_LOGIN = import.meta.env.BASE_URL.replace(/\/$/, "");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requires2FA) {
      // Submit with TOTP
      try {
        const res = await fetch(`${API_BASE_LOGIN}/api/admin/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, totpToken }),
        });
        const data = await res.json();
        if (data.success && data.token) {
          setToken(data.token);
          toast({ title: "Auth Granted", description: "Admin access verified with 2FA." });
        } else {
          toast({ title: "Invalid 2FA Code", description: data.message, variant: "destructive" });
        }
      } catch {
        toast({ title: "Error", description: "Network error", variant: "destructive" });
      }
      return;
    }
    loginMutation.mutate({ data: { username, password } }, {
      onSuccess: (res: any) => {
        if (res.success && res.token) {
          setToken(res.token);
          toast({ title: "Auth Granted", description: "Admin access verified." });
        } else if (res.requires2FA) {
          setRequires2FA(true);
          toast({ title: "2FA Required", description: "Enter your authenticator code." });
        } else {
          toast({ title: "Auth Denied", description: res.message, variant: "destructive" });
        }
      },
      onError: (err: any) => {
        toast({ title: "Auth Failed", description: err?.data?.error || "Unknown error", variant: "destructive" });
      }
    });
  };

  if (!token) {
    return (
      <AdminLayout minimal>
        <div className="flex items-center justify-center min-h-screen -mt-16">
          <Card className="w-full max-w-md bg-card/80 border-border backdrop-blur shadow-2xl">
            <CardHeader className="text-center pb-8 border-b border-border/50">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 border border-primary/30 shadow-[0_0_15px_rgba(0,217,255,0.2)]">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl tracking-widest text-glow">ROOT ACCESS</CardTitle>
              <CardDescription className="font-mono text-xs mt-2">Authentication required for restricted area</CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4 pt-8">
                <div className="space-y-2">
                  <Label className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Username</Label>
                  <div className="relative">
                    <Input 
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="pl-10 bg-muted/60 border-border font-mono"
                      autoFocus
                    />
                    <KeyRound className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Password</Label>
                  <div className="relative">
                    <Input 
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="pl-10 bg-muted/60 border-border font-mono"
                    />
                    <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
                {requires2FA && (
                  <div className="space-y-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
                    <Label className="font-mono text-xs text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5" /> 2FA Code Required
                    </Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={totpToken}
                      onChange={e => setTotpToken(e.target.value.replace(/\D/g, ""))}
                      className="bg-muted/40 border-primary/30 font-mono text-center text-xl tracking-[0.5em]"
                      autoFocus
                    />
                    <p className="text-[10px] text-muted-foreground font-mono">Enter the 6-digit code from your authenticator app</p>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full font-mono font-bold tracking-widest bg-primary text-primary-foreground hover:bg-primary/90" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? "VERIFYING..." : requires2FA ? "VERIFY 2FA" : "AUTHORIZE"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  const queryClient = useQueryClient();
  const { data: stats } = useAdminGetStats();
  const { data: apis = [] } = useAdminListApis();
  const { data: historyData } = useAdminGetHistory({ page: 1, limit: 10 });
  const clearCacheMutation = useAdminClearCache();
  const updateApiMutation = useAdminUpdateApi();
  const deleteApiMutation = useAdminDeleteApi();
  const createApiMutation = useAdminCreateApi();
  const { toast } = useToast();

  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const { token } = useAuthStore();

  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load users");
      }
      setUsers(data);
    } catch (error: any) {
      setUsersError(error.message || "Unable to load users");
    } finally {
      setUsersLoading(false);
    }
  };

  const refreshUsers = () => {
    fetchUsers();
  };

  const handleClearCache = () => {
    clearCacheMutation.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "Cache Purged", description: "System cache has been successfully cleared." });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      }
    });
  };

  const handleToggleActive = (slug: string, currentStatus: boolean) => {
    updateApiMutation.mutate({ slug, data: { isActive: !currentStatus } }, {
      onSuccess: () => {
        toast({ title: "Status Updated", description: `API ${slug} is now ${!currentStatus ? 'active' : 'inactive'}.` });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/apis"] });
      }
    });
  };

  const handleDelete = (slug: string) => {
    if (!confirm(`Are you sure you want to delete the ${slug} vector? This action cannot be undone.`)) return;
    
    deleteApiMutation.mutate({ slug }, {
      onSuccess: () => {
        toast({ title: "Vector Deleted", description: `API ${slug} has been permanently removed.` });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/apis"] });
      }
    });
  };

  const [grantCode, setGrantCode] = useState("");
  const [grantPlan, setGrantPlan] = useState("Basic");
  const [grantAmount, setGrantAmount] = useState("");
  const [granting, setGranting] = useState(false);
  const [showRecentExecutions, setShowRecentExecutions] = useState(false);

  // Ban/Unban state
  const [banReason, setBanReason] = useState("");
  const [banningCode, setBanningCode] = useState<string | null>(null);

  // Token adjust state
  const [tokenAdjustCode, setTokenAdjustCode] = useState("");
  const [tokenAdjustAmount, setTokenAdjustAmount] = useState("");
  const [tokenAdjustReason, setTokenAdjustReason] = useState("");
  const [tokenAdjusting, setTokenAdjusting] = useState(false);

  // Broadcast state
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastType, setBroadcastType] = useState("info");
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastsLoading, setBroadcastsLoading] = useState(false);

  const [apiHealth, setApiHealth] = useState<any[]>([]);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [usersExpanded, setUsersExpanded] = useState(true);
  const [userSearch, setUserSearch] = useState("");

  // Coupons state
  const [couponList, setCouponList] = useState<any[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponCredits, setCouponCredits] = useState("10");
  const [couponMaxUses, setCouponMaxUses] = useState("1");
  const [couponDesc, setCouponDesc] = useState("");
  const [couponExpiry, setCouponExpiry] = useState("");
  const [couponCreating, setCouponCreating] = useState(false);

  // API Usage state
  const [apiUsage, setApiUsage] = useState<any[]>([]);
  const [apiUsageLoading, setApiUsageLoading] = useState(false);

  // Scheduled Broadcasts state
  const [scheduledBcasts, setScheduledBcasts] = useState<any[]>([]);
  const [sbLoading, setSbLoading] = useState(false);
  const [sbTitle, setSbTitle] = useState("");
  const [sbMessage, setSbMessage] = useState("");
  const [sbType, setSbType] = useState("info");
  const [sbAt, setSbAt] = useState("");
  const [sbCreating, setSbCreating] = useState(false);

  const fetchApiHealth = async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/api-health`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load health");
      setApiHealth(Array.isArray(data.apis) ? data.apis : []);
    } catch (e: any) {
      setHealthError(e.message || "Unable to load API health");
    } finally {
      setHealthLoading(false);
    }
  };

  const fetchBroadcasts = async () => {
    setBroadcastsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/broadcasts`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setBroadcasts(Array.isArray(data) ? data : []);
    } catch { /* silent */ } finally { setBroadcastsLoading(false); }
  };

  const fetchCoupons = async () => {
    setCouponsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/coupons`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setCouponList(Array.isArray(data) ? data : []);
    } catch { } finally { setCouponsLoading(false); }
  };

  const fetchApiUsage = async () => {
    setApiUsageLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/api-usage`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setApiUsage(Array.isArray(data) ? data : []);
    } catch { } finally { setApiUsageLoading(false); }
  };

  const fetchScheduledBcasts = async () => {
    setSbLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/scheduled-broadcasts`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setScheduledBcasts(Array.isArray(data) ? data : []);
    } catch { } finally { setSbLoading(false); }
  };

  const handleCreateCoupon = async () => {
    if (!couponCode.trim() || !couponCredits) return;
    setCouponCreating(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/coupons`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: couponCode.trim().toUpperCase(), credits: Number(couponCredits), maxUses: Number(couponMaxUses) || 1, description: couponDesc, expiresAt: couponExpiry || null }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Coupon Created!", description: `Code: ${couponCode.toUpperCase()}` });
        setCouponCode(""); setCouponDesc(""); setCouponExpiry(""); setCouponCredits("10"); setCouponMaxUses("1");
        fetchCoupons();
      } else { toast({ title: "Error", description: data.error, variant: "destructive" }); }
    } catch { toast({ title: "Error", description: "Network error", variant: "destructive" }); }
    finally { setCouponCreating(false); }
  };

  const handleToggleCoupon = async (code: string) => {
    try {
      await fetch(`${API_BASE}/api/admin/coupons/${code}/toggle`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
      fetchCoupons();
    } catch { }
  };

  const handleDeleteCoupon = async (code: string) => {
    if (!confirm(`Delete coupon ${code}?`)) return;
    await fetch(`${API_BASE}/api/admin/coupons/${code}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    fetchCoupons();
  };

  const handleCreateScheduledBcast = async () => {
    if (!sbTitle.trim() || !sbMessage.trim() || !sbAt) return;
    setSbCreating(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/scheduled-broadcasts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: sbTitle.trim(), message: sbMessage.trim(), type: sbType, scheduledAt: sbAt }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Scheduled!", description: `Broadcast scheduled for ${new Date(sbAt).toLocaleString()}` });
        setSbTitle(""); setSbMessage(""); setSbAt(""); setSbType("info");
        fetchScheduledBcasts();
      } else { toast({ title: "Error", description: data.error, variant: "destructive" }); }
    } catch { toast({ title: "Error", description: "Network error", variant: "destructive" }); }
    finally { setSbCreating(false); }
  };

  const handleDeleteScheduledBcast = async (id: number) => {
    await fetch(`${API_BASE}/api/admin/scheduled-broadcasts/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    fetchScheduledBcasts();
  };

  useEffect(() => {
    if (token) {
      fetchUsers();
      fetchApiHealth();
      fetchBroadcasts();
      fetchCoupons();
      fetchApiUsage();
      fetchScheduledBcasts();
    }
  }, [token]);

  const handleBanUser = async (referralCode: string, reason: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/ban-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ referralCode, reason: reason || "Banned by admin" }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "User Banned", description: data.message });
        refreshUsers();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch { toast({ title: "Error", description: "Network error", variant: "destructive" }); }
  };

  const handleUnbanUser = async (referralCode: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/unban-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ referralCode }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "User Unbanned", description: data.message });
        refreshUsers();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch { toast({ title: "Error", description: "Network error", variant: "destructive" }); }
  };

  const handleAdjustTokens = async () => {
    if (!tokenAdjustCode.trim() || !tokenAdjustAmount) return;
    setTokenAdjusting(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/adjust-tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ referralCode: tokenAdjustCode.trim().toUpperCase(), amount: Number(tokenAdjustAmount), reason: tokenAdjustReason || "Admin adjustment" }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Tokens Adjusted", description: data.message });
        setTokenAdjustCode(""); setTokenAdjustAmount(""); setTokenAdjustReason("");
        refreshUsers();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch { toast({ title: "Error", description: "Network error", variant: "destructive" }); }
    finally { setTokenAdjusting(false); }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
    setBroadcastSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: broadcastTitle.trim(), message: broadcastMessage.trim(), type: broadcastType }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Broadcast Sent!", description: data.message });
        setBroadcastTitle(""); setBroadcastMessage(""); setBroadcastType("info");
        fetchBroadcasts();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch { toast({ title: "Error", description: "Network error", variant: "destructive" }); }
    finally { setBroadcastSending(false); }
  };

  const handleDeleteBroadcast = async (id: number) => {
    try {
      await fetch(`${API_BASE}/api/admin/broadcasts/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      fetchBroadcasts();
    } catch { /* silent */ }
  };

  const handleGrantPremium = async () => {
    if (!grantCode.trim()) return;
    setGranting(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/grant-premium`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ referralCode: grantCode.trim().toUpperCase(), plan: grantPlan, amount: grantAmount ? Number(grantAmount) : 0 }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "✅ Premium Granted!", description: data.message });
        setGrantCode("");
        setGrantAmount("");
        refreshUsers();
      } else {
        toast({ title: "Error", description: data.error || "Failed to grant premium", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally {
      setGranting(false);
    }
  };

  const handleRevokePremium = async (referralCode: string) => {
    if (!confirm(`Revoke premium for ${referralCode}?`)) return;
    setGranting(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/revoke-premium`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ referralCode }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "✅ Premium Revoked", description: data.message });
        refreshUsers();
      } else {
        toast({ title: "Error", description: data.error || "Failed to revoke premium", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally {
      setGranting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="mb-6 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-destructive flex items-center gap-3 text-glow" style={{ textShadow: '0 0 8px rgba(248, 81, 73, 0.5)' }}>
              <Shield className="w-7 h-7 sm:w-8 sm:h-8" />
              Root Control
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm">Administrative override and system management.</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" onClick={handleClearCache} disabled={clearCacheMutation.isPending} className="border-warning/50 text-warning hover:bg-warning/10 font-mono">
              <Database className="w-4 h-4 mr-2" />
              PURGE CACHE
            </Button>
            <ApiFormDialog 
              mode="create" 
              onSubmit={(data) => {
                createApiMutation.mutate({ data }, {
                  onSuccess: () => {
                    toast({ title: "Vector Created", description: "New API endpoint added successfully." });
                    queryClient.invalidateQueries({ queryKey: ["/api/admin/apis"] });
                  },
                  onError: (err: any) => toast({ title: "Creation Failed", description: err.data?.error || "Error", variant: "destructive" })
                });
              }}
            />
          </div>
        </header>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono text-muted-foreground mb-1 uppercase">Total Requests</p>
                  <h3 className="text-2xl font-bold text-foreground">{stats.totalLookups}</h3>
                </div>
                <Activity className="w-5 h-5 text-primary opacity-50" />
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono text-muted-foreground mb-1 uppercase">Failed Execs</p>
                  <h3 className="text-2xl font-bold text-destructive text-glow" style={{ textShadow: '0 0 8px rgba(248, 81, 73, 0.5)' }}>{stats.failedLookups}</h3>
                </div>
                <Shield className="w-5 h-5 text-destructive opacity-50" />
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono text-muted-foreground mb-1 uppercase">Total Vectors</p>
                  <h3 className="text-2xl font-bold text-secondary">{stats.totalApis}</h3>
                </div>
                <Database className="w-5 h-5 text-secondary opacity-50" />
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono text-muted-foreground mb-1 uppercase">Cache Hits</p>
                  <h3 className="text-2xl font-bold text-warning">{stats.cachedResults}</h3>
                </div>
                <Database className="w-5 h-5 text-warning opacity-50" />
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="bg-muted/40 border-b border-border">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Registered Users
                  <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{users.length}</span>
                </CardTitle>
                <CardDescription className="text-muted-foreground text-sm mt-1">
                  All registered users, premium status, plan, expiry and controls.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost" size="sm"
                  onClick={refreshUsers}
                  disabled={usersLoading}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${usersLoading ? "animate-spin" : ""}`} />
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => setUsersExpanded(p => !p)}
                  className="h-8 px-3 font-mono text-xs gap-1.5"
                  title={usersExpanded ? "Collapse users list" : "Expand users list"}
                >
                  {usersExpanded ? <><ChevronUp className="w-4 h-4" />Hide</> : <><ChevronDown className="w-4 h-4" />Show ({users.length})</>}
                </Button>
              </div>
            </div>
            {usersExpanded && (
              <div className="mt-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter by email, name, code, plan..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="pl-9 bg-muted/30 border-border h-9"
                  />
                </div>
              </div>
            )}
          </CardHeader>
          {usersExpanded && (
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Referrals</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right min-w-[220px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                    const q = userSearch.toLowerCase();
                    const filtered = q ? users.filter(u =>
                      (u.email || "").toLowerCase().includes(q) ||
                      (u.referralCode || "").toLowerCase().includes(q) ||
                      (u.displayName || "").toLowerCase().includes(q) ||
                      (u.premiumPlan || "").toLowerCase().includes(q)
                    ) : users;
                    if (filtered.length === 0) return (
                      <TableRow className="border-border hover:bg-muted/30">
                        <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">
                          {usersError || (q ? "No users match your search." : "No users yet.")}
                        </TableCell>
                      </TableRow>
                    );
                    return filtered.map((user) => (
                    <TableRow key={user.referralCode} className={`border-border hover:bg-muted/30 ${user.isBanned ? "bg-destructive/5" : ""}`}>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-xs text-foreground font-semibold">{user.referralCode}</span>
                          {user.email && <span className="text-[10px] text-muted-foreground truncate max-w-[130px]">{user.email}</span>}
                          {user.displayName && <span className="text-[10px] text-primary/70">{user.displayName}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {user.isBanned ? (
                            <Badge variant="outline" className="border-red-500 text-red-400 bg-red-500/10 text-[10px]">BANNED</Badge>
                          ) : user.isPremium ? (
                            <Badge variant="outline" className="border-emerald-500 text-emerald-400 bg-emerald-500/10 text-[10px]">PREMIUM</Badge>
                          ) : (
                            <Badge variant="outline" className="border-zinc-600 text-muted-foreground text-[10px]">FREE</Badge>
                          )}
                          {user.isBanned && user.banReason && (
                            <span className="text-[9px] text-red-400/70 max-w-[100px] truncate">{user.banReason}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{user.premiumPlan || "—"}</TableCell>
                      <TableCell>
                        <span className="font-mono text-sm font-bold text-primary">{user.creditsEarned}</span>
                      </TableCell>
                      <TableCell>{user.totalReferrals}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end flex-wrap">
                          {user.isPremium ? (
                            <Button variant="outline" size="sm" onClick={() => handleRevokePremium(user.referralCode)} className="h-7 text-xs px-2">
                              Revoke
                            </Button>
                          ) : (
                            <Button variant="secondary" size="sm" onClick={() => { setGrantCode(user.referralCode); setGrantPlan("Basic"); }} className="h-7 text-xs px-2">
                              <Crown className="w-3 h-3 mr-1" />Grant
                            </Button>
                          )}
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => { setTokenAdjustCode(user.referralCode); }}
                            className="h-7 text-xs px-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10"
                            title="Adjust tokens"
                          >
                            <Coins className="w-3 h-3" />
                          </Button>
                          {user.isBanned ? (
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => handleUnbanUser(user.referralCode)}
                              className="h-7 text-xs px-2 text-emerald-400 hover:bg-emerald-400/10"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />Unban
                            </Button>
                          ) : (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-destructive hover:bg-destructive/10">
                                  <Ban className="w-3 h-3 mr-1" />Ban
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-card border-border">
                                <DialogHeader>
                                  <DialogTitle className="text-destructive flex items-center gap-2"><Ban className="w-4 h-4" />Ban User — {user.referralCode}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3 py-2">
                                  <Label className="text-xs font-mono text-muted-foreground">Ban Reason (optional)</Label>
                                  <Input
                                    placeholder="e.g. Spam, abuse, TOS violation..."
                                    value={banningCode === user.referralCode ? banReason : ""}
                                    onChange={e => { setBanningCode(user.referralCode); setBanReason(e.target.value); }}
                                    className="bg-muted/50 border-border"
                                  />
                                </div>
                                <DialogFooter>
                                  <Button
                                    variant="destructive"
                                    onClick={() => { handleBanUser(user.referralCode, banningCode === user.referralCode ? banReason : ""); setBanReason(""); setBanningCode(null); }}
                                  >
                                    <Ban className="w-4 h-4 mr-2" />Confirm Ban
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ));
                  })()}
              </TableBody>
            </Table>
            </div>
          </CardContent>
          )}
        </Card>

        {/* API Usage Chart */}
        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="bg-muted/40 border-b border-border flex items-center justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary" />
              API Usage Chart (Last 30 Days)
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchApiUsage} disabled={apiUsageLoading} className="h-9 gap-2">
              <RefreshCw className={`w-3.5 h-3.5 ${apiUsageLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="p-4">
            {apiUsage.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                {apiUsageLoading ? "Loading..." : "No usage data available yet."}
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={apiUsage} margin={{ top: 4, right: 4, left: -20, bottom: 30 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#888" }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      cursor={{ fill: "hsl(var(--muted)/0.3)" }}
                      formatter={(value: any, name: string) => [value, name === "total" ? "Total" : "Success"]}
                    />
                    <Bar dataKey="total" name="total" fill="hsl(var(--primary))" radius={[3,3,0,0]} maxBarSize={40} />
                    <Bar dataKey="success" name="success" fill="#10b981" radius={[3,3,0,0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coupons / Promo Codes */}
        <Card className="bg-gradient-to-r from-purple-900/10 to-purple-700/10 border-purple-500/30 overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-purple-500/20 pb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-purple-400">
              <Ticket className="w-5 h-5" />
              Coupon / Promo Codes
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Create discount/promo codes that users can redeem for credits.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Code</Label>
                <Input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="SUMMER50" className="bg-muted/50 border-purple-500/30 font-mono uppercase" />
              </div>
              <div>
                <Label className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Credits</Label>
                <Input type="number" value={couponCredits} onChange={e => setCouponCredits(e.target.value)} placeholder="50" className="bg-muted/50 border-purple-500/30 font-mono" />
              </div>
              <div>
                <Label className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Max Uses</Label>
                <Input type="number" value={couponMaxUses} onChange={e => setCouponMaxUses(e.target.value)} placeholder="1" className="bg-muted/50 border-purple-500/30 font-mono" />
              </div>
              <div>
                <Label className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Description</Label>
                <Input value={couponDesc} onChange={e => setCouponDesc(e.target.value)} placeholder="Optional description..." className="bg-muted/50 border-purple-500/30" />
              </div>
              <div>
                <Label className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Expires At</Label>
                <Input type="datetime-local" value={couponExpiry} onChange={e => setCouponExpiry(e.target.value)} className="bg-muted/50 border-purple-500/30" />
              </div>
              <div className="sm:self-end">
                <Button onClick={handleCreateCoupon} disabled={couponCreating || !couponCode.trim() || !couponCredits} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold">
                  {couponCreating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Create Coupon
                </Button>
              </div>
            </div>
            {couponList.length > 0 && (
              <div className="mt-4 border-t border-purple-500/20 pt-4 overflow-x-auto">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">All Coupons</p>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead>Code</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Uses</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {couponList.map(c => (
                      <TableRow key={c.code} className="border-border hover:bg-muted/30">
                        <TableCell className="font-mono font-bold text-purple-400">{c.code}</TableCell>
                        <TableCell><span className="font-mono text-primary font-bold">+{c.credits}</span></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.usedCount ?? 0}/{c.maxUses}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "Never"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={c.isActive ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10 text-[10px]" : "border-zinc-600 text-muted-foreground text-[10px]"}>
                            {c.isActive ? "ACTIVE" : "OFF"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="outline" size="sm" onClick={() => handleToggleCoupon(c.code)} className="h-7 text-xs px-2">
                              {c.isActive ? "Disable" : "Enable"}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteCoupon(c.code)} className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scheduled Broadcasts */}
        <Card className="bg-gradient-to-r from-indigo-900/10 to-indigo-700/10 border-indigo-500/30 overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-indigo-500/20 pb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-indigo-400">
              <Calendar className="w-5 h-5" />
              Scheduled Broadcasts
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Future mein automatically broadcast karne ke liye schedule karo.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Title</Label>
                <Input value={sbTitle} onChange={e => setSbTitle(e.target.value)} placeholder="Announcement title..." className="bg-muted/50 border-indigo-500/30" />
              </div>
              <div>
                <Label className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Type</Label>
                <select value={sbType} onChange={e => setSbType(e.target.value)} className="w-full h-10 rounded-md border border-indigo-500/30 bg-muted/50 text-foreground px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="danger">Danger</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Message</Label>
                <textarea value={sbMessage} onChange={e => setSbMessage(e.target.value)} rows={2} placeholder="Broadcast message..." className="w-full rounded-md border border-indigo-500/30 bg-muted/50 text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none" />
              </div>
              <div>
                <Label className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Scheduled At</Label>
                <Input type="datetime-local" value={sbAt} onChange={e => setSbAt(e.target.value)} className="bg-muted/50 border-indigo-500/30" />
              </div>
              <div className="sm:self-end">
                <Button onClick={handleCreateScheduledBcast} disabled={sbCreating || !sbTitle.trim() || !sbMessage.trim() || !sbAt} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
                  {sbCreating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : <Calendar className="w-4 h-4 mr-2" />}
                  Schedule
                </Button>
              </div>
            </div>
            {scheduledBcasts.length > 0 && (
              <div className="mt-4 border-t border-indigo-500/20 pt-4 space-y-2 max-h-64 overflow-y-auto pr-1">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Upcoming Scheduled</p>
                {scheduledBcasts.map(sb => (
                  <div key={sb.id} className="flex items-start gap-3 p-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5 text-sm">
                    <Calendar className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{sb.title}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">{sb.message}</p>
                      <p className="text-[10px] text-indigo-400/70 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(sb.scheduledAt).toLocaleString()}
                        {sb.sent && <Badge variant="outline" className="ml-2 text-[9px] border-emerald-500/40 text-emerald-400 bg-emerald-500/10">SENT</Badge>}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteScheduledBcast(sb.id)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-400/5 to-yellow-400/10 border-yellow-400/30 overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-yellow-400/20 pb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-yellow-400">
              <Crown className="w-5 h-5" />
              Grant Premium to User
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              User ka User ID (referral code, e.g. CRAKA-A9TJ4W) enter karo aur plan select karo.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  User ID / Referral Code
                </Label>
                <Input
                  value={grantCode}
                  onChange={e => setGrantCode(e.target.value.toUpperCase())}
                  placeholder="CRAKA-XXXXXX"
                  className="bg-muted/50 border-yellow-400/30 font-mono uppercase focus-visible:ring-yellow-400/50"
                  onKeyDown={e => e.key === "Enter" && handleGrantPremium()}
                />
              </div>
              <div className="sm:w-28">
                <Label className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Amount Paid (₹)
                </Label>
                <Input
                  type="number"
                  value={grantAmount}
                  onChange={e => setGrantAmount(e.target.value)}
                  placeholder="₹"
                  className="bg-muted/50 border-yellow-400/30 font-mono focus-visible:ring-yellow-400/50"
                  onKeyDown={e => e.key === "Enter" && handleGrantPremium()}
                />
              </div>
              <div className="sm:w-36">
                <Label className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Plan
                </Label>
                <select
                  value={grantPlan}
                  onChange={e => setGrantPlan(e.target.value)}
                  className="w-full h-10 rounded-md border border-yellow-400/30 bg-muted/50 text-foreground px-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                >
                  <option value="Basic">Basic</option>
                  <option value="Pro">Pro</option>
                  <option value="Elite">Elite</option>
                </select>
              </div>
              <div className="sm:self-end">
                <Button
                  onClick={handleGrantPremium}
                  disabled={granting || !grantCode.trim()}
                  className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-400 text-black font-bold tracking-wider h-10 px-6"
                >
                  {granting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Granting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Crown className="w-4 h-4" />
                      Grant Premium
                    </span>
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              💡 Premium ko 30 din ke liye grant kiya jayega. User page pe expiry date dekh sakta hai.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="bg-muted/40 border-b border-border">
            <CardTitle className="text-lg">Registered Vectors</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-14">Toggle</TableHead>
                <TableHead className="w-20">State</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Credits</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apis.map(api => (
                <TableRow key={api.id} className="border-border hover:bg-muted/30">
                  <TableCell>
                    <button
                      onClick={() => handleToggleActive(api.slug, api.isActive)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        api.isActive ? "bg-green-500" : "bg-zinc-600"
                      }`}
                      title={api.isActive ? "Active — click to deactivate" : "Inactive — click to activate"}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          api.isActive ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </TableCell>
                  <TableCell>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      api.isActive
                        ? "bg-green-500/10 text-green-400 border-green-500/30"
                        : "bg-red-500/10 text-red-400 border-red-500/30"
                    }`}>
                      {api.isActive ? "ACTIVE" : "OFF"}
                    </span>
                  </TableCell>
                  <TableCell className="font-bold text-foreground">{api.name}</TableCell>
                  <TableCell className="font-mono text-xs text-secondary">{api.slug}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-primary/30 text-primary/80 text-[10px]">
                      {api.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{api.credits}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <ApiFormDialog 
                      mode="edit" 
                      initialData={api}
                      onSubmit={(data) => {
                        updateApiMutation.mutate({ slug: api.slug, data }, {
                          onSuccess: () => {
                            toast({ title: "Vector Updated", description: "API endpoint modified successfully." });
                            queryClient.invalidateQueries({ queryKey: ["/api/admin/apis"] });
                          }
                        });
                      }}
                    />
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(api.slug)} className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </Card>
        
        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="bg-muted/40 border-b border-border flex items-center justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-emerald-400" />
              API Health Monitor
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchApiHealth} disabled={healthLoading} className="h-9 gap-2">
              <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {healthError ? (
              <div className="p-4 text-destructive text-sm">{healthError}</div>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>API</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">24h Total</TableHead>
                    <TableHead className="text-right">24h Success %</TableHead>
                    <TableHead className="text-right">All-time</TableHead>
                    <TableHead className="text-right">All-time %</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead className="text-right">Cache TTL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiHealth.length === 0 && !healthLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-6 text-sm">
                        No data yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    apiHealth.map((row) => {
                      const tone =
                        row.status === "healthy"
                          ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                          : row.status === "degraded"
                            ? "border-yellow-500/40 text-yellow-400 bg-yellow-500/10"
                            : row.status === "down"
                              ? "border-rose-500/40 text-rose-400 bg-rose-500/10"
                              : "border-zinc-600/40 text-muted-foreground bg-zinc-700/20";
                      return (
                        <TableRow key={row.slug} className="border-border hover:bg-muted/30">
                          <TableCell>
                            <div className="font-bold text-foreground">{row.name}</div>
                            <div className="font-mono text-[11px] text-muted-foreground">{row.slug}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`uppercase tracking-wider text-[10px] ${tone}`}>
                              {row.status}
                            </Badge>
                            {!row.isActive && (
                              <Badge variant="outline" className="ml-1 border-zinc-600 text-muted-foreground text-[10px]">
                                OFF
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">{row.total24h}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {row.successRate24h === null ? "—" : `${row.successRate24h}%`}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-muted-foreground">{row.totalRequests}</TableCell>
                          <TableCell className="text-right font-mono text-sm text-muted-foreground">
                            {row.successRate === null ? "—" : `${row.successRate}%`}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {row.lastUsedAt ? new Date(row.lastUsedAt).toLocaleString() : "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">
                            {Math.round((row.cacheTtlSeconds ?? 1800) / 60)}m
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="bg-muted/40 border-b border-border flex items-center justify-between gap-4">
            <CardTitle className="text-lg">Recent Executions</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowRecentExecutions(prev => !prev)} className="h-9">
              {showRecentExecutions ? "Hide" : "Show"}
            </Button>
          </CardHeader>
          {showRecentExecutions && (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Timestamp</TableHead>
                <TableHead>Vector</TableHead>
                <TableHead>Query</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyData?.entries?.map((entry: any) => (
                <TableRow key={entry.id} className="border-border hover:bg-muted/30">
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium text-primary">{entry.apiName}</TableCell>
                  <TableCell className="font-mono text-sm">{entry.queryVal}</TableCell>
                  <TableCell className="text-right">
                    {entry.success ? (
                      <Badge variant="outline" className="text-success border-success/30 bg-success/10">OK</Badge>
                    ) : (
                      <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10">FAIL</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
          )}
        </Card>

        {/* Token Adjustment */}
        <Card className="bg-gradient-to-r from-yellow-900/10 to-yellow-700/10 border-yellow-600/30 overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-yellow-600/20 pb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-yellow-400">
              <Coins className="w-5 h-5" />
              Adjust User Tokens
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Kisi bhi user ke tokens manually add ya deduct karo. Negative value for deduction.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">User ID</Label>
                <Input
                  value={tokenAdjustCode}
                  onChange={e => setTokenAdjustCode(e.target.value.toUpperCase())}
                  placeholder="CRAKA-XXXXXX"
                  className="bg-muted/50 border-yellow-600/30 font-mono uppercase"
                />
              </div>
              <div className="sm:w-32">
                <Label className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Amount</Label>
                <Input
                  type="number"
                  value={tokenAdjustAmount}
                  onChange={e => setTokenAdjustAmount(e.target.value)}
                  placeholder="+100 or -50"
                  className="bg-muted/50 border-yellow-600/30 font-mono"
                />
              </div>
              <div className="flex-1">
                <Label className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Reason</Label>
                <Input
                  value={tokenAdjustReason}
                  onChange={e => setTokenAdjustReason(e.target.value)}
                  placeholder="Reason (optional)"
                  className="bg-muted/50 border-yellow-600/30"
                />
              </div>
              <div className="sm:self-end">
                <Button
                  onClick={handleAdjustTokens}
                  disabled={tokenAdjusting || !tokenAdjustCode.trim() || !tokenAdjustAmount}
                  className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-500 text-black font-bold h-10 px-5"
                >
                  {tokenAdjusting ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><Coins className="w-4 h-4 mr-2" />Apply</>}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Broadcast */}
        <Card className="bg-gradient-to-r from-blue-900/10 to-blue-700/10 border-blue-500/30 overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-blue-500/20 pb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-blue-400">
              <Megaphone className="w-5 h-5" />
              Broadcast to All Users
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Saare users ko ek notification/announcement bhejo. Users ke home page pe dikhega.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Title</Label>
                <Input
                  value={broadcastTitle}
                  onChange={e => setBroadcastTitle(e.target.value)}
                  placeholder="Announcement title..."
                  className="bg-muted/50 border-blue-500/30"
                />
              </div>
              <div className="sm:w-32">
                <Label className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Type</Label>
                <select
                  value={broadcastType}
                  onChange={e => setBroadcastType(e.target.value)}
                  className="w-full h-10 rounded-md border border-blue-500/30 bg-muted/50 text-foreground px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="danger">Danger</option>
                </select>
              </div>
            </div>
            <div>
              <Label className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Message</Label>
              <textarea
                value={broadcastMessage}
                onChange={e => setBroadcastMessage(e.target.value)}
                placeholder="Broadcast message yahan likhein..."
                rows={3}
                className="w-full rounded-md border border-blue-500/30 bg-muted/50 text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSendBroadcast}
                disabled={broadcastSending || !broadcastTitle.trim() || !broadcastMessage.trim()}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6"
              >
                {broadcastSending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Send Broadcast
              </Button>
            </div>

            {/* Broadcast history */}
            {broadcasts.length > 0 && (
              <div className="mt-4 border-t border-blue-500/20 pt-4">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Sent Broadcasts</p>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {broadcasts.map(b => (
                    <div key={b.id} className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
                      b.type === "success" ? "border-emerald-500/30 bg-emerald-500/5" :
                      b.type === "warning" ? "border-yellow-500/30 bg-yellow-500/5" :
                      b.type === "danger" ? "border-red-500/30 bg-red-500/5" :
                      "border-blue-500/30 bg-blue-500/5"
                    }`}>
                      <div className="mt-0.5">
                        {b.type === "success" ? <CheckCircle className="w-4 h-4 text-emerald-400" /> :
                         b.type === "warning" ? <AlertTriangle className="w-4 h-4 text-yellow-400" /> :
                         b.type === "danger" ? <XCircle className="w-4 h-4 text-red-400" /> :
                         <Info className="w-4 h-4 text-blue-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">{b.title}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">{b.message}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">{new Date(b.createdAt).toLocaleString()}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteBroadcast(b.id)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <LoginLogsSection />
        <TwoFASection />
      </div>
    </AdminLayout>
  );
}

function LoginLogsSection() {
  const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const { token } = useAuthStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const { toast } = useToast();

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/login-logs?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch logs");
      setLogs(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShow = () => {
    if (!show) fetchLogs();
    setShow((s) => !s);
  };

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader className="bg-muted/40 border-b border-border flex items-center justify-between gap-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          User Login Logs
        </CardTitle>
        <div className="flex gap-2">
          {show && (
            <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading} className="h-9 gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleShow} className="h-9">
            {show ? "Hide" : "Show Logs"}
          </Button>
        </div>
      </CardHeader>
      {show && (
        <CardContent className="p-0">
          {error ? (
            <div className="p-4 text-destructive text-sm">{error}</div>
          ) : logs.length === 0 && !loading ? (
            <div className="p-6 text-center text-muted-foreground text-sm">No login events recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Time</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>User Agent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="border-border hover:bg-muted/30">
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-foreground">{log.email || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${log.method === "google" ? "border-blue-500/40 text-blue-400 bg-blue-500/10" : "border-purple-500/40 text-purple-400 bg-purple-500/10"}`}>
                        {log.method}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {log.ipAddress || "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.status === "success" ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle className="w-3.5 h-3.5" /> OK</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-destructive"><XCircle className="w-3.5 h-3.5" /> {log.status}</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground max-w-[200px] truncate" title={log.userAgent}>
                      {log.userAgent || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function TwoFASection() {
  const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const { token } = useAuthStore();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ enabled: boolean } | null>(null);
  const [setup, setSetup] = useState<{ secret: string; qrCode: string; instructions: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; message: string } | null>(null);
  const { toast } = useToast();

  const fetchStatus = async () => {
    const res = await fetch(`${API_BASE}/api/admin/2fa/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setStatus(data);
  };

  const handleSetup = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/2fa/setup`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSetup(data);
      setVerifyResult(null);
    } catch {
      toast({ title: "Error", description: "Failed to generate 2FA setup", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!setup?.secret || !verifyCode) return;
    const res = await fetch(`${API_BASE}/api/admin/2fa/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ secret: setup.secret, token: verifyCode }),
    });
    const data = await res.json();
    setVerifyResult(data);
  };

  const handleShow = () => {
    if (!show) fetchStatus();
    setShow((s) => !s);
  };

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader className="bg-muted/40 border-b border-border flex items-center justify-between gap-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-primary" />
          Admin 2FA (TOTP)
        </CardTitle>
        <Button variant="outline" size="sm" onClick={handleShow} className="h-9">
          {show ? "Hide" : "Configure 2FA"}
        </Button>
      </CardHeader>
      {show && (
        <CardContent className="pt-5 space-y-4">
          {status && (
            <div className={`flex items-center gap-2 text-sm rounded-lg px-4 py-3 border ${status.enabled ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400" : "border-yellow-500/30 bg-yellow-500/5 text-yellow-400"}`}>
              {status.enabled ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {status.enabled ? "2FA is currently ENABLED on this admin account." : "2FA is currently DISABLED. Set it up below to secure your admin panel."}
            </div>
          )}

          {!setup ? (
            <Button onClick={handleSetup} disabled={loading} className="bg-primary text-primary-foreground font-mono font-bold">
              <Smartphone className="w-4 h-4 mr-2" />
              {loading ? "Generating..." : "Generate 2FA QR Code"}
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4 items-start">
                <div className="flex flex-col items-center gap-3 p-4 rounded-lg border border-border bg-muted/30">
                  <p className="text-xs text-muted-foreground font-mono">Scan with Google Authenticator / Authy</p>
                  <img src={setup.qrCode} alt="2FA QR Code" className="w-40 h-40 rounded-lg border border-border bg-white p-1" />
                  <div className="w-full">
                    <p className="text-[10px] text-muted-foreground font-mono mb-1">Manual entry key:</p>
                    <code className="block text-xs text-primary bg-muted/50 border border-border rounded px-2 py-1.5 break-all font-mono">{setup.secret}</code>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                    <p className="text-xs text-amber-400 font-mono">{setup.instructions}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Verify Code (before saving)</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                      className="bg-muted/40 border-border font-mono text-center text-xl tracking-[0.5em]"
                    />
                    <Button onClick={handleVerify} disabled={verifyCode.length !== 6} className="w-full font-mono bg-primary text-primary-foreground">
                      VERIFY CODE
                    </Button>
                  </div>
                  {verifyResult && (
                    <div className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2.5 border ${verifyResult.valid ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400" : "border-destructive/30 bg-destructive/5 text-destructive"}`}>
                      {verifyResult.valid ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                      <span className="text-xs font-mono">{verifyResult.message}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function ApiFormDialog({ mode, initialData, onSubmit }: { mode: 'create' | 'edit', initialData?: any, onSubmit: (data: any) => void }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(initialData || {
    name: "", slug: "", url: "", command: "", example: "", category: "Phone", credits: 1, pattern: "", isActive: true, cacheTtlSeconds: 1800
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      credits: Number(formData.credits),
      cacheTtlSeconds: Number(formData.cacheTtlSeconds ?? 1800),
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === 'create' ? (
          <Button className="bg-primary text-primary-foreground font-mono">
            <Plus className="w-4 h-4 mr-2" /> NEW VECTOR
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10">
            <Edit2 className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-glow text-primary font-mono uppercase tracking-widest">
            {mode === 'create' ? "Register New Vector" : "Modify Vector Config"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-mono text-xs text-muted-foreground">Name</Label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-muted/50 border-border" required />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs text-muted-foreground">Slug</Label>
              <Input value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} disabled={mode === 'edit'} className="bg-muted/50 border-border" required />
            </div>
            <div className="space-y-2 col-span-2">
              <Label className="font-mono text-xs text-muted-foreground">URL Endpoint</Label>
              <Input value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} className="bg-muted/50 border-border font-mono text-sm" required />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs text-muted-foreground">Category</Label>
              <Input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="bg-muted/50 border-border" required />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs text-muted-foreground">Credits</Label>
              <Input type="number" value={formData.credits} onChange={e => setFormData({...formData, credits: e.target.value})} className="bg-muted/50 border-border" required min="0" />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs text-muted-foreground">Command Hint</Label>
              <Input value={formData.command} onChange={e => setFormData({...formData, command: e.target.value})} className="bg-muted/50 border-border" required />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs text-muted-foreground">Example Query</Label>
              <Input value={formData.example} onChange={e => setFormData({...formData, example: e.target.value})} className="bg-muted/50 border-border" required />
            </div>
            <div className="space-y-2 col-span-2">
              <Label className="font-mono text-xs text-muted-foreground">Regex Pattern (optional)</Label>
              <Input value={formData.pattern || ""} onChange={e => setFormData({...formData, pattern: e.target.value})} className="bg-muted/50 border-border font-mono text-sm" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label className="font-mono text-xs text-muted-foreground">
                Cache TTL (seconds) — 0 disables, max 86400 (24h). Default 1800 (30 min).
              </Label>
              <Input
                type="number"
                value={formData.cacheTtlSeconds ?? 1800}
                onChange={e => setFormData({...formData, cacheTtlSeconds: e.target.value})}
                className="bg-muted/50 border-border font-mono text-sm"
                min="0"
                max="86400"
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-border">Cancel</Button>
            <Button type="submit" className="bg-primary text-primary-foreground font-mono font-bold tracking-widest hover:bg-primary/90">
              {mode === 'create' ? "DEPLOY" : "UPDATE"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
