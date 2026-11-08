# Beverly Pizza

Beverly, Massachusetts restaurant directory comparing cheese pizza prices, diameters in inches, and one-topping prices. Inventory expanded to 28 locations with HTML, browser and PDF collection. Use the live coverage report for current verified-price counts. This is not yet an exhaustive city inventory. Prices are never invented; unverified shops remain visible with unknown prices. Menu changes and fetch failures retain the previous observation and mark the shop for review. Cheese-only observations are supported when a topping price cannot be established.

Collectors cover HTML, browser and PDF menus. Any pizza size is eligible; the selected size stays attached to each observation. Diameter is displayed only when explicitly stated, and unknown diameters do not prevent a verified price from being shown. Tesoro’s standard base is Margherita, and some one-topping prices use a published regular topping surcharge. Shop notes explain these differences. Current collector status and gaps are shown at `/coverage.html`.

## Local development

Requires Node 24. Run `npm install`, `npm run refresh`, then `npm start`. Open http://localhost:3000. Local observations persist under ignored `.local/`. Run `npm test` for parser checks.

## Render (primary deployment)

The root `render.yaml` provisions only a free Node web service. The database uses Supabase Free and nightly updates use GitHub Actions; no paid Render database or cron service is declared. Free plans have quotas, Render sleeps when idle, and Supabase may pause projects with low activity. This is suitable for an initial small directory, without an uptime guarantee.

1. Create a Supabase Free project. In **Connect**, choose the shared pooler in **session mode** for IPv4 compatibility. Replace the password placeholder and use the supplied TLS configuration (e.g. `sslmode=verify-full` with trusted certificates). Never disable certificate verification. The connection is used only by trusted server processes.
2. Add that connection string as **DATABASE_URL** in Render's Blueprint setup. The server initializes its private `beverly_pizza` schema. No tables or credentials are exposed to the browser; RLS is enabled, and no public access policies are created. Keep this schema out of Supabase's exposed API schemas.
3. Add the same **DATABASE_URL** under GitHub repository **Settings → Secrets and variables → Actions → New repository secret**.
4. Deploy the Render Blueprint, then run **Actions → Refresh pizza prices → Run workflow** once to populate prices. Check `/health` and `/api/restaurants` on the resulting Render URL.

The workflow refreshes supported menus every day at **08:17 UTC** (3:17 a.m. Eastern standard time / 4:17 a.m. Eastern daylight time). GitHub schedules may be delayed and can be disabled after 60 days of inactivity in public repositories; check Actions if dates stop advancing. Standard hosted runners are free for public repos; private repos use included minutes. Failures save a review observation and fail the job for visibility. Scheduling requires the database secret and Actions to be enabled. Supabase's free-project pausing is based on activity; scheduled refreshes do not guarantee a project stays active. Resume it from the Supabase dashboard if necessary.

If the older paid Render Blueprint was already deployed, removing its entries does not guarantee those resources are deleted. Remove any unused paid database or cron service in the Render dashboard after confirming no data is needed.

## Heroku (alternative)

1. Authenticate with `heroku login`.
2. Initialize Git, commit the source, and run `heroku create beverly-pizza` (name availability may require a suffix).
3. Provision `heroku addons:create heroku-postgresql:essential-0 -a beverly-pizza` and `heroku addons:create scheduler:standard -a beverly-pizza`. These incur provider charges.
4. Push `git push heroku main`. Set `NODE_ENV=production` if needed. Production requires `DATABASE_URL`; PostgreSQL provides durable storage across dyno restarts.
5. Run `heroku run npm run refresh -a beverly-pizza`.
6. Open `heroku addons:open scheduler -a beverly-pizza` and add `npm run refresh`, daily at a chosen time. The command checks each supported shop only when its last attempt is at least 24 hours old, yielding a daily cadence. Scheduling is not active until this job is configured.

`npm run refresh -- --force` bypasses the 24-hour interval. Run one refresh job at a time. Failed checks retry on the next nightly run. New adapters belong in `prices.js`; add the shop to `data.js` with an official menu URL. Unsupported menus require adapter work before they can update automatically. Check dates indicate retrieval time, not the restaurant's publication date. No tax, delivery fees, or promotions are included. One-topping comparisons use explicit pepperoni prices or the published regular topping rate; premium toppings are excluded. Rantoul's listed pepperoni pizza is used because its price differs from its base-plus-topping listing.

Endpoints: `/api/restaurants` includes latest prices, source, dates, review status and recent history; `/health` checks storage access.


## Browser and PDF collectors

`collectors.js` dispatches the source type declared in each restaurant's `collector` configuration. Existing HTML collectors remain unchanged. Successful observations retain the resolved source URL, source type, retrieval timestamp, and SHA-256 content hash. Existing observations are preserved when a check fails. API source links point to the document actually checked.

