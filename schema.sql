
-- TOMOCA ERM PLATFORM - DATABASE SCHEMA
-- Execute this in the Supabase SQL Editor

-- 1. BUYERS TABLE
CREATE TABLE IF NOT EXISTS buyers (
    id TEXT PRIMARY KEY, -- Format: BYR-XXXX
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    "totalRevenue" NUMERIC DEFAULT 0,
    "shipmentCount" INTEGER DEFAULT 0,
    "riskScore" INTEGER DEFAULT 0,
    "lastContact" DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. SHIPMENTS TABLE
-- Matches the Shipment interface and the dense form data in FormsHub.tsx
CREATE TABLE IF NOT EXISTS shipments (
    -- Core Shipment Telemetry
    id TEXT PRIMARY KEY, -- Format: SHP-XXXX
    "buyerName" TEXT NOT NULL,
    destination TEXT NOT NULL,
    value NUMERIC NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    status TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "coffeeType" TEXT,
    weight NUMERIC DEFAULT 0,
    date DATE DEFAULT CURRENT_DATE,
    margin NUMERIC DEFAULT 0,
    
    -- Logistics & Financial Terms
    incoterms TEXT DEFAULT 'FOB',
    "paymentTerms" TEXT DEFAULT 'Advance Payment (TT)',

    -- Sales Contract Protocol (FormsHub Data)
    tin TEXT DEFAULT '0000178528',
    license TEXT DEFAULT '14/670/24450/2004 (BL)',
    "sellerName" TEXT DEFAULT 'TOMOCA COFFEE PLC',
    address TEXT DEFAULT 'ADDIS ABABA ARADA NO WOREDA-139 WOREDA 01, 858/3, 24615',
    "appRef" TEXT,
    "refDate" DATE,
    "appNo" TEXT,
    "lpcoRef" TEXT,
    "contractNo" TEXT,
    "buyerAddress" TEXT DEFAULT 'SEOUL, SOUTH KOREA',
    "contractDate" DATE,
    "partialShipment" TEXT DEFAULT 'Not allowed',
    cbra TEXT DEFAULT 'Bank of Abyssinia',
    branch TEXT DEFAULT 'Sales Contract Agreement Department',
    packing TEXT DEFAULT '500gr - BAR - Dark Roast Beans (500kg)',
    "itemCount" INTEGER DEFAULT 1,
    "shipmentDateRange" TEXT,
    "hsCode" TEXT DEFAULT '09012100',
    quantity NUMERIC DEFAULT 0,
    "netWeight" NUMERIC DEFAULT 0,
    "grossWeight" NUMERIC DEFAULT 0,
    packages INTEGER DEFAULT 0,
    approver TEXT DEFAULT 'Tizazu Edossa',
    "lpcoId" TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY, -- Format: DOC-XXXX
    "shipmentId" TEXT REFERENCES shipments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    "fileSize" TEXT,
    "isExternal" BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 4. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- 5. PUBLIC ACCESS POLICIES (For Prototype Development)
-- Note: Replace with auth.uid() checks for production security.
CREATE POLICY "Public Read/Write Buyers" ON buyers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write Shipments" ON shipments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write Documents" ON documents FOR ALL USING (true) WITH CHECK (true);

-- 6. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_shipments_buyer_name ON shipments("buyerName");
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_documents_shipment_link ON documents("shipmentId");
CREATE INDEX IF NOT EXISTS idx_buyers_country ON buyers(country);
