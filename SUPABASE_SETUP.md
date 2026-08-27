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
6. In Supabase Dashboard, open Authentication > URL Configuration and add the local and production application URLs as redirect URLs.
7. In Authentication > Providers, disable public email sign-ups. Workers are created only by the owner through the Users page.

The `create-worker` function sends an invitation email. Configure a production Site URL and email provider before inviting real workers.
