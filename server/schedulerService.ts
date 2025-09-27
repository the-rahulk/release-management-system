import cron from 'node-cron';
import { storage } from './storage';
import { emailService } from './emailService';
import type { IStorage } from './storage';
import type { ReleaseStep } from '@shared/schema';

class SchedulerService {
  private cronJobs: Map<string, any> = new Map();
  private broadcastFn: ((data: any) => void) | null = null;
  private storageInstance: IStorage | null = null;

  initialize(storageInstance: IStorage, broadcastFn: (data: any) => void) {
    this.storageInstance = storageInstance;
    this.broadcastFn = broadcastFn;
    
    // Start the main scheduler that runs every minute
    this.startMainScheduler();
    console.log('Scheduler service initialized');
  }

  private startMainScheduler() {
    // Run every minute to check for steps that need to be triggered
    cron.schedule('* * * * *', async () => {
      await this.checkScheduledSteps();
      await this.checkDependentSteps();
    });
  }

  private async checkScheduledSteps() {
    if (!this.storageInstance) return;

    try {
      const stepsToCheck = await this.storageInstance.getStepsForScheduling();
      const now = new Date();

      for (const step of stepsToCheck) {
        if (step.scheduledTime && new Date(step.scheduledTime) <= now) {
          await this.triggerStep(step);
        }
      }
    } catch (error) {
      console.error('Error checking scheduled steps:', error);
    }
  }

  private async checkDependentSteps() {
    if (!this.storageInstance) return;

    try {
      // Get all steps that depend on other steps
      const allSteps = await this.storageInstance.getStepsByStatus('not_started');
      
      for (const step of allSteps) {
        if (step.schedulingType === 'after_step' && step.dependsOnStepId) {
          const dependencyStep = await this.storageInstance.getStep(step.dependsOnStepId);
          
          if (dependencyStep && dependencyStep.status === 'completed') {
            await this.triggerStep(step);
          }
        } else if (step.schedulingType === 'simultaneous' && step.simultaneousWithStepId) {
          const simultaneousStep = await this.storageInstance.getStep(step.simultaneousWithStepId);
          
          if (simultaneousStep && simultaneousStep.status === 'started') {
            await this.triggerStep(step);
          }
        }
      }
    } catch (error) {
      console.error('Error checking dependent steps:', error);
    }
  }

  private async triggerStep(step: ReleaseStep) {
    if (!this.storageInstance || !this.broadcastFn) return;

    try {
      // Update step status to started
      const updatedStep = await this.storageInstance.updateStep(step.id, {
        status: 'started',
        startedAt: new Date(),
      });

      // Log the automated trigger
      await this.storageInstance.addStepHistory({
        stepId: step.id,
        previousStatus: 'not_started',
        newStatus: 'started',
        changedBy: 'system',
        notes: 'Automatically triggered by scheduler',
      });

      // Send trigger notification to POC
      if (step.primaryPocId) {
        const poc = await this.storageInstance.getUser(step.primaryPocId);
        if (poc?.email) {
          await emailService.sendStepTriggerNotification(poc.email, updatedStep);
        }
      }

      // Broadcast real-time update
      this.broadcastFn({
        type: 'step_triggered',
        data: updatedStep,
      });

      console.log(`Step ${step.name} (${step.id}) triggered automatically`);

      // Check if this triggers any simultaneous steps
      await this.checkSimultaneousSteps(step.id);

    } catch (error) {
      console.error(`Error triggering step ${step.id}:`, error);
    }
  }

  private async checkSimultaneousSteps(triggeredStepId: string) {
    if (!this.storageInstance) return;

    try {
      const simultaneousSteps = await this.storageInstance.getStepsByStatus('not_started');
      
      for (const step of simultaneousSteps) {
        if (step.schedulingType === 'simultaneous' && step.simultaneousWithStepId === triggeredStepId) {
          await this.triggerStep(step);
        }
      }
    } catch (error) {
      console.error('Error checking simultaneous steps:', error);
    }
  }

  async scheduleStep(step: ReleaseStep) {
    if (step.schedulingType === 'fixed_time' && step.scheduledTime) {
      const stepId = step.id;
      const scheduledTime = new Date(step.scheduledTime);
      
      // Cancel existing job if any
      if (this.cronJobs.has(stepId)) {
        this.cronJobs.get(stepId).stop();
        this.cronJobs.delete(stepId);
      }

      // Create cron expression for the scheduled time
      const cronExpression = `${scheduledTime.getMinutes()} ${scheduledTime.getHours()} ${scheduledTime.getDate()} ${scheduledTime.getMonth() + 1} *`;
      
      const job = cron.schedule(cronExpression, async () => {
        await this.triggerStep(step);
        // Remove the job after execution
        this.cronJobs.delete(stepId);
      }, {
        scheduled: false,
        timezone: step.timezone || 'UTC',
      });

      this.cronJobs.set(stepId, job);
      job.start();
      
      console.log(`Step ${step.name} scheduled for ${scheduledTime.toISOString()}`);
    }
  }

  async unscheduleStep(stepId: string) {
    if (this.cronJobs.has(stepId)) {
      this.cronJobs.get(stepId).stop();
      this.cronJobs.delete(stepId);
      console.log(`Step ${stepId} unscheduled`);
    }
  }

  async checkReleaseCompletion(releasePlanId: string) {
    if (!this.storageInstance || !this.broadcastFn) return;

    try {
      const steps = await this.storageInstance.getStepsByReleasePlan(releasePlanId);
      const allCompleted = steps.every(step => step.status === 'completed');

      if (allCompleted && steps.length > 0) {
        // Update release plan status
        const releasePlan = await this.storageInstance.updateReleasePlan(releasePlanId, {
          status: 'completed',
        });

        // Get all stakeholder emails
        const stakeholderIds = new Set<string>();
        steps.forEach(step => {
          if (step.teamLeadId) stakeholderIds.add(step.teamLeadId);
          if (step.primaryPocId) stakeholderIds.add(step.primaryPocId);
          if (step.backupPocId) stakeholderIds.add(step.backupPocId);
        });

        const stakeholders = await this.storageInstance.getUsersByIds(Array.from(stakeholderIds));
        const stakeholderEmails = stakeholders.map(user => user.email).filter(Boolean) as string[];

        // Send completion notification
        await emailService.sendReleaseCompletionNotification(releasePlan, stakeholderEmails);

        // Broadcast completion
        this.broadcastFn({
          type: 'release_completed',
          data: releasePlan,
        });

        console.log(`Release ${releasePlan.name} ${releasePlan.version} completed`);
      }
    } catch (error) {
      console.error('Error checking release completion:', error);
    }
  }

  // Method to manually trigger step completion check
  async onStepStatusChange(stepId: string) {
    if (!this.storageInstance) return;

    try {
      const step = await this.storageInstance.getStep(stepId);
      if (step && step.status === 'completed') {
        // Check if this completion triggers any dependent steps
        await this.checkDependentSteps();
        
        // Check if the entire release is complete
        await this.checkReleaseCompletion(step.releasePlanId);
      }
    } catch (error) {
      console.error('Error handling step status change:', error);
    }
  }
}

export const schedulerService = new SchedulerService();
