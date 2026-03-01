import { urlBase64ToUint8Array } from '../utils/urlBase64ToUint8Array';

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;

  private constructor() {}

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Check if push notifications are supported
   */
  static isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Register service worker
   */
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!PushNotificationService.isSupported()) {
      console.warn('Push notifications are not supported in this browser');
      return null;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker registered:', this.registration);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      return this.registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(): Promise<PushSubscription | null> {
    try {
      // Ensure service worker is registered
      if (!this.registration) {
        await this.registerServiceWorker();
      }

      if (!this.registration) {
        throw new Error('Service worker not registered');
      }

      // Request permission
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Get VAPID public key from environment
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.warn('VAPID public key not configured');
        // For development, you can generate keys at: https://vapidkeys.com/
        return null;
      }

      // Subscribe to push notifications
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource
      });

      console.log('Push subscription successful:', this.subscription);

      // Save subscription to backend
      await this.saveSubscription(this.subscription);

      return this.subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    try {
      if (this.subscription) {
        await this.subscription.unsubscribe();
        await this.removeSubscription(this.subscription);
        this.subscription = null;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Unsubscribe failed:', error);
      return false;
    }
  }

  /**
   * Get current subscription
   */
  async getSubscription(): Promise<PushSubscription | null> {
    if (!this.registration) {
      await this.registerServiceWorker();
    }

    if (!this.registration) {
      return null;
    }

    this.subscription = await this.registration.pushManager.getSubscription();
    return this.subscription;
  }

  /**
   * Save subscription to backend
   */
  private async saveSubscription(subscription: PushSubscription): Promise<void> {
    try {
      const subscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(subscription.getKey('auth')!)
        }
      };

      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscriptionData)
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      console.log('Subscription saved to backend');
    } catch (error) {
      console.error('Error saving subscription:', error);
      throw error;
    }
  }

  /**
   * Remove subscription from backend
   */
  private async removeSubscription(subscription: PushSubscription): Promise<void> {
    try {
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });

      console.log('Subscription removed from backend');
    } catch (error) {
      console.error('Error removing subscription:', error);
    }
  }

  /**
   * Send a test notification
   */
  async sendTestNotification(): Promise<void> {
    if (Notification.permission === 'granted') {
      new Notification('Test Notification', {
        body: 'This is a test notification from Freelance DApp',
        icon: '/logo.png',
        badge: '/badge.png'
      });
    }
  }
}

// Helper function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Export singleton instance
export const pushNotificationService = PushNotificationService.getInstance();
