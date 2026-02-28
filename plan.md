# Wingmate — Phased Build Plan

## Current State

| What | Status |
|---|---|
| SMS OTP auth (`/(auth)/sms.tsx`) | ✅ Done |
| Login screen with Apple + SMS | ✅ Done |
| Auth context (`context/auth.tsx`) | ✅ Done |
| Supabase client + types scaffold | ✅ Done |
| DB migration (schema + RLS + triggers + RPCs) | ✅ Ready — **not yet deployed** |
| Tab layout (placeholder tabs) | ✅ Shell only |
| All app screens | ❌ Not started |

---

## Definition of Done (every phase)

Every screen shipped in any phase must include:

- **Empty state** — designed, not a blank screen. Copy matches the prototype tone.
- **Error handling** — every async call in a `try/catch`; surface errors as an inline toast or inline message (not a crash).
- **Loading state** — skeleton loaders or activity indicator while data fetches. Never a blank flash.
- **Optimistic updates** — like/pass, send message, approve/reject: update local state immediately, roll back on error.
- **Keyboard handling** — `KeyboardAvoidingView` on any screen with a text input.

These are not polish. They are part of building the screen.

---

## Design Tokens (apply before Phase 2)

Extract into `constants/theme.ts`:

```ts
export const colors = {
  ink: '#18181C',       inkMid: '#52525E',
  inkDim: '#8C8C9E',    inkGhost: '#BBBBC8',
  canvas: '#F7F6F3',    white: '#FFFFFF',
  purple: '#6654D9',    purplePale: '#EEEAFF',
  purpleSoft: '#D9D4FF',green: '#22C55E',
  divider: '#EBEBF0',   muted: '#F1F0EE',
  lavender: '#E9E6FF',  // sent message bubble
};
```

Typography: Georgia for large headers (serif), SF Pro / system-ui for all body text.

---

## Shared Components (build before Phase 2)

All in `components/ui/`. Derived 1-to-1 from the prototype:

| Component | Key props | Used in |
|---|---|---|
| `Pill` | `label` | Profile interests, match sheet |
| `WingStack` | `initials: string[]`, `size?` | Discover card, Profile, Wingpeople |
| `PhotoRect` | `uri: string \| null`, `ratio?`, `blur?` | Discover, Matches, Profile |
| `FaceAvatar` | `initials`, `bg`, `size?` | Wingpeople, Messages list |
| `LargeHeader` | `title`, `right?` | Discover, Matches, Messages |
| `NavHeader` | `back`, `onBack`, `title`, `sub?`, `right?` | Chat, Wingpeople, WingSwipe |
| `TextTabBar` | `tabs: string[]`, `active`, `setActive` | Discover filter, Profile tabs |
| `PurpleButton` | `label`, `onPress`, `outline?` | Throughout |

---

## File Structure (target)

```
app/
  (auth)/
    login.tsx               ✅ exists
    sms.tsx                 ✅ exists
  (onboarding)/             Phase 1
    _layout.tsx
    role.tsx
    profile.tsx
    photos.tsx              daters only
    prompts.tsx             daters only
  (tabs)/
    _layout.tsx             Phase 1 (restructure to 4 tabs)
    discover.tsx            Phase 4
    matches.tsx             Phase 5
    messages/
      index.tsx             Phase 6
      [matchId].tsx         Phase 6
    profile/
      index.tsx             Phase 2
      edit.tsx              Phase 2
      wingpeople/
        index.tsx           Phase 3
        wingswipe.tsx       Phase 7

queries/                    ✅ All written
  contacts.ts
  decisions.ts
  discover.ts
  matches.ts
  messages.ts
  photos.ts
  profiles.ts
  prompts.ts
  index.ts

context/
  auth.tsx                  ✅ exists
  profile.tsx               Phase 0 (new)

supabase/functions/
  send-wing-invite/         Phase 3
```

---

## Phase 0 — Infrastructure

**Goal:** DB live, types accurate, nav shell in final shape, profile context and push token registration wired.

### Tasks

**0.1 Deploy migration**
```bash
npm run supabase:link    # link CLI to project
npm run supabase:push    # push migration
npm run db:types         # regenerate types/database.ts
```

