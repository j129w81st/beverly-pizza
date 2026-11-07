# Beverly Pizza

Beverly, Massachusetts restaurant directory comparing large cheese and large pepperoni prices. Initial inventory: five shops; two supported live menu adapters. This is not yet an exhaustive city inventory. Prices are never invented; unverified shops remain visible with unknown prices. Menu changes and fetch failures retain the previous observation and mark the shop for review.

## Local development

Requires Node 24. Run `npm install`, `npm run refresh`, then `npm start`. Open http://localhost:3000. Local observations persist under ignored `.local/`. Run `npm test` for parser checks.

## Render (primary deployment)

The root `render.yaml` provisions a Node web service, shared PostgreSQL database, and weekly price-check cron job. Connect the GitHub repository from Render's **New → Blueprint**, select this file, and review the plan costs before deploying. The web service uses the free plan (it can sleep); the database and cron job use paid plans. No API keys belong in the repository. Render injects the internal database connection into both services.

The web service checks for due prices on startup, then serves the app. The cron job refreshes supported menus every Monday at 12:00 UTC (7 a.m. Eastern standard time / 8 a.m. Eastern daylight time). It forces a check so startup observations cannot delay the weekly job. The database is restricted to Render internal connections. Scheduling becomes active after the Blueprint deploys successfully. Check `/health` and `/api/restaurants` on the resulting service URL.

## Heroku (alternative)

1. Authenticate with `heroku login`.
2. Initialize Git, commit the source, and run `heroku create beverly-pizza` (name availability may require a suffix).
3. Provision `heroku addons:create heroku-postgresql:essential-0 -a beverly-pizza` and `heroku addons:create scheduler:standard -a beverly-pizza`. These incur provider charges.
4. Push `git push heroku main`. Set `NODE_ENV=production` if needed. Production requires `DATABASE_URL`; PostgreSQL provides durable storage across dyno restarts.
5. Run `heroku run npm run refresh -a beverly-pizza`.
6. Open `heroku addons:open scheduler -a beverly-pizza` and add `npm run refresh`, daily at a chosen time. The command checks each supported shop only when its last attempt is at least seven days old, yielding a weekly cadence. Scheduling is not active until this job is configured.

`npm run refresh -- --force` bypasses the seven-day interval. Run one refresh job at a time. Failed checks retry at the next weekly interval. New adapters belong in `prices.js`; add the shop to `data.js` with an official menu URL. Unsupported menus require adapter work before they can update automatically. Check dates indicate retrieval time, not the restaurant's publication date. No tax, delivery fees, or promotions are included. One-topping comparisons use pepperoni, not premium toppings. Rantoul's listed pepperoni pizza is used because its price differs from its base-plus-topping listing.

Endpoints: `/api/restaurants` includes latest prices, source, dates, review status and recent history; `/health` checks storage access.
