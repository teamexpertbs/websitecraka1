import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { logger } from "./logger";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  logger.warn("⚠️ JWT_SECRET not set! Using insecure fallback. SET THIS IN PRODUCTION!");
}
const SECRET = JWT_SECRET || "dev-secret-CHANGE-ME-" + Date.now();
const JWT_EXPIRY = "8h";

export interface JWTPayload {
  username: string;
  iat?: number;
  exp?: number;
}

export function generateToken(username: string): string {
  return jwt.sign({ username }, SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, SECRET);
    return decoded as JWTPayload;
  } catch {
    return null;
  }
}

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers["authorization"];

  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing authorization header" });
    return;
  }

  const token = auth.slice(7);
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  (req as any).user = payload;
  next();
}

export function refreshTokenHandler(req: Request, res: Response): void {
  const auth = req.headers["authorization"];

  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing authorization header" });
    return;
  }

  const token = auth.slice(7);
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const newToken = generateToken(payload.username);
  res.json({
    success: true,
    token: newToken,
    expiresIn: JWT_EXPIRY,
    message: "Token refreshed successfully",
  });
}
