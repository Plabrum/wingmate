import type { OpenAPIHono } from '@hono/zod-openapi';
import { createRoute } from '@hono/zod-openapi';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from '../../types.ts';
import {
  ContactIdParam,
  InviteWingpersonRequest,
  InviteWingpersonResponse,
  OkResponse,
  WingpeopleResponse,
  type WingpeopleResponse as WingpeopleResponseT,
} from './schemas.ts';
import {
  fetchActiveWingpeople,
  fetchIncomingInvitations,
  fetchPushToken,
  fetchSentInvitations,
  fetchWeeklyCounts,
  fetchWingingFor,
  insertContactInvite,
  removeContactByDater,
  setInvitationStatus,
} from './queries.ts';
import {
  rowToIncomingInvitation,
  rowToSentInvitation,
  rowToWingingFor,
  rowToWingperson,
} from './transformers.ts';
import { getDeps } from '../../lib/deps.ts';

const wingpeopleRoute = createRoute({
  method: 'get',
  path: '/wingpeople',
  tags: ['contacts'],
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'Combined wingperson roster, invitations, and weekly counts',
      content: { 'application/json': { schema: WingpeopleResponse } },
    },
    401: { description: 'Unauthenticated' },
  },
});

const inviteRoute = createRoute({
  method: 'post',
  path: '/wingpeople/invite',
  tags: ['contacts'],
  security: [{ Bearer: [] }],
  request: {
    body: { content: { 'application/json': { schema: InviteWingpersonRequest } }, required: true },
  },
  responses: {
    200: {
      description: 'Pending contact created',
      content: { 'application/json': { schema: InviteWingpersonResponse } },
    },
    400: { description: 'Invalid input' },
    401: { description: 'Unauthenticated' },
  },
});

const acceptRoute = createRoute({
  method: 'post',
  path: '/wingpeople/{id}/accept',
  tags: ['contacts'],
  security: [{ Bearer: [] }],
  request: { params: ContactIdParam },
  responses: {
    200: {
      description: 'Invitation accepted',
      content: { 'application/json': { schema: OkResponse } },
    },
    401: { description: 'Unauthenticated' },
    404: { description: 'No pending invitation for this caller' },
  },
});

const declineRoute = createRoute({
  method: 'post',
  path: '/wingpeople/{id}/decline',
  tags: ['contacts'],
  security: [{ Bearer: [] }],
  request: { params: ContactIdParam },
  responses: {
    200: {
      description: 'Invitation declined',
      content: { 'application/json': { schema: OkResponse } },
    },
    401: { description: 'Unauthenticated' },
    404: { description: 'No pending invitation for this caller' },
  },
});

const removeRoute = createRoute({
  method: 'delete',
  path: '/wingpeople/{id}',
  tags: ['contacts'],
  security: [{ Bearer: [] }],
  request: { params: ContactIdParam },
  responses: {
    200: {
      description: 'Wingperson removed',
      content: { 'application/json': { schema: OkResponse } },
    },
    401: { description: 'Unauthenticated' },
    404: { description: 'Contact not found for this caller' },
  },
});

export function mountContacts(app: OpenAPIHono<AppEnv>) {
  app.openapi(wingpeopleRoute, async (c) => {
    const { userId, db } = getDeps(c);

    const [wingpeople, invitations, sentInvitations, wingingFor] = await Promise.all([
      fetchActiveWingpeople(db, userId),
      fetchIncomingInvitations(db, userId),
      fetchSentInvitations(db, userId),
      fetchWingingFor(db, userId),
    ]);

    const weeklyCounts = await fetchWeeklyCounts(db, userId, wingpeople);

    const body: WingpeopleResponseT = {
      wingpeople: wingpeople.map(rowToWingperson),
      invitations: invitations.map(rowToIncomingInvitation),
      wingingFor: wingingFor.map(rowToWingingFor),
      sentInvitations: sentInvitations.map(rowToSentInvitation),
      weeklyCounts,
    };
    return c.json(body, 200);
  });

  app.openapi(inviteRoute, async (c) => {
    const { userId: daterId, db, push } = getDeps(c);
    const { phoneNumber } = c.req.valid('json');

    const inserted = await insertContactInvite(db, daterId, phoneNumber);

    if (inserted.winger_id) {
      const wingerToken = await fetchPushToken(db, inserted.winger_id);
      await push.send(
        wingerToken,
        "You've been invited! 🤝",
        'Someone wants you to be their wingperson on Pear.',
      );
    }

    return c.json(
      {
        id: inserted.id,
        phoneNumber: inserted.phone_number,
        wingerId: inserted.winger_id,
      },
      200,
    );
  });

  app.openapi(acceptRoute, async (c) => {
    const { userId: wingerId, db } = getDeps(c);
    const { id } = c.req.valid('param');

    const { updated } = await setInvitationStatus(db, id, wingerId, 'active');
    if (!updated) throw new HTTPException(404, { message: 'No pending invitation' });
    return c.json({ ok: true } as const, 200);
  });

  app.openapi(declineRoute, async (c) => {
    const { userId: wingerId, db } = getDeps(c);
    const { id } = c.req.valid('param');

    const { updated } = await setInvitationStatus(db, id, wingerId, 'removed');
    if (!updated) throw new HTTPException(404, { message: 'No pending invitation' });
    return c.json({ ok: true } as const, 200);
  });

  app.openapi(removeRoute, async (c) => {
    const { userId: daterId, db } = getDeps(c);
    const { id } = c.req.valid('param');

    const { updated } = await removeContactByDater(db, id, daterId);
    if (!updated) throw new HTTPException(404, { message: 'Contact not found' });
    return c.json({ ok: true } as const, 200);
  });
}
