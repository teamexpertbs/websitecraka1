import { Router } from "express";
import { db, osintApis, osintHistory, osintCache, crakaUsers, loginLogs } from "@workspace/db";
import { eq, sql, desc, gt } from "drizzle-orm";
import { generateToken, adminAuthMiddleware, refreshTokenHandler } from "../lib/jwt";
import { AdminLoginSchema, AdminCreateApiSchema, AdminGrantPremiumSchema, formatValidationError } from "../lib/validation";
import { logTokenTxn } from "../lib/tokenLog";
import { generateTotpSecret, verifyTotp, generateQrCodeDataUrl } from "../lib/totp";

const router = Router();

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "craka@admin123";

// In-memory TOTP secret store (persisted via env ADMIN_2FA_SECRET)
function getAdmin2FaSecret(): string | null {
  return process.env.ADMIN_2FA_SECRET || null;
}

router.post("/admin/login", async (req, res) => {
  const validation = AdminLoginSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json(formatValidationError(validation.error));
    return;
  }

  const { username, password } = validation.data;
  const totpToken: string | undefined = (req.body as any).totpToken;

  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    res.status(401).json({ success: false, message: "Invalid credentials" });
    return;
  }

  const secret = getAdmin2FaSecret();
  if (secret) {
    // 2FA is enabled — require TOTP
    if (!totpToken) {
      res.status(200).json({ success: false, requires2FA: true, message: "2FA code required" });
      return;
    }
    const valid = verifyTotp(secret, totpToken);
    if (!valid) {
      res.status(401).json({ success: false, message: "Invalid 2FA code" });
      return;
    }
  }

  const token = generateToken(username);
  res.json({ success: true, token, expiresIn: "8h", message: "Login successful" });
});

router.post("/admin/refresh-token", refreshTokenHandler);

router.get("/admin/apis", adminAuthMiddleware, async (req, res) => {
  const apis = await db.select().from(osintApis).orderBy(osintApis.id);
  res.json(apis.map(a => ({
    id: a.id, slug: a.slug, name: a.name, url: a.url, command: a.command,
    example: a.example, pattern: a.pattern, category: a.category, credits: a.credits,
    cacheTtlSeconds: a.cacheTtlSeconds,
    isActive: a.isActive, createdAt: a.createdAt.toISOString(),
  })));
});

router.post("/admin/apis", adminAuthMiddleware, async (req, res) => {
  const validation = AdminCreateApiSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json(formatValidationError(validation.error));
    return;
  }

  const { slug, name, url, command, example, pattern, category, credits, isActive } = validation.data;
  const cacheTtlSecondsRaw = (req.body as any)?.cacheTtlSeconds;
  const cacheTtlSeconds = Number.isFinite(Number(cacheTtlSecondsRaw))
    ? Math.max(0, Math.min(86400, Number(cacheTtlSecondsRaw)))
    : 1800;

  const [created] = await db.insert(osintApis).values({
    slug, name, url, command, example, pattern: pattern || null,
    category: category || "Miscellaneous", credits: credits ?? 1, isActive: isActive ?? true,
    cacheTtlSeconds,
  }).returning();
  res.status(201).json({
    id: created.id, slug: created.slug, name: created.name, url: created.url, command: created.command,
    example: created.example, pattern: created.pattern, category: created.category, credits: created.credits,
    cacheTtlSeconds: created.cacheTtlSeconds,
    isActive: created.isActive, createdAt: created.createdAt.toISOString(),
  });
});

router.put("/admin/apis/:slug", adminAuthMiddleware, async (req, res) => {
  const slug = String(req.params.slug);
  const { name, url, command, example, pattern, category, credits, isActive, cacheTtlSeconds } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (url !== undefined) updates.url = url;
  if (command !== undefined) updates.command = command;
  if (example !== undefined) updates.example = example;
  if (pattern !== undefined) updates.pattern = pattern;
  if (category !== undefined) updates.category = category;
  if (credits !== undefined) updates.credits = credits;
  if (isActive !== undefined) updates.isActive = isActive;
  if (cacheTtlSeconds !== undefined && Number.isFinite(Number(cacheTtlSeconds))) {
    updates.cacheTtlSeconds = Math.max(0, Math.min(86400, Number(cacheTtlSeconds)));
  }
  
  const [updated] = await db.update(osintApis).set(updates).where(eq(osintApis.slug, slug)).returning();
  if (!updated) {
    res.status(404).json({ error: "API not found" });
    return;
  }
  res.json({
    id: updated.id, slug: updated.slug, name: updated.name, url: updated.url, command: updated.command,
    example: updated.example, pattern: updated.pattern, category: updated.category, credits: updated.credits,
    cacheTtlSeconds: updated.cacheTtlSeconds,
    isActive: updated.isActive, createdAt: updated.createdAt.toISOString(),
  });
});

