import { Router } from "express";
import { db } from "@workspace/db";
import { crakaUsers, crakaReferrals } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { UserInitSchema, UserMeSchema, formatValidationError } from "../lib/validation";
import { logger } from "../lib/logger";

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
      // SessionId not found — check if ANY real user exists in DB
      // Priority: premium user > highest credits > any user
      const existingUser = await db.select().from(crakaUsers)
        .orderBy(sql`"is_premium" DESC, "credits_earned" DESC`)
        .limit(1)
        .then(r => r[0]);

      if (existingUser) {
        // Real user exists — re-link this session to that user (NO ghost created)
        await db.update(crakaUsers)
          .set({ sessionId })
          .where(eq(crakaUsers.id, existingUser.id));
        user = { ...existingUser, sessionId };
        logger.info({ referralCode: existingUser.referralCode }, "Re-linked session to existing user");
      } else {
        // Database is empty — create the FIRST user ever
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

            await db.update(crakaUsers)
              .set(updateData)
              .where(eq(crakaUsers.referralCode, usedReferralCode));
          }
        }

        const inserted = await db.insert(crakaUsers).values({
          sessionId,
          referralCode,
          referredBy,
          isPremium: false,
          creditsEarned: referredBy ? 10 : 5,
          totalReferrals: 0,
        }).returning();
        user = inserted[0];
      }
    }

    if (!user) {
      res.status(500).json({ error: "Failed to initialize user" });
      return;
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
