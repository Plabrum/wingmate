import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '../types.ts';
import type { Tx } from '../db/client.ts';
import type { PushClient } from '../lib/push.ts';

export type TestDeps = {
  userId?: string;
  db?: unknown;
  push?: Partial<PushClient>;
};

// Minimal test app: skips all real middleware, pre-populates context vars,
// then mounts the domain under test. Never calls createApp() so db/client.ts
// (and its env-reading config.ts) are never imported.
export function createTestApp(mountFn: (app: OpenAPIHono<AppEnv>) => void, deps: TestDeps = {}) {
  const app = new OpenAPIHono<AppEnv>().basePath('/api');

  const userId = deps.userId ?? 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const fakeToken = makeFakeJwt(userId);

  app.use('*', async (c, next) => {
    c.set('userId', userId);
    c.set('token', fakeToken);
    c.set('claims', { sub: userId });
    c.set('db', (deps.db ?? createDbMock(undefined)) as Tx);
    c.set('push', (deps.push ?? { send: () => Promise.resolve() }) as PushClient);
    await next();
  });

  mountFn(app);
  return app;
}

// Chainable Proxy that resolves to `result` when awaited. Every property
// access returns the proxy itself (for builder chains like .select().from()...),
// except .then/.catch/.finally which make it behave as a resolved Promise.
// deno-lint-ignore no-explicit-any
export function createDbMock(result: unknown): any {
  // deno-lint-ignore no-explicit-any
  const proxy: any = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          return (resolve: (v: unknown) => unknown) => Promise.resolve(resolve(result));
        }
        if (prop === 'catch') {
          return () => proxy;
        }
        if (prop === 'finally') {
          return (fn: () => void) => {
            fn();
            return proxy;
          };
        }
        return () => proxy;
      },
    },
  );
  return proxy;
}

export function makeFakeJwt(userId: string): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub: userId, iat: 0 }));
  return `${header}.${payload}.fakesig`;
}
