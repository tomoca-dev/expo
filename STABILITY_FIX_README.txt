TOMOCA ERP Stability Fix

This version addresses the issue where the app works at first, then later stops fetching data and logs:
- buyers timed out
- shipments timed out
- documents timed out
- routes timed out
- lots timed out
- buyer_receipts timed out

What was changed:
1. Supabase client now uses explicit persistent auth settings:
   - persistSession: true
   - autoRefreshToken: true
   - detectSessionInUrl: true
   - custom storageKey: tomoca-supabase-auth

2. App.tsx data loading was changed from all-at-once parallel fetches to sequential table fetches.
   This prevents one stalled browser/Supabase connection from making every table fail together.

3. Each table fetch now retries after refreshing the Supabase session.

4. If one table fails, the app does not clear all existing data. It keeps the current state and continues.

5. AuthContext.tsx profile loading now has timeout + retry + session refresh.

After replacing your project with this version:
1. Run: npm install
2. Run: npm run dev
3. Log out and log back in once.

You should no longer need to clear browser history when data stops fetching.
