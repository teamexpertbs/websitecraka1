import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PremiumBanner } from "@/components/premium-banner";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { useUserStore } from "@/lib/user-store";
import { useEffect, useState } from "react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Logs from "@/pages/logs";
import Stats from "@/pages/stats";
import Tools from "@/pages/tools";
import Admin from "@/pages/admin";
import Premium from "@/pages/premium";
import Refer from "@/pages/refer";
import Transactions from "@/pages/transactions";
import Login from "@/pages/login";
import ForgotPassword from "@/pages/forgot-password";
import MagicLogin from "@/pages/magic-login";
import VerifyEmail from "@/pages/verify-email";
import ResetPassword from "@/pages/reset-password";
import Profile from "@/pages/profile";
import Notifications from "@/pages/notifications";

const queryClient = new QueryClient();

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const PUBLIC_ROUTES = ["/login", "/forgot-password", "/auth/magic", "/verify-email", "/reset-password"];

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { signedInUser, userToken, logout, setUserToken, _hasHydrated } = useUserStore();
  const [location] = useLocation();
  const [validated, setValidated] = useState(false);

  useEffect(() => {
    if (!_hasHydrated) return;

    if (!userToken || !signedInUser) {
      setValidated(true);
      return;
    }

    // Validate token against server — catches deleted/banned accounts
    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
      .then(async (res) => {
        if (res.status === 401 || res.status === 404) {
          logout();
          setValidated(true);
          return;
        }
        setValidated(true);

        // Silently refresh token if it expires within 7 days
        try {
          const payload = JSON.parse(atob(userToken.split(".")[1]));
          const expiresIn = (payload.exp ?? 0) * 1000 - Date.now();
          const sevenDays = 7 * 24 * 60 * 60 * 1000;
          if (expiresIn > 0 && expiresIn < sevenDays) {
            const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
              method: "POST",
              headers: { Authorization: `Bearer ${userToken}` },
            });
            if (refreshRes.ok) {
              const { token: newToken } = await refreshRes.json();
              if (newToken) setUserToken(newToken, signedInUser);
            }
          }
        } catch {
          // Non-critical — ignore refresh errors
        }
      })
      .catch(() => {
        // Network error — keep user logged in (offline-friendly)
        setValidated(true);
      });
  }, [_hasHydrated]);

  // Wait until Zustand has rehydrated from localStorage
  if (!_hasHydrated || !validated) {
    return null;
  }

  if (!signedInUser && !PUBLIC_ROUTES.includes(location)) {
    return <Redirect to="/login" />;
  }
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/auth/magic" component={MagicLogin} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/admin" component={Admin} />
      <Route>
        <AuthGuard>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/logs" component={Logs} />
            <Route path="/stats" component={Stats} />
            <Route path="/tools" component={Tools} />
            <Route path="/transactions" component={Transactions} />
            <Route path="/premium" component={Premium} />
            <Route path="/refer" component={Refer} />
            <Route path="/profile" component={Profile} />
            <Route path="/notifications" component={Notifications} />
            <Route component={NotFound} />
          </Switch>
        </AuthGuard>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
              <PremiumBanner />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

export default App;
