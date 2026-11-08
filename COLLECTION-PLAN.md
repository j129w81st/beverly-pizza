# Coverage and collection plan — November 8, 2026

The directory now accepts any pizza size. Record the cheese pizza price, the same-size one-topping total where available, and the published diameter in inches. Never translate “Large” into a guessed diameter. Keep unknown diameter visible as unknown while showing a directly verified cheese price. Existing collectors retain their currently selected size; Panini can now publish its Small option instead of failing a Large-only requirement.

## What is missing

There are three separate problems:

1. **Inventory:** discover and verify every current Beverly business serving pizza, including restaurants, pubs, delis and prepared-food counters. OpenStreetMap and pizza directories are incomplete. Search result counts include duplicates, nearby towns and closed shops.
2. **Collection:** some menus need a browser or PDF/OCR, some are blocked, and some omit diameter or topping charges. A spreadsheet does not fix missing source data.
3. **Publication:** uncertain findings previously lived in workflow artifacts. The admin review desk now gives the owner a persistent queue, source links, proposed data, edit/approve/reject actions, and a decision history.

To establish a defensible complete inventory, reconcile a current Beverly food-establishment / common-victualler roster with neighborhood searches, local directories and map leads. Check the actual menu of every candidate. Record replacements and closures. The [city's permit page](https://www.beverlyma.gov/1289/Apply-Online) describes its permit system, but a complete downloadable current roster has not been located. No request or restaurant outreach has been sent. Document the audit date and unresolved candidates before calling the directory complete.

## Tools researched

| Tool | Role | Verified free allowance | Limits for this app |
| --- | --- | --- | --- |
| Existing Playwright + PDF.js + Tesseract + GitHub Actions | Browser controls, PDFs, scanned-menu review and scheduling | Already integrated; no extraction API subscription | Site-specific selectors need maintenance. Security challenges and unpublished prices still need review. |
| [Firecrawl](https://www.firecrawl.dev/pricing) | First external fallback to trial on difficult menu pages; [HTML/structured extraction](https://docs.firecrawl.dev/features/scrape) and [document parsing](https://docs.firecrawl.dev/features/document-parsing) | 1,000 credits/month on the current free plan, no card | Basic scrape is 1 credit/page; JSON extraction adds 4 credits/page and browser/PDF operations can cost more. Apply only to failures, with a hard usage cap. Tool output is a proposal, never automatic truth. |
| [Apify](https://apify.com/pricing) | Supplemental discovery or a specific maintained scraper | $5/month platform credit, no card | Actor-specific and platform costs vary. Verify duplicates, Beverly addresses, operation and source freshness. Do not replace the primary menu with delivery-platform markup. |
| [Browserbase](https://www.browserbase.com/pricing) | Hosted browser sessions/replays if maintaining local Chromium becomes a problem | Free plan includes 1 browser hour, 3 concurrent browsers and 15-minute sessions | Infrastructure for browser collection, not a database of menu prices or a completeness guarantee. |
| [Google Places API](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing) | Additional discovery reference | Billing and an API key are required; allowances depend on SKU | It does not supply exact menu prices. [Caching and attribution rules](https://developers.google.com/maps/documentation/places/web-service/policies) limit using Places results as a permanent copied database; independently verify restaurant facts. |

Recommendation: retain the working free collectors, use the review desk for gaps and phone/menu confirmations, and trial Firecrawl against a short list of failed sources before choosing a paid service. No external provider has been enabled, account created or charge incurred.

## Review flow

Nightly checks → confirmed collector observation, or private review finding. Weekly discovery → private unverified lead. Admin sees reason, source link, OCR excerpt/confidence when available, proposed prices, and current restaurant details. Approval publishes the edited data in one transaction; rejection never publishes it. New listings can be approved with prices pending. Closed businesses can be removed while preserving their history. Restaurants with no cheese pizza can be recorded explicitly.

Manual approval makes prices owner-managed: later different collector values come back for review instead of overwriting the owner's decision. Unchanged collector values do not create a new finding. Repeated identical findings are deduplicated; rejected findings do not reappear nightly. Source content or price changes can produce a new finding. Owner confirmations have their own check dates and a manual source label.

The admin uses one server-side password, an 8-hour HttpOnly/SameSite session, same-origin JSON writes and login throttling. Set `ADMIN_PASSWORD` (16+ characters) in Render Environment; it is never committed or sent to the browser. Admin APIs stay locked until configured. Sessions end when the app restarts. Private reviews, evidence and decisions are not exposed by the public restaurant API.
