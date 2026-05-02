import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { db, crakaUsers, loginLogs } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { logTokenTxn } from "../lib/tokenLog";

const router = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key-change-in-production";
const USER_JWT_EXPIRY = "30d";

export interface UserJWTPayload {
  sessionId: string;
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  iat?: number;
  exp?: number;
}

export function generateUserToken(payload: Omit<UserJWTPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: USER_JWT_EXPIRY } as any);
}

export function verifyUserToken(token: string): UserJWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserJWTPayload;
  } catch {
    return null;
  }
}

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "CRAKA-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/**
 * POST /api/auth/google
 * Verify Google ID token, find or create user, return user JWT.
 * Body: { idToken: string, sessionId?: string }
 */
router.post("/auth/google", async (req, res): Promise<void> => {
  try {
    if (!GOOGLE_CLIENT_ID) {
      res.status(503).json({ error: "Google authentication is not configured on this server." });
      return;
    }

    const { idToken, sessionId: existingSessionId, referralCode } = req.body as {
      idToken?: string;
      sessionId?: string;
      referralCode?: string;
    };

    if (!idToken || typeof idToken !== "string") {
      res.status(400).json({ error: "idToken is required" });
      return;
    }

    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });
    } catch {
      res.status(401).json({ error: "Invalid or expired Google token" });
      return;
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.sub) {
      res.status(401).json({ error: "Could not extract Google user info" });
      return;
    }

    const googleId = payload.sub;
    const email = payload.email ?? "";
    const displayName = payload.name ?? payload.email ?? "User";
    const avatarUrl = payload.picture ?? "";

    // Find existing user: by googleId first, then by sessionId
    let user = await db
      .select()
      .from(crakaUsers)
      .where(eq(crakaUsers.googleId, googleId))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!user && existingSessionId) {
      // Link existing anonymous session to Google account
      user = await db
        .select()
        .from(crakaUsers)
        .where(eq(crakaUsers.sessionId, existingSessionId))
        .limit(1)
        .then((r) => r[0] ?? null);

      if (user) {
        // Merge: attach Google identity to existing session
        const [updated] = await db
          .update(crakaUsers)
          .set({ googleId, email, displayName, avatarUrl })
          .where(eq(crakaUsers.id, user.id))
          .returning();
        user = updated;
      }
    }

    if (!user) {
      // Brand-new user — create with Google identity
      const sessionId =
        existingSessionId ??
        "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      const newReferralCode = generateReferralCode();

      // Check if referral code is valid
      let referredByUser = null;
      if (referralCode) {
        referredByUser = await db
          .select()
          .from(crakaUsers)
          .where(eq(crakaUsers.referralCode, referralCode.toUpperCase()))
          .limit(1)
          .then((r) => r[0] ?? null);
      }

      const bonusCredits = referredByUser ? 10 : 5; // Extra 5 for using referral
      const [created] = await db
        .insert(crakaUsers)
        .values({
          sessionId,
          referralCode: newReferralCode,
          referredBy: referredByUser?.referralCode ?? null,
          googleId,
          email,
          displayName,
          avatarUrl,
          isPremium: false,
          creditsEarned: bonusCredits,
          totalReferrals: 0,
        })
        .returning();
      user = created;

      await logTokenTxn({
        sessionId: user.sessionId,
        type: "init",
        amount: bonusCredits,
        reason: referredByUser ? "Welcome bonus + referral bonus (Google sign-in)" : "Welcome bonus (Google sign-in)",
        balanceAfter: bonusCredits,
      });

      // Reward the referrer
      if (referredByUser) {
        const newCredits = (referredByUser.creditsEarned ?? 0) + 5;
        await db
          .update(crakaUsers)
          .set({ creditsEarned: newCredits, totalReferrals: (referredByUser.totalReferrals ?? 0) + 1 })
          .where(eq(crakaUsers.id, referredByUser.id));
        await logTokenTxn({
          sessionId: referredByUser.sessionId,
          type: "earn",
          amount: 5,
          reason: `Referral bonus — ${displayName} joined`,
          balanceAfter: newCredits,
        });
      }
    } else if (!user.googleId) {
      // User exists but hasn't linked Google yet (shouldn't reach here normally)
      const [updated] = await db
        .update(crakaUsers)
        .set({ googleId, email, displayName, avatarUrl })
        .where(eq(crakaUsers.id, user.id))
        .returning();
      user = updated;
    }

    // Mark email as verified (Google already verified it)
    if (!user.emailVerified) {
      await db.update(crakaUsers).set({ emailVerified: true }).where(eq(crakaUsers.id, user.id));
    }

    // Log the login
    await db.insert(loginLogs).values({
      sessionId: user.sessionId,
      email: user.email ?? email,
      ipAddress: req.ip ?? (req.headers["x-forwarded-for"] as string) ?? null,
      userAgent: req.headers["user-agent"] ?? null,
      status: "success",
      method: "google",
    });

    const token = generateUserToken({
      sessionId: user.sessionId,
      googleId: user.googleId!,
      email: user.email ?? "",
      name: user.displayName ?? displayName,
      avatarUrl: user.avatarUrl ?? avatarUrl,
    });

    res.json({
      token,
      user: {
        sessionId: user.sessionId,
        referralCode: user.referralCode,
        email: user.email,
        name: user.displayName,
        avatarUrl: user.avatarUrl,
        isPremium: user.isPremium,
        premiumPlan: user.premiumPlan,
        premiumExpiresAt: user.premiumExpiresAt?.toISOString() ?? null,
        creditsEarned: user.creditsEarned,
        totalReferrals: user.totalReferrals,
      },
    });
  } catch (err) {
    logger.error({ err }, "Error in /auth/google");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/auth/me
 * Return current user from JWT. Authorization: Bearer <userToken>
 */
router.get("/auth/me", async (req, res): Promise<void> => {
  try {
    const auth = req.headers["authorization"];
    if (!auth?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing authorization header" });
      return;
    }
    const token = auth.slice(7);
    const payload = verifyUserToken(token);
    if (!payload) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    const user = await db
      .select()
      .from(crakaUsers)
      .where(eq(crakaUsers.sessionId, payload.sessionId))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      sessionId: user.sessionId,
      referralCode: user.referralCode,
      email: user.email,
      name: user.displayName,
      avatarUrl: user.avatarUrl,
      isPremium: user.isPremium,
      premiumPlan: user.premiumPlan,
      premiumExpiresAt: user.premiumExpiresAt?.toISOString() ?? null,
      creditsEarned: user.creditsEarned,
      totalReferrals: user.totalReferrals,
    });
  } catch (err) {
    logger.error({ err }, "Error in /auth/me");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/auth/logout
 * Client-side only — just confirm logout (JWT is stateless).
 */
router.post("/auth/logout", (_req, res) => {
  res.json({ success: true, message: "Logged out" });
});

export default router;
