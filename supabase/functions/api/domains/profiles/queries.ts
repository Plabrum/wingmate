import { asc, eq, inArray } from 'drizzle-orm';
import type { DBOrTx } from '../../db/client.ts';
import {
  datingProfiles,
  profilePhotos,
  profilePrompts,
  profiles,
  promptResponses,
  promptTemplates,
} from '../../db/schema.ts';

// ── Base profile ─────────────────────────────────────────────────────────────

export type ProfileRow = {
  id: string;
  chosen_name: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  date_of_birth: string | null;
  gender: string | null;
  role: string;
  push_token: string | null;
};

export async function fetchOwnProfile(db: DBOrTx, userId: string): Promise<ProfileRow | null> {
  const [row] = await db
    .select({
      id: profiles.id,
      chosen_name: profiles.chosenName,
      avatar_url: profiles.avatarUrl,
      phone_number: profiles.phoneNumber,
      date_of_birth: profiles.dateOfBirth,
      gender: profiles.gender,
      role: profiles.role,
      push_token: profiles.pushToken,
    })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return row ?? null;
}

export type UpdateProfileFields = {
  chosenName?: string;
  dateOfBirth?: string | null;
  phoneNumber?: string | null;
  gender?: string | null;
  role?: string;
  pushToken?: string | null;
  avatarUrl?: string | null;
};

export async function updateOwnProfile(
  db: DBOrTx,
  userId: string,
  fields: UpdateProfileFields,
): Promise<ProfileRow | null> {
  const set: Record<string, unknown> = {};
  if (fields.chosenName !== undefined) set.chosenName = fields.chosenName;
  if (fields.dateOfBirth !== undefined) set.dateOfBirth = fields.dateOfBirth;
  if (fields.phoneNumber !== undefined) set.phoneNumber = fields.phoneNumber;
  if (fields.gender !== undefined) set.gender = fields.gender;
  if (fields.role !== undefined) set.role = fields.role;
  if (fields.pushToken !== undefined) set.pushToken = fields.pushToken;
  if (fields.avatarUrl !== undefined) set.avatarUrl = fields.avatarUrl;

  if (Object.keys(set).length === 0) {
    return fetchOwnProfile(db, userId);
  }

  const [row] = await db
    .update(profiles)
    .set(set)
    .where(eq(profiles.id, userId))
    .returning({
      id: profiles.id,
      chosen_name: profiles.chosenName,
      avatar_url: profiles.avatarUrl,
      phone_number: profiles.phoneNumber,
      date_of_birth: profiles.dateOfBirth,
      gender: profiles.gender,
      role: profiles.role,
      push_token: profiles.pushToken,
    });
  return row ?? null;
}

// ── Dating profile ───────────────────────────────────────────────────────────

export type DatingProfileBaseRow = {
  id: string;
  user_id: string;
  bio: string | null;
  city: string;
  interested_gender: string[];
  age_from: number;
  age_to: number | null;
  religion: string;
  religious_preference: string | null;
  interests: string[];
  is_active: boolean;
  dating_status: string;
  created_at: string;
  updated_at: string;
};

export type PhotoRow = {
  id: string;
  dating_profile_id: string;
  storage_url: string;
  display_order: number;
  approved_at: string | null;
  suggester_id: string | null;
  suggester_name: string | null;
};

export type PromptRow = {
  id: string;
  dating_profile_id: string;
  answer: string;
  created_at: string;
  template_id: string;
  template_question: string;
};

