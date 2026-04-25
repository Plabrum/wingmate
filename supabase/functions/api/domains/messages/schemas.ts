import { z } from '@hono/zod-openapi';

export const MessageSender = z
  .object({
    id: z.string().uuid(),
    chosenName: z.string().nullable(),
  })
  .openapi('MessageSender');

export const Message = z
  .object({
    id: z.string().uuid(),
    matchId: z.string().uuid(),
    senderId: z.string().uuid(),
    body: z.string(),
    isRead: z.boolean(),
    createdAt: z.string(),
    sender: MessageSender.nullable(),
  })
  .openapi('Message');

export const MessagesResponse = z.array(Message).openapi('MessagesResponse');

export const ConversationOther = z
  .object({
    id: z.string().uuid(),
    chosenName: z.string().nullable(),
  })
  .openapi('ConversationOther');

export const ConversationLastMessage = z
  .object({
    id: z.string().uuid(),
    body: z.string(),
    senderId: z.string().uuid(),
    isRead: z.boolean(),
    createdAt: z.string(),
  })
  .openapi('ConversationLastMessage');

export const Conversation = z
  .object({
    matchId: z.string().uuid(),
    createdAt: z.string(),
    other: ConversationOther,
    lastMessage: ConversationLastMessage.nullable(),
    unreadCount: z.number().int(),
  })
  .openapi('Conversation');

export const ConversationsResponse = z.array(Conversation).openapi('ConversationsResponse');

export const SendMessageRequest = z
  .object({
    body: z.string().min(1),
  })
  .openapi('SendMessageRequest');

export const MarkMessagesReadResponse = z
  .object({
    updated: z.number().int(),
  })
  .openapi('MarkMessagesReadResponse');

export const MatchIdParam = z
  .object({ matchId: z.string().uuid() })
  .openapi('MatchIdMessagesParam');

export const MessagesListQuery = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .openapi('MessagesListQuery');

export type Message = z.infer<typeof Message>;
export type Conversation = z.infer<typeof Conversation>;
export type ConversationLastMessage = z.infer<typeof ConversationLastMessage>;
