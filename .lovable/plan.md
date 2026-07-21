# UFBC AGRODEALER — Build Plan

Private inventory & sales system for one fertilizer/seed business in Rwanda. Kinyarwanda UI, two roles (Owner, Manager), multi-branch.

## Stack
- TanStack Start + React + Tailwind v4 + shadcn
- Lovable Cloud (Postgres + Auth) for backend
- Email/password auth (single business — no Google needed unless you want it)
- PDF export via jsPDF + autotable

## Database schema

```text
profiles(id → auth.users, full_name, phone, created_at)
user_roles(user_id, role: 'owner'|'manager', branch_id nullable)
branches(id, name, phone, address, status, created_at)
products(id, name, category: 'ifumbire'|'imbuto', buying_price, selling_price, unit, status)
purchases(id, branch_id, supplier, product_id, quantity, buying_price, transport_cost, purchase_date, created_by)
sales(id, branch_id, product_id, quantity, selling_price, unit_cost, profit, sale_date, created_by)
inventory(branch_id, product_id, quantity)  -- current stock per branch
inventory_movements(id, branch_id, product_id, type: 'in'|'out', quantity, ref_type, ref_id, created_at)
expenses(id, branch_id, description, amount, expense_date, created_by)
```

- Triggers: on purchase insert → +stock + movement; on sale insert → check stock, -stock, compute profit, + movement.
- `has_role(uid, role)` security-definer function for RLS.
- RLS: owner sees all; manager sees only their assigned branch data.

## Modules (all Kinyarwanda UI)

1. **Auth** — Injira / Iyandikishe. First registered user auto-becomes owner (seed via trigger when `user_roles` empty).
2. **Ikibaho (Dashboard)** — today's sales, today's profit, remaining stock, low stock, recent transactions.
3. **Amashami (Branches)** — Owner CRUD.
4. **Ibicuruzwa (Products)** — Owner CRUD, category filter.
5. **Kurangura (Purchases)** — Form + list; auto stock-in.
6. **Kugurisha (Sales)** — Form + list; auto stock-out + profit.
7. **Ububiko (Inventory)** — Per branch stock view, movements.
8. **Ibyakoreshejwe (Expenses)** — simple list + form.
9. **Raporo (Reports)** — Daily & monthly, PDF download.
10. **Abakoresha (Users)** — Owner assigns managers to branches.

## Layout
- Collapsible sidebar (shadcn) with Kinyarwanda labels + Lucide icons
- Top header with branch switcher (owner) / branch label (manager) + logout
- Design: clean, soft radii, muted green accent (agriculture feel), professional cards & tables

## Validation & errors
- Zod schemas on all forms; Kinyarwanda error messages
- Stock guard on sale (DB trigger + client check)
- Toasts in Kinyarwanda

## Files to create (high-level)
- `src/routes/_authenticated/` layout + module pages
- `src/routes/auth.tsx`
- `src/components/app-sidebar.tsx`, `src/components/branch-switcher.tsx`
- `src/lib/queries/*.functions.ts` (server fns per module)
- `src/lib/pdf.ts` (report generator)
- Migrations for schema + RLS + triggers

## Out of scope (per spec)
No AI, barcode, notifications, accounting, or debt tracking. Excel export deferred (report data structured to enable it later).

Proceeding will enable Lovable Cloud and scaffold in phases: DB → Auth → Layout → CRUD modules → Reports.