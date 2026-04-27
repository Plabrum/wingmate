import type { WingerTab } from './schemas.ts';

export type WingerTabRow = {
  id: string;
  chosen_name: string;
  created_at: string;
};

export function rowsToWingerTabs(rows: WingerTabRow[]): WingerTab[] {
  const seen = new Set<string>();
  const tabs: WingerTab[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    tabs.push({ id: row.id, name: row.chosen_name });
  }
  return tabs;
}
