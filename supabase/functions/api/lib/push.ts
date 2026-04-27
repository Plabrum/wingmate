// Client for the Expo push notification service. Encapsulates the endpoint
// URL and the local-vs-prod no-op behavior so handlers don't have to think
// about either. Errors are logged-and-swallowed: push delivery must never
// roll back the user-facing transaction.
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export type PushClient = {
  send: (token: string | null, title: string, body: string) => Promise<void>;
};

export type CreatePushClientOptions = {
  isProd: boolean;
};

export function createPushClient(opts: CreatePushClientOptions): PushClient {
  return {
    async send(token, title, body) {
      if (!token) return;
      if (!opts.isProd) {
        console.log('[push:local]', { title, body });
        return;
      }
      try {
        const res = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: token, title, body }),
        });
        if (!res.ok) {
          console.error('[push] expo push failed:', res.status, await res.text());
        }
      } catch (err) {
        console.error('[push] expo push threw:', err);
      }
    },
  };
}
