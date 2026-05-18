import { Request, Response, NextFunction } from "express";
import { verifyUserToken, UserJWTPayload } from "../routes/auth";

/**
 * Middleware that validates user JWT from Authorization: Bearer <token>
 * Attaches decoded payload to req.userPayload
 */
export function userAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers["authorization"];

  if (!auth || !auth.startsWith("Bearer ")) {
    // Allow sessionId-based routes to pass through if no auth header
    // but mark as unauthenticated
    (req as any).userPayload = null;
    next();
    return;
  }

  const token = auth.slice(7);
  const payload = verifyUserToken(token);

  if (!payload) {
    // Invalid or expired token — treat as anonymous user so lookups still work
    // sessionId will be read from request body/params as fallback
    (req as any).userPayload = null;
    next();
    return;
  }

  (req as any).userPayload = payload;
  next();
}

/**
 * Strict auth middleware - returns 401 if no valid token
 */
export function requireUserAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers["authorization"];

  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authorization required" });
    return;
  }

  const token = auth.slice(7);
  const payload = verifyUserToken(token);

  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  (req as any).userPayload = payload;
  next();
}
