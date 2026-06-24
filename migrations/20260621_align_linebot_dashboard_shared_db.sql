-- Align dashboard and LINE bot shared database shape.
-- Auto-generated numeric IDs use bigint; manually assigned people IDs stay varchar.

BEGIN;

-- Drop FK constraints that can block bigint type alignment.
ALTER TABLE IF EXISTS public.cash_deposits
  DROP CONSTRAINT IF EXISTS cash_deposits_sale_id_fkey;

ALTER TABLE IF EXISTS public.sales_logs
  DROP CONSTRAINT IF EXISTS sales_logs_sale_id_fkey;

ALTER TABLE IF EXISTS public.branch_cash_ledger
  DROP CONSTRAINT IF EXISTS branch_cash_ledger_sale_id_fkey,
  DROP CONSTRAINT IF EXISTS branch_cash_ledger_cash_deposit_id_fkey,
  DROP CONSTRAINT IF EXISTS branch_cash_ledger_branch_id_fkey;

-- Keep users.id and employees.id as manually assigned varchar IDs.
ALTER TABLE public.employees
  ALTER COLUMN id TYPE varchar(255)
  USING id::varchar(255);

ALTER TABLE public.users
  ALTER COLUMN id TYPE varchar(255)
  USING id::varchar(255);

-- Optional link when a dashboard user is also an employee.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS employee_id varchar(255);

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_employee_id_fkey;

ALTER TABLE public.users
  ALTER COLUMN employee_id TYPE varchar(255)
  USING employee_id::varchar(255);

ALTER TABLE public.users
  ADD CONSTRAINT users_employee_id_fkey
  FOREIGN KEY (employee_id) REFERENCES public.employees(id)
  ON UPDATE CASCADE
  ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_employee_id_key
  ON public.users(employee_id)
  WHERE employee_id IS NOT NULL;

-- Standardize auto ID columns and FK reference columns.
ALTER TABLE public.sales
  ALTER COLUMN id TYPE bigint
  USING id::bigint,
  ALTER COLUMN cash_amount TYPE numeric(12,2)
  USING cash_amount::numeric(12,2),
  ALTER COLUMN transfer_amount TYPE numeric(12,2)
  USING transfer_amount::numeric(12,2),
  ALTER COLUMN credit_amount TYPE numeric(12,2)
  USING credit_amount::numeric(12,2),
  ALTER COLUMN total_amount TYPE numeric(12,2)
  USING total_amount::numeric(12,2),
  ALTER COLUMN qr_amount TYPE numeric(12,2)
  USING qr_amount::numeric(12,2);

ALTER TABLE public.cash_deposits
  ALTER COLUMN id TYPE bigint
  USING id::bigint,
  ALTER COLUMN sale_id TYPE bigint
  USING sale_id::bigint,
  ALTER COLUMN expected_amount TYPE numeric(12,2)
  USING expected_amount::numeric(12,2),
  ALTER COLUMN deposited_amount TYPE numeric(12,2)
  USING deposited_amount::numeric(12,2),
  ALTER COLUMN slip_ocr_amount TYPE numeric(12,2)
  USING slip_ocr_amount::numeric(12,2);

ALTER TABLE public.sales_logs
  ALTER COLUMN id TYPE bigint
  USING id::bigint,
  ALTER COLUMN sale_id TYPE bigint
  USING sale_id::bigint;

ALTER TABLE public.bank_transactions
  ALTER COLUMN id TYPE bigint
  USING id::bigint,
  ALTER COLUMN deposit_id TYPE bigint
  USING deposit_id::bigint;

ALTER TABLE public.attachments
  ALTER COLUMN id TYPE bigint
  USING id::bigint,
  ALTER COLUMN entity_id TYPE bigint
  USING entity_id::bigint;

-- Deposit display fields used by both LINE bot and dashboard.
ALTER TABLE public.cash_deposits
  ADD COLUMN IF NOT EXISTS covered_from_date date,
  ADD COLUMN IF NOT EXISTS covered_to_date date,
  ADD COLUMN IF NOT EXISTS variance_amount numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS variance_reason text;

ALTER TABLE public.cash_deposits
  ALTER COLUMN variance_amount TYPE numeric(12,2)
  USING variance_amount::numeric(12,2);

