TOMOCA ERP CLEAN FIX VERSION

Main fixes applied:
1. App.tsx now fetches data through the Supabase client instead of raw REST fetch.
   This keeps the logged-in session token and fixes RLS/auth fetch issues.
2. Loading screen now has a fail-safe timeout so it should not stay on
   "Syncing Encryption Keys..." forever.
3. Insert/update operations now use .select().single() and throw visible errors.
4. Shipments and documents now have fallback insert/update payloads for the older
   camelCase schema in schema.sql and the newer normalized snake_case schema.
5. Documents automatically resolve buyerId from the linked shipment when possible.
6. AuthContext roles were widened to support admin, buyer, finance, management, and sales.

IMPORTANT:
If fetch/add still fails, run fix_rls_policies.sql in Supabase SQL Editor.
Then log out and log in again.
