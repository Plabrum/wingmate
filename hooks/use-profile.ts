import { useSuspenseQueries, type QueryClient } from '@tanstack/react-query';
import type { Enums } from '@/types/database';
import {
  getApiDatingProfilesMe,
  getApiProfilesMe,
  getApiProfilesUserId,
  getGetApiDatingProfilesMeQueryKey,
  getGetApiProfilesMeQueryKey,
  getGetApiProfilesUserIdQueryKey,
  patchApiDatingProfilesMe,
  patchApiProfilesMe,
  postApiDatingProfiles,
} from '@/lib/api/generated/profiles/profiles';
import type {
  CreateDatingProfileRequest,
  OwnDatingProfileResponse,
  OwnProfilePhoto as ApiOwnProfilePhoto,
  OwnProfilePrompt as ApiOwnProfilePrompt,
  OwnPromptResponse as ApiOwnPromptResponse,
  Profile as ApiProfile,
  PublicDatingProfile,
  PublicProfile,
  PublicProfilePhoto,
  PublicProfilePrompt,
  UpdateDatingProfileRequest,
  UpdateProfileRequest,
} from '@/lib/api/generated/model';

// ── Legacy snake_case row shapes (matches the old PostgREST nested select) ───

type SnakePhotoSuggester = { id: string; chosen_name: string | null } | null;

export type SnakeOwnPhoto = {
  id: string;
  storage_url: string;
  display_order: number;
  approved_at: string | null;
  suggester_id: string | null;
  suggester: SnakePhotoSuggester;
};

type SnakeResponseAuthor = {
  id: string;
  chosen_name: string | null;
  avatar_url: string | null;
} | null;

export type SnakePromptResponse = {
  id: string;
  message: string;
  is_approved: boolean;
  user_id: string;
  created_at: string;
  author: SnakeResponseAuthor;
};

export type SnakeOwnPrompt = {
  id: string;
  answer: string;
  created_at: string;
  template: { id: string; question: string };
  responses: SnakePromptResponse[];
};

export type OwnDatingProfile = {
  id: string;
  user_id: string;
  bio: string | null;
  city: Enums<'city'>;
  interested_gender: Enums<'gender'>[];
  age_from: number;
  age_to: number | null;
  religion: Enums<'religion'>;
  religious_preference: Enums<'religion'> | null;
  interests: Enums<'interest'>[];
  is_active: boolean;
  dating_status: Enums<'dating_status'>;
  created_at: string;
  updated_at: string;
  photos: SnakeOwnPhoto[];
  prompts: SnakeOwnPrompt[];
};

export type SnakePublicPhoto = {
  id: string;
  storage_url: string;
  display_order: number;
  approved_at: string | null;
  suggester_id: string | null;
};

export type SnakePublicPrompt = {
  id: string;
  answer: string;
  created_at: string;
  template: { id: string; question: string };
};

export type DaterProfile = {
  id: string;
  user: { id: string; chosen_name: string | null };
  photos: SnakePublicPhoto[];
  prompts: SnakePublicPrompt[];
};

export type SnakeProfileRow = {
  id: string;
  chosen_name: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  date_of_birth: string | null;
  gender: Enums<'gender'> | null;
  role: Enums<'user_role'>;
  push_token: string | null;
};

export type ProfileData = {
  profile: SnakeProfileRow | null;
  datingProfile: OwnDatingProfile | null;
};

// ── Camel → snake transformers ───────────────────────────────────────────────

function toSnakeProfile(p: ApiProfile): SnakeProfileRow {
  return {
    id: p.id,
    chosen_name: p.chosenName,
    avatar_url: p.avatarUrl,
    phone_number: p.phoneNumber,
    date_of_birth: p.dateOfBirth,
    gender: p.gender,
    role: p.role,
    push_token: p.pushToken,
  };
}

function toSnakePhoto(p: ApiOwnProfilePhoto): SnakeOwnPhoto {
  return {
    id: p.id,
    storage_url: p.storageUrl,
    display_order: p.displayOrder,
    approved_at: p.approvedAt,
    suggester_id: p.suggesterId,
    suggester: p.suggester ? { id: p.suggester.id, chosen_name: p.suggester.chosenName } : null,
  };
}

function toSnakeResponse(r: ApiOwnPromptResponse): SnakePromptResponse {
  return {
    id: r.id,
    message: r.message,
    is_approved: r.isApproved,
    user_id: r.userId,
    created_at: r.createdAt,
    author: r.author
      ? {
          id: r.author.id,
          chosen_name: r.author.chosenName,
          avatar_url: r.author.avatarUrl,
        }
      : null,
  };
}

