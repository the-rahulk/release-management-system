import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig = {
  not_started: {
    label: "Not Started",
    className: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100",
    icon: "fas fa-pause-circle",
  },
  started: {
    label: "Started",
    className: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100",
    icon: "fas fa-play-circle",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100",
    icon: "fas fa-spinner",
  },
  completed: {
    label: "Completed",
    className: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
    icon: "fas fa-check-circle",
  },
  planning: {
    label: "Planning",
    className: "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100",
    icon: "fas fa-clipboard-list",
  },
  active: {
    label: "Active",
    className: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100",
    icon: "fas fa-rocket",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
    icon: "fas fa-times-circle",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.not_started;

  return (
    <Badge 
      variant="secondary" 
      className={cn("inline-flex items-center border text-xs font-medium", config.className, className)}
      data-testid={`status-badge-${status}`}
    >
      <i className={`${config.icon} mr-1`} />
      {config.label}
    </Badge>
  );
}
