import { Router } from "express";
import { db } from "@workspace/db";
import { crakaUsers, crakaReferrals, osintTokenTransactions, bookmarks, coupons, couponUses, loginLogs, osintHistory, deletedAccounts } from "@workspace/db";
import { eq, sql, desc, and, or } from "drizzle-orm";
import { verifyUserToken } from "./auth";
import { UserInitSchema, UserMeSchema, formatValidationError } from "../lib/validation";
import { logger } from "../lib/logger";
import { logTokenTxn } from "../lib/tokenLog";
import { generateReferralCode } from "../lib/utils";

const router = Router();

const FREE_PLAN_TOKENS = 10;

router.post("/user/init", async (req, res): Promise<void> => {
  try {
    const validation = UserInitSchema.safeParse(req.body);
    if (!validation.success) { res.status(400).json(formatValidationError(validation.error)); return; }
    const { sessionId, referralCode: usedReferralCode } = validation.data;
    let user = await db.select().from(crakaUsers).where(eq(crakaUsers.sessionId, sessionId)).then(r => r[0]);
    if (user?.isBanned) { res.status(403).json({ error: "Your account has been suspended." }); return; }
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
          // Only increment referral count, NO token reward
          await db.update(crakaUsers).set({ totalReferrals: sql`${crakaUsers.totalReferrals} + 1` }).where(eq(crakaUsers.referralCode, usedReferralCode));
          await db.insert(crakaReferrals).values({ referrerCode: usedReferralCode, referredSessionId: sessionId, creditsAwarded: 0 }).catch(e => logger.warn({ err: e }, "Failed to insert referral record"));
        }
      }
      const inserted = await db.insert(crakaUsers).values({ sessionId, referralCode, referredBy, isPremium: false, creditsEarned: 0, totalReferrals: 0 }).returning();
      user = inserted[0];
    }
    res.json({ referralCode: user.referralCode, isPremium: user.isPremium, premiumPlan: user.premiumPlan, creditsEarned: user.creditsEarned, totalReferrals: user.totalReferrals, referredBy: user.referredBy });
  } catch (err) { logger.error({ err }, "Error initializing user"); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/user/transactions", async (req, res): Promise<void> => {
  try {
    const sessionId = String(req.query.sessionId || "").trim();
    if (!sessionId) { res.status(400).json({ error: "sessionId required" }); return; }
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const txns = await db.select().from(osintTokenTransactions).where(eq(osintTokenTransactions.sessionId, sessionId)).orderBy(desc(osintTokenTransactions.createdAt)).limit(limit);
    res.json({ entries: txns.map(t => ({ id: t.id, type: t.type, amount: t.amount, reason: t.reason, balanceAfter: t.balanceAfter, createdAt: t.createdAt.toISOString() })) });
  } catch (err) { logger.error({ err }, "Error fetching token transactions"); res.status(500).json({ error: "Internal server error" }); }
});

async function checkPremiumExpiry(sessionId: string) {
  let user = await db.select().from(crakaUsers).where(eq(crakaUsers.sessionId, sessionId)).then(r => r[0]);
  if (!user) return null;
  if (user.isPremium && user.premiumExpiresAt && new Date() > user.premiumExpiresAt) {
    // FIX #13: Don't destroy balance, cap to free plan max
    const newBalance = Math.min(user.creditsEarned, FREE_PLAN_TOKENS);
    const [reset] = await db.update(crakaUsers).set({ isPremium: false, premiumPlan: null, premiumExpiresAt: null, creditsEarned: newBalance }).where(eq(crakaUsers.sessionId, sessionId)).returning();
    await logTokenTxn({ sessionId, type: "expire", amount: 0, reason: "Premium expired — balance capped to free plan limit", balanceAfter: newBalance });
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
    res.json({ referralCode: user.referralCode, isPremium: user.isPremium, premiumPlan: user.premiumPlan, premiumExpiresAt: user.premiumExpiresAt?.toISOString() ?? null, creditsEarned: user.creditsEarned, totalReferrals: user.totalReferrals, referredBy: user.referredBy, recentReferrals: referrals.slice(-5).map(r => ({ date: r.createdAt, credits: r.creditsAwarded })) });
  } catch (err) { logger.error({ err }, "Error fetching user info"); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/user/bookmarks", async (req, res): Promise<void> => {
  try {
    const sessionId = String(req.query.sessionId || "").trim();
    if (!sessionId) { res.status(400).json({ error: "sessionId required" }); return; }
    const user = await db.select({ isBanned: crakaUsers.isBanned }).from(crakaUsers).where(eq(crakaUsers.sessionId, sessionId)).then(r => r[0]);
    if (user?.isBanned) { res.status(403).json({ error: "Your account has been suspended." }); return; }
    const list = await db.select().from(bookmarks).where(eq(bookmarks.sessionId, sessionId)).orderBy(desc(bookmarks.createdAt));
    res.json(list.map(b => ({ ...b, createdAt: b.createdAt.toISOString() })));
  } catch (err) { logger.error({ err }, "Error fetching bookmarks"); res.status(500).json({ error: "Internal server error" }); }
});