router.get("/admin/api-health", adminAuthMiddleware, async (req, res) => {
  // Compute per-API success / fail / last-used over the last 24h and all-time.
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const apis = await db.select().from(osintApis).orderBy(osintApis.id);

  const allTimeStats = await db
    .select({
      slug: osintHistory.slug,
      total: sql<number>`count(*)`,
      success: sql<number>`sum(case when ${osintHistory.success} then 1 else 0 end)`,
      lastUsedAt: sql<Date>`max(${osintHistory.createdAt})`,
    })
    .from(osintHistory)
    .groupBy(osintHistory.slug);

  const recentStats = await db
    .select({
      slug: osintHistory.slug,
      total: sql<number>`count(*)`,
      success: sql<number>`sum(case when ${osintHistory.success} then 1 else 0 end)`,
    })
    .from(osintHistory)
    .where(gt(osintHistory.createdAt, since24h))
    .groupBy(osintHistory.slug);

  const allBySlug = new Map(allTimeStats.map(s => [s.slug, s]));
  const recBySlug = new Map(recentStats.map(s => [s.slug, s]));

  const result = apis.map(api => {
    const all = allBySlug.get(api.slug);
    const rec = recBySlug.get(api.slug);
    const totalAll = Number(all?.total ?? 0);
    const successAll = Number(all?.success ?? 0);
    const total24h = Number(rec?.total ?? 0);
    const success24h = Number(rec?.success ?? 0);
    const successRate = totalAll === 0 ? null : Math.round((successAll / totalAll) * 100);
    const successRate24h = total24h === 0 ? null : Math.round((success24h / total24h) * 100);
    const lastUsedAt = all?.lastUsedAt ? new Date(all.lastUsedAt as any).toISOString() : null;

    let status: "healthy" | "degraded" | "down" | "idle";
    if (totalAll === 0) status = "idle";
    else if (successRate24h !== null && successRate24h < 30 && total24h >= 3) status = "down";
    else if (successRate24h !== null && successRate24h < 70 && total24h >= 3) status = "degraded";
    else if (successRate !== null && successRate < 50) status = "degraded";
    else status = "healthy";

    return {
      slug: api.slug,
      name: api.name,
      category: api.category,
      isActive: api.isActive,
      cacheTtlSeconds: api.cacheTtlSeconds,
      totalRequests: totalAll,
      successCount: successAll,
      failCount: totalAll - successAll,
      successRate,
      total24h,
      success24h,
      fail24h: total24h - success24h,
      successRate24h,
      lastUsedAt,
      status,
    };
  });

  res.json({ apis: result, since24h: since24h.toISOString() });
});

router.delete("/admin/apis/:slug", adminAuthMiddleware, async (req, res) => {
  const slug = String(req.params.slug);
  await db.delete(osintApis).where(eq(osintApis.slug, slug));
  res.json({ success: true, message: "API deleted" });
});

router.get("/admin/history", adminAuthMiddleware, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const offset = (page - 1) * limit;
  
  const [entries, totalResult] = await Promise.all([
    db.select().from(osintHistory).orderBy(desc(osintHistory.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(osintHistory),
  ]);
  
  res.json({
    entries: entries.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })),
    total: Number(totalResult[0].count),
    page,
    limit,
  });
});

router.post("/admin/cache/clear", adminAuthMiddleware, async (req, res) => {
  await db.delete(osintCache);
  res.json({ success: true, message: "Cache cleared" });
});

router.get("/admin/stats", adminAuthMiddleware, async (req, res) => {
  const [totalResult, successResult, failedResult, activeApisResult, totalApisResult, cacheResult] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(osintHistory),
    db.select({ count: sql<number>`count(*)` }).from(osintHistory).where(eq(osintHistory.success, true)),
    db.select({ count: sql<number>`count(*)` }).from(osintHistory).where(eq(osintHistory.success, false)),
    db.select({ count: sql<number>`count(*)` }).from(osintApis).where(eq(osintApis.isActive, true)),
    db.select({ count: sql<number>`count(*)` }).from(osintApis),
    db.select({ count: sql<number>`count(*)` }).from(osintCache),
  ]);
  
  const categoryBreakdown = await db.select({
    category: osintApis.category,
    count: sql<number>`count(${osintHistory.id})`,
  }).from(osintHistory).leftJoin(osintApis, eq(osintHistory.slug, osintApis.slug)).groupBy(osintApis.category);
  
  const topApis = await db.select({
    apiName: osintHistory.apiName,
    count: sql<number>`count(*)`,
  }).from(osintHistory).groupBy(osintHistory.apiName).orderBy(desc(sql`count(*)`)).limit(10);
  
  const recentActivity = await db.select().from(osintHistory).orderBy(desc(osintHistory.createdAt)).limit(20);
  
  res.json({
    totalLookups: Number(totalResult[0].count),
    successfulLookups: Number(successResult[0].count),
    failedLookups: Number(failedResult[0].count),
    activeApis: Number(activeApisResult[0].count),
    totalApis: Number(totalApisResult[0].count),
    cachedResults: Number(cacheResult[0].count),
    categoryBreakdown: categoryBreakdown.map(r => ({ category: r.category ?? "Unknown", count: Number(r.count) })),
    topApis: topApis.map(r => ({ apiName: r.apiName, count: Number(r.count) })),
    recentActivity: recentActivity.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })),
  });
});

