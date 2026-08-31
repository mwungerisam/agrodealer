# Supabase Setup

This application is configured for a Supabase project owned by your organization.

1. Create a new project at https://supabase.com/dashboard.
2. In the project settings, copy the Project URL and publishable key.
3. Replace the placeholders in `.env` with those values.
4. Link the local repository and deploy its backend:

```powershell
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase functions deploy create-worker
```

5. Create the first owner in Supabase Dashboard: open Authentication > Users, select **Add user**, and send an invitation to the owner email address. The first account created in the new database is automatically assigned the owner role.
6. In Supabase Dashboard, open Authentication > URL Configuration and add the local and production application URLs as redirect URLs, including `/reset-password`.
7. In Authentication > Providers, disable public email sign-ups. Workers are created only by the owner through the Users page.
8. In Authentication > Security, enable multi-factor authentication for owner accounts, set a 12-character password minimum, and configure login rate limits.
9. Set the Edge Function secret `ALLOWED_ORIGINS` to a comma-separated list of the exact allowed app origins, for example `https://app.example.com,http://localhost:5173`.

The `create-worker` function creates a confirmed worker account with the secure initial password entered by the owner. Share that password through a secure channel and require the worker to change it after their first sign-in.
