import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Receipt, RefreshCw, ArrowDownCircle, ArrowUpCircle, Crown, Gift, Sparkles } from "lucide-react";
import { getOrCreateSession } from "@/lib/session";
import { useT } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/user";

interface Txn {
  id: number;
  type: "spend" | "refund" | "earn" | "grant" | "bonus" | "init";
  amount: number;
  reason: string;
  balanceAfter: number;
  createdAt: string;
}

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const TYPE_ICON: Record<string, typeof ArrowDownCircle> = {
  spend: ArrowDownCircle,
  refund: ArrowUpCircle,
  earn: Gift,
  grant: Crown,
  bonus: Sparkles,
  init: Sparkles,
};

const TYPE_TONE: Record<string, string> = {
  spend:  "text-rose-400 border-rose-500/30 bg-rose-500/10",
  refund: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  earn:   "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  grant:  "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
  bonus:  "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  init:   "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
};

export default function Transactions() {
  const { t } = useT();
  const { data: user } = useCurrentUser();
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTxns = async () => {
    setLoading(true);
    setError(null);
    try {
      const sessionId = getOrCreateSession();
      const res = await fetch(`${API_BASE}/api/user/transactions?sessionId=${encodeURIComponent(sessionId)}&limit=200`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTxns(Array.isArray(data.entries) ? data.entries : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTxns();
  }, []);

  const summary = useMemo(() => {
    let totalEarned = 0;
    let totalSpent = 0;
    for (const tx of txns) {
      if (tx.amount > 0) totalEarned += tx.amount;
      else totalSpent += -tx.amount;
    }
    return { totalEarned, totalSpent, count: txns.length };
  }, [txns]);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-glow text-primary flex items-center gap-3">
              <Receipt className="w-7 h-7" />
              {t("txn.title", "Token Transactions")}
            </h1>
            <p className="text-muted-foreground mt-2">{t("txn.subtitle", "Every credit you earned, spent or got refunded.")}</p>
          </div>
          <Button variant="outline" onClick={fetchTxns} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {t("btn.refresh", "Refresh")}
          </Button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("tokens.label", "Tokens")}</p>
              <p className="text-2xl font-bold text-primary text-glow">
                {user?.isPremium && user?.premiumPlan?.toLowerCase() === "elite" ? "∞" : (user?.creditsEarned ?? 0)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Earned</p>
              <p className="text-2xl font-bold text-emerald-400">+{summary.totalEarned}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Spent</p>
              <p className="text-2xl font-bold text-rose-400">-{summary.totalSpent}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border">
            <CardTitle className="text-base">History</CardTitle>
            <CardDescription>Showing last {txns.length} transactions</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {error ? (
              <div className="p-6 text-center text-destructive text-sm">{error}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="whitespace-nowrap">{t("txn.col.time", "Time")}</TableHead>
                    <TableHead>{t("txn.col.type", "Type")}</TableHead>
                    <TableHead className="text-right">{t("txn.col.amount", "Amount")}</TableHead>
                    <TableHead>{t("txn.col.reason", "Reason")}</TableHead>
                    <TableHead className="text-right">{t("txn.col.balance", "Balance")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && txns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6 text-sm">
                        {t("txn.loading", "Loading…")}
                      </TableCell>
                    </TableRow>
                  ) : txns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6 text-sm">
                        {t("txn.empty", "No transactions yet.")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    txns.map(tx => {
                      const Icon = TYPE_ICON[tx.type] ?? Sparkles;
                      const tone = TYPE_TONE[tx.type] ?? TYPE_TONE.bonus;
                      return (
                        <TableRow key={tx.id} className="border-border hover:bg-muted/30">
                          <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(tx.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`${tone} font-mono text-[10px]`}>
                              <Icon className="w-3 h-3 mr-1" />
                              {t(`txn.type.${tx.type}`, tx.type.toUpperCase())}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-mono font-bold ${tx.amount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {tx.amount >= 0 ? `+${tx.amount}` : tx.amount}
                          </TableCell>
                          <TableCell className="text-sm">{tx.reason}</TableCell>
                          <TableCell className="text-right font-mono text-sm text-foreground">{tx.balanceAfter}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