**0.2 `context/profile.tsx`** — new context wrapping AuthProvider.

```ts
type ProfileContextValue = {
  profile: ProfileRow | null;
  datingProfile: OwnDatingProfile | null;
  loadingProfile: boolean;
  refreshProfile: () => Promise<void>;
};
```

On mount: calls `getOwnProfile(userId)` + `getOwnDatingProfile(userId)`.
Refreshed after each onboarding step.

**0.3 Onboarding gate in `app/_layout.tsx`**

```
session?
  ├─ no  → /(auth)/login
  └─ yes → profile.chosen_name set?
             ├─ no  → /(onboarding)/role
             └─ yes → profile.role === 'winger'?
                        ├─ yes → /(tabs)/profile
                        └─ no  → /(tabs)/discover
```

**0.4 Restructure `(tabs)/_layout.tsx`**
- 4 tabs: Discover · Matches · Messages · Profile
- WingSwipe declared as `href: null` so it appears in the stack but hides the tab bar.

**0.5 Push token registration**
Register for push permissions and store the token on the profile immediately after auth.
This runs once in the background — the token is ready before push notifications are built in Phase 8.

```ts
// lib/push.ts
import * as Notifications from 'expo-notifications';

export async function registerPushToken(userId: string) {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
}
```

Add `push_token text` column to `profiles` in the migration (add now; used in Phase 8).

---

## Phase 1 — Onboarding

**Goal:** A first-time user goes from post-OTP to a seeded profile in ~4 screens.

### Screen: `(onboarding)/role.tsx`

Two tappable cards: "Looking for connections" (dater) / "Here to support friends" (winger).
On "Continue": navigate to `/profile` passing `role` as a param.
No DB write yet — role is written in the next step.

### Screen: `(onboarding)/profile.tsx`

Fields: chosen name · date of birth (date picker) · gender (picker: Male / Female / Non-Binary) · phone number (pre-filled if OTP was phone-based).
Daters also see: city picker · bio (optional, multiline).

**On submit:**
```ts
await updateBaseProfile(userId, { chosen_name, date_of_birth, phone_number, gender, role });
// trg_auto_link_winger fires if phone_number was previously null
```

- Dater → `/photos`
- Winger → `/(tabs)/profile`

### Screen: `(onboarding)/photos.tsx` *(daters only)*

Uses `expo-image-picker` → `expo-image-manipulator` (resize max 1200px, quality 0.8) → upload.

**Decision:** Create `dating_profiles` at the *start* of this screen (before the photo upload), so that skipping prompts still produces a complete profile row.

```ts
// On screen mount:
const { data: dp } = await createDatingProfile({
  user_id: userId, city, age_from: 18, interested_gender: [],
  religion: 'Prefer not to say', interests: [], dating_status: 'open',
});

// After image pick:
const { path } = await uploadPhoto(userId, blob, `${Date.now()}.jpg`);
await insertPhoto(dp.id, path, 0, null); // self-upload → approved immediately
```

Can skip. CTA: "Continue" → `/prompts`.

**Empty state:** "Add at least one photo so people can see you." (soft prompt, not a hard block).

### Screen: `(onboarding)/prompts.tsx` *(daters only)*

```ts
const { data: templates } = await getPromptTemplates();
// Show 5 random templates. User picks one, writes answer:
await addProfilePrompt(datingProfileId, templateId, answer);
```

Can skip. CTA: "Finish" → `/(tabs)/discover`.

---

## Phase 2 — Own Profile

**Goal:** Dater can view and fully edit their profile across 3 tabs. Every tab ships complete — including wingperson comment flows and photo approval.

### Hook: `hooks/use-own-profile.ts`

```ts
// Wraps getOwnDatingProfile(userId)
// Returns: { data: OwnDatingProfile | null, loading, refresh }
```

### Screen: `(tabs)/profile/index.tsx`

**About Me tab**
- Details list: city · religion · age range · dating_status.
- `dating_status` shown as a 3-option radio (Open to Dating / Taking a Break / Just Winging).
  - Toggling to `break` or `winging` hides the profile from Discover immediately (the `get_discover_pool` RPC already filters `dating_status = 'open'`).
  - Show a brief callout: "Your profile is hidden from Discover while you're on a break."
  ```ts
  await updateDatingProfile(userId, { dating_status: newStatus });
  ```
