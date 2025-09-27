import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useState } from "react";
import type { ReleaseStep } from "@shared/schema";

interface TimelineViewProps {
  steps: ReleaseStep[];
}

export function TimelineView({ steps }: TimelineViewProps) {
  const [viewMode, setViewMode] = useState<"timeline" | "gantt">("timeline");

  // Sort steps by order and then by scheduled time
  const sortedSteps = [...steps].sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    if (a.scheduledTime && b.scheduledTime) {
      return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
    }
    return 0;
  });

  const formatDateTime = (date: Date | string | null) => {
    if (!date) return "Not scheduled";
    return new Date(date).toLocaleString();
  };

  const getTimelineIcon = (status: string) => {
    switch (status) {
      case "completed":
        return { icon: "fas fa-check", color: "bg-green-500", animation: "" };
      case "started":
      case "in_progress":
        return { icon: "fas fa-rocket", color: "bg-primary", animation: "animate-pulse" };
      default:
        return { icon: "fas fa-clock", color: "bg-gray-300", animation: "" };
    }
  };

  const getStepTime = (step: ReleaseStep) => {
    if (step.status === "completed" && step.completedAt) {
      return formatDateTime(step.completedAt);
    }
    if ((step.status === "started" || step.status === "in_progress") && step.startedAt) {
      return formatDateTime(step.startedAt);
    }
    if (step.scheduledTime) {
      return `Scheduled: ${formatDateTime(step.scheduledTime)}`;
    }
    return "Not scheduled";
  };

  const getStatusText = (step: ReleaseStep) => {
    switch (step.status) {
      case "completed":
        return "Completed";
      case "started":
      case "in_progress":
        return "In Progress";
      default:
        return "Pending";
    }
  };

  return (
    <Card className="shadow-sm" data-testid="timeline-view">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Release Timeline</h3>
          <div className="flex space-x-2">
            <Button
              variant={viewMode === "timeline" ? "default" : "secondary"}
              size="sm"
              onClick={() => setViewMode("timeline")}
              data-testid="button-timeline-view"
            >
              Timeline
            </Button>
            <Button
              variant={viewMode === "gantt" ? "default" : "secondary"}
              size="sm"
              onClick={() => setViewMode("gantt")}
              data-testid="button-gantt-view"
            >
              Gantt
            </Button>
          </div>
        </div>

        {viewMode === "timeline" ? (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            
            <div className="space-y-6">
              {sortedSteps.map((step, index) => {
                const timelineConfig = getTimelineIcon(step.status);
                
                return (
                  <div key={step.id} className="relative flex items-start space-x-4" data-testid={`timeline-item-${step.id}`}>
                    <div className={`relative z-10 w-8 h-8 ${timelineConfig.color} rounded-full flex items-center justify-center ${timelineConfig.animation}`}>
                      <i className={`${timelineConfig.icon} text-white text-sm`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-foreground" data-testid={`timeline-step-name-${step.id}`}>
                          {step.name}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <StatusBadge status={step.status} />
                          <span className="text-xs text-muted-foreground" data-testid={`timeline-step-time-${step.id}`}>
                            {getStepTime(step)}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1" data-testid={`timeline-step-description-${step.id}`}>
                        {step.description || "No description provided"}
                      </p>
                      <div className="text-xs text-muted-foreground mt-1">
                        Category: {step.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-8 text-muted-foreground" data-testid="gantt-placeholder">
              <i className="fas fa-chart-gantt text-4xl mb-4" />
              <p>Gantt chart view coming soon...</p>
              <p className="text-sm">This will show a visual timeline with step dependencies and durations.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
