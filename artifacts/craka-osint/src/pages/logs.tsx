import { useState } from "react";
import { Layout } from "@/components/layout";
import { useGetHistory, getGetHistoryQueryKey } from "@workspace/api-client-react";
import { useUserStore } from "@/lib/user-store";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { History, Search, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Lock, Download } from "lucide-react";
import { format } from "date-fns";

export default function Logs() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const { signedInUser } = useUserStore();
  const sessionId = signedInUser?.sessionId;

  const { data, isLoading } = useGetHistory(
    { page, limit: 15, sessionId },
    {
      query: {
        queryKey: getGetHistoryQueryKey({ page, limit: 15, sessionId }),
        enabled: !!sessionId,
      },
    }
  );

  const historyEntries = data?.entries || [];
  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  const filteredEntries = historyEntries.filter(entry =>
    entry.queryVal.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.apiName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!sessionId) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto flex flex-col items-center justify-center py-24 gap-4">
          <Lock className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Please sign in to view your query logs.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-3">
              <History className="w-7 h-7 sm:w-8 sm:h-8" />
              Query Logs
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm">Your personal search history and execution records.</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <div className="relative w-full sm:w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-muted/30 border-border"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-border text-muted-foreground hover:text-foreground"
              disabled={filteredEntries.length === 0}
              onClick={() => {
                const headers = ["Timestamp", "API", "Query", "Status"];
                const rows = filteredEntries.map(e => [
                  format(new Date(e.createdAt), "yyyy-MM-dd HH:mm:ss"),
                  e.apiName,
                  e.queryVal,
                  e.success ? "OK" : "FAIL",
                ]);
                const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
                const a = document.createElement("a");
                a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
                a.download = `craka_logs_${Date.now()}.csv`;
                a.click();
              }}
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-border text-muted-foreground hover:text-foreground"
              disabled={filteredEntries.length === 0}
              onClick={() => {
                const exportData = filteredEntries.map(e => ({
                  timestamp: format(new Date(e.createdAt), "yyyy-MM-dd HH:mm:ss"),
                  api: e.apiName,
                  query: e.queryVal,
                  status: e.success ? "OK" : "FAIL",
                }));
                const a = document.createElement("a");
                a.href = URL.createObjectURL(new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" }));
                a.download = `craka_logs_${Date.now()}.json`;
                a.click();
              }}
            >
              <Download className="w-3.5 h-3.5" />
              JSON
            </Button>
          </div>
        </header>

        <div className="border border-border rounded-md bg-card overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-[160px] text-xs">Timestamp</TableHead>
                <TableHead className="text-xs">API</TableHead>
                <TableHead className="text-xs">Query</TableHead>
                <TableHead className="text-right text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell><div className="h-4 bg-muted/50 rounded w-32 animate-pulse" /></TableCell>
                    <TableCell><div className="h-4 bg-muted/50 rounded w-24 animate-pulse" /></TableCell>
                    <TableCell><div className="h-4 bg-muted/50 rounded w-48 animate-pulse" /></TableCell>
                    <TableCell className="text-right"><div className="h-4 bg-muted/50 rounded w-16 ml-auto animate-pulse" /></TableCell>
                  </TableRow>
                ))
              ) : filteredEntries.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground text-sm">
                    No history records found. Start a search on the Terminal to see logs here.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((entry) => (
                  <TableRow key={entry.id} className="border-border hover:bg-muted/30">
                    <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                      {format(new Date(entry.createdAt), "yyyy-MM-dd HH:mm:ss")}
                    </TableCell>
                    <TableCell className="font-medium text-primary text-sm">
                      {entry.apiName}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-foreground max-w-[200px] truncate">
                      {entry.queryVal}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.success ? (
                        <Badge variant="outline" className="text-success border-success/30 bg-success/10 gap-1 text-[10px]">
                          <CheckCircle2 className="w-3 h-3" /> OK
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10 gap-1 text-[10px]">
                          <XCircle className="w-3 h-3" /> FAIL
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-end space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="border-border hover:bg-muted"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-sm text-muted-foreground">
              Page <span className="text-foreground font-medium">{page}</span> of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="border-border hover:bg-muted"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
