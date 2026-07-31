<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./.github/assets/acme-logo-white.png">
  <img alt="Account Center Starter" src="./.github/assets/acme-logo.png" height="52">
</picture>

# Account Center Starter

**A production-grade self-service account center + custom Midtrans Core API checkout — ready to fork.**

Auth, subscriptions, entitlements, invoices, saved cards, and a fully custom-branded checkout
(QRIS, Virtual Account, e-wallet, card 3DS, Payment Link, recurring) for the Indonesian market.
Bring your own brand and catalog; the payment engine and account plumbing are done.

<p>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-149ECA?style=for-the-badge&logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white">
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-6-2D3748?style=for-the-badge&logo=prisma&logoColor=white">
  <img alt="Midtrans" src="https://img.shields.io/badge/Midtrans-Core%20API-0B7BE9?style=for-the-badge">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-3FB950?style=for-the-badge">
</p>

</div>

> [!NOTE]
> This is a **template** derived from a real production system, with all brand and business data
> removed. Names like "Acme", `example.com`, and the sample catalog are placeholders for you to
> replace. See [Make it yours](#make-it-yours).

## Why this exists

Building a payment + account layer correctly is deceptively hard: webhook signature
verification, idempotency, monotonic status transitions, server-authoritative pricing, saved-card
tokenization, and PDP/PCI hygiene. This starter has all of that already implemented and tested, so
you can skip months of foundational work and focus on your product.

## Features

- **Auth** (Better Auth): email+password, email OTP, password reset, 2FA (TOTP), sessions,
  optional Cloudflare Turnstile anti-bot.
- **Custom Midtrans Core API checkout**: QRIS, GoPay, ShopeePay, Virtual Account
  (BCA/BNI/BRI/Permata/CIMB), Mandiri Bill, and Card with 3D Secure — all rendered in your own UI
  (not the hosted Snap popup). Plus Payment Link and Subscription (recurring) support.
- **Guest checkout**: buy without an account; the account is created by the verified webhook on
  success (deferred registration), with a set-password email.
- **Billing model**: `Product`, `Subscription`, `Invoice`, `Entitlement`, `PaymentEvent`,
  `PaymentMethod` (saved cards, One Click) — a universal account-center schema.
- **Security by design**: webhook signature verified before any mutation, idempotent + monotonic
  state machine, server-authoritative pricing, unguessable order ids, saved-card ownership checks,
  security headers, constant-time secret comparison, PII-scrubbed error monitoring.
- **Tests**: Vitest unit suite for the money/access-critical pure functions.

> [!IMPORTANT]
> **Money is server-authoritative.** Prices are never trusted from the client/URL; they are
> re-resolved on the server, and access is granted only by the verified Midtrans webhook.

## Tech stack

| Part | Tech |
|------|------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, Server Components) |
| UI | [React 19](https://react.dev/) + [Tailwind CSS v4](https://tailwindcss.com/) |
| ORM | [Prisma 6](https://www.prisma.io/) — SQLite (dev), MySQL/PostgreSQL (prod) |
| Auth | [Better Auth](https://www.better-auth.com/) |
| Payments | [Midtrans Core API](https://docs.midtrans.com/) |
| Email | [Nodemailer](https://nodemailer.com/) |
| Tests | [Vitest](https://vitest.dev/) |

## Quick start

```bash
npm install
cp .env.example .env          # set BETTER_AUTH_SECRET (openssl rand -base64 32)
npx prisma db push            # create dev.db + tables
npm run seed                  # sample catalog + demo account
npm run dev                   # http://localhost:3000
```

Run the tests:

```bash
npm run test
```

## Make it yours

1. **Brand**: replace `public/acme-logo*.png`, `src/app/icon.svg`, and the `Acme` name; tune
   colors/typography in `src/app/globals.css`.
2. **Catalog**: edit `src/lib/catalog.ts`, `src/lib/products.ts`, `src/lib/services.ts` with your
   own products and prices (remove the samples).
3. **Payments**: get Midtrans **Sandbox** keys and set `MIDTRANS_SERVER_KEY` +
   `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` in `.env`. Point the Midtrans dashboard **Payment
   Notification URL** at `/api/webhook/midtrans` (use a tunnel like `cloudflared` for local dev).
3. **Email**: set `MAIL_*` (SMTP). Without it, OTP/receipt emails print to the server console in dev.
4. **Trust copy**: edit `src/components/pay/checkout-trust.tsx` for your business.
5. **Deploy**: Vercel + a managed Postgres (Neon/Supabase), or the included `Dockerfile` on a VPS.

## Environment

See [`.env.example`](./.env.example). Minimum to boot: `DATABASE_URL`, `BETTER_AUTH_SECRET`,
`BETTER_AUTH_URL`. Add `MIDTRANS_*` for payments and `MAIL_*` for real emails.

## Project structure

```
src/
  app/
    (app)/           # logged-in dashboard: overview, profile, security, subscription,
                     # payment methods, payments, access, notifications, privacy
    beli, checkout, bayar/[orderId], terima-kasih   # checkout (guest & logged-in)
    api/pay/**, api/webhook/midtrans, api/provision  # payment engine
  components/pay/**, components/dashboard/**          # checkout + dashboard UI
  lib/midtrans/**    # reusable Midtrans Core API client (charge, status, webhook signature,
                     # subscription, payment-link, BIN) — the heart of the template
prisma/              # schema.prisma, seed.ts
test/                # Vitest unit tests
```

## Security & compliance

Payment code follows Midtrans integration best practices (signature-before-mutation, idempotency,
amount cross-checks). No card PAN/CVV is ever stored server-side (SAQ-A aligned). See
[SECURITY.md](./SECURITY.md). Review and complete data-subject-rights and retention for your
jurisdiction before production.

## License

[MIT](./LICENSE) — free to use, modify, and build upon.
