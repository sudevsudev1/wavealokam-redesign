

# Wavealokam Ops — Phase 1 (Revised)

## Changes from Original Plan

1. **Supabase Auth replaces custom auth** — email/password login via `supabase.auth.signInWithPassword()`, no OTP, no magic links
2. **ops_branches table added** — all ops tables get `branch_id` with RLS scoping
3. **ops_user_profiles replaces ops_users** — linked to `auth.users` via foreign key, stores role/name/language/branch
4. **Immutable audit log** — append-only, no UPDATE/DELETE policies
5. **Roles enforced via RLS** — security definer function `ops_has_role(uid, role)` used in all policies

## Database Schema (Phase 1)

```text
auth.users (Supabase managed)
  └── ops_user_profiles (user_id FK → auth.users.id)
        ├── role: enum (manager, admin)
        ├── display_name: text
        ├── preferred_language: text (en/ml)
        └── branch_id FK → ops_branches.id

ops_branches
  ├── id (uuid PK)
  ├── name (text)
  ├── location (text)
  └── is_active (bool)

ops_rooms
  ├── id (text PK, e.g. "101")
  ├── room_type (text)
  ├── branch_id FK → ops_branches.id
  └── is_active (bool)

ops_config_registry
  ├── key (text PK)
  ├── value_json (jsonb)
  ├── branch_id FK → ops_branches.id
  └── updated_by, updated_at

ops_audit_log (APPEND-ONLY)
  ├── id (uuid PK)
  ├── entity_type, entity_id
  ├── action (create/update/delete)
  ├── before_json, after_json
  ├── performed_by (uuid → auth.users)
  ├── branch_id FK → ops_branches.id
  └── performed_at (timestamptz, default now())
```

## Auth Flow

1. Pre-create 4 Supabase Auth accounts (email/password) for Anandhu, Jeevan, Amardeep, Sudev
2. Insert corresponding `ops_user_profiles` rows linking each `auth.users.id` to their role and the default branch
3. Login screen at `/ops` — simple email + password form calling `supabase.auth.signInWithPassword()`
4. Session managed entirely by Supabase (auto-refresh, persistent). No manual localStorage tokens
5. On login, fetch profile to get role/name/language/branch, store in React context
6. Admin step-up: separate confirmation password prompt for sensitive actions (client-side gate calling `supabase.auth.signInWithPassword()` again to re-verify)

## RLS Strategy

```sql
-- Role enum
CREATE TYPE ops_role AS ENUM ('manager', 'admin');

-- Security definer to check role (avoids recursive RLS)
CREATE FUNCTION ops_has_role(_user_id uuid, _role ops_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM ops_user_profiles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Branch scoping helper
CREATE FUNCTION ops_user_branch_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT branch_id FROM ops_user_profiles
  WHERE user_id = _user_id;
$$;

-- Example RLS on ops_rooms:
-- SELECT: authenticated + same branch
-- INSERT/UPDATE/DELETE: admin + same branch

-- ops_audit_log:
-- INSERT only for authenticated (append-only)
-- SELECT for admin + same branch
-- No UPDATE or DELETE policies (immutable)
```

## Seed Data

- 1 branch: "Wavealokam Edava" (Varkala)
- 4 auth users created with simple passwords (user provides or we set defaults they change)
- 4 profile rows: Anandhu (manager), Jeevan (manager), Amardeep (admin), Sudev (admin)
- 5 rooms: 101-104 (Double), 202 (King)
- Config registry: all 16 default keys from the spec

## UI Components (Phase 1)

1. **`/ops` route** — Login page (email + password, minimal)
2. **`/ops/home`** — Protected route, role-based:
   - Manager: "My Tasks" placeholder table + Vector dock placeholder + Purchase dock placeholder
   - Admin: same + live operations panel placeholder + at-risk strip placeholder
3. **Top navigation** — Home, Tasks, Inventory, Purchase, Guest Log, Shift Punch, Daily Report, Admin Console (admin only)
4. **Global header** — Language toggle (EN/ML), network status indicator, last-saved timestamp
5. **Auth guard component** — redirects unauthenticated users to `/ops`
6. **Offline infrastructure** — IndexedDB wrapper for draft autosave, sync queue service with status display, client-generated UUIDs

## File Structure

```text
src/
├── ops/
│   ├── OpsApp.tsx          (sub-router for /ops/*)
│   ├── contexts/
│   │   ├── OpsAuthContext.tsx
│   │   ├── OpsLanguageContext.tsx
│   │   └── OpsOfflineContext.tsx
│   ├── components/
│   │   ├── OpsLayout.tsx    (nav + header + auth guard)
│   │   ├── OpsLogin.tsx
│   │   ├── NetworkStatus.tsx
│   │   └── LanguageToggle.tsx
│   ├── pages/
│   │   ├── OpsHome.tsx
│   │   ├── ManagerHome.tsx
│   │   └── AdminHome.tsx
│   ├── lib/
│   │   ├── offlineDb.ts     (IndexedDB wrapper)
│   │   ├── syncQueue.ts     (queue + retry)
│   │   └── translations.ts  (UI label map EN/ML)
│   └── hooks/
│       └── useOpsAuth.ts
```

## What Phase 1 Delivers

- Working login at `/ops` with Supabase Auth
- Role-based home screen (manager vs admin) with placeholder sections
- Branch-scoped RLS on all foundation tables
- Append-only audit log infrastructure
- Offline draft autosave and sync queue (ready for Phase 2 forms)
- Language toggle switching UI labels between English and Malayalam
- Network status indicator

## What Phase 1 Does NOT Include

- Tasks, inventory, purchase, guest log, shift punch, daily reports, Vector (Phases 2-7)
- Actual bilingual auto-translation via AI (Phase 2)
- PWA manifest and service worker (Phase 7)