-- Cash movement ledger. sale_cash is positive, deposit is negative.
CREATE TABLE IF NOT EXISTS public.branch_cash_ledger (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  branch_id integer NOT NULL,
  ledger_date date NOT NULL,
  entry_type character varying NOT NULL,
  sale_id bigint,
  cash_deposit_id bigint,
  amount numeric(12,2) NOT NULL,
  note text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.branch_cash_ledger
  ALTER COLUMN id TYPE bigint
  USING id::bigint,
  ALTER COLUMN sale_id TYPE bigint
  USING sale_id::bigint,
  ALTER COLUMN cash_deposit_id TYPE bigint
  USING cash_deposit_id::bigint,
  ALTER COLUMN amount TYPE numeric(12,2)
  USING amount::numeric(12,2);

ALTER TABLE public.branch_cash_ledger
  DROP CONSTRAINT IF EXISTS branch_cash_ledger_entry_type_check,
  DROP CONSTRAINT IF EXISTS branch_cash_ledger_adjustment_note_chk;

ALTER TABLE public.branch_cash_ledger
  ADD CONSTRAINT branch_cash_ledger_entry_type_check
    CHECK (entry_type IN ('sale_cash', 'deposit', 'adjustment')),
  ADD CONSTRAINT branch_cash_ledger_adjustment_note_chk
    CHECK (entry_type <> 'adjustment' OR NULLIF(btrim(COALESCE(note, '')), '') IS NOT NULL);

ALTER TABLE public.cash_deposits
  ADD CONSTRAINT cash_deposits_sale_id_fkey
  FOREIGN KEY (sale_id) REFERENCES public.sales(id);

ALTER TABLE public.sales_logs
  ADD CONSTRAINT sales_logs_sale_id_fkey
  FOREIGN KEY (sale_id) REFERENCES public.sales(id);

ALTER TABLE public.branch_cash_ledger
  ADD CONSTRAINT branch_cash_ledger_branch_id_fkey
  FOREIGN KEY (branch_id) REFERENCES public.branches(id),
  ADD CONSTRAINT branch_cash_ledger_sale_id_fkey
  FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE,
  ADD CONSTRAINT branch_cash_ledger_cash_deposit_id_fkey
  FOREIGN KEY (cash_deposit_id) REFERENCES public.cash_deposits(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_branch_cash_ledger_branch_date
  ON public.branch_cash_ledger(branch_id, ledger_date);

CREATE UNIQUE INDEX IF NOT EXISTS branch_cash_ledger_sale_cash_uid
  ON public.branch_cash_ledger(sale_id)
  WHERE sale_id IS NOT NULL AND entry_type = 'sale_cash';

CREATE UNIQUE INDEX IF NOT EXISTS branch_cash_ledger_deposit_uid
  ON public.branch_cash_ledger(cash_deposit_id)
  WHERE cash_deposit_id IS NOT NULL AND entry_type = 'deposit';

INSERT INTO public.branch_cash_ledger (branch_id, ledger_date, entry_type, sale_id, cash_deposit_id, amount, note)
SELECT
  s.branch_id,
  s.sell_date,
  'sale_cash',
  s.id,
  NULL,
  s.cash_amount,
  NULL
FROM public.sales s
WHERE COALESCE(s.status, '') <> 'rejected'
  AND COALESCE(s.cash_amount, 0) <> 0
ON CONFLICT DO NOTHING;

INSERT INTO public.branch_cash_ledger (branch_id, ledger_date, entry_type, sale_id, cash_deposit_id, amount, note)
SELECT
  d.branch_id,
  d.deposit_date,
  'deposit',
  NULL,
  d.id,
  -d.deposited_amount,
  NULL
FROM public.cash_deposits d
WHERE COALESCE(d.status, '') <> 'rejected'
  AND COALESCE(d.deposited_amount, 0) <> 0
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_branch_cash_ledger_from_sale()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.branch_cash_ledger
    WHERE sale_id = OLD.id
      AND entry_type = 'sale_cash';
    RETURN OLD;
  END IF;

  IF COALESCE(NEW.status, '') = 'rejected' OR COALESCE(NEW.cash_amount, 0) = 0 THEN
    DELETE FROM public.branch_cash_ledger
    WHERE sale_id = NEW.id
      AND entry_type = 'sale_cash';
    RETURN NEW;
  END IF;

  INSERT INTO public.branch_cash_ledger (branch_id, ledger_date, entry_type, sale_id, cash_deposit_id, amount, note)
  VALUES (NEW.branch_id, NEW.sell_date, 'sale_cash', NEW.id, NULL, NEW.cash_amount, NULL)
  ON CONFLICT (sale_id)
    WHERE sale_id IS NOT NULL AND entry_type = 'sale_cash'
  DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    ledger_date = EXCLUDED.ledger_date,
    amount = EXCLUDED.amount,
    cash_deposit_id = NULL,
    note = EXCLUDED.note;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_branch_cash_ledger_from_deposit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.branch_cash_ledger
    WHERE cash_deposit_id = OLD.id
      AND entry_type = 'deposit';
    RETURN OLD;
  END IF;

  IF COALESCE(NEW.status, '') = 'rejected' OR COALESCE(NEW.deposited_amount, 0) = 0 THEN
    DELETE FROM public.branch_cash_ledger
    WHERE cash_deposit_id = NEW.id
      AND entry_type = 'deposit';
    RETURN NEW;
  END IF;

  INSERT INTO public.branch_cash_ledger (branch_id, ledger_date, entry_type, sale_id, cash_deposit_id, amount, note)
  VALUES (NEW.branch_id, NEW.deposit_date, 'deposit', NULL, NEW.id, -NEW.deposited_amount, NULL)
  ON CONFLICT (cash_deposit_id)
    WHERE cash_deposit_id IS NOT NULL AND entry_type = 'deposit'
  DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    ledger_date = EXCLUDED.ledger_date,
    amount = EXCLUDED.amount,
    sale_id = NULL,
    note = EXCLUDED.note;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cruzy_sync_sale_cash_ledger ON public.sales;
DROP TRIGGER IF EXISTS trg_sync_branch_cash_ledger_from_sale ON public.sales;
CREATE TRIGGER trg_sync_branch_cash_ledger_from_sale
AFTER INSERT OR UPDATE OF branch_id, sell_date, cash_amount, status OR DELETE ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.sync_branch_cash_ledger_from_sale();

DROP TRIGGER IF EXISTS trg_cruzy_sync_deposit_cash_ledger ON public.cash_deposits;
DROP TRIGGER IF EXISTS trg_sync_branch_cash_ledger_from_deposit ON public.cash_deposits;
CREATE TRIGGER trg_sync_branch_cash_ledger_from_deposit
AFTER INSERT OR UPDATE OF branch_id, deposit_date, deposited_amount, status OR DELETE ON public.cash_deposits
FOR EACH ROW
EXECUTE FUNCTION public.sync_branch_cash_ledger_from_deposit();

COMMIT;
