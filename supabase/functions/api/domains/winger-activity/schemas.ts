import { z } from '@hono/zod-openapi';

export const ActivityKind = z.enum(['match', 'pass', 'sent', 'reply']).openapi('ActivityKind');

export const ActivityRow = z.object({
  id: z.string(),
  kind: ActivityKind,
  daterId: z.string().uuid(),
  daterName: z.string(),
  recipientName: z.string().nullable(),
  promptQuestion: z.string().nullable(),
  message: z.string().nullable(),
  createdAt: z.string(),
}).openapi('ActivityRow');

export const WingerActivityResponse = z.array(ActivityRow).openapi('WingerActivityResponse');

export type ActivityRow = z.infer<typeof ActivityRow>;
export type ActivityKind = z.infer<typeof ActivityKind>;
