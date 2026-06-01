import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/lib/auth";
import {
  Terminal, Wifi, WifiOff, Trash2, Download, Filter,
  ArrowLeft, RefreshCw, Shield, AlertTriangle, Info, Zap, Bug
} from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface LogEntry {
  id: number;
  time: number;
  level: number;
  levelName: string;
  msg: string;
  source: "server" | "browser";
  data?: Record<string, any>;
  url?: string;
  userAgent?: string;
  ip?: string;
}

const LEVEL_COLOR: Record<string, string> = {
  trace:  "text-muted-foreground/50",
  debug:  "text-blue-400/80",
  info:   "text-primary",
  warn:   "text-yellow-400",
  error:  "text-red-400",
  fatal:  "text-red-600 font-bold",
};

const LEVEL_BG: Record<string, string> = {
  trace:  "",
  debug:  "",
  info:   "",
  warn:   "bg-yellow-500/5",
  error:  "bg-red-500/8",
  fatal:  "bg-red-600/15",
};

const LEVEL_BADGE: Record<string, string> = {
  trace:  "border-muted-foreground/30 text-muted-foreground/50",
  debug:  "border-blue-500/30 text-blue-400",
  info:   "border-primary/30 text-primary",
  warn:   "border-yellow-500/40 text-yellow-400 bg-yellow-500/10",
  error:  "border-red-500/40 text-red-400 bg-red-500/10",
  fatal:  "border-red-600/60 text-red-500 bg-red-600/20",
};

function fmt(ts: number) {
  const d = new Date(ts);
  return d.toTimeString().slice(0, 8) + "." + String(d.getMilliseconds()).padStart(3, "0");
}

