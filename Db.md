## Table `attendance`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `employee_id` | `varchar` |  |
| `branch_id` | `varchar` |  |
| `work_date` | `date` |  |
| `clock_in` | `time` |  Nullable |
| `clock_out` | `time` |  Nullable |
| `late_minutes` | `int4` |  Nullable |
| `break_start` | `time` |  Nullable |
| `break_minutes` | `int4` |  Nullable |
| `is_break_over` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `attendance_alerts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `alert_type` | `varchar` |  |
| `employee_id` | `varchar` |  |
| `branch_id` | `varchar` |  |
| `work_date` | `date` |  |
| `title` | `varchar` |  |
| `detail` | `text` |  Nullable |
| `severity` | `varchar` |  Nullable |
| `is_acknowledged` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `bank_accounts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `varchar` | Primary |
| `bank_name` | `varchar` |  |
| `bank_short` | `varchar` |  |
| `account_no` | `varchar` |  |
| `account_name` | `varchar` |  |
| `account_type` | `varchar` |  Nullable |
| `color_code` | `varchar` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `branches`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `varchar` | Primary |
| `name` | `varchar` |  |
| `code` | `varchar` |  Unique |
| `region_id` | `varchar` |  Nullable |

## Table `cash_deposits`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `deposit_date` | `date` |  |
| `branch_id` | `varchar` |  |
| `expected_amount` | `int4` |  |
| `deposited_amount` | `int4` |  |
| `slip_url` | `text` |  Nullable |
| `status` | `varchar` |  |
| `created_at` | `timestamptz` |  Nullable |
| `bank_account_id` | `varchar` |  Nullable |
| `deposited_by` | `varchar` |  Nullable |
| `verified_by` | `varchar` |  Nullable |
| `verified_at` | `timestamptz` |  Nullable |

## Table `contracts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `employee_id` | `varchar` |  |
| `contract_type` | `varchar` |  |
| `start_date` | `date` |  |
| `end_date` | `date` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `employees`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `varchar` | Primary |
| `name` | `varchar` |  |
| `code` | `varchar` |  Unique |
| `color` | `varchar` |  |
| `position` | `varchar` |  Nullable |
| `salary` | `int4` |  Nullable |
| `status` | `varchar` |  Nullable |
| `region_id` | `varchar` |  Nullable |

## Table `leave_balances`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `employee_id` | `varchar` | Primary |
| `annual_remaining` | `int4` |  |
| `vacation_remaining` | `int4` |  |
| `sick_used` | `int4` |  |
| `personal_used` | `int4` |  |
| `updated_at` | `timestamptz` |  Nullable |

## Table `leaves`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `employee_id` | `varchar` |  |
| `leave_type` | `varchar` |  |
| `start_date` | `date` |  |
| `end_date` | `date` |  |
| `days_count` | `int4` |  |
| `reason` | `text` |  Nullable |
| `status` | `varchar` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `regions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `varchar` | Primary |
| `name` | `varchar` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `sales`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `sell_date` | `date` |  |
| `branch_id` | `varchar` |  |
| `cash_amount` | `int4` |  |
| `transfer_amount` | `int4` |  |
| `credit_amount` | `int4` |  |
| `total_amount` | `int4` |  |
| `orders_count` | `int4` |  |
| `created_at` | `timestamptz` |  Nullable |
| `edit_logs` | `jsonb` |  Nullable |

## Table `schedules`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary Identity |
| `branch_id` | `varchar` |  |
| `employee_id` | `varchar` |  |
| `work_date` | `date` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `store_inspections`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `branch_id` | `varchar` |  |
| `work_date` | `date` |  |
| `submitted_by` | `varchar` |  Nullable |
| `submit_time` | `time` |  |
| `status` | `varchar` |  Nullable |
| `inspection_items` | `jsonb` |  |
| `reviewed_by` | `varchar` |  Nullable |
| `review_time` | `time` |  Nullable |
| `manager_note` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `users`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `username` | `varchar` |  Unique |
| `password_hash` | `varchar` |  |
| `name` | `varchar` |  |
| `role` | `varchar` |  |
| `scope_type` | `varchar` |  |
| `scope_value` | `varchar` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `warning_letter_templates`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `varchar` | Primary |
| `level` | `varchar` |  |
| `name` | `varchar` |  |
| `description` | `text` |  Nullable |
| `body_template` | `text` |  |

## Table `warning_letters`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `employee_id` | `varchar` |  |
| `template_id` | `varchar` |  Nullable |
| `level` | `varchar` |  |
| `issue_date` | `date` |  |
| `reason` | `text` |  |
| `branch_id` | `varchar` |  Nullable |
| `issued_by` | `varchar` |  |
| `status` | `varchar` |  Nullable |
| `is_signed_by_emp` | `bool` |  Nullable |
| `signed_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

