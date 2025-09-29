import { Button } from "@/components/ui/button";
import { StepCard } from "@/components/ui/step-card";
import type { ReleaseStep, User } from "@shared/schema";

interface ReleaseSectionProps {
  title: string;
  icon: string;
  iconColor: string;
  steps: ReleaseStep[];
  users: User[];
  currentStepId?: string;
  onAddStep?: () => void;
  onEditStep?: (step: ReleaseStep) => void;
  onTriggerStep?: (stepId: string) => void;
  onViewStepDetails?: (step: ReleaseStep) => void;
  userRole?: string;
}

export function ReleaseSection({
  title,
  icon,
  iconColor,
  steps,
  users,
  currentStepId,
  onAddStep,
  onEditStep,
  onTriggerStep,
  onViewStepDetails,
  userRole,
}: ReleaseSectionProps) {
  const canAddSteps = userRole === "release_manager";

  return (
    <div data-testid={`release-section-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center">
          <i className={`${icon} mr-2 ${iconColor}`} />
          {title}
          <span className="ml-2 px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs" data-testid="step-count">
            {steps.length} steps
          </span>
        </h3>
        {canAddSteps && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddStep}
            className="text-sm text-primary hover:text-primary/80"
            data-testid="button-add-step"
          >
            <i className="fas fa-plus mr-1" />
            Add Step
          </Button>
        )}
      </div>

      {steps.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground" data-testid="empty-steps">
          <i className="fas fa-clipboard-list text-4xl mb-4" />
          <p>No steps in this category yet.</p>
          {canAddSteps && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAddStep}
              className="mt-2"
              data-testid="button-add-first-step"
            >
              Add First Step
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {steps.map((step) => (
            <StepCard
              key={step.id}
              step={step}
              users={users}
              isHighlighted={step.id === currentStepId}
              onEdit={onEditStep}
              onTrigger={onTriggerStep}
              onViewDetails={onViewStepDetails}
              userRole={userRole}
            />
          ))}
        </div>
      )}
    </div>
  );
}
