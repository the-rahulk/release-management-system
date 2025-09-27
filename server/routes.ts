import type { Express, Request, Response } from "express";
import { createServer, type Server, type IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
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
  user?: { claims: { sub: string; email: string } };
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

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Release Plan routes
  app.get('/api/release-plans', isAuthenticated, async (req, res) => {
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
      const userId = req.user?.claims?.sub;
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
      const stepData = insertReleaseStepSchema.parse(req.body);
      const step = await storage.createStep(stepData);
      
      // Send assignment notification if team lead is assigned
      if (step.teamLeadId) {
        const teamLead = await storage.getUser(step.teamLeadId);
        if (teamLead?.email) {
          await emailService.sendStepAssignmentNotification(teamLead.email, step);
        }
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
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const currentStep = await storage.getStep(req.params.id);
      if (!currentStep) {
        return res.status(404).json({ message: "Step not found" });
      }

      const updates = req.body;
      const updatedStep = await storage.updateStep(req.params.id, updates);

      // Log status change if status was updated
      if (updates.status && updates.status !== currentStep.status) {
        await storage.addStepHistory({
          stepId: req.params.id,
          previousStatus: currentStep.status,
          newStatus: updates.status,
          changedBy: userId,
          notes: updates.notes || null,
        });

        // Send status change notification
        const stakeholders = [
          currentStep.teamLeadId,
          currentStep.primaryPocId,
          currentStep.backupPocId,
        ].filter(Boolean);

        for (const stakeholderId of stakeholders) {
          if (stakeholderId) {
            const stakeholder = await storage.getUser(stakeholderId);
            if (stakeholder?.email) {
              await emailService.sendStatusChangeNotification(
                stakeholder.email,
                updatedStep,
                currentStep.status,
                updates.status
              );
            }
          }
        }

        // Update timestamps based on status
        if (updates.status === "started" && !updatedStep.startedAt) {
          await storage.updateStep(req.params.id, { startedAt: new Date() });
        } else if (updates.status === "completed" && !updatedStep.completedAt) {
          await storage.updateStep(req.params.id, { completedAt: new Date() });
        }
      }

      broadcast({ type: "step_updated", data: updatedStep });
      res.json(updatedStep);
    } catch (error) {
      console.error("Error updating step:", error);
      res.status(500).json({ message: "Failed to update step" });
    }
  });

  app.delete('/api/steps/:id', isAuthenticated, async (req, res) => {
    try {
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
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user || (user.role !== "release_manager" && user.role !== "team_lead")) {
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
      });

      // Log the manual trigger
      await storage.addStepHistory({
        stepId: req.params.id,
        previousStatus: "not_started",
        newStatus: "started",
        changedBy: userId,
        notes: "Manually triggered",
      });

      // Send trigger notification
      if (step.primaryPocId) {
        const poc = await storage.getUser(step.primaryPocId);
        if (poc?.email) {
          await emailService.sendStepTriggerNotification(poc.email, updatedStep);
        }
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
      const user = await storage.getUser(req.user?.claims?.sub || "");
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
      const userId = req.user?.claims?.sub;
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
      const userId = req.user?.claims?.sub;
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
