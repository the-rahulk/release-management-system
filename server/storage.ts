import {
  users,
  releasePlans,
  releaseSteps,
  stepHistory,
  globalSettings,
  shareableLinks,
  type User,
  type UpsertUser,
  type ReleasePlan,
  type InsertReleasePlan,
  type ReleaseStep,
  type InsertReleaseStep,
  type StepHistory,
  type InsertStepHistory,
  type GlobalSetting,
  type InsertGlobalSetting,
  type ShareableLink,
  type InsertShareableLink,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: any): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUsersByIds(ids: string[]): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;

  // Release Plan operations
  getReleasePlans(): Promise<ReleasePlan[]>;
  getReleasePlan(id: string): Promise<ReleasePlan | undefined>;
  createReleasePlan(plan: InsertReleasePlan): Promise<ReleasePlan>;
  updateReleasePlan(id: string, plan: Partial<InsertReleasePlan>): Promise<ReleasePlan>;
  deleteReleasePlan(id: string): Promise<void>;
  getActiveReleasePlan(): Promise<ReleasePlan | undefined>;

  // Release Step operations
  getStepsByReleasePlan(releasePlanId: string): Promise<ReleaseStep[]>;
  getStep(id: string): Promise<ReleaseStep | undefined>;
  createStep(step: InsertReleaseStep): Promise<ReleaseStep>;
  updateStep(id: string, step: Partial<InsertReleaseStep>): Promise<ReleaseStep>;
  deleteStep(id: string): Promise<void>;
  getStepsByStatus(status: string): Promise<ReleaseStep[]>;
  getStepsByCategory(category: string): Promise<ReleaseStep[]>;
  getStepsForScheduling(): Promise<ReleaseStep[]>;

  // Step History operations
  getStepHistory(stepId: string): Promise<StepHistory[]>;
  addStepHistory(history: InsertStepHistory): Promise<StepHistory>;

  // Global Settings operations
  getGlobalSettings(): Promise<GlobalSetting[]>;
  getGlobalSetting(key: string): Promise<GlobalSetting | undefined>;
  upsertGlobalSetting(setting: InsertGlobalSetting): Promise<GlobalSetting>;
  deleteGlobalSetting(key: string): Promise<void>;

  // Shareable Links operations
  getShareableLink(token: string): Promise<ShareableLink | undefined>;
  getShareableLinksByReleasePlan(releasePlanId: string): Promise<ShareableLink[]>;
  createShareableLink(link: InsertShareableLink): Promise<ShareableLink>;
  updateShareableLink(id: string, link: Partial<InsertShareableLink>): Promise<ShareableLink>;
  deleteShareableLink(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: any): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUsersByIds(ids: string[]): Promise<User[]> {
    return await db.select().from(users).where(inArray(users.id, ids));
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  // Release Plan operations
  async getReleasePlans(): Promise<ReleasePlan[]> {
    return await db.select().from(releasePlans).orderBy(desc(releasePlans.createdAt));
  }

  async getReleasePlan(id: string): Promise<ReleasePlan | undefined> {
    const [plan] = await db.select().from(releasePlans).where(eq(releasePlans.id, id));
    return plan;
  }

  async createReleasePlan(plan: InsertReleasePlan): Promise<ReleasePlan> {
    const [newPlan] = await db.insert(releasePlans).values(plan).returning();
    return newPlan;
  }

  async updateReleasePlan(id: string, plan: Partial<InsertReleasePlan>): Promise<ReleasePlan> {
    const [updatedPlan] = await db
      .update(releasePlans)
      .set({ ...plan, updatedAt: new Date() })
      .where(eq(releasePlans.id, id))
      .returning();
    return updatedPlan;
  }

  async deleteReleasePlan(id: string): Promise<void> {
    await db.delete(releasePlans).where(eq(releasePlans.id, id));
  }

  async getActiveReleasePlan(): Promise<ReleasePlan | undefined> {
    // First try to get an active release plan
    const [activePlan] = await db
      .select()
      .from(releasePlans)
      .where(eq(releasePlans.status, "active"))
      .orderBy(desc(releasePlans.createdAt))
      .limit(1);
    
    if (activePlan) {
      return activePlan;
    }
    
    // If no active plan, get the most recent planning release plan
    const [planningPlan] = await db
      .select()
      .from(releasePlans)
      .where(eq(releasePlans.status, "planning"))
      .orderBy(desc(releasePlans.createdAt))
      .limit(1);
    
    return planningPlan;
  }

  // Release Step operations
  async getStepsByReleasePlan(releasePlanId: string): Promise<ReleaseStep[]> {
    const result = await db
      .select()
      .from(releaseSteps)
      .where(eq(releaseSteps.releasePlanId, releasePlanId))
      .orderBy(asc(releaseSteps.order));
    return result as ReleaseStep[];
  }

  async getStep(id: string): Promise<ReleaseStep | undefined> {
    const [step] = await db.select().from(releaseSteps).where(eq(releaseSteps.id, id));
    return step as ReleaseStep | undefined;
  }

  async createStep(step: InsertReleaseStep): Promise<ReleaseStep> {
    const [newStep] = await db.insert(releaseSteps).values(step).returning();
    return newStep as ReleaseStep;
  }

  async updateStep(id: string, step: Partial<InsertReleaseStep>): Promise<ReleaseStep> {
    // Clean up any undefined or invalid fields
    const cleanStep = Object.entries(step).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {} as any);
    
    console.log("Storage updateStep - cleaned data:", cleanStep);
    
    const [updatedStep] = await db
      .update(releaseSteps)
      .set({ ...cleanStep, updatedAt: new Date() })
      .where(eq(releaseSteps.id, id))
      .returning();
    return updatedStep as ReleaseStep;
  }

  async deleteStep(id: string): Promise<void> {
    await db.delete(releaseSteps).where(eq(releaseSteps.id, id));
  }

  async getStepsByStatus(status: string): Promise<ReleaseStep[]> {
    const result = await db.select().from(releaseSteps).where(eq(releaseSteps.status, status));
    return result as ReleaseStep[];
  }

  async getStepsByCategory(category: string): Promise<ReleaseStep[]> {
    const result = await db.select().from(releaseSteps).where(eq(releaseSteps.category, category));
    return result as ReleaseStep[];
  }

  async getStepsForScheduling(): Promise<ReleaseStep[]> {
    const result = await db
      .select()
      .from(releaseSteps)
      .where(
        and(
          eq(releaseSteps.schedulingType, "fixed_time"),
          eq(releaseSteps.status, "not_started")
        )
      );
    return result as ReleaseStep[];
  }

  // Step History operations
  async getStepHistory(stepId: string): Promise<StepHistory[]> {
    return await db
      .select()
      .from(stepHistory)
      .where(eq(stepHistory.stepId, stepId))
      .orderBy(desc(stepHistory.createdAt));
  }

  async addStepHistory(history: InsertStepHistory): Promise<StepHistory> {
    const [newHistory] = await db.insert(stepHistory).values(history).returning();
    return newHistory;
  }

  // Global Settings operations
  async getGlobalSettings(): Promise<GlobalSetting[]> {
    return await db.select().from(globalSettings).orderBy(asc(globalSettings.key));
  }

  async getGlobalSetting(key: string): Promise<GlobalSetting | undefined> {
    const [setting] = await db.select().from(globalSettings).where(eq(globalSettings.key, key));
    return setting;
  }

  async upsertGlobalSetting(setting: InsertGlobalSetting): Promise<GlobalSetting> {
    const [upsertedSetting] = await db
      .insert(globalSettings)
      .values(setting)
      .onConflictDoUpdate({
        target: globalSettings.key,
        set: {
          value: setting.value,
          description: setting.description,
          updatedBy: setting.updatedBy,
          updatedAt: new Date(),
        },
      })
      .returning();
    return upsertedSetting;
  }

  async deleteGlobalSetting(key: string): Promise<void> {
    await db.delete(globalSettings).where(eq(globalSettings.key, key));
  }

  // Shareable Links operations
  async getShareableLink(token: string): Promise<ShareableLink | undefined> {
    const [link] = await db
      .select()
      .from(shareableLinks)
      .where(and(eq(shareableLinks.token, token), eq(shareableLinks.isActive, true)));
    return link;
  }

  async getShareableLinksByReleasePlan(releasePlanId: string): Promise<ShareableLink[]> {
    return await db
      .select()
      .from(shareableLinks)
      .where(eq(shareableLinks.releasePlanId, releasePlanId))
      .orderBy(desc(shareableLinks.createdAt));
  }

  async createShareableLink(link: InsertShareableLink): Promise<ShareableLink> {
    const token = randomUUID();
    const [newLink] = await db
      .insert(shareableLinks)
      .values({ ...link, token })
      .returning();
    return newLink;
  }

  async updateShareableLink(id: string, link: Partial<InsertShareableLink>): Promise<ShareableLink> {
    const [updatedLink] = await db
      .update(shareableLinks)
      .set(link)
      .where(eq(shareableLinks.id, id))
      .returning();
    return updatedLink;
  }

  async deleteShareableLink(id: string): Promise<void> {
    await db.delete(shareableLinks).where(eq(shareableLinks.id, id));
  }
}

export const storage = new DatabaseStorage();
