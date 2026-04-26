import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { existsSync, statSync } from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

export default app;
