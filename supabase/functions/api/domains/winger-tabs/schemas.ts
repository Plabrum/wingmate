import { z } from '@hono/zod-openapi';

export const WingerTab = z.object({
  id: z.string().uuid(),
  name: z.string(),
}).openapi('WingerTab');

export const WingerTabsResponse = z.array(WingerTab).openapi('WingerTabsResponse');

export type WingerTab = z.infer<typeof WingerTab>;
