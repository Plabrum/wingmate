import type { Photo } from './schemas.ts';

export type PhotoRow = {
  id: string;
  dating_profile_id: string;
  storage_url: string;
  display_order: number;
  approved_at: string | null;
  suggester_id: string | null;
  suggester_name: string | null;
};

export function rowToPhoto(row: PhotoRow): Photo {
  return {
    id: row.id,
    datingProfileId: row.dating_profile_id,
    storageUrl: row.storage_url,
    displayOrder: row.display_order,
    approvedAt: row.approved_at,
    suggesterId: row.suggester_id,
    suggester:
      row.suggester_id != null
        ? { id: row.suggester_id, chosenName: row.suggester_name }
        : null,
  };
}
