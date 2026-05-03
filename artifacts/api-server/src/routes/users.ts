import { Router } from "express";
import { db } from "@workspace/db";
import { crakaUsers, crakaReferrals, osintTokenTransactions, bookmarks, coupons, couponUses } from "@workspace/db";
import { eq, sql, desc, and } from "drizzle-orm";
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
          await db.insert(crakaReferrals).values({ referrerCode: usedReferralCode, referredSessionId: sessionId, creditsAwarded: 2 });
          let updateData: any = {
            totalReferrals: sql`${crakaUsers.totalReferrals} + 1`,
            creditsEarned: sql`${crakaUsers.creditsEarned} + 2`,
          };
          if (newTotal === 20) {
            const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 30);
            updateData.isPremium = true; updateData.premiumPlan = "Basic"; updateData.premiumExpiresAt = expiresAt;
          } else if (newTotal === 50) {
            const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 30);
            updateData.isPremium = true; updateData.premiumPlan = "Pro"; updateData.premiumExpiresAt = expiresAt;
          } else if (newTotal === 100) {
            const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 30);
            updateData.isPremium = true; updateData.premiumPlan = "Elite"; updateData.premiumExpiresAt = expiresAt;
          }
          const [updatedReferrer] = await db.update(crakaUsers).set(updateData).where(eq(crakaUsers.referralCode, usedReferralCode)).returning({ creditsEarned: crakaUsers.creditsEarned });
          if (referrer.sessionId) {
            await logTokenTxn({ sessionId: referrer.sessionId, type: "earn", amount: 2, reason: `Referral bonus — invited ${sessionId.slice(0, 12)}…`, balanceAfter: updatedReferrer?.creditsEarned ?? 0 });
          }
        }
      }

      const initialCredits = referredBy ? 10 : 5;
      const inserted = await db.insert(crakaUsers).values({ sessionId, referralCode, referredBy, isPremium: false, creditsEarned: initialCredits, totalReferrals: 0 }).returning();
      user = inserted[0];
      await logTokenTxn({ sessionId, type: "init", amount: initialCredits, reason: referredBy ? "Welcome bonus + referred signup" : "Welcome bonus", balanceAfter: initialCredits });
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
    if (!sessionId) { res.status(400).json({ error: "sessionId required" }); return; }
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const txns = await db.select().from(osintTokenTransactions).where(eq(osintTokenTransactions.sessionId, sessionId)).orderBy(desc(osintTokenTransactions.createdAt)).limit(limit);
    res.json({ entries: txns.map(t => ({ id: t.id, type: t.type, amount: t.amount, reason: t.reason, balanceAfter: t.balanceAfter, createdAt: t.createdAt.toISOString() })) });
  } catch (err) {
    logger.error({ err }, "Error fetching token transactions");
    res.status(500).json({ error: "Internal server error" });
  }
});

const FREE_PLAN_TOKENS = 10;

async function checkPremiumExpiry(sessionId: string): Promise<typeof import("@workspace/db").crakaUsers.$inferSelect | null> {
  let user = await db.select().from(crakaUsers).where(eq(crakaUsers.sessionId, sessionId)).then(r => r[0]);
  if (!user) return null;
  if (user.isPremium && user.premiumExpiresAt && new Date() > user.premiumExpiresAt) {
    const [reset] = await db.update(crakaUsers)
      .set({ isPremium: false, premiumPlan: null, premiumExpiresAt: null, creditsEarned: FREE_PLAN_TOKENS })
      .where(eq(crakaUsers.sessionId, sessionId))
      .returning();
    await logTokenTxn({ sessionId, type: "expire", amount: 0, reason: "Premium expired — tokens reset to free plan limit", balanceAfter: FREE_PLAN_TOKENS });
    user = reset;
  }
  return user;
}

