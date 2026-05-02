import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const osintApis = pgTable("osint_apis", {
  id: serial("id").primaryKey(),
  slug: text("slug").unique().notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  command: text("command").notNull(),
  example: text("example").notNull(),
  pattern: text("pattern"),
  category: text("category").notNull().default("Miscellaneous"),
  credits: integer("credits").notNull().default(1),
  cacheTtlSeconds: integer("cache_ttl_seconds").notNull().default(1800),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOsintApiSchema = createInsertSchema(osintApis).omit({ id: true, createdAt: true });
export type InsertOsintApi = z.infer<typeof insertOsintApiSchema>;
export type OsintApi = typeof osintApis.$inferSelect;

export const osintHistory = pgTable("osint_history", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull(),
  apiName: text("api_name").notNull(),
  queryVal: text("query_val").notNull(),
  success: boolean("success").notNull().default(true),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOsintHistorySchema = createInsertSchema(osintHistory).omit({ id: true, createdAt: true });
export type InsertOsintHistory = z.infer<typeof insertOsintHistorySchema>;
export type OsintHistory = typeof osintHistory.$inferSelect;

export const osintCache = pgTable("osint_cache", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull(),
  queryVal: text("query_val").notNull(),
  result: text("result").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOsintCacheSchema = createInsertSchema(osintCache).omit({ id: true, createdAt: true });
export type InsertOsintCache = z.infer<typeof insertOsintCacheSchema>;
export type OsintCache = typeof osintCache.$inferSelect;

export const crakaUsers = pgTable("craka_users", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").unique().notNull(),
  referralCode: text("referral_code").unique().notNull(),
  referredBy: text("referred_by"),
  isPremium: boolean("is_premium").notNull().default(false),
  premiumPlan: text("premium_plan"),
  premiumExpiresAt: timestamp("premium_expires_at"),
  creditsEarned: integer("credits_earned").notNull().default(0),
  totalReferrals: integer("total_referrals").notNull().default(0),
  googleId: text("google_id").unique(),
  email: text("email"),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  emailVerified: boolean("email_verified").notNull().default(false),
  magicLinkToken: text("magic_link_token"),
  magicLinkExpiry: timestamp("magic_link_expiry"),
  passwordHash: text("password_hash"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpiry: timestamp("password_reset_expiry"),
  twoFaSecret: text("two_fa_secret"),
  twoFaEnabled: boolean("two_fa_enabled").notNull().default(false),
  isBanned: boolean("is_banned").notNull().default(false),
  banReason: text("ban_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const broadcasts = pgTable("broadcasts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBroadcastSchema = createInsertSchema(broadcasts).omit({ id: true, createdAt: true });
export type InsertBroadcast = z.infer<typeof insertBroadcastSchema>;
export type Broadcast = typeof broadcasts.$inferSelect;

export const loginLogs = pgTable("login_logs", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  email: text("email"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  status: text("status").notNull().default("success"),
  method: text("method").notNull().default("google"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type LoginLog = typeof loginLogs.$inferSelect;

export const insertCrakaUserSchema = createInsertSchema(crakaUsers).omit({ id: true, createdAt: true });
export type InsertCrakaUser = z.infer<typeof insertCrakaUserSchema>;
export type CrakaUser = typeof crakaUsers.$inferSelect;

export const crakaReferrals = pgTable("craka_referrals", {
  id: serial("id").primaryKey(),
  referrerCode: text("referrer_code").notNull(),
  referredSessionId: text("referred_session_id").notNull(),
  creditsAwarded: integer("credits_awarded").notNull().default(10),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCrakaReferralSchema = createInsertSchema(crakaReferrals).omit({ id: true, createdAt: true });
export type InsertCrakaReferral = z.infer<typeof insertCrakaReferralSchema>;
export type CrakaReferral = typeof crakaReferrals.$inferSelect;

export const osintTokenTransactions = pgTable("osint_token_transactions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  type: text("type").notNull(),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOsintTokenTransactionSchema = createInsertSchema(osintTokenTransactions).omit({ id: true, createdAt: true });
export type InsertOsintTokenTransaction = z.infer<typeof insertOsintTokenTransactionSchema>;
export type OsintTokenTransaction = typeof osintTokenTransactions.$inferSelect;

export const bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  slug: text("slug").notNull(),
  apiName: text("api_name").notNull(),
  queryVal: text("query_val").notNull(),
  label: text("label"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBookmarkSchema = createInsertSchema(bookmarks).omit({ id: true, createdAt: true });
export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;
export type Bookmark = typeof bookmarks.$inferSelect;

export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").unique().notNull(),
  description: text("description"),
  credits: integer("credits").notNull().default(10),
  maxUses: integer("max_uses").notNull().default(1),
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCouponSchema = createInsertSchema(coupons).omit({ id: true, createdAt: true });
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type Coupon = typeof coupons.$inferSelect;

export const couponUses = pgTable("coupon_uses", {
  id: serial("id").primaryKey(),
  couponCode: text("coupon_code").notNull(),
  sessionId: text("session_id").notNull(),
  creditsAwarded: integer("credits_awarded").notNull(),
  usedAt: timestamp("used_at").defaultNow().notNull(),
});

export type CouponUse = typeof couponUses.$inferSelect;

export const scheduledBroadcasts = pgTable("scheduled_broadcasts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  sent: boolean("sent").notNull().default(false),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertScheduledBroadcastSchema = createInsertSchema(scheduledBroadcasts).omit({ id: true, createdAt: true });
export type InsertScheduledBroadcast = z.infer<typeof insertScheduledBroadcastSchema>;
export type ScheduledBroadcast = typeof scheduledBroadcasts.$inferSelect;
