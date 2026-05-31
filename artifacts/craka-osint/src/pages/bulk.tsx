import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, Play, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useListApis } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

interface BulkResult {
  query: string;
  status: "pending" | "running" | "success" | "error";
  data?: any;
  error?: string;
}

export default function Bulk() {
  const { data: apis = [], isLoading } = useListApis();
  const { toast } = useToast();

  const [selectedSlug, setSelectedSlug] = useState("");
  const [queriesText, setQueriesText] = useState("");
  const [results, setResults] = useState<BulkResult[]>([]);
  const [running, setRunning] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const activeApis = apis.filter(a => a.isActive);
  const selectedApi = activeApis.find(a => a.slug === selectedSlug);

  const handleRun = async () => {
    const queries = queriesText
      .split("\n")
      .map(q => q.trim())
      .filter(Boolean);

    if (!selectedSlug) {
      toast({ title: "Tool select karo", description: "Pehle ek OSINT tool choose karo.", variant: "destructive" });
      return;
    }
    if (queries.length === 0) {
      toast({ title: "Queries daalo", description: "Ek line mein ek query likho.", variant: "destructive" });
      return;
    }
    if (queries.length > 20) {
      toast({ title: "Zyada queries", description: "Max 20 queries ek baar mein.", variant: "destructive" });
      return;
    }

    const sessionId = localStorage.getItem("craka_session_id") || "";
    const initial: BulkResult[] = queries.map(q => ({ query: q, status: "pending" }));
    setResults(initial);
    setRunning(true);
    setExpandedIdx(null);

    for (let i = 0; i < queries.length; i++) {
      setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: "running" } : r));
      try {
        const res = await fetch("/api/osint/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: selectedSlug, query: queries[i], sessionId }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setResults(prev => prev.map((r, idx) =>
            idx === i ? { ...r, status: "error", error: json.error || "Lookup failed" } : r
          ));
        } else {
          setResults(prev => prev.map((r, idx) =>
            idx === i ? { ...r, status: "success", data: json.data } : r
          ));
        }
      } catch (e: any) {
        setResults(prev => prev.map((r, idx) =>
          idx === i ? { ...r, status: "error", error: e.message || "Network error" } : r
        ));
      }
      await new Promise(r => setTimeout(r, 300));
    }
    setRunning(false);
    toast({ title: "Bulk lookup complete!", description: `${queries.length} queries processed.` });
  };

  const successCount = results.filter(r => r.status === "success").length;
  const errorCount = results.filter(r => r.status === "error").length;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-3">
            <Layers className="w-7 h-7 sm:w-8 sm:h-8" />
            Bulk Lookup
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">Ek saath multiple queries run karo — ek line mein ek query.</p>
        </header>

        <Card className="border-border bg-card">
          <CardHeader className="pb-4 border-b border-border">
            <CardTitle className="text-base">Configure</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-2 block">
                OSINT Tool
              </label>
              {isLoading ? (
                <div className="h-10 bg-muted/30 rounded animate-pulse" />
              ) : (
                <select
                  value={selectedSlug}
                  onChange={e => setSelectedSlug(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">— Select tool —</option>
                  {activeApis.map(api => (
                    <option key={api.slug} value={api.slug}>
                      {api.name} ({api.category}) — {api.credits}c each
                    </option>
                  ))}
                </select>
              )}
              {selectedApi && (
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Example: <span className="text-primary font-mono">{selectedApi.example}</span>
                </p>
              )}
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-2 block">
                Queries <span className="text-muted-foreground/50 normal-case font-normal">(max 20, ek line mein ek)</span>
              </label>
              <textarea
                value={queriesText}
                onChange={e => setQueriesText(e.target.value)}
                placeholder={selectedApi ? `${selectedApi.example}\n${selectedApi.example}\n...` : "Pehle tool select karo..."}
                rows={8}
                className="w-full rounded-md border border-border bg-black/40 text-foreground font-mono text-sm px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary resize-none placeholder:text-muted-foreground/40"
                disabled={!selectedSlug}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {queriesText.split("\n").filter(q => q.trim()).length} / 20 queries
              </p>
            </div>

            <Button
              onClick={handleRun}
              disabled={running || !selectedSlug || !queriesText.trim()}
              className="w-full bg-primary text-primary-foreground font-bold tracking-wider"
            >
              {running ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running...</>
              ) : (
                <><Play className="w-4 h-4 mr-2" /> Run Bulk Lookup</>
              )}
            </Button>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">{results.length} queries</span>
              {successCount > 0 && <Badge className="bg-green-500/10 text-green-400 border border-green-500/30">{successCount} OK</Badge>}
              {errorCount > 0 && <Badge className="bg-destructive/10 text-destructive border border-destructive/30">{errorCount} Failed</Badge>}
            </div>

            {results.map((r, idx) => (
              <div key={idx} className="rounded-md border border-border bg-card overflow-hidden">
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => r.status === "success" && setExpandedIdx(expandedIdx === idx ? null : idx)}
                >
                  <div className="flex-shrink-0">
                    {r.status === "pending" && <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />}
                    {r.status === "running" && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                    {r.status === "success" && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                    {r.status === "error" && <XCircle className="w-4 h-4 text-destructive" />}
                  </div>
                  <span className="font-mono text-sm text-foreground flex-1 truncate">{r.query}</span>
                  {r.status === "error" && (
                    <span className="text-xs text-destructive truncate max-w-[200px]">{r.error}</span>
                  )}
                  {r.status === "success" && (
                    expandedIdx === idx
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                </div>

                {expandedIdx === idx && r.status === "success" && r.data && (
                  <div className="border-t border-border px-3 pb-3 pt-2 bg-black/20 max-h-60 overflow-y-auto">
                    <pre className="text-xs text-foreground whitespace-pre-wrap break-words font-mono leading-relaxed">
                      {JSON.stringify(r.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