- Interests: `Pill` chips, tap "Edit" → `edit.tsx`.

**Photos tab**
```ts
const selfPhotos = data.photos.filter(p => p.suggester_id === null && p.approved_at !== null);
const pending    = data.photos.filter(p => p.suggester_id !== null && p.approved_at === null);
```
- Pending photos shown blurred with Approve / Reject buttons.
  - Approve: `approvePhoto(photoId)`
  - Reject: `rejectPhoto(photoId, storagePath)`
- Add photo: image picker → `uploadPhoto` → `insertPhoto`
- Reorder: drag handle → `reorderPhotos(updates)`
- **Empty state:** "No photos yet. Add one so people can see you."

**Prompts tab**

Owner side (approve/reject wingperson comments):
```ts
const pending = data.prompts[i].responses.filter(r => !r.is_approved);
// "1 wingperson comment" toggle — tapping reveals it:
await approvePromptResponse(responseId);  // makes it visible on the public card
await rejectPromptResponse(responseId);   // deletes it
```

Approved comments appear inline under the prompt answer, styled as in the prototype (avatar initial + comment bubble).

Add prompt: bottom sheet → `getPromptTemplates()` filtered to exclude already-used IDs → pick → `addProfilePrompt`.

**Empty state:** "No prompts yet. Add one to give people something to connect with."

**Wingpeople row**
- Shows `WingStack` of active winger initials + count badge.
- Taps to `/(tabs)/profile/wingpeople/`.

### Screen: `(tabs)/profile/edit.tsx`

```ts
await updateDatingProfile(userId, {
  bio, city, age_from, age_to,
  interested_gender, religion, religious_preference, interests,
});
```

---

## Phase 3 — Wingpeople

**Goal:** Daters invite wingpeople; wingpeople accept/decline; both sides see the full relationship. The invite SMS is built in this phase — the flow is incomplete without it.

### Screen: `(tabs)/profile/wingpeople/index.tsx`

**Section 1 — Your Wingpeople**
```ts
const { data: wingpeople } = await getMyWingpeople(userId);
const { count } = await getWingerWeeklyCount(w.winger.id, userId); // "N picks this week"
```
Max 5. Invite button hidden when roster is full.

**Empty state:** "No wingpeople yet. Invite a trusted friend to swipe for you."

**Section 2 — Invitations (incoming)**
```ts
const { data: invites } = await getIncomingInvitations(userId);
await acceptInvitation(contactId, userId);
await declineInvitation(contactId, userId);
```
**Empty state:** "No invitations right now." (matches prototype copy exactly)

**Section 3 — You're Winging For**
```ts
const { data: wingingFor } = await getWingingFor(userId);
```
"Swipe" button → `/(tabs)/profile/wingpeople/wingswipe?daterId=X`.

**Empty state:** "No one has invited you to wing for them yet."

### Invite flow

**"+ Invite a Wingperson" button** → bottom sheet with phone input.

```ts
// 1. Create the contacts row
await inviteWingperson(userId, phoneNumber);

// 2. Check if invitee already has an account
const { data: existing } = await supabase
  .from('profiles')
  .select('id')
  .eq('phone_number', phoneNumber)
  .maybeSingle();

if (existing) {
  // Update the contacts row with winger_id (they exist but trg_auto_link_winger
  // only fires on profile update, not on contacts insert, so do it manually here)
  await supabase.from('contacts').update({ winger_id: existing.id })
    .eq('user_id', userId).eq('phone_number', phoneNumber);
  // In Phase 8: also send push notification to the existing user
} else {
  // Call the SMS Edge Function
  await supabase.functions.invoke('send-wing-invite', {
    body: { phone: phoneNumber, daterName: profile.chosen_name },
  });
}
```

**The trg_auto_link_winger DB trigger** covers the gap: if the invitee signs up *after* the invite, their `contacts.winger_id` is filled automatically when they save their phone number in onboarding.

