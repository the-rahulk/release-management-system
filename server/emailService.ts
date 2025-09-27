import sgMail from '@sendgrid/mail';
import { storage } from './storage';
import type { ReleaseStep, ReleasePlan } from '@shared/schema';

class EmailService {
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      console.warn('SENDGRID_API_KEY not found, email notifications will be disabled');
      return;
    }

    sgMail.setApiKey(apiKey);
    this.initialized = true;
    console.log('Email service initialized with SendGrid');
  }

  private async getEmailSettings() {
    const defaultFrom = await storage.getGlobalSetting('email_default_from');
    const defaultCc = await storage.getGlobalSetting('email_default_cc');
    const defaultBcc = await storage.getGlobalSetting('email_default_bcc');

    return {
      from: defaultFrom?.value || process.env.DEFAULT_FROM_EMAIL || 'noreply@iplan.com',
      cc: defaultCc?.value ? defaultCc.value.split(',').map(email => email.trim()) : [],
      bcc: defaultBcc?.value ? defaultBcc.value.split(',').map(email => email.trim()) : [],
    };
  }

  async sendStepAssignmentNotification(to: string, step: ReleaseStep) {
    if (!this.initialized) return;

    try {
      const settings = await this.getEmailSettings();
      
      const msg = {
        to,
        from: settings.from,
        cc: settings.cc,
        bcc: settings.bcc,
        subject: `iPlan: Step Assignment - ${step.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Step Assignment Notification</h2>
            <p>You have been assigned as the team lead for the following step:</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1e293b;">${step.name}</h3>
              <p><strong>Description:</strong> ${step.description || 'No description provided'}</p>
              <p><strong>Category:</strong> ${step.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
              <p><strong>Status:</strong> ${step.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
              ${step.scheduledTime ? `<p><strong>Scheduled Time:</strong> ${new Date(step.scheduledTime).toLocaleString()}</p>` : ''}
            </div>
            
            <p>Please log into iPlan to review the step details and assign a Point of Contact (POC) if needed.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">
              <p>This is an automated notification from iPlan Release Management System.</p>
            </div>
          </div>
        `,
      };

      await sgMail.send(msg);
      console.log(`Step assignment notification sent to ${to}`);
    } catch (error) {
      console.error('Failed to send step assignment notification:', error);
    }
  }

  async sendStepTriggerNotification(to: string, step: ReleaseStep) {
    if (!this.initialized) return;

    try {
      const settings = await this.getEmailSettings();
      
      const msg = {
        to,
        from: settings.from,
        cc: settings.cc,
        bcc: settings.bcc,
        subject: `iPlan: Step Triggered - ${step.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Step Triggered</h2>
            <p>The following step has been triggered and is ready for execution:</p>
            
            <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <h3 style="margin-top: 0; color: #1e293b;">${step.name}</h3>
              <p><strong>Description:</strong> ${step.description || 'No description provided'}</p>
              <p><strong>Category:</strong> ${step.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
              <p><strong>Status:</strong> Started</p>
              <p><strong>Triggered At:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <p><strong>Action Required:</strong> Please proceed with the execution of this step and update the status to "In Progress" and then "Completed" once finished.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">
              <p>This is an automated notification from iPlan Release Management System.</p>
            </div>
          </div>
        `,
      };

      await sgMail.send(msg);
      console.log(`Step trigger notification sent to ${to}`);
    } catch (error) {
      console.error('Failed to send step trigger notification:', error);
    }
  }

  async sendStatusChangeNotification(to: string, step: ReleaseStep, previousStatus: string, newStatus: string) {
    if (!this.initialized) return;

    try {
      const settings = await this.getEmailSettings();
      
      const statusColors = {
        not_started: '#6b7280',
        started: '#3b82f6',
        in_progress: '#f59e0b',
        completed: '#10b981',
      };

      const msg = {
        to,
        from: settings.from,
        cc: settings.cc,
        bcc: settings.bcc,
        subject: `iPlan: Status Update - ${step.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Step Status Update</h2>
            <p>The status of the following step has been updated:</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1e293b;">${step.name}</h3>
              <p><strong>Description:</strong> ${step.description || 'No description provided'}</p>
              <p><strong>Category:</strong> ${step.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
              
              <div style="margin: 15px 0;">
                <span style="background-color: ${statusColors[previousStatus as keyof typeof statusColors] || '#6b7280'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                  ${previousStatus.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                <span style="margin: 0 10px;">→</span>
                <span style="background-color: ${statusColors[newStatus as keyof typeof statusColors] || '#6b7280'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                  ${newStatus.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
              
              <p><strong>Updated At:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">
              <p>This is an automated notification from iPlan Release Management System.</p>
            </div>
          </div>
        `,
      };

      await sgMail.send(msg);
      console.log(`Status change notification sent to ${to}`);
    } catch (error) {
      console.error('Failed to send status change notification:', error);
    }
  }

  async sendReleaseCompletionNotification(releasePlan: ReleasePlan, stakeholderEmails: string[]) {
    if (!this.initialized || stakeholderEmails.length === 0) return;

    try {
      const settings = await this.getEmailSettings();
      
      const msg = {
        to: stakeholderEmails,
        from: settings.from,
        cc: settings.cc,
        bcc: settings.bcc,
        subject: `iPlan: Release Completed - ${releasePlan.name} ${releasePlan.version}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">🎉 Release Completed Successfully!</h2>
            <p>We're pleased to announce that the following release has been completed:</p>
            
            <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h3 style="margin-top: 0; color: #1e293b;">${releasePlan.name} ${releasePlan.version}</h3>
              <p><strong>Description:</strong> ${releasePlan.description || 'No description provided'}</p>
              <p><strong>Completion Time:</strong> ${new Date().toLocaleString()}</p>
              ${releasePlan.scheduledDate ? `<p><strong>Originally Scheduled:</strong> ${new Date(releasePlan.scheduledDate).toLocaleString()}</p>` : ''}
            </div>
            
            <p>All release steps have been successfully executed. Thank you to everyone involved in making this release a success!</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">
              <p>This is an automated notification from iPlan Release Management System.</p>
            </div>
          </div>
        `,
      };

      await sgMail.send(msg);
      console.log(`Release completion notification sent to ${stakeholderEmails.length} recipients`);
    } catch (error) {
      console.error('Failed to send release completion notification:', error);
    }
  }
}

export const emailService = new EmailService();
