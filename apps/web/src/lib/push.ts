/**
 * PushProvider hook (brief §11: push not required in v1). No-op implementation;
 * phase 2 swaps it for Web Push (VAPID) or Capacitor Push Notifications.
 */
export interface PushProvider {
  id: string;
  isSupported(): boolean;
  subscribe(userId: string): Promise<null>;
  notify(userId: string, payload: { title: string; body: string; url?: string }): Promise<void>;
}

export const noopPush: PushProvider = {
  id: "noop",
  isSupported: () => false,
  subscribe: async () => null,
  notify: async () => {},
};

export const push: PushProvider = noopPush;
