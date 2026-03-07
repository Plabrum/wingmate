# Wyng — AI Assistant Guide

## What This App Is

Wyng (package name `hane`, app slug `wingmate`, display name `Wyng`) is an iOS dating app with a "wingperson" mechanic. Two user roles exist:

- **Dater** — browses profiles, swipes, chats with matches.
- **Winger** — a trusted friend who swipes on behalf of a dater and suggests profiles.

Core flows: Auth → Onboarding → Discover (swipe) → Matches → Messaging → Wingpeople management.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React Native 0.81 + Expo SDK 54 (new architecture enabled) |
| Navigation | expo-router v6 (file-based, typed routes enabled) |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions + Realtime) |
| Styling | NativeWind v5 preview + Tailwind v4 via `react-native-css` |
| Data fetching | TanStack React Query v5 (`useSuspenseQuery` throughout) |
| Forms | react-hook-form v7 |
| Toasts | sonner-native (`toast.error()` for all user-facing errors) |
| Animations | react-native-reanimated v4 |
| Build/deploy | EAS Build + EAS Update (OTA via Expo Updates) |
| Edge Functions | Deno (separate tsconfig, linted with `deno lint`) |

---

## Directory Structure

```
wingmate/
├── app/                        # expo-router pages (file-based routing)
│   ├── _layout.tsx             # Root layout — providers, auth gate, Toaster
│   ├── index.tsx               # Entry redirect (handled by RootNavigator)
│   ├── invite.tsx              # Deep-link handler for wingperson invites
│   ├── (auth)/                 # Unauthenticated screens
│   │   ├── login.tsx           # Apple Sign-In + SMS entry
│   │   ├── sms.tsx             # OTP verification
│   │   └── apple.tsx           # Apple auth callback
│   ├── (onboarding)/           # First-run flow (role → profile → photos → prompts)
│   │   └── index.tsx           # Onboarding orchestrator
│   └── (tabs)/                 # Authenticated tab shell
│       ├── discover.tsx        # Swipe feed (daters only; gated by dating_status)
│       ├── matches.tsx         # Mutual-match grid
│       ├── messages/
│       │   ├── index.tsx       # Conversations list
│       │   └── [matchId].tsx   # Real-time chat
│       └── profile/
│           ├── index.tsx       # Own profile (About Me / Photos / Prompts tabs)
│           ├── edit.tsx        # Edit dating profile fields
│           └── wingpeople/
│               ├── index.tsx   # Wingpeople roster + invite + incoming invitations
│               └── wingswipe.tsx # Proxy-swipe on behalf of a dater
│
├── components/
│   ├── onboarding/             # Step components (RoleStep, ProfileStep, PhotosStep, PromptsStep)
│   ├── profile/                # Profile tab components (AboutMeTab, PhotosTab, PromptsTab, etc.)
│   └── ui/                     # Shared primitives (see Shared Components section)
│
├── context/
│   └── auth.tsx                # AuthProvider, useSession(), useAuth()
│
├── hooks/                      # Custom hooks (use-color-scheme, etc.)
│
├── lib/
│   ├── tw.tsx                  # Styled primitives (View, Text, Pressable, etc.) — ALWAYS import from here
│   ├── cn.ts                   # clsx + tailwind-merge helper
│   ├── supabase.ts             # Typed Supabase client
│   ├── queryClient.ts          # TanStack QueryClient (staleTime 60s, retry 1)
│   ├── push.ts                 # Push token registration
│   └── phoneUtils.ts           # libphonenumber-js helpers
│
├── queries/                    # All Supabase query functions + React Query hooks
│   ├── index.ts                # Re-exports everything
│   ├── profiles.ts             # Own profile + dating profile CRUD
│   ├── discover.ts             # Discover pool RPC
│   ├── decisions.ts            # Like/pass/winger-suggest
│   ├── matches.ts              # Match fetching
│   ├── messages.ts             # Conversations + real-time subscribe
│   ├── contacts.ts             # Wingpeople relationships
│   ├── photos.ts               # Profile photo upload/approve/reject
│   └── prompts.ts              # Prompt templates + responses
│
├── types/
│   └── database.ts             # Auto-generated Supabase types (do not edit manually)
│
├── constants/
│   └── theme.ts                # LEGACY — StyleSheet-era colours; do not add new tokens here
│
├── supabase/
│   ├── migrations/             # SQL migrations (applied in order)
│   └── functions/              # Deno Edge Functions
│       ├── send-wing-invite/   # SMS invite via Twilio
│       ├── notify-match/       # Push: new match
│       ├── notify-message/     # Push: new message
│       ├── notify-invite/      # Push: wing invite received
│       ├── notify-suggestion/  # Push: winger suggested someone
│       └── notify-photo/       # Push: winger suggested a photo
│
├── scripts/                    # Shell + Node scripts (dev-sim, deploy, seed-prod, etc.)
├── global.css                  # Tailwind v4 @theme tokens (source of truth for design tokens)
├── app.config.js               # Expo config (reads version from package.json)
├── eas.json                    # EAS Build profiles (development / development-simulator / preview / production)
├── data_model.md               # Canonical data model reference
└── plan.md                     # Phased build plan (Phases 0–8)
```

