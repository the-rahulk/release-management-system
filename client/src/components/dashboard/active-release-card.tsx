import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Progress } from "@/components/ui/progress";
import type { ReleasePlan, ReleaseStep } from "@shared/schema";

interface ActiveReleaseCardProps {
  releasePlan: ReleasePlan;
  steps: ReleaseStep[];
}

export function ActiveReleaseCard({ releasePlan, steps }: ActiveReleaseCardProps) {
  const totalSteps = steps.length;
  const completedSteps = steps.filter(step => step.status === "completed").length;
  const inProgressSteps = steps.filter(step => step.status === "in_progress" || step.status === "started").length;
  const remainingSteps = totalSteps - completedSteps - inProgressSteps;
  
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  const formatDateTime = (date: Date | string | null) => {
    if (!date) return "Not scheduled";
    return new Date(date).toLocaleString();
  };

  return (
    <Card className="shadow-sm" data-testid="active-release-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground" data-testid="active-release-title">
            Active Release: {releasePlan.name} {releasePlan.version}
          </h3>
          <StatusBadge status={releasePlan.status} />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground" data-testid="stat-total-steps">
              {totalSteps}
            </div>
            <div className="text-sm text-muted-foreground">Total Steps</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600" data-testid="stat-completed-steps">
              {completedSteps}
            </div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600" data-testid="stat-in-progress-steps">
              {inProgressSteps}
            </div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600" data-testid="stat-remaining-steps">
              {remainingSteps}
            </div>
            <div className="text-sm text-muted-foreground">Remaining</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progressPercent} className="h-3" data-testid="release-progress" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span data-testid="progress-percentage">{progressPercent}% Complete</span>
            <span data-testid="scheduled-date">
              Scheduled: {formatDateTime(releasePlan.scheduledDate)}
            </span>
          </div>
        </div>

        {releasePlan.description && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground" data-testid="release-description">
              {releasePlan.description}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