### Edge Function: `supabase/functions/send-wing-invite/`

Built in Phase 3. Receives `{ phone, daterName }` and sends an SMS via Twilio (or similar) with a deep link.

```ts
// Minimal implementation — no fancy invite token needed for v1.
// Deep link: wingmate://invite  (the app just shows pending invitations on open)
const message = `${daterName} invited you to be their wingperson on Wingmate. Download: [link]`;
await twilioClient.messages.create({ to: phone, from: TWILIO_NUMBER, body: message });
```

### Deep link: `app/invite.tsx`

Handles `wingmate://invite`.
- If authenticated: navigate to Wingpeople screen where the invitation is already visible in Section 2.
- If not authenticated: store a flag in AsyncStorage → after OTP → navigate to Wingpeople.

---

## Phase 4 — Discover

**Goal:** Daters browse profiles, like/pass, see wingperson suggestions in tabs, and are gated when their own status is not 'open'.

### Dating status gate

Before rendering the card feed, check the viewer's own `dating_status`:
```ts
if (datingProfile.dating_status !== 'open') {
  return <DiscoverPausedScreen status={datingProfile.dating_status} />;
}
```

`DiscoverPausedScreen` shows the current status (break / winging) with a CTA to change it. Uses the same dating_status radio as the Profile screen — tap to resume, card feed appears immediately.

### Hook: `hooks/use-discover.ts`

```ts
type DiscoverState = {
  pool: DiscoverCard[];
  index: number;
  loading: boolean;
  loadMore: () => Promise<void>;
  like: () => Promise<'match' | 'liked' | 'error'>;
  pass: () => Promise<void>;
  actOnSuggestion: (decision: 'approved' | 'declined') => Promise<void>;
};
```

Fetches `page_size=20`, prefetches next page when `index >= pool.length - 3`.

### Screen: `(tabs)/discover.tsx`

**Tab bar**
```ts
const { data: suggestions } = await getActiveWingerTabs(userId);
const tabs = ['For You', ...suggestions.map(s => s.winger.chosen_name), 'All'];
```

**Card pool by tab**
```ts
// "For You" or "All":
await getDiscoverPool(userId, null, 20, offset);

// Winger tab (e.g. "Emma"):
await getDiscoverPool(userId, emmaUserId, 20, offset);
```

**Wing note**
```ts
// card.wing_note !== null → show WingStack + truncated note + "Read full note" expand
// card.suggester_name → attribution line
```

**Like**
```ts
// Card from winger tab:
await actOnSuggestion(userId, card.user_id, 'approved');
// Direct swipe:
await recordDecision(userId, card.user_id, 'approved');

// Check for match (trigger already created the row; this just drives the UI):
const { data: match } = await checkMutualMatch(userId, card.user_id);
if (match) showMatchOverlay(card);
```

**Pass**
```ts
await actOnSuggestion(userId, card.user_id, 'declined'); // suggestion
await recordDecision(userId, card.user_id, 'declined');  // direct
```

**Empty states**
- "For You" / "All" empty → "You're all caught up. Check back soon for new profiles."
- Winger tab empty → "No picks from [Name] yet. Ask them to swipe for you."

---

## Phase 5 — Matches

**Goal:** Daters see mutual matches in a grid, preview full profiles, and can comment on prompts.

### Hook: `hooks/use-matches.ts`

```ts
const { data: matches } = await getMatches(userId);
const otherUser = getOtherProfile(match, userId);
const photoUrl  = getFirstPhoto(otherUser);
const hasChat   = hasMessages(match);
```

### Screen: `(tabs)/matches.tsx`

2-column photo grid. Tap → bottom sheet:
- 4:3 photo, name + age, location, bio.
- Interests as `Pill` chips.
- Wing note section:
  ```ts
  const { data: wingNote } = await getWingNoteForMatch(userId, otherUser.id);
  ```
- Prompts list with "Reply to this prompt" — commenter side of prompt responses:
  ```ts
  // Tapping a prompt opens a text input:
  await addPromptResponse(userId, profilePromptId, message);
  // Show "Comment sent — [Name] will see it." confirmation.
  ```
