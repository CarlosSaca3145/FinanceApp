import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ResponsiveLayout } from "@/components/layout/responsive-layout";
import { Dashboard } from "@/pages/dashboard";
import { Brands } from "@/pages/brands";
import { ContentTemplates } from "@/pages/content-templates";
import NotFound from "@/pages/not-found";
import { useAuth } from "./hooks/useAuth";
import Landing from "./pages/landing";
import { Loader2 } from "lucide-react";

import { ErrorBoundary } from "@/components/error-boundary";

function Router() {
  const [location] = useLocation();
  const { isLoading, isAuthenticated } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center gap-4 text-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="text-sm font-medium text-slate-400">Cargando aplicación...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  // Determine active tab from current route
  const getActiveTab = () => {
    if (location === "/brands") return "brands";
    if (location === "/content-templates") return "content";
    return "dashboard";
  };

  return (
    <ResponsiveLayout activeTab={getActiveTab()}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/brands" component={Brands} />
        <Route path="/content-templates" component={ContentTemplates} />
        <Route component={NotFound} />
      </Switch>
    </ResponsiveLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
