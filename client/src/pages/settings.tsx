import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Header } from "@/components/layout/header";
import { GlobalSettings } from "@/components/settings/global-settings";
import { useAuth } from "@/hooks/useAuth";

export default function Settings() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  // Redirect if not authenticated or insufficient permissions
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }

    if (!isLoading && isAuthenticated && user?.role !== "release_manager") {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access settings. Only Release Managers can modify settings.",
        variant: "destructive",
      });
      // Could redirect to dashboard or show a different view
      return;
    }
  }, [isAuthenticated, isLoading, user?.role, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "release_manager") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <i className="fas fa-lock text-4xl text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              Only Release Managers have access to global settings.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="settings-main">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">Global Settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure global notification settings and system preferences
          </p>
        </div>

        {/* Settings Content */}
        <GlobalSettings />
      </main>
    </div>
  );
}
