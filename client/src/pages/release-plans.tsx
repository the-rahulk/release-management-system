import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ReleasePlanModal } from "@/components/modals/release-plan-modal";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import type { ReleasePlan } from "@shared/schema";

export default function ReleasePlans() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Modal states
  const [isReleasePlanModalOpen, setIsReleasePlanModalOpen] = useState(false);
  const [selectedReleasePlan, setSelectedReleasePlan] = useState<ReleasePlan | null>(null);

  // Redirect if not authenticated
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
  }, [isAuthenticated, isLoading, toast]);

  // Fetch release plans
  const { data: releasePlans = [], isLoading: isLoadingPlans } = useQuery<ReleasePlan[]>({
    queryKey: ["/api/release-plans"],
    enabled: isAuthenticated,
  });

  // Delete release plan mutation
  const deleteReleasePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      return await apiRequest("DELETE", `/api/release-plans/${planId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/release-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/release-plans", "active"] });
      toast({
        title: "Release Plan Deleted",
        description: "Release plan has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: error.message || "Failed to delete release plan",
        variant: "destructive",
      });
    },
  });

  if (isLoading || isLoadingPlans) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const formatDateTime = (date: Date | string | null) => {
    if (!date) return "Not scheduled";
    return new Date(date).toLocaleString();
  };

  const handleEditPlan = (plan: ReleasePlan) => {
    setSelectedReleasePlan(plan);
    setIsReleasePlanModalOpen(true);
  };

  const handleDeletePlan = async (plan: ReleasePlan) => {
    if (window.confirm(`Are you sure you want to delete the release plan "${plan.name} ${plan.version}"?`)) {
      deleteReleasePlanMutation.mutate(plan.id);
    }
  };

  const canManagePlans = user?.role === "release_manager";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="release-plans-main">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Release Plans</h2>
              <p className="mt-1 text-sm text-muted-foreground">Manage all your release plans and their lifecycle</p>
            </div>
            {canManagePlans && (
              <div className="mt-4 sm:mt-0">
                <Button 
                  onClick={() => {
                    setSelectedReleasePlan(null);
                    setIsReleasePlanModalOpen(true);
                  }}
                  data-testid="button-new-release-plan"
                >
                  <i className="fas fa-plus mr-2" />
                  New Release Plan
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Release Plans Grid */}
        {releasePlans.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-lg" data-testid="empty-release-plans">
            <i className="fas fa-clipboard-list text-4xl text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Release Plans Yet</h3>
            <p className="text-muted-foreground mb-4">Create your first release plan to start managing releases.</p>
            {canManagePlans && (
              <Button 
                onClick={() => {
                  setSelectedReleasePlan(null);
                  setIsReleasePlanModalOpen(true);
                }}
                data-testid="button-create-first-plan"
              >
                <i className="fas fa-plus mr-2" />
                Create Release Plan
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {releasePlans.map((plan) => (
              <Card 
                key={plan.id} 
                className="hover:shadow-lg transition-shadow"
                data-testid={`release-plan-card-${plan.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg line-clamp-1" data-testid={`plan-name-${plan.id}`}>
                        {plan.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1" data-testid={`plan-version-${plan.id}`}>
                        Version {plan.version}
                      </p>
                    </div>
                    <StatusBadge status={plan.status} />
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {plan.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`plan-description-${plan.id}`}>
                      {plan.description}
                    </p>
                  )}

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Scheduled:</span>
                      <span className="text-foreground" data-testid={`plan-scheduled-date-${plan.id}`}>
                        {formatDateTime(plan.scheduledDate)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span className="text-foreground" data-testid={`plan-created-date-${plan.id}`}>
                        {formatDateTime(plan.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-4 border-t border-border">
                    <Link href="/" className="flex-1">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full text-xs"
                        data-testid={`button-view-dashboard-${plan.id}`}
                      >
                        <i className="fas fa-eye mr-1" />
                        View Dashboard
                      </Button>
                    </Link>

                    {canManagePlans && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPlan(plan)}
                          className="px-3 text-xs"
                          data-testid={`button-edit-plan-${plan.id}`}
                        >
                          <i className="fas fa-edit" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePlan(plan)}
                          className="px-3 text-xs text-destructive hover:text-destructive"
                          disabled={deleteReleasePlanMutation.isPending}
                          data-testid={`button-delete-plan-${plan.id}`}
                        >
                          <i className="fas fa-trash" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Release Plan Modal */}
        <ReleasePlanModal
          isOpen={isReleasePlanModalOpen}
          onClose={() => setIsReleasePlanModalOpen(false)}
          releasePlan={selectedReleasePlan}
        />
      </main>
    </div>
  );
}
