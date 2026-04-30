import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getOrCreateSession, ensureUserInitialized } from "./session";

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

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  await ensureUserInitialized();
  const sessionId = getOrCreateSession();
  const res = await fetch(`${API_BASE}/api/user/me?sessionId=${encodeURIComponent(sessionId)}`);
  if (!res.ok) return null;
  return (await res.json()) as CurrentUser;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_KEY,
    queryFn: fetchCurrentUser,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useRefreshCurrentUser() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: CURRENT_USER_KEY });
}

export function useEnsureUserInitialized() {
  useEffect(() => {
    ensureUserInitialized();
  }, []);
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
