import { Router } from "express";
import { db, osintApis, osintHistory, osintCache, crakaUsers, broadcasts, loginLogs, coupons, couponUses, scheduledBroadcasts, osintTokenTransactions } from "@workspace/db";
import { eq, sql, desc, and, lte } from "drizzle-orm";
import { generateToken, adminAuthMiddleware, refreshTokenHandler } from "../lib/jwt";
import { AdminLoginSchema, AdminCreateApiSchema, AdminGrantPremiumSchema, formatValidationError } from "../lib/validation";
import speakeasy from "speakeasy";
import QRCode from "qrcode";

const router = Router();

// ── 2FA helpers — DB-backed so they survive restarts ──────────────────────────
const ADMIN_2FA_SECRET_KEY = "admin_config:2fa_secret";
const ADMIN_2FA_ENABLED_KEY = "admin_config:2fa_enabled";

async function get2FAConfig(): Promise<{ secret: string | null; enabled: boolean }> {
  try {
    const rows = await db.select().from(osintCache).where(
      sql`${osintCache.slug} = 'admin_config'`
    );
    const secretRow = rows.find(r => r.queryVal === "2fa_secret");
    const enabledRow = rows.find(r => r.queryVal === "2fa_enabled");
    return {
      secret: secretRow?.result ?? null,
      enabled: enabledRow?.result === "true",
    };
  } catch { return { secret: null, enabled: false }; }
}

async function save2FAConfig(secret: string, enabled: boolean) {
  // Upsert secret
  const existing = await db.select().from(osintCache).where(
    sql`${osintCache.slug} = 'admin_config' AND ${osintCache.queryVal} = '2fa_secret'`
  ).then(r => r[0]);
  if (existing) {
    await db.update(osintCache).set({ result: secret }).where(eq(osintCache.id, existing.id));
  } else {
    await db.insert(osintCache).values({ slug: "admin_config", queryVal: "2fa_secret", result: secret });
  }
  // Upsert enabled flag
  const existingFlag = await db.select().from(osintCache).where(
    sql`${osintCache.slug} = 'admin_config' AND ${osintCache.queryVal} = '2fa_enabled'`
  ).then(r => r[0]);
  if (existingFlag) {
    await db.update(osintCache).set({ result: String(enabled) }).where(eq(osintCache.id, existingFlag.id));
  } else {
    await db.insert(osintCache).values({ slug: "admin_config", queryVal: "2fa_enabled", result: String(enabled) });
  }
}

async function disable2FAConfig() {
  await db.delete(osintCache).where(sql`${osintCache.slug} = 'admin_config'`);
}
// ─────────────────────────────────────────────────────────────────────────────