function LevelBadge({ level }: { level: string }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0 rounded border text-[10px] font-mono font-bold tracking-widest uppercase ${LEVEL_BADGE[level] ?? LEVEL_BADGE.info}`}>
      {level}
    </span>
  );
}

export default function AdminLogs() {
  const { token } = useAuthStore();
  const [, setLocation] = useLocation();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const connect = useCallback(() => {
    if (!token) return;
    if (esRef.current) { esRef.current.close(); }
    const es = new EventSource(`${API_BASE}/api/admin/logs/stream?token=${encodeURIComponent(token)}`);
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onmessage = (e) => {
      try {
        const entry: LogEntry = JSON.parse(e.data);
        setLogs(prev => {
          const next = [...prev, entry];
          return next.length > 500 ? next.slice(-500) : next;
        });
      } catch {}
    };
    es.onerror = () => {
      setConnected(false);
      es.close();
      setTimeout(connect, 3000);
    };
  }, [token]);

  useEffect(() => {
    connect();
    return () => { esRef.current?.close(); };
  }, [connect]);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setAutoScroll(atBottom);
  };

  const clearLogs = async () => {
    if (!confirm("Clear all logs in memory?")) return;
    await fetch(`${API_BASE}/api/admin/logs/clear`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setLogs([]);
  };

  const downloadLogs = () => {
    const visible = filtered;
    const lines = visible.map(e =>
      `[${new Date(e.time).toISOString()}] [${e.levelName.toUpperCase()}] [${e.source}] ${e.msg}` +
      (e.data && Object.keys(e.data).length ? " " + JSON.stringify(e.data) : "")
    ).join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "craka-logs.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = logs.filter(e => {
    if (filter !== "all" && e.levelName !== filter && !(filter === "browser" && e.source === "browser")) return false;
    if (search && !e.msg.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const errorCount = logs.filter(e => e.level >= 50).length;
  const warnCount = logs.filter(e => e.level === 40).length;
  const browserCount = logs.filter(e => e.source === "browser").length;

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Shield className="w-10 h-10 text-destructive mx-auto" />
          <p className="text-sm text-muted-foreground font-mono">Admin auth required</p>
          <button onClick={() => setLocation("/admin")} className="text-xs text-primary hover:underline">
            Go to admin panel →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-full px-4 h-12 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation("/admin")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Admin
            </button>
            <span className="text-border/60">|</span>
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-primary" />
              <span className="font-mono font-bold text-sm text-primary tracking-widest">LIVE LOGS</span>
            </div>
            <div className={`flex items-center gap-1.5 text-xs font-mono ${connected ? "text-green-400" : "text-muted-foreground"}`}>
              {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {connected ? "LIVE" : "CONNECTING..."}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {errorCount > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-400">
                {errorCount} ERR
              </span>
            )}
            {warnCount > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
                {warnCount} WARN
              </span>
            )}
            {browserCount > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400">
                {browserCount} BROWSER
              </span>
            )}
            <button onClick={downloadLogs} className="p-1.5 rounded hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors" title="Download logs">
              <Download className="w-3.5 h-3.5" />
            </button>
            <button onClick={clearLogs} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Clear logs">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={connect} className="p-1.5 rounded hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors" title="Reconnect">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Filter bar */}
      <div className="border-b border-border/40 bg-card/50 px-4 py-2 flex items-center gap-3 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        {["all","info","warn","error","debug","browser"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-[10px] font-mono px-2.5 py-1 rounded border transition-all uppercase tracking-wider ${
              filter === f
                ? "bg-primary/15 border-primary/50 text-primary"
                : "border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search logs..."
          className="ml-auto text-xs bg-background border border-border/40 rounded px-3 py-1 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 w-48 font-mono"
        />
        <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0">
          {filtered.length}/{logs.length}
        </span>
      </div>

      {/* Log output */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto font-mono text-xs bg-[#0a0a0a] relative"
        style={{ minHeight: 0, height: "calc(100vh - 100px)" }}
      >
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground/40">
            <Terminal className="w-8 h-8" />
            <p className="text-xs font-mono">Waiting for logs...</p>
          </div>
        ) : (
          <div className="divide-y divide-border/10">
            {filtered.map(entry => (
              <div
                key={entry.id}
                className={`group px-4 py-1.5 hover:bg-white/[0.02] cursor-pointer transition-colors ${LEVEL_BG[entry.levelName] ?? ""}`}
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              >
                <div className="flex items-start gap-3 min-w-0">
                  {/* Time */}
                  <span className="text-muted-foreground/40 shrink-0 tabular-nums">{fmt(entry.time)}</span>
                  {/* Level */}
                  <span className="shrink-0"><LevelBadge level={entry.levelName} /></span>
                  {/* Source */}
                  <span className={`shrink-0 text-[9px] uppercase tracking-widest px-1 rounded border ${entry.source === "browser" ? "border-blue-500/30 text-blue-400/70" : "border-muted/30 text-muted-foreground/40"}`}>
                    {entry.source === "browser" ? <Bug className="w-2.5 h-2.5 inline" /> : <Zap className="w-2.5 h-2.5 inline" />}
                  </span>
                  {/* Message */}
                  <span className={`truncate flex-1 ${LEVEL_COLOR[entry.levelName] ?? "text-foreground"}`}>
                    {entry.msg}
                  </span>
                </div>
                {/* Expanded data */}
                {expandedId === entry.id && (
                  <div className="mt-2 ml-[calc(3.5rem+2rem)] text-[10px] text-muted-foreground space-y-1">
                    {entry.url && <div><span className="text-muted-foreground/50">url:</span> <span className="text-blue-400/70">{entry.url}</span></div>}
                    {entry.ip && <div><span className="text-muted-foreground/50">ip:</span> <span className="text-foreground/60">{entry.ip}</span></div>}
                    {entry.data && Object.keys(entry.data).filter(k => entry.data![k] !== undefined && entry.data![k] !== null).length > 0 && (
                      <pre className="bg-muted/20 border border-border/30 rounded p-2 overflow-x-auto text-[10px] leading-relaxed text-muted-foreground max-h-48 overflow-y-auto">
                        {JSON.stringify(entry.data, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Auto-scroll indicator */}
      {!autoScroll && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => { setAutoScroll(true); bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-mono shadow-lg hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Resume auto-scroll
          </button>
        </div>
      )}
    </div>
  );
}
