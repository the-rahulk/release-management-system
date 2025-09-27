import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FilterBarProps {
  filters: {
    category: string;
    status: string;
    team: string;
    search: string;
  };
  onFilterChange: (key: string, value: string) => void;
}

export function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex flex-wrap gap-3">
          <Select 
            value={filters.category} 
            onValueChange={(value) => onFilterChange("category", value)}
          >
            <SelectTrigger className="w-[180px]" data-testid="filter-category">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="before_release">Before Release</SelectItem>
              <SelectItem value="actual_release">Actual Release</SelectItem>
              <SelectItem value="post_release">Post Release</SelectItem>
            </SelectContent>
          </Select>
          
          <Select 
            value={filters.status} 
            onValueChange={(value) => onFilterChange("status", value)}
          >
            <SelectTrigger className="w-[150px]" data-testid="filter-status">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="started">Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          
          <Select 
            value={filters.team} 
            onValueChange={(value) => onFilterChange("team", value)}
          >
            <SelectTrigger className="w-[150px]" data-testid="filter-team">
              <SelectValue placeholder="All Teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              <SelectItem value="frontend">Frontend Team</SelectItem>
              <SelectItem value="backend">Backend Team</SelectItem>
              <SelectItem value="qa">QA Team</SelectItem>
              <SelectItem value="devops">DevOps Team</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="relative">
          <Input
            type="text"
            placeholder="Search steps..."
            value={filters.search}
            onChange={(e) => onFilterChange("search", e.target.value)}
            className="pl-10 w-64"
            data-testid="input-search"
          />
          <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
