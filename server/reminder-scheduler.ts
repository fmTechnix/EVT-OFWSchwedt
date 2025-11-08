import { storage } from "./storage";
import { PushNotificationService } from "./push-service";

/**
 * Availability Reminder Scheduler
 * Sends push notifications to users at configured times to remind them to update availability
 */
export class ReminderScheduler {
  private intervalHandle: NodeJS.Timeout | null = null;
  private pushService: PushNotificationService;
  
  constructor(pushService: PushNotificationService) {
    this.pushService = pushService;
  }

  /**
   * Start the scheduler - checks every minute if reminders should be sent
   */
  start(): void {
    if (this.intervalHandle) {
      console.log("⏰ Reminder scheduler already running");
      return;
    }

    console.log("⏰ Starting availability reminder scheduler");
    
    // Check every minute
    this.intervalHandle = setInterval(() => {
      this.checkAndSendReminders().catch((error) => {
        console.error("Error in reminder scheduler:", error);
      });
    }, 60 * 1000); // Check every minute

    // Also check immediately on start
    this.checkAndSendReminders().catch((error) => {
      console.error("Error in initial reminder check:", error);
    });
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      console.log("⏰ Reminder scheduler stopped");
    }
  }

  /**
   * Check if reminders should be sent and send them
   */
  private async checkAndSendReminders(): Promise<void> {
    const now = new Date();
    const currentDay = this.getDayName(now.getDay());
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Get all users with reminders enabled
    const usersWithReminders = await storage.getUsersWithRemindersEnabled();

    for (const reminderSettings of usersWithReminders) {
      // Check if reminder should be sent today
      if (!reminderSettings.reminder_weekdays.includes(currentDay)) {
        continue;
      }

      // Check if it's time to send reminder
      if (reminderSettings.reminder_time !== currentTime) {
        continue;
      }

      // Check if reminder was already sent today (within last 23 hours)
      if (reminderSettings.last_reminder_sent) {
        const hoursSinceLastReminder = 
          (now.getTime() - new Date(reminderSettings.last_reminder_sent).getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceLastReminder < 23) {
          continue;
        }
      }

      // Send reminder
      await this.sendReminder(reminderSettings.user_id);
      
      // Update last_reminder_sent
      await storage.updateReminderSettings(reminderSettings.user_id, {
        last_reminder_sent: now,
      });
    }
  }

  /**
   * Send availability reminder to a user
   */
  private async sendReminder(userId: string): Promise<void> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        console.warn(`User ${userId} not found for reminder`);
        return;
      }

      console.log(`⏰ Sending availability reminder to ${user.vorname} ${user.nachname}`);

      await this.pushService.sendToUser(userId, {
        title: "Verfügbarkeit aktualisieren",
        body: "Bitte aktualisiere deinen Verfügbarkeitsstatus für die kommende Woche.",
        icon: "/icon-192.png",
        badge: "/badge-72.png"
      });
    } catch (error) {
      console.error(`Failed to send reminder to user ${userId}:`, error);
    }
  }

  /**
   * Get day name from day number (0=Sunday, 1=Monday, etc.)
   */
  private getDayName(dayNumber: number): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[dayNumber];
  }
}
