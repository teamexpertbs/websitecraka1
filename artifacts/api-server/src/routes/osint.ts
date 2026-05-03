import { Router } from "express";
import { db, osintApis, osintHistory, osintCache, crakaUsers } from "@workspace/db";
import { eq, sql, desc, and, gt } from "drizzle-orm";
import https from "https";
import http from "http";
import { logTokenTxn } from "../lib/tokenLog";
import { createRateLimiter } from "../lib/rateLimit";
import { lookupIndiaPhone } from "../lib/indiaPhoneLookup";

const router = Router();

const DEVELOPER_CREDIT = "@DM_CRAKA_OWNER_BOT";
const DEFAULT_CACHE_TTL_SECONDS = 1800; // 30 minutes

// Per-session rate limit on lookups: 10 requests / minute
const lookupRateLimit = createRateLimiter({
  windowMs: 60_000,
  max: 10,
  keyFn: (req) => {
    const sid = (req.body && (req.body as any).sessionId) as string | undefined;
    return sid && typeof sid === "string" ? `lookup:${sid}` : null;
  },
  message: "Too many lookups. Aap ek minute mein sirf 10 searches kar sakte hain. Thodi der ruk kar try karein.",
});

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
  { slug: "email",    name: "Email Check",     url: "https://disify.com/api/email/{query}",                                            command: "/email",    example: "test@gmail.com",   pattern: "^[\\w\\.\\-]+@[\\w\\.\\-]+\\.\\w+$",                                           category: "Email",    credits: 1 },
  { slug: "telegram",  name: "Telegram User",    url: "https://exploitsindia.site/api/telegram.php?exploits={query}",                  command: "/telegram",  example: "7459756974",    pattern: "^[\\w@]{1,50}$",                                                               category: "Social",   credits: 1 },
  { slug: "instagram", name: "Instagram Lookup", url: "https://exploitsindia.site/api/instagram.php?exploits={query}",                command: "/instagram", example: "instagram",      pattern: "^[\\w\\.]+$",                                                                  category: "Social",   credits: 1 },
  { slug: "pak",      name: "Pakistan Number",  url: "https://abbas-apis.vercel.app/api/pakistan?number={query}",                      command: "/pak",      example: "3001234567",       pattern: "^\\d{10,12}$",                                                                 category: "Phone",    credits: 1 },
  { slug: "global",   name: "Global Number",  url: "https://api.bigdatacloud.net/data/phone-number-details?phoneNumber={query}&key=", command: "/global",   example: "14155552671",      pattern: "^\\d{7,15}$",                                                                  category: "Phone",    credits: 1 },
  { slug: "ff",       name: "Free Fire Info", url: "https://abbas-apis.vercel.app/api/ff-info?uid={query}",                          command: "/ff",       example: "123456789",        pattern: "^\\d{5,15}$",                                                                  category: "Gaming",   credits: 1 },
  { slug: "ffban",    name: "FF Ban Check",   url: "https://abbas-apis.vercel.app/api/ff-ban?uid={query}",                           command: "/ffban",    example: "123456789",        pattern: "^\\d{5,15}$",                                                                  category: "Gaming",   credits: 1 },
  { slug: "gstin",    name: "GSTIN Lookup",   url: "https://sheet.amorinthz.workers.dev/gst?gstin={query}",                          command: "/gstin",    example: "27AAPFU0939F1ZV", pattern: "^\\d{2}[A-Z]{5}\\d{4}[A-Z]\\d[Z][\\dA-Z]$",                                  category: "Identity", credits: 1 },
  { slug: "domain",   name: "Domain WHOIS",   url: "https://api.whois.vu/?q={query}",                                                command: "/domain",   example: "example.com",      pattern: null,                                                                           category: "Network",  credits: 1 },
  { slug: "github",   name: "GitHub User",    url: "https://api.github.com/users/{query}",                                            command: "/github",   example: "torvalds",         pattern: "^[\\w\\-\\.]{1,39}$",                                                          category: "Social",   credits: 1 },
  { slug: "dl",       name: "Driving License",url: "https://exploitsindia.site/api/dl.php?exploits={query}",                          command: "/dl",       example: "HR26 20110012345", pattern: null,                                                                           category: "Identity", credits: 1 },
  { slug: "discord",  name: "Discord User",   url: "https://discord-lookup-api.vercel.app/v1/user/{query}",                           command: "/discord",  example: "1234567890123456", pattern: "^\\d{15,20}$",                                                                 category: "Social",   credits: 1 },
  { slug: "pubg",     name: "PUBG/BGMI",      url: "https://api.tracker.gg/api/v2/pubg/standard/profile/steam/{query}/segments/overview",command: "/pubg",    example: "PlayerName",       pattern: null,                                                                           category: "Gaming",   credits: 1 },
  { slug: "twitter",  name: "Twitter/X User", url: "https://api.fxtwitter.com/{query}",                                               command: "/twitter",  example: "elonmusk",         pattern: "^[\\w]{1,50}$",                                                                category: "Social",   credits: 1 },
  { slug: "aadhaar2", name: "Aadhaar-Mobile", url: "https://exploitsindia.site/api/aadhaar_mobile.php?number={query}",                command: "/aadhaar2", example: "882838027159",     pattern: "^\\d{12}$",                                                                    category: "Identity", credits: 1 },
];

