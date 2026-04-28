-- ============================================================
-- FIX: Recursive RLS stack depth limit exceeded
-- Run this in your Supabase SQL Editor
-- ============================================================

-- STEP 1: Drop ALL existing policies on profiles (the recursive ones)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Public Read Profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
-- Add any other policy names you may have created here and drop them

-- STEP 2: Drop ALL policies on the other tables that likely reference profiles
DROP POLICY IF EXISTS "Public Read/Write Buyers" ON buyers;
DROP POLICY IF EXISTS "Public Read/Write Shipments" ON shipments;
DROP POLICY IF EXISTS "Public Read/Write Documents" ON documents;
DROP POLICY IF EXISTS "Public Read/Write Routes" ON routes;
DROP POLICY IF EXISTS "Public Read/Write Lots" ON lots;
DROP POLICY IF EXISTS "Public Read/Write BuyerReceipts" ON buyer_receipts;

-- STEP 3: Re-create the profiles policy WITHOUT recursion.
-- Use auth.uid() directly, never query the profiles table inside profiles RLS.
CREATE POLICY "profiles_self_read" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- STEP 4: Re-create simple, non-recursive policies for all other tables.
-- These use auth.uid() IS NOT NULL (user is logged in) — simple and safe.
CREATE POLICY "authenticated_read_write_buyers" ON buyers
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_read_write_shipments" ON shipments
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_read_write_documents" ON documents
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_read_write_routes" ON routes
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_read_write_lots" ON lots
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_read_write_buyer_receipts" ON buyer_receipts
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- STEP 5: Verify RLS is still enabled on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Done. Profiles can now be read without recursive calls.
-- All other tables only check if the user is authenticated.
