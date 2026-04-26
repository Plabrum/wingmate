import type { OpenAPIHono } from '@hono/zod-openapi';
import { createRoute } from '@hono/zod-openapi';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from '../../types.ts';
import {
  type Conversation,
  ConversationsResponse,
  MarkMessagesReadResponse,
  MatchIdParam,
  Message,
  MessagesListQuery,
  MessagesResponse,
  SendMessageRequest,
} from './schemas.ts';
import {
  fetchConversations,
  fetchMessagesForMatch,
  fetchPushToken,
  getMatchPeers,
  insertMessage,
  isViewerInMatch,
  markMessagesRead,
} from './queries.ts';
import { rowToConversation, rowToMessage } from './transformers.ts';
import { getDeps } from '../../lib/deps.ts';

const listMessagesRoute = createRoute({
  method: 'get',
  path: '/matches/{matchId}/messages',
  tags: ['messages'],
  security: [{ Bearer: [] }],
  request: { params: MatchIdParam, query: MessagesListQuery },
  responses: {
    200: {
      description: 'Messages for the match in chronological order',
      content: { 'application/json': { schema: MessagesResponse } },
    },
    401: { description: 'Unauthenticated' },
    404: { description: 'Match not found or viewer is not party to it' },
  },
});

const sendMessageRoute = createRoute({
  method: 'post',
  path: '/matches/{matchId}/messages',
  tags: ['messages'],
  security: [{ Bearer: [] }],
  request: {
    params: MatchIdParam,
    body: { content: { 'application/json': { schema: SendMessageRequest } }, required: true },
  },
  responses: {
    200: {
      description: 'Message inserted',
      content: { 'application/json': { schema: Message } },
    },
    400: { description: 'Invalid input' },
    401: { description: 'Unauthenticated' },
    404: { description: 'Match not found or viewer is not party to it' },
  },
});

const markReadRoute = createRoute({
  method: 'post',
  path: '/matches/{matchId}/messages/read',
  tags: ['messages'],
  security: [{ Bearer: [] }],
  request: { params: MatchIdParam },
  responses: {
    200: {
      description: 'Inbound messages marked read for the viewer',
      content: { 'application/json': { schema: MarkMessagesReadResponse } },
    },
    401: { description: 'Unauthenticated' },
    404: { description: 'Match not found or viewer is not party to it' },
  },
});

const listConversationsRoute = createRoute({
  method: 'get',
  path: '/conversations',
  tags: ['messages'],
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'Conversations for the viewer with last message + unread count',
      content: { 'application/json': { schema: ConversationsResponse } },
    },
    401: { description: 'Unauthenticated' },
  },
});

export function mountMessages(app: OpenAPIHono<AppEnv>) {
  app.openapi(listMessagesRoute, async (c) => {
    const { userId: viewerId, db } = getDeps(c);
    const { matchId } = c.req.valid('param');
    const { limit, offset } = c.req.valid('query');

    const allowed = await isViewerInMatch(db, viewerId, matchId);
    if (!allowed) throw new HTTPException(404, { message: 'Match not found' });

    const rows = await fetchMessagesForMatch(db, matchId, limit ?? 50, offset ?? 0);
    const body: Message[] = rows.map(rowToMessage);
    return c.json(body, 200);
  });

  app.openapi(sendMessageRoute, async (c) => {
    const { userId: viewerId, db, push } = getDeps(c);
    const { matchId } = c.req.valid('param');
    const { body } = c.req.valid('json');

    const allowed = await isViewerInMatch(db, viewerId, matchId);
    if (!allowed) throw new HTTPException(404, { message: 'Match not found' });

    const row = await insertMessage(db, matchId, viewerId, body);

    const peers = await getMatchPeers(db, matchId);
    if (peers) {
      const recipientId = peers.userAId === viewerId ? peers.userBId : peers.userAId;
      const recipientToken = await fetchPushToken(db, recipientId);
      const senderName = row.sender_chosen_name ?? 'Someone';
      const preview = body.length > 80 ? body.slice(0, 77) + '…' : body;
      await push.send(recipientToken, `New message from ${senderName}`, preview);
    }

    return c.json(rowToMessage(row), 200);
  });

  app.openapi(markReadRoute, async (c) => {
    const { userId: viewerId, db } = getDeps(c);
    const { matchId } = c.req.valid('param');

    const allowed = await isViewerInMatch(db, viewerId, matchId);
    if (!allowed) throw new HTTPException(404, { message: 'Match not found' });

    const result = await markMessagesRead(db, matchId, viewerId);
    return c.json(result, 200);
  });

  app.openapi(listConversationsRoute, async (c) => {
    const { userId: viewerId, db } = getDeps(c);
    const rows = await fetchConversations(db, viewerId);
    const body: Conversation[] = rows.map(rowToConversation);
    return c.json(body, 200);
  });
}
