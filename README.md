# FlashTech

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.27.

## Supabase setup

The application uses the publishable Supabase key from `src/environments/environment.ts` and `environment.prod.ts`. Never put a `service_role` key in frontend code.

The existing authentication/profile setup must include `public.is_admin()`. Run these migrations in order in the Supabase SQL editor:

1. `supabase/products-migration.sql`
2. `supabase/store-support-migration.sql`
3. `supabase/order-security-migration.sql`
4. `supabase/hero-and-history-migration.sql`
5. `supabase/admin-policies.sql`
6. `supabase/admin-workflows-migration.sql`

The final admin workflow migration creates the public `hero-images` Storage bucket and admin-only write policies, adds the protected `set_user_role` function used by the Users screen, and adds the profile creation timestamp used by the admin user list. Never place a Supabase `service_role` key in Angular code; browser uploads and role changes use the publishable key with Storage RLS and database checks.

Hero slide images can be selected as local files in the admin form and are uploaded to the `hero-images` Storage bucket when the slide is saved. Product images remain URL-based.

Enable Email and Google providers under Supabase Authentication. Add the local and deployed application URLs to the provider redirect/origin allowlists. Google OAuth client credentials belong in Supabase project settings; the browser only uses Supabase Auth.

## Performance testing (Lighthouse)
Run Lighthouse against the **production build**, never `ng serve`. The dev server
ships unminified, unsplit JavaScript, so audits like "Minify JavaScript" and
"Reduce unused JavaScript" fail even though production is already optimized.

```bash
ng build --configuration production
# serve dist/flash-tech/browser with any static server, then run Lighthouse on it
```

The production build already: minifies JS/CSS, content-hashes filenames for
immutable caching, splits ~40 lazy chunks per route, and tree-shakes unused code.
`public/_headers` adds long-lived `Cache-Control` for hashed assets (and
revalidation for `index.html`).

Remaining Performance items that need infrastructure, not app code:
- **Improve image delivery / efficient images**: hero and product images come from
  Supabase Storage as uploaded (often large JPEG/PNG). Serve modern, resized
  formats (WebP/AVIF) via Supabase image transformations or a CDN, and upload
  right-sized images from the admin screens.
- **LCP / render-blocking fonts**: fonts use `display=swap` and `preconnect`.
  Self-hosting the two font families would remove the third-party round trip.

## Security model
This is a static Angular SPA; Supabase is the backend and its Row Level Security
policies are the authorization boundary. Do not rely on the admin route guard for
security — the database policies enforce access server-side.

- **Secrets**: the browser only ever receives the Supabase publishable key. A
  `service_role` key must never appear in front-end code or in this repository.
  Copy `.env.example` to `.env` for local overrides; `.env` is git-ignored.
- **Input validation**: auth, contact, checkout, and admin forms validate and
  trim user input before it reaches Supabase, which additionally enforces column
  constraints and RLS checks.
- **Headers**: `src/index.html` sets a baseline CSP and hardening meta tags, and
  `public/_headers` ships the full set (HSTS, `X-Frame-Options`, `Permissions-Policy`,
  CSP) for hosts that support header files (Netlify / Cloudflare Pages). Configure
  the equivalent headers in your CDN or reverse proxy for other hosts.
- **File uploads**: product and hero images are validated client-side for type and
  size (≤5 MB) and stored in public buckets whose write policies require
  `public.is_admin()`.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
