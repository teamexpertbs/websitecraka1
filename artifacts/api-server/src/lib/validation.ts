import { z } from "zod";

/**
 * Request validation schemas for API endpoints
 */

// ===== User Routes =====
export const UserInitSchema = z.object({
  sessionId: z.string().min(1, "sessionId required").max(255),
  referralCode: z.string().optional(),
});

export const UserMeSchema = z.object({
  sessionId: z.string().min(1, "sessionId required"),
});

// ===== OSINT Routes =====
export const OsintLookupSchema = z.object({
  slug: z.string().min(1, "slug required"),
  query: z.string().min(1, "query required").max(255),
  sessionId: z.string().min(1, "sessionId required"),
});

export const OsintLookupBulkSchema = z.object({
  slug: z.string().min(1, "slug required"),
  queries: z.array(z.string().min(1).max(255)).min(1).max(50, "Maximum 50 queries allowed"),
  sessionId: z.string().min(1, "sessionId required"),
});

export const OsintHistorySchema = z.object({
  limit: z.number().int().min(1).max(200).optional(),
  page: z.number().int().min(1).optional(),
});

// ===== Admin Routes =====
export const AdminLoginSchema = z.object({
  username: z.string().min(1, "username required"),
  password: z.string().min(1, "password required"),
});

export const AdminCreateApiSchema = z.object({
  slug: z.string().min(1, "slug required").max(50),
  name: z.string().min(1, "name required").max(100),
  url: z.string().url("url must be valid URL"),
  command: z.string().min(1),
  example: z.string().min(1),
  pattern: z.string().optional(),
  category: z.string().max(50),
  credits: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

export const AdminUpdateApiSchema = AdminCreateApiSchema.partial();

export const AdminGrantPremiumSchema = z.object({
  code: z.string().min(1, "referral code required"),
  plan: z.enum(["basic", "standard", "premium"]),
});

export const AdminCacheClearSchema = z.object({
  slug: z.string().optional(),
});

// ===== Type exports for TypeScript =====
export type UserInit = z.infer<typeof UserInitSchema>;
export type UserMe = z.infer<typeof UserMeSchema>;
export type OsintLookup = z.infer<typeof OsintLookupSchema>;
export type OsintLookupBulk = z.infer<typeof OsintLookupBulkSchema>;
export type OsintHistory = z.infer<typeof OsintHistorySchema>;
export type AdminLogin = z.infer<typeof AdminLoginSchema>;
export type AdminCreateApi = z.infer<typeof AdminCreateApiSchema>;
export type AdminGrantPremium = z.infer<typeof AdminGrantPremiumSchema>;

/**
 * Validation error formatter
 */
export function formatValidationError(error: z.ZodError) {
  return {
    error: "Validation failed",
    issues: error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    })),
  };
}
