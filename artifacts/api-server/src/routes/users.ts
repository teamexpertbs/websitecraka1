import { Router } from "express";
import { db } from "@workspace/db";
import { crakaUsers, crakaReferrals, bookmarks, coupons, couponUses, deletedAccounts, osintTokenTransactions } from "@workspace/db";
import { eq, sql, and, desc } from "drizzle-orm";
import { UserInitSchema, UserMeSchema, formatValidationError } from "../lib/validation";
import { logger } from "../lib/logger";
import { verifyUserToken } from "./auth";

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
      const existingUser = await db.select().from(crakaUsers)
        .orderBy(sql`"is_premium" DESC, "credits_earned" DESC`)
        .limit(1)
        .then(r => r[0]);

      if (existingUser) {
        await db.update(crakaUsers).set({ sessionId }).where(eq(crakaUsers.id, existingUser.id));
        user = { ...existingUser, sessionId };
        logger.info({ referralCode: existingUser.referralCode }, "Re-linked session to existing user");
      } else {
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
            if (newTotal === 20) { const e = new Date(); e.setDate(e.getDate() + 30); updateData.isPremium = true; updateData.premiumPlan = "Basic"; updateData.premiumExpiresAt = e; }
            else if (newTotal === 50) { const e = new Date(); e.setDate(e.getDate() + 30); updateData.isPremium = true; updateData.premiumPlan = "Pro"; updateData.premiumExpiresAt = e; }
            else if (newTotal === 100) { const e = new Date(); e.setDate(e.getDate() + 30); updateData.isPremium = true; updateData.premiumPlan = "Elite"; updateData.premiumExpiresAt = e; }
            await db.update(crakaUsers).set(updateData).where(eq(crakaUsers.referralCode, usedReferralCode));
          }
        }

        const inserted = await db.insert(crakaUsers).values({
          sessionId, referralCode, referredBy,
          isPremium: false, creditsEarned: referredBy ? 10 : 5, totalReferrals: 0,
        }).returning();
        user = inserted[0];
      }
    }

    if (!user) { res.status(500).json({ error: "Failed to initialize user" }); return; }

    res.json({
      referralCode: user.referralCode,
      isPremium: user.isPremium,
      premiumPlan: user.premiumPlan,
      premiumExpiresAt: user.premiumExpiresAt ? user.premiumExpiresAt.toISOString() : null,
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
    if (!validation.success) { res.status(400).json(formatValidationError(validation.error)); return; }
    const { sessionId } = validation.data;
    const user = await db.select().from(crakaUsers).where(eq(crakaUsers.sessionId, sessionId)).then(r => r[0]);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const referrals = await db.select().from(crakaReferrals).where(eq(crakaReferrals.referrerCode, user.referralCode));
    res.json({
      referralCode: user.referralCode,
      isPremium: user.isPremium,
      premiumPlan: user.premiumPlan,
      premiumExpiresAt: user.premiumExpiresAt ? user.premiumExpiresAt.toISOString() : null,
      creditsEarned: user.creditsEarned,
      totalReferrals: user.totalReferrals,
      referredBy: user.referredBy,
      isBanned: user.isBanned,
      recentReferrals: referrals.slice(-5).map(r => ({
        date: r.createdAt.toISOString(),
        credits: r.creditsAwarded,
      })),
    });
  } catch (err) {
    logger.error({ err }, "Error fetching user info");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET bookmarks for a session
router.get("/user/bookmarks", async (req, res): Promise<void> => {
  try {
    const sessionId = String(req.query.sessionId || "").trim();
    if (!sessionId) { res.status(400).json({ error: "sessionId is required" }); return; }
    const list = await db.select().from(bookmarks)
      .where(eq(bookmarks.sessionId, sessionId))
      .orderBy(desc(bookmarks.createdAt));
    res.json(list.map(b => ({ ...b, createdAt: b.createdAt.toISOString() })));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST create bookmark
router.post("/user/bookmarks", async (req, res): Promise<void> => {
  try {
    const { sessionId, slug, apiName, queryVal, label } = req.body;
    if (!sessionId || !slug || !apiName || !queryVal) {
      res.status(400).json({ error: "sessionId, slug, apiName, queryVal are required" });
      return;
    }
    const [created] = await db.insert(bookmarks).values({
      sessionId, slug, apiName, queryVal, label: label || null,
    }).returning();
    res.json({ ...created, createdAt: created.createdAt.toISOString() });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE bookmark
router.delete("/user/bookmarks/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const sessionId = String(req.query.sessionId || "").trim();
    if (!sessionId) { res.status(400).json({ error: "sessionId is required" }); return; }
    await db.delete(bookmarks).where(and(eq(bookmarks.id, id), eq(bookmarks.sessionId, sessionId)));
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST apply referral code
router.post("/user/apply-referral", async (req, res): Promise<void> => {
  try {
    const sessionId = String(req.body?.sessionId || "").trim();
    const referralCode = String(req.body?.referralCode || "").trim().toUpperCase();
    if (!sessionId || !referralCode) {
      res.status(400).json({ error: "sessionId and referralCode are required" });
      return;
    }
    const user = await db.select().from(crakaUsers).where(eq(crakaUsers.sessionId, sessionId)).then(r => r[0]);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    if (user.referredBy) { res.status(400).json({ error: "Aapne pehle se ek referral code use kiya hua hai" }); return; }
    if (user.referralCode === referralCode) { res.status(400).json({ error: "Aap apna khud ka referral code use nahi kar sakte" }); return; }
    const referrer = await db.select().from(crakaUsers).where(eq(crakaUsers.referralCode, referralCode)).then(r => r[0]);
    if (!referrer) { res.status(404).json({ error: "Referral code nahi mila. Check karein aur dobara try karein." }); return; }

    // Give +5 tokens to the user who applied
    await db.update(crakaUsers).set({
      referredBy: referralCode,
      creditsEarned: sql`${crakaUsers.creditsEarned} + 5`,
    }).where(eq(crakaUsers.sessionId, sessionId));

    // Give +2 tokens to the referrer and increment their count
    const newTotal = referrer.totalReferrals + 1;
    let updateData: any = {
      totalReferrals: sql`${crakaUsers.totalReferrals} + 1`,
      creditsEarned: sql`${crakaUsers.creditsEarned} + 2`,
    };
    if (newTotal === 20) { const e = new Date(); e.setDate(e.getDate() + 30); updateData.isPremium = true; updateData.premiumPlan = "Basic"; updateData.premiumExpiresAt = e; }
    else if (newTotal === 50) { const e = new Date(); e.setDate(e.getDate() + 30); updateData.isPremium = true; updateData.premiumPlan = "Pro"; updateData.premiumExpiresAt = e; }
    else if (newTotal === 100) { const e = new Date(); e.setDate(e.getDate() + 30); updateData.isPremium = true; updateData.premiumPlan = "Elite"; updateData.premiumExpiresAt = e; }
    await db.update(crakaUsers).set(updateData).where(eq(crakaUsers.referralCode, referralCode));

    await db.insert(crakaReferrals).values({ referrerCode: referralCode, referredSessionId: sessionId, creditsAwarded: 5 });
    res.json({ success: true, message: "+5 tokens mile! Referral successfully apply ho gaya." });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST redeem coupon
router.post("/user/redeem-coupon", async (req, res): Promise<void> => {
  try {
    const sessionId = String(req.body?.sessionId || "").trim();
    const code = String(req.body?.code || "").trim().toUpperCase();
    if (!sessionId || !code) { res.status(400).json({ error: "sessionId and code are required" }); return; }

    const user = await db.select().from(crakaUsers).where(eq(crakaUsers.sessionId, sessionId)).then(r => r[0]);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const coupon = await db.select().from(coupons).where(eq(coupons.code, code)).then(r => r[0]);
    if (!coupon) { res.status(404).json({ error: "Invalid coupon code" }); return; }
    if (!coupon.isActive) { res.status(400).json({ error: "Yeh coupon deactivate ho gaya hai" }); return; }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) { res.status(400).json({ error: "Yeh coupon expire ho gaya hai" }); return; }
    if (coupon.usedCount >= coupon.maxUses) { res.status(400).json({ error: "Yeh coupon ki limit khatam ho gayi hai" }); return; }

    // Check if this user already redeemed this coupon
    const alreadyUsed = await db.select().from(couponUses)
      .where(and(eq(couponUses.couponCode, code), eq(couponUses.sessionId, sessionId)))
      .then(r => r[0]);
    if (alreadyUsed) { res.status(400).json({ error: "Aap yeh coupon pehle hi use kar chuke hain" }); return; }

    // Apply coupon
    await db.update(crakaUsers).set({
      creditsEarned: sql`${crakaUsers.creditsEarned} + ${coupon.credits}`,
    }).where(eq(crakaUsers.sessionId, sessionId));

    await db.update(coupons).set({ usedCount: sql`${coupons.usedCount} + 1` }).where(eq(coupons.code, code));
    await db.insert(couponUses).values({ couponCode: code, sessionId, creditsAwarded: coupon.credits });

    res.json({ success: true, credits: coupon.credits, message: `+${coupon.credits} credits aapke account mein add ho gaye!` });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE user account (requires user JWT)
router.delete("/user/account", async (req, res): Promise<void> => {
  try {
    const auth = req.headers["authorization"];
    if (!auth || !auth.startsWith("Bearer ")) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const payload = verifyUserToken(auth.slice(7));
    if (!payload) { res.status(401).json({ error: "Invalid or expired token" }); return; }

    const user = await db.select().from(crakaUsers).where(eq(crakaUsers.sessionId, payload.sessionId)).then(r => r[0]);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    // Log the deletion
    if (user.email || user.googleId) {
      await db.insert(deletedAccounts).values({
        email: user.email || null,
        googleId: user.googleId || null,
      });
    }

    // Delete all user data
    await db.delete(bookmarks).where(eq(bookmarks.sessionId, user.sessionId));
    await db.delete(couponUses).where(eq(couponUses.sessionId, user.sessionId));
    await db.delete(osintTokenTransactions).where(eq(osintTokenTransactions.sessionId, user.sessionId));
    await db.delete(crakaUsers).where(eq(crakaUsers.id, user.id));

    res.json({ success: true, message: "Aapka account permanently delete ho gaya." });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
