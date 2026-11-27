# SecondShift

B2B marketplace for used business electronics. Companies list laptops, monitors, keyboards… and startups / small businesses buy them for less.

Stack: React + Vite · Supabase (database, auth, storage) · GitHub Pages (demo) · Docker / Codespaces (dev).

## Run it

First copy `.env.example` to `.env` and fill in the Supabase URL + publishable key.

**Docker (hot reload)**
```bash
docker compose up
```
→ http://localhost:5173

**Docker (production build served by nginx)**
```bash
docker compose --profile prod up --build web-prod
```
→ http://localhost:8080

**Without Docker**
```bash
npm install
npm run dev
```

**GitHub Codespaces:** open the repo in a Codespace; `.devcontainer/` installs everything. Then run `npm run dev`.

**GitHub Pages:** `.github/workflows/deploy-pages.yml` deploys `main`. Set repo secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and choose *Settings → Pages → Source: GitHub Actions*.

## Project structure

```
src/
  styles/            design system: tokens.css (colours, spacing), components.css, layout.css
  components/ui/     shared UI kit — Button, Input, Card, Badge, Modal, ProductCard … (use on BOTH sides)
  components/layout/ AuthLayout
  context/           AuthContext (user, profile, account type, active company)
  lib/               supabase client, constants (mirror DB enums), formatting, storage helpers
  features/auth/     shared login / register / choose seller-or-buyer
  features/seller/   seller side (Person A)
  features/buyer/    buyer side (Person B) — placeholder for now
supabase/
  migrations/        database schema (source of truth)
  seed.sql           categories + spec fields
```

## User flow

1. **Register** (same for everyone) → 2. **Choose** “I want to sell” / “I want to buy” (stored in `user_metadata.account_type`)
3. Sellers → **create company** → **seller dashboard** (`/#/seller`)
4. Buyers → `/#/buyer` (to be built)

## Seller side (done)

- Company profile + logo, pickup locations
- Verification request (document upload → `seller_verifications`) for the verified-seller badge
- 6-step listing wizard: category & grade · category-specific specs · photos (drag & drop, reorder, cover) & defects · single/bulk quantity, price, volume discounts · usage, battery, accessories, warranty, returns · pickup, data-wipe method/certificate, data-wiped + ownership confirmations
- Drafts, live preview, publish checklist
- Dashboard: stats, status tabs, search, edit, publish, pause/resume, mark (partially) as sold, duplicate, delete

## Notes for the buyer side

- Use `public.listing_cards` (a view) for the browse page — it already has cover photo, company name, city and `seller_verified`.
- Use `<ProductCard>` from `components/ui` so cards look identical on both sides.
- Photo URLs: `publicUrl(BUCKETS.listingPhotos, path)` from `lib/storage.js`.
- Approving a verification (demo): set `status = 'verified'` on the row in `seller_verifications` (Supabase table editor) — the badge updates automatically.
