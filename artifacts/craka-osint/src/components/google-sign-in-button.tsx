import { useEffect, useRef, useState } from "react";
import { useUserStore } from "@/lib/user-store";
import { getOrCreateSession } from "@/lib/session";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, options: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          revoke: (email: string, done: () => void) => void;
          disableAutoSelect: () => void;
        };
      };
    };
    handleGoogleCredential?: (response: { credential: string }) => void;
  }
}

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

interface Props {
  onSuccess?: () => void;
  size?: "large" | "medium";
}

export function GoogleSignInButton({ onSuccess, size = "large" }: Props) {
  const btnRef = useRef<HTMLDivElement>(null);
  const { setUserToken } = useUserStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [gsiReady, setGsiReady] = useState(false);

  const handleCredential = async (response: { credential: string }) => {
    setLoading(true);
    try {
      const sessionId = getOrCreateSession();
      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: response.credential, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sign-in failed");

      setUserToken(data.token, data.user);
      toast({ title: `Welcome, ${data.user.name}!`, description: "Signed in with Google successfully." });
      onSuccess?.();
    } catch (err: any) {
      toast({
        title: "Sign-in failed",
        description: err?.message || "Could not sign in with Google. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    // Make callback globally accessible for GSI
    window.handleGoogleCredential = handleCredential;

    const tryInit = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      if (btnRef.current) {
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: "filled_black",
          size: size === "large" ? "large" : "medium",
          text: "continue_with",
          shape: "rectangular",
          width: size === "large" ? 280 : 200,
          logo_alignment: "left",
        });
      }
      setGsiReady(true);
    };

    // GSI script might not be loaded yet
    if (window.google?.accounts?.id) {
      tryInit();
      return;
    }

    // Poll for script to load
    const id = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(id);
        tryInit();
      }
    }, 150);
    return () => clearInterval(id);
  }, [GOOGLE_CLIENT_ID]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="w-full px-4 py-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 text-yellow-400 text-xs text-center font-mono">
        Google Sign-In not configured.<br />
        Set <code className="bg-black/30 px-1 rounded">VITE_GOOGLE_CLIENT_ID</code> to enable.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* GSI renders here */}
      <div ref={btnRef} className="min-h-[44px] flex items-center justify-center" />

      {/* Fallback button while GSI loads */}
      {!gsiReady && (
        <button
          onClick={() => {
            if (window.google?.accounts?.id) {
              window.google.accounts.id.prompt();
            }
          }}
          disabled={loading}
          className="flex items-center justify-center gap-3 w-[280px] h-[44px] rounded border border-border bg-card hover:bg-muted transition-colors px-4 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <GoogleIcon />
              <span className="text-sm font-medium text-foreground">Continue with Google</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" fillRule="evenodd">
        <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335" />
      </g>
    </svg>
  );
}