function toSnakePrompt(p: ApiOwnProfilePrompt): SnakeOwnPrompt {
  return {
    id: p.id,
    answer: p.answer,
    created_at: p.createdAt,
    template: { id: p.template.id, question: p.template.question },
    responses: p.responses.map(toSnakeResponse),
  };
}

function toSnakeDatingProfile(d: NonNullable<OwnDatingProfileResponse>): OwnDatingProfile {
  return {
    id: d.id,
    user_id: d.userId,
    bio: d.bio,
    city: d.city,
    interested_gender: d.interestedGender,
    age_from: d.ageFrom,
    age_to: d.ageTo,
    religion: d.religion,
    religious_preference: d.religiousPreference,
    interests: d.interests,
    is_active: d.isActive,
    dating_status: d.datingStatus,
    created_at: d.createdAt,
    updated_at: d.updatedAt,
    photos: d.photos.map(toSnakePhoto),
    prompts: d.prompts.map(toSnakePrompt),
  };
}

function toSnakePublicPhoto(p: PublicProfilePhoto): SnakePublicPhoto {
  return {
    id: p.id,
    storage_url: p.storageUrl,
    display_order: p.displayOrder,
    approved_at: p.approvedAt,
    suggester_id: p.suggesterId,
  };
}

function toSnakePublicPrompt(p: PublicProfilePrompt): SnakePublicPrompt {
  return {
    id: p.id,
    answer: p.answer,
    created_at: p.createdAt,
    template: { id: p.template.id, question: p.template.question },
  };
}

function toDaterProfile(pp: PublicProfile): DaterProfile | null {
  const dp: PublicDatingProfile | null = pp.datingProfile;
  if (!dp) return null;
  return {
    id: dp.id,
    user: { id: pp.id, chosen_name: pp.chosenName },
    photos: dp.photos.map(toSnakePublicPhoto),
    prompts: dp.prompts.map(toSnakePublicPrompt),
  };
}

// ── Suspense hooks ───────────────────────────────────────────────────────────

export function useProfileData(_userId: string) {
  const queries = useSuspenseQueries({
    queries: [
      {
        queryKey: getGetApiProfilesMeQueryKey(),
        queryFn: ({ signal }: { signal?: AbortSignal }) => getApiProfilesMe({ signal }),
      },
      {
        queryKey: getGetApiDatingProfilesMeQueryKey(),
        queryFn: ({ signal }: { signal?: AbortSignal }) => getApiDatingProfilesMe({ signal }),
      },
    ],
  });

  const profileRes = queries[0];
  const datingRes = queries[1];

  const data: ProfileData = {
    profile: toSnakeProfile(profileRes.data),
    datingProfile: datingRes.data ? toSnakeDatingProfile(datingRes.data) : null,
  };

  async function refetch() {
    const [p, d] = await Promise.all([profileRes.refetch(), datingRes.refetch()]);
    const next: ProfileData = {
      profile: p.data ? toSnakeProfile(p.data) : null,
      datingProfile: d.data ? toSnakeDatingProfile(d.data) : null,
    };
    return { data: next };
  }

  return { data, refetch };
}

export function useDaterContext(daterId: string) {
  const [res] = useSuspenseQueries({
    queries: [
      {
        queryKey: getGetApiProfilesUserIdQueryKey(daterId),
        queryFn: ({ signal }: { signal?: AbortSignal }) =>
          getApiProfilesUserId(daterId, { signal }),
        staleTime: 5 * 60_000,
      },
    ],
  });
  return { data: { chosen_name: res.data.chosenName } };
}

export function useDaterProfile(daterId: string) {
  const [res] = useSuspenseQueries({
    queries: [
      {
        queryKey: getGetApiProfilesUserIdQueryKey(daterId),
        queryFn: ({ signal }: { signal?: AbortSignal }) =>
          getApiProfilesUserId(daterId, { signal }),
        staleTime: 2 * 60_000,
      },
    ],
  });
  return { data: toDaterProfile(res.data) };
}

// ── Cache key helpers ────────────────────────────────────────────────────────

export function profileQueryKeys() {
  return [getGetApiProfilesMeQueryKey(), getGetApiDatingProfilesMeQueryKey()] as const;
}

