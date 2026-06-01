import { db, osintTokenTransactions } from "@workspace/db";

export type TxnType = "spend" | "refund" | "earn" | "grant" | "bonus" | "init" | "expire" | "revoke" | "adjust";
export type TxnSource = "free" | "premium" | "referral" | "coupon" | "admin" | "signup" | "spend" | "refund";

export async function logTokenTxn(params: {
  sessionId: string;
  type: TxnType;
  amount: number;
  reason: string;
  balanceAfter: number;
  source?: TxnSource;
}): Promise<void> {
  try {
    await db.insert(osintTokenTransactions).values({
      sessionId: params.sessionId,
      type: params.type,
      amount: params.amount,
      reason: params.reason,
      source: params.source ?? "earn",
      balanceAfter: params.balanceAfter,
    });
  } catch {
    // Best-effort logging — never block the main flow
  }
}
