import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PremiumBanner } from "@/components/premium-banner";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { useUserStore } from "@/lib/user-store";
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

const queryClient = new QueryClient();

const PUBLIC_ROUTES = ["/login", "/forgot-password", "/auth/magic", "/verify-email", "/reset-password"];

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { signedInUser } = useUserStore();
  const [location] = useLocation();

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
