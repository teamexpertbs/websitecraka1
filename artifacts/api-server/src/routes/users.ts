import { Router } from "express";
import { db } from "@workspace/db";
import { crakaUsers, crakaReferrals, osintTokenTransactions } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { UserInitSchema, UserMeSchema, formatValidationError } from "../lib/validation";
import { logger } from "../lib/logger";
import { logTokenTxn } from "../lib/tokenLog";

const router = Router();

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "CRAKA-";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

router.post("/user/init", async (req, res): Promise<void> => {
  try {
    const validation = UserInitSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json(formatValidationError(validation.error));
      return;
    }

    const { sessionId, referralCode: usedReferralCode } = validation.data;

    let user = await db.select().from(crakaUsers).where(eq(crakaUsers.sessionId, sessionId)).then(r => r[0]);

    if (!user) {
      let referralCode = generateReferralCode();
      let attempts = 0;
      while (attempts < 5) {
        const existing = await db.select().from(crakaUsers).where(eq(crakaUsers.referralCode, referralCode)).then(r => r[0]);
        if (!existing) break;
        referralCode = generateReferralCode();
        attempts++;
      }

      let referredBy: string | undefined;
      if (usedReferralCode) {
        const referrer = await db.select().from(crakaUsers).where(eq(crakaUsers.referralCode, usedReferralCode)).then(r => r[0]);
        if (referrer && referrer.sessionId !== sessionId) {
          referredBy = usedReferralCode;
          
          const newTotal = referrer.totalReferrals + 1;
          
          await db.insert(crakaReferrals).values({
            referrerCode: usedReferralCode,
            referredSessionId: sessionId,
            creditsAwarded: 2,
          });
          
          let updateData: any = {
            totalReferrals: sql`${crakaUsers.totalReferrals} + 1`,
            creditsEarned: sql`${crakaUsers.creditsEarned} + 2`,
          };

          // Milestone Premium Grants
          if (newTotal === 20) {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
            updateData.isPremium = true;
            updateData.premiumPlan = "Basic";
            updateData.premiumExpiresAt = expiresAt;
          } else if (newTotal === 50) {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
            updateData.isPremium = true;
            updateData.premiumPlan = "Pro";
            updateData.premiumExpiresAt = expiresAt;
          } else if (newTotal === 100) {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
            updateData.isPremium = true;
            updateData.premiumPlan = "Elite";
            updateData.premiumExpiresAt = expiresAt;
          }

          const [updatedReferrer] = await db.update(crakaUsers)
            .set(updateData)
            .where(eq(crakaUsers.referralCode, usedReferralCode))
            .returning({ creditsEarned: crakaUsers.creditsEarned });

          // Log referral bonus for the referrer
          if (referrer.sessionId) {
            await logTokenTxn({
              sessionId: referrer.sessionId,
              type: "earn",
              amount: 2,
              reason: `Referral bonus — invited ${sessionId.slice(0, 12)}…`,
              balanceAfter: updatedReferrer?.creditsEarned ?? 0,
            });
          }
        }
      }

      const initialCredits = referredBy ? 10 : 5;
      const inserted = await db.insert(crakaUsers).values({
        sessionId,
        referralCode,
        referredBy,
        isPremium: false,
        creditsEarned: initialCredits,
        totalReferrals: 0,
      }).returning();
      user = inserted[0];

      await logTokenTxn({
        sessionId,
        type: "init",
        amount: initialCredits,
        reason: referredBy ? "Welcome bonus + referred signup" : "Welcome bonus",
        balanceAfter: initialCredits,
      });
    }

    res.json({
      referralCode: user.referralCode,
      isPremium: user.isPremium,
      premiumPlan: user.premiumPlan,
      creditsEarned: user.creditsEarned,
      totalReferrals: user.totalReferrals,
      referredBy: user.referredBy,
    });
  } catch (err) {
    logger.error({ err }, "Error initializing user");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/user/transactions", async (req, res): Promise<void> => {
  try {
    const sessionId = String(req.query.sessionId || "").trim();
    if (!sessionId) {
      res.status(400).json({ error: "sessionId required" });
      return;
    }
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const txns = await db
      .select()
      .from(osintTokenTransactions)
      .where(eq(osintTokenTransactions.sessionId, sessionId))
      .orderBy(desc(osintTokenTransactions.createdAt))
      .limit(limit);

    res.json({
      entries: txns.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        reason: t.reason,
        balanceAfter: t.balanceAfter,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    logger.error({ err }, "Error fetching token transactions");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/user/me", async (req, res): Promise<void> => {
  try {
    const validation = UserMeSchema.safeParse({ sessionId: req.query.sessionId });
    if (!validation.success) {
      res.status(400).json(formatValidationError(validation.error));
      return;
    }

    const { sessionId } = validation.data;

    const user = await db.select().from(crakaUsers).where(eq(crakaUsers.sessionId, sessionId)).then(r => r[0]);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const referrals = await db.select().from(crakaReferrals).where(eq(crakaReferrals.referrerCode, user.referralCode));

    res.json({
      referralCode: user.referralCode,
      isPremium: user.isPremium,
      premiumPlan: user.premiumPlan,
      creditsEarned: user.creditsEarned,
      totalReferrals: user.totalReferrals,
      referredBy: user.referredBy,
      recentReferrals: referrals.slice(-5).map(r => ({
        date: r.createdAt,
        credits: r.creditsAwarded,
      })),
    });
  } catch (err) {
    logger.error({ err }, "Error fetching user info");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