async function seedDefaultApis() {
  for (const api of DEFAULT_APIS) {
    await db.insert(osintApis).values({ ...api, isActive: true }).onConflictDoNothing();
  }
}

// Fix broken/outdated URLs for existing records in DB
const URL_FIXES: Record<string, Partial<typeof DEFAULT_APIS[0]>> = {
  discord:  { url: "https://discord-lookup-api.vercel.app/v1/user/{query}", example: "960995336476053534" },
  twitter:  { url: "https://api.fxtwitter.com/{query}", example: "elonmusk" },
  pubg:     { url: "https://api.tracker.gg/api/v2/pubg/standard/profile/steam/{query}/segments/overview", example: "PlayerName", pattern: null },
  dl:       { url: "https://exploitsindia.site/api/dl.php?exploits={query}", example: "HR26 20110012345" },
  aadhaar2: { url: "https://exploitsindia.site/api/aadhaar_mobile.php?number={query}", example: "882838027159" },
  github:   { url: "https://api.github.com/users/{query}", example: "torvalds" },
};

async function updateBrokenApis() {
  for (const [slug, fixes] of Object.entries(URL_FIXES)) {
    await db.update(osintApis)
      .set(fixes as any)
      .where(eq(osintApis.slug, slug));
  }
}

seedDefaultApis()
  .then(() => updateBrokenApis())
  .catch(console.error);

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
    cacheTtlSeconds: a.cacheTtlSeconds,
    isActive: a.isActive, createdAt: a.createdAt.toISOString(),
  }));
  res.json(mapped);
});

