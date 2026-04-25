import type { OpenAPIHono } from '@hono/zod-openapi';
import { createRoute } from '@hono/zod-openapi';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from '../../types.ts';
import {
  CreateProfilePromptRequest,
  CreatePromptResponseRequest,
  OkResponse,
  ProfilePrompt,
  ProfilePromptIdParam,
  ProfilePromptsResponse,
  PromptResponse,
  PromptResponseIdParam,
  PromptTemplatesResponse,
  type ProfilePrompt as ProfilePromptT,
  type PromptResponse as PromptResponseT,
  type PromptTemplate as PromptTemplateT,
} from './schemas.ts';
import {
  approveOwnedPromptResponse,
  deleteOwnedProfilePrompt,
  deletePromptResponseAsAuthorOrOwner,
  fetchOnboardingPromptTemplates,
  fetchOwnDatingProfileId,
  fetchOwnProfilePrompts,
  fetchProfilePromptOwner,
  fetchPromptTemplates,
  insertProfilePrompt,
  insertPromptResponse,
  isActiveWingperson,
  isMatchedWith,
} from './queries.ts';
import {
  rowToPromptResponse,
  rowToPromptTemplate,
  rowsToProfilePrompts,
} from './transformers.ts';

const ONBOARDING_PROMPT_COUNT = 5;

const listTemplatesRoute = createRoute({
  method: 'get',
  path: '/prompt-templates',
  tags: ['prompts'],
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'Full prompt template catalog',
      content: { 'application/json': { schema: PromptTemplatesResponse } },
    },
    401: { description: 'Unauthenticated' },
  },
});

const onboardingTemplatesRoute = createRoute({
  method: 'get',
  path: '/prompt-templates/onboarding',
  tags: ['prompts'],
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'Random selection of prompt templates for onboarding',
      content: { 'application/json': { schema: PromptTemplatesResponse } },
    },
    401: { description: 'Unauthenticated' },
  },
});

const ownProfilePromptsRoute = createRoute({
  method: 'get',
  path: '/profile-prompts/me',
  tags: ['prompts'],
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: "Caller's profile prompts with responses",
      content: { 'application/json': { schema: ProfilePromptsResponse } },
    },
    401: { description: 'Unauthenticated' },
  },
});

const createProfilePromptRoute = createRoute({
  method: 'post',
  path: '/profile-prompts',
  tags: ['prompts'],
  security: [{ Bearer: [] }],
  request: {
    body: { content: { 'application/json': { schema: CreateProfilePromptRequest } }, required: true },
  },
  responses: {
    200: {
      description: 'Profile prompt created',
      content: { 'application/json': { schema: ProfilePrompt } },
    },
    400: { description: 'Invalid input' },
    401: { description: 'Unauthenticated' },
    404: { description: "Caller has no dating profile" },
  },
});

const deleteProfilePromptRoute = createRoute({
  method: 'delete',
  path: '/profile-prompts/{id}',
  tags: ['prompts'],
  security: [{ Bearer: [] }],
  request: { params: ProfilePromptIdParam },
  responses: {
    200: {
      description: 'Profile prompt deleted',
      content: { 'application/json': { schema: OkResponse } },
    },
    401: { description: 'Unauthenticated' },
    404: { description: 'Profile prompt not found for this caller' },
  },
});

const createPromptResponseRoute = createRoute({
  method: 'post',
  path: '/prompt-responses',
  tags: ['prompts'],
  security: [{ Bearer: [] }],
  request: {
    body: { content: { 'application/json': { schema: CreatePromptResponseRequest } }, required: true },
  },
  responses: {
    200: {
      description: 'Prompt response created',
      content: { 'application/json': { schema: PromptResponse } },
    },
    400: { description: 'Invalid input' },
    401: { description: 'Unauthenticated' },
    403: { description: 'Caller is not a wingperson or match of the prompt owner' },
    404: { description: 'Profile prompt not found' },
  },
});

const approvePromptResponseRoute = createRoute({
  method: 'post',
  path: '/prompt-responses/{id}/approve',
  tags: ['prompts'],
  security: [{ Bearer: [] }],
  request: { params: PromptResponseIdParam },
  responses: {
    200: {
      description: 'Prompt response approved',
      content: { 'application/json': { schema: PromptResponse } },
    },
    401: { description: 'Unauthenticated' },
    404: { description: 'Prompt response not found for this caller' },
  },
});

