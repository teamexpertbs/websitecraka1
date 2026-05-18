import express, { type Express, type Request, type Response, type NextFunction, type ErrorRequestHandler } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { existsSync, statSync } from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Security: JSON body size limit to prevent abuse
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Security headers
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// CORS: Allow specific origins (add your frontend domains here)
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map(s => s.trim())
  : undefined; // undefined = allow all in dev

app.use(cors({
  origin: ALLOWED_ORIGINS || true,
  credentials: true,
}));

app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  const candidates = [
    process.env.FRONTEND_DIST,
    path.resolve(process.cwd(), "../craka-osint/dist/public"),
    path.resolve(process.cwd(), "artifacts/craka-osint/dist/public"),
    path.resolve(__dirname, "../../craka-osint/dist/public"),
  ].filter((p): p is string => Boolean(p));

  const frontendDist = candidates.find((p) => {
    try {
      return existsSync(p) && statSync(p).isDirectory();
    } catch {
      return false;
    }
  });

  if (frontendDist) {
    logger.info({ frontendDist }, "Serving frontend static files");
    const indexHtml = path.join(frontendDist, "index.html");

    app.use(express.static(frontendDist, { index: false }));

    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      if (req.path.startsWith("/api/")) return next();
      res.sendFile(indexHtml, (err) => {
        if (err) next(err);
      });
    });
  } else {
    logger.warn(
      { tried: candidates },
      "Frontend dist directory not found; only API routes will be served",
    );
  }
}

// Global error handler
const globalErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = (err as any)?.status ?? (err as any)?.statusCode ?? 500;
  const message = status < 500 ? err.message : "Internal server error";
  if (status >= 500) {
    logger.error({ err }, "Unhandled route error");
  }
  if (!res.headersSent) res.status(status).json({ error: message });
};
app.use(globalErrorHandler);

export default app;
