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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
