# UND — Playwright test collection

End-to-end tests for [und.com.ua](https://und.com.ua) (Ukraine Nintendo Daily). Runs against
**production** — there's no staging environment — so the suite is written and tuned with that
constraint in mind (see [Notes on running against production](#notes-on-running-against-production)).

## Requirements

- Node.js and npm
- A GitHub/npm-installable environment with internet access (Playwright downloads browser binaries
  on install)

## Setup

```bash
npm install
npx playwright install      # downloads the browser binaries (first time / after a Playwright upgrade)
```

### Authenticated tests: SESSION_ID

Some specs (`cabinet.spec.js`, `games-personal.spec.js`, and the authenticated block in
`a11y.spec.js`) exercise pages behind login (`/cabinet`, `/my/*`) using a **real account session
cookie** — there's no test/seed account, so this borrows a live `session_id` cookie instead of
scripting an actual login flow (submitting real credentials repeatedly against prod risks rate
limiting / lockout).

1. Create a `.env` file in this directory (`clients/UND/.env`) — it's gitignored, never commit it:

   ```
   SESSION_ID=<value>
   ```

2. Get the value: log into und.com.ua in your own browser, open devtools → Application/Storage →
   Cookies → `und.com.ua`, and copy the `session_id` cookie's value.

3. `tests/authed.fixtures.js` reads `SESSION_ID` and injects it as a cookie into the test browser
   context — see that file for how it's wired in.

**The session WILL expire.** If authenticated tests start failing with a redirect to `/web/login`
(or `SESSION_ID env var missing` if you forgot step 1), grab a fresh cookie value and update `.env`.

Without `SESSION_ID` set, every authenticated spec fails fast with a clear error — the rest of the
suite (anonymous pages) runs fine regardless.

## Running tests

```bash
npx playwright test                        # all tests, all configured browsers
npx playwright test tests/homepage.spec.js  # a single file
npx playwright test -g "test name"          # tests matching a title
npx playwright test --headed                # visible browser
npx playwright test --ui                    # Playwright's UI mode
npx playwright show-report                  # open the last HTML report
```

Or via the npm scripts in `package.json`: `npm test`, `npm run test:headed`, `npm run test:ui`,
`npm run report`.

## Structure

```
src/pages/    Page Object Model classes — one file per page, locators + action methods
tests/        Spec files, plus:
  fixtures.js         base `test` — pre-seeds the cookie-consent cookie
  authed.fixtures.js   extends fixtures.js with the SESSION_ID cookie (see above)
  a11y-baseline.json   accepted axe-core violations per project/page (see below)
```

## Notes on running against production

- **No staging.** Tests avoid state-mutating actions (real form submissions, login/signup,
  purchases, posting comments) unless explicitly scoped and safe — see the safety comments at the
  top of `cabinet.spec.js` and `games-personal.spec.js`.
- **`games-personal.spec.js` mutates a real, shared account's game library** (adds/removes/
  switches wishlist status). It's restricted to a single project (`chromium`) and runs its tests
  serially — parallel browsers would race to mutate the same account state. Each test uses a
  throwaway, currently-untouched game as its fixture and restores state in a `finally` block, with
  one intentional exception (removing/restoring a real Want-list item) called out in that file's
  header comment.
- **`workers` in `playwright.config.js`** is tuned empirically (currently `4`) — the site has
  started timing out under higher local parallelism in the past. If you see widespread
  navigation-timeout failures (not locator-not-found or assertion mismatches), try lowering it.
- **Accessibility baseline** (`tests/a11y-baseline.json`): the current violation counts are
  accepted as a baseline so the suite is green today while still catching regressions (new rule
  IDs, or a count jump beyond a small tolerance). To regenerate after a deliberate fix or an
  accepted regression:

  ```bash
  UPDATE_A11Y_BASELINE=1 npx playwright test a11y --workers=1
  ```

  `--workers=1` matters here: the update path rewrites the whole baseline file, and parallel
  workers would clobber each other's writes.