---

## Routing & Auth Gate

The root layout (`app/_layout.tsx`) implements the auth gate as a component tree:

```
QueryClientProvider
  AuthProvider
    ThemeProvider
      Stack (screens)
      RootNavigator       ← decides where to redirect
      Toaster
```

`RootNavigator` reads `session` from `useSession()`. If no session → `/(auth)/login`. If session → renders `AuthenticatedNavigator` inside `ScreenSuspense`, which reads the profile and redirects:

- No `chosen_name` → `/(onboarding)`
- Role = `winger` → `/(tabs)/profile`
- No `datingProfile` → `/(onboarding)`
- Otherwise → `/(tabs)/discover`

Two mount-only `useEffect`s are allowed in `AuthenticatedNavigator` (these are the acceptable exceptions to the no-`useEffect` rule): checking a pending deep-link invite from AsyncStorage, and registering the push token — both are genuine external events.

---

## Auth Patterns

```ts
// Routing layer — session may be null
const { session, loading } = useSession();

// Authenticated screens — throws if no session
const { userId, session, signOut } = useAuth();

// Auth actions (plain async functions, not hooks)
await sendOTP(phone);
await verifyOTP(phone, token);
```

`AuthProvider` uses a single `useEffect` (acceptable: it subscribes to an external auth state change event from Supabase). In `__DEV__` + web, it auto-signs in with a dev account.

---

## Query Patterns

All data fetching uses `useSuspenseQuery` from TanStack Query. The cache key is always the function reference, never a magic string:

```ts
// ✅ Correct
useSuspenseQuery({
  queryKey: ['profile', userId],
  queryFn: () => getProfileData(userId),
  staleTime: 5 * 60_000,
});

// ✅ Correct — transforms live in the queryFn, not the component
useSuspenseQuery({
  queryKey: [getDiscoverPool, userId, wingerId],
  queryFn: async () => {
    const { data, error } = await getDiscoverPool(userId, wingerId, 20, 0);
    if (error) throw error;
    return data.sort(() => Math.random() - 0.5);  // shuffle here, not in component
  },
});
```

Supabase `{ data, error }` unwrapping happens in the query function, not in the component. Errors are thrown so Suspense/ErrorBoundary handles them.

Regenerate types after schema changes:
```bash
npm run db:types
```

---

## Data Model Summary

Full schema is in `data_model.md`. Key tables:

| Table | Purpose |
|---|---|
| `profiles` | Base user (auth + name + phone + gender + role) |
| `dating_profiles` | Dater config (bio, city, preferences, dating_status) |
| `profile_photos` | Photos with approval flow; `suggester_id` null = self-upload |
| `prompt_templates` | Predefined questions |
| `profile_prompts` | A dater's chosen prompt + answer |
| `prompt_responses` | Wingperson/match comments on a prompt (needs approval) |
| `contacts` | Dater ↔ Winger relationship (status: invited/active/removed) |
| `decisions` | Like/pass/suggestion; mutual 'approved' triggers a Match |
| `matches` | Mutual match record |
| `messages` | Chat messages per match |

Key enum values:
- `role`: `'dater'` | `'winger'`
- `dating_status`: `'open'` | `'break'` | `'winging'`
- `wingperson_status`: `'invited'` | `'active'` | `'removed'`
- `decision`: `'approved'` | `'declined'` | `null` (null = winger suggestion pending dater action)

---

## Shared UI Components (`components/ui/`)

| Component | Key props | Used in |
|---|---|---|
| `Pill` | `label` | Interests, match sheet |
| `WingStack` | `initials: string[]`, `size?` | Discover card, Profile, Wingpeople |
| `PhotoRect` | `uri: string \| null`, `ratio?`, `blur?` | Discover, Matches, Profile |
| `FaceAvatar` | `initials`, `bg`, `size?` | Wingpeople, Messages list |
| `LargeHeader` | `title`, `right?` | Discover, Matches, Messages |
| `NavHeader` | `back`, `onBack`, `title`, `sub?`, `right?` | Chat, Wingpeople, WingSwipe |
| `TextTabBar` | `tabs: string[]`, `active`, `setActive` | Discover filter, Profile tabs |
| `PurpleButton` | `label`, `onPress`, `outline?` | Throughout |
| `ScreenSuspense` | wraps screens | Root layout |
| `ScreenErrorBoundary` | wraps screens | Error states |

---

## Styling (NativeWind v5 + Tailwind v4)

- **Always** import styled primitives from `@/lib/tw`: `View`, `Text`, `Pressable`, `ScrollView`, `TextInput`, `SafeAreaView`, `AnimatedView`.
- Never use `StyleSheet.create` for new code — use `className` props.
- Use `style` prop only for: `borderCurve`, dynamic/animated values, SVG props.
- Never use function-style `style` props on `Pressable` — NativeWind bug #1105 causes children not to render. Use `active:` pseudo-class instead:
  ```tsx
  <Pressable className="bg-black active:bg-[#1a1a1a]">...</Pressable>
  ```
