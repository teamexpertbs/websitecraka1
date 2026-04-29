import { Router } from "express";
import { db, osintApis, osintHistory, osintCache, crakaUsers } from "@workspace/db";
import { eq, sql, desc, and, gt } from "drizzle-orm";
import https from "https";
import http from "http";

const router = Router();

const DEVELOPER_CREDIT = "@DM_CRAKA_OWNER_BOT";
const CACHE_TTL_MINUTES = 30;

const DEFAULT_APIS = [
  { slug: "phone",    name: "Phone Lookup",    url: "https://exploitsindia.site/api/number.php?exploits={query}",                      command: "/phone",    example: "9876543210",       pattern: "^[6-9]\\d{9}$",                                                               category: "Phone",    credits: 1 },
  { slug: "phone2",   name: "Phone Info 2",    url: "https://api.veriphone.io/v2/verify?phone={query}&key=demo",                       command: "/phone2",   example: "+919876543210",    pattern: null,                                                                           category: "Phone",    credits: 1 },
  { slug: "aadhaar",  name: "Aadhaar Lookup",  url: "https://exploitsindia.site/api/aadhar.php?exploits={query}",                      command: "/aadhaar",  example: "882838027159",     pattern: "^\\d{12}$",                                                                    category: "Identity", credits: 1 },
  { slug: "family",   name: "Family Info",     url: "https://exploitsindia.site/api/family.php?exploits={query}",                      command: "/family",   example: "882838027159",     pattern: "^\\d{12}$",                                                                    category: "Identity", credits: 1 },
  { slug: "vehicle",  name: "Vehicle RC",      url: "https://vehicle-info-api-abhi.vercel.app/?rc_number={query}",                    command: "/vehicle",  example: "KA04EQ4521",       pattern: "^([A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}|[0-9]{2}BH[0-9]{4}[A-Z]{1,2})$",  category: "Vehicle",  credits: 1 },
  { slug: "pan",      name: "PAN Card",        url: "https://pan.amorinthz.workers.dev/?key=AMORINTH&pan={query}",                    command: "/pan",      example: "ABCDE1234F",       pattern: "^[A-Z]{5}\\d{4}[A-Z]$",                                                       category: "Identity", credits: 1 },
  { slug: "ifsc",     name: "IFSC / Bank",     url: "https://ifsc.razorpay.com/{query}",                                              command: "/ifsc",     example: "SBIN0000001",      pattern: "^[A-Z]{4}0[A-Z0-9]{6}$",                                                      category: "Banking",  credits: 1 },
  { slug: "upi",      name: "UPI Lookup",      url: "https://api.b77bf911.workers.dev/upi?id={query}",                                command: "/upi",      example: "user@fam",         pattern: "^[\\w\\.\\-]+@[\\w\\.\\-]+$",                                                  category: "Banking",  credits: 1 },
  { slug: "pincode",  name: "Pincode",         url: "https://api.postalpincode.in/pincode/{query}",                                   command: "/pincode",  example: "400001",           pattern: "^\\d{6}$",                                                                     category: "Location", credits: 1 },
  { slug: "ip",       name: "IP Lookup",       url: "https://ipapi.co/{query}/json/",                                                 command: "/ip",       example: "8.8.8.8",          pattern: "^(\\d{1,3}\\.){3}\\d{1,3}$",                                                  category: "Network",  credits: 1 },
  { slug: "email",    name: "Email Check",     url: "https://api.eva.pingutil.com/email?email={query}",                               command: "/email",    example: "test@gmail.com",   pattern: "^[\\w\\.\\-]+@[\\w\\.\\-]+\\.\\w+$",                                           category: "Email",    credits: 1 },
  { slug: "telegram", name: "Telegram User",   url: "https://exploitsindia.site/api/telegram.php?exploits={query}",                  command: "/telegram", example: "7459756974",       pattern: "^[\\w@]{1,50}$",                                                               category: "Social",   credits: 1 },
  { slug: "pak",      name: "Pakistan Number", url: "https://abbas-apis.vercel.app/api/pakistan?number={query}",                      command: "/pak",      example: "3001234567",       pattern: "^\\d{10,12}$",                                                                 category: "Phone",    credits: 1 },
  { slug: "global",   name: "Global Number",  url: "https://api.bigdatacloud.net/data/phone-number-details?phoneNumber={query}&key=", command: "/global",   example: "14155552671",      pattern: "^\\d{7,15}$",                                                                  category: "Phone",    credits: 1 },
  { slug: "ff",       name: "Free Fire Info", url: "https://abbas-apis.vercel.app/api/ff-info?uid={query}",                          command: "/ff",       example: "123456789",        pattern: "^\\d{5,15}$",                                                                  category: "Gaming",   credits: 1 },
  { slug: "ffban",    name: "FF Ban Check",   url: "https://abbas-apis.vercel.app/api/ff-ban?uid={query}",                           command: "/ffban",    example: "123456789",        pattern: "^\\d{5,15}$",                                                                  category: "Gaming",   credits: 1 },
  { slug: "gstin",    name: "GSTIN Lookup",   url: "https://sheet.amorinthz.workers.dev/gst?gstin={query}",                          command: "/gstin",    example: "27AAPFU0939F1ZV", pattern: "^\\d{2}[A-Z]{5}\\d{4}[A-Z]\\d[Z][\\dA-Z]$",                                  category: "Identity", credits: 1 },
  { slug: "domain",   name: "Domain WHOIS",   url: "https://api.hackertarget.com/whois/?q={query}",                                  command: "/domain",   example: "example.com",      pattern: null,                                                                           category: "Network",  credits: 1 },
];

