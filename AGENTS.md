<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Business rules (sales, stock, debts, reports, Kz formatting) live as pure functions in `src/lib/ledger.ts` and are covered by `src/test/ledger.test.ts` — keeps money logic testable and out of UI.
- App data is offline-first via `src/lib/store.ts` (IndexedDB + useSyncExternalStore) and synced to Lovable Cloud through queued idempotent RPCs; local writes never wait on the network.
- A Supabase session is required: `src/lib/auth.ts` owns it and `AppShell` redirects signed-out visitors to `/entrar` — so no screen can be reached without an account.
- A new account always gets its own store through the `on_auth_user_created` trigger on `auth.users` calling `public.handle_new_user()`; without it a fresh account has no establishment and the app cannot load.
- Roles live in `public.employees` (`owner`/`employee` + a jsonb permission set); never derive privileges from user-editable profile metadata.
- Pages render only after `useLedgerReady()` in `AppShell` — device storage is unavailable during SSR, so this avoids hydration mismatches.
- Installability is manifest-only (`public/manifest.webmanifest`), no service worker — avoids stale caches in preview. The install offer lives in `src/components/app/install-card.tsx` with the phone-detection helpers in `src/lib/install.ts` (covered by `src/test/install.test.tsx`), and icons ship as both `any` and `maskable` so any launcher crop keeps the glyph readable.