- Use `cn()` from `@/lib/cn` for conditional class composition.
- Design tokens live in `global.css` under `@theme` — do not add new colours to `constants/theme.ts`.
- `constants/theme.ts` is legacy — only touch when modifying existing `StyleSheet`-based components.

### Design Tokens (from `global.css`)

**Colors:** `ink`, `ink-mid`, `ink-dim`, `ink-ghost`, `canvas`, `purple`, `purple-pale`, `purple-soft`, `green`, `divider`, `muted`, `lavender`

**Font sizes:** `text-11` through `text-30` (pixel-exact, each has a companion line-height)

**Radii:** `radius-4`, `radius-9`, `radius-13`, `radius-14`, `radius-16`, `radius-18`, `radius-21`, `radius-22`, `radius-26`

**Font families:** `font-serif` (Georgia / ui-serif) for large headers, `font-sans` (system-ui) for body text

---

## Coding Preferences

### Composition

Orchestrators only decide what to render — no implementation detail. Logic lives close to where it's used.

### Control flow

- Use `switch` on discriminated unions (`Step`, `Role`) rather than if/else chains.
- Explicit `return` on every branch — no fallthrough, no side-effect-only arms.

### No useEffect

Effects signal poor composition. Move async work into transition handlers instead. The only acceptable exceptions are mount-only guards for genuine external events (e.g. Supabase auth subscription, push token registration, AsyncStorage deep-link check).

### Error propagation

- No try/catch across callback boundaries — it obscures where errors originate.
- Return errors as values (`Promise<string | undefined>`) and handle them at the callsite.
- User-facing errors via `toast.error()` (sonner-native), not inline error state.

### Forms

Use react-hook-form for everything: `Controller`, `handleSubmit`, `isSubmitting`, `isValid`, `mode: 'onChange'`. No manual loading/error/value state.

### Queries

- Transforms (shuffle, slice, filter) belong in the query function, not the component.
- Library wrappers own boilerplate — Supabase `{ data, error }` unwrapping lives in the query function, not at every callsite.
- Function references as cache keys — no magic strings.

### Code style

- `async/await` over `.then()` chains.

---

## Development Workflows

### Environment

Create `.env.local` with:
```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

### Running locally

```bash
npm run dev:sim        # iOS Simulator (runs scripts/dev-sim.sh)
npm run ios            # expo run:ios
npm run web            # expo start --web (dev auto-signs in as dev@local.test)
```

### Supabase local dev

```bash
npm run supabase:start   # start local Supabase stack
npm run supabase:stop    # stop
npm run db:types         # regenerate types/database.ts from local schema
```

### Linting & formatting

```bash
npm run lint             # eslint (expo config)
npm run format           # prettier --write .
npm run typecheck:functions  # deno check supabase/functions/**/*.ts
npm run lint:functions   # deno lint supabase/functions
```

Husky + lint-staged run eslint + prettier on staged `.ts`/`.tsx` files pre-commit.

### Building

```bash
npm run build:dev-sim    # local dev-simulator build → builds/dev-sim.app
npm run build:local      # local production build → builds/app.ipa
npm run build:device     # expo run:ios --device
```

### Deploying

```bash
npm run deploy           # bash scripts/deploy.sh
npm run deploy:ota       # eas update --channel production (OTA)
npm run deploy:build     # eas build --platform ios --profile production
npm run submit:local     # eas submit from builds/app.ipa
```

---

## Edge Functions

Located in `supabase/functions/`. Each is a standalone Deno module.

- Typed with Deno (`npm run typecheck:functions`)
- Formatted with `deno fmt` (`npm run format:functions`)
- Invoked from the app via `supabase.functions.invoke(name, { body })`
- Triggered by DB triggers via `pg_net` for push notifications

Functions:
- `send-wing-invite` — SMS invite to a prospective winger (Twilio)
- `notify-match` — push on new match
- `notify-message` — push on new message
- `notify-invite` — push on wing invite received
- `notify-suggestion` — push on winger suggestion
- `notify-photo` — push on winger photo suggestion

---

## Image Handling

```
expo-image-picker      → select from camera roll
expo-image-manipulator → resize to max 1200px, quality 0.8, JPEG output
expo-image             → display (not RN Image) — better caching + progressive loading
```

---

## Build Configuration

- **Version source:** `package.json` `version` field (read by `app.config.js`; EAS uses `appVersionSource: "remote"`)
- **Bundle ID:** `com.plabrum.wingmate`
- **EAS Project ID:** `ce961544-87fc-4eb0-8168-3c7cd646d58e`
- **Runtime version policy:** fingerprint
- **Updates URL:** `https://u.expo.dev/ce961544-87fc-4eb0-8168-3c7cd646d58e`
- **New Architecture:** enabled (`newArchEnabled: true`)

EAS profiles: `development` · `development-simulator` · `preview` · `production`

---

## TypeScript

- Strict mode enabled.
- Path alias: `@/*` → `./*` (use `@/` for all internal imports).
- `supabase/functions` is excluded from the main tsconfig (uses Deno's own type checking).
- `types/database.ts` is auto-generated — regenerate with `npm run db:types` after any schema change; never edit manually.