export function daterProfileQueryKey(daterId: string) {
  return getGetApiProfilesUserIdQueryKey(daterId);
}

export function invalidateProfile(queryClient: QueryClient) {
  for (const key of profileQueryKeys()) {
    queryClient.invalidateQueries({ queryKey: key });
  }
}

// ── Mutations ────────────────────────────────────────────────────────────────

export type UpdateBaseProfileFields = {
  chosen_name?: string;
  date_of_birth?: string | null;
  phone_number?: string | null;
  gender?: Enums<'gender'> | null;
  role?: Enums<'user_role'>;
  push_token?: string | null;
  avatar_url?: string | null;
};

function snakeToCamelProfile(fields: UpdateBaseProfileFields): UpdateProfileRequest {
  const out: UpdateProfileRequest = {};
  if (fields.chosen_name !== undefined) out.chosenName = fields.chosen_name;
  if (fields.date_of_birth !== undefined) out.dateOfBirth = fields.date_of_birth;
  if (fields.phone_number !== undefined) out.phoneNumber = fields.phone_number;
  if (fields.gender !== undefined) out.gender = fields.gender;
  if (fields.role !== undefined) out.role = fields.role;
  if (fields.push_token !== undefined) out.pushToken = fields.push_token;
  if (fields.avatar_url !== undefined) out.avatarUrl = fields.avatar_url;
  return out;
}

export async function updateBaseProfile(
  _userId: string,
  fields: UpdateBaseProfileFields
): Promise<{ error: Error | null }> {
  try {
    await patchApiProfilesMe(snakeToCamelProfile(fields));
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function updatePushToken(_userId: string, token: string) {
  await patchApiProfilesMe({ pushToken: token });
}

export type CreateDatingProfileFields = {
  user_id: string;
  city: Enums<'city'>;
  bio?: string;
  age_from: number;
  age_to?: number | null;
  interested_gender: Enums<'gender'>[];
  religion: Enums<'religion'>;
  religious_preference?: Enums<'religion'> | null;
  interests: Enums<'interest'>[];
  dating_status?: Enums<'dating_status'>;
};

export async function createDatingProfile(
  fields: CreateDatingProfileFields
): Promise<{ data: { id: string } | null; error: Error | null }> {
  try {
    const body: CreateDatingProfileRequest = {
      city: fields.city,
      bio: fields.bio,
      ageFrom: fields.age_from,
      ageTo: fields.age_to,
      interestedGender: fields.interested_gender,
      religion: fields.religion,
      religiousPreference: fields.religious_preference,
      interests: fields.interests,
      datingStatus: fields.dating_status,
    };
    const res = await postApiDatingProfiles(body);
    return { data: { id: res.id }, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export type UpdateDatingProfileFields = {
  bio?: string | null;
  city?: Enums<'city'>;
  age_from?: number;
  age_to?: number | null;
  interested_gender?: Enums<'gender'>[];
  religion?: Enums<'religion'>;
  religious_preference?: Enums<'religion'> | null;
  interests?: Enums<'interest'>[];
  dating_status?: Enums<'dating_status'>;
  is_active?: boolean;
};

export async function updateDatingProfile(
  _userId: string,
  fields: UpdateDatingProfileFields
): Promise<{ error: Error | null }> {
  try {
    const body: UpdateDatingProfileRequest = {};
    if (fields.bio !== undefined) body.bio = fields.bio;
    if (fields.city !== undefined) body.city = fields.city;
    if (fields.age_from !== undefined) body.ageFrom = fields.age_from;
    if (fields.age_to !== undefined) body.ageTo = fields.age_to;
    if (fields.interested_gender !== undefined) body.interestedGender = fields.interested_gender;
    if (fields.religion !== undefined) body.religion = fields.religion;
    if (fields.religious_preference !== undefined)
      body.religiousPreference = fields.religious_preference;
    if (fields.interests !== undefined) body.interests = fields.interests;
    if (fields.dating_status !== undefined) body.datingStatus = fields.dating_status;
    if (fields.is_active !== undefined) body.isActive = fields.is_active;

    await patchApiDatingProfilesMe(body);
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}

// Imperative read for callers that need an off-cycle refresh (e.g. PhotosStep).
export async function getOwnDatingProfileSnapshot(): Promise<{
  data: OwnDatingProfile | null;
  error: Error | null;
}> {
  try {
    const res = await getApiDatingProfilesMe();
    return { data: res ? toSnakeDatingProfile(res) : null, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}
