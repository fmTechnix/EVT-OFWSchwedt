import webpush from "web-push";
import type { IStorage } from "./storage";
import type { PushSubscription } from "@shared/schema";

// Custom error for invalid push subscriptions
export class InvalidPushSubscriptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPushSubscriptionError';
  }
}

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

export interface SendPushContext {
  messageType: string;
  sentBy?: string;
}

export class PushNotificationService {
  constructor(private storage: IStorage) {}

  async sendToUser(userId: string, payload: PushNotificationPayload, context: SendPushContext = { messageType: 'general' }): Promise<void> {
    const subscriptions = await this.storage.getUserPushSubscriptions(userId);
    
    if (subscriptions.length === 0) {
      // No subscriptions for this user - log and skip
      await this.logPush({
        user_id: userId,
        message_type: context.messageType,
        title: payload.title,
        body: payload.body,
        status: 'no_subscription',
        sent_by: context.sentBy || 'system',
      });
      return;
    }
    
    const promises = subscriptions.map(async (sub) => {
      try {
        // Validate endpoint BEFORE attempting to send
        if (!sub.endpoint || sub.endpoint.trim() === '' || sub.endpoint === '.') {
          throw new InvalidPushSubscriptionError(`Invalid endpoint: "${sub.endpoint}"`);
        }
        
        await this.sendNotification(sub, payload);
        
        // Log successful send
        await this.logPush({
          user_id: userId,
          message_type: context.messageType,
          title: payload.title,
          body: payload.body,
          status: 'success',
          subscription_endpoint: sub.endpoint,
          sent_by: context.sentBy || 'system',
        });
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        console.error(`Failed to send push notification to user ${userId}:`, errorMsg);
        
        // Log error
        await this.logPush({
          user_id: userId,
          message_type: context.messageType,
          title: payload.title,
          body: payload.body,
          status: 'error',
          error_message: errorMsg,
          subscription_endpoint: sub.endpoint,
          status_code: error?.statusCode,
          sent_by: context.sentBy || 'system',
        });
        
        // Permanent failures - remove subscription immediately
        const isPermanentFailure = 
          error instanceof InvalidPushSubscriptionError || // Our validation
          error?.statusCode === 410 || // Gone (browser unsubscribed)
          error?.statusCode === 404;   // Not found
        
        if (isPermanentFailure) {
          console.log(`🗑️  Removing invalid subscription for user ${userId}: ${errorMsg}`);
          await this.storage.deletePushSubscription(sub.endpoint);
        }
        // Temporary network errors - log but keep subscription for retry
        else if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
          console.warn(`⚠️  Network error sending push to user ${userId}: ${error.code} - will retry later`);
        }
        // Unknown error - log for investigation
        else {
          console.warn(`⚠️  Unknown error sending push to user ${userId}:`, error);
        }
      }
    });

    await Promise.all(promises);
  }

  async sendToMultipleUsers(userIds: string[], payload: PushNotificationPayload, context: SendPushContext = { messageType: 'general' }): Promise<void> {
    const promises = userIds.map(userId => this.sendToUser(userId, payload, context));
    await Promise.all(promises);
  }

  async sendTestNotification(userId: string, sentByAdminId: string): Promise<void> {
    const payload: PushNotificationPayload = {
      title: 'Test-Benachrichtigung',
      body: `Dies ist eine Test-Benachrichtigung vom Admin-Bereich. Wenn Sie diese Nachricht sehen, funktionieren Push-Benachrichtigungen korrekt.`,
      icon: '/feuerwehr-logo.png',
    };

    await this.sendToUser(userId, payload, {
      messageType: 'test',
      sentBy: sentByAdminId,
    });
  }

  private async logPush(logData: {
    user_id: string;
    message_type: string;
    title: string;
    body: string;
    status: string;
    error_message?: string;
    subscription_endpoint?: string;
    status_code?: number;
    sent_by: string;
  }): Promise<void> {
    try {
      await this.storage.createPushLog(logData);
    } catch (error) {
      // Never let logging errors break the push flow
      console.error('Failed to log push notification:', error);
    }
  }

  private async sendNotification(subscription: PushSubscription, payload: PushNotificationPayload): Promise<void> {
    // Validation is done in sendToUser before calling this method
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
