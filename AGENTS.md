<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# AGENTS.md

## Architecture decisions

- Supabase writes go through SECURITY DEFINER RPC helpers (`upsert_lead`, `create_income_assessment`, `join_waitlist` in `supabase/schema.sql`), never `insert(...).select()`. Why: the tables deliberately have no SELECT policy (visitors must not be able to read data back), and Postgres rejects `INSERT ... RETURNING` without one — the RPC is the only safe way to get the new row's id.
- The funnel app is pure frontend + the client's own Supabase project (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). Never use Lovable Cloud or any Lovable-managed backend.
- The user's Supabase had a legacy half-built `leads` table; schema.sql contains an idempotent healing block that drops NOT NULL on unknown extra columns. Keep it when editing schema.sql.
- Webinar registrations go through the `register_for_webinar` RPC in `supabase/webinar.sql`, which matches leads by normalized email only (a URL lead_id is never trusted). Why: prevents attaching registrations to someone else’s lead.
