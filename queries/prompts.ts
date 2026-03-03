import { useSuspenseQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// ── Prompt templates ──────────────────────────────────────────────────────────

/**
 * Fetch all available prompt templates.
 * Used during onboarding and "Add Prompt" flow to let the user pick a question.
 */
export function getPromptTemplates() {
  return supabase.from('prompt_templates').select('id, question').order('question');
}

const ONBOARDING_PROMPT_COUNT = 5;

/**
 * Fetch a random selection of prompt templates for onboarding.
 */
async function getOnboardingPromptTemplatesQuery() {
  const { data, error } = await getPromptTemplates();
  if (error) return { data: null, error };
  const shuffled = [...(data ?? [])]
    .sort(() => Math.random() - 0.5)
    .slice(0, ONBOARDING_PROMPT_COUNT);
  return { data: shuffled, error: null };
}

export function useOnboardingPromptTemplates() {
  return useSuspenseQuery({
    queryKey: ['prompt-templates'],
    queryFn: async () => {
      const { data, error } = await getOnboardingPromptTemplatesQuery();
      if (error) throw error;
      return data ?? [];
    },
    staleTime: Infinity,
  });
}

// ── Profile prompts ───────────────────────────────────────────────────────────

/**
 * Add a prompt answer to a dating profile.
 */
export function addProfilePrompt(
  datingProfileId: string,
  promptTemplateId: string,
  answer: string
) {
  return supabase
    .from('profile_prompts')
    .insert({ dating_profile_id: datingProfileId, prompt_template_id: promptTemplateId, answer });
}

/** Edit an existing prompt answer. */
export function updateProfilePrompt(promptId: string, answer: string) {
  return supabase.from('profile_prompts').update({ answer }).eq('id', promptId);
}

/** Remove a prompt from a profile. */
export function deleteProfilePrompt(promptId: string) {
  return supabase.from('profile_prompts').delete().eq('id', promptId);
}

// ── Prompt responses (wingperson comments) ────────────────────────────────────

/**
 * Wingperson submits a Hinge-style comment on a profile prompt.
 * Starts unapproved (is_approved = false) — profile owner must approve.
 */
export function addPromptResponse(userId: string, profilePromptId: string, message: string) {
  return supabase
    .from('prompt_responses')
    .insert({ user_id: userId, profile_prompt_id: profilePromptId, message, is_approved: false });
}

/** Profile owner approves a wingperson comment — it becomes visible on the profile. */
export function approvePromptResponse(responseId: string) {
  return supabase.from('prompt_responses').update({ is_approved: true }).eq('id', responseId);
}

/** Profile owner rejects (deletes) a wingperson comment. */
export function rejectPromptResponse(responseId: string) {
  return supabase.from('prompt_responses').delete().eq('id', responseId);
}

/**
 * Fetch all pending (unapproved) prompt responses for a dating profile.
 * Used to show the "N wingperson comment" notification badge on the Prompts tab.
 */
export function getPendingPromptResponses(datingProfileId: string) {
  return supabase
    .from('prompt_responses')
    .select(
      `
      id, message, created_at,
      author:profiles!prompt_responses_user_id_fkey (id, chosen_name),
      prompt:profile_prompts!prompt_responses_profile_prompt_id_fkey (
        id, answer,
        template:prompt_templates (question)
      )
    `
    )
    .eq('profile_prompts.dating_profile_id', datingProfileId)
    .eq('is_approved', false)
    .order('created_at', { ascending: false });
}
