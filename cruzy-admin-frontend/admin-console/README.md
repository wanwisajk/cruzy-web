# Cruzy Admin Console

Production-ready frontend shell for Cruzy back-office modules.

## Routes

- `/admin-console/` - redirects to the employee login/admin shell
- `/admin-console/modules/schedule/` - schedule management module
- `/admin-console/modules/employee/` - employee management module moved from `demo-dashboard-v2`
- `/admin-console/modules/payroll/` - reserved module folder
- `/admin-console/modules/reports/` - reserved module folder

## Module Convention

Each module owns its page, script, and styles:

```text
modules/{module-name}/
  index.html
  script.js
  assets/
    style.css
```

Shared fragments live in `shared/components`.
