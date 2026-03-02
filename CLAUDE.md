# Coding Preferences

## Composition

Orchestrators only decide what to render — no implementation detail. Logic lives close to where it's used.

## Control flow

- Use `switch` on discriminated unions (`Step`, `Role`) rather than if/else chains
- Explicit `return` on every branch — no fallthrough, no side-effect-only arms

## No useEffect

Effects signal poor composition. Move async work into transition handlers instead. The only acceptable exception is a mount-only guard for a genuine external event (e.g. app-kill resume).

## Error propagation

- No try/catch across callback boundaries — it obscures where errors originate
- Return errors as values (`Promise<string | undefined>`) and handle them at the callsite
- User-facing errors via `toast.error()` (sonner-native), not inline error state

## Forms

Use react-hook-form for everything: `Controller`, `handleSubmit`, `isSubmitting`, `isValid`, `mode: 'onChange'`. No manual loading/error/value state.

## Queries

- Transforms (shuffle, slice, filter) belong in the query function, not the component
- Library wrappers own boilerplate — e.g. Supabase `{ data, error }` unwrapping lives in `useSupabaseSuspenseQuery`, not at every callsite
- Function references as cache keys — no magic strings (see `lib/useSuspenseQuery.ts`)

## Styling (NativeWind v5 + Tailwind v4)

- Always use `import { View, Text, ... } from '@/lib/tw'` for className-based styling
- Never use `StyleSheet.create` for new code — use `className` props instead
- Use `style` prop only for things className can't handle: `borderCurve`, dynamic/animated values, SVG props
- Use `lib/cn.ts` (`clsx` + `twMerge`) for conditional class composition
- Design tokens live in `global.css` under `@theme` — do not add new colours to `constants/theme.ts`
- `constants/theme.ts` is legacy — only touch it when modifying existing StyleSheet-based components

## Code style

- `async/await` over `.then()` chains
