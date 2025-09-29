import type { Express, Request, Response } from "express";
import { createServer, type Server, type IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./localAuth";
import { emailService } from "./emailService";
import { schedulerService } from "./schedulerService";
import {
  insertReleasePlanSchema,
  insertReleaseStepSchema,
  insertGlobalSettingSchema,
  insertShareableLinkSchema,
} from "@shared/schema";
import { z } from "zod";

interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string; role: string };
}

// Helper function to update release plan status based on its steps
async function updateReleasePlanStatus(releasePlanId: string) {
  try {
    const steps = await storage.getStepsByReleasePlan(releasePlanId);
    if (steps.length === 0) return;

    const stepStatuses = steps.map(step => step.status);
    const hasStarted = stepStatuses.some(status => 
      status === 'started' || status === 'in_progress' || status === 'completed'
    );
    const allCompleted = stepStatuses.every(status => status === 'completed');

    let newStatus = 'planning';
    if (allCompleted) {
      newStatus = 'completed';
    } else if (hasStarted) {
      newStatus = 'active';
    }

    // Update the release plan status
    await storage.updateReleasePlan(releasePlanId, { status: newStatus as any });
    console.log(`Release plan ${releasePlanId} status updated to: ${newStatus}`);
  } catch (error) {
    console.error('Error updating release plan status:', error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // WebSocket connections store
  const wsConnections = new Set<WebSocket>();

  // Broadcast function for real-time updates
  function broadcast(data: any) {
    const message = JSON.stringify(data);
    wsConnections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  // Auth routes (handled by localAuth.ts)
  // The /api/auth/user route is now handled in localAuth.ts

  // Release Plan routes
  app.get('/api/release-plans', isAuthenticated as any, async (req, res) => {
    try {
      const plans = await storage.getReleasePlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching release plans:", error);
      res.status(500).json({ message: "Failed to fetch release plans" });
    }
  });

  app.get('/api/release-plans/active', isAuthenticated, async (req, res) => {
    try {
      const activePlan = await storage.getActiveReleasePlan();
      res.json(activePlan);
    } catch (error) {
      console.error("Error fetching active release plan:", error);
      res.status(500).json({ message: "Failed to fetch active release plan" });
    }
  });

  app.get('/api/release-plans/:id', isAuthenticated, async (req, res) => {
    try {
      const plan = await storage.getReleasePlan(req.params.id);
      if (!plan) {
        return res.status(404).json({ message: "Release plan not found" });
      }
      res.json(plan);
    } catch (error) {
      console.error("Error fetching release plan:", error);
      res.status(500).json({ message: "Failed to fetch release plan" });
    }
  });

  app.post('/api/release-plans', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const planData = insertReleasePlanSchema.parse({ ...req.body, createdBy: userId });
      const plan = await storage.createReleasePlan(planData);
      
      broadcast({ type: "release_plan_created", data: plan });
      res.status(201).json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating release plan:", error);
      res.status(500).json({ message: "Failed to create release plan" });
    }
  });

  app.patch('/api/release-plans/:id', isAuthenticated, async (req, res) => {
    try {
      const updates = req.body;
      const plan = await storage.updateReleasePlan(req.params.id, updates);
      
      broadcast({ type: "release_plan_updated", data: plan });
      res.json(plan);
    } catch (error) {
      console.error("Error updating release plan:", error);
      res.status(500).json({ message: "Failed to update release plan" });
    }
  });

  app.delete('/api/release-plans/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteReleasePlan(req.params.id);
      
      broadcast({ type: "release_plan_deleted", data: { id: req.params.id } });
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting release plan:", error);
      res.status(500).json({ message: "Failed to delete release plan" });
    }
  });

  // Release Step routes
  app.get('/api/release-plans/:id/steps', isAuthenticated, async (req, res) => {
    try {
      const steps = await storage.getStepsByReleasePlan(req.params.id);
      res.json(steps);
    } catch (error) {
      console.error("Error fetching steps:", error);
      res.status(500).json({ message: "Failed to fetch steps" });
    }
  });

  app.get('/api/steps/:id', isAuthenticated, async (req, res) => {
    try {
      const step = await storage.getStep(req.params.id);
      if (!step) {
        return res.status(404).json({ message: "Step not found" });
      }
      res.json(step);
    } catch (error) {
      console.error("Error fetching step:", error);
      res.status(500).json({ message: "Failed to fetch step" });
    }
  });

  app.post('/api/steps', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      console.log("Step creation - original request body:", req.body);
      
      // Check permissions - only release managers can create steps
      const user = await storage.getUser(req.user?.id || "");
      if (!user || user.role !== "release_manager") {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // Handle date conversion for all timestamp fields before validation
      const requestBody = { ...req.body };
      const timestampFields = ['scheduledTime', 'startedAt', 'completedAt', 'createdAt', 'updatedAt'];
      timestampFields.forEach(field => {
        if (requestBody[field]) {
          if (typeof requestBody[field] === 'string') {
            // Convert string to Date, but handle empty strings
            if (requestBody[field].trim() === '') {
              requestBody[field] = null;
            } else {
              const date = new Date(requestBody[field]);
              requestBody[field] = isNaN(date.getTime()) ? null : date;
            }
          }
        }
      });

      console.log("Step creation - data after date conversion:", requestBody);
      const stepData = insertReleaseStepSchema.parse(requestBody);
      const step = await storage.createStep(stepData);
      
      // Send assignment notifications
      if (step.teamLeadId) {
        const teamLead = await storage.getUser(step.teamLeadId);
        if (teamLead?.email) {
          await emailService.sendStepAssignmentNotification(teamLead.email, step, 'team_lead');
        }
      }

      // Send POC assignment notifications
      const pocEmails: string[] = [];
      if (step.primaryPocId) {
        const primaryPoc = await storage.getUser(step.primaryPocId);
        if (primaryPoc?.email) pocEmails.push(primaryPoc.email);
      }
      if (step.backupPocId) {
        const backupPoc = await storage.getUser(step.backupPocId);
        if (backupPoc?.email) pocEmails.push(backupPoc.email);
      }
      
      if (pocEmails.length > 0) {
        const creator = await storage.getUser(user.id);
        const creatorName = creator ? `${creator.firstName} ${creator.lastName}` : 'System';
        await emailService.sendPocReassignmentNotification(pocEmails, step, creatorName);
      }
      
      broadcast({ type: "step_created", data: step });
      res.status(201).json(step);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating step:", error);
      res.status(500).json({ message: "Failed to create step" });
    }
  });

  app.patch('/api/steps/:id', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(403).json({ message: "User not found" });
      }

      const currentStep = await storage.getStep(req.params.id);
      if (!currentStep) {
        return res.status(404).json({ message: "Step not found" });
      }

      const updates = req.body;
      
      // Check permissions based on what's being updated
      const isStatusOnlyUpdate = Object.keys(updates).length === 1 && updates.hasOwnProperty('status');
      const isPocAssignmentOnly = Object.keys(updates).every(key => ['primaryPocId', 'backupPocId'].includes(key));
      const canUpdateStatus = user.role === "release_manager" || user.role === "team_lead" || user.role === "poc";
      const canReassignPocs = user.role === "release_manager" || user.role === "team_lead";
      const canFullEdit = user.role === "release_manager";
      
      console.log("Step update permissions check:", {
        userRole: user.role,
        updateKeys: Object.keys(updates),
        isStatusOnlyUpdate,
        isPocAssignmentOnly,
        canUpdateStatus,
        canReassignPocs,
        canFullEdit
      });
      
      if (isStatusOnlyUpdate && !canUpdateStatus) {
        return res.status(403).json({ message: "Insufficient permissions to update status" });
      } else if (isPocAssignmentOnly && !canReassignPocs) {
        return res.status(403).json({ message: "Insufficient permissions to reassign POCs" });
      } else if (!isStatusOnlyUpdate && !isPocAssignmentOnly && !canFullEdit) {
        return res.status(403).json({ message: "Insufficient permissions to edit step details" });
      }
      
      // Handle date conversion for all timestamp fields
      const timestampFields = ['scheduledTime', 'startedAt', 'completedAt', 'createdAt', 'updatedAt'];
      timestampFields.forEach(field => {
        if (updates[field]) {
          if (typeof updates[field] === 'string') {
            // Convert string to Date, but handle empty strings
            if (updates[field].trim() === '') {
              updates[field] = null;
            } else {
              const date = new Date(updates[field]);
              updates[field] = isNaN(date.getTime()) ? null : date;
            }
          }
        }
      });
      
      console.log("Updates after date conversion:", updates);
      
      const updatedStep = await storage.updateStep(req.params.id, updates);

      // Log status change if status was updated
      if (updates.status && updates.status !== currentStep.status) {
        await storage.addStepHistory({
          stepId: req.params.id,
          previousStatus: currentStep.status,
          newStatus: updates.status,
          changedBy: user.id,
          notes: updates.notes || null,
        });

        // Send status change notification
        const stakeholders = [
          currentStep.teamLeadId,
          currentStep.primaryPocId,
          currentStep.backupPocId,
        ].filter(Boolean);

        const stakeholderEmails: string[] = [];
        for (const stakeholderId of stakeholders) {
          if (stakeholderId) {
            const stakeholder = await storage.getUser(stakeholderId);
            if (stakeholder?.email) {
              stakeholderEmails.push(stakeholder.email);
            }
          }
        }

        if (stakeholderEmails.length > 0) {
          const updater = await storage.getUser(user.id);
          const updaterName = updater ? `${updater.firstName} ${updater.lastName}` : 'System';
          await emailService.sendStatusChangeNotification(
            stakeholderEmails,
            updatedStep,
            currentStep.status,
            updates.status,
            updaterName
          );
        }

        // Update timestamps based on status
        if (updates.status === "started" && !updatedStep.startedAt) {
          await storage.updateStep(req.params.id, { startedAt: new Date() } as any);
        } else if (updates.status === "completed" && !updatedStep.completedAt) {
          await storage.updateStep(req.params.id, { completedAt: new Date() } as any);
        }

        // Update release plan status based on steps
        if (updatedStep.releasePlanId) {
          await updateReleasePlanStatus(updatedStep.releasePlanId);
          await emailService.checkAndNotifyReleaseCompletion(updatedStep.releasePlanId);
        }
      }

      // Send POC assignment notifications if POCs were assigned/reassigned
      if (updates.primaryPocId || updates.backupPocId) {
        const pocEmails: string[] = [];
        const assignedBy = `${user.firstName} ${user.lastName}`;
        
        // Notify newly assigned primary POC
        if (updates.primaryPocId && updates.primaryPocId !== currentStep.primaryPocId) {
          const primaryPoc = await storage.getUser(updates.primaryPocId);
          if (primaryPoc?.email) {
            pocEmails.push(primaryPoc.email);
          }
        }
        
        // Notify newly assigned backup POC
        if (updates.backupPocId && updates.backupPocId !== currentStep.backupPocId) {
          const backupPoc = await storage.getUser(updates.backupPocId);
          if (backupPoc?.email) {
            pocEmails.push(backupPoc.email);
          }
        }
        
        // Send notification to newly assigned POCs
        if (pocEmails.length > 0) {
          console.log(`📧 Sending POC assignment notification to: ${pocEmails.join(', ')}`);
          await emailService.sendPocReassignmentNotification(pocEmails, updatedStep, assignedBy);
          console.log(`✅ POC assignment notification sent successfully`);
        } else {
          console.log(`ℹ️ No new POC assignments detected for notifications`);
        }
      }

      broadcast({ type: "step_updated", data: updatedStep });
      res.json(updatedStep);
    } catch (error) {
      console.error("Error updating step:", error);
      res.status(500).json({ message: "Failed to update step" });
    }
  });

  app.delete('/api/steps/:id', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check permissions - only release managers can delete steps
      const user = await storage.getUser(req.user?.id || "");
      if (!user || user.role !== "release_manager") {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      await storage.deleteStep(req.params.id);
      
      broadcast({ type: "step_deleted", data: { id: req.params.id } });
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting step:", error);
      res.status(500).json({ message: "Failed to delete step" });
    }
  });

  // Manual step triggering
  app.post('/api/steps/:id/trigger', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== "release_manager") {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const step = await storage.getStep(req.params.id);
      if (!step) {
        return res.status(404).json({ message: "Step not found" });
      }

      if (step.status !== "not_started") {
        return res.status(400).json({ message: "Step cannot be triggered" });
      }

      const updatedStep = await storage.updateStep(req.params.id, {
        status: "started",
        startedAt: new Date(),
      } as any);

      // Log the manual trigger
      await storage.addStepHistory({
        stepId: req.params.id,
        previousStatus: "not_started",
        newStatus: "started",
        changedBy: user.id,
        notes: "Manually triggered",
      });

      // Send trigger notification to team lead and POCs
      const triggerEmails: string[] = [];
      
      if (step.teamLeadId) {
        const teamLead = await storage.getUser(step.teamLeadId);
        if (teamLead?.email) triggerEmails.push(teamLead.email);
      }
      
      if (step.primaryPocId) {
        const primaryPoc = await storage.getUser(step.primaryPocId);
        if (primaryPoc?.email) triggerEmails.push(primaryPoc.email);
      }
      
      if (step.backupPocId) {
        const backupPoc = await storage.getUser(step.backupPocId);
        if (backupPoc?.email) triggerEmails.push(backupPoc.email);
      }
      
      if (triggerEmails.length > 0) {
        await emailService.sendStepTriggerNotification(triggerEmails, updatedStep);
      }

      // Update release plan status based on steps
      if (updatedStep.releasePlanId) {
        await updateReleasePlanStatus(updatedStep.releasePlanId);
        await emailService.checkAndNotifyReleaseCompletion(updatedStep.releasePlanId);
      }

      broadcast({ type: "step_triggered", data: updatedStep });
      res.json(updatedStep);
    } catch (error) {
      console.error("Error triggering step:", error);
      res.status(500).json({ message: "Failed to trigger step" });
    }
  });

  // Step history
  app.get('/api/steps/:id/history', isAuthenticated, async (req, res) => {
    try {
      const history = await storage.getStepHistory(req.params.id);
      res.json(history);
    } catch (error) {
      console.error("Error fetching step history:", error);
      res.status(500).json({ message: "Failed to fetch step history" });
    }
  });

  // Global Settings routes
  app.get('/api/settings', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.user?.id || "");
      if (!user || user.role !== "release_manager") {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const settings = await storage.getGlobalSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post('/api/settings', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== "release_manager") {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const settingData = insertGlobalSettingSchema.parse({ ...req.body, updatedBy: userId });
      const setting = await storage.upsertGlobalSetting(settingData);
      
      res.json(setting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating setting:", error);
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  // Shareable Links routes
  app.get('/api/release-plans/:id/share-links', isAuthenticated, async (req, res) => {
    try {
      const links = await storage.getShareableLinksByReleasePlan(req.params.id);
      res.json(links);
    } catch (error) {
      console.error("Error fetching shareable links:", error);
      res.status(500).json({ message: "Failed to fetch shareable links" });
    }
  });

  app.post('/api/release-plans/:id/share-links', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const linkData = insertShareableLinkSchema.parse({
        ...req.body,
        releasePlanId: req.params.id,
        createdBy: userId,
      });
      
      const link = await storage.createShareableLink(linkData);
      res.status(201).json(link);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating shareable link:", error);
      res.status(500).json({ message: "Failed to create shareable link" });
    }
  });

  // Public shareable dashboard access
  app.get('/api/shared/:token', async (req, res) => {
    try {
      const link = await storage.getShareableLink(req.params.token);
      if (!link || !link.isActive) {
        return res.status(404).json({ message: "Link not found or expired" });
      }

      if (link.expiresAt && new Date() > link.expiresAt) {
        return res.status(404).json({ message: "Link has expired" });
      }

      const releasePlan = await storage.getReleasePlan(link.releasePlanId);
      if (!releasePlan) {
        return res.status(404).json({ message: "Release plan not found" });
      }

      const steps = await storage.getStepsByReleasePlan(link.releasePlanId);

      res.json({
        releasePlan,
        steps,
        readOnly: true,
      });
    } catch (error) {
      console.error("Error accessing shared dashboard:", error);
      res.status(500).json({ message: "Failed to access shared dashboard" });
    }
  });

  // Users routes
  app.get('/api/users', isAuthenticated, async (req, res) => {
    try {
      const { role } = req.query;
      let users;
      
      if (role && typeof role === "string") {
        users = await storage.getUsersByRole(role);
      } else {
        // For simplicity, return users by common roles
        const teamLeads = await storage.getUsersByRole("team_lead");
        const pocs = await storage.getUsersByRole("poc");
        users = [...teamLeads, ...pocs];
      }
      
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Initialize scheduler service
  schedulerService.initialize(storage, broadcast);

  // Create HTTP server
  const httpServer = createServer(app);

  // Setup WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
    console.log('WebSocket client connected');
    wsConnections.add(ws);

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      wsConnections.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      wsConnections.delete(ws);
    });

    // Send initial connection message
    ws.send(JSON.stringify({ type: "connected", message: "Real-time updates enabled" }));
  });

  return httpServer;
}
