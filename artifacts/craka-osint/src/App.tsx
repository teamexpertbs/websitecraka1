import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PremiumBanner } from "@/components/premium-banner";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Logs from "@/pages/logs";
import Stats from "@/pages/stats";
import Tools from "@/pages/tools";
import Admin from "@/pages/admin";
import Premium from "@/pages/premium";
import Refer from "@/pages/refer";
import Transactions from "@/pages/transactions";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/logs" component={Logs} />
      <Route path="/stats" component={Stats} />
      <Route path="/tools" component={Tools} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/admin" component={Admin} />
      <Route path="/premium" component={Premium} />
      <Route path="/refer" component={Refer} />
      <Route component={NotFound} />
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
