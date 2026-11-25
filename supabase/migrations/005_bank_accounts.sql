-- ==============================================================================
-- Levelling Up - Migration: 005_bank_accounts.sql
-- Multiple Bank Accounts Support (Max 3) & Payment Association
-- ==============================================================================

-- 1. Create bank_accounts table
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_name TEXT NOT NULL,
    account_holder TEXT NOT NULL,
    rib TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Add bank_account_id to payments table (additive column, nullable)
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL;

-- 3. Copy existing settings row into bank_accounts as first account if empty
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.bank_accounts LIMIT 1) THEN
        INSERT INTO public.bank_accounts (bank_name, account_holder, rib, is_active, sort_order)
        SELECT 
            COALESCE(NULLIF(bank_name, ''), 'Attijariwafa Bank'),
            COALESCE(NULLIF(account_holder, ''), 'Levelling Up Media'),
            COALESCE(NULLIF(rib, ''), '007 780 0001234567890123 45'),
            TRUE,
            0
        FROM public.settings
        WHERE id = 1;
    END IF;
END $$;

-- 4. Enforce maximum of 3 bank accounts via trigger
CREATE OR REPLACE FUNCTION public.check_max_bank_accounts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF (SELECT COUNT(*) FROM public.bank_accounts) >= 3 THEN
        RAISE EXCEPTION 'A maximum of 3 bank accounts is allowed.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_max_bank_accounts ON public.bank_accounts;
CREATE TRIGGER trg_check_max_bank_accounts
    BEFORE INSERT ON public.bank_accounts
    FOR EACH ROW EXECUTE FUNCTION public.check_max_bank_accounts();

-- 5. Row Level Security on bank_accounts
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view active bank accounts (or admin can view all)
DROP POLICY IF EXISTS "Authenticated users view active bank accounts" ON public.bank_accounts;
CREATE POLICY "Authenticated users view active bank accounts"
    ON public.bank_accounts FOR SELECT
    TO authenticated
    USING (is_active = true OR public.is_admin());

-- Admins have full control to insert, update, delete
DROP POLICY IF EXISTS "Admins full control on bank accounts" ON public.bank_accounts;
CREATE POLICY "Admins full control on bank accounts"
    ON public.bank_accounts FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 6. Reaffirm payments RLS for admin inspection
DROP POLICY IF EXISTS "Admin view all payments" ON public.payments;
CREATE POLICY "Admin view all payments"
    ON public.payments FOR SELECT
    TO authenticated
    USING (public.is_admin() OR auth.uid() = user_id);
