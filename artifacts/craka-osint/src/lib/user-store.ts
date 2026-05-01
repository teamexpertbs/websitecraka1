import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SignedInUser {
  sessionId: string;
  referralCode: string;
  email: string;
  name: string;
  avatarUrl?: string;
  isPremium: boolean;
  premiumPlan?: string | null;
  premiumExpiresAt?: string | null;
  creditsEarned: number;
  totalReferrals: number;
}

interface UserStore {
  userToken: string | null;
  signedInUser: SignedInUser | null;
  setUserToken: (token: string | null, user: SignedInUser | null) => void;
  logout: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      userToken: null,
      signedInUser: null,
      setUserToken: (token, user) => set({ userToken: token, signedInUser: user }),
      logout: () => set({ userToken: null, signedInUser: null }),
    }),
    {
      name: "craka_user_auth",
    }
  )
);
