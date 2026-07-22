## Goal
Explain step-by-step how to enable the "Ongeraho" button on Kurangura and add stock, AND add helpful empty-state hints in the UI so future users aren't stuck.

## How to make it work (do this now in the running app)

The "Ongeraho" button on **Kurangura** stays disabled until BOTH a branch and a product exist. Follow in order:

**Step 1 — Add a branch (Amashami)**
1. Click **Amashami** in the left sidebar.
2. Click **Ongeraho** (top right).
3. Fill in: **Izina** (required, e.g. "Kigali Main"), Telefone, Aderesi.
4. Leave **Active** switch on.
5. Click **Bika**.

**Step 2 — Add a product (Ibicuruzwa)**
1. Click **Ibicuruzwa** in the sidebar.
2. Click **Ongeraho**.
3. Fill in: Izina (e.g. "DAP"), Category (Ifumbire / Imbuto), Unit (kg, sac…), Buying Price, Selling Price.
4. Click **Bika**.

**Step 3 — Record a purchase to add stock (Kurangura)**
1. Click **Kurangura**. The **Ongeraho** button is now enabled.
2. Click **Ongeraho**.
3. Select **Ishami** (branch), **Igicuruzwa** (product), type **Umuranguzi** (supplier), **Ingano** (quantity), Buying Price (auto-filled), Transport Cost, Date.
4. Click **Bika** → stock automatically increases in **Ububiko**.

**Step 4 — Verify stock**
- Open **Ububiko** to see updated quantities.

**Step 5 — Sell (Kugurisha)** — reduces stock and computes profit automatically.

## UI improvement to build

Add small empty-state hints so the flow is obvious without asking:

1. **Kurangura page** — when the Ongeraho button is disabled, show a yellow banner above the table:
   - If no branches: "Banza wongereho ishami muri Amashami" + link button to /branches.
   - If no products: "Banza wongereho igicuruzwa muri Ibicuruzwa" + link button to /products.
2. **Kugurisha page** — same pattern (needs branch + product + stock).
3. **Dashboard** — if branches or products list is empty, show a "Tangira hano" card with 3 numbered steps linking to Amashami → Ibicuruzwa → Kurangura.

## Files to edit
- `src/routes/_authenticated.purchases.tsx` — add empty-state banner.
- `src/routes/_authenticated.sales.tsx` — same.
- `src/routes/_authenticated.dashboard.tsx` — add onboarding card when empty.

## Out of scope
No schema changes, no new routes, no logic changes to purchases/sales triggers.