router.post("/admin/login", async (req, res) => {
  try {
    const validation = AdminLoginSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json(formatValidationError(validation.error));
      return;
    }
    const { username, password, totpToken } = validation.data as any;
    const AU = process.env.ADMIN_USER || "admin";
    const AP = process.env.ADMIN_PASS || "craka@admin123";
    if (username !== AU || password !== AP) {
      res.status(401).json({ success: false, message: "Invalid credentials" });
      return;
    }
    const { secret, enabled } = await get2FAConfig();
    if (enabled && secret) {
      if (!totpToken) {
        res.json({ success: false, requires2FA: true, message: "2FA code required" });
        return;
      }
      const valid = speakeasy.totp.verify({ secret, encoding: "base32", token: String(totpToken), window: 1 });
      if (!valid) {
        res.status(401).json({ success: false, message: "Invalid 2FA code" });
        return;
      }
    }
    const token = generateToken(username);
    res.json({ success: true, token, expiresIn: "8h", message: "Login successful" });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/admin/refresh-token", refreshTokenHandler);

router.get("/admin/apis", adminAuthMiddleware, async (req, res) => {
  try {
    const apis = await db.select().from(osintApis).orderBy(osintApis.id);
    res.json(apis.map(a => ({
      id: a.id, slug: a.slug, name: a.name, url: a.url, command: a.command,
      example: a.example, pattern: a.pattern, category: a.category, credits: a.credits,
      cacheTtlSeconds: a.cacheTtlSeconds, isActive: a.isActive, createdAt: a.createdAt.toISOString(),
    })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/admin/apis", adminAuthMiddleware, async (req, res) => {
  try {
    const validation = AdminCreateApiSchema.safeParse(req.body);
    if (!validation.success) { res.status(400).json(formatValidationError(validation.error)); return; }
    const { slug, name, url, command, example, pattern, category, credits, isActive } = validation.data;
    const [created] = await db.insert(osintApis).values({
      slug, name, url, command, example, pattern: pattern || null,
      category: category || "Miscellaneous", credits: credits ?? 1, isActive: isActive ?? true,
    }).returning();
    res.status(201).json({
      id: created.id, slug: created.slug, name: created.name, url: created.url, command: created.command,
      example: created.example, pattern: created.pattern, category: created.category, credits: created.credits,
      isActive: created.isActive, createdAt: created.createdAt.toISOString(),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/admin/apis/:slug", adminAuthMiddleware, async (req, res) => {
  try {
    const slug = String(req.params.slug);
    const { name, url, command, example, pattern, category, credits, isActive, cacheTtlSeconds } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (url !== undefined) updates.url = url;
    if (command !== undefined) updates.command = command;
    if (example !== undefined) updates.example = example;
    if (pattern !== undefined) updates.pattern = pattern;
    if (category !== undefined) updates.category = category;
    if (credits !== undefined) updates.credits = Number(credits);
    if (isActive !== undefined) updates.isActive = isActive;
    if (cacheTtlSeconds !== undefined) updates.cacheTtlSeconds = Number(cacheTtlSeconds);
    const [updated] = await db.update(osintApis).set(updates).where(eq(osintApis.slug, slug)).returning();
    if (!updated) { res.status(404).json({ error: "API not found" }); return; }
    res.json({
      id: updated.id, slug: updated.slug, name: updated.name, url: updated.url, command: updated.command,
      example: updated.example, pattern: updated.pattern, category: updated.category, credits: updated.credits,
      isActive: updated.isActive, createdAt: updated.createdAt.toISOString(),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/admin/apis/:slug", adminAuthMiddleware, async (req, res) => {
  try {
    await db.delete(osintApis).where(eq(osintApis.slug, String(req.params.slug)));
    res.json({ success: true, message: "API deleted" });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/admin/history", adminAuthMiddleware, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const offset = (page - 1) * limit;
    const [entries, totalResult] = await Promise.all([
      db.select().from(osintHistory).orderBy(desc(osintHistory.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql`count(*)` }).from(osintHistory),
    ]);
    res.json({
      entries: entries.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })),
      total: Number(totalResult[0].count), page, limit,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/admin/cache/clear", adminAuthMiddleware, async (req, res) => {
  try {
    await db.delete(osintCache);
    res.json({ success: true, message: "Cache cleared" });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/admin/stats", adminAuthMiddleware, async (req, res) => {
  try {
    const [totalResult, successResult, failedResult, activeApisResult, totalApisResult, cacheResult, userResult] = await Promise.all([
      db.select({ count: sql`count(*)` }).from(osintHistory),
      db.select({ count: sql`count(*)` }).from(osintHistory).where(eq(osintHistory.success, true)),
      db.select({ count: sql`count(*)` }).from(osintHistory).where(eq(osintHistory.success, false)),
      db.select({ count: sql`count(*)` }).from(osintApis).where(eq(osintApis.isActive, true)),
      db.select({ count: sql`count(*)` }).from(osintApis),
      db.select({ count: sql`count(*)` }).from(osintCache),
      db.select({ count: sql`count(*)` }).from(crakaUsers),
    ]);
    const categoryBreakdown = await db.select({
      category: osintApis.category,
      count: sql`count(${osintHistory.id})`,
    }).from(osintHistory).leftJoin(osintApis, eq(osintHistory.slug, osintApis.slug)).groupBy(osintApis.category);
    const topApis = await db.select({
      apiName: osintHistory.apiName,
      count: sql`count(*)`,
    }).from(osintHistory).groupBy(osintHistory.apiName).orderBy(desc(sql`count(*)`)).limit(10);
    const recentActivity = await db.select().from(osintHistory).orderBy(desc(osintHistory.createdAt)).limit(20);
    res.json({
      totalLookups: Number(totalResult[0].count),
      successfulLookups: Number(successResult[0].count),
      failedLookups: Number(failedResult[0].count),
      activeApis: Number(activeApisResult[0].count),
      totalApis: Number(totalApisResult[0].count),
      cachedResults: Number(cacheResult[0].count),
      totalUsers: Number(userResult[0].count),
      categoryBreakdown: categoryBreakdown.map(r => ({ category: r.category ?? "Unknown", count: Number(r.count) })),
      topApis: topApis.map(r => ({ apiName: r.apiName, count: Number(r.count) })),
      recentActivity: recentActivity.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/admin/users", adminAuthMiddleware, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const users = await db.select().from(crakaUsers).orderBy(desc(crakaUsers.createdAt)).limit(limit);
    res.json(users.map(u => ({
      id: u.id,
      referralCode: u.referralCode,
      email: u.email,
      displayName: u.displayName,
      isPremium: u.isPremium,
      premiumPlan: u.premiumPlan,
      premiumExpiresAt: u.premiumExpiresAt ? u.premiumExpiresAt.toISOString() : null,
      totalReferrals: u.totalReferrals,
      creditsEarned: u.creditsEarned,
      tokens: u.creditsEarned,
      isBanned: u.isBanned,
      banReason: u.banReason,
      emailVerified: u.emailVerified,
      googleId: u.googleId ? "[linked]" : null,
      createdAt: u.createdAt.toISOString(),
    })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/admin/users/:code", adminAuthMiddleware, async (req, res) => {
  try {
    const code = String(req.params.code).toUpperCase();
    const user = await db.select().from(crakaUsers).where(eq(crakaUsers.referralCode, code)).then(r => r[0]);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    if (user.isPremium) { res.status(400).json({ error: "Cannot delete premium user. Revoke premium first." }); return; }
    await db.delete(crakaUsers).where(eq(crakaUsers.referralCode, code));
    res.json({ success: true, message: `User ${code} deleted` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/admin/delete-user/:code", adminAuthMiddleware, async (req, res) => {
  try {
    const code = String(req.params.code).toUpperCase();
    const user = await db.select().from(crakaUsers).where(eq(crakaUsers.referralCode, code)).then(r => r[0]);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    await db.delete(crakaUsers).where(eq(crakaUsers.referralCode, code));
    res.json({ success: true, message: `User ${code} deleted` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/admin/ban-user", adminAuthMiddleware, async (req, res) => {
  try {
    const code = String(req.body?.referralCode || "").trim().toUpperCase();
    const reason = String(req.body?.reason || "Banned by admin");
    if (!code) { res.status(400).json({ error: "referralCode is required" }); return; }
    const user = await db.select().from(crakaUsers).where(eq(crakaUsers.referralCode, code)).then(r => r[0]);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    await db.update(crakaUsers).set({ isBanned: true, banReason: reason }).where(eq(crakaUsers.referralCode, code));
    res.json({ success: true, message: `User ${code} has been banned. Reason: ${reason}` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/admin/unban-user", adminAuthMiddleware, async (req, res) => {
  try {
    const code = String(req.body?.referralCode || "").trim().toUpperCase();
    if (!code) { res.status(400).json({ error: "referralCode is required" }); return; }
    const user = await db.select().from(crakaUsers).where(eq(crakaUsers.referralCode, code)).then(r => r[0]);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    await db.update(crakaUsers).set({ isBanned: false, banReason: null }).where(eq(crakaUsers.referralCode, code));
    res.json({ success: true, message: `User ${code} has been unbanned.` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/admin/adjust-tokens", adminAuthMiddleware, async (req, res) => {
  try {
    const code = String(req.body?.referralCode || "").trim().toUpperCase();
    const amount = Number(req.body?.amount);
    const reason = String(req.body?.reason || "Admin adjustment");
    if (!code) { res.status(400).json({ error: "referralCode is required" }); return; }
    if (isNaN(amount)) { res.status(400).json({ error: "amount must be a number" }); return; }
    const user = await db.select().from(crakaUsers).where(eq(crakaUsers.referralCode, code)).then(r => r[0]);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const newBalance = Math.max(0, user.creditsEarned + amount);
    await db.update(crakaUsers).set({ creditsEarned: newBalance }).where(eq(crakaUsers.referralCode, code));
    res.json({ success: true, message: `${amount > 0 ? "+" : ""}${amount} tokens applied to ${code}. New balance: ${newBalance}. Reason: ${reason}` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/admin/grant-premium", adminAuthMiddleware, async (req, res) => {
  try {
    const validation = AdminGrantPremiumSchema.safeParse({
      code: req.body.referralCode || req.body.code,
      plan: req.body.plan,
      amount: req.body.amount ? Number(req.body.amount) : undefined
    });
    if (!validation.success) { res.status(400).json(formatValidationError(validation.error)); return; }
    const code = validation.data.code.trim().toUpperCase();
    const plan = validation.data.plan;
    const amount = validation.data.amount || 0;
    const user = await db.select().from(crakaUsers).where(eq(crakaUsers.referralCode, code)).then(r => r[0]);
    if (!user) { res.status(404).json({ error: "User not found with that ID" }); return; }
    const tokensToAdd = Math.floor(amount / 2);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await db.update(crakaUsers).set({
      isPremium: true, premiumPlan: plan, premiumExpiresAt: expiresAt,
      creditsEarned: sql`${crakaUsers.creditsEarned} + ${tokensToAdd}`,
      premiumCreditsGranted: sql`${crakaUsers.premiumCreditsGranted} + ${tokensToAdd}`,
    }).where(eq(crakaUsers.referralCode, code));
    await db.insert(osintTokenTransactions).values({
      sessionId: user.sessionId,
      type: "grant",
      amount: tokensToAdd,
      reason: `Premium plan granted: ${plan}`,
      source: "premium",
      balanceAfter: user.creditsEarned + tokensToAdd,
    }).catch(() => {});
    res.json({ success: true, message: `Premium (${plan}) granted to user ${code}. Added ${tokensToAdd} tokens.` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/admin/revoke-premium", adminAuthMiddleware, async (req, res) => {
  try {
    const code = String(req.body?.referralCode || req.body?.code || "").trim().toUpperCase();
    if (!code) { res.status(400).json({ error: "referralCode is required" }); return; }
    const user = await db.select().from(crakaUsers).where(eq(crakaUsers.referralCode, code)).then(r => r[0]);
    if (!user) { res.status(404).json({ error: "User not found with that ID" }); return; }
    // Only remove premium credits — preserve free credits the user legitimately earned
    const premiumToRemove = user.premiumCreditsGranted ?? 0;
    const newBalance = Math.max(0, user.creditsEarned - premiumToRemove);
    await db.update(crakaUsers).set({
      isPremium: false,
      premiumPlan: null,
      premiumExpiresAt: null,
      creditsEarned: newBalance,
      premiumCreditsGranted: 0,
    }).where(eq(crakaUsers.referralCode, code));
    await db.insert(osintTokenTransactions).values({
      sessionId: user.sessionId,
      type: "revoke",
      amount: -premiumToRemove,
      reason: `Premium revoked — ${premiumToRemove} premium credits removed`,
      source: "premium",
      balanceAfter: newBalance,
    }).catch(() => {});
    res.json({
      success: true,
      message: `Premium revoked for user ${code}. Removed ${premiumToRemove} premium credits. New balance: ${newBalance} (free credits preserved).`,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Admin: add credits to a user with source tracking
router.post("/admin/users/:code/credits/add", adminAuthMiddleware, async (req, res) => {
  try {
    const code = String(req.params.code).trim().toUpperCase();
    const amount = Number(req.body?.amount);
    const source = String(req.body?.source || "admin").trim();
    const reason = String(req.body?.reason || "Admin credit addition");
    if (!code || isNaN(amount) || amount <= 0) { res.status(400).json({ error: "code and positive amount are required" }); return; }
    const user = await db.select().from(crakaUsers).where(eq(crakaUsers.referralCode, code)).then(r => r[0]);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const newBalance = user.creditsEarned + amount;
    const freeIncrease = source === "free" || source === "admin" ? amount : 0;
    await db.update(crakaUsers).set({
      creditsEarned: newBalance,
      freeCreditsGranted: sql`${crakaUsers.freeCreditsGranted} + ${freeIncrease}`,
    }).where(eq(crakaUsers.referralCode, code));
    await db.insert(osintTokenTransactions).values({
      sessionId: user.sessionId,
      type: "grant",
      amount,
      reason,
      source,
      balanceAfter: newBalance,
    }).catch(() => {});
    res.json({ success: true, message: `Added ${amount} credits to ${code}. New balance: ${newBalance}.` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Admin: remove credits from a user
router.post("/admin/users/:code/credits/remove", adminAuthMiddleware, async (req, res) => {
  try {
    const code = String(req.params.code).trim().toUpperCase();
    const amount = Number(req.body?.amount);
    const reason = String(req.body?.reason || "Admin credit removal");
    if (!code || isNaN(amount) || amount <= 0) { res.status(400).json({ error: "code and positive amount are required" }); return; }
    const user = await db.select().from(crakaUsers).where(eq(crakaUsers.referralCode, code)).then(r => r[0]);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const newBalance = Math.max(0, user.creditsEarned - amount);
    await db.update(crakaUsers).set({ creditsEarned: newBalance }).where(eq(crakaUsers.referralCode, code));
    await db.insert(osintTokenTransactions).values({
      sessionId: user.sessionId,
      type: "adjust",
      amount: -amount,
      reason,
      source: "admin",
      balanceAfter: newBalance,
    }).catch(() => {});
    res.json({ success: true, message: `Removed ${amount} credits from ${code}. New balance: ${newBalance}.` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Admin: get credit transaction history for a specific user
router.get("/admin/users/:code/transactions", adminAuthMiddleware, async (req, res) => {
  try {
    const code = String(req.params.code).trim().toUpperCase();
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const user = await db.select().from(crakaUsers).where(eq(crakaUsers.referralCode, code)).then(r => r[0]);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const entries = await db.select().from(osintTokenTransactions)
      .where(eq(osintTokenTransactions.sessionId, user.sessionId))
      .orderBy(desc(osintTokenTransactions.createdAt))
      .limit(limit);
    res.json({
      user: {
        referralCode: user.referralCode,
        email: user.email,
        displayName: user.displayName,
        creditsEarned: user.creditsEarned,
        freeCreditsGranted: user.freeCreditsGranted,
        premiumCreditsGranted: user.premiumCreditsGranted,
        isPremium: user.isPremium,
        premiumPlan: user.premiumPlan,
      },
      entries: entries.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })),
      total: entries.length,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Admin: get query logs for a specific user
router.get("/admin/users/:code/logs", adminAuthMiddleware, async (req, res) => {
  try {
    const code = String(req.params.code).trim().toUpperCase();
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const offset = (page - 1) * limit;
    const user = await db.select().from(crakaUsers).where(eq(crakaUsers.referralCode, code)).then(r => r[0]);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const [entries, totalResult] = await Promise.all([
      db.select().from(osintHistory)
        .where(eq(osintHistory.sessionId, user.sessionId))
        .orderBy(desc(osintHistory.createdAt))
        .limit(limit).offset(offset),
      db.select({ count: sql`count(*)` }).from(osintHistory)
        .where(eq(osintHistory.sessionId, user.sessionId)),
    ]);
    res.json({
      user: { referralCode: user.referralCode, email: user.email, displayName: user.displayName },
      entries: entries.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })),
      total: Number(totalResult[0]?.count ?? 0),
      page, limit,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Admin: delete all logs for a specific user
router.delete("/admin/users/:code/logs", adminAuthMiddleware, async (req, res) => {
  try {
    const code = String(req.params.code).trim().toUpperCase();
    const user = await db.select().from(crakaUsers).where(eq(crakaUsers.referralCode, code)).then(r => r[0]);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    await db.delete(osintHistory).where(eq(osintHistory.sessionId, user.sessionId));
    res.json({ success: true, message: `All logs deleted for user ${code}.` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/admin/cleanup-ghosts", adminAuthMiddleware, async (req, res) => {
  try {
    const ghosts = await db.select().from(crakaUsers).where(
      sql`"is_premium" = false AND "credits_earned" <= 5 AND "total_referrals" = 0`
    );
    for (const ghost of ghosts) {
      await db.delete(crakaUsers).where(eq(crakaUsers.id, ghost.id));
    }
    res.json({ success: true, deleted: ghosts.length, message: `${ghosts.length} ghost users deleted` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/admin/login-logs", adminAuthMiddleware, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const logs = await db.select().from(loginLogs).orderBy(desc(loginLogs.createdAt)).limit(limit);
    res.json(logs.map(l => ({ ...l, createdAt: l.createdAt.toISOString() })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/admin/broadcasts", adminAuthMiddleware, async (req, res) => {
  try {
    const list = await db.select().from(broadcasts).orderBy(desc(broadcasts.createdAt)).limit(50);
    res.json(list.map(b => ({ ...b, createdAt: b.createdAt.toISOString() })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/admin/broadcast", adminAuthMiddleware, async (req, res) => {
  try {
    const { title, message, type } = req.body;
    if (!title || !message) { res.status(400).json({ error: "title and message are required" }); return; }
    const [created] = await db.insert(broadcasts).values({
      title: String(title), message: String(message), type: String(type || "info"),
    }).returning();
    res.json({ success: true, message: "Broadcast sent!", id: created.id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/admin/broadcasts/:id", adminAuthMiddleware, async (req, res) => {
  try {
    await db.delete(broadcasts).where(eq(broadcasts.id, Number(req.params.id)));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/admin/coupons", adminAuthMiddleware, async (req, res) => {
  try {
    const list = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
    res.json(list.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
    })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/admin/coupons", adminAuthMiddleware, async (req, res) => {
  try {
    const { code, credits, maxUses, description, expiresAt } = req.body;
    if (!code || !credits) { res.status(400).json({ error: "code and credits are required" }); return; }
    const [created] = await db.insert(coupons).values({
      code: String(code).toUpperCase().trim(),
      credits: Number(credits),
      maxUses: Number(maxUses) || 1,
      description: description || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: true,
    }).returning();
    res.json({ success: true, coupon: { ...created, createdAt: created.createdAt.toISOString(), expiresAt: created.expiresAt ? created.expiresAt.toISOString() : null } });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch("/admin/coupons/:code/toggle", adminAuthMiddleware, async (req, res) => {
  try {
    const code = String(req.params.code).toUpperCase();
    const existing = await db.select().from(coupons).where(eq(coupons.code, code)).then(r => r[0]);
    if (!existing) { res.status(404).json({ error: "Coupon not found" }); return; }
    const [updated] = await db.update(coupons).set({ isActive: !existing.isActive }).where(eq(coupons.code, code)).returning();
    res.json({ success: true, isActive: updated.isActive });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/admin/coupons/:code", adminAuthMiddleware, async (req, res) => {
  try {
    await db.delete(coupons).where(eq(coupons.code, String(req.params.code).toUpperCase()));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/admin/api-usage", adminAuthMiddleware, async (req, res) => {
  try {
    const usage = await db.select({
      slug: osintHistory.slug,
      apiName: osintHistory.apiName,
      count: sql`count(*)`,
      successCount: sql`sum(case when ${osintHistory.success} = true then 1 else 0 end)`,
    }).from(osintHistory).groupBy(osintHistory.slug, osintHistory.apiName).orderBy(desc(sql`count(*)`)).limit(50);
    res.json(usage.map(u => ({
      slug: u.slug,
      apiName: u.apiName,
      count: Number(u.count),
      successCount: Number(u.successCount),
    })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/admin/api-health", adminAuthMiddleware, async (req, res) => {
  try {
    const apis = await db.select().from(osintApis).orderBy(osintApis.name);
    const usageData = await db.select({
      slug: osintHistory.slug,
      total: sql`count(*)`,
      success: sql`sum(case when ${osintHistory.success} = true then 1 else 0 end)`,
    }).from(osintHistory).groupBy(osintHistory.slug);
    const usageMap = new Map(usageData.map(u => [u.slug, u]));
    res.json({
      apis: apis.map(api => {
        const usage = usageMap.get(api.slug);
        const total = usage ? Number(usage.total) : 0;
        const success = usage ? Number(usage.success) : 0;
        return {
          slug: api.slug,
          name: api.name,
          category: api.category,
          isActive: api.isActive,
          totalRequests: total,
          successRate: total > 0 ? Math.round((success / total) * 100) : null,
          status: api.isActive ? "active" : "inactive",
        };
      }),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/admin/scheduled-broadcasts", adminAuthMiddleware, async (req, res) => {
  try {
    const list = await db.select().from(scheduledBroadcasts).orderBy(scheduledBroadcasts.scheduledAt);
    res.json(list.map(s => ({
      ...s,
      scheduledAt: s.scheduledAt.toISOString(),
      sentAt: s.sentAt ? s.sentAt.toISOString() : null,
      createdAt: s.createdAt.toISOString(),
    })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/admin/scheduled-broadcasts", adminAuthMiddleware, async (req, res) => {
  try {
    const { title, message, type, scheduledAt } = req.body;
    if (!title || !message || !scheduledAt) { res.status(400).json({ error: "title, message, scheduledAt are required" }); return; }
    const [created] = await db.insert(scheduledBroadcasts).values({
      title: String(title), message: String(message), type: String(type || "info"),
      scheduledAt: new Date(scheduledAt),
    }).returning();
    res.json({ success: true, broadcast: { ...created, scheduledAt: created.scheduledAt.toISOString(), createdAt: created.createdAt.toISOString() } });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/admin/scheduled-broadcasts/:id", adminAuthMiddleware, async (req, res) => {
  try {
    await db.delete(scheduledBroadcasts).where(eq(scheduledBroadcasts.id, Number(req.params.id)));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/admin/2fa/status", adminAuthMiddleware, async (req, res) => {
  try {
    const { enabled, secret } = await get2FAConfig();
    res.json({ enabled, hasSecret: !!secret });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/admin/2fa/setup", adminAuthMiddleware, async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `CraKa OSINT (${process.env.ADMIN_USER || "admin"})`,
      issuer: "CraKa OSINT Admin",
      length: 20,
    });
    const qrCode = await QRCode.toDataURL(secret.otpauth_url || "");
    res.json({
      secret: secret.base32,
      qrCode,
      otpauthUrl: secret.otpauth_url,
      instructions: "1. Google Authenticator / Authy mein QR scan karo\n2. 6-digit code neeche enter karo verify karne ke liye\n3. Verify hone ke baad 2FA automatically enable ho jaayega\n⚠️ Secret key ko backup mein save karo!",
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/admin/2fa/verify", adminAuthMiddleware, async (req, res) => {
  try {
    const { secret, token: totpCode } = req.body;
    if (!secret || !totpCode) { res.status(400).json({ error: "secret and token are required" }); return; }
    const valid = speakeasy.totp.verify({ secret, encoding: "base32", token: String(totpCode), window: 2 });
    if (valid) {
      await save2FAConfig(secret, true);
    }
    res.json({
      valid,
      message: valid
        ? "✅ 2FA verified & enabled! Server restart ke baad bhi active rahega. Secret key backup mein save karo."
        : "❌ Invalid code. Authenticator app mein fresh code dekho aur dobara try karo.",
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/admin/2fa/disable", adminAuthMiddleware, async (req, res) => {
  try {
    const { totpCode } = req.body;
    const { secret, enabled } = await get2FAConfig();
    if (!enabled) { res.json({ success: true, message: "2FA was not enabled." }); return; }
    if (secret && totpCode) {
      const valid = speakeasy.totp.verify({ secret, encoding: "base32", token: String(totpCode), window: 2 });
      if (!valid) { res.status(401).json({ error: "Invalid 2FA code. Cannot disable." }); return; }
    }
    await disable2FAConfig();
    res.json({ success: true, message: "2FA disabled successfully." });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