- **Regina PDF:** follows the current Beverly-specific PDF link on the official location page, downloads at most 16 MB / 20 pages, extracts text with PDF.js, verifies Beverly and the 16-inch size, then reads cheese and pepperoni separately. The linked document can change filename without a code change. Scanned/image-only pages use local OCR when enabled. OCR candidates require review and never replace published prices automatically.
- **Panini browser:** opens the official ordering page in a fresh Chromium session, chooses Beverly pickup if required, opens Create Your Own Pizza, and checks the actual size selector. The collector selects an unambiguous Large option when offered, or the Small option otherwise, and records the selected size with its price. Unpublished diameters stay unknown. Topping pricing stays unknown until a whole-pizza pepperoni rate is confirmed. It never adds to a cart or checks out.
- **Giuseppe’s browser:** reads the Beverly large build-your-own item and explicit topping charge when accessible. Its current security verification page is recorded as needing review. No access challenges are bypassed.
- **Ellie’s browser:** opens the cheese item, selects Large, waits for the large price, reads the updated pepperoni charge and confirms the selected-item total. This avoids using Small topping rates. It never clicks Add to Order.
- **Nick’s browser:** reads the explicit LG cheese price from the restaurant’s linked Beverly ordering menu, excluding Small and specialty prices. One-topping stays unknown until its rate can be verified.

Access verification and ambiguous item options are expected review results: saved to the private admin queue without failing the entire workflow. Unexpected fetch, parser, or infrastructure errors still fail the workflow after retaining the other shops' results. Both preserve previous good observations. Chromium is installed by GitHub Actions, not by the Render web service.

For local browser runs, first use `npx playwright install chromium`; then run `RUN_BROWSER_TESTS=1 npm test` or `npm run refresh -- --force`. `PLAYWRIGHT_BROWSERS_PATH` can select a custom browser installation directory. Integration tests exercise a real in-memory PDF, current-link discovery, delayed browser price updates, wrong-size rejection, and a check that no cart requests occur. The nightly workflow runs these browser tests before collection. New tables/columns are initialized under a database advisory lock so concurrent web and collection startup cannot race schema creation.


## Inventory coverage and discovery

`/coverage.html` and `/api/coverage.csv` expose all tracked locations, collection methods, missing prices and issues. CSV is an Excel-compatible audit view of live data, not a substitute data source. `INVENTORY-AUDIT.md` records additional leads and old/duplicate names. A separate Sunday GitHub Actions workflow runs `node scripts/discover.js` against Beverly Main Streets, a pizza directory, and OpenStreetMap food venues within the Beverly city boundary and uploads an unverified-lead report. It does not automatically add names or claim a complete city inventory. A current municipal food-establishment permit list is still needed to reconcile full coverage.

Anchor, Mikey’s, and REV now have explicit Large/Regular-size collectors. Prides is marked as needing current-operation confirmation following 2026 licensing closure reports; historical observations remain in the database but do not appear in current comparisons. New parser and directory tests verify size selection, failed-check retention, and operation-review exclusions.

## Scanned menu OCR and review reports

Tesseract.js reads rendered, image-only PDF pages locally without a paid AI API. English language data is downloaded once per cache; `.local/ocr-cache` is ignored by Git. At most four sparse-text pages per PDF are rendered, with a ten-million-pixel cap per page and a 60-second recognition timeout. OCR confidence is diagnostic, not proof that a digit is correct. Every OCR result becomes a review item, even if a parser finds candidate prices. Existing confirmed observations remain current until independently verified data replaces them.

Run OCR integration tests with `RUN_OCR_TESTS=1 npm test`; these use a generated image-only PDF. The nightly workflow enables both OCR and browser integration tests. The `menu-review-report` artifact includes every unresolved location, check failures and OCR candidates with source links, confidence and a short excerpt, retained for seven days. The `restaurant-discovery-report` artifact is retained for fourteen days. No restaurant messages have been sent and no paid services have been added.


## Owner review desk

Visit `/admin` to review discovery leads, missing diameters, OCR candidates and failed menu checks. Set a new `ADMIN_PASSWORD` of at least 16 characters in **Render → beverly-pizza → Environment**, then save/redeploy. Do not put the password in GitHub or chat. Until configured, the admin API returns 503 and accepts no logins. This setting is optional for the public app; adding it to the existing service requires no new hosting plan.

The review desk lets the owner edit details and prices, approve/reject a finding, add a manually verified restaurant or phone-confirmed price, confirm a listing with prices pending, or remove a confirmed closed location. Staging a new finding does not publish it. Approval writes the listing, price observation and audit decision atomically. Private evidence never appears in public responses. Same-origin JSON mutations, HttpOnly/SameSite cookies, login throttling and 8-hour sessions protect the admin API. A restart ends admin sessions.

After manual approval, a restaurant’s prices are owner-managed. Future different collector values enter review instead of overwriting them. Rejected/approved findings are not reset by identical nightly findings. New published sizes may be any diameter, or explicitly “Diameter unconfirmed”; there is no Large-only gate. Public APIs and CSV export include `sizeInches` / diameter alongside price.

Private tables are initialized by the existing startup path in `beverly_pizza`, with RLS enabled and no grants to Supabase public API roles. Local development uses `.local/admin.json`; production requires Supabase. GitHub Actions additionally tests review transactions and permissions against an isolated PostgreSQL service, never the production database.

See [COLLECTION-PLAN.md](COLLECTION-PLAN.md) for the researched collection tools, current free allowances, and inventory-completeness plan. External collection providers have not been enabled.
