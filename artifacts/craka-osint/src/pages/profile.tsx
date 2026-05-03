import { useState } from "react";
import { Layout } from "@/components/layout";
import { useUserStore } from "@/lib/user-store";
import { useAuthStore } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  User, Star, Gift, Coins, Bookmark, Tag, Trash2,
  Crown, Zap, ExternalLink, Ticket, CheckCircle2, Users
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { getOrCreateSession } from "@/lib/session";
import { Link } from "wouter";

function useBookmarks(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["bookmarks", sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const res = await customFetch(`/api/user/bookmarks?sessionId=${sessionId}`);
      return res as any[];
    },
    enabled: !!sessionId,
  });
}

function useDeleteBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, sessionId }: { id: number; sessionId: string }) => {
      await customFetch(`/api/user/bookmarks/${id}?sessionId=${sessionId}`, { method: "DELETE" });
    },
    onSuccess: (_, { sessionId }) => {
      qc.invalidateQueries({ queryKey: ["bookmarks", sessionId] });
    },
  });
}

function useUserMe(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["userMe", sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const res = await customFetch(`/api/user/me?sessionId=${sessionId}`);
      return res as { referredBy: string | null; creditsEarned: number; referralCode: string };
    },
    enabled: !!sessionId,
    staleTime: 30_000,
  });
}

function useApplyReferral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, referralCode }: { sessionId: string; referralCode: string }) => {
      return customFetch("/api/user/apply-referral", {
        method: "POST",
        body: JSON.stringify({ sessionId, referralCode }),
      }) as any;
    },
    onSuccess: (_data, { sessionId }) => {
      qc.invalidateQueries({ queryKey: ["userMe", sessionId] });
      qc.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
}

function useRedeemCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, code }: { sessionId: string; code: string }) => {
      return customFetch("/api/user/redeem-coupon", {
        method: "POST",
        body: JSON.stringify({ sessionId, code }),
      }) as any;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
}

