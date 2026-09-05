# Taxman

A standalone UK tax and pension decision tool for people and agents. No runtime dependencies, external fonts, analytics, accounts or calculation requests. The distributable HTML works directly from disk, including its scenario comparisons and JSON export.

## Run

Requires Node 20+ for development and CLI use. No install step.

```sh
npm test
npm run build
npm start
```

Open http://127.0.0.1:4173/taxman/ or double-click `dist/index.html`. `dist/taxman-offline.html` is the portable single-file edition. The on-page download contains the default example inputs, not the user's financial data. JSON exports do contain their inputs.

## Deploy to jordanjoecooper.com

Copy the **contents** of `dist/` into the existing site's static `public/taxman/` directory, then use that site's normal build and deployment. The neighbouring `jordanjoecoopercom` project uses Astro, so these files can be served directly at `/taxman/` without changing the site's framework. This repository does not alter or publish the main site.

All asset paths are relative; any subdirectory works. Serve `.js` as JavaScript and HTML as HTML. HTTPS enables the scoped service worker for offline revisits; direct file use works without it. If the host uses a restrictive Content Security Policy, authorize the generated inline script/style hashes or configure a policy for this page. Do not add external assets or analytics if preserving the no-network design.

The service worker caches a versioned set of local artifacts, uses the network when available, and falls back to the installed version when offline. It only manages caches belonging to its own path. An offline copy cannot acquire new tax rules: rebuild and redistribute after verifying updates.

## Coverage

- 2025/26 and 2026/27: England, Scotland, Wales, Northern Ireland.
- Employment, sole-trader taxable profit, or taxable pension income, separately.
- Personal Allowance taper, progressive Income Tax, Class 1 / Class 4 NI and voluntary Class 2.
- Pension salary sacrifice, net pay, relief at source / SIPP, employer contributions and optional employer NI sharing.
- Student Plans 1, 2, 4 and 5, concurrent undergraduate plans, and postgraduate loans.
- Cash-versus-pension scenarios, allowance restoration, changing salary and switching contribution method.
- Annual, monthly-average and weekly-average breakdowns; band-level workings and JSON export.
- Pure JavaScript API, JSON Schema and stdin/file CLI for agents.

The interface lists calculation assumptions and flags minimum-wage and pension-allowance concerns. It does not compute pension tax charges, benefits, exact payslips or a complete Self Assessment bill. See [sources and methodology](SOURCES.md) and [API](API.md).

## Layout

- `src/engine.js`: pure calculation engine, CommonJS and browser global.
- `src/index.html`, `src/styles.css`, `src/app.js`: accessible, responsive UI.
- `scripts/build.cjs`: reproducible inlining and offline distribution.
- `test/engine.test.cjs`: independent fixtures, boundary and consistency checks.
- `test/distribution.test.cjs`: build, CLI, offline packaging and schema checks.

Do not hand-edit `dist/`. Update source, verify rules and tests, then rebuild.