router.get("/user/me", async (req, res): Promise<void> => {
  try {
    const validation = UserMeSchema.safeParse({ sessionId: req.query.sessionId });
    if (!validation.success) { res.status(400).json(formatValidationError(validation.error)); return; }
    const { sessionId } = validation.data;
    const user = await checkPremiumExpiry(sessionId);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const referrals = await db.select().from(crakaReferrals).where(eq(crakaReferrals.referrerCode, user.referralCode));
    res.json({
      referralCode: user.referralCode,
      isPremium: user.isPremium,
      premiumPlan: user.premiumPlan,
      premiumExpiresAt: user.premiumExpiresAt?.toISOString() ?? null,
      creditsEarned: user.creditsEarned,
      totalReferrals: user.totalReferrals,
      referredBy: user.referredBy,
      recentReferrals: referrals.slice(-5).map(r => ({ date: r.createdAt, credits: r.creditsAwarded })),
    });
  } catch (err) {
    logger.error({ err }, "Error fetching user info");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/user/bookmarks */
router.get("/user/bookmarks", async (req, res): Promise<void> => {
  const sessionId = String(req.query.sessionId || "").trim();
  if (!sessionId) { res.status(400).json({ error: "sessionId required" }); return; }
  const list = await db.select().from(bookmarks).where(eq(bookmarks.sessionId, sessionId)).orderBy(desc(bookmarks.createdAt));
  res.json(list.map(b => ({ ...b, createdAt: b.createdAt.toISOString() })));
});

/** POST /api/user/bookmarks */
router.post("/user/bookmarks", async (req, res): Promise<void> => {
  const sessionId = String(req.body?.sessionId || "").trim();
  const slug = String(req.body?.slug || "").trim();
  const apiName = String(req.body?.apiName || "").trim();
  const queryVal = String(req.body?.queryVal || "").trim();
  const label = String(req.body?.label || "").trim();
  if (!sessionId || !slug || !queryVal) { res.status(400).json({ error: "sessionId, slug, queryVal required" }); return; }
  const existing = await db.select().from(bookmarks).where(and(eq(bookmarks.sessionId, sessionId), eq(bookmarks.slug, slug), eq(bookmarks.queryVal, queryVal))).then(r => r[0]);
  if (existing) { res.status(409).json({ error: "Already bookmarked" }); return; }
  const [created] = await db.insert(bookmarks).values({ sessionId, slug, apiName, queryVal, label: label || `${apiName}: ${queryVal}` }).returning();
  res.json({ success: true, bookmark: { ...created, createdAt: created.createdAt.toISOString() } });
});

/** DELETE /api/user/bookmarks/:id */
router.delete("/user/bookmarks/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const sessionId = String(req.query.sessionId || "").trim();
  if (isNaN(id) || !sessionId) { res.status(400).json({ error: "Invalid request" }); return; }
  await db.delete(bookmarks).where(and(eq(bookmarks.id, id), eq(bookmarks.sessionId, sessionId)));
  res.json({ success: true });
});

/** POST /api/user/redeem-coupon */
router.post("/user/redeem-coupon", async (req, res): Promise<void> => {
  const sessionId = String(req.body?.sessionId || "").trim();
  const code = String(req.body?.code || "").trim().toUpperCase();
  if (!sessionId || !code) { res.status(400).json({ error: "sessionId and code required" }); return; }
  const coupon = await db.select().from(coupons).where(eq(coupons.code, code)).then(r => r[0]);
  if (!coupon) { res.status(404).json({ error: "Invalid coupon code" }); return; }
  if (!coupon.isActive) { res.status(400).json({ error: "This coupon is no longer active" }); return; }
  if (coupon.expiresAt && new Date() > coupon.expiresAt) { res.status(400).json({ error: "Coupon has expired" }); return; }
  if (coupon.usedCount >= coupon.maxUses) { res.status(400).json({ error: "Coupon has reached its usage limit" }); return; }
  const alreadyUsed = await db.select().from(couponUses).where(and(eq(couponUses.couponCode, code), eq(couponUses.sessionId, sessionId))).then(r => r[0]);
  if (alreadyUsed) { res.status(400).json({ error: "You have already used this coupon" }); return; }
  const user = await db.select().from(crakaUsers).where(eq(crakaUsers.sessionId, sessionId)).then(r => r[0]);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  // Free plan users capped at FREE_PLAN_TOKENS — coupon credits only apply to premium users
  const FREE_PLAN_MAX = 10;
  const currentCredits = user.creditsEarned;
  let actualCredits = coupon.credits;
  if (!user.isPremium && currentCredits + coupon.credits > FREE_PLAN_MAX) {
    actualCredits = Math.max(0, FREE_PLAN_MAX - currentCredits);
    if (actualCredits === 0) {
      res.status(400).json({ error: `Free plan token limit reached (${FREE_PLAN_MAX} tokens max). Upgrade to Premium to earn more.` });
      return;
    }
  }
  const newBalance = currentCredits + actualCredits;
  await db.update(crakaUsers).set({ creditsEarned: newBalance }).where(eq(crakaUsers.sessionId, sessionId));
  await db.insert(couponUses).values({ couponCode: code, sessionId, creditsAwarded: actualCredits });
  await db.update(coupons).set({ usedCount: coupon.usedCount + 1 }).where(eq(coupons.code, code));
  await logTokenTxn({ sessionId, type: "grant", amount: actualCredits, reason: `Coupon redeemed: ${code}`, balanceAfter: newBalance });
  const msg = actualCredits < coupon.credits
    ? `+${actualCredits} credits added (free plan cap: ${FREE_PLAN_MAX} tokens). Upgrade to Premium for unlimited!`
    : `+${actualCredits} credits added to your account!`;
  res.json({ success: true, credits: actualCredits, newBalance, message: msg });
});

export default router;
