---
name: Super User Role Implementation
description: Details of the super_user system-level role added to the platform, including files changed and behavior
type: project
---

The super_user role was implemented as a system-level platform role (stored in the `rol` table, carried in the JWT as `nombre_rol`).

**Why:** Story Points 8 task to support a new role above admin that has global, unrestricted access to the entire platform without needing company membership.

**How to apply:** When working with auth/RBAC code, remember that super_user bypasses ALL company and project membership checks. It is NOT a company-level role — it lives in the `rol` table alongside 'admin' and 'usuario'.

Files changed:
- `backend/kontrol.sql` — added super_user seed to `rol` table INSERT
- `backend/src/db/bootstrap.js` — INSERT super_user ON CONFLICT DO NOTHING (for existing DBs)
- `backend/src/middleware/requireSuperUser.js` (NEW) — enforces super_user-only access
- `backend/src/middleware/requireCompany.js` — super_user skips membership check, verifies company exists
- `backend/src/middleware/requireCompanyRole.js` — super_user passes without role check
- `backend/src/middleware/requireCompanyOwner.js` — super_user passes without owner check
- `backend/src/middleware/requireProjectPermission.js` — super_user gets all DEFAULT_PROJECT_PERMISSION_NAMES
- `backend/src/schemas/userSchemas.js` — added 'super_user' to VALID_ROLES
- `backend/src/routes/userRoutes.js` — requireRole now accepts 'admin' OR 'super_user'
- `backend/src/controllers/globalController.js` (NEW) — getAllCompanies, getPlatformStats
- `backend/src/routes/globalRoutes.js` (NEW) — GET /api/global/companies, GET /api/global/stats
- `backend/src/router.js` — mounts /global routes

Global routes (super_user only):
- GET /api/global/companies — all companies with user/project counts
- GET /api/global/stats — platform-wide stats (users, companies, projects)

When requireCompany runs for super_user, req.empresa.rol_empresa is set to 'super_user' (not a real company role). Downstream services that check company roles (like projectAccessService.hasEmpresaManagementAccess) will NOT recognize 'super_user' as a management role — that's fine because the middleware bypasses those checks before reaching service code.