router.post("/admin/grant-premium", adminAuthMiddleware, async (req, res) => {
  const validation = AdminGrantPremiumSchema.safeParse({ 
    code: req.body.referralCode || req.body.code,
    plan: req.body.plan,
    amount: req.body.amount ? Number(req.body.amount) : undefined
  });
  if (!validation.success) {
    res.status(400).json(formatValidationError(validation.error));
    return;
  }

  const code = validation.data.code.trim().toUpperCase();
  const plan = validation.data.plan;
  const amount = validation.data.amount || 0;
  
  const user = await db.select().from(crakaUsers).where(eq(crakaUsers.referralCode, code)).then(r => r[0]);
  if (!user) {
    res.status(404).json({ error: "User not found with that ID" });
    return;
  }
  
  const tokensToAdd = Math.floor(amount / 2);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

  const [updatedUser] = await db.update(crakaUsers)
    .set({ 
      isPremium: true, 
      premiumPlan: plan,
      premiumExpiresAt: expiresAt,
      creditsEarned: sql`${crakaUsers.creditsEarned} + ${tokensToAdd}`
    })
    .where(eq(crakaUsers.referralCode, code))
    .returning({ sessionId: crakaUsers.sessionId, creditsEarned: crakaUsers.creditsEarned });

  if (updatedUser?.sessionId && tokensToAdd > 0) {
    await logTokenTxn({
      sessionId: updatedUser.sessionId,
      type: "grant",
      amount: tokensToAdd,
      reason: `Premium ${plan} grant (₹${amount})`,
      balanceAfter: updatedUser.creditsEarned,
    });
  }
    
  res.json({ success: true, message: `Premium (${plan}) granted to user ${code}. Added ${tokensToAdd} tokens.` });
});

router.post("/admin/revoke-premium", adminAuthMiddleware, async (req, res) => {
  const code = String(req.body?.referralCode || req.body?.code || "").trim().toUpperCase();
  if (!code) {
    res.status(400).json({ error: "referralCode is required" });
    return;
  }
  const user = await db.select().from(crakaUsers).where(eq(crakaUsers.referralCode, code)).then(r => r[0]);
  if (!user) {
    res.status(404).json({ error: "User not found with that ID" });
    return;
  }
  await db.update(crakaUsers).set({ isPremium: false, premiumPlan: null }).where(eq(crakaUsers.referralCode, code));
  res.json({ success: true, message: `Premium revoked for user ${code}` });
});

router.get("/admin/users", adminAuthMiddleware, async (req, res) => {
  const users = await db.select().from(crakaUsers).orderBy(desc(crakaUsers.createdAt)).limit(50);
  res.json(users.map(u => ({
    referralCode: u.referralCode,
    email: u.email,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    emailVerified: u.emailVerified,
    isPremium: u.isPremium,
    premiumPlan: u.premiumPlan,
    premiumExpiresAt: u.premiumExpiresAt ? u.premiumExpiresAt.toISOString() : null,
    totalReferrals: u.totalReferrals,
    creditsEarned: u.creditsEarned,
    createdAt: u.createdAt.toISOString(),
  })));
});

/** GET /api/admin/login-logs — last 200 login events */
router.get("/admin/login-logs", adminAuthMiddleware, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 200);
  const logs = await db
    .select()
    .from(loginLogs)
    .orderBy(desc(loginLogs.createdAt))
    .limit(limit);
  res.json(logs.map(l => ({
    id: l.id,
    sessionId: l.sessionId,
    email: l.email,
    ipAddress: l.ipAddress,
    userAgent: l.userAgent,
    status: l.status,
    method: l.method,
    createdAt: l.createdAt.toISOString(),
  })));
});

/** POST /api/admin/2fa/setup — generate TOTP secret + QR code */
router.post("/admin/2fa/setup", adminAuthMiddleware, async (req, res) => {
  const secret = generateTotpSecret(ADMIN_USER);
  const qrCode = await generateQrCodeDataUrl(secret.otpauth_url!);
  res.json({
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url,
    qrCode,
    instructions: `Scan this QR code with Google Authenticator, then set ADMIN_2FA_SECRET=${secret.base32} as a Replit Secret.`,
  });
});

/** POST /api/admin/2fa/verify — verify TOTP before saving secret */
router.post("/admin/2fa/verify", adminAuthMiddleware, async (req, res) => {
  const { secret, token } = req.body as { secret?: string; token?: string };
  if (!secret || !token) {
    res.status(400).json({ error: "secret and token are required" });
    return;
  }
  const valid = verifyTotp(secret, token);
  if (!valid) {
    res.status(400).json({ valid: false, message: "Invalid TOTP code. Try again." });
    return;
  }
  res.json({ valid: true, message: "Code verified! Now save the ADMIN_2FA_SECRET in Replit Secrets to enable 2FA." });
});

/** GET /api/admin/2fa/status */
router.get("/admin/2fa/status", adminAuthMiddleware, async (req, res) => {
  const secret = getAdmin2FaSecret();
  res.json({ enabled: !!secret });
});

export default router;
