# Security Credential Rotation Runbook

Use this after any credential exposure or before production deployment.

## Rotate Provider Credentials

1. Supabase database password:
   - Supabase Dashboard -> Project Settings -> Database -> Reset database password.
   - Update `DATABASE_URL` and `DIRECT_URL` in every deployed environment.

2. Supabase API keys:
   - Rotate the service-role key in Supabase if available for the project.
   - Replace `SUPABASE_SERVICE_ROLE_KEY` in server environments.
   - Replace `SUPABASE_ANON_KEY` and `VITE_SUPABASE_ANON_KEY` if the anon key is rotated.

3. Supabase JWT secret:
   - Rotate only with a planned maintenance window because existing sessions may be invalidated.
   - Update `SUPABASE_JWT_SECRET` if it is still used by tooling.

4. Legacy JWT secret:
   - The active backend uses Supabase Auth.
   - Keep `JWT_SECRET` empty unless old tokens are intentionally being drained.
   - If it was exposed, set a new random value or remove old-token fallback support.

5. Gmail app password:
   - Revoke the exposed app password in the Google account security settings.
   - Create a new app password only if server-side email sending is still required.
   - Update `EMAIL_USER` and `EMAIL_PASS` in the server environment.

## Clean Git And Deployment State

1. Confirm local env files are untracked:

   ```bash
   git ls-files | grep -E '(^|/)\.env($|\.)'
   ```

2. Run the tracked secret scan:

   ```bash
   cd Codebase/server
   npm run security:scan-env
   ```

3. If real secrets are already in git history, coordinate with all collaborators before rewriting history.
   Recommended tools:
   - `git filter-repo`
   - BFG Repo-Cleaner

4. After history rewrite:
   - Force-push protected branches only through the agreed project process.
   - Ask every collaborator to reclone or hard-reset to the rewritten history.
   - Rotate credentials even if history is cleaned, because old clones may still contain the secrets.

## Production Checklist

- `CORS_ORIGINS` contains only production frontend origins.
- `CORS_ALLOW_CREDENTIALS` is `false` unless cookie-based auth is intentionally introduced.
- Rate limit env vars are set to production values.
- `EMAIL_USER` and `EMAIL_PASS` are empty unless server-side email sending is enabled.
- Supabase Auth email templates and redirect URLs are configured in the Supabase dashboard.
