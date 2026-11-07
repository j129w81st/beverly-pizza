# Beverly Pizza

Beverly, Massachusetts restaurant directory comparing large cheese and one-topping prices. Inventory expanded to 17 shops with seven supported live menu adapters. This is not yet an exhaustive city inventory. Prices are never invented; unverified shops remain visible with unknown prices. Menu changes and fetch failures retain the previous observation and mark the shop for review. Cheese-only observations are supported when a topping price cannot be established.

Supported menus: Little Italy, Rantoul St Pizza, Greg’s Tavern (cheese only), Mike’s Pizzeria, Tesoro Cucina, Prides Deli, and Maria’s Corner Pizzeria (cheese only). Tesoro’s standard 16-inch base is Margherita; Mike’s uses the regular topping surcharge. These distinctions appear next to the shop. Cabot and Ellie’s display starting prices without confirming a large size, so those prices are excluded. Third-party delivery markups and small-size prices are not substituted for comparable large pizzas. The workflow also refreshes prices when menu collector code or the directory changes on main.

## Local development

Requires Node 24. Run `npm install`, `npm run refresh`, then `npm start`. Open http://localhost:3000. Local observations persist under ignored `.local/`. Run `npm test` for parser checks.

## Render (primary deployment)

The root `render.yaml` provisions only a free Node web service. The database uses Supabase Free and weekly updates use GitHub Actions; no paid Render database or cron service is declared. Free plans have quotas, Render sleeps when idle, and Supabase may pause projects with low activity. This is suitable for an initial small directory, without an uptime guarantee.

1. Create a Supabase Free project. In **Connect**, choose the shared pooler in **session mode** for IPv4 compatibility. Replace the password placeholder and use the supplied TLS configuration (e.g. `sslmode=verify-full` with trusted certificates). Never disable certificate verification. The connection is used only by trusted server processes.
2. Add that connection string as **DATABASE_URL** in Render's Blueprint setup. The server initializes its private `beverly_pizza` schema. No tables or credentials are exposed to the browser; RLS is enabled, and no public access policies are created. Keep this schema out of Supabase's exposed API schemas.
3. Add the same **DATABASE_URL** under GitHub repository **Settings → Secrets and variables → Actions → New repository secret**.
4. Deploy the Render Blueprint, then run **Actions → Refresh pizza prices → Run workflow** once to populate prices. Check `/health` and `/api/restaurants` on the resulting Render URL.

The workflow refreshes supported menus Mondays at **12:17 UTC** (7:17 a.m. Eastern standard time / 8:17 a.m. Eastern daylight time). GitHub schedules may be delayed and can be disabled after 60 days of inactivity in public repositories; check Actions if dates stop advancing. Standard hosted runners are free for public repos; private repos use included minutes. Failures save a review observation and fail the job for visibility. Scheduling requires the database secret and Actions to be enabled. Supabase's free-project pausing is based on activity; weekly refreshes do not guarantee a project stays active. Resume it from the Supabase dashboard if necessary.

If the older paid Render Blueprint was already deployed, removing its entries does not guarantee those resources are deleted. Remove any unused paid database or cron service in the Render dashboard after confirming no data is needed.

## Heroku (alternative)

1. Authenticate with `heroku login`.
2. Initialize Git, commit the source, and run `heroku create beverly-pizza` (name availability may require a suffix).
3. Provision `heroku addons:create heroku-postgresql:essential-0 -a beverly-pizza` and `heroku addons:create scheduler:standard -a beverly-pizza`. These incur provider charges.
4. Push `git push heroku main`. Set `NODE_ENV=production` if needed. Production requires `DATABASE_URL`; PostgreSQL provides durable storage across dyno restarts.
5. Run `heroku run npm run refresh -a beverly-pizza`.
6. Open `heroku addons:open scheduler -a beverly-pizza` and add `npm run refresh`, daily at a chosen time. The command checks each supported shop only when its last attempt is at least seven days old, yielding a weekly cadence. Scheduling is not active until this job is configured.

`npm run refresh -- --force` bypasses the seven-day interval. Run one refresh job at a time. Failed checks retry at the next weekly interval. New adapters belong in `prices.js`; add the shop to `data.js` with an official menu URL. Unsupported menus require adapter work before they can update automatically. Check dates indicate retrieval time, not the restaurant's publication date. No tax, delivery fees, or promotions are included. One-topping comparisons use explicit pepperoni prices or the published regular topping rate; premium toppings are excluded. Rantoul's listed pepperoni pizza is used because its price differs from its base-plus-topping listing.

Endpoints: `/api/restaurants` includes latest prices, source, dates, review status and recent history; `/health` checks storage access.
