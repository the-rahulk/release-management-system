import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { ActiveReleaseCard } from "@/components/dashboard/active-release-card";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { ReleaseSection } from "@/components/dashboard/release-section";
import { TimelineView } from "@/components/dashboard/timeline-view";
import { StepModal } from "@/components/modals/step-modal";
import { ReleasePlanModal } from "@/components/modals/release-plan-modal";
import { useAuth } from "@/hooks/useAuth";
import type { ReleasePlan, ReleaseStep, User } from "@shared/schema";

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Modal states
  const [isStepModalOpen, setIsStepModalOpen] = useState(false);
  const [isReleasePlanModalOpen, setIsReleasePlanModalOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<ReleaseStep | null>(null);
  const [stepCategory, setStepCategory] = useState<string>("");
  const [modalAction, setModalAction] = useState<string>("");

  // Filter states
  const [filters, setFilters] = useState({
    category: "all",
    status: "all",
    team: "all",
    search: "",
  });

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

  // Fetch active release plan
  const { data: activeReleasePlan, isLoading: isLoadingReleasePlan } = useQuery<ReleasePlan>({
    queryKey: ["/api/release-plans/active"],
    enabled: isAuthenticated,
  });

  // Fetch steps for active release plan
  const { data: steps = [], isLoading: isLoadingSteps } = useQuery<ReleaseStep[]>({
    queryKey: ["/api/release-plans", activeReleasePlan?.id, "steps"],
    enabled: !!activeReleasePlan?.id,
  });

  // Fetch users for step assignments
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAuthenticated,
  });

  // Step trigger mutation
  const triggerStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      return await apiRequest("POST", `/api/steps/${stepId}/trigger`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/release-plans", activeReleasePlan?.id, "steps"] });
      toast({
        title: "Step Triggered",
        description: "Step has been triggered successfully.",
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
        description: error.message || "Failed to trigger step",
        variant: "destructive",
      });
    },
  });

  if (isLoading || isLoadingReleasePlan) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Filter steps based on current filters
  const filteredSteps = steps.filter(step => {
    if (filters.category !== "all" && step.category !== filters.category) return false;
    if (filters.status !== "all" && step.status !== filters.status) return false;
    if (filters.search && !step.name.toLowerCase().includes(filters.search.toLowerCase()) && 
        !step.description?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    // Team filtering would require additional data mapping
    return true;
  });

  // Group steps by category
  const beforeReleaseSteps = filteredSteps.filter(step => step.category === "before_release");
  const actualReleaseSteps = filteredSteps.filter(step => step.category === "actual_release");
  const postReleaseSteps = filteredSteps.filter(step => step.category === "post_release");

  // Find current step (first non-completed step in actual release category)
  const currentStep = actualReleaseSteps.find(step => 
    step.status === "started" || step.status === "in_progress"
  );

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleAddStep = (category: string) => {
    if (!activeReleasePlan) {
      toast({
        title: "No Active Release Plan",
        description: "Please create a release plan first.",
        variant: "destructive",
      });
      return;
    }
    setStepCategory(category);
    setSelectedStep(null);
    setModalAction("edit"); // Set action to "edit" for creating new steps
    setIsStepModalOpen(true);
  };

  const handleEditStep = (step: ReleaseStep, action: string = "edit") => {
    setSelectedStep(step);
    setStepCategory(step.category);
    setModalAction(action);
    setIsStepModalOpen(true);
  };

  const handleViewStepDetails = (step: ReleaseStep) => {
    // For now, open edit modal - could be expanded to show-only view
    handleEditStep(step);
  };

  const handleTriggerStep = async (stepId: string) => {
    triggerStepMutation.mutate(stepId);
  };

  const handleShareDashboard = () => {
    // TODO: Implement shareable link creation
    toast({
      title: "Feature Coming Soon",
      description: "Shareable dashboard links will be available soon.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="dashboard-main">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Release Dashboard</h2>
              <p className="mt-1 text-sm text-muted-foreground">Monitor and manage your release plans in real-time</p>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <Button 
                variant="outline" 
                onClick={handleShareDashboard}
                data-testid="button-share-dashboard"
              >
                <i className="fas fa-share mr-2" />
                Share Dashboard
              </Button>
              <Button onClick={() => setIsReleasePlanModalOpen(true)} data-testid="button-new-release-plan">
                <i className="fas fa-plus mr-2" />
                New Release Plan
              </Button>
            </div>
          </div>
        </div>

        {/* Active Release Overview */}
        {activeReleasePlan ? (
          <div className="mb-8">
            <ActiveReleaseCard releasePlan={activeReleasePlan} steps={steps} />
          </div>
        ) : (
          <div className="mb-8 text-center py-12 bg-card border border-border rounded-lg">
            <i className="fas fa-clipboard-list text-4xl text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Active Release Plan</h3>
            <p className="text-muted-foreground mb-4">Create a release plan to get started with managing your releases.</p>
            <Button onClick={() => setIsReleasePlanModalOpen(true)} data-testid="button-create-first-release-plan">
              <i className="fas fa-plus mr-2" />
              Create Release Plan
            </Button>
          </div>
        )}

        {activeReleasePlan && (
          <>
            {/* Filters and Search */}
            <FilterBar filters={filters} onFilterChange={handleFilterChange} />

            {/* Release Categories */}
            <div className="space-y-8">
              {/* Before Release Section */}
              <ReleaseSection
                title="Before Release"
                icon="fas fa-clock"
                iconColor="text-blue-500"
                steps={beforeReleaseSteps}
                users={users}
                currentStepId={currentStep?.id}
                onAddStep={() => handleAddStep("before_release")}
                onEditStep={handleEditStep}
                onTriggerStep={handleTriggerStep}
                onViewStepDetails={handleViewStepDetails}
                userRole={user?.role}
              />

              {/* Actual Release Section */}
              <ReleaseSection
                title="Actual Release"
                icon="fas fa-rocket"
                iconColor="text-green-500"
                steps={actualReleaseSteps}
                users={users}
                currentStepId={currentStep?.id}
                onAddStep={() => handleAddStep("actual_release")}
                onEditStep={handleEditStep}
                onTriggerStep={handleTriggerStep}
                onViewStepDetails={handleViewStepDetails}
                userRole={user?.role}
              />

              {/* Post Release Section */}
              <ReleaseSection
                title="Post Release"
                icon="fas fa-check-circle"
                iconColor="text-purple-500"
                steps={postReleaseSteps}
                users={users}
                currentStepId={currentStep?.id}
                onAddStep={() => handleAddStep("post_release")}
                onEditStep={handleEditStep}
                onTriggerStep={handleTriggerStep}
                onViewStepDetails={handleViewStepDetails}
                userRole={user?.role}
              />
            </div>

            {/* Timeline View */}
            {steps.length > 0 && (
              <div className="mt-8">
                <TimelineView steps={steps} />
              </div>
            )}
          </>
        )}

        {/* Modals */}
        <StepModal
          isOpen={isStepModalOpen}
          onClose={() => {
            setIsStepModalOpen(false);
            setSelectedStep(null);
            setModalAction("");
            setStepCategory("");
          }}
          step={selectedStep}
          releasePlanId={activeReleasePlan?.id || ""}
          category={stepCategory}
          action={modalAction}
        />

        <ReleasePlanModal
          isOpen={isReleasePlanModalOpen}
          onClose={() => setIsReleasePlanModalOpen(false)}
        />
      </main>
    </div>
  );
}