async function seedDefaultApis() {
  const count = await db.select({ count: sql<number>`count(*)` }).from(osintApis);
  if (Number(count[0].count) === 0) {
    for (const api of DEFAULT_APIS) {
      await db.insert(osintApis).values({
        ...api,
        isActive: true,
      }).onConflictDoNothing();
    }
  }
}

seedDefaultApis().catch(console.error);

function fetchUrl(url: string): Promise<{ data: Record<string, unknown>; statusCode: number }> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, {
      headers: {
        "Accept": "application/json, text/plain, */*",
        "User-Agent": "CraKa-OSINT-Portal/2.0",
      },
    }, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        const statusCode = res.statusCode ?? 200;
        try {
          const json = JSON.parse(body);
          resolve({ data: json, statusCode });
        } catch {
          resolve({ data: { raw: body.trim() }, statusCode });
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(15000, () => { req.destroy(new Error("Request timeout")); });
  });
}

function injectDeveloperCredit(data: Record<string, unknown>): Record<string, unknown> {
  const knownHandles = [
    "@Cyb3rS0ldier", "Cyb3rS0ldier",
    "@darkietech", "darkietech",
    "@abbas",
    "@AMORINTH", "amorinthz", "AMORINTH",
    "@exploitsindia", "exploitsindia",
    "Anish Exploits", "Anish",
  ];

  function replaceHandlesInString(s: string): string {
    let out = s;
    for (const handle of knownHandles) {
      const re = new RegExp(handle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      out = out.replace(re, DEVELOPER_CREDIT);
    }
    return out;
  }

  function processValue(val: unknown): unknown {
    if (typeof val === "string") return replaceHandlesInString(val);
    if (Array.isArray(val)) return val.map(processValue);
    if (val && typeof val === "object") return processObject(val as Record<string, unknown>);
    return val;
  }
  
  function processObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (/developer|credit|powered|made_by|author/i.test(key)) {
        result[key] = DEVELOPER_CREDIT;
      } else {
        result[key] = processValue(val);
      }
    }
    return result;
  }
  
  const processed = processObject(data);
  processed["Developer"] = DEVELOPER_CREDIT;
  return processed;
}

router.get("/osint/apis", async (req, res) => {
  const apis = await db.select().from(osintApis).where(eq(osintApis.isActive, true));
  const mapped = apis.map(a => ({
    id: a.id, slug: a.slug, name: a.name, url: a.url, command: a.command,
    example: a.example, pattern: a.pattern, category: a.category, credits: a.credits,
    isActive: a.isActive, createdAt: a.createdAt.toISOString(),
  }));
  res.json(mapped);
});