export type ResponseRow = {
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

async function fetchDatingProfileBase(
  db: DBOrTx,
  userId: string,
): Promise<DatingProfileBaseRow | null> {
  const [row] = await db
    .select({
      id: datingProfiles.id,
      user_id: datingProfiles.userId,
      bio: datingProfiles.bio,
      city: datingProfiles.city,
      interested_gender: datingProfiles.interestedGender,
      age_from: datingProfiles.ageFrom,
      age_to: datingProfiles.ageTo,
      religion: datingProfiles.religion,
      religious_preference: datingProfiles.religiousPreference,
      interests: datingProfiles.interests,
      is_active: datingProfiles.isActive,
      dating_status: datingProfiles.datingStatus,
      created_at: datingProfiles.createdAt,
      updated_at: datingProfiles.updatedAt,
    })
    .from(datingProfiles)
    .where(eq(datingProfiles.userId, userId))
    .limit(1);
  return (row as DatingProfileBaseRow | undefined) ?? null;
}

async function fetchPhotosForDatingProfile(
  db: DBOrTx,
  datingProfileId: string,
): Promise<PhotoRow[]> {
  const rows = await db
    .select({
      id: profilePhotos.id,
      dating_profile_id: profilePhotos.datingProfileId,
      storage_url: profilePhotos.storageUrl,
      display_order: profilePhotos.displayOrder,
      approved_at: profilePhotos.approvedAt,
      suggester_id: profilePhotos.suggesterId,
      suggester_name: profiles.chosenName,
    })
    .from(profilePhotos)
    .leftJoin(profiles, eq(profiles.id, profilePhotos.suggesterId))
    .where(eq(profilePhotos.datingProfileId, datingProfileId))
    .orderBy(asc(profilePhotos.displayOrder));
  return rows as PhotoRow[];
}

async function fetchPromptsForDatingProfile(
  db: DBOrTx,
  datingProfileId: string,
): Promise<PromptRow[]> {
  const rows = await db
    .select({
      id: profilePrompts.id,
      dating_profile_id: profilePrompts.datingProfileId,
      answer: profilePrompts.answer,
      created_at: profilePrompts.createdAt,
      template_id: promptTemplates.id,
      template_question: promptTemplates.question,
    })
    .from(profilePrompts)
    .innerJoin(promptTemplates, eq(promptTemplates.id, profilePrompts.promptTemplateId))
    .where(eq(profilePrompts.datingProfileId, datingProfileId))
    .orderBy(asc(profilePrompts.createdAt));
  return rows as PromptRow[];
}

async function fetchResponsesForPrompts(
  db: DBOrTx,
  promptIds: string[],
): Promise<ResponseRow[]> {
  if (promptIds.length === 0) return [];
  const rows = await db
    .select({
      id: promptResponses.id,
      profile_prompt_id: promptResponses.profilePromptId,
      message: promptResponses.message,
      is_approved: promptResponses.isApproved,
      user_id: promptResponses.userId,
      created_at: promptResponses.createdAt,
      author_id: profiles.id,
      author_name: profiles.chosenName,
      author_avatar_url: profiles.avatarUrl,
    })
    .from(promptResponses)
    .leftJoin(profiles, eq(profiles.id, promptResponses.userId))
    .where(inArray(promptResponses.profilePromptId, promptIds))
    .orderBy(asc(promptResponses.createdAt));
  return rows as ResponseRow[];
}

export type OwnDatingProfileBundle = {
  base: DatingProfileBaseRow;
  photos: PhotoRow[];
  prompts: PromptRow[];
  responses: ResponseRow[];
};

export async function fetchOwnDatingProfile(
  db: DBOrTx,
  userId: string,
): Promise<OwnDatingProfileBundle | null> {
  const base = await fetchDatingProfileBase(db, userId);
  if (!base) return null;
  const [photos, prompts] = await Promise.all([
    fetchPhotosForDatingProfile(db, base.id),
    fetchPromptsForDatingProfile(db, base.id),
  ]);
  const responses = await fetchResponsesForPrompts(
    db,
    prompts.map((p) => p.id),
  );
  return { base, photos, prompts, responses };
}

export type CreateDatingProfileFields = Omit<
  typeof datingProfiles.$inferInsert,
  'id' | 'userId' | 'isActive' | 'createdAt' | 'updatedAt'
>;

export async function insertDatingProfile(
  db: DBOrTx,
  userId: string,
  fields: CreateDatingProfileFields,
): Promise<{ id: string }> {
  const [row] = await db
    .insert(datingProfiles)
    .values({
      userId,
      city: fields.city,
      bio: fields.bio ?? null,
      ageFrom: fields.ageFrom,
      ageTo: fields.ageTo ?? null,
      interestedGender: fields.interestedGender,
      religion: fields.religion,
      religiousPreference: fields.religiousPreference ?? null,
      interests: fields.interests,
      datingStatus: fields.datingStatus ?? 'open',
    })
    .returning({ id: datingProfiles.id });
  return row;
}

export type UpdateDatingProfileFields = Partial<
  Omit<typeof datingProfiles.$inferInsert, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
>;

export async function updateOwnDatingProfile(
  db: DBOrTx,
  userId: string,
  fields: UpdateDatingProfileFields,
): Promise<{ updated: boolean }> {
  const set: Record<string, unknown> = {};
  if (fields.bio !== undefined) set.bio = fields.bio;
  if (fields.city !== undefined) set.city = fields.city;
  if (fields.ageFrom !== undefined) set.ageFrom = fields.ageFrom;
  if (fields.ageTo !== undefined) set.ageTo = fields.ageTo;
  if (fields.interestedGender !== undefined) set.interestedGender = fields.interestedGender;
  if (fields.religion !== undefined) set.religion = fields.religion;
  if (fields.religiousPreference !== undefined)
    set.religiousPreference = fields.religiousPreference;
  if (fields.interests !== undefined) set.interests = fields.interests;
  if (fields.datingStatus !== undefined) set.datingStatus = fields.datingStatus;
  if (fields.isActive !== undefined) set.isActive = fields.isActive;

  if (Object.keys(set).length === 0) return { updated: false };

  set.updatedAt = new Date().toISOString();

  const rows = await db
    .update(datingProfiles)
    .set(set)
    .where(eq(datingProfiles.userId, userId))
    .returning({ id: datingProfiles.id });
  return { updated: rows.length > 0 };
}

// ── Public profile (any authenticated user can view) ─────────────────────────

export type PublicProfileBundle = {
  profile: { id: string; chosen_name: string | null; avatar_url: string | null };
  base: DatingProfileBaseRow | null;
  photos: PhotoRow[];
  prompts: PromptRow[];
};

export async function fetchPublicProfile(
  db: DBOrTx,
  userId: string,
): Promise<PublicProfileBundle | null> {
  const [profile] = await db
    .select({
      id: profiles.id,
      chosen_name: profiles.chosenName,
      avatar_url: profiles.avatarUrl,
    })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  if (!profile) return null;

  const base = await fetchDatingProfileBase(db, userId);
  if (!base) {
    return { profile, base: null, photos: [], prompts: [] };
  }

  const [photos, prompts] = await Promise.all([
    fetchPhotosForDatingProfile(db, base.id),
    fetchPromptsForDatingProfile(db, base.id),
  ]);
  return { profile, base, photos, prompts };
}

