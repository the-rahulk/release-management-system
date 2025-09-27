import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useEffect } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";

// Pages
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import ReleasePlans from "@/pages/release-plans";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  // Handle unauthorized redirects
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Only show toast and redirect if we're not already on landing page
      if (window.location.pathname !== "/" && !window.location.pathname.startsWith("/api/")) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    }
  }, [isAuthenticated, isLoading, toast]);

  return <>{children}</>;
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Public routes */}
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          {/* Protected routes */}
          <Route path="/" component={Dashboard} />
          <Route path="/release-plans" component={ReleasePlans} />
          <Route path="/settings" component={Settings} />
        </>
      )}
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  // Initialize WebSocket connection for real-time updates
  useWebSocket();

  return (
    <AuthWrapper>
      <Router />
    </AuthWrapper>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
