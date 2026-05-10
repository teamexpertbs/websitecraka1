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
  _hasHydrated: boolean;
  setUserToken: (token: string | null, user: SignedInUser | null) => void;
  logout: () => void;
  setHasHydrated: (v: boolean) => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      userToken: null,
      signedInUser: null,
      _hasHydrated: false,
      setUserToken: (token, user) => set({ userToken: token, signedInUser: user }),
      logout: () => set({ userToken: null, signedInUser: null }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: "craka_user_auth",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
