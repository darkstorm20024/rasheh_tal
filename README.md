# Rasheh Talent — Supabase + Vercel

## Before deployment
1. In Supabase SQL Editor, run `supabase_setup.sql`.
2. In Supabase Authentication > Providers > Email, enable Email provider.
3. For easiest testing, turn OFF **Confirm email** temporarily.
4. Create a new PRIVATE GitHub repository and upload the CONTENTS of this folder.
5. Import the repository into Vercel.
6. In Vercel Project Settings > Environment Variables add:
   - `SUPABASE_URL` = your project URL
   - `SUPABASE_ANON_KEY` = your NEW rotated anon/publishable key
   - `SUPABASE_SERVICE_ROLE_KEY` = your service_role key (server only, never GitHub)
   - `ADMIN_EMAIL` = your own admin email (optional)
7. Deploy. The production URL is your platform link.

## Important
- Do not put database passwords, service role keys, IBANs, or candidate data in GitHub.
- Public candidate lists never return phone/email/resume URL. Those are returned only by `/api/unlock` after a real credit deduction.
- `/api/purchase` creates a pending manual bank-transfer request. It does NOT activate credits. Approve real payments from Supabase by updating the client credit balance after checking the transfer.
- This is a starter production architecture. Before accepting real payments, integrate a verified webhook from Moyasar/Tap/PayPal.
