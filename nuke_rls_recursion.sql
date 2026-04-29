-- ============================================================
-- NUKE: Deep fix for "Infinite Recursion detected in policy"
-- This script drops ALL policies on the profiles table
-- and replaces them with a single, safe policy.
-- ============================================================

DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    -- 1. DROP ALL existing policies on the profiles table using a loop
    -- This ensures that even hidden or custom-named recursive policies are removed.
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

-- 2. CREATE the single most stable, non-recursive policy
-- This uses ONLY auth.uid() and row-level ID. It does NOT select from profiles.
CREATE POLICY "profiles_self_access" ON public.profiles
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. ENSURE RLS IS ON
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. FIX other tables to be simple while you are at it
DROP POLICY IF EXISTS "authenticated_read_write_buyers" ON buyers;
CREATE POLICY "authenticated_read_write_buyers" ON buyers FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "authenticated_read_write_shipments" ON shipments;
CREATE POLICY "authenticated_read_write_shipments" ON shipments FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "authenticated_read_write_documents" ON documents;
CREATE POLICY "authenticated_read_write_documents" ON documents FOR ALL USING (auth.uid() IS NOT NULL);

-- Final sanity check: 
-- This script prevents the database from checking a user's role 
-- by querying the same table it's currently trying to protect.