- "Open Conversation" / "Start Conversation" → `/(tabs)/messages/[matchId]`.

**Empty state:** "No matches yet. Keep swiping in Discover."

---

## Phase 6 — Messaging

**Goal:** Real-time conversations between matched users.

### Hook: `hooks/use-messages.ts`

```ts
// On mount:
const { data: initial } = await getMessages(matchId);
setMessages(initial);
await markMessagesRead(matchId, userId);

// Real-time:
const channel = subscribeToMessages(matchId, (payload) => {
  setMessages(prev => [...prev, payload.new as MessageRow]);
  markMessagesRead(matchId, userId);
});

return () => { channel.unsubscribe(); };
```

### Screen: `(tabs)/messages/index.tsx`

```ts
const { data: convos } = await getConversations(userId);
const active   = convos.filter(c => hasMessages(c));
const starters = convos.filter(c => !hasMessages(c));
```

Unread badge:
```ts
const lastMsg = convo.messages[0];
const isUnread = lastMsg?.sender_id !== userId && !lastMsg?.is_read;
```

**Empty state:** "No conversations yet. Start one from your Matches."

### Screen: `(tabs)/messages/[matchId].tsx`

```ts
// Send (optimistic):
const optimistic = { id: 'temp', body: inputText, sender_id: userId, ... };
setMessages(prev => [...prev, optimistic]);
const { error } = await sendMessage(matchId, userId, inputText);
if (error) setMessages(prev => prev.filter(m => m.id !== 'temp')); // roll back
```

`KeyboardAvoidingView` wraps the screen. Tap message bubble → show timestamp toggle.

---

## Phase 7 — Wing Mode (Proxy Swipe)

**Goal:** Wingpeople can browse and suggest profiles on behalf of a dater.

### Screen: `(tabs)/profile/wingpeople/wingswipe.tsx`

Route params: `daterId`.

**Card pool**
```ts
const { data: cards } = await getWingPool(wingerId, daterId, 20, offset);
```

**Dater context callout** (purple box on each card)
```ts
// "You think [Dater name] would like this?"
// + dater's interests (from getWingingFor, which includes dating_profiles.interests)
```

**"She'd Like This" → note modal → Send**
```ts
await wingSuggestApprove(daterId, card.user_id, wingerId, note ?? null);
// decision = null → surfaces in dater's winger tab, dater still needs to act
```

**"Not Her Type"**
```ts
await wingSuggestDecline(daterId, card.user_id, wingerId);
// decision = 'declined' → excluded from dater's feed entirely
```

Prefetch next page when 3 cards remain.

**Empty state:** "You've gone through everyone in [Name]'s area. Check back soon."

**RLS note:** The wingperson insert policy in the migration allows `actor_id = daterId` when an active contacts row exists. No extra client-side guard needed.

---

## Phase 8 — Push Notifications & Presence

The only two things that genuinely belong here: they require infrastructure (EAS push, Supabase pg_net) that doesn't make sense to build before the core flows exist. Push token registration was already done in Phase 0, so this phase is purely about delivering on it.

### 8.1 — Push Notifications

Add `push_token text` column to `profiles` (already stubbed in Phase 0 migration step).

Events and triggers:

| Event | DB trigger | Edge Function |
|---|---|---|
| New match created | `trg_notify_new_match` on `matches` insert | `notify-match` |
| New message received | `trg_notify_new_message` on `messages` insert | `notify-message` |
| New wing invitation | `trg_notify_wing_invite` on `contacts` insert | `notify-invite` |
| New wing suggestion | `trg_notify_wing_suggestion` on `decisions` insert where `suggested_by IS NOT NULL` | `notify-suggestion` |
| Photo suggested | `trg_notify_photo_suggestion` on `profile_photos` insert where `suggester_id IS NOT NULL` | `notify-photo` |

Each trigger uses `pg_net` to call the Edge Function, which reads the recipient's `push_token` from `profiles` and calls the Expo push API.

```ts
// supabase/functions/notify-match/index.ts
const { data: profiles } = await supabase
  .from('profiles')
  .select('push_token')
  .in('id', [matchRow.user_a_id, matchRow.user_b_id]);

await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  body: JSON.stringify(profiles.map(p => ({
    to: p.push_token,
    title: "It's a Match! 🎉",
    body: "You both liked each other.",
  }))),
});
```