router.post("/osint/lookup", lookupRateLimit, async (req, res) => {
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
  const userRaw = await db.select().from(crakaUsers).where(eq(crakaUsers.sessionId, sessionId)).limit(1);
  if (!userRaw[0]) {
    res.status(401).json({ error: "User session not found. Please reload." });
    return;
  }

  // ── Banned User Check ────────────────────────────────────────────────────
  if (userRaw[0].isBanned) {
    res.status(403).json({ error: "Your account has been suspended. Contact support." });
    return;
  }

  // ── Premium Expiry Check ──────────────────────────────────────────────────
  // If premium has expired, immediately reset to free plan and cap tokens
  const FREE_PLAN_TOKENS = 10;
  let userData = userRaw[0];
  if (userData.isPremium && userData.premiumExpiresAt && new Date() > userData.premiumExpiresAt) {
    const [resetUser] = await db.update(crakaUsers)
      .set({ isPremium: false, premiumPlan: null, premiumExpiresAt: null, creditsEarned: FREE_PLAN_TOKENS })
      .where(eq(crakaUsers.sessionId, sessionId))
      .returning();
    await logTokenTxn({ sessionId, type: "expire", amount: 0, reason: "Premium expired — tokens reset to free plan limit", balanceAfter: FREE_PLAN_TOKENS });
    userData = resetUser;
  }

  const user = [userData];
  const isUnlimited = user[0].isPremium && user[0].premiumPlan && user[0].premiumPlan.toLowerCase() === "elite";
  
  if (!isUnlimited && user[0].creditsEarned < apiRow.credits) {
    res.status(403).json({ error: "Not enough tokens to perform this search. Please purchase premium." });
    return;
  }
  
  if (!isUnlimited) {
    // Deduct tokens
    const [updated] = await db.update(crakaUsers)
      .set({ creditsEarned: sql`${crakaUsers.creditsEarned} - ${apiRow.credits}` })
      .where(eq(crakaUsers.sessionId, sessionId))
      .returning({ creditsEarned: crakaUsers.creditsEarned });
    await logTokenTxn({
      sessionId,
      type: "spend",
      amount: -apiRow.credits,
      reason: `${apiRow.name} lookup`,
      balanceAfter: updated?.creditsEarned ?? 0,
    });
  }
  
  if (["vehicle", "pan", "ifsc", "gstin"].includes(slug)) {
    query = query.toUpperCase().replace(/[\s\-]/g, "");
  }
  
  const ttlSeconds = (apiRow as any).cacheTtlSeconds ?? DEFAULT_CACHE_TTL_SECONDS;
  const cutoff = new Date(Date.now() - ttlSeconds * 1000);
  const cached = await db.select().from(osintCache).where(
    and(eq(osintCache.slug, slug), eq(osintCache.queryVal, query), gt(osintCache.createdAt, cutoff))
  ).limit(1);
  
  if (cached[0]) {
    let data = JSON.parse(cached[0].result) as Record<string, unknown>;
    data = injectDeveloperCredit(data);
    await db.insert(osintHistory).values({ slug, apiName: apiRow.name, queryVal: query, success: true, sessionId });
    res.json({ data, cached: true, apiName: apiRow.name, success: true, developer: DEVELOPER_CREDIT });
    return;
  }

  // ── Custom built-in handlers for specific slugs ──────────────────────────
  if (slug === "dl") {
    // Parse DL number: State(2) + RTO(2-3) + Year(4) + Serial(4-7)
    const dlRaw = query.toUpperCase().replace(/[\s\-]/g, "");
    const dlMatch = dlRaw.match(/^([A-Z]{2})(\d{2})(\d{4})(\d{4,7})$/);
    const stateMap: Record<string, string> = {
      "AP":"Andhra Pradesh","AR":"Arunachal Pradesh","AS":"Assam","BR":"Bihar","CG":"Chhattisgarh",
      "GA":"Goa","GJ":"Gujarat","HR":"Haryana","HP":"Himachal Pradesh","JK":"Jammu & Kashmir",
      "JH":"Jharkhand","KA":"Karnataka","KL":"Kerala","MP":"Madhya Pradesh","MH":"Maharashtra",
      "MN":"Manipur","ML":"Meghalaya","MZ":"Mizoram","NL":"Nagaland","OD":"Odisha",
      "PB":"Punjab","RJ":"Rajasthan","SK":"Sikkim","TN":"Tamil Nadu","TS":"Telangana",
      "TR":"Tripura","UP":"Uttar Pradesh","UK":"Uttarakhand","WB":"West Bengal",
      "AN":"Andaman & Nicobar","CH":"Chandigarh","DN":"Dadra & Nagar Haveli","DD":"Daman & Diu",
      "DL":"Delhi","LD":"Lakshadweep","PY":"Puducherry","LA":"Ladakh",
    };
    if (dlMatch) {
      const [, stateCode, rtoCode, year, serial] = dlMatch;
      const data = injectDeveloperCredit({
        "🪪 DL Number": query,
        "📍 State": stateMap[stateCode] || stateCode,
        "🏢 Issuing RTO": `${stateCode}-${rtoCode} (${stateMap[stateCode] || stateCode})`,
        "📅 Issue Year": year,
        "🔢 Serial": serial,
        "✅ Format Valid": "Yes",
        "⚠️ Note": "Full DL data requires government API access. Basic format parsed from DL number.",
      });
      await db.insert(osintCache).values({ slug, queryVal: query, result: JSON.stringify(data) }).onConflictDoNothing();
      await db.insert(osintHistory).values({ slug, apiName: apiRow.name, queryVal: query, success: true, sessionId });
      res.json({ data, cached: false, apiName: apiRow.name, success: true, developer: DEVELOPER_CREDIT });
      return;
    }
    // Fallback: try external API anyway
  }

  if (slug === "aadhaar2") {
    // Aadhaar-Mobile: parse Aadhaar and return what we can infer
    const aaNum = query.trim();
    const verhoeff = [
      [0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],
      [4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],
      [8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]
    ];
    const permute = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0]];
    let check = 0;
    const reversed = aaNum.split("").reverse();
    for (let i = 0; i < reversed.length; i++) {
      check = verhoeff[check][permute[i % 8][parseInt(reversed[i])]];
    }
    const stateFirstDigitMap: Record<string, string> = {
      "1":"Jammu & Kashmir / Delhi","2":"Himachal Pradesh / Haryana","3":"Punjab / Rajasthan",
      "4":"Gujarat / Maharashtra","5":"Chhattisgarh / Madhya Pradesh","6":"Uttarakhand / Uttar Pradesh",
      "7":"Bihar / Jharkhand","8":"West Bengal / Odisha","9":"Assam / NE States",
    };
    const region = stateFirstDigitMap[aaNum[0]] || "Unknown";
    const data = injectDeveloperCredit({
      "🆔 Aadhaar Number": `XXXX XXXX ${aaNum.slice(-4)}`,
      "✅ Checksum Valid": check === 0 ? "Yes (Valid Aadhaar format)" : "No (Invalid number)",
      "🌍 Estimated Region": region,
      "📞 Linked Mobile": "Requires UIDAI authorization — not publicly accessible",
      "🔒 Note": "Mobile-Aadhaar link data is protected under UIDAI. Only authorized agencies can access.",
    });
    await db.insert(osintCache).values({ slug, queryVal: query, result: JSON.stringify(data) }).onConflictDoNothing();
    await db.insert(osintHistory).values({ slug, apiName: apiRow.name, queryVal: query, success: true, sessionId });
    res.json({ data, cached: false, apiName: apiRow.name, success: true, developer: DEVELOPER_CREDIT });
    return;
  }

  if (slug === "pubg") {
    // Use tracker.gg unofficial data — try public player stats
    const apiUrl = `https://api.tracker.gg/api/v2/pubg/standard/profile/steam/${encodeURIComponent(query)}/segments/overview`;
    try {
      const { data: rawData, statusCode } = await fetchUrl(apiUrl);
      if (statusCode === 200 && rawData && (rawData as any).data) {
        const seg = (rawData as any).data;
        const attrs = seg.attributes || {};
        const stats = seg.stats || {};
        const flatData = injectDeveloperCredit({
          "🎮 Player": attrs.playerHandle || query,
          "🏆 Matches": stats.matches?.value ?? "—",
          "💀 Kills": stats.kills?.value ?? "—",
          "☠️ Deaths": stats.deaths?.value ?? "—",
          "📊 KD Ratio": stats.kdRatio?.displayValue ?? "—",
          "🥇 Wins": stats.wins?.value ?? "—",
          "📈 Win%": stats.winRatio?.displayValue ?? "—",
          "⭐ Damage/Match": stats.damageDealt?.displayValue ?? "—",
          "🎯 Headshot%": stats.headshotKillsRatio?.displayValue ?? "—",
          "Source": "tracker.gg",
        });
        await db.insert(osintCache).values({ slug, queryVal: query, result: JSON.stringify(flatData) }).onConflictDoNothing();
        await db.insert(osintHistory).values({ slug, apiName: apiRow.name, queryVal: query, success: true, sessionId });
        res.json({ data: flatData, cached: false, apiName: apiRow.name, success: true, developer: DEVELOPER_CREDIT });
        return;
      }
    } catch { /* fall through to error */ }
    // tracker.gg blocked/no data — return helpful message
    const fallback = injectDeveloperCredit({
      "🎮 Query": query,
      "⚠️ Status": "Player not found or stats unavailable",
      "📝 Note": "PUBG/BGMI Mobile stats require an authenticated API. PC PUBG player name lookup via tracker.gg.",
      "🔍 Tip": "Make sure you are using a PC PUBG Steam username (not BGMI mobile ID)",
    });
    await db.insert(osintHistory).values({ slug, apiName: apiRow.name, queryVal: query, success: false, sessionId });
    if (!isUnlimited) {
      const [refunded] = await db.update(crakaUsers)
        .set({ creditsEarned: sql`${crakaUsers.creditsEarned} + ${apiRow.credits}` })
        .where(eq(crakaUsers.sessionId, sessionId))
        .returning({ creditsEarned: crakaUsers.creditsEarned });
      await logTokenTxn({ sessionId, type: "refund", amount: apiRow.credits, reason: `${apiRow.name} lookup failed — refunded`, balanceAfter: refunded?.creditsEarned ?? 0 });
    }
    res.json({ data: fallback, cached: false, apiName: apiRow.name, success: false, developer: DEVELOPER_CREDIT, error: "No PUBG data found (Tokens Refunded)" });
    return;
  }

  if (slug === "twitter") {
    // fxtwitter returns { code, user: { ... } } — flatten it
    const twtUrl = `https://api.fxtwitter.com/${encodeURIComponent(query)}`;
    try {
      const { data: rawData, statusCode } = await fetchUrl(twtUrl);
      const user = (rawData as any)?.user;
      if (statusCode === 200 && user) {
        const flatData = injectDeveloperCredit({
          "🐦 Username": `@${user.screen_name || query}`,
          "👤 Name": user.name || "—",
          "📝 Bio": user.description || "—",
          "👥 Followers": user.followers?.toLocaleString() ?? "—",
          "➡️ Following": user.following?.toLocaleString() ?? "—",
          "🐦 Tweets": user.tweets?.toLocaleString() ?? "—",
          "❤️ Likes": user.likes?.toLocaleString() ?? "—",
          "✅ Verified": user.verified ? "Yes" : "No",
          "🖼️ Avatar": user.avatar_url || "—",
          "🔗 URL": `https://x.com/${user.screen_name || query}`,
          "📅 Joined": user.created_at || "—",
          "📍 Location": user.location || "—",
          "🌐 Website": user.website?.url || "—",
        });
        await db.insert(osintCache).values({ slug, queryVal: query, result: JSON.stringify(flatData) }).onConflictDoNothing();
        await db.insert(osintHistory).values({ slug, apiName: apiRow.name, queryVal: query, success: true, sessionId });
        res.json({ data: flatData, cached: false, apiName: apiRow.name, success: true, developer: DEVELOPER_CREDIT });
        return;
      }
    } catch { /* fall through */ }
    await db.insert(osintHistory).values({ slug, apiName: apiRow.name, queryVal: query, success: false, sessionId });
    if (!isUnlimited) {
      const [refunded] = await db.update(crakaUsers).set({ creditsEarned: sql`${crakaUsers.creditsEarned} + ${apiRow.credits}` }).where(eq(crakaUsers.sessionId, sessionId)).returning({ creditsEarned: crakaUsers.creditsEarned });
      await logTokenTxn({ sessionId, type: "refund", amount: apiRow.credits, reason: `Twitter lookup failed — refunded`, balanceAfter: refunded?.creditsEarned ?? 0 });
    }
    res.json({ data: {}, cached: false, apiName: apiRow.name, success: false, developer: DEVELOPER_CREDIT, error: "Twitter user not found or lookup failed (Tokens Refunded)" });
    return;
  }

  const url = apiRow.url.replace("{query}", encodeURIComponent(query));
  
  try {
    const { data: rawData, statusCode } = await fetchUrl(url);
    
    // Check if API truly failed
    const isEmpty = !rawData || (typeof rawData === 'object' && Object.keys(rawData).length === 0);

    // Only treat as error if 'error' key has a real value (not null/empty/false)
    const errorVal = rawData && typeof rawData === 'object' ? (rawData as any).error : undefined;
    const hasRealError = errorVal !== null && errorVal !== undefined && errorVal !== "" && errorVal !== false;

    // Only refund if status is explicitly false (boolean)
    const hasStatusFalse = rawData && typeof rawData === 'object'
      && (rawData as any).status === false;

    // Detect plain-text "PROTECTED" / paid-wall responses (e.g. exploitsindia paid APIs)
    const rawText = typeof (rawData as any)?.raw === "string" ? (rawData as any).raw as string : "";
    const isProtected = rawText.includes("PROTECTED") || rawText.includes("⚠️ PROTECTED");

    // Detect "Invalid API Response" from broken exploitsindia endpoints
    const isInvalidApiResponse = rawText.includes("Invalid API Response");

    // For phone slug: use built-in TRAI lookup as fallback when external API is broken
    if (slug === "phone" && (isInvalidApiResponse || isProtected)) {
      const info = lookupIndiaPhone(query);
      const fallbackData = injectDeveloperCredit({
        "📞 Phone Number": info.formattedNumber,
        "🌍 Country": `${info.countryName} (${info.countryCode})`,
        "📡 Operator": info.operator,
        "📍 Telecom Circle": info.circle,
        "📱 Number Type": info.numberType,
        "✅ Valid": info.isValid ? "Yes" : "No",
        "🔢 Prefix": info.mobilePrefix,
        "ℹ️ Note": info.note,
        "Source": "TRAI Numbering Plan (Built-in)",
      });
      await db.insert(osintCache).values({ slug, queryVal: query, result: JSON.stringify(fallbackData) }).onConflictDoNothing();
      await db.insert(osintHistory).values({ slug, apiName: apiRow.name, queryVal: query, success: true, sessionId });
      res.json({ data: fallbackData, cached: false, apiName: apiRow.name, success: true, developer: DEVELOPER_CREDIT });
      return;
    }

    const isActualFailure = statusCode >= 400 || isEmpty || hasRealError || hasStatusFalse || isProtected || isInvalidApiResponse;

    if (isActualFailure) {
      await db.insert(osintHistory).values({ slug, apiName: apiRow.name, queryVal: query, success: false, sessionId });
      if (!isUnlimited) {
        // Refund tokens
        const [refunded] = await db.update(crakaUsers)
          .set({ creditsEarned: sql`${crakaUsers.creditsEarned} + ${apiRow.credits}` })
          .where(eq(crakaUsers.sessionId, sessionId))
          .returning({ creditsEarned: crakaUsers.creditsEarned });
        await logTokenTxn({
          sessionId,
          type: "refund",
          amount: apiRow.credits,
          reason: `${apiRow.name} lookup failed — refunded`,
          balanceAfter: refunded?.creditsEarned ?? 0,
        });
      }
      res.json({ data: rawData || {}, cached: false, apiName: apiRow.name, success: false, developer: DEVELOPER_CREDIT, error: `Search Failed or No Data (Tokens Refunded)` });
      return;
    }
    
    const data = injectDeveloperCredit(rawData);
    
    await db.insert(osintCache).values({ slug, queryVal: query, result: JSON.stringify(data) }).onConflictDoNothing();
    await db.insert(osintHistory).values({ slug, apiName: apiRow.name, queryVal: query, success: true, sessionId });
    
    res.json({ data, cached: false, apiName: apiRow.name, success: true, developer: DEVELOPER_CREDIT });
  } catch (err) {
    await db.insert(osintHistory).values({ slug, apiName: apiRow.name, queryVal: query, success: false, sessionId });
    if (!isUnlimited) {
      // Refund tokens on catch error
      const [refunded] = await db.update(crakaUsers)
        .set({ creditsEarned: sql`${crakaUsers.creditsEarned} + ${apiRow.credits}` })
        .where(eq(crakaUsers.sessionId, sessionId))
        .returning({ creditsEarned: crakaUsers.creditsEarned });
      await logTokenTxn({
        sessionId,
        type: "refund",
        amount: apiRow.credits,
        reason: `${apiRow.name} network error — refunded`,
        balanceAfter: refunded?.creditsEarned ?? 0,
      });
    }
    res.json({ data: {}, cached: false, apiName: apiRow.name, success: false, developer: DEVELOPER_CREDIT, error: "Network Error (Tokens Refunded)" });
  }
});

router.get("/osint/history", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const offset = (page - 1) * limit;
  const sessionId = String(req.query.sessionId || "").trim();

  if (!sessionId) {
    res.status(400).json({ error: "sessionId required" });
    return;
  }

  const [entries, totalResult] = await Promise.all([
    db.select().from(osintHistory)
      .where(eq(osintHistory.sessionId, sessionId))
      .orderBy(desc(osintHistory.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(osintHistory)
      .where(eq(osintHistory.sessionId, sessionId)),
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
