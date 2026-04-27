import type { ProfilePrompt, PromptResponse, PromptTemplate } from './schemas.ts';

export type PromptTemplateRow = {
  id: string;
  question: string;
};

export function rowToPromptTemplate(row: PromptTemplateRow): PromptTemplate {
  return { id: row.id, question: row.question };
}

export type ProfilePromptRow = {
  id: string;
  dating_profile_id: string;
  answer: string;
  created_at: string;
  template_id: string;
  template_question: string;
};

export type PromptResponseRow = {
  id: string;
  profile_prompt_id: string;
  message: string;
  is_approved: boolean;
  user_id: string;
  created_at: string;
  author_id: string | null;
  author_name: string | null;
  author_avatar_url: string | null;
};

export function rowToPromptResponse(row: PromptResponseRow): PromptResponse {
  return {
    id: row.id,
    profilePromptId: row.profile_prompt_id,
    message: row.message,
    isApproved: row.is_approved,
    userId: row.user_id,
    createdAt: row.created_at,
    author:
      row.author_id != null
        ? {
            id: row.author_id,
            chosenName: row.author_name,
            avatarUrl: row.author_avatar_url,
          }
        : null,
  };
}

export function rowsToProfilePrompts(
  prompts: ProfilePromptRow[],
  responses: PromptResponseRow[],
): ProfilePrompt[] {
  const responsesByPrompt = new Map<string, PromptResponse[]>();
  for (const r of responses) {
    const list = responsesByPrompt.get(r.profile_prompt_id) ?? [];
    list.push(rowToPromptResponse(r));
    responsesByPrompt.set(r.profile_prompt_id, list);
  }
  return prompts.map((p) => ({
    id: p.id,
    datingProfileId: p.dating_profile_id,
    answer: p.answer,
    createdAt: p.created_at,
    template: { id: p.template_id, question: p.template_question },
    responses: responsesByPrompt.get(p.id) ?? [],
  }));
}
