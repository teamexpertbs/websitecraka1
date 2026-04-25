import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key-change-in-production";
const JWT_EXPIRY = "8h";

export interface JWTPayload {
  username: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate JWT token for admin authentication
 */
export function generateToken(username: string): string {
  return jwt.sign(
    { username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded as JWTPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Express middleware for JWT authentication
 */
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

  // Attach payload to request for downstream handlers
  (req as any).user = payload;
  next();
}

/**
 * Refresh token endpoint for extending session
 */
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
