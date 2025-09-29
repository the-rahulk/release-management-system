import nodemailer from 'nodemailer';
import { storage } from './storage';
import type { ReleaseStep, ReleasePlan } from '@shared/schema';

class EmailService {
  private initialized = false;
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    
    if (!gmailUser || !gmailPass) {
      console.warn('GMAIL_USER or GMAIL_APP_PASSWORD not found, email notifications will be disabled');
      console.log('To enable Gmail notifications:');
      console.log('1. Set GMAIL_USER to your Gmail address');
      console.log('2. Set GMAIL_APP_PASSWORD to your Gmail App Password');
      console.log('3. Enable 2FA and generate an App Password in your Google Account settings');
      return;
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    try {
      // Use a shorter timeout for verification
      await Promise.race([
        this.transporter.verify(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 10000))
      ]);
      this.initialized = true;
      console.log('✅ Email service initialized with Gmail successfully');
    } catch (error) {
      // Don't completely disable email service - just warn and continue
      console.warn('⚠️ Gmail verification failed during startup:', error instanceof Error ? error.message : String(error));
      console.log('📧 Email service will attempt to send emails anyway (lazy verification)');
      console.log('If emails fail, check your Gmail App Password and internet connection');
      
      // Set as initialized but mark as unverified
      this.initialized = true;
    }
  }

  private async sendEmail(to: string | string[], subject: string, html: string, cc?: string[], bcc?: string[]) {
    console.log(`📧 Attempting to send email: "${subject}" to ${Array.isArray(to) ? to.join(', ') : to}`);
    
    if (!this.transporter) {
      console.warn('⚠️ Email service not available (no transporter), skipping email');
      return;
    }

    try {
      const settings = await this.getEmailSettings();
      
      const mailOptions = {
        from: settings.from,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html,
        cc: [...(cc || []), ...settings.cc].join(', ') || undefined,
        bcc: [...(bcc || []), ...settings.bcc].join(', ') || undefined,
      };

      console.log(`📤 Sending with from: ${mailOptions.from}, to: ${mailOptions.to}`);

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully to: ${Array.isArray(to) ? to.join(', ') : to}`);
    } catch (error) {
      console.error('❌ Failed to send email:', error instanceof Error ? error.message : String(error));
      console.error('Recipients:', Array.isArray(to) ? to.join(', ') : to);
      console.error('Subject:', subject);
      // Don't throw - just log the error so the app continues working
    }
  }

  private async getEmailSettings() {
    const defaultFrom = await storage.getGlobalSetting('email_default_from');
    const defaultCc = await storage.getGlobalSetting('email_default_cc');
    const defaultBcc = await storage.getGlobalSetting('email_default_bcc');

    return {
      from: defaultFrom?.value || process.env.GMAIL_USER || 'noreply@releasemaster.com',
      cc: defaultCc?.value ? defaultCc.value.split(',').map(email => email.trim()) : [],
      bcc: defaultBcc?.value ? defaultBcc.value.split(',').map(email => email.trim()) : [],
    };
  }

  async sendStepAssignmentNotification(to: string, step: ReleaseStep, role: 'team_lead' | 'poc' = 'team_lead') {
    if (!this.initialized) return;

    try {
      const settings = await this.getEmailSettings();
      
      const roleText = role === 'team_lead' ? 'team lead' : 'Point of Contact (POC)';
      const actionText = role === 'team_lead' ? 'assign a POC and manage the step execution' : 'execute this step';
      
      const subject = `iPlan: Step Assignment - ${step.name}`;
      const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Step Assignment Notification</h2>
            <p>You have been assigned as the ${roleText} for the following step:</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1e293b;">${step.name}</h3>
              <p><strong>Description:</strong> ${step.description || 'No description provided'}</p>
              <p><strong>Category:</strong> ${step.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
              <p><strong>Status:</strong> ${step.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
              ${step.scheduledTime ? `<p><strong>Scheduled Time:</strong> ${new Date(step.scheduledTime).toLocaleString()}</p>` : ''}
            </div>
            
            <p>Please log into iPlan to review the step details and ${actionText}.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">
              <p>This is an automated notification from iPlan Release Management System.</p>
            </div>
          </div>
        `;

      await this.sendEmail(to, subject, html, settings.cc, settings.bcc);
      console.log(`Step assignment notification sent to ${to} (${role})`);
    } catch (error) {
      console.error('Failed to send step assignment notification:', error);
    }
  }

  async sendPocReassignmentNotification(emails: string[], step: ReleaseStep, assignedBy: string) {
    if (!this.initialized || emails.length === 0) return;

    try {
      const settings = await this.getEmailSettings();
      
      const subject = `iPlan: POC Assignment - ${step.name}`;
      const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">POC Assignment Notification</h2>
            <p>You have been assigned as a Point of Contact (POC) for the following step by ${assignedBy}:</p>
            
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h3 style="margin-top: 0; color: #1e293b;">${step.name}</h3>
              <p><strong>Description:</strong> ${step.description || 'No description provided'}</p>
              <p><strong>Category:</strong> ${step.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
              <p><strong>Status:</strong> ${step.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
              ${step.scheduledTime ? `<p><strong>Scheduled Time:</strong> ${new Date(step.scheduledTime).toLocaleString()}</p>` : ''}
              <p><strong>Assigned At:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <p>Please log into iPlan to review the step details. You will be notified when this step is triggered for execution.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">
              <p>This is an automated notification from iPlan Release Management System.</p>
            </div>
          </div>
        `;

      await this.sendEmail(emails, subject, html, settings.cc, settings.bcc);
      console.log(`POC assignment notification sent to ${emails.length} recipients`);
    } catch (error) {
      console.error('Failed to send POC assignment notification:', error);
    }
  }

  async sendStepTriggerNotification(emails: string[], step: ReleaseStep) {
    if (!this.initialized || emails.length === 0) return;

    try {
      const settings = await this.getEmailSettings();
      
      const subject = `iPlan: Step Triggered - ${step.name}`;
      const html = `
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
        `;

      await this.sendEmail(emails, subject, html, settings.cc, settings.bcc);
      console.log(`Step trigger notification sent to ${emails.length} recipients`);
    } catch (error) {
      console.error('Failed to send step trigger notification:', error);
    }
  }

  async sendStatusChangeNotification(emails: string[], step: ReleaseStep, previousStatus: string, newStatus: string, updatedBy: string) {
    if (!this.initialized || emails.length === 0) return;

    try {
      const settings = await this.getEmailSettings();
      
      const statusColors = {
        not_started: '#6b7280',
        started: '#3b82f6',
        in_progress: '#f59e0b',
        completed: '#10b981',
        failed: '#ef4444',
      };

      const subject = `iPlan: Status Update - ${step.name}`;
      const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Step Status Update</h2>
            <p>The status of the following step has been updated by ${updatedBy}:</p>
            
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
              <p><strong>Updated By:</strong> ${updatedBy}</p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">
              <p>This is an automated notification from iPlan Release Management System.</p>
            </div>
          </div>
        `;

      await this.sendEmail(emails, subject, html, settings.cc, settings.bcc);
      console.log(`Status change notification sent to ${emails.length} recipients`);
    } catch (error) {
      console.error('Failed to send status change notification:', error);
    }
  }

  async checkAndNotifyReleaseCompletion(releasePlanId: string) {
    if (!this.initialized) return;

    try {
      // Get release plan and all its steps
      const releasePlan = await storage.getReleasePlan(releasePlanId);
      if (!releasePlan) return;

      const steps = await storage.getStepsByReleasePlan(releasePlanId);
      if (steps.length === 0) return;

      // Check if all steps are completed
      const allCompleted = steps.every((step: any) => step.status === 'completed');
      if (!allCompleted) return;

      console.log(`All steps completed for release ${releasePlan.name} ${releasePlan.version}. Sending completion notifications.`);

      // Collect all stakeholder emails
      const stakeholderIds: string[] = [];
      
      // Add team leads and POCs from all steps
      steps.forEach((step: any) => {
        if (step.teamLeadId && !stakeholderIds.includes(step.teamLeadId)) {
          stakeholderIds.push(step.teamLeadId);
        }
        if (step.primaryPocId && !stakeholderIds.includes(step.primaryPocId)) {
          stakeholderIds.push(step.primaryPocId);
        }
        if (step.backupPocId && !stakeholderIds.includes(step.backupPocId)) {
          stakeholderIds.push(step.backupPocId);
        }
      });

      // Get emails for all stakeholders
      const stakeholderEmails: string[] = [];
      for (const stakeholderId of stakeholderIds) {
        const user = await storage.getUser(stakeholderId);
        if (user?.email) {
          stakeholderEmails.push(user.email);
        }
      }

      // Send completion notification
      await this.sendReleaseCompletionNotification(releasePlan, stakeholderEmails);

      // Update release plan status to completed (if the method supports it)
      try {
        await storage.updateReleasePlan(releasePlanId, { 
          status: 'completed' as any
        });
      } catch (updateError) {
        console.warn('Could not update release plan status:', updateError);
      }

    } catch (error) {
      console.error('Failed to check/notify release completion:', error);
    }
  }

  async sendReleaseCompletionNotification(releasePlan: ReleasePlan, stakeholderEmails: string[]) {
    if (!this.initialized || stakeholderEmails.length === 0) return;

    try {
      const settings = await this.getEmailSettings();
      
      const subject = `iPlan: Release Completed - ${releasePlan.name} ${releasePlan.version}`;
      const html = `
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
        `;

      await this.sendEmail(stakeholderEmails, subject, html, settings.cc, settings.bcc);
      console.log(`Release completion notification sent to ${stakeholderEmails.length} recipients`);
    } catch (error) {
      console.error('Failed to send release completion notification:', error);
    }
  }
}

export const emailService = new EmailService();
