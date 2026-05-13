import { z } from '@hono/zod-openapi';

export const ReportRequest = z
  .object({
    recipientId: z.string().uuid(),
    reason: z.string().min(1).max(500),
  })
  .openapi('ReportRequest');

export const ReportResponse = z
  .object({ ok: z.literal(true) })
  .openapi('ReportResponse');
