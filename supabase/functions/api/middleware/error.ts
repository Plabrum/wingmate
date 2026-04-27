import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import type { AppEnv } from '../types.ts';

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  if (err instanceof ZodError) {
    return c.json({ error: 'Validation failed', issues: err.issues }, 400);
  }
  console.error('Unhandled error:', {
    path: c.req.path,
    method: c.req.method,
    userId: c.get('userId') ?? null,
    err,
  });
  return c.json({ error: 'Internal server error' }, 500);
};
