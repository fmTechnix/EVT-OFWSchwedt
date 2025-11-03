import webpush from "web-push";
import type { IStorage } from "./storage";
import type { PushSubscription } from "@shared/schema";

// VAPID keys for Web Push
// In production, these should be stored in environment variables
// Generated with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BOiq1Yxowae7lV7xtlRCMoZ0wka5J_Rl-mwtpwNtUcn5vQoNPR6zdfPI627RvYqZFbVpgH_TQ82g7S1sZDtx7QI";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "qqUjP3MJaJVM_EV2nQoyqZHUExW2YUoXvNCabtYsg6Y";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:admin@feuerwehr-schwedt.de";

// Configure web-push
webpush.setVapidDetails(
  VAPID_EMAIL,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
}

export class PushNotificationService {
  constructor(private storage: IStorage) {}

  async sendToUser(userId: string, payload: PushNotificationPayload): Promise<void> {
    const subscriptions = await this.storage.getUserPushSubscriptions(userId);
    
    const promises = subscriptions.map(async (sub) => {
      try {
        await this.sendNotification(sub, payload);
      } catch (error) {
        console.error(`Failed to send push notification to user ${userId}:`, error);
        
        // If subscription is invalid, remove it
        if ((error as { statusCode?: number }).statusCode === 410) {
          await this.storage.deletePushSubscription(sub.endpoint);
        }
      }
    });

    await Promise.all(promises);
  }

  async sendToMultipleUsers(userIds: string[], payload: PushNotificationPayload): Promise<void> {
    const promises = userIds.map(userId => this.sendToUser(userId, payload));
    await Promise.all(promises);
  }

  private async sendNotification(subscription: PushSubscription, payload: PushNotificationPayload): Promise<void> {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload)
    );
  }
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}
