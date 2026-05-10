import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getOrCreateSession, ensureUserInitialized } from "./session";
import { useUserStore } from "./user-store";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface CurrentUser {
  referralCode: string;
  isPremium: boolean;
  premiumPlan: string | null;
  premiumExpiresAt: string | null;
  creditsEarned: number;
  totalReferrals: number;
  referredBy: string | null;
  recentReferrals?: Array<{ date: string; credits: number }>;
}

export const CURRENT_USER_KEY = ["current-user"];

async function fetchCurrentUser(signedInSessionId?: string): Promise<CurrentUser | null> {
  // For signed-in users always use their account's sessionId — never a random one
  const sessionId = signedInSessionId ?? getOrCreateSession();
  if (!signedInSessionId) {
    await ensureUserInitialized();
  }
  const res = await fetch(`${API_BASE}/api/user/me?sessionId=${encodeURIComponent(sessionId)}`);
  if (!res.ok) return null;
  return (await res.json()) as CurrentUser;
}

export function useCurrentUser() {
  const signedInUser = useUserStore((s) => s.signedInUser);
  const sessionId = signedInUser?.sessionId;
  return useQuery({
    queryKey: [...CURRENT_USER_KEY, sessionId],
    queryFn: () => fetchCurrentUser(sessionId),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useRefreshCurrentUser() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: CURRENT_USER_KEY });
}

export function useEnsureUserInitialized() {
  const signedInUser = useUserStore((s) => s.signedInUser);
  useEffect(() => {
    // Only initialize anonymous sessions; signed-in users already have an account
    if (!signedInUser) {
      ensureUserInitialized();
    }
  }, [signedInUser]);
}

export function isUnlimitedUser(user: CurrentUser | null | undefined): boolean {
  if (!user) return false;
  if (!user.isPremium || !user.premiumPlan) return false;
  return user.premiumPlan.toLowerCase() === "elite";
}

export function isPremiumActive(user: CurrentUser | null | undefined): boolean {
  if (!user || !user.isPremium) return false;
  if (!user.premiumExpiresAt) return user.isPremium;
  return new Date(user.premiumExpiresAt).getTime() > Date.now();
}
