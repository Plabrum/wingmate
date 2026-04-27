import type { WingProfile } from './schemas.ts';

export type WingPoolRow = {
  profile_id: string;
  user_id: string;
  chosen_name: string;
  gender: WingProfile['gender'];
  age: number;
  city: WingProfile['city'];
  bio: string | null;
  dating_status: WingProfile['datingStatus'];
  interests: WingProfile['interests'];
  first_photo: string | null;
};

export function rowToWingProfile(row: WingPoolRow): WingProfile {
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
  };
}
