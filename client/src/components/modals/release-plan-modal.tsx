import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { ReleasePlan, InsertReleasePlanInput } from "@shared/schema";

interface ReleasePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  releasePlan?: ReleasePlan | null;
}

export function ReleasePlanModal({ isOpen, onClose, releasePlan }: ReleasePlanModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    version: "",
    description: "",
    scheduledDate: "",
    timezone: "UTC",
    status: "planning",
  });

  // Reset form when release plan changes
  useEffect(() => {
    if (releasePlan) {
      setFormData({
        name: releasePlan.name,
        version: releasePlan.version,
        description: releasePlan.description || "",
        scheduledDate: releasePlan.scheduledDate ? new Date(releasePlan.scheduledDate).toISOString().slice(0, 10) : "",
        timezone: releasePlan.timezone || "UTC",
        status: releasePlan.status,
      });
    } else {
      setFormData({
        name: "",
        version: "",
        description: "",
        scheduledDate: "",
        timezone: "UTC",
        status: "planning",
      });
    }
  }, [releasePlan]);

  // Create/Update release plan mutation
  const releasePlanMutation = useMutation({
    mutationFn: async (data: Partial<InsertReleasePlanInput>) => {
      if (releasePlan) {
        return await apiRequest("PATCH", `/api/release-plans/${releasePlan.id}`, data);
      } else {
        return await apiRequest("POST", "/api/release-plans", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/release-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/release-plans", "active"] });
      toast({
        title: releasePlan ? "Release Plan Updated" : "Release Plan Created",
        description: releasePlan ? "Release plan has been updated successfully." : "Release plan has been created successfully.",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save release plan",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: Partial<InsertReleasePlanInput> = {
      name: formData.name,
      version: formData.version,
      description: formData.description,
      timezone: formData.timezone,
      status: formData.status,
    };

    // Only add scheduledDate if it's provided (schema will transform string to Date)
    if (formData.scheduledDate) {
      data.scheduledDate = formData.scheduledDate;
    }

    releasePlanMutation.mutate(data);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" data-testid="release-plan-modal">
        <DialogHeader>
          <DialogTitle>{releasePlan ? "Edit Release Plan" : "Create New Release Plan"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Release Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="e.g., Major Feature Release"
              required
              data-testid="input-release-name"
            />
          </div>
          
          <div>
            <Label htmlFor="version">Version *</Label>
            <Input
              id="version"
              value={formData.version}
              onChange={(e) => handleInputChange("version", e.target.value)}
              placeholder="e.g., v2.4.0"
              required
              data-testid="input-release-version"
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Brief description of the release..."
              rows={3}
              data-testid="textarea-release-description"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="scheduledDate">Scheduled Date</Label>
              <Input
                id="scheduledDate"
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => handleInputChange("scheduledDate", e.target.value)}
                data-testid="input-scheduled-date"
              />
            </div>
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={formData.timezone} onValueChange={(value) => handleInputChange("timezone", value)}>
                <SelectTrigger data-testid="select-timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">EST</SelectItem>
                  <SelectItem value="America/Los_Angeles">PST</SelectItem>
                  <SelectItem value="Europe/London">GMT</SelectItem>
                  <SelectItem value="Asia/Kolkata">IST</SelectItem>
                  <SelectItem value="Asia/Tokyo">JST</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
              <SelectTrigger data-testid="select-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={releasePlanMutation.isPending}
              data-testid="button-save-release-plan"
            >
              {releasePlanMutation.isPending ? "Saving..." : (releasePlan ? "Save Changes" : "Create Release Plan")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
