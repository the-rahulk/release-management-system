import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { ReleaseStep, User, InsertReleaseStep } from "@shared/schema";

interface StepModalProps {
  isOpen: boolean;
  onClose: () => void;
  step?: ReleaseStep | null;
  releasePlanId: string;
  category?: string;
}

export function StepModal({ isOpen, onClose, step, releasePlanId, category }: StepModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: category || "before_release",
    teamLeadId: "",
    primaryPocId: "",
    backupPocId: "",
    schedulingType: "manual",
    scheduledTime: "",
    timezone: "UTC",
    dependsOnStepId: "",
    simultaneousWithStepId: "",
    order: 0,
  });

  // Fetch users for team lead and POC assignment
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Fetch other steps for dependency selection
  const { data: allSteps = [] } = useQuery<ReleaseStep[]>({
    queryKey: ["/api/release-plans", releasePlanId, "steps"],
  });

  // Reset form when step changes
  useEffect(() => {
    if (step) {
      setFormData({
        name: step.name,
        description: step.description || "",
        category: step.category,
        teamLeadId: step.teamLeadId || "",
        primaryPocId: step.primaryPocId || "",
        backupPocId: step.backupPocId || "",
        schedulingType: step.schedulingType,
        scheduledTime: step.scheduledTime ? new Date(step.scheduledTime).toISOString().slice(0, 16) : "",
        timezone: step.timezone || "UTC",
        dependsOnStepId: step.dependsOnStepId || "",
        simultaneousWithStepId: step.simultaneousWithStepId || "",
        order: step.order,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        category: category || "before_release",
        teamLeadId: "",
        primaryPocId: "",
        backupPocId: "",
        schedulingType: "manual",
        scheduledTime: "",
        timezone: "UTC",
        dependsOnStepId: "",
        simultaneousWithStepId: "",
        order: allSteps.length,
      });
    }
  }, [step, category, allSteps.length]);

  // Create/Update step mutation
  const stepMutation = useMutation({
    mutationFn: async (data: Partial<InsertReleaseStep>) => {
      if (step) {
        return await apiRequest("PATCH", `/api/steps/${step.id}`, data);
      } else {
        return await apiRequest("POST", "/api/steps", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/release-plans", releasePlanId, "steps"] });
      queryClient.invalidateQueries({ queryKey: ["/api/release-plans", "active"] });
      toast({
        title: step ? "Step Updated" : "Step Created",
        description: step ? "Step has been updated successfully." : "Step has been created successfully.",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save step",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: Partial<InsertReleaseStep> = {
      ...formData,
      releasePlanId,
      scheduledTime: formData.scheduledTime ? new Date(formData.scheduledTime) : null,
      dependsOnStepId: formData.dependsOnStepId || null,
      simultaneousWithStepId: formData.simultaneousWithStepId || null,
      teamLeadId: formData.teamLeadId || null,
      primaryPocId: formData.primaryPocId || null,
      backupPocId: formData.backupPocId || null,
    };

    stepMutation.mutate(data);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const teamLeads = users.filter(user => user.role === "team_lead" || user.role === "release_manager");
  const pocs = users.filter(user => user.role === "poc" || user.role === "team_lead");
  const eligibleSteps = allSteps.filter(s => s.id !== step?.id && s.category === formData.category);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="step-modal">
        <DialogHeader>
          <DialogTitle>{step ? "Edit Step" : "Create New Step"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Step Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              required
              data-testid="input-step-name"
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={3}
              data-testid="textarea-step-description"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="before_release">Before Release</SelectItem>
                  <SelectItem value="actual_release">Actual Release</SelectItem>
                  <SelectItem value="post_release">Post Release</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="order">Order</Label>
              <Input
                id="order"
                type="number"
                value={formData.order}
                onChange={(e) => handleInputChange("order", parseInt(e.target.value) || 0)}
                data-testid="input-step-order"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="teamLead">Team Lead</Label>
              <Select value={formData.teamLeadId} onValueChange={(value) => handleInputChange("teamLeadId", value)}>
                <SelectTrigger data-testid="select-team-lead">
                  <SelectValue placeholder="Select team lead" />
                </SelectTrigger>
                <SelectContent>
                  {teamLeads.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="primaryPoc">Primary POC</Label>
              <Select value={formData.primaryPocId} onValueChange={(value) => handleInputChange("primaryPocId", value)}>
                <SelectTrigger data-testid="select-primary-poc">
                  <SelectValue placeholder="Select primary POC" />
                </SelectTrigger>
                <SelectContent>
                  {pocs.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="backupPoc">Backup POC</Label>
            <Select value={formData.backupPocId} onValueChange={(value) => handleInputChange("backupPocId", value)}>
              <SelectTrigger data-testid="select-backup-poc">
                <SelectValue placeholder="Select backup POC" />
              </SelectTrigger>
              <SelectContent>
                {pocs.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Scheduling</Label>
            <RadioGroup 
              value={formData.schedulingType} 
              onValueChange={(value) => handleInputChange("schedulingType", value)}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual">Manual Trigger</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed_time" id="fixed_time" />
                <Label htmlFor="fixed_time">Fixed Time</Label>
              </div>
              {formData.schedulingType === "fixed_time" && (
                <div className="ml-6 grid grid-cols-2 gap-4">
                  <Input
                    type="datetime-local"
                    value={formData.scheduledTime}
                    onChange={(e) => handleInputChange("scheduledTime", e.target.value)}
                    data-testid="input-scheduled-time"
                  />
                  <Select value={formData.timezone} onValueChange={(value) => handleInputChange("timezone", value)}>
                    <SelectTrigger data-testid="select-timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">EST</SelectItem>
                      <SelectItem value="America/Los_Angeles">PST</SelectItem>
                      <SelectItem value="Europe/London">GMT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="after_step" id="after_step" />
                <Label htmlFor="after_step">After Previous Step</Label>
              </div>
              {formData.schedulingType === "after_step" && (
                <div className="ml-6">
                  <Select value={formData.dependsOnStepId} onValueChange={(value) => handleInputChange("dependsOnStepId", value)}>
                    <SelectTrigger data-testid="select-depends-on-step">
                      <SelectValue placeholder="Select previous step" />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleSteps.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="simultaneous" id="simultaneous" />
                <Label htmlFor="simultaneous">Simultaneous with Step</Label>
              </div>
              {formData.schedulingType === "simultaneous" && (
                <div className="ml-6">
                  <Select value={formData.simultaneousWithStepId} onValueChange={(value) => handleInputChange("simultaneousWithStepId", value)}>
                    <SelectTrigger data-testid="select-simultaneous-step">
                      <SelectValue placeholder="Select simultaneous step" />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleSteps.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </RadioGroup>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={stepMutation.isPending}
              data-testid="button-save-step"
            >
              {stepMutation.isPending ? "Saving..." : (step ? "Save Changes" : "Create Step")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
