import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import type { ReleaseStep, User } from "@shared/schema";

interface StepCardProps {
  step: ReleaseStep;
  users?: User[];
  isHighlighted?: boolean;
  onEdit?: (step: ReleaseStep, action?: string) => void;
  onTrigger?: (stepId: string) => void;
  onViewDetails?: (step: ReleaseStep) => void;
  userRole?: string;
  className?: string;
}

export function StepCard({ 
  step, 
  users = [], 
  isHighlighted = false, 
  onEdit, 
  onTrigger, 
  onViewDetails,
  userRole,
  className 
}: StepCardProps) {
  const teamLead = users.find(u => u.id === step.teamLeadId);
  const primaryPoc = users.find(u => u.id === step.primaryPocId);
  
  const canTrigger = userRole === "release_manager";
  const canEdit = userRole === "release_manager";
  const canReassign = userRole === "team_lead";
  const canUpdateStatus = userRole === "release_manager" || userRole === "team_lead" || userRole === "poc";

  const formatDateTime = (date: Date | string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleString();
  };

  const getTriggerText = () => {
    if (step.schedulingType === "fixed_time" && step.scheduledTime) {
      return formatDateTime(step.scheduledTime);
    } else if (step.schedulingType === "after_step") {
      return "After previous step";
    } else if (step.schedulingType === "simultaneous") {
      return "With other step";
    }
    return "Manual trigger";
  };

  return (
    <Card 
      className={cn(
        "transition-all duration-200 hover:shadow-lg hover:-translate-y-1",
        isHighlighted && "border-2 border-primary shadow-lg",
        className
      )}
      data-testid={`step-card-${step.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <h4 className="font-medium text-foreground text-sm line-clamp-2" data-testid={`step-name-${step.id}`}>
            {step.name}
          </h4>
          <StatusBadge status={step.status} />
        </div>

        {isHighlighted && step.schedulingType === "fixed_time" && (
          <div className="mb-3 p-2 bg-primary/10 border border-primary/20 rounded text-xs text-primary">
            <i className="fas fa-info-circle mr-1" />
            Current Step - Scheduled for {formatDateTime(step.scheduledTime)}
          </div>
        )}

        <p className="text-xs text-muted-foreground mb-3 line-clamp-2" data-testid={`step-description-${step.id}`}>
          {step.description || "No description provided"}
        </p>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Team Lead:</span>
            <span className="text-foreground" data-testid={`step-team-lead-${step.id}`}>
              {teamLead ? `${teamLead.firstName} ${teamLead.lastName}` : "Unassigned"}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">POC:</span>
            <span className="text-foreground" data-testid={`step-poc-${step.id}`}>
              {primaryPoc ? `${primaryPoc.firstName} ${primaryPoc.lastName}` : "Unassigned"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {step.status === "completed" ? "Completed:" : 
               step.status === "started" || step.status === "in_progress" ? "Started:" : 
               "Trigger:"}
            </span>
            <span className="text-foreground text-xs" data-testid={`step-timing-${step.id}`}>
              {step.status === "completed" && step.completedAt
                ? formatDateTime(step.completedAt)
                : step.status === "started" && step.startedAt
                ? formatDateTime(step.startedAt)
                : getTriggerText()}
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border flex space-x-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => onViewDetails?.(step)}
            data-testid={`button-view-details-${step.id}`}
          >
            View Details
          </Button>

          {canTrigger && step.status === "not_started" && (
            <Button
              variant="default"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => onTrigger?.(step.id)}
              data-testid={`button-trigger-${step.id}`}
            >
              Trigger Now
            </Button>
          )}

          {canUpdateStatus && step.status !== "completed" && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => onEdit?.(step, "update-status")}
              data-testid={`button-update-status-${step.id}`}
            >
              <i className="fas fa-tasks mr-1" />
              <span>Update Status</span>
            </Button>
          )}

          {canReassign && (
            <Button
              variant="outline"
              size="sm"
              className="px-3 text-xs"
              onClick={() => onEdit?.(step, "reassign")}
              data-testid={`button-reassign-${step.id}`}
            >
              <i className="fas fa-user-plus mr-1" />
              <span>Reassign</span>
            </Button>
          )}

          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="px-3 text-xs"
              onClick={() => onEdit?.(step, "edit")}
              data-testid={`button-edit-${step.id}`}
            >
              <i className="fas fa-edit" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
