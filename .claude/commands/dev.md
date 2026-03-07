Start the local dev environment: Colima, Supabase, and Expo web.

1. Source `~/.zprofile` so Homebrew binaries are on PATH.
2. Start Colima if it isn't already running (`colima status`).
3. Start Supabase if it isn't already running (`supabase status`), using `npm run supabase:start`. Wait for it to finish.
4. Start Expo web in the background using `npm run web`. Tail output until Metro is ready and the dev server URL is shown.
5. Report the Supabase Studio URL (usually http://localhost:54323) and the Expo web URL (usually http://localhost:8081).
