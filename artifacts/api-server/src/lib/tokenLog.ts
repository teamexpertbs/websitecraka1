import { db, osintTokenTransactions } from "@workspace/db";

export type TxnType = "spend" | "refund" | "earn" | "grant" | "bonus" | "init";

export async function logTokenTxn(params: {
  sessionId: string;
  type: TxnType;
  amount: number;
  reason: string;
  balanceAfter: number;
}): Promise<void> {
  try {
    await db.insert(osintTokenTransactions).values({
      sessionId: params.sessionId,
      type: params.type,
      amount: params.amount,
      reason: params.reason,
      balanceAfter: params.balanceAfter,
    });
  } catch {
    // Best-effort logging — never block the main flow
  }
}
