import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { GlobalSetting, InsertGlobalSetting } from "@shared/schema";

interface SettingsForm {
  email_default_from: string;
  email_default_cc: string;
  email_default_bcc: string;
  notification_enabled: string;
}

export function GlobalSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState<SettingsForm>({
    email_default_from: "",
    email_default_cc: "",
    email_default_bcc: "",
    notification_enabled: "true",
  });

  // Fetch global settings
  const { data: settings = [], isLoading } = useQuery<GlobalSetting[]>({
    queryKey: ["/api/settings"],
    retry: (failureCount, error: any) => {
      if (isUnauthorizedError(error)) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Update settings form when data loads
  useEffect(() => {
    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value || "";
      return acc;
    }, {} as Record<string, string>);

    setFormData({
      email_default_from: settingsMap.email_default_from || "",
      email_default_cc: settingsMap.email_default_cc || "",
      email_default_bcc: settingsMap.email_default_bcc || "",
      notification_enabled: settingsMap.notification_enabled || "true",
    });
  }, [settings]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (settingsToSave: Array<InsertGlobalSetting>) => {
      const promises = settingsToSave.map(setting =>
        apiRequest("POST", "/api/settings", setting)
      );
      return await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings Saved",
        description: "Global settings have been updated successfully.",
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
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (key: keyof SettingsForm, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const settingsToSave: Array<InsertGlobalSetting> = [
      {
        key: "email_default_from",
        value: formData.email_default_from,
        description: "Default 'From' email address for notifications",
      },
      {
        key: "email_default_cc",
        value: formData.email_default_cc,
        description: "Default CC email addresses (comma-separated)",
      },
      {
        key: "email_default_bcc",
        value: formData.email_default_bcc,
        description: "Default BCC email addresses (comma-separated)",
      },
      {
        key: "notification_enabled",
        value: formData.notification_enabled,
        description: "Enable/disable email notifications globally",
      },
    ].filter(setting => setting.value.trim() !== "");

    saveSettingsMutation.mutate(settingsToSave);
  };

  const resetToDefaults = () => {
    setFormData({
      email_default_from: "noreply@iplan.com",
      email_default_cc: "",
      email_default_bcc: "",
      notification_enabled: "true",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/3 animate-pulse"></div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/4 animate-pulse"></div>
                <div className="h-10 bg-muted rounded animate-pulse"></div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="global-settings">
      {/* Email Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <i className="fas fa-envelope mr-2 text-primary" />
            Email Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email_default_from">Default From Address</Label>
              <Input
                id="email_default_from"
                type="email"
                value={formData.email_default_from}
                onChange={(e) => handleInputChange("email_default_from", e.target.value)}
                placeholder="noreply@yourcompany.com"
                data-testid="input-email-from"
              />
              <p className="text-xs text-muted-foreground mt-1">
                The default email address that notifications will be sent from
              </p>
            </div>

            <div>
              <Label htmlFor="email_default_cc">Default CC Recipients</Label>
              <Input
                id="email_default_cc"
                value={formData.email_default_cc}
                onChange={(e) => handleInputChange("email_default_cc", e.target.value)}
                placeholder="manager@yourcompany.com, lead@yourcompany.com"
                data-testid="input-email-cc"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email addresses to CC on all notifications (comma-separated)
              </p>
            </div>

            <div>
              <Label htmlFor="email_default_bcc">Default BCC Recipients</Label>
              <Input
                id="email_default_bcc"
                value={formData.email_default_bcc}
                onChange={(e) => handleInputChange("email_default_bcc", e.target.value)}
                placeholder="audit@yourcompany.com"
                data-testid="input-email-bcc"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email addresses to BCC on all notifications (comma-separated)
              </p>
            </div>

            <div className="flex justify-between pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={resetToDefaults}
                data-testid="button-reset-defaults"
              >
                <i className="fas fa-undo mr-2" />
                Reset to Defaults
              </Button>
              
              <div className="space-x-2">
                <Button
                  type="submit"
                  disabled={saveSettingsMutation.isPending}
                  data-testid="button-save-settings"
                >
                  {saveSettingsMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save mr-2" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <i className="fas fa-info-circle mr-2 text-blue-500" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-foreground">Email Service:</span>
              <span className="text-muted-foreground ml-2">
                {process.env.VITE_EMAIL_PROVIDER || "SendGrid"}
              </span>
            </div>
            <div>
              <span className="font-medium text-foreground">Notification Status:</span>
              <span className={`ml-2 ${formData.notification_enabled === "true" ? "text-green-600" : "text-red-600"}`}>
                {formData.notification_enabled === "true" ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">
              <i className="fas fa-lightbulb mr-1" />
              Configuration Tips
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use a dedicated no-reply email address for system notifications</li>
              <li>• Add key stakeholders to the default CC list for visibility</li>
              <li>• Use BCC for compliance or audit purposes</li>
              <li>• Test email configuration after making changes</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Notification Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <i className="fas fa-template mr-2 text-purple-500" />
            Notification Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <i className="fas fa-envelope-open-text text-4xl mb-4" />
            <p className="text-sm">Email template customization coming soon...</p>
            <p className="text-xs mt-2">
              Currently using default system templates for all notifications
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
