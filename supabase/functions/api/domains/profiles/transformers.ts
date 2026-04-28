import type {
  OwnDatingProfile,
  OwnProfilePhoto,
  OwnProfilePrompt,
  Profile,
  PublicProfile,
} from './schemas.ts';
import type {
  OwnDatingProfileBundle,
  PhotoRow,
  ProfileRow,
  PromptRow,
  PublicProfileBundle,
  ResponseRow,
} from './queries.ts';

export function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    chosenName: row.chosen_name,
    avatarUrl: row.avatar_url,
    phoneNumber: row.phone_number,
    dateOfBirth: row.date_of_birth,
    gender: row.gender as Profile['gender'],
    role: row.role as Profile['role'],
    pushToken: row.push_token,
  };
}

function rowToOwnPhoto(row: PhotoRow): OwnProfilePhoto {
  return {
    id: row.id,
    storageUrl: row.storage_url,
    displayOrder: row.display_order,
    approvedAt: row.approved_at,
    suggesterId: row.suggester_id,
    suggester: row.suggester_id
      ? { id: row.suggester_id, chosenName: row.suggester_name }
      : null,
  };
}

function rowsToOwnPrompts(prompts: PromptRow[], responses: ResponseRow[]): OwnProfilePrompt[] {
  const byPrompt = new Map<string, ResponseRow[]>();
  for (const r of responses) {
    const list = byPrompt.get(r.profile_prompt_id) ?? [];
    list.push(r);
    byPrompt.set(r.profile_prompt_id, list);
  }
  return prompts.map((p) => ({
    id: p.id,
    answer: p.answer,
    createdAt: p.created_at,
    template: { id: p.template_id, question: p.template_question },
    responses: (byPrompt.get(p.id) ?? []).map((r) => ({
      id: r.id,
      message: r.message,
      isApproved: r.is_approved,
      userId: r.user_id,
      createdAt: r.created_at,
      author: r.author_id
        ? {
            id: r.author_id,
            chosenName: r.author_name,
            avatarUrl: r.author_avatar_url,
          }
        : null,
    })),
  }));
}

function computeRipeness(
  photos: OwnProfilePhoto[],
  prompts: OwnProfilePrompt[],
  bio: string | null,
  interests: string[],
  city: string,
): number {
  const approvedPhotos = photos.filter((p) => p.approvedAt !== null);
  const photoScore = Math.min(approvedPhotos.length / 6, 1) * 30;
  const promptScore = Math.min(prompts.length / 3, 1) * 25;
  const bioScore = bio ? 20 : 0;
  const interestScore = interests.length > 0 ? 15 : 0;
  const cityScore = city ? 10 : 0;
  return Math.round(photoScore + promptScore + bioScore + interestScore + cityScore);
}

export function bundleToOwnDatingProfile(bundle: OwnDatingProfileBundle): OwnDatingProfile {
  const { base, photos, prompts, responses } = bundle;
  const mappedPhotos = photos.map(rowToOwnPhoto);
  const mappedPrompts = rowsToOwnPrompts(prompts, responses);
  return {
    id: base.id,
    userId: base.user_id,
    bio: base.bio,
    city: base.city as OwnDatingProfile['city'],
    interestedGender: base.interested_gender as OwnDatingProfile['interestedGender'],
    ageFrom: base.age_from,
    ageTo: base.age_to,
    religion: base.religion as OwnDatingProfile['religion'],
    religiousPreference: base.religious_preference as OwnDatingProfile['religiousPreference'],
    interests: base.interests as OwnDatingProfile['interests'],
    isActive: base.is_active,
    datingStatus: base.dating_status as OwnDatingProfile['datingStatus'],
    createdAt: base.created_at,
    updatedAt: base.updated_at,
    photos: mappedPhotos,
    prompts: mappedPrompts,
    ripeness: computeRipeness(mappedPhotos, mappedPrompts, base.bio, base.interests, base.city ?? ''),
  };
}

export function bundleToPublicProfile(bundle: PublicProfileBundle): PublicProfile {
  const { profile, base, photos, prompts } = bundle;
  return {
    id: profile.id,
    chosenName: profile.chosen_name,
    avatarUrl: profile.avatar_url,
    datingProfile: base
      ? {
          id: base.id,
          bio: base.bio,
          city: base.city as OwnDatingProfile['city'],
          interests: base.interests as OwnDatingProfile['interests'],
          religion: base.religion as OwnDatingProfile['religion'],
          photos: photos.map((p) => ({
            id: p.id,
            storageUrl: p.storage_url,
            displayOrder: p.display_order,
            approvedAt: p.approved_at,
            suggesterId: p.suggester_id,
          })),
          prompts: prompts.map((p) => ({
            id: p.id,
            answer: p.answer,
            createdAt: p.created_at,
            template: { id: p.template_id, question: p.template_question },
          })),
        }
      : null,
  };
}
