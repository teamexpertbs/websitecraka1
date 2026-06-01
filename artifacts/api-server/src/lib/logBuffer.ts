import type { Response } from "express";
import { Writable } from "node:stream";

const MAX_ENTRIES = 500;

export interface LogEntry {
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

const buffer: LogEntry[] = [];
let nextId = 1;
const sseClients = new Set<Response>();

const LEVEL_NAMES: Record<number, string> = {
  10: "trace",
  20: "debug",
  30: "info",
  40: "warn",
  50: "error",
  60: "fatal",
};

export function addLogEntry(raw: Record<string, any>): void {
  const level = typeof raw.level === "number" ? raw.level : 30;
  const entry: LogEntry = {
    id: nextId++,
    time: typeof raw.time === "number" ? raw.time : Date.now(),
    level,
    levelName: LEVEL_NAMES[level] ?? "info",
    msg: typeof raw.msg === "string" ? raw.msg : JSON.stringify(raw),
    source: "server",
    data: Object.keys(raw).filter(k => !["level","time","msg","pid","hostname"].includes(k)).reduce((acc, k) => { acc[k] = raw[k]; return acc; }, {} as any),
  };
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) buffer.shift();
  broadcastToSSE(entry);
}

export function addBrowserError(entry: Omit<LogEntry, "id" | "time" | "level" | "levelName" | "source">): void {
  const e: LogEntry = {
    id: nextId++,
    time: Date.now(),
    level: 50,
    levelName: "error",
    source: "browser",
    ...entry,
  };
  buffer.push(e);
  if (buffer.length > MAX_ENTRIES) buffer.shift();
  broadcastToSSE(e);
}

export function recentLogs(limit = 200): LogEntry[] {
  return buffer.slice(-limit);
}

export function clearBuffer(): void {
  buffer.length = 0;
}

export function addSSEClient(res: Response): void {
  sseClients.add(res);
}

export function removeSSEClient(res: Response): void {
  sseClients.delete(res);
}

function broadcastToSSE(entry: LogEntry): void {
  if (sseClients.size === 0) return;
  const data = `data: ${JSON.stringify(entry)}\n\n`;
  for (const res of sseClients) {
    try { res.write(data); } catch { sseClients.delete(res); }
  }
}

// Writable stream that pino writes JSON lines into
export const bufferSink = new Writable({
  write(chunk: Buffer, _encoding, callback) {
    try {
      const line = chunk.toString().trim();
      if (line) addLogEntry(JSON.parse(line));
    } catch { /* non-JSON line, skip */ }
    callback();
  },
});