export default function Profile() {
  const { signedInUser } = useUserStore();
  const { token } = useAuthStore();
  const qc = useQueryClient();
  const { toast } = useToast();
  const sessionId = signedInUser?.sessionId || getOrCreateSession();
  const [couponCode, setCouponCode] = useState("");
  const [referralInput, setReferralInput] = useState("");

  const { data: bookmarkList = [], isLoading: bookmarksLoading } = useBookmarks(sessionId);
  const { data: userMe } = useUserMe(sessionId);
  const deleteBookmark = useDeleteBookmark();
  const redeemCoupon = useRedeemCoupon();
  const applyReferral = useApplyReferral();

  const user = signedInUser;
  const isLoggedIn = !!(signedInUser || token || sessionId);

  const handleApplyReferral = () => {
    const code = referralInput.trim().toUpperCase();
    if (!code) return;
    if (!sessionId) { toast({ title: "Error", description: "Session not found", variant: "destructive" }); return; }
    applyReferral.mutate({ sessionId, referralCode: code }, {
      onSuccess: (data) => {
        toast({ title: "Referral Applied!", description: data.message || "+5 tokens mile!" });
        setReferralInput("");
      },
      onError: (err: any) => {
        const msg = err?.data?.error || err?.message || "Failed to apply referral code";
        toast({ title: "Error", description: msg, variant: "destructive" });
      },
    });
  };

  const handleRedeemCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    if (!sessionId) { toast({ title: "Error", description: "Session not found", variant: "destructive" }); return; }
    redeemCoupon.mutate({ sessionId, code }, {
      onSuccess: (data) => {
        toast({ title: "Coupon Redeemed!", description: data.message || `+${data.credits} credits added!` });
        setCouponCode("");
        qc.invalidateQueries({ queryKey: ["currentUser"] });
      },
      onError: (err: any) => {
        const msg = err?.data?.error || err?.message || "Failed to redeem coupon";
        toast({ title: "Redemption Failed", description: msg, variant: "destructive" });
      },
    });
  };

  const handleDeleteBookmark = (id: number) => {
    if (!sessionId) return;
    deleteBookmark.mutate({ id, sessionId }, {
      onSuccess: () => toast({ title: "Bookmark removed" }),
      onError: () => toast({ title: "Failed to remove bookmark", variant: "destructive" }),
    });
  };

  const premiumBadgeColor = user?.isPremium
    ? user?.premiumPlan === "Elite" ? "text-purple-400 border-purple-400/30 bg-purple-400/10"
    : user?.premiumPlan === "Pro" ? "text-blue-400 border-blue-400/30 bg-blue-400/10"
    : "text-yellow-400 border-yellow-400/30 bg-yellow-400/10"
    : "text-muted-foreground border-border bg-muted/30";

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-3">
            <User className="w-7 h-7 sm:w-8 sm:h-8" />
            My Profile
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">Manage your account, bookmarks, and rewards.</p>
        </header>

        {/* User Identity Card */}
        <Card className="border-border bg-card/80">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              {signedInUser?.avatarUrl ? (
                <img src={signedInUser.avatarUrl} alt={signedInUser.name} className="w-16 h-16 rounded-full border-2 border-primary/30 object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center text-primary text-xl font-bold">
                  {signedInUser?.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-foreground truncate">{signedInUser?.name || "Anonymous User"}</h2>
                {signedInUser?.email && <p className="text-sm text-muted-foreground truncate">{signedInUser.email}</p>}
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline" className={`text-xs font-semibold ${premiumBadgeColor}`}>
                    {user?.isPremium ? <><Crown className="w-3 h-3 mr-1" />{user.premiumPlan || "Premium"}</> : "Free Plan"}
                  </Badge>
                  {signedInUser?.referralCode && (
                    <Badge variant="outline" className="text-xs font-mono border-border text-muted-foreground">
                      {signedInUser.referralCode}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card className="border-border bg-card/60">
            <CardContent className="p-4 flex flex-col items-center gap-1">
              <Zap className="w-6 h-6 text-yellow-400" />
              <span className="text-2xl font-bold text-foreground">{signedInUser?.creditsEarned ?? 0}</span>
              <span className="text-xs text-muted-foreground">Credits</span>
            </CardContent>
          </Card>
          <Card className="border-border bg-card/60">
            <CardContent className="p-4 flex flex-col items-center gap-1">
              <Gift className="w-6 h-6 text-green-400" />
              <span className="text-2xl font-bold text-foreground">{signedInUser?.totalReferrals ?? 0}</span>
              <span className="text-xs text-muted-foreground">Referrals</span>
            </CardContent>
          </Card>
          <Card className="border-border bg-card/60 col-span-2 sm:col-span-1">
            <CardContent className="p-4 flex flex-col items-center gap-1">
              <Bookmark className="w-6 h-6 text-primary" />
              <span className="text-2xl font-bold text-foreground">{bookmarkList.length}</span>
              <span className="text-xs text-muted-foreground">Bookmarks</span>
            </CardContent>
          </Card>
        </div>

        {/* Coupon Redeem */}
        <Card className="border-border bg-card/80">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base flex items-center gap-2">
              <Ticket className="w-4 h-4 text-primary" />
              Redeem Coupon
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                value={couponCode}
                onChange={e => setCouponCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && handleRedeemCoupon()}
                placeholder="Enter coupon code e.g. CRAKA50"
                className="font-mono tracking-wider bg-muted/50 border-border"
                disabled={redeemCoupon.isPending}
              />
              <Button
                onClick={handleRedeemCoupon}
                disabled={!couponCode.trim() || redeemCoupon.isPending}
                className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {redeemCoupon.isPending ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><CheckCircle2 className="w-4 h-4 mr-1" /> Redeem</>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Get coupon codes from admin or special promotions.</p>
          </CardContent>
        </Card>

        {/* Apply Friend's Referral Code — only show if not referred yet */}
        {!userMe?.referredBy && (
          <Card className="border-green-500/20 bg-card/80">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-green-400" />
                Friend ka Referral Code Apply Karo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex gap-2">
                <Input
                  value={referralInput}
                  onChange={e => setReferralInput(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && handleApplyReferral()}
                  placeholder="e.g. CRAKA-XXXXXX"
                  className="font-mono tracking-wider bg-muted/50 border-border"
                  disabled={applyReferral.isPending}
                />
                <Button
                  onClick={handleApplyReferral}
                  disabled={!referralInput.trim() || applyReferral.isPending}
                  className="shrink-0 bg-green-600 text-white hover:bg-green-500"
                >
                  {applyReferral.isPending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><CheckCircle2 className="w-4 h-4 mr-1" /> Apply</>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Dost ka referral code daalo — aapko <span className="text-green-400 font-semibold">+5 tokens</span> milenge!</p>
            </CardContent>
          </Card>
        )}

        {/* Bookmarks */}
        <Card className="border-border bg-card/80">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-primary" />
              Saved Lookups
              {bookmarkList.length > 0 && (
                <Badge variant="outline" className="ml-auto text-xs">{bookmarkList.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {bookmarksLoading ? (
              <div className="p-6 space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-10 bg-muted/40 rounded animate-pulse" />)}
              </div>
            ) : bookmarkList.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No bookmarks yet. Use the bookmark button on search results.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {bookmarkList.map((bm: any) => (
                  <div key={bm.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                    <Tag className="w-4 h-4 text-primary/60 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{bm.label || bm.queryVal}</p>
                      <p className="text-[10px] text-muted-foreground">{bm.apiName}</p>
                    </div>
                    <Link href={`/?slug=${bm.slug}&q=${encodeURIComponent(bm.queryVal)}`}>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-primary cursor-pointer mr-2" />
                    </Link>
                    <button
                      onClick={() => handleDeleteBookmark(bm.id)}
                      disabled={deleteBookmark.isPending}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-3 pb-4">
          <Link href="/refer">
            <Card className="border-green-500/20 bg-green-500/5 hover:bg-green-500/10 cursor-pointer transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <Gift className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-400">Refer & Earn</p>
                  <p className="text-[10px] text-muted-foreground">Invite friends for credits</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/premium">
            <Card className="border-yellow-400/20 bg-yellow-400/5 hover:bg-yellow-400/10 cursor-pointer transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <Crown className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="text-sm font-medium text-yellow-400">Go Premium</p>
                  <p className="text-[10px] text-muted-foreground">Unlimited searches</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
