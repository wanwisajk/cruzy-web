-- Make employees.id and users.id manually assigned varchar(255) IDs.
-- users.id and employees.id are independent primary IDs.

BEGIN;

ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS schedules_employee_id_fkey;
ALTER TABLE public.leaves DROP CONSTRAINT IF EXISTS leaves_employee_id_fkey;
ALTER TABLE public.leave_balances DROP CONSTRAINT IF EXISTS leave_balances_employee_id_fkey;
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_employee_id_fkey;
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_submitted_by_fkey;
ALTER TABLE public.cash_deposits DROP CONSTRAINT IF EXISTS cash_deposits_deposited_by_fkey;
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_employee_id_fkey;
ALTER TABLE public.attendance_alerts DROP CONSTRAINT IF EXISTS attendance_alerts_employee_id_fkey;
ALTER TABLE public.warning_letters DROP CONSTRAINT IF EXISTS warning_letters_employee_id_fkey;
ALTER TABLE public.store_inspections DROP CONSTRAINT IF EXISTS store_inspections_submitted_by_fkey;
ALTER TABLE public.employee_branch_eligibility DROP CONSTRAINT IF EXISTS employee_branch_eligibility_employee_id_fkey;
ALTER TABLE public.employee_availability_overrides DROP CONSTRAINT IF EXISTS employee_availability_overrides_employee_id_fkey;
ALTER TABLE public.employee_availability_rules DROP CONSTRAINT IF EXISTS employee_availability_rules_employee_id_fkey;
ALTER TABLE public.employee_pay_profiles DROP CONSTRAINT IF EXISTS employee_pay_profiles_employee_id_fkey;
ALTER TABLE public.sales_logs DROP CONSTRAINT IF EXISTS sales_logs_edited_by_fkey;
ALTER TABLE public.salary_summaries DROP CONSTRAINT IF EXISTS salary_summaries_employee_id_fkey;

ALTER TABLE public.employees
  ALTER COLUMN id DROP IDENTITY IF EXISTS;

ALTER TABLE public.employees
  ALTER COLUMN id DROP DEFAULT;

ALTER TABLE public.users
  ALTER COLUMN id DROP IDENTITY IF EXISTS;

ALTER TABLE public.users
  ALTER COLUMN id DROP DEFAULT;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_employee_id_fkey;

DROP INDEX IF EXISTS public.users_employee_id_idx;

ALTER TABLE public.users
  DROP COLUMN IF EXISTS employee_id;

ALTER TABLE public.employees
  ALTER COLUMN id TYPE varchar(255)
  USING id::varchar(255);

ALTER TABLE public.users
  ALTER COLUMN id TYPE varchar(255)
  USING id::varchar(255);

ALTER TABLE public.schedules
  ALTER COLUMN employee_id TYPE varchar(255)
  USING employee_id::varchar(255);

ALTER TABLE public.leaves
  ALTER COLUMN employee_id TYPE varchar(255)
  USING employee_id::varchar(255);

ALTER TABLE public.leave_balances
  ALTER COLUMN employee_id TYPE varchar(255)
  USING employee_id::varchar(255);

ALTER TABLE public.contracts
  ALTER COLUMN employee_id TYPE varchar(255)
  USING employee_id::varchar(255);

ALTER TABLE public.sales
  ALTER COLUMN submitted_by TYPE varchar(255)
  USING submitted_by::varchar(255);

ALTER TABLE public.cash_deposits
  ALTER COLUMN deposited_by TYPE varchar(255)
  USING deposited_by::varchar(255);

ALTER TABLE public.attendance
  ALTER COLUMN employee_id TYPE varchar(255)
  USING employee_id::varchar(255);

ALTER TABLE public.attendance_alerts
  ALTER COLUMN employee_id TYPE varchar(255)
  USING employee_id::varchar(255);

ALTER TABLE public.warning_letters
  ALTER COLUMN employee_id TYPE varchar(255)
  USING employee_id::varchar(255);

ALTER TABLE public.store_inspections
  ALTER COLUMN submitted_by TYPE varchar(255)
  USING submitted_by::varchar(255);

ALTER TABLE public.employee_branch_eligibility
  ALTER COLUMN employee_id TYPE varchar(255)
  USING employee_id::varchar(255);

ALTER TABLE public.employee_availability_overrides
  ALTER COLUMN employee_id TYPE varchar(255)
  USING employee_id::varchar(255);

ALTER TABLE public.employee_availability_rules
  ALTER COLUMN employee_id TYPE varchar(255)
  USING employee_id::varchar(255);

ALTER TABLE public.employee_pay_profiles
  ALTER COLUMN employee_id TYPE varchar(255)
  USING employee_id::varchar(255);

ALTER TABLE public.sales_logs
  ALTER COLUMN edited_by TYPE varchar(255)
  USING edited_by::varchar(255);

ALTER TABLE public.salary_summaries
  ALTER COLUMN employee_id TYPE varchar(255)
  USING employee_id::varchar(255);

ALTER TABLE public.schedules
  ADD CONSTRAINT schedules_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);

ALTER TABLE public.leaves
  ADD CONSTRAINT leaves_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);

ALTER TABLE public.leave_balances
  ADD CONSTRAINT leave_balances_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);

ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);

ALTER TABLE public.sales
  ADD CONSTRAINT sales_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.employees(id);

ALTER TABLE public.cash_deposits
  ADD CONSTRAINT cash_deposits_deposited_by_fkey FOREIGN KEY (deposited_by) REFERENCES public.employees(id);

ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);

ALTER TABLE public.attendance_alerts
  ADD CONSTRAINT attendance_alerts_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);

ALTER TABLE public.warning_letters
  ADD CONSTRAINT warning_letters_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);

ALTER TABLE public.store_inspections
  ADD CONSTRAINT store_inspections_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.employees(id);

ALTER TABLE public.employee_branch_eligibility
  ADD CONSTRAINT employee_branch_eligibility_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);

ALTER TABLE public.employee_availability_overrides
  ADD CONSTRAINT employee_availability_overrides_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);

ALTER TABLE public.employee_availability_rules
  ADD CONSTRAINT employee_availability_rules_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);

ALTER TABLE public.employee_pay_profiles
  ADD CONSTRAINT employee_pay_profiles_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);

ALTER TABLE public.sales_logs
  ADD CONSTRAINT sales_logs_edited_by_fkey FOREIGN KEY (edited_by) REFERENCES public.employees(id);

ALTER TABLE public.salary_summaries
  ADD CONSTRAINT salary_summaries_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);

COMMIT;
