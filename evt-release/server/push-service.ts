import webpush from "web-push";
import type { IStorage } from "./storage";
import type { PushSubscription } from "@shared/schema";

// VAPID keys for Web Push
// SECURITY WARNING: These default keys are for development only!
// For production deployment:
// 1. Generate new VAPID keys: npx web-push generate-vapid-keys
// 2. Set environment variables: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL
// 3. Remove or rotate these development keys
// 4. Never commit production keys to source control!

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('VAPID_PUBLIC_KEY must be set in production environment');
  }
  // Development-only fallback
  console.warn('⚠️  WARNING: Using development VAPID keys. Do not use in production!');
  return "BOiq1Yxowae7lV7xtlRCMoZ0wka5J_Rl-mwtpwNtUcn5vQoNPR6zdfPI627RvYqZFbVpgH_TQ82g7S1sZDtx7QI";
})();

const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('VAPID_PRIVATE_KEY must be set in production environment');
  }
  // Development-only fallback
  return "qqUjP3MJaJVM_EV2nQoyqZHUExW2YUoXvNCabtYsg6Y";
})();

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