### 8.2 — Real-time Presence (Online Dots)

```ts
// Track presence in the chat screen:
const channel = supabase.channel('presence')
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    const isOnline = Object.values(state).flat().some(p => p.user_id === otherUserId);
    setIsOnline(isOnline);
  })
  .subscribe(async () => {
    await channel.track({ user_id: userId });
  });

return () => { channel.unsubscribe(); };
```

Show green dot in Messages list and Chat header.

---

## Cross-cutting Implementation Notes

### Optimistic updates
Like/Pass, send message, approve/reject: update local state before awaiting. Roll back on error. Never leave the user waiting for a spinner on an action they've already committed to.

### Image handling
```
expo-image-picker      → select from camera roll
expo-image-manipulator → resize to max 1200px, quality 0.8, output JPEG
expo-image             → display (not RN Image) — better caching + progressive loading
```

### Pagination (Discover + WingSwipe)
```ts
let offset = 0;
const PAGE = 20;

async function loadMore() {
  const { data } = await getDiscoverPool(userId, filterWingerId, PAGE, offset);
  if (data?.length) {
    setPool(prev => [...prev, ...data]);
    offset += data.length;
  }
}
// Trigger loadMore when index >= pool.length - 3
```

### Query function → screen mapping

| Query function | Screen |
|---|---|
| `getOwnProfile` | ProfileContext, onboarding gate |
| `getOwnDatingProfile` | Profile screen (all tabs) |
| `updateBaseProfile` | Onboarding /profile |
| `createDatingProfile` | Onboarding /photos |
| `updateDatingProfile` | Profile /edit, dating_status toggle |
| `getPromptTemplates` | Onboarding /prompts, Add Prompt sheet |
| `addProfilePrompt` | Onboarding /prompts, Prompts tab |
| `approvePromptResponse` / `rejectPromptResponse` | Prompts tab (owner) |
| `addPromptResponse` | Match preview sheet (commenter) |
| `uploadPhoto` / `insertPhoto` | Onboarding /photos, Photos tab |
| `approvePhoto` / `rejectPhoto` | Photos tab |
| `getMyWingpeople` | Wingpeople screen S1 |
| `getIncomingInvitations` | Wingpeople screen S2 |
| `getWingingFor` | Wingpeople screen S3 |
| `inviteWingperson` | Invite flow |
| `acceptInvitation` / `declineInvitation` | Invitations section |
| `getActiveWingerTabs` | Discover tab bar |
| `getDiscoverPool` | Discover feed (For You / All / winger tabs) |
| `recordDecision` | Discover direct like/pass |
| `actOnSuggestion` | Discover acting on winger tab card |
| `checkMutualMatch` | Discover — trigger match overlay |
| `getWingPool` | WingSwipe feed |
| `wingSuggestApprove` | WingSwipe "She'd Like This" |
| `wingSuggestDecline` | WingSwipe "Not Her Type" |
| `getMatches` | Matches grid |
| `getWingNoteForMatch` | Match preview sheet |
| `getConversations` | Messages list |
| `getMessages` | Chat initial load |
| `sendMessage` | Chat send |
| `markMessagesRead` | Chat on mount + new message |
| `subscribeToMessages` | Chat real-time |

---

## Phase Order Summary

| Phase | Deliverable | Notable additions vs. old plan |
|---|---|---|
| 0 | DB live, nav shell, ProfileContext | + push token registration |
| 1 | Onboarding flow | — |
| 2 | Own profile (all 3 tabs, complete) | + prompt response approve/reject, photo approval, dating_status callout |
| 3 | Wingpeople roster + invite | + SMS Edge Function (invite is broken without it) |
| 4 | Discover feed | + dating_status gate (DiscoverPausedScreen) |
| 5 | Matches grid + preview | + prompt response commenter UI |
| 6 | Messaging + real-time | — |
| 7 | Wing Mode proxy swipe | — |
| 8 | Push notifications + presence | Slimmed to only what genuinely belongs here |