const deletePromptResponseRoute = createRoute({
  method: 'delete',
  path: '/prompt-responses/{id}',
  tags: ['prompts'],
  security: [{ Bearer: [] }],
  request: { params: PromptResponseIdParam },
  responses: {
    200: {
      description: 'Prompt response deleted',
      content: { 'application/json': { schema: OkResponse } },
    },
    401: { description: 'Unauthenticated' },
    404: { description: 'Prompt response not found for this caller' },
  },
});

export function mountPrompts(app: OpenAPIHono<AppEnv>) {
  app.openapi(listTemplatesRoute, async (c) => {
    const db = c.get('db');
    const rows = await fetchPromptTemplates(db);
    const body: PromptTemplateT[] = rows.map(rowToPromptTemplate);
    return c.json(body, 200);
  });

  app.openapi(onboardingTemplatesRoute, async (c) => {
    const db = c.get('db');
    const rows = await fetchOnboardingPromptTemplates(db, ONBOARDING_PROMPT_COUNT);
    const body: PromptTemplateT[] = rows.map(rowToPromptTemplate);
    return c.json(body, 200);
  });

  app.openapi(ownProfilePromptsRoute, async (c) => {
    const userId = c.get('userId');
    const db = c.get('db');
    const { prompts, responses } = await fetchOwnProfilePrompts(db, userId);
    const body: ProfilePromptT[] = rowsToProfilePrompts(prompts, responses);
    return c.json(body, 200);
  });

  app.openapi(createProfilePromptRoute, async (c) => {
    const userId = c.get('userId');
    const db = c.get('db');
    const { promptTemplateId, answer } = c.req.valid('json');

    const datingProfileId = await fetchOwnDatingProfileId(db, userId);
    if (!datingProfileId) throw new HTTPException(404, { message: 'No dating profile' });

    const inserted = await insertProfilePrompt(db, datingProfileId, promptTemplateId, answer);
    const [prompt] = rowsToProfilePrompts([inserted], []);
    return c.json(prompt, 200);
  });

  app.openapi(deleteProfilePromptRoute, async (c) => {
    const userId = c.get('userId');
    const db = c.get('db');
    const { id } = c.req.valid('param');

    const { deleted } = await deleteOwnedProfilePrompt(db, id, userId);
    if (!deleted) throw new HTTPException(404, { message: 'Profile prompt not found' });
    return c.json({ ok: true } as const, 200);
  });

  app.openapi(createPromptResponseRoute, async (c) => {
    const callerId = c.get('userId');
    const db = c.get('db');
    const { profilePromptId, message } = c.req.valid('json');

    const ownerId = await fetchProfilePromptOwner(db, profilePromptId);
    if (!ownerId) throw new HTTPException(404, { message: 'Profile prompt not found' });

    if (ownerId !== callerId) {
      const [winger, matched] = await Promise.all([
        isActiveWingperson(db, ownerId, callerId),
        isMatchedWith(db, callerId, ownerId),
      ]);
      if (!winger && !matched) {
        throw new HTTPException(403, {
          message: 'Not a wingperson or match of the prompt owner',
        });
      }
    }

    const row = await insertPromptResponse(db, callerId, profilePromptId, message);
    const body: PromptResponseT = rowToPromptResponse(row);
    return c.json(body, 200);
  });

  app.openapi(approvePromptResponseRoute, async (c) => {
    const userId = c.get('userId');
    const db = c.get('db');
    const { id } = c.req.valid('param');

    const row = await approveOwnedPromptResponse(db, id, userId);
    if (!row) throw new HTTPException(404, { message: 'Prompt response not found' });
    return c.json(rowToPromptResponse(row), 200);
  });

  app.openapi(deletePromptResponseRoute, async (c) => {
    const userId = c.get('userId');
    const db = c.get('db');
    const { id } = c.req.valid('param');

    const { deleted } = await deletePromptResponseAsAuthorOrOwner(db, id, userId);
    if (!deleted) throw new HTTPException(404, { message: 'Prompt response not found' });
    return c.json({ ok: true } as const, 200);
  });
}