/** POST /api/user/apply-referral — track referral only, NO token rewards */
router.post("/user/apply-referral", async (req, res): Promise<void> => {
  try {
    const sessionId = String(req.body?.sessionId || "").trim();
    const referralCode = String(req.body?.referralCode || "").trim().toUpperCase();
    if (!sessionId || !referralCode) { res.status(400).json({ error: "sessionId and referralCode required" }); return; }
    const user = await db.select().from(crakaUsers).where(eq(crakaUsers.sessionId, sessionId)).then(r => r[0]);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    if (user.isBanned) { res.status(403).json({ error: "Your account has been suspended." }); return; }
    if (user.referredBy) { res.status(400).json({ error: "Aapne pehle hi ek referral code apply kiya hua hai" }); return; }
    const referrer = await db.select().from(crakaUsers).where(eq(crakaUsers.referralCode, referralCode)).then(r => r[0]);
    if (!referrer) { res.status(404).json({ error: "Invalid referral code" }); return; }
    if (referrer.sessionId === sessionId) { res.status(400).json({ error: "Apna khud ka code apply nahi kar sakte" }); return; }
    // Only update referredBy and increment referrer count — NO tokens
    await db.update(crakaUsers).set({ referredBy: referralCode }).where(eq(crakaUsers.sessionId, sessionId));
    await db.update(crakaUsers).set({ totalReferrals: sql`${crakaUsers.totalReferrals} + 1` }).where(eq(crakaUsers.referralCode, referralCode));
    await db.insert(crakaReferrals).values({ referrerCode: referralCode, referredSessionId: sessionId, creditsAwarded: 0 }).catch(e => logger.warn({ err: e }, "Failed to insert referral"));
    res.json({ success: true, message: "Referral code apply ho gaya!", creditsEarned: user.creditsEarned });
  } catch (err) { logger.error({ err }, "Error applying referral code"); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/user/bookmarks", async (req, res): Promise<void> => {
  try {
    const sessionId = String(req.body?.sessionId || "").trim();
    const slug = String(req.body?.slug || "").trim();
    const apiName = String(req.body?.apiName || "").trim();
    const queryVal = String(req.body?.queryVal || "").trim();
    const label = String(req.body?.label || "").trim();
    if (!sessionId || !slug || !queryVal) { res.status(400).json({ error: "sessionId, slug, queryVal required" }); return; }
    const user = await db.select({ isBanned: crakaUsers.isBanned }).from(crakaUsers).where(eq(crakaUsers.sessionId, sessionId)).then(r => r[0]);
    if (user?.isBanned) { res.status(403).json({ error: "Your account has been suspended." }); return; }
    const existing = await db.select().from(bookmarks).where(and(eq(bookmarks.sessionId, sessionId), eq(bookmarks.slug, slug), eq(bookmarks.queryVal, queryVal))).then(r => r[0]);
    if (existing) { res.status(409).json({ error: "Already bookmarked" }); return; }
    const [created] = await db.insert(bookmarks).values({ sessionId, slug, apiName, queryVal, label: label || `${apiName}: ${queryVal}` }).returning();
    res.json({ success: true, bookmark: { ...created, createdAt: created.createdAt.toISOString() } });
  } catch (err) { logger.error({ err }, "Error saving bookmark"); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/user/bookmarks/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const sessionId = String(req.query.sessionId || "").trim();
    if (isNaN(id) || !sessionId) { res.status(400).json({ error: "Invalid request" }); return; }
    await db.delete(bookmarks).where(and(eq(bookmarks.id, id), eq(bookmarks.sessionId, sessionId)));
    res.json({ success: true });
  } catch (err) { logger.error({ err }, "Error deleting bookmark"); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/user/account", async (req, res): Promise<void> => {
  try {
    const auth = req.headers["authorization"];
    if (!auth?.startsWith("Bearer ")) { res.status(401).json({ error: "Authorization required" }); return; }
    const payload = verifyUserToken(auth.slice(7));
    if (!payload) { res.status(401).json({ error: "Invalid or expired token" }); return; }
    const { sessionId } = payload;
    const user = await db.select().from(crakaUsers).where(eq(crakaUsers.sessionId, sessionId)).then(r => r[0]);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    try {
      await db.insert(deletedAccounts).values({ email: user.email ?? null, googleId: user.googleId ?? null });
      logger.info({ email: user.email, googleId: user.googleId }, "Recorded deleted account");
    } catch (delErr) {
      logger.warn({ err: delErr }, "Failed to record deleted account");
      try {
        await db.execute(sql`CREATE TABLE IF NOT EXISTS deleted_accounts (id SERIAL PRIMARY KEY, email TEXT, google_id TEXT, deleted_at TIMESTAMP DEFAULT NOW() NOT NULL)`);
        await db.insert(deletedAccounts).values({ email: user.email ?? null, googleId: user.googleId ?? null });
      } catch (createErr) { logger.error({ err: createErr }, "Could not create deleted_accounts table"); }
    }
    await db.delete(bookmarks).where(eq(bookmarks.sessionId, sessionId)).catch(e => logger.warn({ err: e }, "Failed to delete bookmarks"));
    await db.delete(osintHistory).where(eq(osintHistory.sessionId, sessionId)).catch(e => logger.warn({ err: e }, "Failed to delete history"));
    await db.delete(loginLogs).where(eq(loginLogs.sessionId, sessionId)).catch(e => logger.warn({ err: e }, "Failed to delete login logs"));
    await db.delete(couponUses).where(eq(couponUses.sessionId, sessionId)).catch(e => logger.warn({ err: e }, "Failed to delete coupon uses"));
    await db.delete(crakaReferrals).where(eq(crakaReferrals.referredSessionId, sessionId)).catch(e => logger.warn({ err: e }, "Failed to delete referrals"));
    await db.delete(crakaReferrals).where(eq(crakaReferrals.referrerCode, user.referralCode)).catch(e => logger.warn({ err: e }, "Failed to delete referrer records"));
    await db.delete(osintTokenTransactions).where(eq(osintTokenTransactions.sessionId, sessionId)).catch(e => logger.warn({ err: e }, "Failed to delete txns"));
    await db.delete(crakaUsers).where(eq(crakaUsers.sessionId, sessionId));
    res.json({ success: true, message: "Account deleted successfully." });
  } catch (err) { logger.error({ err }, "Error deleting user account"); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/user/redeem-coupon", async (req, res): Promise<void> => {
  try {
    const sessionId = String(req.body?.sessionId || "").trim();
    const code = String(req.body?.code || "").trim().toUpperCase();
    if (!sessionId || !code) { res.status(400).json({ error: "sessionId and code required" }); return; }
    const coupon = await db.select().from(coupons).where(eq(coupons.code, code)).then(r => r[0]);
    if (!coupon) { res.status(404).json({ error: "Invalid coupon code" }); return; }
    if (!coupon.isActive) { res.status(400).json({ error: "This coupon is no longer active" }); return; }
    if (coupon.expiresAt && new Date() > coupon.expiresAt) { res.status(400).json({ error: "Coupon has expired" }); return; }
    if (coupon.usedCount >= coupon.maxUses) { res.status(400).json({ error: "Coupon usage limit reached" }); return; }
    const alreadyUsed = await db.select().from(couponUses).where(and(eq(couponUses.couponCode, code), eq(couponUses.sessionId, sessionId))).then(r => r[0]);
    if (alreadyUsed) { res.status(400).json({ error: "You have already used this coupon" }); return; }
    const user = await db.select().from(crakaUsers).where(eq(crakaUsers.sessionId, sessionId)).then(r => r[0]);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    if (user.isBanned) { res.status(403).json({ error: "Account suspended." }); return; }
    const FREE_PLAN_MAX = 10;
    let actualCredits = coupon.credits;
    if (!user.isPremium && user.creditsEarned + coupon.credits > FREE_PLAN_MAX) {
      actualCredits = Math.max(0, FREE_PLAN_MAX - user.creditsEarned);
      if (actualCredits === 0) { res.status(400).json({ error: `Free plan limit reached (${FREE_PLAN_MAX} max). Upgrade to Premium.` }); return; }
    }
    const newBalance = user.creditsEarned + actualCredits;
    await db.update(crakaUsers).set({ creditsEarned: newBalance }).where(eq(crakaUsers.sessionId, sessionId));
    await db.insert(couponUses).values({ couponCode: code, sessionId, creditsAwarded: actualCredits });
    await db.update(coupons).set({ usedCount: coupon.usedCount + 1 }).where(eq(coupons.code, code));
    await logTokenTxn({ sessionId, type: "grant", amount: actualCredits, reason: `Coupon: ${code}`, balanceAfter: newBalance });
    res.json({ success: true, credits: actualCredits, newBalance, message: `+${actualCredits} credits added!` });
  } catch (err) { logger.error({ err }, "Error redeeming coupon"); res.status(500).json({ error: "Internal server error" }); }
});

export default router;