router.post("/osint/lookup", async (req, res) => {
  const { slug, query: rawQuery, sessionId } = req.body as { slug: string; query: string; sessionId: string };
  
  if (!slug || !rawQuery || !sessionId) {
    res.status(400).json({ error: "Missing slug, query, or sessionId" });
    return;
  }
  
  const api = await db.select().from(osintApis).where(and(eq(osintApis.slug, slug), eq(osintApis.isActive, true))).limit(1);
  if (!api[0]) {
    res.status(400).json({ error: "API not found or inactive" });
    return;
  }
  
  const apiRow = api[0];
  let query = rawQuery.trim();
  
  if (apiRow.pattern) {
    const regex = new RegExp(apiRow.pattern);
    if (!regex.test(query)) {
      res.status(400).json({ error: `Invalid format. Example: ${apiRow.example}` });
      return;
    }
  }

  // Token Validation
  const user = await db.select().from(crakaUsers).where(eq(crakaUsers.sessionId, sessionId)).limit(1);
  if (!user[0]) {
    res.status(401).json({ error: "User session not found. Please reload." });
    return;
  }
  
  if (user[0].creditsEarned < apiRow.credits) {
    res.status(403).json({ error: "Not enough tokens to perform this search. Please purchase premium." });
    return;
  }
  
  // Deduct tokens
  await db.update(crakaUsers)
    .set({ creditsEarned: sql`${crakaUsers.creditsEarned} - ${apiRow.credits}` })
    .where(eq(crakaUsers.sessionId, sessionId));
  
  if (["vehicle", "pan", "ifsc", "gstin"].includes(slug)) {
    query = query.toUpperCase().replace(/[\s\-]/g, "");
  }
  
  const cutoff = new Date(Date.now() - CACHE_TTL_MINUTES * 60 * 1000);
  const cached = await db.select().from(osintCache).where(
    and(eq(osintCache.slug, slug), eq(osintCache.queryVal, query), gt(osintCache.createdAt, cutoff))
  ).limit(1);
  
  if (cached[0]) {
    let data = JSON.parse(cached[0].result) as Record<string, unknown>;
    data = injectDeveloperCredit(data);
    await db.insert(osintHistory).values({ slug, apiName: apiRow.name, queryVal: query, success: true });
    res.json({ data, cached: true, apiName: apiRow.name, success: true, developer: DEVELOPER_CREDIT });
    return;
  }
  
  const url = apiRow.url.replace("{query}", encodeURIComponent(query));
  
  try {
    const { data: rawData, statusCode } = await fetchUrl(url);
    
    // Check if API failed or returned empty JSON object or empty string
    const isEmpty = !rawData || (typeof rawData === 'object' && Object.keys(rawData).length === 0);
    const hasErrorKey = rawData && typeof rawData === 'object' && ('error' in rawData || 'status' in rawData && (rawData as any).status === false);

    if (statusCode >= 400 || isEmpty || hasErrorKey) {
      await db.insert(osintHistory).values({ slug, apiName: apiRow.name, queryVal: query, success: false });
      // Refund tokens
      await db.update(crakaUsers).set({ creditsEarned: sql`${crakaUsers.creditsEarned} + ${apiRow.credits}` }).where(eq(crakaUsers.sessionId, sessionId));
      res.json({ data: rawData || {}, cached: false, apiName: apiRow.name, success: false, developer: DEVELOPER_CREDIT, error: `Search Failed or No Data (Tokens Refunded)` });
      return;
    }
    
    const data = injectDeveloperCredit(rawData);
    
    await db.insert(osintCache).values({ slug, queryVal: query, result: JSON.stringify(data) }).onConflictDoNothing();
    await db.insert(osintHistory).values({ slug, apiName: apiRow.name, queryVal: query, success: true });
    
    res.json({ data, cached: false, apiName: apiRow.name, success: true, developer: DEVELOPER_CREDIT });
  } catch (err) {
    await db.insert(osintHistory).values({ slug, apiName: apiRow.name, queryVal: query, success: false });
    // Refund tokens on catch error
    await db.update(crakaUsers).set({ creditsEarned: sql`${crakaUsers.creditsEarned} + ${apiRow.credits}` }).where(eq(crakaUsers.sessionId, sessionId));
    res.json({ data: {}, cached: false, apiName: apiRow.name, success: false, developer: DEVELOPER_CREDIT, error: "Network Error (Tokens Refunded)" });
  }
});

router.get("/osint/history", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
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

router.get("/osint/stats", async (req, res) => {
  const [totalResult, successResult, activeApisResult, cacheResult] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(osintHistory),
    db.select({ count: sql<number>`count(*)` }).from(osintHistory).where(eq(osintHistory.success, true)),
    db.select({ count: sql<number>`count(*)` }).from(osintApis).where(eq(osintApis.isActive, true)),
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
  
  const recentActivity = await db.select().from(osintHistory).orderBy(desc(osintHistory.createdAt)).limit(10);
  
  res.json({
    totalLookups: Number(totalResult[0].count),
    successfulLookups: Number(successResult[0].count),
    activeApis: Number(activeApisResult[0].count),
    cachedResults: Number(cacheResult[0].count),
    categoryBreakdown: categoryBreakdown.map(r => ({ category: r.category ?? "Unknown", count: Number(r.count) })),
    topApis: topApis.map(r => ({ apiName: r.apiName, count: Number(r.count) })),
    recentActivity: recentActivity.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })),
  });
});

export default router;
