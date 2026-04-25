import type { LikesYouProfile } from './schemas.ts';

export type LikesYouRow = {
  profile_id: string;
  user_id: string;
  chosen_name: string;
  gender: LikesYouProfile['gender'];
  age: number;
  city: LikesYouProfile['city'];
  bio: string | null;
  dating_status: LikesYouProfile['datingStatus'];
  interests: LikesYouProfile['interests'];
  first_photo: string | null;
  wing_note: string | null;
  suggested_by: string | null;
  suggester_name: string | null;
};

export function rowToLikesYouProfile(row: LikesYouRow): LikesYouProfile {
  return {
    profileId: row.profile_id,
    userId: row.user_id,
    chosenName: row.chosen_name,
    gender: row.gender,
    age: row.age,
    city: row.city,
    bio: row.bio,
    datingStatus: row.dating_status,
    interests: row.interests,
    firstPhoto: row.first_photo,
    wingNote: row.wing_note,
    suggestedBy: row.suggested_by,
    suggesterName: row.suggester_name,
  };
}
