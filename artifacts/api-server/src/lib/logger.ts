import pino from "pino";
import { bufferSink } from "./logBuffer";

const isProduction = process.env.NODE_ENV === "production";

// Always write to the in-memory buffer (for live log viewer).
// In dev: also pretty-print to stdout. In prod: also JSON to stdout.
const streams: pino.StreamEntry[] = [
  { stream: bufferSink },
  isProduction
    ? { stream: process.stdout }
    : { stream: pino.transport({ target: "pino-pretty", options: { colorize: true } }) },
];

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? "info",
    redact: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
    ],
  },
  pino.multistream(streams),
);
