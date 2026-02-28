import { supabase } from '@/lib/supabase';

// ── Reading the wingperson roster ─────────────────────────────────────────────

/**
 * "Your Wingpeople" — people actively winging for the current dater.
 * Includes their profile so the UI can show name, initials, etc.
 */
export function getMyWingpeople(daterId: string) {
  return supabase
    .from('contacts')
    .select(
      `
      id, created_at,
      winger:profiles!contacts_winger_id_fkey (id, chosen_name, gender)
    `
    )
    .eq('user_id', daterId)
    .eq('wingperson_status', 'active')
    .order('created_at', { ascending: true });
}

export type Wingperson = NonNullable<
  Awaited<ReturnType<typeof getMyWingpeople>>['data']
>[number];

/**
 * "Pending invitations" — contacts where the current user IS the invitee
 * (winger_id = me) but hasn't accepted yet.
 * Shown on the Wingpeople screen so they can accept/decline.
 */
export function getIncomingInvitations(wingerId: string) {
  return supabase
    .from('contacts')
    .select(
      `
      id, created_at,
      dater:profiles!contacts_user_id_fkey (id, chosen_name)
    `
    )
    .eq('winger_id', wingerId)
    .eq('wingperson_status', 'invited')
    .order('created_at', { ascending: false });
}

export type IncomingInvitation = NonNullable<
  Awaited<ReturnType<typeof getIncomingInvitations>>['data']
>[number];

/**
 * "You're winging for" — daters the current user is actively supporting.
 * Includes the dater's interests so WingSwipe can show the callout box.
 */
export function getWingingFor(wingerId: string) {
  return supabase
    .from('contacts')
    .select(
      `
      id, created_at,
      dater:profiles!contacts_user_id_fkey (
        id, chosen_name,
        dating_profiles (interests, bio)
      )
    `
    )
    .eq('winger_id', wingerId)
    .eq('wingperson_status', 'active')
    .order('created_at', { ascending: true });
}

export type WingingFor = NonNullable<
  Awaited<ReturnType<typeof getWingingFor>>['data']
>[number];

// ── Activity counts ───────────────────────────────────────────────────────────

/**
 * How many times a specific winger has suggested profiles for a dater
 * in the last 7 days. Shown as "N picks this week" in the Wingpeople list.
 */
export async function getWingerWeeklyCount(wingerId: string, daterId: string) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from('decisions')
    .select('id', { count: 'exact', head: true })
    .eq('suggested_by', wingerId)
    .eq('actor_id', daterId)
    .gte('created_at', since);
  return { count: count ?? 0, error };
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Dater invites someone by phone number.
 * The trg_auto_link_winger trigger will set winger_id automatically
 * when the invitee creates their account and sets their phone number.
 */
export function inviteWingperson(daterId: string, phoneNumber: string) {
  return supabase.from('contacts').insert({
    user_id: daterId,
    phone_number: phoneNumber,
    wingperson_status: 'invited',
  });
}

/**
 * Invitee accepts: set themselves as the winger and activate the relationship.
 * The contacts row already has their winger_id from the auto-link trigger,
 * so we just need to update the status.
 */
export function acceptInvitation(contactId: string, wingerId: string) {
  return supabase
    .from('contacts')
    .update({ wingperson_status: 'active' })
    .eq('id', contactId)
    .eq('winger_id', wingerId); // RLS guard
}

/** Invitee declines. */
export function declineInvitation(contactId: string, wingerId: string) {
  return supabase
    .from('contacts')
    .update({ wingperson_status: 'removed' })
    .eq('id', contactId)
    .eq('winger_id', wingerId);
}

/** Dater removes a wingperson from their roster. */
export function removeWingperson(contactId: string, daterId: string) {
  return supabase
    .from('contacts')
    .update({ wingperson_status: 'removed' })
    .eq('id', contactId)
    .eq('user_id', daterId);
}
