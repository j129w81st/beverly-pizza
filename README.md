# Beverly Pizza

Beverly, Massachusetts restaurant directory comparing large cheese and large pepperoni prices. Initial inventory: five shops; two supported live menu adapters. This is not yet an exhaustive city inventory. Prices are never invented; unverified shops remain visible with unknown prices. Menu changes and fetch failures retain the previous observation and mark the shop for review.

## Local development

Requires Node 24. Run `npm install`, `npm run refresh`, then `npm start`. Open http://localhost:3000. Local observations persist under ignored `.local/`. Run `npm test` for parser checks.

## Heroku

1. Authenticate with `heroku login`.
2. Initialize Git, commit the source, and run `heroku create beverly-pizza` (name availability may require a suffix).
3. Provision `heroku addons:create heroku-postgresql:essential-0 -a beverly-pizza` and `heroku addons:create scheduler:standard -a beverly-pizza`. These incur provider charges.
4. Push `git push heroku main`. Set `NODE_ENV=production` if needed. Production requires `DATABASE_URL`; PostgreSQL provides durable storage across dyno restarts.
5. Run `heroku run npm run refresh -a beverly-pizza`.
6. Open `heroku addons:open scheduler -a beverly-pizza` and add `npm run refresh`, daily at a chosen time. The command checks each supported shop only when its last attempt is at least seven days old, yielding a weekly cadence. Scheduling is not active until this job is configured.

`npm run refresh -- --force` bypasses the seven-day interval. Run one refresh job at a time. Failed checks retry at the next weekly interval. New adapters belong in `prices.js`; add the shop to `data.js` with an official menu URL. Unsupported menus require adapter work before they can update automatically. Check dates indicate retrieval time, not the restaurant's publication date. No tax, delivery fees, or promotions are included. One-topping comparisons use pepperoni, not premium toppings. Rantoul's listed pepperoni pizza is used because its price differs from its base-plus-topping listing.

Endpoints: `/api/restaurants` includes latest prices, source, dates, review status and recent history; `/health` checks storage access.
